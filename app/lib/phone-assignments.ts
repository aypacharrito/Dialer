import { normalizeTwilioPhone, twilioClientIdentity, twilioNumberWorkspaceMap } from "./twilio-workspaces";

export type PhoneAssignment={
  provider:"twilio"|"telnyx";
  workspaceId:string;
  workspaceEmail:string;
  workspaceName:string;
  phoneNumber:string;
  phoneSid:string;
  smsStatus:"registration-required"|"registered"|"not-capable";
  messagingServiceSid?:string;
  assignedAt:string;
  assignedBy:string;
};

const version="v1";
const assignmentSet=`pacifica:${version}:telephony:workspaces`;
const workspaceKey=(workspaceId:string)=>`pacifica:${version}:telephony:workspace:${workspaceId}`;
const numberKey=(phoneNumber:string,provider="twilio")=>`pacifica:${version}:telephony:number:${provider}:${normalizeTwilioPhone(phoneNumber).replace(/\D/g,"")}`;
const clientKey=(workspaceId:string)=>`pacifica:${version}:telephony:client:${twilioClientIdentity(workspaceId)}`;

function redisConfig(){
  return {
    url:process.env.KV_REST_API_URL||process.env.UPSTASH_REDIS_REST_URL||"",
    token:process.env.KV_REST_API_TOKEN||process.env.UPSTASH_REDIS_REST_TOKEN||"",
  };
}

async function redis(command:Array<string|number>){
  const {url,token}=redisConfig();
  if(!url||!token)return null;
  const response=await fetch(url,{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify(command),cache:"no-store"});
  const data=await response.json() as {result?:unknown;error?:string};
  if(!response.ok||data.error)throw new Error(data.error||"Phone assignment storage request failed");
  return data.result;
}

function parsed(value:unknown):PhoneAssignment|null{
  if(typeof value!=="string")return null;
  try{
    const item=JSON.parse(value) as Partial<PhoneAssignment>;
    const phoneNumber=normalizeTwilioPhone(String(item.phoneNumber||""));
    if(!item.workspaceId||!phoneNumber)return null;
    return {...item,provider:item.provider==="telnyx"?"telnyx":"twilio",phoneNumber,workspaceEmail:item.workspaceEmail||"",workspaceName:item.workspaceName||item.workspaceEmail||"Pacifica workspace",phoneSid:item.phoneSid||"",smsStatus:item.smsStatus||"registration-required",assignedAt:item.assignedAt||"",assignedBy:item.assignedBy||""} as PhoneAssignment;
  }catch{return null}
}

function environmentAssignmentForWorkspace(workspaceId:string,email=""):PhoneAssignment|null{
  const match=twilioNumberWorkspaceMap().find(([,candidate])=>candidate===workspaceId)?.[0];
  const defaultWorkspace=(process.env.TWILIO_DEFAULT_WORKSPACE_ID||"").trim();
  const legacyOwner=email.toLowerCase()==="pacificalegalinsurance@gmail.com";
  const phoneNumber=match||(workspaceId==="local"||defaultWorkspace===workspaceId||legacyOwner?normalizeTwilioPhone(process.env.TWILIO_PHONE_NUMBER||""):"");
  return phoneNumber?{provider:"twilio",workspaceId,workspaceEmail:email,workspaceName:email||"Legacy workspace",phoneNumber,phoneSid:"",smsStatus:"registration-required",assignedAt:"",assignedBy:"environment fallback"}:null;
}

function environmentAssignmentForNumber(phoneNumber:string):PhoneAssignment|null{
  const phone=normalizeTwilioPhone(phoneNumber);
  const workspaceId=twilioNumberWorkspaceMap().find(([candidate])=>candidate===phone)?.[1]||(phone===normalizeTwilioPhone(process.env.TWILIO_PHONE_NUMBER||"")?(process.env.TWILIO_DEFAULT_WORKSPACE_ID||"").trim():"");
  return workspaceId?environmentAssignmentForWorkspace(workspaceId):null;
}

export function phoneAssignmentStorageConfigured(){const {url,token}=redisConfig();return Boolean(url&&token)}

export async function phoneAssignmentForWorkspace(workspaceId:string,email=""){
  const stored=parsed(await redis(["GET",workspaceKey(workspaceId)]));
  return stored||environmentAssignmentForWorkspace(workspaceId,email);
}

export async function phoneAssignmentForNumber(phoneNumber:string){
  const stored=parsed(await redis(["GET",numberKey(phoneNumber,"twilio")]));
  return stored||environmentAssignmentForNumber(phoneNumber);
}

export async function phoneAssignmentForClient(client:string,provider:PhoneAssignment["provider"]="twilio"){
  const identity=client.replace(/^client:/i,"");
  const stored=parsed(await redis(["GET",`pacifica:${version}:telephony:client:${identity}`]));
  if(stored)return stored.provider===provider?stored:null;
  if(provider!=="twilio")return null;
  const envMatch=twilioNumberWorkspaceMap().find(([,workspace])=>twilioClientIdentity(workspace)===identity);
  if(envMatch)return environmentAssignmentForWorkspace(envMatch[1]);
  const defaultWorkspace=(process.env.TWILIO_DEFAULT_WORKSPACE_ID||"").trim();
  if(defaultWorkspace&&twilioClientIdentity(defaultWorkspace)===identity)return environmentAssignmentForWorkspace(defaultWorkspace);
  if(identity===twilioClientIdentity("local"))return environmentAssignmentForWorkspace("local");
  return null;
}

export async function listPhoneAssignments(){
  const workspaceIds=await redis(["SMEMBERS",assignmentSet]);
  if(!Array.isArray(workspaceIds))return [];
  const assignments:PhoneAssignment[]=[];
  for(const workspaceId of workspaceIds.slice(0,500)){
    const assignment=parsed(await redis(["GET",workspaceKey(String(workspaceId))]));
    if(assignment)assignments.push(assignment);
  }
  return assignments.sort((left,right)=>right.assignedAt.localeCompare(left.assignedAt));
}

export async function savePhoneAssignment(assignment:PhoneAssignment){
  if(!phoneAssignmentStorageConfigured())throw new Error("Connect Upstash Redis in Vercel before assigning phone numbers.");
  const normalized={...assignment,phoneNumber:normalizeTwilioPhone(assignment.phoneNumber)};
  const existingWorkspace=parsed(await redis(["GET",workspaceKey(normalized.workspaceId)]));
  const existingNumber=parsed(await redis(["GET",numberKey(normalized.phoneNumber,normalized.provider)]));
  if(existingWorkspace&&(existingWorkspace.phoneNumber!==normalized.phoneNumber||existingWorkspace.provider!==normalized.provider))await redis(["DEL",numberKey(existingWorkspace.phoneNumber,existingWorkspace.provider)]);
  if(existingNumber&&existingNumber.workspaceId!==normalized.workspaceId){
    await redis(["DEL",workspaceKey(existingNumber.workspaceId)]);
    await redis(["DEL",clientKey(existingNumber.workspaceId)]);
    await redis(["SREM",assignmentSet,existingNumber.workspaceId]);
  }
  const serialized=JSON.stringify(normalized);
  await redis(["SET",workspaceKey(normalized.workspaceId),serialized]);
  await redis(["SET",numberKey(normalized.phoneNumber,normalized.provider),serialized]);
  await redis(["SET",clientKey(normalized.workspaceId),serialized]);
  await redis(["SADD",assignmentSet,normalized.workspaceId]);
  return normalized;
}

import { clerkClient } from "@clerk/nextjs/server";
import { getPacificaAccess, isPacificaPlatformOwnerApi } from "../../../lib/clerk-access";
import { isClerkConfigured } from "../../../lib/clerk-config";
import { listPhoneAssignments, phoneAssignmentStorageConfigured, savePhoneAssignment } from "../../../lib/phone-assignments";
import { normalizeTwilioPhone } from "../../../lib/twilio-workspaces";
import { twilioAccountConfig, twilioApiErrorMessage, twilioApiRequest, type TwilioApiError } from "../../../lib/twilio-rest";

export const runtime="nodejs";

type ClerkWorkspace={id:string;email:string;name:string;createdAt:number};
type TwilioNumber={sid:string;phone_number:string;friendly_name?:string;capabilities?:{voice?:boolean;sms?:boolean;mms?:boolean};voice_url?:string;voice_application_sid?:string|null};
type AvailableNumber={phone_number:string;friendly_name?:string;locality?:string;region?:string;postal_code?:string;capabilities?:{voice?:boolean;sms?:boolean;mms?:boolean}};
type TwilioApplication={sid:string;friendly_name?:string;voice_url?:string;voice_method?:string};

const voiceUrl=()=>`${(process.env.TWILIO_WEBHOOK_BASE_URL||"https://pacificacrm.com").trim().replace(/\/$/,"")}/api/twilio/voice`;
const smsUrl=()=>`${(process.env.TWILIO_WEBHOOK_BASE_URL||"https://pacificacrm.com").trim().replace(/\/$/,"")}/api/twilio/inbound`;

async function requirePlatformOwner(){
  if(!await isPacificaPlatformOwnerApi())return null;
  return isClerkConfigured()?await getPacificaAccess():{allowed:true,role:"owner" as const,email:"local",userId:"local"};
}

async function clerkWorkspaces():Promise<ClerkWorkspace[]>{
  if(!isClerkConfigured())return [{id:"local",email:"local",name:"Local Pacifica workspace",createdAt:Date.now()}];
  const client=await clerkClient();
  const result=await client.users.getUserList({limit:100,orderBy:"-created_at"});
  return result.data.filter(user=>!String(user.privateMetadata.pacificaWorkspaceId||"").trim()).map(user=>{
    const email=(user.primaryEmailAddress?.emailAddress||user.emailAddresses[0]?.emailAddress||"").toLowerCase();
    const name=[user.firstName,user.lastName].filter(Boolean).join(" ")||email||"Unnamed account";
    return {id:user.id,email,name,createdAt:user.createdAt};
  }).filter(workspace=>workspace.email);
}

async function ownedNumbers(){
  const {accountSid,credentials}=twilioAccountConfig();
  const endpoint=`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json?PageSize=1000`;
  const result=await twilioApiRequest<{incoming_phone_numbers?:TwilioNumber[]}&TwilioApiError>(endpoint,{},credentials);
  if(!result.response.ok)throw new Error(twilioApiErrorMessage(result.data,"Unable to load Twilio numbers"));
  return result.data.incoming_phone_numbers||[];
}

async function twimlApplication(){
  const appSid=(process.env.TWILIO_TWIML_APP_SID||"").trim();
  if(!/^AP[a-f0-9]{32}$/i.test(appSid))throw new Error("TWILIO_TWIML_APP_SID is missing or malformed.");
  const {accountSid,credentials}=twilioAccountConfig();
  const endpoint=`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Applications/${appSid}.json`;
  const result=await twilioApiRequest<TwilioApplication&TwilioApiError>(endpoint,{},credentials);
  if(!result.response.ok)throw new Error(twilioApiErrorMessage(result.data,"The configured TwiML App is not accessible from this Twilio account"));
  return result.data;
}

async function verifiedWorkspace(workspaceId:string){
  const workspace=(await clerkWorkspaces()).find(item=>item.id===workspaceId);
  if(!workspace)throw new Error("That Clerk workspace no longer exists.");
  return workspace;
}

async function configureIncomingVoice(number:TwilioNumber){
  const {accountSid,credentials}=twilioAccountConfig();
  const form=new URLSearchParams({VoiceUrl:voiceUrl(),VoiceMethod:"POST",SmsUrl:smsUrl(),SmsMethod:"POST",VoiceApplicationSid:"",TrunkSid:"",FriendlyName:number.friendly_name||number.phone_number});
  const endpoint=`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers/${number.sid}.json`;
  const result=await twilioApiRequest<TwilioNumber&TwilioApiError>(endpoint,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:form.toString()},credentials);
  if(!result.response.ok)throw new Error(twilioApiErrorMessage(result.data,"Twilio could not configure incoming Voice"));
  return result.data;
}

async function assign(number:TwilioNumber,workspace:ClerkWorkspace,assignedBy:string){
  const configured=await configureIncomingVoice(number);
  return savePhoneAssignment({
    provider:"twilio",
    workspaceId:workspace.id,
    workspaceEmail:workspace.email,
    workspaceName:workspace.name,
    phoneNumber:normalizeTwilioPhone(configured.phone_number||number.phone_number),
    phoneSid:configured.sid||number.sid,
    smsStatus:configured.capabilities?.sms===false?"not-capable":"registration-required",
    assignedAt:new Date().toISOString(),
    assignedBy,
  });
}

export async function GET(){
  if(!await requirePlatformOwner())return Response.json({error:"Platform-owner access required."},{status:403});
  try{
    const [workspaces,numbers,assignments,application]=await Promise.all([clerkWorkspaces(),ownedNumbers(),listPhoneAssignments(),twimlApplication()]);
    const appHealthy=application.voice_url===voiceUrl()&&String(application.voice_method||"POST").toUpperCase()==="POST";
    return Response.json({configured:true,storageConfigured:phoneAssignmentStorageConfigured(),voiceUrl:voiceUrl(),providerStatus:{twilio:{configured:true,healthy:appHealthy,applicationName:application.friendly_name||"Twilio Voice App",applicationSidLast4:application.sid.slice(-4),currentVoiceUrl:application.voice_url||"Not configured"},telnyx:{configured:Boolean(process.env.TELNYX_API_KEY),healthy:false,status:process.env.TELNYX_API_KEY?"Connection setup required":"Add TELNYX_API_KEY to connect"}},workspaces,numbers:numbers.map(number=>({sid:number.sid,phoneNumber:number.phone_number,friendlyName:number.friendly_name||number.phone_number,capabilities:number.capabilities||{},voiceReady:number.voice_url===voiceUrl()&&!number.voice_application_sid})),assignments},{headers:{"Cache-Control":"no-store"}});
  }catch(error){console.error("[admin/phone-numbers] load failed",error instanceof Error?error.message:"unknown");return Response.json({error:error instanceof Error?error.message:"Unable to load Phone Number Center"},{status:500})}
}

export async function POST(request:Request){
  const owner=await requirePlatformOwner();
  if(!owner)return Response.json({error:"Platform-owner access required."},{status:403});
  try{
    const body=await request.json() as {action?:string;areaCode?:string;phoneNumber?:string;phoneSid?:string;workspaceId?:string;messagingServiceSid?:string;confirmed?:boolean};
    if(body.action==="search"){
      const areaCode=String(body.areaCode||"").replace(/\D/g,"");
      if(!/^\d{3}$/.test(areaCode))return Response.json({error:"Enter a three-digit US area code."},{status:400});
      const {accountSid,credentials}=twilioAccountConfig();
      const query=new URLSearchParams({AreaCode:areaCode,VoiceEnabled:"true",SmsEnabled:"true",PageSize:"12"});
      const endpoint=`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/AvailablePhoneNumbers/US/Local.json?${query}`;
      const result=await twilioApiRequest<{available_phone_numbers?:AvailableNumber[]}&TwilioApiError>(endpoint,{},credentials);
      if(!result.response.ok)throw new Error(twilioApiErrorMessage(result.data,"Unable to search Twilio numbers"));
      return Response.json({numbers:(result.data.available_phone_numbers||[]).map(number=>({phoneNumber:number.phone_number,friendlyName:number.friendly_name||number.phone_number,locality:number.locality||"",region:number.region||"",postalCode:number.postal_code||"",capabilities:number.capabilities||{}}))});
    }
    if(body.action==="repair"){
      if(body.confirmed!==true)return Response.json({error:"Confirm before changing the Twilio Voice application."},{status:400});
      const appSid=(process.env.TWILIO_TWIML_APP_SID||"").trim();
      if(!/^AP[a-f0-9]{32}$/i.test(appSid))return Response.json({error:"TWILIO_TWIML_APP_SID is missing or malformed."},{status:400});
      const {accountSid,credentials}=twilioAccountConfig();
      const form=new URLSearchParams({VoiceUrl:voiceUrl(),VoiceMethod:"POST"});
      const endpoint=`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Applications/${appSid}.json`;
      const result=await twilioApiRequest<TwilioApplication&TwilioApiError>(endpoint,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:form.toString()},credentials);
      if(!result.response.ok)throw new Error(twilioApiErrorMessage(result.data,"Twilio could not repair the Voice application"));
      return Response.json({ok:true,message:`${result.data.friendly_name||"Twilio Voice App"} now sends calls to ${voiceUrl()} using POST.`});
    }
    if(body.action==="assign"){
      const workspace=await verifiedWorkspace(String(body.workspaceId||""));
      const number=(await ownedNumbers()).find(item=>item.sid===body.phoneSid||normalizeTwilioPhone(item.phone_number)===normalizeTwilioPhone(String(body.phoneNumber||"")));
      if(!number)return Response.json({error:"That number is not owned by this Twilio account."},{status:400});
      const assignment=await assign(number,workspace,owner.email);
      return Response.json({ok:true,assignment,message:`${assignment.phoneNumber} is now assigned to ${workspace.name}.`});
    }
    if(body.action==="sms-status"){
      if(body.confirmed!==true)return Response.json({error:"Confirm that Twilio shows this workspace’s A2P campaign as approved before enabling SMS."},{status:400});
      const number=(await ownedNumbers()).find(item=>item.sid===body.phoneSid);if(!number)return Response.json({error:"That number is not owned by this Twilio account."},{status:400});
      const assignment=(await listPhoneAssignments()).find(item=>item.phoneSid===number.sid);if(!assignment)return Response.json({error:"Assign this number to a workspace first."},{status:400});
      const messagingServiceSid=String(body.messagingServiceSid||"").trim();if(messagingServiceSid&&!/^MG[a-f0-9]{32}$/i.test(messagingServiceSid))return Response.json({error:"Messaging Service SID must start with MG and contain 34 characters."},{status:400});
      const saved=await savePhoneAssignment({...assignment,smsStatus:"registered",messagingServiceSid:messagingServiceSid||assignment.messagingServiceSid,assignedAt:new Date().toISOString(),assignedBy:owner.email});
      return Response.json({ok:true,assignment:saved,message:`SMS marked registered for ${saved.phoneNumber}. Automated texting is still protected by the TWILIO_A2P_APPROVED gate.`});
    }
    if(body.action==="purchase"){
      if(body.confirmed!==true)return Response.json({error:"Confirm the recurring Twilio charge before purchasing."},{status:400});
      const workspace=await verifiedWorkspace(String(body.workspaceId||""));
      const phoneNumber=normalizeTwilioPhone(String(body.phoneNumber||""));
      if(!/^\+1\d{10}$/.test(phoneNumber))return Response.json({error:"Choose a valid available US number."},{status:400});
      const {accountSid,credentials}=twilioAccountConfig();
      const form=new URLSearchParams({PhoneNumber:phoneNumber,FriendlyName:`Pacifica · ${workspace.name}`.slice(0,64),VoiceUrl:voiceUrl(),VoiceMethod:"POST",SmsUrl:smsUrl(),SmsMethod:"POST"});
      const endpoint=`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json`;
      const result=await twilioApiRequest<TwilioNumber&TwilioApiError>(endpoint,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:form.toString()},credentials);
      if(!result.response.ok)throw new Error(twilioApiErrorMessage(result.data,"Twilio could not purchase this number"));
      try{
        const assignment=await assign(result.data,workspace,owner.email);
        return Response.json({ok:true,assignment,message:`Purchased ${assignment.phoneNumber} and assigned it to ${workspace.name}.`});
      }catch(error){
        console.error("[admin/phone-numbers] purchased but assignment failed",{phoneSid:result.data.sid,error:error instanceof Error?error.message:"unknown"});
        return Response.json({error:`The number was purchased, but assignment needs attention: ${error instanceof Error?error.message:"unknown error"}`,purchased:true,phoneNumber:result.data.phone_number},{status:500});
      }
    }
    return Response.json({error:"Unknown Phone Number Center action."},{status:400});
  }catch(error){console.error("[admin/phone-numbers] action failed",error instanceof Error?error.message:"unknown");return Response.json({error:error instanceof Error?error.message:"Phone Number Center request failed"},{status:500})}
}

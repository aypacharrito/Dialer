import { cleanWorkspaceProfile, type WorkspaceProfile } from "./workspace-profile";

export type StoredWorkspace={leads:unknown[];callLogs:unknown[];profile:WorkspaceProfile};
export type WorkspaceRecord={workspaceId:string;workspace:StoredWorkspace};

const workspaceVersion="v2";
export const workspaceKey=(userId:string)=>`pacifica:${workspaceVersion}:workspace:${userId}`;
export const workspaceDatabaseId=(userId:string)=>`${workspaceVersion}:${userId}`;

export function cleanWorkspacePayload(value:unknown):StoredWorkspace{
  const body=value&&typeof value==="object"?value as Partial<StoredWorkspace>:{};
  return {leads:Array.isArray(body.leads)?body.leads.slice(0,5000):[],callLogs:Array.isArray(body.callLogs)?body.callLogs.slice(0,1000):[],profile:cleanWorkspaceProfile(body.profile)};
}

function newer(left:unknown,right:unknown){const a=new Date(String(left||"")).getTime();const b=new Date(String(right||"")).getTime();return Number.isFinite(a)&&(!Number.isFinite(b)||a>b)}
function mergeCommunications(server:unknown,client:unknown){const items=[...(Array.isArray(client)?client:[]),...(Array.isArray(server)?server:[])];const unique=new Map<string,unknown>();for(const raw of items){if(!raw||typeof raw!=="object")continue;const item=raw as {id?:unknown;providerId?:unknown};const key=String(item.providerId||item.id||JSON.stringify(raw));unique.set(key,raw)}return Array.from(unique.values()).slice(-200)}

export function mergeStoredWorkspace(server:StoredWorkspace|null,incoming:StoredWorkspace):StoredWorkspace{
  if(!server)return cleanWorkspacePayload(incoming);
  const serverLeads=server.leads as Array<Record<string,unknown>>;const incomingLeads=incoming.leads as Array<Record<string,unknown>>;const incomingIds=new Set(incomingLeads.map(lead=>String(lead.id)));
  const byId=new Map(serverLeads.map(lead=>[String(lead.id),lead]));
  const leads=incomingLeads.map(client=>{const previous=byId.get(String(client.id));if(!previous)return client;const serverReplyNewer=newer(previous.lastInboundAt,client.lastInboundAt);const serverAutomationNewer=newer(previous.automationUpdatedAt,client.automationUpdatedAt);const reminderKeys=Array.from(new Set([...(Array.isArray(client.clientReminderKeys)?client.clientReminderKeys.map(String):[]),...(Array.isArray(previous.clientReminderKeys)?previous.clientReminderKeys.map(String):[])])).slice(-60);return {...previous,...client,communications:mergeCommunications(previous.communications,client.communications),clientReminderKeys:reminderKeys,lastInboundAt:serverReplyNewer?previous.lastInboundAt:client.lastInboundAt||previous.lastInboundAt,lastSmsAt:newer(previous.lastSmsAt,client.lastSmsAt)?previous.lastSmsAt:client.lastSmsAt||previous.lastSmsAt,lastEmailAt:newer(previous.lastEmailAt,client.lastEmailAt)?previous.lastEmailAt:client.lastEmailAt||previous.lastEmailAt,...(serverReplyNewer?{smsOptOut:previous.smsOptOut,emailOptOut:previous.emailOptOut}:{}),...(serverReplyNewer||serverAutomationNewer?{automationSequenceId:previous.automationSequenceId,automationStep:previous.automationStep,automationStatus:previous.automationStatus,automationNextAt:previous.automationNextAt,automationDeliveryFailures:previous.automationDeliveryFailures,automationLastError:previous.automationLastError,automationDeadLetterAt:previous.automationDeadLetterAt,automationUpdatedAt:previous.automationUpdatedAt}:{})}});
  for(const lead of serverLeads)if(!incomingIds.has(String(lead.id)))leads.push(lead);
  const serverLogs=server.callLogs as Array<Record<string,unknown>>;const byLogId=new Map(serverLogs.map(log=>[String(log.id),log]));const byCallSid=new Map(serverLogs.filter(log=>log.callSid).map(log=>[String(log.callSid),log]));const matchedServerLogIds=new Set<string>();
  const callLogs=(incoming.callLogs as Array<Record<string,unknown>>).map(client=>{const previous=byLogId.get(String(client.id))||(client.callSid?byCallSid.get(String(client.callSid)):undefined);if(!previous)return client;matchedServerLogIds.add(String(previous.id));return {...previous,...client,recordingSid:client.recordingSid||previous.recordingSid,recordingUrl:client.recordingUrl||previous.recordingUrl,recordingStatus:client.recordingStatus||previous.recordingStatus,transcript:client.transcript||previous.transcript,aiSummary:client.aiSummary||previous.aiSummary}});
  for(const log of serverLogs)if(!matchedServerLogIds.has(String(log.id)))callLogs.push(log);
  return cleanWorkspacePayload({leads:leads.slice(0,5000),callLogs:callLogs.slice(0,1000),profile:incoming.profile});
}

export function workspaceRedisConfig(){
  return {url:process.env.KV_REST_API_URL||process.env.UPSTASH_REDIS_REST_URL||"",token:process.env.KV_REST_API_TOKEN||process.env.UPSTASH_REDIS_REST_TOKEN||""};
}

export async function workspaceRedis(command:Array<string|number>){
  const {url,token}=workspaceRedisConfig();if(!url||!token)return null;
  const response=await fetch(url,{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify(command),cache:"no-store"});
  const data=await response.json() as {result?:unknown;error?:string};
  if(!response.ok||data.error)throw new Error(data.error||"Workspace storage request failed");
  return data.result;
}

async function workspaceD1(){
  const {getD1}=await import("../../db/index");
  const db=getD1();
  await db.prepare("CREATE TABLE IF NOT EXISTS crm_workspaces (user_id TEXT PRIMARY KEY, workspace_json TEXT NOT NULL, updated_at TEXT NOT NULL)").run();
  return db;
}

export async function readStoredWorkspace(userId:string){
  const stored=await workspaceRedis(["GET",workspaceKey(userId)]);
  if(typeof stored==="string")return cleanWorkspacePayload(JSON.parse(stored));
  if(workspaceRedisConfig().url)return null;
  const db=await workspaceD1();
  const result=await db.prepare("SELECT workspace_json AS workspaceJson FROM crm_workspaces WHERE user_id=? LIMIT 1").bind(workspaceDatabaseId(userId)).first() as {workspaceJson?:string}|null;
  return result?.workspaceJson?cleanWorkspacePayload(JSON.parse(result.workspaceJson)):null;
}

export async function migrateLegacyStoredWorkspace(userId:string){
  if(workspaceRedisConfig().url)return null;
  const db=await workspaceD1();
  const result=await db.prepare("SELECT workspace_json AS workspaceJson FROM crm_workspaces WHERE user_id=? LIMIT 1").bind(userId).first() as {workspaceJson?:string}|null;
  if(!result?.workspaceJson)return null;
  const workspace=cleanWorkspacePayload(JSON.parse(result.workspaceJson));
  await writeStoredWorkspace(userId,workspace);
  return workspace;
}

export async function writeStoredWorkspace(userId:string,workspace:StoredWorkspace){
  const serialized=JSON.stringify(cleanWorkspacePayload(workspace));
  const saved=await workspaceRedis(["SET",workspaceKey(userId),serialized]);
  if(saved!==null)return;
  const db=await workspaceD1();
  await db.prepare("INSERT INTO crm_workspaces (user_id,workspace_json,updated_at) VALUES (?,?,?) ON CONFLICT(user_id) DO UPDATE SET workspace_json=excluded.workspace_json, updated_at=excluded.updated_at").bind(workspaceDatabaseId(userId),serialized,new Date().toISOString()).run();
}

export async function listStoredWorkspaces(limit=500):Promise<WorkspaceRecord[]>{
  if(workspaceRedisConfig().url){
    const records:WorkspaceRecord[]=[];let cursor="0";let passes=0;
    do{
      const result=await workspaceRedis(["SCAN",cursor,"MATCH",`pacifica:${workspaceVersion}:workspace:*`,"COUNT",100]);
      if(!Array.isArray(result))break;
      cursor=String(result[0]||"0");const keys=Array.isArray(result[1])?result[1].map(String):[];
      const storedBatch=keys.length?await workspaceRedis(["MGET",...keys]):[];
      const values=Array.isArray(storedBatch)?storedBatch:[];
      for(let index=0;index<keys.length;index++){const stored=values[index];if(typeof stored!=="string")continue;records.push({workspaceId:keys[index].slice(`pacifica:${workspaceVersion}:workspace:`.length),workspace:cleanWorkspacePayload(JSON.parse(stored))});if(records.length>=limit)return records}
      passes++;
    }while(cursor!=="0"&&passes<25);
    return records;
  }
  const db=await workspaceD1();
  const result=await db.prepare("SELECT user_id AS userId,workspace_json AS workspaceJson FROM crm_workspaces WHERE user_id LIKE 'v2:%' LIMIT ?").bind(limit).all();
  return (result.results as Array<{userId:string;workspaceJson:string}>).map(row=>({workspaceId:row.userId.replace(/^v2:/,""),workspace:cleanWorkspacePayload(JSON.parse(row.workspaceJson))}));
}

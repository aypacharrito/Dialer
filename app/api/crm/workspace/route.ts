import { auth, currentUser } from "@clerk/nextjs/server";
import { isClerkConfigured } from "../../../lib/clerk-config";

export const runtime="nodejs";

type WorkspacePayload={leads:unknown[];callLogs:unknown[]};

type Identity={userId:string;email:string};

async function identity():Promise<Identity|null>{
  if(!isClerkConfigured())return process.env.VERCEL?null:{userId:"local",email:"local"};
  const {userId}=await auth();
  if(!userId)return null;
  const user=await currentUser();
  const email=(user?.primaryEmailAddress?.emailAddress||user?.emailAddresses[0]?.emailAddress||"").toLowerCase();
  return {userId,email};
}

const workspaceVersion="v2";
const legacyOwnerEmail="pacificalegalinsurance@gmail.com";
function workspaceKey(userId:string){return `pacifica:${workspaceVersion}:workspace:${userId}`}
function databaseId(userId:string){return `${workspaceVersion}:${userId}`}

function redisConfig(){
  const url=process.env.KV_REST_API_URL||process.env.UPSTASH_REDIS_REST_URL||"";
  const token=process.env.KV_REST_API_TOKEN||process.env.UPSTASH_REDIS_REST_TOKEN||"";
  return {url,token};
}

async function redis(command:Array<string|number>){
  const {url,token}=redisConfig();if(!url||!token)return null;
  const response=await fetch(url,{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify(command)});
  const data=await response.json() as {result?:unknown;error?:string};
  if(!response.ok||data.error)throw new Error(data.error||"Workspace storage request failed");
  return data.result;
}

async function d1(){
  const {getD1}=await import("../../../../db/index");
  const db=getD1();
  await db.prepare("CREATE TABLE IF NOT EXISTS crm_workspaces (user_id TEXT PRIMARY KEY, workspace_json TEXT NOT NULL, updated_at TEXT NOT NULL)").run();
  return db;
}

function cleanPayload(value:unknown):WorkspacePayload{
  const body=value&&typeof value==="object"?value as Partial<WorkspacePayload>:{};
  return {leads:Array.isArray(body.leads)?body.leads.slice(0,5000):[],callLogs:Array.isArray(body.callLogs)?body.callLogs.slice(0,1000):[]};
}

export async function GET(){
  const owner=await identity();if(!owner)return Response.json({error:"Sign in required"},{status:401});
  try{
    const key=workspaceKey(owner.userId);
    const stored=await redis(["GET",key]);
    if(typeof stored==="string")return Response.json({found:true,...cleanPayload(JSON.parse(stored))},{headers:{"Cache-Control":"no-store"}});
    if(redisConfig().url){
      if(owner.email===legacyOwnerEmail){
        const legacy=await redis(["GET",`pacifica:workspace:${owner.userId}`]);
        if(typeof legacy==="string"){await redis(["SET",key,legacy]);return Response.json({found:true,...cleanPayload(JSON.parse(legacy))},{headers:{"Cache-Control":"no-store"}})}
      }
      return Response.json({found:false,leads:[],callLogs:[]},{headers:{"Cache-Control":"no-store"}});
    }
    const db=await d1();let result=await db.prepare("SELECT workspace_json AS workspaceJson FROM crm_workspaces WHERE user_id=? LIMIT 1").bind(databaseId(owner.userId)).first() as {workspaceJson?:string}|null;
    if(!result?.workspaceJson&&owner.email===legacyOwnerEmail){
      result=await db.prepare("SELECT workspace_json AS workspaceJson FROM crm_workspaces WHERE user_id=? LIMIT 1").bind(owner.userId).first() as {workspaceJson?:string}|null;
      if(result?.workspaceJson)await db.prepare("INSERT OR REPLACE INTO crm_workspaces (user_id,workspace_json,updated_at) VALUES (?,?,?)").bind(databaseId(owner.userId),result.workspaceJson,new Date().toISOString()).run();
    }
    return result?.workspaceJson?Response.json({found:true,...cleanPayload(JSON.parse(result.workspaceJson))},{headers:{"Cache-Control":"no-store"}}):Response.json({found:false,leads:[],callLogs:[]},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return Response.json({error:error instanceof Error?error.message:"Unable to load workspace"},{status:500})}
}

export async function PUT(request:Request){
  const owner=await identity();if(!owner)return Response.json({error:"Sign in required"},{status:401});
  try{
    const payload=cleanPayload(await request.json());const serialized=JSON.stringify(payload);const key=workspaceKey(owner.userId);
    const saved=await redis(["SET",key,serialized]);
    if(saved!==null)return Response.json({ok:true,storage:"cloud"});
    const db=await d1();await db.prepare("INSERT INTO crm_workspaces (user_id,workspace_json,updated_at) VALUES (?,?,?) ON CONFLICT(user_id) DO UPDATE SET workspace_json=excluded.workspace_json, updated_at=excluded.updated_at").bind(databaseId(owner.userId),serialized,new Date().toISOString()).run();
    return Response.json({ok:true,storage:"cloud"});
  }catch(error){return Response.json({error:error instanceof Error?error.message:"Unable to save workspace"},{status:500})}
}

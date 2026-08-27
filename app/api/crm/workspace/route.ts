import { isClerkConfigured } from "../../../lib/clerk-config";
import {getPacificaAccess} from "../../../lib/clerk-access";
import type { WorkspaceProfile } from "../../../lib/workspace-profile";
import { cleanWorkspacePayload, mergeStoredWorkspace, migrateLegacyStoredWorkspace, readStoredWorkspace, workspaceKey, workspaceRedis, workspaceRedisConfig, writeStoredWorkspace } from "../../../lib/workspace-storage";

export const runtime="nodejs";

type WorkspacePayload={leads:unknown[];callLogs:unknown[];profile:WorkspaceProfile};

type Identity={userId:string;email:string;role:"owner"|"manager"|"agent"};

async function identity():Promise<Identity|null>{
  if(!isClerkConfigured())return process.env.VERCEL?null:{userId:"local",email:"local",role:"owner"};
  const access=await getPacificaAccess();
  if(!access.allowed)return null;const role=access.role==="manager"?"manager" as const:access.role==="agent"?"agent" as const:"owner" as const;
  return {userId:access.userId,email:access.email,role};
}

const legacyOwnerEmail="pacificalegalinsurance@gmail.com";

function cleanPayload(value:unknown):WorkspacePayload{
  return cleanWorkspacePayload(value);
}

export async function GET(){
  const owner=await identity();if(!owner)return Response.json({error:"Sign in required"},{status:401});
  try{
    const workspace=await readStoredWorkspace(owner.userId);
    if(workspace)return Response.json({found:true,...workspace},{headers:{"Cache-Control":"no-store"}});
    if(workspaceRedisConfig().url){
      if(owner.email===legacyOwnerEmail){
        const legacy=await workspaceRedis(["GET",`pacifica:workspace:${owner.userId}`]);
        if(typeof legacy==="string"){await workspaceRedis(["SET",workspaceKey(owner.userId),legacy]);return Response.json({found:true,...cleanPayload(JSON.parse(legacy))},{headers:{"Cache-Control":"no-store"}})}
      }
      return Response.json({found:false,...cleanPayload({})},{headers:{"Cache-Control":"no-store"}});
    }
    if(owner.email===legacyOwnerEmail){const migrated=await migrateLegacyStoredWorkspace(owner.userId);if(migrated)return Response.json({found:true,...migrated},{headers:{"Cache-Control":"no-store"}})}
    return Response.json({found:false,...cleanPayload({})},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return Response.json({error:error instanceof Error?error.message:"Unable to load workspace"},{status:500})}
}

export async function PUT(request:Request){
  const owner=await identity();if(!owner)return Response.json({error:"Sign in required"},{status:401});
  try{
    const payload=cleanPayload(await request.json());const current=await readStoredWorkspace(owner.userId);const protectedPayload=owner.role==="agent"&&current?{...payload,profile:current.profile}:payload;await writeStoredWorkspace(owner.userId,mergeStoredWorkspace(current,protectedPayload));
    return Response.json({ok:true,storage:"cloud"});
  }catch(error){return Response.json({error:error instanceof Error?error.message:"Unable to save workspace"},{status:500})}
}

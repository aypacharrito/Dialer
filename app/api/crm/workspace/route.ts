import { auth, currentUser } from "@clerk/nextjs/server";
import { isClerkConfigured } from "../../../lib/clerk-config";
import type { WorkspaceProfile } from "../../../lib/workspace-profile";
import { cleanWorkspacePayload, migrateLegacyStoredWorkspace, readStoredWorkspace, workspaceKey, workspaceRedis, workspaceRedisConfig, writeStoredWorkspace } from "../../../lib/workspace-storage";

export const runtime="nodejs";

type WorkspacePayload={leads:unknown[];callLogs:unknown[];profile:WorkspaceProfile};

type Identity={userId:string;email:string};

async function identity():Promise<Identity|null>{
  if(!isClerkConfigured())return process.env.VERCEL?null:{userId:"local",email:"local"};
  const {userId}=await auth();
  if(!userId)return null;
  const user=await currentUser();
  const email=(user?.primaryEmailAddress?.emailAddress||user?.emailAddresses[0]?.emailAddress||"").toLowerCase();
  return {userId,email};
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
    const payload=cleanPayload(await request.json());await writeStoredWorkspace(owner.userId,payload);
    return Response.json({ok:true,storage:"cloud"});
  }catch(error){return Response.json({error:error instanceof Error?error.message:"Unable to save workspace"},{status:500})}
}

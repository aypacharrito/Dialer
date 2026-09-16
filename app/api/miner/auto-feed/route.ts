import {getPacificaAccess} from "../../../lib/clerk-access";
import {isClerkConfigured} from "../../../lib/clerk-config";
import {saveMinerRun,cleanMinerAutoFeed,minerProviderStatus,runMinerAutoFeedForWorkspace} from "../../../lib/miner-auto-feed";
import {readStoredWorkspace} from "../../../lib/workspace-storage";

export const runtime="nodejs";
export const maxDuration=60;

async function access(){
  if(!isClerkConfigured())return process.env.NODE_ENV==="production"?null:{allowed:true,userId:"local",role:"owner"};
  const result=await getPacificaAccess();return result.allowed?result:null;
}

export async function GET(){
  const user=await access();if(!user)return Response.json({error:"Sign in required"},{status:401});
  const workspace=await readStoredWorkspace(user.userId);
  if(!workspace)return Response.json({error:"Workspace not found"},{status:404});
  return Response.json({providerStatus:minerProviderStatus(),settings:workspace.profile.minerAutoFeed},{headers:{"Cache-Control":"no-store"}});
}

export async function POST(request:Request){
  const user=await access();if(!user)return Response.json({error:"Sign in required"},{status:401});
  if(user.role==="agent")return Response.json({error:"Manager or owner access is required to change Miner Auto Feed."},{status:403});
  const workspace=await readStoredWorkspace(user.userId);
  if(!workspace)return Response.json({error:"Workspace not found"},{status:404});
  let body:{settings?:unknown};try{body=await request.json();if(!body||typeof body!=="object"||Array.isArray(body))throw new Error()}catch{return Response.json({error:"Invalid request"},{status:400})}
  const settings=cleanMinerAutoFeed(body.settings,workspace.profile.minerAutoFeed);
  try{
    const run=await runMinerAutoFeedForWorkspace(user.userId,workspace,settings);
    const saved=await saveMinerRun(user.userId,workspace,run);
    return Response.json({ok:true,...saved.result,settings:saved.workspace.profile.minerAutoFeed});
  }catch(error){
    return Response.json({error:error instanceof Error?error.message:"Miner Auto Feed failed",providerStatus:minerProviderStatus()},{status:500});
  }
}

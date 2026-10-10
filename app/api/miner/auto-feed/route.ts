import {accountAllows} from '../../../lib/account-access-policy';
import {getPacificaMinerOwnerAccess} from "../../../lib/clerk-access";
import {saveMinerRun,cleanMinerAutoFeed,minerProviderStatus,runMinerAutoFeedForWorkspace} from "../../../lib/miner-auto-feed";
import {readStoredWorkspace} from "../../../lib/workspace-storage";

export const runtime="nodejs";
export const maxDuration=60;

export async function GET(){
  const user=await getPacificaMinerOwnerAccess();if(!user)return Response.json({error:"Miner is available only to the Pacifica platform owner."},{status:403});
  const workspace=await readStoredWorkspace(user.userId);
  if(!workspace)return Response.json({error:"Workspace not found"},{status:404});
  return Response.json({providerStatus:minerProviderStatus(),settings:workspace.profile.minerAutoFeed},{headers:{"Cache-Control":"no-store"}});
}

export async function POST(request:Request){
  const user=await getPacificaMinerOwnerAccess();if(!user)return Response.json({error:"Miner is available only to the Pacifica platform owner."},{status:403});
  if(user.role==="agent"||!accountAllows(user,"/api/miner/auto-feed","POST"))return Response.json({error:"Manager or owner access is required to change Miner Auto Feed."},{status:403});
  const workspace=await readStoredWorkspace(user.userId);
  if(!workspace)return Response.json({error:"Workspace not found"},{status:404});
  let body:{settings?:unknown};try{body=await request.json();if(!body||typeof body!=="object"||Array.isArray(body))throw new Error()}catch{return Response.json({error:"Invalid request"},{status:400})}
  const settings=cleanMinerAutoFeed(body.settings,workspace.profile.minerAutoFeed);
  try{
    const run=await runMinerAutoFeedForWorkspace(user.userId,workspace,{...settings,enabled:true});
    run.workspace.profile.minerAutoFeed.enabled=settings.enabled;
    const saved=await saveMinerRun(user.userId,workspace,run);
    return Response.json({ok:true,...saved.result,settings:saved.workspace.profile.minerAutoFeed,prospects:saved.workspace.leads.filter(lead=>/Pacifica Miner/i.test(String((lead as {source?:string}).source||"")))});
  }catch(error){
    return Response.json({error:error instanceof Error?error.message:"Miner Auto Feed failed",providerStatus:minerProviderStatus()},{status:500});
  }
}

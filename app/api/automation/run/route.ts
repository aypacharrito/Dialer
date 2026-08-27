import {getPacificaAccess} from "../../../lib/clerk-access";
import {isClerkConfigured} from "../../../lib/clerk-config";
import {runFollowUpAutomation} from "../../../lib/follow-up-engine";
import {workspaceRedis} from "../../../lib/workspace-storage";

export const runtime="nodejs";
export const maxDuration=60;

async function access(){
  const result=isClerkConfigured()?await getPacificaAccess():{allowed:!process.env.VERCEL,userId:"local",role:"owner" as const};
  return result.allowed?result:null;
}

export async function GET(){
  const workspace=await access();if(!workspace)return Response.json({error:"Workspace access required"},{status:403});
  const stored=await workspaceRedis(["GET","pacifica:v2:automation:last-run"]);
  return Response.json({configured:Boolean(process.env.CRON_SECRET),schedule:"every 5 minutes",lastRun:typeof stored==="string"?JSON.parse(stored):null},{headers:{"Cache-Control":"no-store"}});
}

export async function POST(){
  const workspace=await access();if(!workspace)return Response.json({error:"Workspace access required"},{status:403});
  try{return Response.json(await runFollowUpAutomation({workspaceId:workspace.userId,workspaceLimit:1,sendLimit:50}))}
  catch(error){return Response.json({error:error instanceof Error?error.message:"Automation run failed"},{status:500})}
}

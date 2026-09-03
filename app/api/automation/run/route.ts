import {getPacificaAccess} from "../../../lib/clerk-access";
import {isClerkConfigured} from "../../../lib/clerk-config";
import {runFollowUpAutomation} from "../../../lib/follow-up-engine";
import {runClientReminderAutomation} from "../../../lib/client-reminder-engine";
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
  return Response.json({configured:Boolean(process.env.CRON_SECRET),browserSchedule:"Runs every five minutes while Pacifica is open",serverSchedule:"daily at 16:00 UTC",lastRun:typeof stored==="string"?JSON.parse(stored):null},{headers:{"Cache-Control":"no-store"}});
}

export async function POST(){
  const workspace=await access();if(!workspace)return Response.json({error:"Workspace access required"},{status:403});
  try{const followUps=await runFollowUpAutomation({workspaceId:workspace.userId,workspaceLimit:1,sendLimit:50});const clientReminders=await runClientReminderAutomation({workspaceId:workspace.userId,workspaceLimit:1,sendLimit:50});return Response.json({ok:true,followUps,clientReminders})}
  catch(error){return Response.json({error:error instanceof Error?error.message:"Automation run failed"},{status:500})}
}

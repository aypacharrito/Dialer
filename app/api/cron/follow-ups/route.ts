import {runFollowUpAutomation} from "../../../lib/follow-up-engine";
import {runClientReminderAutomation} from "../../../lib/client-reminder-engine";
import {logError} from "../../../lib/observability";

export const runtime="nodejs";
export const maxDuration=60;

function authorized(request:Request){
  const secret=(process.env.CRON_SECRET||"").trim();
  return Boolean(secret&&request.headers.get("authorization")===`Bearer ${secret}`);
}

export async function GET(request:Request){
  if(!authorized(request))return Response.json({error:process.env.CRON_SECRET?"Unauthorized":"CRON_SECRET is not configured"},{status:process.env.CRON_SECRET?401:503});
  try{const followUps=await runFollowUpAutomation();const clientReminders=await runClientReminderAutomation();return Response.json({ok:true,followUps,clientReminders})}
  catch(error){logError("follow_up_automation_failed",error);return Response.json({error:error instanceof Error?error.message:"Automation run failed"},{status:500})}
}

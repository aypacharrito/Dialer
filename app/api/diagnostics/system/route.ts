import {getPacificaAccess} from "../../../lib/clerk-access";
import {isClerkConfigured} from "../../../lib/clerk-config";
import {outboundEmailStatus,inboundReplyAddress} from "../../../lib/outbound-email";
import {outboundSmsStatus} from "../../../lib/outbound-sms";
import {phoneAssignmentForWorkspace} from "../../../lib/phone-assignments";
import {readStoredWorkspace,workspaceRedis,workspaceRedisConfig} from "../../../lib/workspace-storage";

export const runtime="nodejs";

export async function GET(){
  const access=isClerkConfigured()?await getPacificaAccess():{allowed:!process.env.VERCEL,userId:"local",role:"owner" as const};if(!access.allowed)return Response.json({error:"Workspace access required"},{status:403});
  const [workspace,assignment,sms,lastRun]=await Promise.all([readStoredWorkspace(access.userId),phoneAssignmentForWorkspace(access.userId),outboundSmsStatus(access.userId),workspaceRedis(["GET","pacifica:v2:automation:last-run"]).catch(()=>null)]);const email=outboundEmailStatus();
  const storage=workspaceRedisConfig();const checks={storage:{ready:Boolean(storage.url&&storage.token)||Boolean(workspace),detail:storage.url?"Cloud workspace storage connected":"Fallback storage in use"},voice:{ready:Boolean(assignment?.phoneNumber&&process.env.TWILIO_TWIML_APP_SID),detail:assignment?.phoneNumber||"No number assigned"},sms:{ready:sms.configured,detail:sms.message},email:{ready:email.configured,detail:email.message},emailReplies:{ready:Boolean(process.env.RESEND_WEBHOOK_SECRET&&inboundReplyAddress(access.userId)),detail:process.env.RESEND_WEBHOOK_SECRET&&inboundReplyAddress(access.userId)?"Signed inbound email webhook ready":"Add RESEND_WEBHOOK_SECRET and PACIFICA_INBOUND_EMAIL_DOMAIN"},automation:{ready:Boolean(process.env.CRON_SECRET&&workspace?.profile.serverAutomationEnabled),detail:workspace?.profile.serverAutomationEnabled?"Five-minute server automation enabled":"Turn on Autopilot in Automation Studio"},ai:{ready:Boolean(process.env.OPENAI_API_KEY),detail:process.env.OPENAI_API_KEY?"OpenAI drafting and call intelligence ready":"Smart fallback only"},recording:{ready:Boolean(workspace?.profile.callRecordingEnabled),detail:workspace?.profile.callRecordingEnabled?workspace.profile.callAiSummaryEnabled?"Consent recording + AI summary enabled":"Consent recording enabled":"Recording off"}};
  const ready=Object.values(checks).filter(check=>check.ready).length;return Response.json({status:ready===Object.keys(checks).length?"launch ready":"setup needed",ready,total:Object.keys(checks).length,checks,lastAutomationRun:typeof lastRun==="string"?JSON.parse(lastRun):null,release:process.env.VERCEL_GIT_COMMIT_SHA?.slice(0,8)||"local"},{headers:{"Cache-Control":"no-store"}});
}

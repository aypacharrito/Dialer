import {logError,logEvent} from "../../../../lib/observability";
import {rejectedTwilioWebhook,validateTwilioWebhook} from "../../../../lib/twilio-webhook";
import {readStoredWorkspace,writeStoredWorkspace} from "../../../../lib/workspace-storage";

export const runtime="nodejs";

function safeWorkspace(value:string){return value.replace(/[^a-zA-Z0-9_-]/g,"").slice(0,160)}
const optOutErrors=new Set(["21610","21611"]);

export async function POST(request:Request){
  const form=await request.formData();if(!await validateTwilioWebhook(request,form))return rejectedTwilioWebhook();
  const workspaceId=safeWorkspace(new URL(request.url).searchParams.get("workspace")||"");const providerId=String(form.get("MessageSid")||form.get("SmsSid")||"");const status=String(form.get("MessageStatus")||form.get("SmsStatus")||"unknown").toLowerCase();const errorCode=String(form.get("ErrorCode")||"");
  if(!workspaceId||!providerId)return Response.json({received:true,ignored:true});
  try{
    const workspace=await readStoredWorkspace(workspaceId);if(!workspace)return Response.json({received:true,ignored:true});let matched=false;
    const leads=workspace.leads.map(raw=>{const lead=raw as Record<string,unknown>;const communications=Array.isArray(lead.communications)?lead.communications as Array<Record<string,unknown>>:[];let leadMatched=false;
      const updated=communications.map(item=>{if(item.providerId!==providerId)return item;matched=true;leadMatched=true;return {...item,status,failureReason:errorCode?`Twilio ${errorCode}`:undefined}});
      if(!leadMatched)return lead;const optedOut=optOutErrors.has(errorCode);return {...lead,communications:updated,...(optedOut?{smsOptOut:true,smsConsent:false,automationStatus:"opted out",automationNextAt:"",lastInboundAt:new Date().toISOString()}:{})};
    });
    if(matched)await writeStoredWorkspace(workspaceId,{...workspace,leads});logEvent("sms_delivery_updated",{workspaceId,status,errorCode:errorCode||undefined,matched});return Response.json({received:true,matched});
  }catch(error){logError("sms_delivery_callback_failed",error,{workspaceId,status});return Response.json({error:"SMS delivery callback failed"},{status:500})}
}

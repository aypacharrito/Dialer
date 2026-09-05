import {appendCommunication} from "../../../lib/communications";
import {phoneAssignmentForNumber} from "../../../lib/phone-assignments";
import {logError,logEvent} from "../../../lib/observability";
import {readStoredWorkspace,writeStoredWorkspace} from "../../../lib/workspace-storage";
import {rejectedTwilioWebhook,validateTwilioWebhook} from "../../../lib/twilio-webhook";
import {sendExpoPush} from "../../../lib/expo-push";

export const runtime="nodejs";

const stop=/^\s*(stop|stopall|unsubscribe|cancel|end|quit)\s*[.!]?\s*$/i;
const start=/^\s*(start|yes|unstop)\s*[.!]?\s*$/i;
const digits=(value:string)=>value.replace(/\D/g,"").slice(-10);

function twiml(){return new Response("<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response></Response>",{headers:{"Content-Type":"text/xml; charset=utf-8","Cache-Control":"no-store"}})}

export async function POST(request:Request){
  const form=await request.formData();if(!await validateTwilioWebhook(request,form))return rejectedTwilioWebhook();
  try{
    const to=String(form.get("To")||"");const from=String(form.get("From")||"");const body=String(form.get("Body")||"").trim().slice(0,10000);const sid=String(form.get("MessageSid")||form.get("SmsSid")||crypto.randomUUID());
    const assignment=await phoneAssignmentForNumber(to);if(!assignment){logError("inbound_sms_unassigned",new Error("No workspace assignment"),{toLast4:digits(to).slice(-4)});return twiml()}
    const workspace=await readStoredWorkspace(assignment.workspaceId);if(!workspace)return twiml();
    const phone=digits(from);let matched=false;
    const leads=(workspace.leads as Array<Record<string,unknown>>).map(raw=>{
      if(matched||digits(String(raw.phone||""))!==phone)return raw;matched=true;
      const sentAt=new Date().toISOString();const optedOut=stop.test(body);const optedIn=start.test(body);
      return {...raw,lastInboundAt:sentAt,lastContact:"Text reply received",automationNextAt:"",automationStatus:optedOut?"opted out":"replied",...(optedOut?{smsOptOut:true,smsConsent:false}:optedIn?{smsOptOut:false,smsConsent:true}:{}),communications:appendCommunication(raw.communications,{id:sid,channel:"sms",direction:"inbound",body,status:"received",sentAt,provider:"twilio",providerId:sid})};
    });
    if(!matched){const sentAt=new Date().toISOString();leads.unshift({id:Date.now(),name:`Inbound text · ${from.slice(-4)}`,phone:from,email:"",city:"",status:"Ready",stage:"New lead",outcome:"Not contacted",notes:"Created automatically from an inbound text.",followUp:"",doNotCall:stop.test(body),lastContact:"Text reply received",line:"life",source:"Inbound SMS",leadCost:0,product:"Inbound inquiry",sourceDisposition:"New",importedAt:sentAt,received:sentAt,smsConsent:!stop.test(body),smsOptOut:stop.test(body),lastInboundAt:sentAt,automationNextAt:"",automationStatus:stop.test(body)?"opted out":"replied",communications:[{id:sid,channel:"sms",direction:"inbound",body,status:"received",sentAt,provider:"twilio",providerId:sid}]})}
    await writeStoredWorkspace(assignment.workspaceId,{...workspace,leads});
    void sendExpoPush(workspace.profile.expoPushToken,matched?"New Pacifica message":"New Pacifica lead",body,{channel:"sms"});
    logEvent("inbound_sms_saved",{workspaceId:assignment.workspaceId,matched,optedOut:stop.test(body),fromLast4:phone.slice(-4)});
    return twiml();
  }catch(error){logError("inbound_sms_failed",error);return twiml()}
}

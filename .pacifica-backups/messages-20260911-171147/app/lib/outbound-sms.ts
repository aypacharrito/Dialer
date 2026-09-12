import {assertAutomatedContact} from "./automated-contact";
import {logEvent} from "./observability";
import {smsReadiness} from "./sms-readiness";
import {phoneAssignmentForWorkspace} from "./phone-assignments";
import {twilioAccountConfig,twilioApiErrorMessage,twilioApiRequest,type TwilioApiError} from "./twilio-rest";

type TwilioMessageResponse=TwilioApiError&{sid?:string;status?:string};

function normalized(value:string){
  const digits=value.replace(/\D/g,"");
  if(digits.length===10)return `+1${digits}`;
  if(digits.length===11&&digits.startsWith("1"))return `+${digits}`;
  return /^\+[1-9]\d{7,14}$/.test(value.trim())?value.trim():"";
}

export async function outboundSmsStatus(workspaceId:string,email=""){
  const assignment=await phoneAssignmentForWorkspace(workspaceId,email);
  let credentialError="";
  try{twilioAccountConfig()}catch(error){credentialError=error instanceof Error?error.message:"Twilio credentials are incomplete"}
  const sendingEnabled=process.env.PACIFICA_SMS_SENDING_ENABLED!=="false";
  return smsReadiness(assignment,sendingEnabled,credentialError);
}

export async function sendOutboundSms(input:{workspaceId:string;to:string;body:string;workspaceEmail?:string;automated?:boolean}){
  const requestedAt=Date.now();
  const status=await outboundSmsStatus(input.workspaceId,input.workspaceEmail);
  if(!status.configured)throw new Error(status.message);
  const to=normalized(input.to);if(!to)throw new Error("Lead has an invalid phone number");
  const body=input.body.trim().slice(0,1500);if(!body)throw new Error("Write a message first");
  const {accountSid,credentials}=twilioAccountConfig();
  const callbackBase=(process.env.TWILIO_WEBHOOK_BASE_URL||"https://pacificacrm.com").trim().replace(/\/$/,"");
  const assignment=await phoneAssignmentForWorkspace(input.workspaceId,input.workspaceEmail);const form=new URLSearchParams({To:to,From:status.from,Body:body,StatusCallback:`${callbackBase}/api/twilio/messages/status?workspace=${encodeURIComponent(input.workspaceId)}`});
  if(assignment?.messagingServiceSid)form.set("MessagingServiceSid",assignment.messagingServiceSid);
  if(input.automated)await assertAutomatedContact(input.workspaceId,to,"sms");
  const {response,data}=await twilioApiRequest<TwilioMessageResponse>(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:form.toString()},credentials);
  if(!response.ok||!data.sid)throw new Error(twilioApiErrorMessage(data,"Twilio rejected the automated follow-up"));
  logEvent("sms_provider_accepted",{providerId:data.sid,workspaceId:input.workspaceId,status:data.status||"queued",requestedAt:new Date(requestedAt).toISOString(),elapsedMs:Date.now()-requestedAt});
  return {id:data.sid,provider:"twilio" as const,status:data.status||"queued",from:status.from};
}

import { refreshAutomation, nextAutomationAfterAttempt, type AutomationLead } from "../../../lib/lead-automation";
import { logError, logEvent } from "../../../lib/observability";
import { listStoredWorkspaces, writeStoredWorkspace } from "../../../lib/workspace-storage";
import { phoneAssignmentForWorkspace } from "../../../lib/phone-assignments";
import { twilioAccountConfig, twilioApiErrorMessage, twilioApiRequest, type TwilioApiError } from "../../../lib/twilio-rest";

export const runtime="nodejs";
export const maxDuration=60;

type FollowUpLead=AutomationLead&{name:string;phone:string;product:string;smsConsent?:boolean;smsOptOut?:boolean;lastSmsAt?:string};
type TwilioMessageResponse=TwilioApiError&{sid?:string};

function authorized(request:Request){
  const secret=(process.env.CRON_SECRET||"").trim();
  return Boolean(secret&&request.headers.get("authorization")===`Bearer ${secret}`);
}

function normalized(value:string){
  const digits=value.replace(/\D/g,"");
  if(digits.length===10)return `+1${digits}`;
  if(digits.length===11&&digits.startsWith("1"))return `+${digits}`;
  return /^\+[1-9]\d{7,14}$/.test(value.trim())?value.trim():"";
}

function firstName(value:string){return value.trim().split(/\s+/)[0]||"there"}

function followUpText(lead:FollowUpLead,businessName:string,agentName:string,callbackNumber:string){
  const sender=[agentName,businessName&&`with ${businessName}`].filter(Boolean).join(" ")||businessName||"our team";
  const callback=callbackNumber?` You can also call ${callbackNumber}.`:"";
  return `Hi ${firstName(lead.name)}, it’s ${sender}. I’m following up about your ${lead.product||"service"} request. Is now a good time to help?${callback} Reply STOP to opt out.`.slice(0,1500);
}

async function sendSms(workspaceId:string,lead:FollowUpLead,businessName:string,agentName:string,callbackNumber:string){
  if(process.env.TWILIO_A2P_APPROVED!=="true")throw new Error("A2P approval gate is closed");
  const assignment=await phoneAssignmentForWorkspace(workspaceId);
  if(!assignment||assignment.provider!=="twilio")throw new Error("No Twilio number is assigned");
  if(assignment.smsStatus!=="registered")throw new Error("Assigned number is not marked A2P registered");
  const to=normalized(lead.phone);if(!to)throw new Error("Lead has an invalid phone number");
  const {accountSid,credentials}=twilioAccountConfig();
  const form=new URLSearchParams({To:to,From:assignment.phoneNumber,Body:followUpText(lead,businessName,agentName,callbackNumber)});
  const {response,data}=await twilioApiRequest<TwilioMessageResponse>(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:form.toString()},credentials);
  if(!response.ok||!data.sid)throw new Error(twilioApiErrorMessage(data,"Twilio rejected the automated follow-up"));
  return data.sid;
}

export async function GET(request:Request){
  if(!authorized(request))return Response.json({error:process.env.CRON_SECRET?"Unauthorized":"CRON_SECRET is not configured"},{status:process.env.CRON_SECRET?401:503});
  const started=Date.now();let workspaces=0;let changed=0;let due=0;let sent=0;let blocked=0;let failed=0;
  try{
    const records=await listStoredWorkspaces(500);
    for(const record of records){
      workspaces++;const profile=record.workspace.profile;
      if(!profile.serverAutomationEnabled)continue;
      let workspaceChanged=false;
      const leads=record.workspace.leads.map(raw=>{
        const original=raw as FollowUpLead;const refreshed=refreshAutomation(original);
        const next=refreshed;
        if(JSON.stringify(refreshed)!==JSON.stringify(original))workspaceChanged=true;
        if(refreshed.automationStatus!=="action due")return next;
        due++;
        const recentSms=refreshed.lastSmsAt&&Date.now()-new Date(refreshed.lastSmsAt).getTime()<22*60*60*1000;
        if(!refreshed.smsConsent||refreshed.smsOptOut||refreshed.doNotCall||recentSms){blocked++;return next}
        return next;
      });

      for(let index=0;index<leads.length&&sent<250;index++){
        const lead=leads[index] as FollowUpLead;
        if(lead.automationStatus!=="action due"||!lead.smsConsent||lead.smsOptOut||lead.doNotCall)continue;
        if(lead.lastSmsAt&&Date.now()-new Date(lead.lastSmsAt).getTime()<22*60*60*1000)continue;
        if(process.env.TWILIO_A2P_APPROVED!=="true"){blocked++;continue}
        try{
          await sendSms(record.workspaceId,lead,profile.businessName,profile.agentName,profile.callbackNumber);
          const step=(lead.automationStep||0)+1;
          leads[index]={...lead,lastSmsAt:new Date().toISOString(),automationStep:step,automationNextAt:nextAutomationAfterAttempt(step),automationStatus:step>=4?"complete":"scheduled"};
          sent++;workspaceChanged=true;
        }catch(error){
          if(error instanceof Error&&/A2P|assigned|registered/i.test(error.message))blocked++;else failed++;
          logError("follow_up_sms_failed",error,{workspaceId:record.workspaceId,leadId:lead.id});
        }
      }
      if(workspaceChanged){await writeStoredWorkspace(record.workspaceId,{...record.workspace,leads});changed++}
    }
    logEvent("follow_up_cron_complete",{workspaces,changed,due,sent,blocked,failed,durationMs:Date.now()-started});
    return Response.json({ok:true,workspaces,changed,due,sent,blocked,failed,a2pApproved:process.env.TWILIO_A2P_APPROVED==="true",durationMs:Date.now()-started});
  }catch(error){logError("follow_up_cron_failed",error,{workspaces,changed,due,sent,blocked,failed});return Response.json({error:error instanceof Error?error.message:"Automation run failed",workspaces,changed,due,sent,blocked,failed},{status:500})}
}

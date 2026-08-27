import { dateValue, leadCreatedAt } from "./lead-priority";

export type AutomationLead={
  id:number;stage:string;outcome:string;doNotCall:boolean;importedAt:string;received?:string;attempts?:number;lastAttemptAt?:string;lastSmsAt?:string;
  email?:string;smsConsent?:boolean;smsOptOut?:boolean;emailConsent?:boolean;emailOptOut?:boolean;lastEmailAt?:string;
  automationEnabled?:boolean;automationStep?:number;automationNextAt?:string;automationStatus?:string;
};

export type AutomationChannel="sms"|"email"|"salesperson";

const hour=60*60*1000;
const day=24*hour;

function nextBusinessMorning(from:number){
  const date=new Date(from);date.setDate(date.getDate()+1);date.setHours(9,0,0,0);
  while(date.getDay()===0||date.getDay()===6)date.setDate(date.getDate()+1);
  return date.toISOString();
}

export function nextAutomationAfterAttempt(attempts:number,now=Date.now()){
  if(attempts<=1)return new Date(now+2*hour).toISOString();
  if(attempts===2)return nextBusinessMorning(now);
  if(attempts===3)return new Date(now+3*day).toISOString();
  return "";
}

export function recommendedAutomationChannel(lead:AutomationLead,step=lead.automationStep||0):AutomationChannel{
  const sms=Boolean(lead.smsConsent&&!lead.smsOptOut);
  const email=Boolean(lead.email&&lead.emailConsent&&!lead.emailOptOut);
  const preferEmail=step%2===1;
  if(preferEmail&&email)return "email";
  if(sms)return "sms";
  if(email)return "email";
  return "salesperson";
}

export function initializeAutomation<T extends AutomationLead>(lead:T,now=Date.now()):T{
  if(lead.automationEnabled===false||lead.automationNextAt||lead.stage==="Closed"||lead.doNotCall)return lead;
  const arrived=leadCreatedAt(lead);
  const next=lead.outcome==="No answer"||lead.outcome==="Voicemail"?nextAutomationAfterAttempt(Math.max(1,lead.attempts||1),Number.isFinite(dateValue(lead.lastAttemptAt))?dateValue(lead.lastAttemptAt):now):new Date(Math.max(now,arrived+5*60*1000)).toISOString();
  return {...lead,automationEnabled:true,automationStep:lead.attempts||0,automationNextAt:next,automationStatus:"scheduled"};
}

export function refreshAutomation<T extends AutomationLead>(lead:T,now=Date.now()):T{
  if(lead.stage==="Closed"||lead.doNotCall)return lead.automationStatus==="paused"?lead:{...lead,automationStatus:"paused",automationNextAt:""};
  if(lead.stage==="Appointment"||lead.outcome==="Appointment set"||lead.outcome==="Interested")return lead.automationStatus==="waiting on salesperson"?lead:{...lead,automationStatus:"waiting on salesperson",automationNextAt:""};
  if(lead.automationEnabled===false)return lead;
  const initialized=initializeAutomation(lead,now);
  const next=dateValue(initialized.automationNextAt);
  const due=Number.isFinite(next)&&next<=now;
  const status=due?"action due":initialized.automationNextAt?"scheduled":"complete";
  return initialized.automationStatus===status?initialized:{...initialized,automationStatus:status};
}

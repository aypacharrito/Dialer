import type {StoredCommunication} from "./communications";
import {dateValue,leadCreatedAt,leadPriority,type LeadPriorityInput} from "./lead-priority";

export type MessagePriorityLead=LeadPriorityInput&{
  phone:string;
  email:string;
  smsOptOut?:boolean;
  emailOptOut?:boolean;
  communications?:StoredCommunication[];
};

export type SmsPriorityMessage={direction:string;from:string;to:string;sentAt:string};
export type MessageChannel="sms"|"email";
export type MessagePriority={
  tier:number;
  score:number;
  label:"REPLY NOW"|"APPOINTMENT"|"INTERESTED"|"FOLLOW-UP DUE"|"NEW LEAD"|"ACTIVE"|"OPEN"|"BLOCKED";
  tone:"reply"|"hot"|"due"|"fresh"|"normal"|"blocked";
  detail:string;
  latestAt:number;
  waitingForReply:boolean;
};

const hour=60*60*1000;
const day=24*hour;
const digits=(value:string)=>value.replace(/\D/g,"").slice(-10);

function channelActivity(lead:MessagePriorityLead,messages:SmsPriorityMessage[],channel:MessageChannel){
  const activity=channel==="sms"
    ?messages.filter(message=>digits(message.from)===digits(lead.phone)||digits(message.to)===digits(lead.phone)).map(message=>({direction:/inbound/i.test(message.direction)?"inbound" as const:"outbound" as const,sentAt:message.sentAt}))
    :(lead.communications||[]).filter(message=>message.channel==="email").map(message=>({direction:message.direction,sentAt:message.sentAt}));
  return activity.reduce((current,message)=>{
    const timestamp=dateValue(message.sentAt);
    if(!Number.isFinite(timestamp)||timestamp<=current.latestAt)return current;
    return {latestAt:timestamp,direction:message.direction};
  },{latestAt:0,direction:"" as "inbound"|"outbound"|""});
}

export function messagePriority(lead:MessagePriorityLead,messages:SmsPriorityMessage[],channel:MessageChannel,now=Date.now()):MessagePriority{
  const base=leadPriority(lead,now);
  const activity=channelActivity(lead,messages,channel);
  const waitingForReply=activity.direction==="inbound";
  const blocked=lead.doNotCall||(channel==="sms"?lead.smsOptOut:lead.emailOptOut);
  const outcome=lead.outcome.toLowerCase();
  const disposition=lead.sourceDisposition.toLowerCase();
  const appointment=lead.stage==="Appointment"||outcome==="appointment set"||disposition.includes("appointment");
  const interested=outcome==="interested"||disposition.includes("interested")||disposition.includes("working");
  const createdAt=leadCreatedAt(lead);
  const fresh=createdAt>0&&now-createdAt<=day;
  const activityAge=activity.latestAt?Math.max(0,now-activity.latestAt):Number.POSITIVE_INFINITY;

  if(blocked)return {tier:0,score:-2000,label:"BLOCKED",tone:"blocked",detail:lead.doNotCall?"Outreach blocked by DNC":"Channel opt-out recorded",latestAt:activity.latestAt,waitingForReply:false};
  if(waitingForReply){
    const urgency=activityAge<=15*60*1000?160:activityAge<=hour?120:activityAge<=day?80:40;
    return {tier:6,score:base.score+urgency,label:"REPLY NOW",tone:"reply",detail:activityAge<=hour?"New inbound reply waiting":"Inbound reply has not been answered",latestAt:activity.latestAt,waitingForReply:true};
  }
  if(appointment)return {tier:5,score:base.score+100,label:"APPOINTMENT",tone:"hot",detail:"Protect and confirm the booked appointment",latestAt:activity.latestAt,waitingForReply:false};
  if(interested)return {tier:4,score:base.score+80,label:"INTERESTED",tone:"hot",detail:"Active opportunity with buying intent",latestAt:activity.latestAt,waitingForReply:false};
  if(base.due)return {tier:3,score:base.score+60,label:"FOLLOW-UP DUE",tone:"due",detail:base.detail,latestAt:activity.latestAt,waitingForReply:false};
  if(fresh)return {tier:2,score:base.score+30,label:"NEW LEAD",tone:"fresh",detail:base.detail,latestAt:activity.latestAt,waitingForReply:false};
  if(activity.latestAt)return {tier:2,score:base.score+Math.max(0,30-Math.floor(activityAge/day)),label:"ACTIVE",tone:"normal",detail:"Recent conversation activity",latestAt:activity.latestAt,waitingForReply:false};
  return {tier:1,score:base.score,label:"OPEN",tone:"normal",detail:base.detail,latestAt:0,waitingForReply:false};
}

export function rankMessageLeads<T extends MessagePriorityLead>(leads:T[],messages:SmsPriorityMessage[],channel:MessageChannel,now=Date.now()){
  return leads.toSorted((left,right)=>{
    const leftPriority=messagePriority(left,messages,channel,now);
    const rightPriority=messagePriority(right,messages,channel,now);
    return rightPriority.tier-leftPriority.tier||rightPriority.score-leftPriority.score||rightPriority.latestAt-leftPriority.latestAt||leadCreatedAt(right)-leadCreatedAt(left)||right.id-left.id;
  });
}

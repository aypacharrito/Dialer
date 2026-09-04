import type {WorkspaceProfile} from "./workspace-profile";

export type ClientRecord={
  id:number;name:string;phone:string;email?:string;product?:string;source?:string;city?:string;stage?:string;outcome?:string;closedRevenue?:number;smsConsent?:boolean;smsOptOut?:boolean;
  clientStatus?:"active"|"inactive";dateOfBirth?:string;policyNumber?:string;policyEffectiveDate?:string;policyExpirationDate?:string;renewalDate?:string;policyPremium?:number;policyTermMonths?:number;clientReminderKeys?:string[];
  importedFields?:Record<string,string>;extraFields?:Record<string,string>;
};

export type ClientReminderAction={key:string;recipient:"customer"|"owner";to:string;body:string;event:"birthday"|"renewal";daysUntil:number};

function normalizedKey(value:string){return value.toLowerCase().replace(/[^a-z0-9]/g,"")}
function importedValue(lead:ClientRecord,aliases:string[]){
  const wanted=new Set(aliases.map(normalizedKey));
  for(const [key,value] of [...Object.entries(lead.importedFields||{}),...Object.entries(lead.extraFields||{})])if(wanted.has(normalizedKey(key))&&String(value||"").trim())return String(value).trim();
  return "";
}

function isoDate(value:string){
  const direct=value.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);if(direct)return `${direct[1]}-${direct[2].padStart(2,"0")}-${direct[3].padStart(2,"0")}`;
  const us=value.trim().match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);if(us)return `${us[3]}-${us[1].padStart(2,"0")}-${us[2].padStart(2,"0")}`;
  return "";
}

export function clientDates(lead:ClientRecord){
  const dateOfBirth=isoDate(lead.dateOfBirth||importedValue(lead,["date of birth","dob","birth date","birthdate"]));
  const renewalDate=isoDate(lead.renewalDate||lead.policyExpirationDate||importedValue(lead,["renewal date","policy renewal date","policy expiration date","policy expiry date","expiration date"]));
  const policyEffectiveDate=isoDate(lead.policyEffectiveDate||importedValue(lead,["policy effective date","effective date"]));
  const policyNumber=lead.policyNumber||importedValue(lead,["policy number","policy #","policy no"]);
  return {dateOfBirth,renewalDate,policyEffectiveDate,policyNumber};
}

export function clientPolicyMetrics(lead:ClientRecord){
  const premium=Math.max(0,Number(lead.policyPremium||importedValue(lead,["policy premium","term premium","total policy premium"]))||0);
  const termMonths=Math.max(0,Number(lead.policyTermMonths||importedValue(lead,["policy term months","term months"]))||0);
  const annualizedPremium=premium&&termMonths?premium*12/termMonths:premium;
  return {premium,termMonths,annualizedPremium};
}

export function isActiveClient(lead:ClientRecord){
  if(lead.clientStatus==="inactive")return false;
  if(lead.clientStatus==="active")return true;
  const outcome=String(lead.outcome||"").trim().toLowerCase();
  return outcome==="sold / won"||outcome==="sold"||outcome.startsWith("sold -")||Number(lead.closedRevenue)>0;
}

function dateKeyInZone(now:Date,timeZone:string){
  try{const parts=new Intl.DateTimeFormat("en-CA",{timeZone,year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(now);const get=(type:string)=>parts.find(part=>part.type===type)?.value||"";return `${get("year")}-${get("month")}-${get("day")}`}catch{return now.toISOString().slice(0,10)}
}
function utcDay(value:string){const [year,month,day]=value.split("-").map(Number);return Date.UTC(year,month-1,day)}
function nextAnnual(value:string,today:string){
  if(!value)return "";const match=value.match(/^(\d{4})-(\d{2})-(\d{2})$/);if(!match)return "";const month=match[2];const day=match[3];
  const year=Number(today.slice(0,4));let candidate=`${year}-${month}-${day}`;if(candidate<today)candidate=`${year+1}-${month}-${day}`;return candidate;
}
function daysBetween(today:string,future:string){return Math.round((utcDay(future)-utcDay(today))/86_400_000)}
function dueMilestone(days:number,milestones:number[],keys:Set<string>,prefix:string){return milestones.find(milestone=>days<=milestone&&!keys.has(`${prefix}:${milestone}`))}
function readableDate(value:string){const [year,month,day]=value.split("-").map(Number);return new Intl.DateTimeFormat("en-US",{month:"long",day:"numeric",year:"numeric",timeZone:"UTC"}).format(new Date(Date.UTC(year,month-1,day)))}

export function nextClientEvents(lead:ClientRecord,now=new Date(),timeZone="America/Los_Angeles"){
  const today=dateKeyInZone(now,timeZone);const dates=clientDates(lead);
  const birthday=nextAnnual(dates.dateOfBirth,today);const renewal=nextAnnual(dates.renewalDate,today);
  return {today,...dates,birthday,birthdayDays:birthday?daysBetween(today,birthday):null,renewal,renewalDays:renewal?daysBetween(today,renewal):null};
}

export function planClientReminders(lead:ClientRecord,profile:WorkspaceProfile,now=new Date()):ClientReminderAction[]{
  if(!profile.clientRemindersEnabled||!isActiveClient(lead))return [];
  const events=nextClientEvents(lead,now,profile.automationTimezone);const keys=new Set(Array.isArray(lead.clientReminderKeys)?lead.clientReminderKeys:[]);const actions:ClientReminderAction[]=[];
  const brand=profile.businessName||"Pacifica";const callback=profile.callbackNumber?` Call or text ${profile.callbackNumber}.`:"";const firstName=lead.name.trim().split(/\s+/)[0]||"there";
  if(events.birthday&&events.birthdayDays!==null){
    if(profile.ownerReminderSmsEnabled&&profile.ownerReminderPhone){const milestone=dueMilestone(events.birthdayDays,[0,1,7],keys,`birthday:${events.birthday}:owner`);if(milestone!==undefined)actions.push({key:`birthday:${events.birthday}:owner:${milestone}`,recipient:"owner",to:profile.ownerReminderPhone,event:"birthday",daysUntil:events.birthdayDays,body:`Pacifica client reminder: ${lead.name}'s birthday is ${events.birthdayDays===0?"today":`in ${events.birthdayDays} day${events.birthdayDays===1?"":"s"}`} (${readableDate(events.birthday)}).`})}
    if(events.birthdayDays===0&&profile.customerReminderSmsEnabled&&lead.smsConsent&&!lead.smsOptOut&&lead.phone){const key=`birthday:${events.birthday}:customer:0`;if(!keys.has(key))actions.push({key,recipient:"customer",to:lead.phone,event:"birthday",daysUntil:0,body:`Happy birthday, ${firstName}! Wishing you a wonderful day from ${brand}.${callback} Reply STOP to opt out.`})}
  }
  if(events.renewal&&events.renewalDays!==null){
    if(profile.ownerReminderSmsEnabled&&profile.ownerReminderPhone){const milestone=dueMilestone(events.renewalDays,[0,1,7,14,30],keys,`renewal:${events.renewal}:owner`);if(milestone!==undefined)actions.push({key:`renewal:${events.renewal}:owner:${milestone}`,recipient:"owner",to:profile.ownerReminderPhone,event:"renewal",daysUntil:events.renewalDays,body:`Pacifica renewal reminder: ${lead.name}'s ${lead.product||"policy"} renews ${events.renewalDays===0?"today":`in ${events.renewalDays} day${events.renewalDays===1?"":"s"}`} (${readableDate(events.renewal)}).`})}
    if(profile.customerReminderSmsEnabled&&lead.smsConsent&&!lead.smsOptOut&&lead.phone){const milestone=dueMilestone(events.renewalDays,[0,1,7,30],keys,`renewal:${events.renewal}:customer`);if(milestone!==undefined)actions.push({key:`renewal:${events.renewal}:customer:${milestone}`,recipient:"customer",to:lead.phone,event:"renewal",daysUntil:events.renewalDays,body:`Hi ${firstName}, your ${lead.product||"policy"} renewal is coming up on ${readableDate(events.renewal)}. ${profile.agentName||brand} is here to help.${callback} Reply STOP to opt out.`})}
  }
  return actions;
}

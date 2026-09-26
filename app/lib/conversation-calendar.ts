import {createHash} from 'node:crypto';
import {cleanCommunications} from './communications';
import {cleanOfficeItems,type OfficeItem} from './office-schedule';
export type ConversationCalendar={enabled:boolean;nextRunAt:number;lastRunAt:number;lease:string;checked:Record<string,string>;remembered:string[];lastAdded:number;error:string};
export const cleanConversationCalendar=(v:unknown):ConversationCalendar=>{const x=(v||{}) as Partial<ConversationCalendar>;return {enabled:x.enabled===true,nextRunAt:Number(x.nextRunAt)||0,lastRunAt:Number(x.lastRunAt)||0,lease:String(x.lease||''),checked:x.checked&&typeof x.checked==='object'?x.checked:{},remembered:Array.isArray(x.remembered)?x.remembered.slice(-5000):[],lastAdded:Number(x.lastAdded)||0,error:String(x.error||'').slice(0,300)}};
export type ConversationLead=Record<string,unknown>&{id:number;name:string;phone:string};
export const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
export const eligible=(l:ConversationLead)=>!l.deletedAt&&!l.doNotCall&&!['Closed'].includes(String(l.stage))&&!['Not interested','Wrong number','Sold / Won'].includes(String(l.outcome));
export function thread(l:ConversationLead,now=Date.now()){return cleanCommunications(l.communications).filter(m=>m.channel==='sms'&&Date.parse(m.sentAt)>now-30*86400000&&Date.parse(m.sentAt)<=now&&!['failed','undelivered','draft','queued','sending'].includes(m.status)&&(m.direction==='inbound'||['sent','delivered','read'].includes(m.status))).sort((a,b)=>Date.parse(a.sentAt)-Date.parse(b.sentAt)).slice(-30)}
export type Candidate={leadId:number;dueAt:string;interestId:string;interestQuote:string;scheduleId:string;scheduleQuote:string};
export function applyCandidates(leads:ConversationLead[],raw:unknown,candidates:Candidate[],remembered:string[],now=Date.now()){
 const items=cleanOfficeItems(raw),seen=new Set(remembered);let added=0;
 const phone=(l:ConversationLead)=>String(l.phone||'').replace(/\D/g,'').slice(-10);
 for(const c of candidates.slice(0,20)){
  const lead=leads.find(l=>l.id===c.leadId);if(!lead||!eligible(lead))continue;
  const date=Date.parse(c.dueAt);if(!/(Z|[+-]\d\d:\d\d)$/.test(c.dueAt)||!Number.isFinite(date)||date<=now||date>now+180*86400000)continue;
  const messages=thread(lead,now),interest=messages.find(m=>m.id===c.interestId&&m.direction==='inbound'),schedule=messages.find(m=>m.id===c.scheduleId&&m.direction==='outbound');
  if(!interest||!schedule||!c.interestQuote||!c.scheduleQuote||!interest.body.includes(c.interestQuote)||!schedule.body.includes(c.scheduleQuote)||Date.parse(interest.sentAt)>Date.parse(schedule.sentAt))continue;
  const key=hash([phone(lead)||lead.id,Math.floor(date/60000)]);if(seen.has(key))continue;
  const same=(x:OfficeItem)=>x.leadId===lead.id||Boolean(phone(lead)&&leads.some(l=>l.id===x.leadId&&phone(l)===phone(lead)))||Boolean(x.leadId===0&&lead.name.length>3&&x.title.toLowerCase().includes(lead.name.toLowerCase()));
  if(items.some(x=>x.kind==='appointment'&&same(x)&&Math.abs(Date.parse(x.dueAt)-date)<15*60000)){seen.add(key);continue}
  // Reschedules need review; do not leave two different AI appointments for one conversation.
  if(items.length>=500||items.some(x=>same(x)&&x.id.startsWith('sms-calendar:')&&x.status==='open'&&Date.parse(x.dueAt)>now))continue;
  items.push({id:`sms-calendar:${key}`,leadId:lead.id,kind:'appointment',title:`Interested callback · ${lead.name}`,dueAt:new Date(date).toISOString(),amount:0,status:'open',reminderAt:'',reminderState:'off',createdAt:new Date(now).toISOString(),durationMinutes:30,staffReminderMinutes:15});seen.add(key);added++;
 }
 return {items,remembered:[...seen].slice(-5000),added};
}

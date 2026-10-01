import {createHash} from 'node:crypto';
import {cleanCommunications} from './communications';
import {cleanOfficeItems,type OfficeItem} from './office-schedule';
export {cleanConversationCalendar,type ConversationCalendar} from './conversation-calendar-state';
export type ConversationLead=Record<string,unknown>&{id:number;name:string;phone:string};
export const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
export const eligible=(l:ConversationLead)=>!l.deletedAt&&!l.doNotCall&&!['Closed'].includes(String(l.stage))&&!['Not interested','Wrong number','Sold / Won'].includes(String(l.outcome));
export function thread(l:ConversationLead,now=Date.now()){return cleanCommunications(l.communications).filter(m=>['sms','email'].includes(m.channel)&&Date.parse(m.sentAt)>now-30*86400000&&Date.parse(m.sentAt)<=now&&!['failed','undelivered','draft','queued','sending'].includes(m.status)&&(m.direction==='inbound'||['sent','delivered','read'].includes(m.status))).sort((a,b)=>Date.parse(a.sentAt)-Date.parse(b.sentAt)).slice(-30)}
export type Candidate={kind?:'appointment'|'renewal';leadId:number;dueAt:string;interestId:string;interestQuote:string;scheduleId:string;scheduleQuote:string};
export function applyCandidates(leads:ConversationLead[],raw:unknown,candidates:Candidate[],remembered:string[],now=Date.now()){
 const items=cleanOfficeItems(raw),seen=new Set(remembered);let added=0;
 const phone=(l:ConversationLead)=>String(l.phone||'').replace(/\D/g,'').slice(-10);
 for(const c of candidates.slice(0,20)){
  const lead=leads.find(l=>l.id===c.leadId);if(!lead||!eligible(lead))continue;
  if(c.kind==='renewal'){
   const messages=thread(lead,now),source=messages.find(m=>m.id===c.scheduleId&&m.direction==='inbound');
   const date=Date.parse(c.dueAt+'T12:00:00Z');
   if(!/^\d{4}-\d{2}-\d{2}$/.test(c.dueAt)||!Number.isFinite(date)||new Date(date).toISOString().slice(0,10)!==c.dueAt||date<now-86400000||date>now+400*86400000||!source||!c.scheduleQuote||!source.body.includes(c.scheduleQuote)||!/renew|expir|renova|vence/i.test(c.scheduleQuote))continue;
   const key=hash(['renewal',phone(lead)||lead.id,c.dueAt]);if(seen.has(key))continue;
   if(items.some(x=>(x.leadId===lead.id||Boolean(phone(lead)&&leads.some(l=>l.id===x.leadId&&phone(l)===phone(lead))))&&(x.allDayDate===c.dueAt||(x.dueAt.startsWith(c.dueAt)&&/renew|expir/i.test(x.title))))){seen.add(key);continue;}
   if(items.length>=500)continue;
   items.push({id:`renewal-calendar:${key}`,leadId:lead.id,kind:'appointment',title:`Insurance renewal · ${lead.name}`,allDayDate:c.dueAt,dueAt:new Date(date).toISOString(),amount:0,status:'open',reminderAt:'',reminderState:'off',createdAt:new Date(now).toISOString(),staffReminderMinutes:-1});seen.add(key);added++;continue;
  }
  const date=Date.parse(c.dueAt);if(!/(Z|[+-]\d\d:\d\d)$/.test(c.dueAt)||!Number.isFinite(date)||date<=now||date>now+180*86400000)continue;
  const messages=thread(lead,now),interest=messages.find(m=>m.id===c.interestId&&m.direction==='inbound'),schedule=messages.find(m=>m.id===c.scheduleId);
  if(!interest||!schedule||!c.interestQuote||!c.scheduleQuote||!interest.body.includes(c.interestQuote)||!schedule.body.includes(c.scheduleQuote))continue;
  const key=hash([phone(lead)||lead.id,Math.floor(date/60000)]);if(seen.has(key))continue;
  const same=(x:OfficeItem)=>x.leadId===lead.id||Boolean(phone(lead)&&leads.some(l=>l.id===x.leadId&&phone(l)===phone(lead)))||Boolean(x.leadId===0&&lead.name.length>3&&x.title.toLowerCase().includes(lead.name.toLowerCase()));
  if(items.some(x=>x.kind==='appointment'&&same(x)&&Math.abs(Date.parse(x.dueAt)-date)<15*60000)){seen.add(key);continue}
  // Reschedules need review; do not leave two different AI appointments for one conversation.
  if(items.length>=500||items.some(x=>same(x)&&x.id.startsWith('sms-calendar:')&&x.status==='open'&&Date.parse(x.dueAt)>now))continue;
  items.push({id:`sms-calendar:${key}`,leadId:lead.id,kind:'appointment',title:`Interested callback · ${lead.name}`,dueAt:new Date(date).toISOString(),amount:0,status:'open',reminderAt:'',reminderState:'off',createdAt:new Date(now).toISOString(),durationMinutes:30,staffReminderMinutes:15});seen.add(key);added++;
 }
 return {items,remembered:[...seen].slice(-5000),added};
}

export function pendingConversationThreads(leads:ConversationLead[],checked:Record<string,string>,now=Date.now()){
 return leads.filter(eligible).map(l=>({leadId:l.id,messages:thread(l,now)})).filter(t=>t.messages.some(m=>m.direction==='inbound')&&checked[t.leadId]!=='v3:'+hash(t.messages)).sort((a,b)=>Number(Boolean(checked[a.leadId]))-Number(Boolean(checked[b.leadId])));
}
export function conversationBatch(pending:ReturnType<typeof pendingConversationThreads>){
 let budget=0;
 return pending.filter(t=>{const size=JSON.stringify(t).length;if(size+budget>48000)return false;budget+=size;return true}).slice(0,20);
}

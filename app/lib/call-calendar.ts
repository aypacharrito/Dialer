import {cleanOfficeItems,type OfficeItem} from './office-schedule';
type Contact=Record<string,unknown>;
function schedule(lead:Contact){
 if(lead.deletedAt||lead.doNotCall||lead.stage==='Closed'||!['Interested','Appointment set'].includes(String(lead.outcome)))return '';
 const date=String(lead.followUpUtc||'');
 return lead.followUp&&/^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(date)&&Number.isFinite(Date.parse(date))?date:'';
}
/** Only explicit interest/appointments qualify. Unchanged saves preserve completion/deletion. */
export function reconcileCallCalendar(previous:Contact[],leads:Contact[],raw:unknown):OfficeItem[]{
 const old=new Map(previous.map(l=>[l.id,l]));
 let items=cleanOfficeItems(raw);
 const live=new Set(leads.filter(l=>schedule(l)).map(l=>`call:${l.id}`));
 items=items.filter(item=>!item.id.startsWith('call:')||live.has(item.id));
 for(const lead of leads){
  const dueAt=schedule(lead),before=old.get(lead.id),id=`call:${lead.id}`;
  if(!dueAt||before&&schedule(before)===dueAt&&before.outcome===lead.outcome)continue;
  const existing=items.find(x=>x.id===id);
  const item:OfficeItem={id,leadId:Number(lead.id),kind:'appointment',title:`${lead.outcome==='Interested'?'Interested callback':'Appointment'} · ${lead.name}`,dueAt,amount:0,status:'open',reminderAt:'',reminderState:'off',createdAt:existing?.createdAt||new Date().toISOString(),durationMinutes:30,staffReminderMinutes:15};
  items=items.filter(x=>x.id!==id);items.push(item);
 }
 if(items.length>500)throw Error('Calendar is full. Remove an old event before scheduling another callback.');
 return items;
}

export type CalendarItem={id:string;leadId:number;title:string;kind:'appointment'|'payment';dueAt:string;amount:number;status:'open'|'done';durationMinutes?:number;staffReminderMinutes?:number};
export function calendarNotificationPlan(items:CalendarItem[],accountId:string,now=Date.now()){
 return items.filter(item=>item.status==='open'&&item.staffReminderMinutes!==-1)
  .map(item=>({identifier:`pacifica-calendar:${accountId}:${item.id}`,at:Date.parse(item.dueAt)-(item.staffReminderMinutes??15)*60000,title:item.title,body:`${item.kind==='payment'?'Payment due':'Appointment'} · ${new Date(item.dueAt).toLocaleString()}`,leadId:item.leadId,accountId}))
  .filter(item=>Number.isFinite(item.at)&&item.at>now).sort((a,b)=>a.at-b.at).slice(0,60);
}
type Scheduled={identifier:string;content:{data?:Record<string,unknown>}};
type Plan=ReturnType<typeof calendarNotificationPlan>;
// Compare stored dates/content: rescheduling cancels the previous OS alarm first.
export async function reconcileCalendarNotifications(plan:Plan,io:{list:()=>Promise<Scheduled[]>;cancel:(id:string)=>Promise<void>;schedule:(item:Plan[number])=>Promise<unknown>},accountId?:string){
 const existing=(await io.list()).filter(item=>item.identifier.startsWith(accountId?`pacifica-calendar:${accountId}:`:'pacifica-calendar:'));
 const desired=new Map(plan.map(item=>[item.identifier,item]));
 const fingerprint=(item:Plan[number])=>JSON.stringify([item.at,item.title,item.body]);
 for(const item of existing){const wanted=desired.get(item.identifier);if(!wanted||item.content.data?.fingerprint!==fingerprint(wanted))await io.cancel(item.identifier);else desired.delete(item.identifier)}
 for(const item of desired.values())await io.schedule(item);
}

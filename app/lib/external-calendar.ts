import {createHash} from 'node:crypto';
import {readCalendarSecret,withCalendarLock} from './calendar-vault';
import {calendarConfig,googleTokens,googleCalendarRequest,type GoogleConnection} from './google-calendar';
import {outlookConfig,outlookKey,outlookAccess,outlookRequest,type OutlookConnection} from './outlook-calendar';
import type {OfficeItem} from './office-schedule';
export type ExternalEvent=OfficeItem&{external:'google'|'outlook';allDay:boolean;externalUrl:string};
export function normalizeExternalEvent(provider:'google'|'outlook',raw:Record<string,unknown>):ExternalEvent|null{
 const start=raw.start as {dateTime?:string;date?:string}|undefined,allDay=Boolean(start?.date||raw.isAllDay),stamp=start?.date||start?.dateTime||'';
 const dueAt=allDay?stamp.slice(0,10)+'T12:00:00':provider==='outlook'&&!/Z$|[+-]\d\d:\d\d$/i.test(stamp)?stamp+'Z':stamp;
 if(!raw.id||!Number.isFinite(Date.parse(dueAt))||raw.status==='cancelled'||raw.isCancelled)return null;
 if((raw.extendedProperties as {private?:{pacificaId?:string}})?.private?.pacificaId)return null;
 const url=String(raw.htmlLink||raw.webLink||'');let externalUrl='';try{const u=new URL(url);if(u.protocol==='https:'&&(u.hostname==='calendar.google.com'||u.hostname==='www.google.com'||/^outlook\.(office|live|office365)\.com$/.test(u.hostname)))externalUrl=url}catch{}
 return {id:`external-${provider}-${createHash('sha256').update(String(raw.id)).digest('hex').slice(0,24)}`,leadId:0,kind:'appointment',title:String(raw.summary||raw.subject||'Busy').slice(0,200),dueAt,amount:0,status:'open',reminderAt:'',reminderState:'off',createdAt:'',staffReminderMinutes:-1,external:provider,allDay,externalUrl};
}
export async function externalCalendarEvents(id:string,start:string,end:string){
 const events:ExternalEvent[]=[],errors:string[]=[];
 const add=(provider:'google'|'outlook',rows:unknown)=>{if(!Array.isArray(rows))return;for(const raw of rows){const item=normalizeExternalEvent(provider,raw);if(item)events.push(item)}};
 await Promise.allSettled([
 (async()=>{try{if(!calendarConfig().ready)return;const c=await readCalendarSecret<GoogleConnection>(id);if(!c?.showExternal)return;const t=await googleTokens({grant_type:'refresh_token',refresh_token:c.refreshToken});let page='';for(let i=0;i<4;i++){const q=new URLSearchParams({timeMin:start,timeMax:end,singleEvents:'true',maxResults:'250',orderBy:'startTime',...(page?{pageToken:page}:{})});const data=await googleCalendarRequest(t.access_token!,`calendars/primary/events?${q}`);add('google',data.items);page=String(data.nextPageToken||'');if(!page)break;if(i===3)errors.push('Google has more events in this period than can be displayed.')}}catch{errors.push('Google events could not load. Retry or reconnect with read permission.')}})(),
 (async()=>{try{if(!outlookConfig().ready)return;await withCalendarLock(outlookKey(id),async()=>{const c=await readCalendarSecret<OutlookConnection>(outlookKey(id));if(!c?.showExternal)return;const token=await outlookAccess(id,c);let path=`me/calendarView?${new URLSearchParams({startDateTime:start,endDateTime:end,'$top':'250'})}`;for(let i=0;i<4;i++){const data=await outlookRequest(token,path);add('outlook',data.value);const next=String(data['@odata.nextLink']||'');if(!next)break;if(!next.startsWith('https://graph.microsoft.com/v1.0/me/calendarView?'))throw Error('Unexpected page link.');path=next.slice('https://graph.microsoft.com/v1.0/'.length);if(i===3)errors.push('Outlook has more events in this period than can be displayed.')}})}catch{errors.push('Outlook events could not load. Retry shortly or reconnect.')}})()
 ]);return {events:[...new Map(events.map(e=>[e.id,e])).values()],errors};
}

import {createHash} from 'node:crypto';
import {readStoredWorkspace} from './workspace-storage';
import {cleanOfficeItems,type OfficeItem} from './office-schedule';
import {readCalendarSecret,writeCalendarSecret,withCalendarLock} from './calendar-vault';
export const outlookKey=(id:string)=>`outlook:${id}`;
export const outlookScope='offline_access https://graph.microsoft.com/Calendars.ReadWrite';
export type OutlookConnection={refreshToken:string;calendarId:string;connectedBy:string;lastSyncAt:string;error:string;pending:number;showExternal?:boolean;events:Record<string,{id:string;hash:string}>};
export function outlookConfig(){
 const clientId=process.env.OUTLOOK_CALENDAR_CLIENT_ID||'',secret=process.env.OUTLOOK_CALENDAR_CLIENT_SECRET||'',redirectUri=process.env.OUTLOOK_CALENDAR_REDIRECT_URI||'',tenant=process.env.OUTLOOK_CALENDAR_TENANT_ID||'common';let valid=false;
 try{const u=new URL(redirectUri);valid=u.pathname==='/api/calendar/outlook/callback'&&(u.protocol==='https:'||u.protocol==='http:'&&u.hostname==='localhost')}catch{}
 return {clientId,secret,redirectUri,tenant,ready:Boolean(clientId&&secret&&valid&&/^[a-z\d-]+$/i.test(tenant)&&/^[a-f\d]{64}$/i.test(process.env.GOOGLE_CALENDAR_ENCRYPTION_KEY||''))};
}
export async function outlookTokens(values:Record<string,string>){
 const c=outlookConfig(),r=await fetch(`https://login.microsoftonline.com/${c.tenant}/oauth2/v2.0/token`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:c.clientId,client_secret:c.secret,scope:outlookScope,...values}),signal:AbortSignal.timeout(8000),cache:'no-store'});
 const data=await r.json() as {access_token?:string;refresh_token?:string;scope?:string};if(!r.ok||!data.access_token)throw Error('Reconnect Outlook Calendar to continue.');return data;
}
export async function outlookRequest(token:string,path:string,method='GET',body?:unknown):Promise<Record<string,unknown>>{
 if(!path.startsWith('me/'))throw Error('Invalid Outlook calendar path.');
 const r=await fetch(`https://graph.microsoft.com/v1.0/${path}`,{method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json',Prefer:'outlook.timezone="UTC"'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(8000),cache:'no-store'});
 if(r.status===204)return {};if(!r.ok)throw Object.assign(Error(`Outlook Calendar request failed (${r.status}). Retry or reconnect.`),{status:r.status});return r.json();
}
export async function outlookAccess(id:string,c:OutlookConnection){const t=await outlookTokens({grant_type:'refresh_token',refresh_token:c.refreshToken});if(t.refresh_token){c.refreshToken=t.refresh_token;await writeCalendarSecret(outlookKey(id),c)}return t.access_token!}
export function outlookOfficeEvent(item:OfficeItem,id:string){return {subject:item.title,...(item.allDayDate?{isAllDay:true}:{}),start:{dateTime:item.allDayDate?item.allDayDate+'T00:00:00':new Date(item.dueAt).toISOString(),timeZone:'UTC'},end:{dateTime:item.allDayDate?new Date(Date.parse(item.allDayDate+'T00:00:00Z')+86400000).toISOString():new Date(Date.parse(item.dueAt)+(item.durationMinutes||30)*60000).toISOString(),timeZone:'UTC'},sensitivity:'private',body:{contentType:'text',content:'Managed by Pacifica CRM. Edit this event in Pacifica.'},isReminderOn:item.staffReminderMinutes!==-1,reminderMinutesBeforeStart:Math.max(0,item.staffReminderMinutes??15),transactionId:createHash('sha256').update(`${id}:${item.id}`).digest('hex')}}
export async function syncOutlookCalendar(id:string){
 if(!outlookConfig().ready)return {connected:false};return withCalendarLock(outlookKey(id),async()=>{
 const c=await readCalendarSecret<OutlookConnection>(outlookKey(id));if(!c)return {connected:false};
 try{const w=await readStoredWorkspace(id);if(!w)throw Error('Workspace unavailable.');const token=await outlookAccess(id,c),base=`me/calendars/${encodeURIComponent(c.calendarId)}/events`;
 const contacts=new Set(w.leads.filter(x=>x&&typeof x==='object'&&!(x as {deletedAt?:string}).deletedAt).map(x=>(x as {id:number}).id));const items=cleanOfficeItems(w.officeItems).filter(x=>x.status==='open'&&(x.leadId===0||contacts.has(x.leadId))),ids=new Set(items.map(x=>x.id));const changes:Array<()=>Promise<void>>=[];
 for(const key of Object.keys(c.events))if(!ids.has(key))changes.push(async()=>{try{await outlookRequest(token,`${base}/${encodeURIComponent(c.events[key].id)}`,'DELETE')}catch(e){if(![404,410].includes(Number((e as {status?:number}).status)))throw e}delete c.events[key]});
 for(const item of items){const event=outlookOfficeEvent(item,id),hash=createHash('sha256').update(JSON.stringify(event)).digest('hex');if(c.events[item.id]?.hash===hash)continue;changes.push(async()=>{let saved=c.events[item.id];if(saved){const {transactionId,...patch}=event;void transactionId;await outlookRequest(token,`${base}/${encodeURIComponent(saved.id)}`,'PATCH',patch)}else{const result=await outlookRequest(token,base,'POST',event);if(typeof result.id!=='string')throw Error('Outlook did not return an event ID.');saved={id:result.id,hash}}c.events[item.id]={id:saved.id,hash}})}
 const deadline=Date.now()+12000;let completed=0;for(const change of changes){if(completed>=30||Date.now()>deadline)break;await change();completed++;await writeCalendarSecret(outlookKey(id),c)}c.pending=changes.length-completed;c.error='';c.lastSyncAt=new Date().toISOString();await writeCalendarSecret(outlookKey(id),c);return {connected:true,lastSyncAt:c.lastSyncAt,pending:c.pending};
 }catch(e){c.error=e instanceof Error?e.message:'Outlook sync failed.';await writeCalendarSecret(outlookKey(id),c);throw e}
 });
}

import {createHash} from 'node:crypto';
import {readStoredWorkspace} from './workspace-storage';
import {cleanOfficeItems,type OfficeItem} from './office-schedule';
import {readCalendarSecret,writeCalendarSecret,withCalendarLock} from './calendar-vault';

export const calendarScope='https://www.googleapis.com/auth/calendar.app.created';
export type GoogleConnection={refreshToken:string;calendarId:string;connectedBy:string;lastSyncAt:string;error:string;pending:number;events:Record<string,string>};
export function calendarConfig(){
 const clientId=process.env.GOOGLE_CALENDAR_CLIENT_ID||'',secret=process.env.GOOGLE_CALENDAR_CLIENT_SECRET||'',redirectUri=process.env.GOOGLE_CALENDAR_REDIRECT_URI||'';
 let validRedirect=false;try{const url=new URL(redirectUri);validRedirect=url.pathname==='/api/calendar/google/callback'&&(url.protocol==='https:'||url.protocol==='http:'&&url.hostname==='localhost')}catch{}
 return {clientId,secret,redirectUri,ready:Boolean(clientId&&secret&&validRedirect&&/^[a-f\d]{64}$/i.test(process.env.GOOGLE_CALENDAR_ENCRYPTION_KEY||''))};
}
export async function googleTokens(values:Record<string,string>){
 const config=calendarConfig();
 const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:config.clientId,client_secret:config.secret,...values}),signal:AbortSignal.timeout(8000),cache:'no-store'});
 const result=await response.json() as {access_token?:string;refresh_token?:string;scope?:string};
 if(!response.ok||!result.access_token)throw Error('Google authorization expired or failed. Reconnect Google Calendar.');
 return result;
}
export async function googleCalendarRequest(token:string,path:string,method='GET',body?:unknown){
 const response=await fetch(`https://www.googleapis.com/calendar/v3/${path}`,{method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(8000),cache:'no-store'});
 if(response.status===204)return {};
 if(!response.ok)throw Object.assign(Error(response.status===401?'Reconnect Google Calendar to continue syncing.':response.status===429?'Google is busy. Sync will retry later.':`Google Calendar could not save this change (${response.status}). Retry or reconnect.`),{status:response.status});
 return await response.json() as Record<string,unknown>;
}
export function googleOfficeEvent(item:OfficeItem,workspaceId:string){
 const id=createHash('sha256').update(`${workspaceId}:${item.id}`).digest('hex');
 return {id,summary:item.title,start:{dateTime:item.dueAt},end:{dateTime:new Date(Date.parse(item.dueAt)+(item.durationMinutes||30)*60000).toISOString()},visibility:'private',description:'Managed by Pacifica CRM. Edit this appointment in your CRM calendar.',reminders:{useDefault:false,overrides:item.staffReminderMinutes===-1?[]:[{method:'popup',minutes:item.staffReminderMinutes??15}]},extendedProperties:{private:{pacificaId:item.id}}};
}
export async function syncGoogleCalendar(workspaceId:string){
 if(!calendarConfig().ready)return {connected:false};
 return withCalendarLock(workspaceId,async()=>{
  const connection=await readCalendarSecret<GoogleConnection>(workspaceId);
  if(!connection)return {connected:false};
  try{
   const workspace=await readStoredWorkspace(workspaceId);if(!workspace)throw Error('Workspace unavailable.');
   const {access_token:token}=await googleTokens({grant_type:'refresh_token',refresh_token:connection.refreshToken});
   const contacts=new Set(workspace.leads.filter(x=>x&&typeof x==='object'&&!('deletedAt' in x&&x.deletedAt)).map(x=>(x as {id:number}).id));
   const desired=cleanOfficeItems(workspace.officeItems).filter(x=>x.status==='open'&&(x.leadId===0||contacts.has(x.leadId))).map(x=>googleOfficeEvent(x,workspaceId));
   const ids=new Set(desired.map(x=>x.id)),path=`calendars/${encodeURIComponent(connection.calendarId)}/events`;
   const changes: Array<()=>Promise<void>>=[];
   for(const id of Object.keys(connection.events))if(!ids.has(id))changes.push(async()=>{
    try{await googleCalendarRequest(token!,`${path}/${id}`,'DELETE')}catch(e){if(![404,410].includes(Number((e as {status?:number}).status)))throw e}
    delete connection.events[id];
   });
   for(const event of desired){
    const hash=createHash('sha256').update(JSON.stringify(event)).digest('hex');
    if(connection.events[event.id]===hash)continue;
    changes.push(async()=>{
     if(connection.events[event.id])await googleCalendarRequest(token!,`${path}/${event.id}`,'PATCH',event);
     else try{await googleCalendarRequest(token!,path,'POST',event)}catch(e){
      // A previous request may have reached Google before the local save timed out.
      if((e as {status?:number}).status!==409)throw e;
      await googleCalendarRequest(token!,`${path}/${event.id}`,'PATCH',event);
     }
     connection.events[event.id]=hash;
    });
   }
   const deadline=Date.now()+12_000;let completed=0;
   for(const change of changes){if(completed>=40||Date.now()>deadline)break;await change();completed++}
   connection.pending=changes.length-completed;connection.error='';connection.lastSyncAt=new Date().toISOString();
   await writeCalendarSecret(workspaceId,connection);
   return {connected:true,lastSyncAt:connection.lastSyncAt,pending:connection.pending};
  }catch(e){connection.error=e instanceof Error?e.message:'Calendar sync failed.';await writeCalendarSecret(workspaceId,connection);throw e}
 });
}

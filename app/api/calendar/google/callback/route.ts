import {cookies} from 'next/headers';
import {getPacificaAccess} from '../../../../lib/clerk-access';
import {calendarConfig,calendarScope,googleTokens,googleCalendarRequest,type GoogleConnection} from '../../../../lib/google-calendar';
import {openCalendar,readCalendarSecret,writeCalendarSecret,withCalendarLock} from '../../../../lib/calendar-vault';
export const runtime='nodejs';
export const maxDuration=60;
export async function GET(request:Request){
 const config=calendarConfig();if(!config.ready)return Response.json({error:'Google Calendar is not configured.'},{status:503});
 const destination=new URL('/dashboard',config.redirectUri),jar=await cookies();
 try{
  const access=await getPacificaAccess(),query=new URL(request.url).searchParams;
  const state=openCalendar<{nonce:string;workspaceId:string;userId:string;expires:number}>(query.get('state')||'','oauth');
  const nonce=jar.get('pacifica_calendar_oauth')?.value;
  jar.set('pacifica_calendar_oauth','',{path:'/api/calendar/google',maxAge:0});
  if(!access.allowed||access.role!=='owner'||state.userId!==access.accountUserId||state.workspaceId!==access.userId||access.accountUserId!==access.userId||state.expires<Date.now()||!nonce||state.nonce!==nonce)throw Error('Invalid calendar authorization.');
  if(query.has('error')||!query.get('code'))throw Error('Calendar authorization canceled.');
  await withCalendarLock(access.userId,async()=>{
   const tokens=await googleTokens({grant_type:'authorization_code',code:query.get('code')!,redirect_uri:config.redirectUri});
   if(!tokens.refresh_token||!tokens.scope?.split(' ').includes(calendarScope))throw Error('Google Calendar permission was not granted.');
   const old=await readCalendarSecret<GoogleConnection>(access.userId);
   // Reuse a previously created calendar only when the newly chosen Google account can access it.
   let calendarId='';
   if(old)try{await googleCalendarRequest(tokens.access_token!,`calendars/${encodeURIComponent(old.calendarId)}`);calendarId=old.calendarId}catch(e){if(![403,404,410].includes(Number((e as {status?:number}).status)))throw e}
   if(!calendarId){const calendar=await googleCalendarRequest(tokens.access_token!,'calendars','POST',{summary:'Pacifica CRM',description:'Appointments and payment reminders managed in Pacifica CRM.'});calendarId=String(calendar.id||'');if(!calendarId)throw Error('Google did not return a calendar.');}
   await writeCalendarSecret(access.userId,{refreshToken:tokens.refresh_token,calendarId,connectedBy:access.accountUserId,lastSyncAt:'',error:'',pending:0,events:old?.calendarId===calendarId?old.events:{}} satisfies GoogleConnection);
  });
  destination.searchParams.set('calendar','connected');
 }catch{destination.searchParams.set('calendar','failed')}
 return Response.redirect(destination,303);
}

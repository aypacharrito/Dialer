import {cookies} from 'next/headers';
import {randomBytes} from 'node:crypto';
import {getPacificaAccess} from '../../../lib/clerk-access';
import {calendarConfig,calendarScope,syncGoogleCalendar,type GoogleConnection} from '../../../lib/google-calendar';
import {readCalendarSecret,writeCalendarSecret,sealCalendar,withCalendarLock} from '../../../lib/calendar-vault';
export const runtime='nodejs';
export const maxDuration=60;
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(){
 const access=await getPacificaAccess();if(!access.allowed)return json({error:'Sign in required.'},403);
 const configured=calendarConfig().ready,canManage=access.role==='owner'&&access.accountUserId===access.userId;
 try{const saved=configured?await readCalendarSecret<GoogleConnection>(access.userId):null;
  return json({configured,canManage,connected:Boolean(saved),lastSyncAt:saved?.lastSyncAt||'',pending:saved?.pending||0,error:saved?.error||'',calendarUrl:saved?`https://calendar.google.com/calendar/u/0/r?cid=${encodeURIComponent(saved.calendarId)}`:''});
 }catch{return json({error:'Calendar connection could not be loaded.'},503)}
}
export async function POST(request:Request){
 const access=await getPacificaAccess();if(!access.allowed||access.role!=='owner'||access.accountUserId!==access.userId)return json({error:'The workspace owner manages Google Calendar.'},403);
 // Cookie-authenticated mutations must originate in the CRM; mobile uses a bearer token.
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return json({error:'Invalid request origin.'},403);
 try{
  const {action}=await request.json() as {action:string};
  const config=calendarConfig();if(!config.ready)return json({error:'Google Calendar needs server setup. See docs/google-calendar.md.'},503);
  if(action==='connect'){
   const nonce=randomBytes(32).toString('base64url');
   const state=sealCalendar({nonce,workspaceId:access.userId,userId:access.accountUserId,expires:Date.now()+600000},'oauth');
   (await cookies()).set('pacifica_calendar_oauth',nonce,{httpOnly:true,secure:new URL(config.redirectUri).protocol==='https:',sameSite:'lax',path:'/api/calendar/google',maxAge:600});
   return json({url:`https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({client_id:config.clientId,redirect_uri:config.redirectUri,response_type:'code',scope:calendarScope,access_type:'offline',prompt:'consent select_account',state})}`});
  }
  if(action==='disconnect'){
   await withCalendarLock(access.userId,()=>writeCalendarSecret(access.userId,null));
   return json({ok:true}); // Existing Google events remain; no surprise calendar deletion.
  }
  if(action==='sync')return json(await syncGoogleCalendar(access.userId));
  return json({error:'Choose a calendar action.'},400);
 }catch(e){return json({error:e instanceof Error?e.message:'Calendar action failed.'},503)}
}

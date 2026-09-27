import {cookies} from 'next/headers';
import {randomBytes,createHash} from 'node:crypto';
import {getPacificaAccess} from '../../../lib/clerk-access';
import {outlookConfig,outlookScope,outlookKey,syncOutlookCalendar,type OutlookConnection} from '../../../lib/outlook-calendar';
import {readCalendarSecret,writeCalendarSecret,sealCalendar,withCalendarLock} from '../../../lib/calendar-vault';
export const runtime='nodejs';export const maxDuration=60;
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(){const a=await getPacificaAccess();if(!a.allowed)return json({error:'Sign in required.'},403);const configured=outlookConfig().ready,canManage=a.role==='owner'&&a.accountUserId===a.userId;try{const c=configured?await readCalendarSecret<OutlookConnection>(outlookKey(a.userId)):null;return json({configured,canManage,connected:Boolean(c),lastSyncAt:c?.lastSyncAt||'',pending:c?.pending||0,error:c?.error||'',showExternal:Boolean(c?.showExternal),calendarUrl:c?'https://outlook.office.com/calendar/':''})}catch{return json({error:'Outlook connection could not load.'},503)}}
export async function POST(request:Request){
 const a=await getPacificaAccess();if(!a.allowed||a.role!=='owner'||a.accountUserId!==a.userId)return json({error:'The workspace owner manages Outlook Calendar.'},403);const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return json({error:'Invalid request origin.'},403);
 try{const {action,showExternal}=await request.json(),c=outlookConfig();if(!c.ready)return json({error:'Outlook Calendar needs server setup.'},503);
 if(action==='connect'){const nonce=randomBytes(32).toString('base64url'),verifier=randomBytes(32).toString('base64url'),state=sealCalendar({nonce,verifier,workspaceId:a.userId,userId:a.accountUserId,expires:Date.now()+600000},'outlook-oauth');(await cookies()).set('pacifica_outlook_oauth',nonce,{httpOnly:true,secure:new URL(c.redirectUri).protocol==='https:',sameSite:'lax',path:'/api/calendar/outlook',maxAge:600});return json({url:`https://login.microsoftonline.com/${c.tenant}/oauth2/v2.0/authorize?${new URLSearchParams({client_id:c.clientId,redirect_uri:c.redirectUri,response_type:'code',response_mode:'query',scope:outlookScope,prompt:'select_account',state,code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256'})}`})}
 if(action==='disconnect'){await withCalendarLock(outlookKey(a.userId),()=>writeCalendarSecret(outlookKey(a.userId),null));return json({ok:true})}
 if(action==='preferences'){await withCalendarLock(outlookKey(a.userId),async()=>{const saved=await readCalendarSecret<OutlookConnection>(outlookKey(a.userId));if(!saved)throw Error('Connect Outlook first.');saved.showExternal=showExternal===true;await writeCalendarSecret(outlookKey(a.userId),saved)});return json({ok:true})}
 if(action==='sync')return json(await syncOutlookCalendar(a.userId));return json({error:'Choose a calendar action.'},400);
 }catch(e){return json({error:e instanceof Error?e.message:'Outlook action failed.'},503)}
}

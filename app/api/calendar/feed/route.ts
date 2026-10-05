import {accountAllows} from '../../../lib/account-access-policy';
import {randomBytes} from 'node:crypto';
import {getPacificaAccess} from '../../../lib/clerk-access';
import {readStoredWorkspace} from '../../../lib/workspace-storage';
import {readCalendarSecret,writeCalendarSecret,sealCalendar,openCalendar,withCalendarLock} from '../../../lib/calendar-vault';
import {calendarFeed} from '../../../lib/calendar-feed';
export const runtime='nodejs';
type Feed={nonce:string;token:string};const key=(id:string)=>`feed:${id}`;
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(request:Request){
 const url=new URL(request.url),token=url.searchParams.get('token');
 if(token){try{const p=openCalendar<{workspaceId:string;nonce:string}>(token,'calendar-feed'),feed=await readCalendarSecret<Feed>(key(p.workspaceId));if(!feed||feed.nonce!==p.nonce)return new Response('Subscription revoked.',{status:403});const w=await readStoredWorkspace(p.workspaceId);if(!w)return new Response('Calendar unavailable.',{status:404});const ids=new Set(w.leads.filter(x=>x&&typeof x==='object'&&!(x as {deletedAt?:string}).deletedAt).map(x=>(x as {id:number}).id));return new Response(calendarFeed((w.officeItems||[]).filter(x=>x.leadId===0||ids.has(x.leadId)),p.workspaceId),{headers:{'Content-Type':'text/calendar; charset=utf-8','Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','Content-Disposition':'inline; filename="Pacifica.ics"'}})}catch{return new Response('Invalid calendar subscription.',{status:403})}}
 const a=await getPacificaAccess();if(!a.allowed||!accountAllows(a,'/api/calendar/feed','GET'))return json({error:'Sign in required.'},403);const canManage=a.role==='owner'&&a.accountUserId===a.userId,configured=/^[a-f\d]{64}$/i.test(process.env.GOOGLE_CALENDAR_ENCRYPTION_KEY||'');try{const feed=configured&&canManage?await readCalendarSecret<Feed>(key(a.userId)):null;return json({configured,canManage,connected:Boolean(feed),url:feed?`${url.origin}/api/calendar/feed?token=${encodeURIComponent(feed.token)}`:''})}catch{return json({error:'Subscription could not load.'},503)}
}
export async function POST(request:Request){
 const a=await getPacificaAccess();if(!a.allowed||!accountAllows(a,'/api/calendar/feed','POST')||a.role!=='owner'||a.accountUserId!==a.userId)return json({error:'Only the workspace owner manages subscriptions.'},403);const url=new URL(request.url),origin=request.headers.get('origin');if(origin&&origin!==url.origin)return json({error:'Invalid request origin.'},403);
 try{const {action}=await request.json();if(!['connect','disconnect'].includes(action))return json({error:'Choose a subscription action.'},400);return await withCalendarLock(key(a.userId),async()=>{if(action==='disconnect'){await writeCalendarSecret(key(a.userId),null);return json({ok:true})}const old=await readCalendarSecret<Feed>(key(a.userId));if(old)return json({url:`${url.origin}/api/calendar/feed?token=${encodeURIComponent(old.token)}`});const nonce=randomBytes(32).toString('base64url'),token=sealCalendar({workspaceId:a.userId,nonce},'calendar-feed');await writeCalendarSecret(key(a.userId),{nonce,token});return json({url:`${url.origin}/api/calendar/feed?token=${encodeURIComponent(token)}`})})}catch{return json({error:'Calendar subscriptions need server encryption setup.'},503)}
}

import {getPacificaAccess} from '../../../lib/clerk-access';
import {externalCalendarEvents} from '../../../lib/external-calendar';
export const runtime='nodejs';export const maxDuration=60;
export async function GET(request:Request){
 const a=await getPacificaAccess();if(!a.allowed)return Response.json({error:'Sign in required.'},{status:403});const q=new URL(request.url).searchParams,start=Date.parse(q.get('start')||''),end=Date.parse(q.get('end')||'');
 if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start||end-start>63*86400000)return Response.json({error:'Choose a calendar period of up to 63 days.'},{status:400});
 try{return Response.json(await externalCalendarEvents(a.userId,new Date(start).toISOString(),new Date(end).toISOString()),{headers:{'Cache-Control':'no-store'}})}catch{return Response.json({error:'Connected calendars could not load.'},{status:503})}
}

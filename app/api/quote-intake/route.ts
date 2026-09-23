import {randomUUID} from 'node:crypto';
import {readQuoteToken} from '../../lib/quote-intake-token';
import {cleanQuoteDetails,cleanQuoteIntake,quoteConsentText,type QuoteLink} from '../../lib/quote-intake';
import {readStoredWorkspace,updateStoredWorkspace,type StoredWorkspace} from '../../lib/workspace-storage';
export const runtime='nodejs';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
function credentials(request:Request){return readQuoteToken(request.headers.get('authorization')?.replace(/^Bearer /,'')||'')}
function available(workspace:StoredWorkspace|null,id:string):QuoteLink{
 const intake=cleanQuoteIntake(workspace?.quoteIntake),link=intake.links.find(l=>l.id===id);
 if(!workspace||!link||link.revoked||Date.parse(link.expiresAt)<=Date.now())throw Error('This quote link is invalid or expired. Ask your agent for a new link.');
 if(link.leadId!==null){const lead=workspace.leads.find(raw=>(raw as {id:number}).id===link.leadId) as Record<string,unknown>|undefined;if(!lead||lead.deletedAt||lead.doNotCall)throw Error('This quote link is no longer available.')}
 return link;
}
export async function GET(request:Request){
 try{const {workspaceId,linkId}=credentials(request),workspace=await readStoredWorkspace(workspaceId),link=available(workspace,linkId),business=workspace!.profile.businessName||'Your insurance agency';
  return json({business,existingContact:link.leadId!==null,expiresAt:link.expiresAt,consentText:quoteConsentText(business)});
 }catch{return json({error:'This quote link is unavailable or expired. Ask your agent for a new link.'},404)}
}
export async function POST(request:Request){
 try{
  const {workspaceId,linkId}=credentials(request);
  if(Number(request.headers.get('content-length')||0)>12000)return json({error:'Request is too large.'},413);
  const text=await request.text();if(text.length>12000)return json({error:'Request is too large.'},413);
  const body=JSON.parse(text),workspace=await readStoredWorkspace(workspaceId),link=available(workspace,linkId),now=new Date(),details=cleanQuoteDetails(body,link.leadId!==null,now),id=randomUUID();
  await updateStoredWorkspace(workspaceId,current=>{
   const active=available(current,linkId),intake=cleanQuoteIntake(current.quoteIntake);
   // One completed details request per personal link. Repeated submissions cannot overwrite it.
   if(active.leadId!==null&&intake.submissions.some(s=>s.linkId===linkId))return current;
   const recent=intake.submissions.filter(s=>now.getTime()-Date.parse(s.submittedAt)<86400000);
   if(recent.length>=100||recent.filter(s=>s.linkId===linkId).length>=25)throw Error('This form has reached its daily limit. Please contact the agency directly.');
   if(intake.submissions.filter(s=>s.status==='pending').length>=400)throw Error('The agency needs to review its pending requests. Please contact it directly.');
   const duplicate=recent.some(s=>s.linkId===linkId&&s.details.phone===details.phone&&now.getTime()-Date.parse(s.submittedAt)<3600000);
   if(duplicate)return current;
   const pending=intake.submissions.filter(s=>s.status==='pending');
   const reviewed=intake.submissions.filter(s=>s.status!=='pending').slice(-(499-pending.length));
   return {...current,quoteIntake:{...intake,submissions:[...reviewed,...pending,{id,linkId,leadId:active.leadId,source:active.source,submittedAt:now.toISOString(),status:'pending' as const,details,consentText:quoteConsentText(current.profile.businessName||'Your insurance agency')}].slice(-500)}};
  });
  return json({ok:true,message:'Your request was received. Your agent will review the details and follow up with you.'});
 }catch(error){return json({error:error instanceof Error&&/^(Enter |Choose |Check |Confirm |Use |This |The agency |Unable to submit this request)/.test(error.message)?error.message:'Unable to submit. Please try again or contact your agent.'},400)}
}

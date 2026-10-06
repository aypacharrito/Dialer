import {randomUUID} from 'node:crypto';
import {backgroundReminder,type ContactReview} from './review-context';
import {type NoteReminder} from './note-reminders';
export type TodayCandidate={leadId:number;sourceId:string;title:string;evidence:string;dueAt:string;actionKey:string;confidence:number};
export type TodayResolution={id:string;leadId:number;state:'done'|'dismissed';sourceId:string;evidence:string;reason:string;confidence:number};
const normalized=(s:string)=>s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
function grounded(context:ContactReview,sourceId:string,evidence:string){return typeof evidence==='string'&&evidence.trim().length>=5&&evidence.length<=500?context.sources.find(s=>s.key===sourceId&&s.text.includes(evidence)):undefined;}
export function reconcileToday(items:NoteReminder[],contexts:ContactReview[],candidates:TodayCandidate[],resolutions:TodayResolution[],now:string){
 const next=items.map(t=>({...t}));let added=0,resolved=0,dismissed=0;
 for(const item of next){
  if(item.status!=='open'||item.resolvedBy==='user')continue;
  const context=contexts.find(c=>c.id===item.leadId),snapshot=context?.existing.find(t=>t.id===item.id);
  if(!context||!snapshot||snapshot.updatedAt!==item.updatedAt)continue;
  if(backgroundReminder(item)){item.status='dismissed';item.resolvedBy='ai';item.resolution='Background information, not an outstanding action.';item.updatedAt=now;dismissed++;continue;}
  const decision=resolutions.find(r=>r&&r.id===item.id&&r.leadId===item.leadId&&['done','dismissed'].includes(r.state)&&typeof r.reason==='string'&&r.reason.trim()&&Number.isFinite(r.confidence)&&r.confidence>=.92);
  if(!decision)continue;
  const source=grounded(context,decision.sourceId,decision.evidence);if(!source)continue;
  const original=context.sources.find(s=>s.key===item.sourceId);
  if(decision.state==='done'){
   if(/Delivery status: (?:failed|undelivered|queued|pending|sending|canceled)/i.test(source.text))continue;
   if(original?.recordedAt&&source.recordedAt&&Date.parse(source.recordedAt)<Date.parse(original.recordedAt))continue;
  }
  item.status=decision.state;item.resolvedBy='ai';item.resolution=decision.reason.slice(0,300);item.resolutionEvidence=decision.evidence;item.resolutionSourceId=source.key;item.updatedAt=now;
  if(decision.state==='done')resolved++;else dismissed++;
 }
 const perContact=new Map<number,number>();
 for(const candidate of candidates.slice(0,40)){
  if(!candidate)continue;
  const context=contexts.find(c=>c.id===candidate.leadId);if(!context)continue;
  const source=grounded(context,candidate.sourceId,candidate.evidence);
  if(!source||typeof candidate.title!=='string'||!candidate.title.trim()||typeof candidate.actionKey!=='string'||!candidate.actionKey.trim()||candidate.confidence<.88||!Number.isFinite(candidate.confidence)||/^(?:Review information:|Review document information$)/i.test(candidate.title))continue;
  if((perContact.get(candidate.leadId)||0)>=3||next.length>=5000)continue;
  const key=normalized(candidate.actionKey).slice(0,100),evidence=normalized(candidate.evidence);
  const duplicate=next.some(t=>t.leadId===candidate.leadId&&(
   normalized(t.evidence)===evidence&&(!t.sourceId||t.sourceId===source.key||!source.recordedAt||Date.parse(source.recordedAt)<=Date.parse(t.updatedAt))||
   (t.actionKey===key||normalized(t.title)===normalized(candidate.title))&&(t.status==='open'||!source.recordedAt||Date.parse(source.recordedAt)<=Date.parse(t.updatedAt))
  ));
  if(duplicate)continue;
  next.push({id:randomUUID(),leadId:candidate.leadId,sourceId:source.key,sourceLabel:source.label,title:candidate.title.trim().slice(0,160),evidence:candidate.evidence,actionKey:key,confidence:candidate.confidence,dueAt:/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(candidate.dueAt)&&Number.isFinite(Date.parse(candidate.dueAt))?new Date(candidate.dueAt).toISOString():'',status:'open',snoozedUntil:'',createdAt:now,updatedAt:now});added++;perContact.set(candidate.leadId,(perContact.get(candidate.leadId)||0)+1);
 }
 return {items:next,added,resolved,dismissed};
}

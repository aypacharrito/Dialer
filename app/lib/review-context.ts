import {createHash} from 'node:crypto';
import {reviewSources,type ReviewLead,type ReviewSource} from './review-sources';
import {cleanNoteReminders,type NoteReminder} from './note-reminders';
export type DocumentInsight={id:string;leadId:number;sourceId:string;name:string;text:string;recordedAt:string;createdAt:string};
export type ContactReview={id:number;name:string;stage:string;doNotCall:boolean;sources:ReviewSource[];existing:NoteReminder[];fingerprint:string;truncated:boolean};
export const reviewPolicy='contact-timeline-v38';
export function cleanDocumentInsights(value:unknown):DocumentInsight[]{return Array.isArray(value)?value.filter((v):v is DocumentInsight=>Boolean(v&&typeof v.id==='string'&&Number.isSafeInteger(v.leadId)&&typeof v.sourceId==='string'&&typeof v.text==='string')).slice(-500).map(v=>({...v,name:String(v.name||'Document').slice(0,120),text:v.text.slice(0,12000)})):[];}
export function backgroundReminder(item:NoteReminder){return /^(?:Review information:|Review document information$)/i.test(item.title);}
export function contactReviewContexts(leads:ReviewLead[],items:NoteReminder[],documents:DocumentInsight[]=[]):ContactReview[]{
 const sources=reviewSources(leads),result:ContactReview[]=[];
 for(const lead of leads){
  if(lead.deletedAt)continue;
  const existing=cleanNoteReminders(items).filter(t=>t.leadId===lead.id),all=sources.filter(s=>s.leadId===lead.id);
  for(const doc of documents.filter(d=>d.leadId===lead.id))all.push({key:doc.sourceId,leadId:lead.id,name:lead.name||'Contact',text:doc.text,label:`Document transcription · ${doc.name} · verify original`,recordedAt:doc.recordedAt||doc.createdAt});
  const legacy=new Map<string,NoteReminder[]>();for(const task of existing.filter(t=>backgroundReminder(t)&&t.sourceId?.startsWith('attachment:'))){const id=task.sourceId!;legacy.set(id,[...(legacy.get(id)||[]),task]);}
  for(const [key,tasks] of legacy)if(!all.some(s=>s.key===key))all.push({key,leadId:lead.id,name:lead.name||'Contact',text:tasks.map(t=>t.evidence).join('\n'),label:tasks[0].sourceLabel||'Document transcription',recordedAt:tasks[0].createdAt});
  if(!all.length&&!existing.some(t=>t.status==='open'))continue;
  all.sort((a,b)=>(Date.parse(a.recordedAt)||0)-(Date.parse(b.recordedAt)||0)||a.key.localeCompare(b.key));
  const fingerprint=createHash('sha256').update(JSON.stringify({policy:reviewPolicy,stage:lead.stage,doNotCall:lead.doNotCall,sources:all})).digest('hex');
  // Keep request anchors and the latest conversation together. The model is told
  // when older context is omitted and cannot close a task merely for absence.
  const anchors=new Set(existing.filter(t=>t.status==='open').map(t=>t.sourceId));
  const chosen=all.filter((s,i)=>i>=all.length-100||s.label==='Call notes'||anchors.has(s.key));
  let chars=0;const bounded:ReviewSource[]=[];
  for(const s of chosen.slice().reverse()){if(chars+s.text.length>65000)continue;bounded.unshift(s);chars+=s.text.length;}
  result.push({id:lead.id,name:lead.name||'Contact',stage:lead.stage||'',doNotCall:Boolean(lead.doNotCall),sources:bounded,existing,fingerprint,truncated:bounded.length<all.length});
 }
 return result;
}

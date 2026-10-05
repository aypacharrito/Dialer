import {reviewSources,type ReviewLead} from "./review-sources";
export type NoteReminder={sourceId?:string;sourceLabel?:string;id:string;leadId:number;title:string;evidence:string;dueAt:string;status:"open"|"done";snoozedUntil:string;createdAt:string;updatedAt:string};
export type NoteReview={checked:Record<string,string>;nextRunAt:number;lastRunAt:number;lease:string;error:string};
export const emptyNoteReview=():NoteReview=>({checked:{},nextRunAt:0,lastRunAt:0,lease:"",error:""});
export function cleanNoteReminders(value:unknown):NoteReminder[]{
 if(!Array.isArray(value))return [];
 return value.filter((v):v is NoteReminder=>Boolean(v&&typeof v.id==="string"&&Number.isFinite(v.leadId)&&typeof v.title==="string"&&typeof v.evidence==="string"&&["open","done"].includes(v.status)&&Number.isFinite(Date.parse(v.createdAt)))).slice(0,5000).map(v=>({...v,title:v.title.slice(0,160),evidence:v.evidence.slice(0,500),dueAt:Number.isFinite(Date.parse(v.dueAt))?v.dueAt:"",snoozedUntil:Number.isFinite(Date.parse(v.snoozedUntil))?v.snoozedUntil:""}));
}
export function visibleNoteReminders(items:NoteReminder[],now=Date.now()){
 return items.filter(t=>t.status==="open"&&(!t.snoozedUntil||Date.parse(t.snoozedUntil)<=now)&&(!t.dueAt||Date.parse(t.dueAt)<=now)).sort((a,b)=>Date.parse(a.dueAt||a.createdAt)-Date.parse(b.dueAt||b.createdAt));
}
export function noteTaskKey(leadId:number,evidence:string){return `${leadId}:${evidence.toLowerCase().replace(/\s+/g," ").trim()}`;}
export function applyNoteCandidates(items:NoteReminder[],candidates:Array<{leadId:number;title:string;evidence:string;dueAt:string;sourceId?:string}>,leads:ReviewLead[],now:string){
 const sources=reviewSources(leads);
 const next=[...items],seen=new Set(items.map(t=>noteTaskKey(t.leadId,t.evidence)));
 for(const c of candidates.slice(0,80)){
  const lead=leads.find(l=>l.id===c.leadId&&!l.deletedAt);
  const source=sources.find(s=>s.leadId===c.leadId&&(c.sourceId?s.key===c.sourceId:s.label==="Call notes")&&typeof c.evidence==="string"&&s.text.includes(c.evidence));
  if(!lead||!source||typeof c.evidence!=="string"||c.evidence.trim().length<5||c.evidence.length>500||typeof c.title!=="string"||!c.title.trim())continue;
  const key=noteTaskKey(c.leadId,c.evidence);if(seen.has(key)||next.length>=5000)continue;
  seen.add(key);next.push({id:crypto.randomUUID(),sourceId:source.key,sourceLabel:source.label,leadId:c.leadId,title:c.title.trim().slice(0,160),evidence:c.evidence,dueAt:/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(c.dueAt)&&Number.isFinite(Date.parse(c.dueAt))?new Date(c.dueAt).toISOString():"",status:"open",snoozedUntil:"",createdAt:now,updatedAt:now});
 }
 return next;
}

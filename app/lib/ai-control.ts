import type {OfficeItem} from './office-schedule';
export type OutreachRule={enabled:boolean;audience:'all-eligible'|'new-leads'|'follow-ups'|'selected';ids:number[];excludeIds:number[];sources:string[];excludeSources:string[];dailyAt:string;timeZone:string;startDate:string};
export type AiControl={revision:number;salesEnabled:boolean|null;rules:Partial<Record<'sms'|'email',OutreachRule>>;receipts:Array<{id:string;at:string;changes:string[]}>};
export type ControlCommand={kind:'outreach'|'calendar';channel:'sms'|'email'|null;enabled:boolean|null;audience:OutreachRule['audience']|null;ids:number[]|null;excludeIds:number[]|null;sources:string[]|null;excludeSources:string[]|null;dailyAt:string|null;timeZone:string|null;startDate:string|null;salesEnabled:boolean|null;calendarAction:'create'|'edit'|'complete'|'delete'|null;eventId:string|null;leadId:number|null;title:string|null;dueAt:string|null;durationMinutes:number|null;staffReminderMinutes:number|null};
export const defaultRule=():OutreachRule=>({enabled:true,audience:'all-eligible',ids:[],excludeIds:[],sources:[],excludeSources:[],dailyAt:'',timeZone:'America/Los_Angeles',startDate:''});
const list=(v:unknown)=>Array.isArray(v)?v:[];
export function cleanAiControl(value:unknown):AiControl{
 const v=(value&&typeof value==='object'?value:{}) as Partial<AiControl>,rules:AiControl['rules']={};
 for(const channel of ['sms','email'] as const){const r=v.rules?.[channel];if(r&&typeof r==='object')rules[channel]={...defaultRule(),enabled:r.enabled!==false,audience:['all-eligible','new-leads','follow-ups','selected'].includes(r.audience)?r.audience:'all-eligible',ids:list(r.ids).filter(Number.isSafeInteger).slice(0,5000),excludeIds:list(r.excludeIds).filter(Number.isSafeInteger).slice(0,5000),sources:list(r.sources).filter(x=>typeof x==='string').slice(0,200),excludeSources:list(r.excludeSources).filter(x=>typeof x==='string').slice(0,200),dailyAt:typeof r.dailyAt==='string'?r.dailyAt:'',timeZone:typeof r.timeZone==='string'?r.timeZone:'America/Los_Angeles',startDate:typeof r.startDate==='string'?r.startDate:''}}
 return {revision:Number.isSafeInteger(v.revision)?v.revision!:0,salesEnabled:typeof v.salesEnabled==='boolean'?v.salesEnabled:null,rules,receipts:list(v.receipts).filter(x=>x&&typeof x.id==='string'&&Array.isArray(x.changes)).slice(-100)};
}
export function matchesOutreach(lead:Record<string,unknown>,rule?:OutreachRule){
 if(!rule)return true;if(!rule.enabled)return false;
 const id=Number(lead.id),source=String(lead.source||'').toLowerCase(),follow=lead.stage==='Follow-up'||Number(lead.attempts)>0||['No answer','Voicemail','Call back later'].includes(String(lead.outcome));
 if(rule.excludeIds.includes(id)||rule.excludeSources.some(x=>x.toLowerCase()===source))return false;
 if(rule.sources.length&&!rule.sources.some(x=>x.toLowerCase()===source))return false;
 return rule.audience==='selected'?rule.ids.includes(id):rule.audience==='follow-ups'?follow:rule.audience==='new-leads'?lead.stage==='New lead'&&!follow:true;
}
export function inOutreachWindow(rule:OutreachRule|undefined,now=new Date()){
 if(!rule)return true;
 try{const parts=new Intl.DateTimeFormat('en-CA',{timeZone:rule.timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now),get=(k:string)=>parts.find(x=>x.type===k)?.value||'';
 const day=`${get('year')}-${get('month')}-${get('day')}`;
 if(rule.startDate&&day<rule.startDate)return false;
 if(!rule.dailyAt)return true;
 const [h,m]=rule.dailyAt.split(':').map(Number),minute=Number(get('hour'))*60+Number(get('minute')),start=h*60+m;
 return minute>=start&&minute<Math.min(1440,start+60);
 }catch{return false}
}
export function describeRule(channel:string,rule:OutreachRule){return `${channel==='sms'?'Texts':'Emails'}: ${rule.enabled?rule.audience:'paused'}${rule.sources.length?`; sources: ${rule.sources.join(', ')}`:''}${rule.audience==='selected'?`; ${rule.ids.length} selected contacts`:''}${rule.excludeIds.length?`; ${rule.excludeIds.length} contacts excluded`:''}${rule.excludeSources.length?`; excluded sources: ${rule.excludeSources.join(', ')}`:''}${rule.dailyAt?`; daily from ${rule.dailyAt} ${rule.timeZone} (up to one hour)`:'; existing sequence timing'}${rule.startDate?`; from ${rule.startDate}`:''}`}
export function validateRule(rule:OutreachRule,leads:Record<string,unknown>[]){
 const knownIds=new Set(leads.map(x=>x.id)),knownSources=new Set(leads.map(x=>String(x.source||'').toLowerCase()));
 if(!['all-eligible','new-leads','follow-ups','selected'].includes(rule.audience))throw Error('Choose a valid audience.');
 for(const values of [rule.ids,rule.excludeIds])if(!Array.isArray(values)||values.some(id=>!Number.isSafeInteger(id)||!knownIds.has(id)))throw Error('A selected contact is no longer in this workspace.');
 for(const values of [rule.sources,rule.excludeSources])if(!Array.isArray(values)||values.some(s=>typeof s!=='string'||!knownSources.has(s.toLowerCase())))throw Error('Choose an existing source name.');
 if(rule.audience==='selected'&&!rule.ids.length)throw Error('Name at least one contact for the selected audience.');
 if(rule.dailyAt&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(rule.dailyAt))throw Error('Use a daily time in HH:MM format.');
 if(rule.startDate&&(!/^\d{4}-\d{2}-\d{2}$/.test(rule.startDate)||!Number.isFinite(Date.parse(rule.startDate))||new Date(rule.startDate).toISOString().slice(0,10)!==rule.startDate))throw Error('Use a valid start date.');
 try{new Intl.DateTimeFormat('en',{timeZone:rule.timeZone}).format()}catch{throw Error('Choose a valid time zone.')}
}
export function applyControlCommands<T extends {leads:unknown[];officeItems?:OfficeItem[];aiControl?:AiControl}>(workspace:T,commands:ControlCommand[],requestId:string,now=new Date()){
 if(!Array.isArray(commands)||!commands.length||commands.length>10)throw Error('Choose between one and ten changes.');
 const control=cleanAiControl(workspace.aiControl),changes:string[]=[],leads=workspace.leads as Record<string,unknown>[];let items=[...(workspace.officeItems||[])];
 for(const [index,c] of commands.entries()){
  if(c.kind==='outreach'){
   if(c.channel!=='sms'&&c.channel!=='email')throw Error('Choose text or email.');
   const rule={...(control.rules[c.channel]||defaultRule())};
   for(const field of ['enabled','audience','ids','excludeIds','sources','excludeSources','dailyAt','timeZone','startDate'] as const)if(c[field]!==null&&c[field]!==undefined)Object.assign(rule,{[field]:c[field]});
   if(typeof rule.enabled!=='boolean')throw Error('Choose whether sending is enabled.');validateRule(rule,leads);control.rules[c.channel]=rule;
   if(c.salesEnabled!==null&&c.salesEnabled!==undefined){if(typeof c.salesEnabled!=='boolean')throw Error('Invalid automation setting.');control.salesEnabled=c.salesEnabled;changes.push(`Automated sales sequences ${c.salesEnabled?'enabled':'paused'}.`)}
   changes.push(describeRule(c.channel,rule));
  }else if(c.kind==='calendar'){
   const old=items.find(x=>x.id===c.eventId);
   if(c.calendarAction!=='create'&&!old)throw Error('Calendar item no longer exists.');
   if(old?.reminderState==='sending')throw Error('A customer text is being submitted for this event. Try again shortly.');
   if(c.calendarAction==='delete'){items=items.filter(x=>x.id!==old!.id);changes.push(`Removed: ${old!.title}`);continue}
   if(c.calendarAction==='complete'){items=items.map(x=>x.id===old!.id?{...x,status:'done',reminderState:x.reminderState==='pending'?'off':x.reminderState}:x);changes.push(`Completed: ${old!.title}`);continue}
   if(!['create','edit'].includes(c.calendarAction||''))throw Error('Choose a valid calendar action.');
   if(c.calendarAction==='create'&&items.length>=500)throw Error('Calendar is full. Remove a completed event first.');
   if(old?.status==='done')throw Error('Choose an open event to edit.');
   const leadId=c.leadId??old?.leadId??0,title=c.title??old?.title??'',dueAt=c.dueAt??old?.dueAt??'',durationMinutes=c.durationMinutes??old?.durationMinutes??30,staffReminderMinutes=c.staffReminderMinutes??old?.staffReminderMinutes??15;
   if(leadId!==0&&!leads.some(x=>x.id===leadId&&!x.deletedAt))throw Error('Choose a saved contact in this workspace.');
   if(!title.trim()||title.length>100||!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(dueAt)||!Number.isFinite(Date.parse(dueAt)))throw Error('Add a title and an exact date/time with a time zone.');
   if(![15,30,45,60,90,120].includes(durationMinutes)||![-1,0,5,15,30,60,1440].includes(staffReminderMinutes))throw Error('Choose a supported duration and reminder.');
   const item:OfficeItem={...(old||{id:`ai-${requestId}-${index}`,kind:'appointment',amount:0,createdAt:now.toISOString()}),leadId,title:title.trim(),dueAt:new Date(dueAt).toISOString(),durationMinutes,staffReminderMinutes,status:'open',reminderState:old?.reminderState==='sent'?'sent':'off',reminderAt:''};
   items=old?items.map(x=>x.id===old.id?item:x):[...items,item];changes.push(`${old?'Updated':'Created'}: ${title} · ${item.dueAt}${old?.reminderState==='pending'?' · previous customer text canceled; reschedule it in Calendar':''}`);
  }else throw Error('Unsupported CRM action.');
 }
 control.revision++;control.receipts=[...control.receipts,{id:requestId,at:now.toISOString(),changes}].slice(-100);
 return {workspace:{...workspace,officeItems:items,aiControl:control},changes};
}

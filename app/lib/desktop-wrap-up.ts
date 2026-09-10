import {selectPostCallOutcome,type PostCallDraft} from './post-call';

export const desktopOutcomes=['Call back later','Interested','Appointment set','No answer','Voicemail','Not interested','Wrong number','Sold / Won','Completed'];
const stages=['New lead','Follow-up','Appointment','Quoted','Closed'];
export type DesktopWrapAction={id:string;kind:'save'|'again'|'pause';outcome:string;notes:string;appointmentAt:string;stage:string};

/** Validate desktop messages and keep the CRM's outcome mapping authoritative. */
export function desktopWrapDraft(value:unknown,id:string,draft:PostCallDraft,source:string,wasClosed:boolean,now=new Date()){
 if(!value||typeof value!=='object')return null;
 const action=value as Partial<DesktopWrapAction>;
 if(action.id!==id||!['save','again','pause'].includes(action.kind||'')||!desktopOutcomes.includes(action.outcome||'')||!stages.includes(action.stage||''))return null;
 if(typeof action.notes!=='string'||action.notes.length>20000||typeof action.appointmentAt!=='string'||(action.appointmentAt!==''&&!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(action.appointmentAt)))return null;
 const mapped=selectPostCallOutcome(draft,source,action.outcome!,now,wasClosed);
 return {kind:action.kind!,draft:{...mapped,notes:action.notes,crmStage:action.stage!,appointmentAt:action.stage==='Closed'?'':action.appointmentAt}};
}

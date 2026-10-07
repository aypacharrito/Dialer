import {cleanVoiceHistory,type VoiceOutcome,type VoicePilotRun,type VoiceCallHistory} from './voice-pilot';
type Workspace={leads:unknown[];callLogs:unknown[];voicePilotHistory?:VoiceCallHistory[]};
type Log=Record<string,unknown>;
export type AiCallResult={aiRunId?:string;aiOutcome?:string;aiResultAt?:string;outcome?:string;aiSummary?:string;detectedResult?:string;duration?:number};
export function mergeAiCallResult<T extends AiCallResult>(local:T,remote:AiCallResult,server=false):T{
 if(!remote.aiRunId||!remote.aiResultAt||!server&&Date.parse(remote.aiResultAt)<=(Date.parse(local.aiResultAt||'')||0))return local;
 const patch={aiRunId:remote.aiRunId,aiOutcome:remote.aiOutcome,aiResultAt:remote.aiResultAt,outcome:remote.outcome||local.outcome,aiSummary:typeof remote.aiSummary==='string'?remote.aiSummary:local.aiSummary,detectedResult:remote.detectedResult||local.detectedResult,duration:Math.max(local.duration||0,remote.duration||0)};
 return Object.entries(patch).some(([key,value])=>local[key as keyof AiCallResult]!==value)?{...local,...patch}:local;
}
const labels:Record<VoiceOutcome,string>={completed:'Completed','no-answer':'No answer',voicemail:'Voicemail','not-interested':'Not interested','wrong-person':'Wrong number','opt-out':'Do not call',callback:'Callback requested','human-ended':'Completed','manual-stop':'Stopped',skipped:'Skipped',error:'Failed',started:'Calling'};
function resolved(outcome:VoiceOutcome,status:unknown):VoiceOutcome{
 return status==='no-answer'&&['started','completed','error','no-answer'].includes(outcome)?'no-answer':outcome;
}
function classified(log:Log,outcome:VoiceOutcome,runId:string){
 const previous=Date.parse(String(log.aiResultAt||'')),at=new Date(Math.max(Date.now(),Number.isFinite(previous)?previous+1:0)).toISOString();
 return {...log,aiRunId:runId,aiOutcome:outcome,aiResultAt:at,outcome:labels[outcome],...(['voicemail','no-answer'].includes(outcome)?{detectedResult:labels[outcome]}:{})};
}
/** Append call facts only; never rewrite contact fields or dispositions. */
export function recordVoiceResult<T extends Workspace>(current:T,run:VoicePilotRun,requested:VoiceOutcome,summary:string){
 const logs=current.callLogs as Log[],index=logs.findIndex(log=>log.aiRunId===run.id||Boolean(run.callSid&&log.callSid===run.callSid));
 const previous=index<0?undefined:logs[index],outcome=resolved(requested,previous?.detectionStatus);
 const note=outcome==='no-answer'&&requested!==outcome?'No answer.':summary;
 let callLogs=current.callLogs;
 if(run.callSid){
  const lead=(current.leads as Log[]).find(item=>item.id===run.leadId);
  const log=classified({id:'ai-'+run.id,callSid:run.callSid,name:String(lead?.name||run.phone),phone:run.phone,startedAt:new Date(run.startedAt).toISOString(),duration:0,status:'AI call',campaign:'Ava',source:String(lead?.source||'Pacifica'),...previous,aiSummary:note},outcome,run.id);
  callLogs=index<0?[log,...logs].slice(0,1000):logs.map((item,i)=>i===index?log:item);
 }
 return {workspace:{...current,callLogs,voicePilotHistory:cleanVoiceHistory(current.voicePilotHistory).map(item=>item.id===run.id?{...item,outcome,summary:note}:item)},outcome,summary:note};
}
/** Twilio callbacks can arrive before or after the browser saves its AI result. */
export function reconcileVoiceStatus<T extends Workspace>(current:T,runId:string,callSid:string,phone:string):T{
 const history=cleanVoiceHistory(current.voicePilotHistory),entry=history.find(item=>item.id===runId&&item.phone===phone);
 const logs=current.callLogs as Log[],index=logs.findIndex(item=>item.callSid===callSid);
 if(!entry||index<0)return current;
 const previous=logs[index],outcome=resolved(entry.outcome,previous.detectionStatus);
 if(outcome==='started')return current;
 const summary=outcome!==entry.outcome?'No answer.':entry.summary;
 return {...current,voicePilotHistory:history.map(item=>item.id===runId?{...item,outcome,summary}:item),callLogs:logs.map((item,i)=>i===index?{...classified(previous,outcome,runId),aiSummary:summary}:item)};
}

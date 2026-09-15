export type CallDetection = {
  humanDetected?: boolean;
  detectedResult?: string;
  detectionUpdatedAt?: string;
  answeredBy?: string;
  detectionSequence?: number;
  detectionStatus?: string;
};
export type ContactCallDetection = {
  lastCallResult?: string;
  lastCallStartedAt?: string;
  lastCallDetectionAt?: string;
  lastDetectedCallSid?: string;
};
export function detectedResult(status: string, answeredBy: string): string {
  if (answeredBy === 'human') return 'Answered';
  if (/^machine_(start|end_beep|end_silence|end_other)$/.test(answeredBy)) return 'Voicemail';
  if (answeredBy === 'fax') return 'Fax';
  if (status === 'in-progress' || status === 'answered' || status === 'completed') return 'Answered';
  if (status === 'no-answer') return 'No answer';
  if (status === 'busy') return 'Busy';
  if (status === 'failed') return 'Failed';
  if (status === 'canceled') return 'Canceled';
  return 'Unknown';
}
export function mergeCallDetection<T extends CallDetection>(local: T, remote: CallDetection): T {
  if (!remote.detectionUpdatedAt || Date.parse(remote.detectionUpdatedAt) <= (Date.parse(local.detectionUpdatedAt || '') || 0)) return local;
  return {...local, humanDetected:Boolean(local.humanDetected||remote.humanDetected), detectedResult:remote.detectedResult, detectionUpdatedAt:remote.detectionUpdatedAt, answeredBy:remote.answeredBy, detectionSequence:remote.detectionSequence, detectionStatus:remote.detectionStatus};
}
export function mergeContactCallDetection<T extends ContactCallDetection>(local:T,remote:ContactCallDetection):T {
  if (!remote.lastCallDetectionAt || Date.parse(remote.lastCallDetectionAt) <= (Date.parse(local.lastCallDetectionAt || '') || 0)) return local;
  return {...local,lastCallResult:remote.lastCallResult,lastCallStartedAt:remote.lastCallStartedAt,lastCallDetectionAt:remote.lastCallDetectionAt,lastDetectedCallSid:remote.lastDetectedCallSid};
}
export function callResultLabel(log:CallDetection & {outcome:string}) {
  // Keep the salesperson's disposition, with detection shown separately in the report.
  return ['Completed','Timed out','Canceled','Rejected','Failed','Unknown',''].includes(log.outcome) ? log.detectedResult || log.outcome : log.outcome;
}
type RecordValue = Record<string,unknown>;
export function applyCallDetection(workspace:{leads:unknown[];callLogs:unknown[]}, event:{callSid:string;parentCallSid:string;phone:string;startedAt:string;status:string;answeredBy:string;sequence:number;duration:number}, now=new Date().toISOString()) {
  const logs=workspace.callLogs as RecordValue[];
  const id=event.parentCallSid || event.callSid;
  const index=logs.findIndex(log=>log.callSid===id || log.callSid===event.callSid || log.id===`detected-${id}`);
  const previous=index<0?{}:logs[index];
  const incomingStatus=event.status && event.sequence >= Number(previous.detectionSequence ?? -1);
  const status=incomingStatus?event.status:String(previous.detectionStatus||'');
  // AMD and call-progress callbacks arrive independently; completed does not mean human.
  const answeredBy=String(previous.answeredBy||'') && (!event.answeredBy || event.answeredBy==='unknown') ? String(previous.answeredBy) : event.answeredBy || String(previous.answeredBy||'');
  if(!event.answeredBy&&!incomingStatus)return workspace;
  const result=detectedResult(status,answeredBy);
  if(previous.detectedResult===result&&previous.answeredBy===answeredBy&&previous.detectionStatus===status&&(!incomingStatus||Number(previous.detectionSequence)===event.sequence))return workspace;
  const digits=(value:unknown)=>String(value||'').replace(/\D/g,'');
  const contact=(workspace.leads as RecordValue[]).find(lead=>digits(lead.phone)===digits(event.phone)||digits(lead.phone)===digits(event.phone).replace(/^1(?=\d{10}$)/,''));
  const log={id:`detected-${id}`,callSid:id,name:String(contact?.name||event.phone),phone:event.phone,startedAt:event.startedAt,outcome:'Unknown',status:'Call detected',campaign:'Pacifica',source:String(contact?.source||'Manual'),...previous,
    humanDetected:Boolean(previous.humanDetected||previous.answeredBy==='human'||event.answeredBy==='human'),detectedResult:result,answeredBy,detectionUpdatedAt:now,detectionStatus:status,detectionSequence:incomingStatus?event.sequence:Number(previous.detectionSequence??-1),duration:Math.max(Number(previous.duration)||0,event.duration)};
  const callLogs=[...logs];if(index<0)callLogs.unshift(log);else callLogs[index]=log;
  const leads=workspace.leads.map(raw=>{
    const lead=raw as RecordValue;if(lead!==contact||lead.deletedAt)return lead;
    if(Date.parse(String(lead.lastCallStartedAt||''))>Date.parse(event.startedAt))return lead;
    return {...lead,lastCallResult:result,lastCallStartedAt:event.startedAt,lastCallDetectionAt:now,lastDetectedCallSid:id};
  });
  return {...workspace,leads,callLogs:callLogs.slice(0,1000)};
}

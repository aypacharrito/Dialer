import type {CallLog} from "../components/CallLogReport";

const recordingFields=["recordingSid","recordingUrl","recordingStatus","transcript","aiSummary"] as const;

/** Polling unchanged recordings must not mark the workspace dirty. */
export function mergeRecordingUpdates(local:CallLog[],remote:CallLog[]){
  const byId=new Map(remote.map(log=>[log.id,log]));
  const byCallSid=new Map(remote.filter(log=>log.callSid).map(log=>[log.callSid!,log]));
  const matched=new Set<string>();
  const merged=local.map(log=>{
    const update=byId.get(log.id)||(log.callSid?byCallSid.get(log.callSid):undefined);
    if(!update)return log;
    matched.add(update.id);
    const changes:Partial<CallLog>={};
    for(const field of recordingFields){
      const value=update[field];
      if(value&&value!==log[field])changes[field]=value;
    }
    return Object.keys(changes).length?{...log,...changes}:log;
  });
  const added=remote.filter(log=>!matched.has(log.id)&&Boolean(log.recordingSid));
  if(!added.length&&merged.every((log,index)=>log===local[index]))return local;
  return [...added,...merged].slice(0,500);
}

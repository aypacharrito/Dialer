import fs from "node:fs";

const crmPath = "app/CRMClient.tsx";
const profilePath = "app/lib/workspace-profile.ts";
const marker = "PACIFICA_STABLE_DIALER_RUN_V2";

function mustReplace(source, search, replacement, label) {
  if (source.includes(replacement)) return source;
  if (!source.includes(search)) throw new Error(`Pacifica upgrade could not find ${label}`);
  return source.replace(search, replacement);
}

function mustReplaceRegex(source, regex, replacement, label) {
  if (source.includes(replacement)) return source;
  if (!regex.test(source)) throw new Error(`Pacifica upgrade could not find ${label}`);
  return source.replace(regex, replacement);
}

function patchWorkspaceProfile() {
  let source = fs.readFileSync(profilePath, "utf8");
  if (source.includes(marker)) return;

  source = mustReplace(
    source,
    'export type LiveCallSession={leadId:number|null;name:string;phone:string;line:"life"|"home-auto";status:"dialing"|"connected";startedAt:string;updatedAt:string};',
    'export type LiveCallSession={leadId:number|null;name:string;phone:string;line:"life"|"home-auto";status:"dialing"|"connected";startedAt:string;updatedAt:string};\nexport type DialerRunState={ids:number[];completed:number;total:number;startedAt:string;updatedAt:string}; // PACIFICA_STABLE_DIALER_RUN_V2',
    "DialerRunState type",
  );

  source = mustReplace(
    source,
    '  liveCallSession:LiveCallSession|null;\n  expoPushToken:string;',
    '  liveCallSession:LiveCallSession|null;\n  dialerRuns:{life:DialerRunState|null;"home-auto":DialerRunState|null};\n  expoPushToken:string;',
    "WorkspaceProfile dialerRuns field",
  );

  source = mustReplace(
    source,
    '  liveCallSession:null,\n  expoPushToken:"",',
    '  liveCallSession:null,\n  dialerRuns:{life:null,"home-auto":null},\n  expoPushToken:"",',
    "default dialerRuns",
  );

  source = mustReplace(
    source,
    'export function cleanWorkspaceProfile(value:unknown):WorkspaceProfile{\n  const profile=value&&typeof value==="object"?value as Partial<WorkspaceProfile>:{};\n  const rawLiveCall=profile.liveCallSession&&typeof profile.liveCallSession==="object"?profile.liveCallSession:null;',
    `function cleanDialerRun(value:unknown):DialerRunState|null{\n  if(!value||typeof value!=="object")return null;\n  const run=value as Partial<DialerRunState>;\n  const ids=Array.isArray(run.ids)?Array.from(new Set(run.ids.map(Number).filter(id=>Number.isFinite(id)&&id>0))).slice(0,10000):[];\n  if(!ids.length)return null;\n  const total=Math.max(ids.length,Math.round(Number(run.total)||ids.length));\n  const completed=Math.min(total,Math.max(0,Math.round(Number(run.completed)||0)));\n  return {ids,completed,total,startedAt:String(run.startedAt||new Date().toISOString()),updatedAt:String(run.updatedAt||new Date().toISOString())};\n}\n\nexport function cleanWorkspaceProfile(value:unknown):WorkspaceProfile{\n  const profile=value&&typeof value==="object"?value as Partial<WorkspaceProfile>:{};\n  const rawLiveCall=profile.liveCallSession&&typeof profile.liveCallSession==="object"?profile.liveCallSession:null;\n  const rawDialerRuns=profile.dialerRuns&&typeof profile.dialerRuns==="object"?profile.dialerRuns as Partial<Record<"life"|"home-auto",DialerRunState>>:{};`,
    "cleanDialerRun helper",
  );

  source = mustReplace(
    source,
    '    liveCallSession:rawLiveCall&&String(rawLiveCall.phone||"").trim()?{leadId:Number.isFinite(Number(rawLiveCall.leadId))?Number(rawLiveCall.leadId):null,name:String(rawLiveCall.name||"Active call").trim().slice(0,120),phone:String(rawLiveCall.phone||"").trim().slice(0,40),line:rawLiveCall.line==="life"?"life":"home-auto",status:rawLiveCall.status==="connected"?"connected":"dialing",startedAt:String(rawLiveCall.startedAt||new Date().toISOString()),updatedAt:String(rawLiveCall.updatedAt||new Date().toISOString())}:null,\n    expoPushToken:',
    '    liveCallSession:rawLiveCall&&String(rawLiveCall.phone||"").trim()?{leadId:Number.isFinite(Number(rawLiveCall.leadId))?Number(rawLiveCall.leadId):null,name:String(rawLiveCall.name||"Active call").trim().slice(0,120),phone:String(rawLiveCall.phone||"").trim().slice(0,40),line:rawLiveCall.line==="life"?"life":"home-auto",status:rawLiveCall.status==="connected"?"connected":"dialing",startedAt:String(rawLiveCall.startedAt||new Date().toISOString()),updatedAt:String(rawLiveCall.updatedAt||new Date().toISOString())}:null,\n    dialerRuns:{life:cleanDialerRun(rawDialerRuns.life),"home-auto":cleanDialerRun(rawDialerRuns["home-auto"])},\n    expoPushToken:',
    "cleaned dialerRuns",
  );

  fs.writeFileSync(profilePath, source);
}

function patchCRMClient() {
  let source = fs.readFileSync(crmPath, "utf8");
  if (source.includes(marker)) return;

  source = mustReplace(
    source,
    '  const latestInboundRef=useRef(0);\n  const lineLeads=useMemo(()=>leads.filter(item=>item.line===activeLine),[leads,activeLine]);',
    '  const latestInboundRef=useRef(0);\n  const dialerRunsRef=useRef(workspaceProfile.dialerRuns); // PACIFICA_STABLE_DIALER_RUN_V2\n  const lineLeads=useMemo(()=>leads.filter(item=>item.line===activeLine),[leads,activeLine]);',
    "dialer run ref",
  );

  source = mustReplaceRegex(
    source,
    /  const lineLeads=useMemo\(\(\)=>leads\.filter\(item=>item\.line===activeLine\),\[leads,activeLine\]\);\n  const callableLeads=useMemo\(\(\)=>rankLeads\(lineLeads\.filter\(item=>isDialerEligibleLead\(item\)&&normalizedCsvPhone\(item\.phone\)\.length>=7\),priorityNow\),\[lineLeads,priorityNow\]\);\n  const queuedLead=callableLeads\[index%Math\.max\(callableLeads\.length,1\)\]\|\|emptyLead;\n  const postCallLead=.*?\n  const leadQueuePosition=Math\.max\(0,callableLeads\.findIndex\(item=>item\.id===lead\.id\)\);/s,
    `  const lineLeads=useMemo(()=>leads.filter(item=>item.line===activeLine),[leads,activeLine]);\n  const activeDialerRun=workspaceProfile.dialerRuns[activeLine];\n  const dynamicCallableLeads=useMemo(()=>rankLeads(lineLeads.filter(item=>isDialerEligibleLead(item)&&normalizedCsvPhone(item.phone).length>=7),priorityNow),[lineLeads,priorityNow]);\n  const callableLeads=useMemo(()=>{\n    if(!activeDialerRun?.ids.length)return dynamicCallableLeads;\n    const eligibleById=new Map(lineLeads.filter(item=>isDialerEligibleLead(item)&&normalizedCsvPhone(item.phone).length>=7).map(item=>[item.id,item] as const));\n    return activeDialerRun.ids.map(id=>eligibleById.get(id)).filter((item):item is Lead=>Boolean(item));\n  },[activeDialerRun,dynamicCallableLeads,lineLeads]);\n  const queuedLead=(activeDialerRun?callableLeads[0]:callableLeads[index%Math.max(callableLeads.length,1)])||emptyLead;\n  const postCallLead=postCallLeadId?leads.find(item=>item.id===postCallLeadId):undefined;\n  const loadedLead=loadedLeadId?leads.find(item=>item.id===loadedLeadId):undefined;\n  const lead=(currentCallLeadId?leads.find(item=>item.id===currentCallLeadId):undefined)||postCallLead||loadedLead||queuedLead;\n  const importedLeadDetails=useMemo(()=>supplementalLeadDetails(lead),[lead]);\n  const upNextLeads=callableLeads.filter(item=>item.id!==lead.id).slice(0,3);\n  const leadQueuePosition=activeDialerRun?Math.min(activeDialerRun.completed,Math.max(0,activeDialerRun.total-1)):Math.max(0,callableLeads.findIndex(item=>item.id===lead.id));\n  const leadQueueTotal=activeDialerRun?.total||callableLeads.length;\n  const leadQueueRemaining=callableLeads.length;`,
    "stable callable lead block",
  );

  source = mustReplace(
    source,
    '  useEffect(()=>{leadsRef.current=leads},[leads]);\n  useEffect(()=>{callLogsRef.current=callLogs},[callLogs]);',
    '  useEffect(()=>{leadsRef.current=leads},[leads]);\n  useEffect(()=>{dialerRunsRef.current=workspaceProfile.dialerRuns},[workspaceProfile.dialerRuns]);\n  useEffect(()=>{callLogsRef.current=callLogs},[callLogs]);',
    "dialer run ref synchronization",
  );

  source = mustReplaceRegex(
    source,
    /  function scheduleNextAuto\(completedLeadId\?:number\)\{.*?\n  \}\n  function openPostCall/s,
    `  function setDialerRunState(line:LeadLine,run:WorkspaceProfile["dialerRuns"][LeadLine]){\n    dialerRunsRef.current={...dialerRunsRef.current,[line]:run};\n    setWorkspaceProfile(profile=>({...profile,dialerRuns:{...profile.dialerRuns,[line]:run}}));\n  }\n  function eligibleDialerLeads(line:LeadLine){\n    return leadsRef.current.filter(item=>item.line===line&&isDialerEligibleLead(item)&&normalizedCsvPhone(item.phone).length>=7);\n  }\n  function createDialerRun(line:LeadLine){\n    const now=Date.now();\n    const ranked=eligibleDialerLeads(line).toSorted((left,right)=>{\n      const priorityDifference=leadPriority(right,now).score-leadPriority(left,now).score;if(priorityDifference)return priorityDifference;\n      const leftAttempt=dateValue(left.lastAttemptAt);const rightAttempt=dateValue(right.lastAttemptAt);\n      const recencyDifference=(Number.isFinite(leftAttempt)?leftAttempt:0)-(Number.isFinite(rightAttempt)?rightAttempt:0);if(recencyDifference)return recencyDifference;\n      return leadCreatedAt(right)-leadCreatedAt(left)||right.id-left.id;\n    });\n    if(!ranked.length){setDialerRunState(line,null);return ranked}\n    const stamp=new Date().toISOString();\n    setDialerRunState(line,{ids:ranked.map(item=>item.id),completed:0,total:ranked.length,startedAt:stamp,updatedAt:stamp});\n    return ranked;\n  }\n  function remainingDialerRunLeads(line:LeadLine){\n    const run=dialerRunsRef.current[line];if(!run)return [] as Lead[];\n    const eligibleById=new Map(eligibleDialerLeads(line).map(item=>[item.id,item] as const));\n    const remaining=run.ids.map(id=>eligibleById.get(id)).filter((item):item is Lead=>Boolean(item));\n    if(remaining.length!==run.ids.length){\n      const removed=run.ids.length-remaining.length;\n      const next=remaining.length?{...run,ids:remaining.map(item=>item.id),completed:Math.min(run.total,run.completed+removed),updatedAt:new Date().toISOString()}:null;\n      setDialerRunState(line,next);\n    }\n    return remaining;\n  }\n  function completeDialerRunLead(leadId:number,line:LeadLine){\n    const run=dialerRunsRef.current[line];if(!run||!run.ids.includes(leadId))return run;\n    const eligibleIds=new Set(eligibleDialerLeads(line).map(item=>item.id));\n    const remainingIds=run.ids.filter(id=>id!==leadId&&eligibleIds.has(id));\n    const removed=Math.max(1,run.ids.length-remainingIds.length);\n    const next=remainingIds.length?{...run,ids:remainingIds,completed:Math.min(run.total,run.completed+removed),updatedAt:new Date().toISOString()}:null;\n    setDialerRunState(line,next);return next;\n  }\n  function scheduleNextAuto(){\n    if(!autoDialRef.current)return;\n    if(nextCallTimerRef.current)window.clearTimeout(nextCallTimerRef.current);\n    const queue=remainingDialerRunLeads(activeLineRef.current);\n    if(!queue.length){stopAutoDial(\`${'${queueLabel(activeLineRef.current,workspaceProfile.mode)}'} run completed · Start calling creates a fresh queue\`);return}\n    const nextLead=queue[0];setIndex(0);setPhoneStatus(\`Calling ${'${nextLead.name}'} next…\`);setToast(\`Result saved · calling ${'${nextLead.name}'} next\`);\n    nextCallTimerRef.current=window.setTimeout(()=>{nextCallTimerRef.current=undefined;if(autoDialRef.current)void placeCall(nextLead.phone,false,nextLead)},450);\n  }\n  function openPostCall`,
    "stable scheduleNextAuto",
  );

  source = mustReplace(
    source,
    '    updateLead(completedLead.id,patch);\n    const sourcePatch=',
    '    updateLead(completedLead.id,patch);\n    completeDialerRunLead(completedLead.id,completedLead.line);\n    const sourcePatch=',
    "complete saved dialer run lead",
  );

  source = mustReplace(
    source,
    '    if(resume){autoDialRef.current=true;setAutoDialing(true);scheduleNextAuto(completedLead.id)}',
    '    if(resume){autoDialRef.current=true;setAutoDialing(true);scheduleNextAuto()}',
    "resume stable queue",
  );

  source = mustReplaceRegex(
    source,
    /  function start\(\)\{[^\n]*\}\n  function hangup\(\)\{/,
    `  function start(){\n    if(postCallLeadId){setToast("Save the call result before continuing");return}\n    let queue:Lead[]=[];\n    if(!loadedLead){queue=remainingDialerRunLeads(activeLine);if(!queue.length)queue=createDialerRun(activeLine)}\n    const nextLead=loadedLead||queue[0]||lead;\n    if((!loadedLead&&!queue.length)||normalizedCsvPhone(nextLead.phone).length<7){setView("leads");setToast(lineLeads.length?"No open contacts are eligible to dial":\`Import ${'${queueLabel(activeLine,workspaceProfile.mode)}'} first\`);return}\n    sessionAttemptedLeadIdsRef.current.clear();autoDialRef.current=!loadedLead;setAutoDialing(!loadedLead);void placeCall(nextLead.phone,false,nextLead);\n  }\n  function hangup(){`,
    "start calling stable queue",
  );

  source = source.replace('{!postCallLeadId&&autoDialing&&<em>{callableLeads.length} IN FLOW</em>}', '{!postCallLeadId&&autoDialing&&<em>{leadQueueRemaining} REMAINING</em>}');
  source = source.replace('callableLeads.length?`${leadQueuePosition+1} OF ${callableLeads.length}`:"OPEN"', 'callableLeads.length?`${leadQueuePosition+1} OF ${leadQueueTotal}`:"OPEN"');
  source = source.replace('<span>PRIORITY FLOW · {queueLabel(activeLine,workspaceProfile.mode).toUpperCase()}</span><b>{callableLeads.length?`${Math.max(0,callableLeads.length-(dialing?1:0))} READY`:"QUEUE CLEAR"}</b>', '<span>{activeDialerRun?"SAVED CALLING RUN":"PRIORITY FLOW"} · {queueLabel(activeLine,workspaceProfile.mode).toUpperCase()}</span><b>{callableLeads.length?`${Math.max(0,leadQueueRemaining-(dialing?1:0))} ${activeDialerRun?"REMAINING":"READY"}`:"QUEUE CLEAR"}</b>');

  fs.writeFileSync(crmPath, source);
}

patchWorkspaceProfile();
patchCRMClient();
console.log("Pacifica stable dialer run v2 applied.");

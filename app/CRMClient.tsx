"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { AudioProcessor, Call, Device } from "@twilio/voice-sdk";
import PhoneSettings from "./components/PhoneSettings";
import CallLogReport, { type CallLog } from "./components/CallLogReport";
import AiCommandCenter, { type AiAction } from "./components/AiCommandCenter";
import MessagesCenter from "./components/MessagesCenter";
import TodayWorkspace from "./components/TodayWorkspace";
import PwaInstallButton from "./components/PwaInstallButton";
import PhoneWorkspaceSetup from "./components/PhoneWorkspaceSetup";
import PhoneNumberCenter from "./components/PhoneNumberCenter";
import WorkspaceProfileSettings from "./components/WorkspaceProfileSettings";
import ClerkTopAuth from "./components/ClerkTopAuth";
import { pacificaPlans } from "./lib/plans";
import { cleanWorkspaceProfile, defaultWorkspaceProfile, type WorkspaceMode, type WorkspaceProfile } from "./lib/workspace-profile";
import { crmFieldsForDisposition, dateValue, leadCreatedAt, leadLineForProduct, leadPriority, rankLeads, sourceDispositionForOutcome, suggestedRetryAt, validReceivedDate } from "./lib/lead-priority";
import { readAudioPreferences } from "./audio-preferences";
import { PacificaClearVoiceProcessor, supportsClearVoice } from "./clearvoice";

type LeadLine = "life" | "home-auto";
type Lead = { id:number; name:string; phone:string; city:string; status:string; email:string; stage:string; outcome:string; notes:string; followUp:string; doNotCall:boolean; lastContact:string; line:LeadLine; source:string; leadCost:number; product:string; sourceDisposition:string; importedAt:string; vendorId?:string; sourceSyncStatus?:string; address?:string; state?:string; zip?:string; territory?:string; brand?:string; profileName?:string; received?:string; returnStatus?:string; employeeCount?:string; searchPro?:string; extraFields?:Record<string,string>; smsConsent?:boolean; smsOptOut?:boolean; lastSmsAt?:string; attempts?:number; lastAttemptAt?:string; lastConnectedAt?:string; priorityOverride?:"auto"|"high"|"low" };
type View = "today" | "dialer" | "leads" | "messages" | "ai" | "quotes" | "campaigns" | "activity" | "billing" | "settings";
type PostCallDraft = {crmStage:string;crmOutcome:string;sourceDisposition:string;appointmentAt:string;notes:string};

const smartFinancialDispositions=["Received - not worked yet","Attempted Contact","Contacted","Quoted with Contact","Quoted without Contact","Sold - 1 Policy","Sold - Multi Policy","Lost - Not Interested","Interested - Working","Interested - Future Prospect"];
const standardSourceDispositions=["New","Attempted Contact","Contacted","Quoted","Appointment Set","Sold","Lost - Not Interested","Follow-up"];

function sourceDispositionOptions(source:string,current:string){
  const options=/smart\s*financial/i.test(source)?smartFinancialDispositions:standardSourceDispositions;
  return current&&!options.includes(current)?[current,...options]:options;
}

const starterLeads: Lead[] = [];
const emptyLead: Lead = {id:0,name:"No contact selected",phone:"Import contacts to begin",city:"CRM queue is empty",status:"Empty",email:"",stage:"New lead",outcome:"Not contacted",notes:"",followUp:"",doNotCall:false,lastContact:"Never",line:"life",source:"Manual",leadCost:0,product:"Service inquiry",sourceDisposition:"",importedAt:""};

function queueLabel(line:LeadLine,mode:WorkspaceMode){
  if(mode==="insurance")return line==="life"?"Life leads":"Home & Auto leads";
  return line==="life"?"Priority leads":"General leads";
}
function phoneDigits(value:string){return value.replace(/\D/g,"").slice(-10)}
function followUpInDays(days:number){const date=new Date();date.setDate(date.getDate()+days);date.setHours(9,0,0,0);return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}T${String(date.getHours()).padStart(2,"0")}:${String(date.getMinutes()).padStart(2,"0")}`}

function normalizeSavedLeads(value:unknown):Lead[]{
  if(!Array.isArray(value))return [];
  return (value as Partial<Lead>[]).map((lead,index)=>({id:lead.id||Date.now()+index,name:lead.name||`Lead ${index+1}`,phone:lead.phone||"",city:lead.city||"Imported",status:lead.status||"Ready",email:lead.email||"",stage:lead.stage||"New lead",outcome:lead.outcome||"Not contacted",notes:lead.notes||"",followUp:lead.followUp||"",doNotCall:Boolean(lead.doNotCall),lastContact:lead.lastContact||"Never",line:lead.line==="home-auto"?"home-auto":"life",source:lead.source||"Existing CRM",leadCost:Number(lead.leadCost)||0,product:lead.product||"Service inquiry",sourceDisposition:lead.sourceDisposition||"",importedAt:lead.importedAt||"",vendorId:lead.vendorId||"",sourceSyncStatus:lead.sourceSyncStatus||"",address:lead.address||"",state:lead.state||"",zip:lead.zip||"",territory:lead.territory||"",brand:lead.brand||"",profileName:lead.profileName||"",received:lead.received||"",returnStatus:lead.returnStatus||"",employeeCount:lead.employeeCount||"",searchPro:lead.searchPro||"",extraFields:lead.extraFields&&typeof lead.extraFields==="object"?lead.extraFields:{},smsConsent:Boolean(lead.smsConsent),smsOptOut:Boolean(lead.smsOptOut),lastSmsAt:lead.lastSmsAt||"",attempts:Math.max(0,Number(lead.attempts)||0),lastAttemptAt:lead.lastAttemptAt||"",lastConnectedAt:lead.lastConnectedAt||"",priorityOverride:lead.priorityOverride==="high"||lead.priorityOverride==="low"?lead.priorityOverride:"auto"}));
}

function Icon({name}:{name:string}) {
  const paths:Record<string,React.ReactNode> = {
    dial:<><path d="M6.6 3.8 9 7.6 7.5 9.1c1.1 2.3 2.9 4.1 5.2 5.2l1.5-1.5 3.8 2.4c.5.3.7.9.5 1.5-.5 1.6-2 2.7-3.7 2.6C8.2 18.7 3.3 13.8 2.7 7.2c-.1-1.7 1-3.2 2.6-3.7.5-.2 1.1 0 1.3.3Z"/></>,
    users:<><path d="M16 19v-1.5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V19"/><circle cx="9" cy="6.5" r="3.5"/><path d="M16 4.2a3.5 3.5 0 0 1 0 6.6M18 13.7a4 4 0 0 1 4 3.8V19"/></>,
    list:<><path d="M8 6h12M8 12h12M8 18h12"/><circle cx="3" cy="6" r="1"/><circle cx="3" cy="12" r="1"/><circle cx="3" cy="18" r="1"/></>,
    chart:<><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></>,
    gear:<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></>,
    upload:<><path d="M12 16V3M7 8l5-5 5 5"/><path d="M4 14v6h16v-6"/></>,
    pause:<><path d="M8 5v14M16 5v14"/></>,
    play:<><path d="m8 5 11 7-11 7Z"/></>,
    mic:<><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></>,
    mute:<><path d="M11 5 6 9H3v6h3l5 4ZM16 9l5 6M21 9l-5 6"/></>,
    keypad:<><circle cx="6" cy="5" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="18" cy="5" r="1"/><circle cx="6" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="18" cy="12" r="1"/><circle cx="6" cy="19" r="1"/><circle cx="12" cy="19" r="1"/><circle cx="18" cy="19" r="1"/></>,
    end:<><path d="M5 15a11 11 0 0 1 14 0l-2 4-4-2v-3h-2v3l-4 2Z"/></>,
    wifi:<><path d="M2 8a15 15 0 0 1 20 0M5 12a10.5 10.5 0 0 1 14 0M8.5 15.5a5.3 5.3 0 0 1 7 0"/><circle cx="12" cy="19" r="1"/></>,
    bell:<><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
    shield:<><path d="M12 3 4.5 6v5.2c0 4.7 3.1 8 7.5 9.8 4.4-1.8 7.5-5.1 7.5-9.8V6Z"/><path d="m8.5 12 2.2 2.2 4.8-5"/></>,
    spark:<><path d="m12 3 1.4 4.2L18 9l-4.6 1.8L12 15l-1.4-4.2L6 9l4.6-1.8Z"/><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8Z"/></>,
    chat:<><path d="M4 5h16v11H9l-5 4Z"/><path d="M8 9h8M8 12h5"/></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export default function Page({clerkEnabled=false,isOwner=false,isPlatformOwner=false,workspaceId="local"}:{clerkEnabled?:boolean;isOwner?:boolean;isPlatformOwner?:boolean;workspaceId?:string}){
  const [view,setView]=useState<View>("today");
  const [leads,setLeads]=useState<Lead[]>(starterLeads);
  const [dialing,setDialing]=useState(false);
  const [connected,setConnected]=useState(false);
  const [index,setIndex]=useState(0);
  const [seconds,setSeconds]=useState(0);
  const [toast,setToast]=useState("");
  const [provider]=useState("Browser / Wi-Fi");
  const [dialNumber,setDialNumber]=useState("");
  const [manualCall,setManualCall]=useState(false);
  const [selectedLead,setSelectedLead]=useState<number|null>(null);
  const [search,setSearch]=useState("");
  const [stageFilter,setStageFilter]=useState("All stages");
  const [sourceFilter,setSourceFilter]=useState("All sources");
  const [leadSort,setLeadSort]=useState("Next best");
  const [phoneReady,setPhoneReady]=useState(false);
  const [phoneStatus,setPhoneStatus]=useState("Checking Twilio setup…");
  const [muted,setMuted]=useState(false);
  const [held,setHeld]=useState(false);
  const [dtmfDisplay,setDtmfDisplay]=useState("");
  const [callerId,setCallerId]=useState("Twilio number");
  const [showPhoneSettings,setShowPhoneSettings]=useState(false);
  const [callLogs,setCallLogs]=useState<CallLog[]>([]);
  const [activeLine,setActiveLine]=useState<LeadLine>("life");
  const [autoDialing,setAutoDialing]=useState(false);
  const [checkoutPlan,setCheckoutPlan]=useState("");
  const [leadFeedStatus,setLeadFeedStatus]=useState("Checking the secure inbound queue…");
  const [importReport,setImportReport]=useState("Upload CSV files from any lead provider. Pacifica detects common contact, product, status, cost, and source columns.");
  const [workspaceHydrated,setWorkspaceHydrated]=useState(false);
  const [postCallLeadId,setPostCallLeadId]=useState<number|null>(null);
  const [postCallDraft,setPostCallDraft]=useState<PostCallDraft>({crmStage:"Follow-up",crmOutcome:"Interested",sourceDisposition:"Contacted",appointmentAt:"",notes:""});
  const [sourceSyncing,setSourceSyncing]=useState(false);
  const [showNewLead,setShowNewLead]=useState(false);
  const [newLead,setNewLead]=useState({name:"",phone:"",email:"",city:"",product:"",source:"Manual",leadCost:""});
  const [phoneAvailable,setPhoneAvailable]=useState(false);
  const [incomingCall,setIncomingCall]=useState<Call|null>(null);
  const [incomingNumber,setIncomingNumber]=useState("");
  const [resumeAfterWrap,setResumeAfterWrap]=useState(false);
  const [workspaceProfile,setWorkspaceProfile]=useState<WorkspaceProfile>(defaultWorkspaceProfile);
  const inputRef=useRef<HTMLInputElement>(null);
  const deviceRef=useRef<Device|null>(null);
  const clearVoiceProcessorRef=useRef<(AudioProcessor & {mode?:string})|null>(null);
  const callRef=useRef<Call|null>(null);
  const voiceRouteTokenRef=useRef("");
  const watchdogRef=useRef<number|undefined>(undefined);
  const elapsedRef=useRef(0);
  const currentLogRef=useRef<(CallLog & { connectedAt?:number; finalized?:boolean })|null>(null);
  const leadsRef=useRef<Lead[]>(starterLeads);
  const activeLineRef=useRef<LeadLine>("life");
  const autoDialRef=useRef(false);
  const advancingRef=useRef(false);
  const nextCallTimerRef=useRef<number|undefined>(undefined);
  const workspaceSaveTimerRef=useRef<number|undefined>(undefined);
  const resumeAfterWrapRef=useRef(false);
  const lineLeads=leads.filter(l=>l.line===activeLine);
  const callableLeads=rankLeads(lineLeads.filter(l=>l.stage!=="Closed"&&!l.doNotCall));
  const lead=callableLeads[index%Math.max(callableLeads.length,1)] || emptyLead;

  useEffect(()=>{ if(!connected)return; const t=setInterval(()=>setSeconds(s=>{elapsedRef.current=s+1;return s+1}),1000); return()=>clearInterval(t)},[connected]);
  useEffect(()=>{ if(!toast)return; const t=setTimeout(()=>setToast(""),2600); return()=>clearTimeout(t)},[toast]);
  useEffect(()=>{let canceled=false;async function hydrate(){let localLeads:Lead[]=[];let localLogs:CallLog[]=[];let localProfile=defaultWorkspaceProfile;const leadKey=`pacifica:${workspaceId}:leads`;const logKey=`pacifica:${workspaceId}:call-logs`;const profileKey=`pacifica:${workspaceId}:profile`;if(!clerkEnabled){try{localLeads=normalizeSavedLeads(JSON.parse(localStorage.getItem(leadKey)||"[]"));const parsedLogs=JSON.parse(localStorage.getItem(logKey)||"[]");localLogs=Array.isArray(parsedLogs)?parsedLogs:[];localProfile=cleanWorkspaceProfile(JSON.parse(localStorage.getItem(profileKey)||"{}"))}catch{}}else{try{const response=await fetch("/api/crm/workspace",{cache:"no-store"});const data=await response.json() as {found?:boolean;leads?:unknown[];callLogs?:CallLog[];profile?:WorkspaceProfile};if(response.ok){localLeads=normalizeSavedLeads(data.leads);localLogs=Array.isArray(data.callLogs)?data.callLogs:[];localProfile=cleanWorkspaceProfile(data.profile)}}catch{}}if(canceled)return;setLeads(localLeads);setCallLogs(localLogs);setWorkspaceProfile(localProfile);setWorkspaceHydrated(true)}void hydrate();return()=>{canceled=true}},[clerkEnabled,workspaceId]);
  useEffect(()=>{if(!workspaceHydrated)return;const leadKey=`pacifica:${workspaceId}:leads`;const logKey=`pacifica:${workspaceId}:call-logs`;const profileKey=`pacifica:${workspaceId}:profile`;try{localStorage.setItem(leadKey,JSON.stringify(leads));localStorage.setItem(logKey,JSON.stringify(callLogs.slice(0,500)));localStorage.setItem(profileKey,JSON.stringify(workspaceProfile))}catch{}if(!clerkEnabled)return;if(workspaceSaveTimerRef.current)window.clearTimeout(workspaceSaveTimerRef.current);workspaceSaveTimerRef.current=window.setTimeout(()=>{void fetch("/api/crm/workspace",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({leads,callLogs:callLogs.slice(0,500),profile:workspaceProfile})}).catch(()=>{})},600);return()=>{if(workspaceSaveTimerRef.current)window.clearTimeout(workspaceSaveTimerRef.current)}},[leads,callLogs,workspaceProfile,workspaceHydrated,clerkEnabled,workspaceId]);
  useEffect(()=>{leadsRef.current=leads},[leads]);
  async function refreshPhoneStatus(){
    try{const response=await fetch("/api/twilio/status",{cache:"no-store"});const data=await response.json();setPhoneReady(Boolean(data.configured));if(data.phoneNumber)setCallerId(String(data.phoneNumber));setPhoneStatus(data.configured?`${data.phoneNumber} ready over Wi-Fi`:data.phoneNumber==="No number assigned"?"Assign this workspace a number in Phone Number Center":"Secure API key still needed")}
    catch{setPhoneStatus("Unable to check Twilio setup")}
  }
  useEffect(()=>{const timer=window.setTimeout(()=>void refreshPhoneStatus(),0);return()=>{window.clearTimeout(timer);if(nextCallTimerRef.current)window.clearTimeout(nextCallTimerRef.current);deviceRef.current?.destroy();clearVoiceProcessorRef.current=null}},[]);

  async function fetchToken(){const response=await fetch("/api/twilio/token",{cache:"no-store"});const data=await response.json();if(!response.ok)throw new Error(data.error||"Twilio is not configured");voiceRouteTokenRef.current=String(data.routeToken||"");return String(data.token)}
  async function configureClearVoice(device:Device){
    const preferences=readAudioPreferences();
    const audio=device.audio;
    if(!audio)return false;
    const current=clearVoiceProcessorRef.current;
    const needsReplacement=Boolean(current&&current.mode!==preferences.clearVoiceMode);
    if(current&&(!preferences.clearVoiceEnabled||needsReplacement)){
      await audio.removeProcessor(current,false).catch(()=>undefined);
      clearVoiceProcessorRef.current=null;
    }
    const baseConstraints:MediaTrackConstraints={echoCancellation:true,autoGainControl:true,noiseSuppression:!preferences.clearVoiceEnabled};
    await audio.setAudioConstraints(baseConstraints).catch(()=>undefined);
    if(!preferences.clearVoiceEnabled)return false;
    if(!supportsClearVoice()){
      await audio.setAudioConstraints({echoCancellation:true,autoGainControl:true,noiseSuppression:true}).catch(()=>undefined);
      return false;
    }
    if(!clearVoiceProcessorRef.current){
      const processor=new PacificaClearVoiceProcessor(preferences.clearVoiceMode);
      try{await audio.addProcessor(processor,false);clearVoiceProcessorRef.current=processor}
      catch{await audio.setAudioConstraints({echoCancellation:true,autoGainControl:true,noiseSuppression:true}).catch(()=>undefined);return false}
    }
    return true;
  }
  async function ensureDevice(){
    const token=await fetchToken();
    let device=deviceRef.current;
    if(!device){
      const sdk=await import("@twilio/voice-sdk");
      device=new sdk.Device(token,{logLevel:1,closeProtection:true});deviceRef.current=device;
      device.on("tokenWillExpire",async()=>{try{device?.updateToken(await fetchToken())}catch(error){setPhoneStatus(error instanceof Error?error.message:"Token refresh failed")}});
      device.on("error",error=>{const code="code" in error?` ${String(error.code)}`:"";setPhoneStatus(`Twilio${code}: ${error.message}`);setToast(`Twilio${code}: ${error.message}`)});
      device.on("registered",()=>{setPhoneAvailable(true);setPhoneStatus("Available for inbound and outbound calls")});
      device.on("unregistered",()=>{setPhoneAvailable(false);setPhoneStatus("Inbound calls paused · outbound still ready")});
      device.on("incoming",call=>{const from=call.customParameters.get("From")||call.parameters.From||"Unknown caller";setIncomingNumber(from);setIncomingCall(call);setPhoneStatus(`Incoming call from ${from}`);call.on("cancel",()=>{setIncomingCall(null);setIncomingNumber("");setPhoneStatus("Caller hung up before answer")});call.on("error",(error:Error)=>{setIncomingCall(null);setIncomingNumber("");setPhoneStatus(error.message||"Incoming call failed")})});
      device.audio?.on("deviceChange",()=>setPhoneStatus("Audio device changed — run the phone test"));
    }else device.updateToken(token);
    await configureClearVoice(device);
    return device;
  }
  function finalizeLog(outcome:string,status:string,errorCode?:string){
    const current=currentLogRef.current;if(!current||current.finalized)return;current.finalized=true;
    const duration=current.connectedAt?elapsedRef.current:0;
    const complete:CallLog={...current,duration,outcome,status,errorCode,callSid:callRef.current?.parameters?.CallSid||current.callSid};
    delete (complete as CallLog & {connectedAt?:number;finalized?:boolean}).connectedAt;delete (complete as CallLog & {connectedAt?:number;finalized?:boolean}).finalized;
    setCallLogs(list=>[complete,...list].slice(0,500));currentLogRef.current=null;
  }
  function stopAutoDial(message="Auto dial paused"){
    autoDialRef.current=false;setAutoDialing(false);
    if(nextCallTimerRef.current)window.clearTimeout(nextCallTimerRef.current);
    nextCallTimerRef.current=undefined;setToast(message);
  }
  function scheduleNextAuto(completedLeadId?:number){
    if(!autoDialRef.current)return;
    const queue=rankLeads(leadsRef.current.filter(l=>l.id!==completedLeadId&&l.line===activeLineRef.current&&l.stage!=="Closed"&&!l.doNotCall));
    if(!queue.length){stopAutoDial(`${queueLabel(activeLineRef.current,workspaceProfile.mode)} queue completed`);return}
    const nextLead=queue[0];setIndex(0);setPhoneStatus(`Next best call: ${nextLead.name}`);
    nextCallTimerRef.current=window.setTimeout(()=>{if(autoDialRef.current)void placeCall(nextLead.phone,false,nextLead)},1400);
  }
  function openPostCall(leadId:number,resumeQueue:boolean){
    const completedLead=leadsRef.current.find(item=>item.id===leadId);if(!completedLead)return;
    resumeAfterWrapRef.current=resumeQueue;setResumeAfterWrap(resumeQueue);autoDialRef.current=false;setAutoDialing(false);
    setPostCallDraft({crmStage:completedLead.stage==="New lead"?"Follow-up":completedLead.stage,crmOutcome:completedLead.outcome==="Not contacted"?"Interested":completedLead.outcome,sourceDisposition:completedLead.sourceDisposition||"Contacted",appointmentAt:completedLead.followUp||"",notes:completedLead.notes||""});
    setPostCallLeadId(leadId);setPhoneStatus(`Wrap up ${completedLead.name}, then continue`);
    updateLead(leadId,{lastContact:new Date().toLocaleString(),lastConnectedAt:new Date().toISOString()});
  }
  async function syncLeadDisposition(completedLead:Lead,patch:{sourceDisposition:string;stage:string;outcome:string;followUp:string;notes:string}){
    try{
      const response=await fetch("/api/integrations/dispositions",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({source:completedLead.source,vendorId:completedLead.vendorId,leadName:completedLead.name,phone:completedLead.phone,disposition:patch.sourceDisposition,crmStage:patch.stage,crmOutcome:patch.outcome,appointmentAt:patch.followUp,notes:patch.notes})});
      const data=await response.json() as {synced?:boolean;message?:string;error?:string};
      if(!response.ok)throw new Error(data.error||"Lead-source update failed");
      const message=data.message||(data.synced?`${completedLead.source} updated`:"Saved in Pacifica · source sync not connected");
      updateLead(completedLead.id,{sourceSyncStatus:message});return message;
    }catch(error){const message=`Saved in Pacifica · ${error instanceof Error?error.message:"source update failed"}`;updateLead(completedLead.id,{sourceSyncStatus:message});return message}
  }
  async function savePostCall(){
    if(!postCallLeadId||sourceSyncing)return;
    const completedLead=leadsRef.current.find(item=>item.id===postCallLeadId);if(!completedLead)return;
    setSourceSyncing(true);
    const patch:Partial<Lead>={stage:postCallDraft.crmStage,outcome:postCallDraft.crmOutcome,sourceDisposition:postCallDraft.sourceDisposition,followUp:postCallDraft.appointmentAt,notes:postCallDraft.notes,status:postCallDraft.crmStage==="Closed"?"Closed":"Ready",lastContact:new Date().toLocaleString()};
    updateLead(completedLead.id,patch);
    const syncMessage=await syncLeadDisposition(completedLead,{sourceDisposition:postCallDraft.sourceDisposition,stage:postCallDraft.crmStage,outcome:postCallDraft.crmOutcome,followUp:postCallDraft.appointmentAt,notes:postCallDraft.notes});
    const resume=resumeAfterWrapRef.current;resumeAfterWrapRef.current=false;setResumeAfterWrap(false);setPostCallLeadId(null);setSourceSyncing(false);setToast(syncMessage);
    if(resume){autoDialRef.current=true;setAutoDialing(true);scheduleNextAuto(completedLead.id)}
  }
  function finishCall(wasManual:boolean,leadId?:number,message="Call ended — save an outcome, then resume",outcome="Completed",errorCode?:string){
    if(advancingRef.current)return;advancingRef.current=true;
    const wasConnected=Boolean(currentLogRef.current?.connectedAt);const shouldResume=autoDialRef.current;
    if(watchdogRef.current)window.clearTimeout(watchdogRef.current);watchdogRef.current=undefined;finalizeLog(outcome,message,errorCode);
    callRef.current=null;setDialing(false);setConnected(false);setSeconds(0);elapsedRef.current=0;setMuted(false);setHeld(false);setDtmfDisplay("");setManualCall(false);
    if(!wasManual&&leadId&&wasConnected){openPostCall(leadId,shouldResume);setToast("Connected call complete · choose a result before the next call");return}
    if(!wasManual&&leadId&&!wasConnected&&["Timed out","Rejected","Canceled"].includes(outcome)){
      const attemptedLead=leadsRef.current.find(item=>item.id===leadId);
      if(attemptedLead){const retry=attemptedLead.followUp||suggestedRetryAt();const sourceDisposition="Attempted Contact";updateLead(leadId,{stage:"Follow-up",outcome:"No answer",sourceDisposition,followUp:retry,lastContact:new Date().toLocaleString()});void syncLeadDisposition(attemptedLead,{sourceDisposition,stage:"Follow-up",outcome:"No answer",followUp:retry,notes:attemptedLead.notes})}
    }
    if(!wasManual&&leadId&&!autoDialRef.current)setSelectedLead(leadId);
    setToast(autoDialRef.current&&!wasManual?`${message} · advancing to next contact`:message);
    if(!wasManual)scheduleNextAuto(leadId);
  }
  async function placeCall(number:string,wasManual:boolean,queuedLead:Lead=lead){
    if(dialing)return;
    advancingRef.current=false;
    setManualCall(wasManual);setDialing(true);setConnected(false);setSeconds(0);elapsedRef.current=0;setPhoneStatus("Connecting securely…");
    const currentLeadId=wasManual?undefined:queuedLead.id;
    currentLogRef.current={id:crypto.randomUUID(),name:wasManual?"Manual call":queuedLead.name,phone:number,startedAt:new Date().toISOString(),duration:0,outcome:"Dialing",status:"Connecting",campaign:queueLabel(queuedLead.line,workspaceProfile.mode),source:wasManual?"Manual keypad":"CRM auto dial"};
    try{
      const audioPreferences=readAudioPreferences();
      const audioConstraints:MediaTrackConstraints={echoCancellation:true,autoGainControl:true,noiseSuppression:!audioPreferences.clearVoiceEnabled,...(audioPreferences.input==="default"?{}:{deviceId:{exact:audioPreferences.input}})};
      const stream=await navigator.mediaDevices.getUserMedia({audio:audioConstraints});stream.getTracks().forEach(track=>track.stop());
      const device=await ensureDevice();
      await device.audio?.setInputDevice(audioPreferences.input);
      const clearVoiceActive=await configureClearVoice(device);
      if(audioPreferences.speaker!=="default")await device.audio?.speakerDevices?.set(audioPreferences.speaker);
      if(audioPreferences.ring!=="default")await device.audio?.ringtoneDevices?.set(audioPreferences.ring);
      const connectPromise=device.connect({params:{To:number,RouteToken:voiceRouteTokenRef.current}});
      const call=await Promise.race([connectPromise,new Promise<never>((_,reject)=>window.setTimeout(()=>reject(new Error("Twilio signaling timed out after 15 seconds")),15000))]);callRef.current=call;
      if(currentLeadId){const attemptAt=new Date();setLeads(list=>list.map(item=>item.id===currentLeadId?{...item,attempts:(item.attempts||0)+1,lastAttemptAt:attemptAt.toISOString(),lastContact:`Attempted ${attemptAt.toLocaleString()}`}:item))}
      watchdogRef.current=window.setTimeout(()=>{call.disconnect();finishCall(wasManual,currentLeadId,"No answer after four-ring window","Timed out")},30000);
      call.on("accept",()=>{if(watchdogRef.current)window.clearTimeout(watchdogRef.current);watchdogRef.current=undefined;if(currentLogRef.current)currentLogRef.current.connectedAt=Date.now();if(currentLeadId)updateLead(currentLeadId,{lastConnectedAt:new Date().toISOString()});setConnected(true);setSeconds(0);setPhoneStatus(clearVoiceActive?"Live call · ClearVoice active":"Live call over Wi-Fi")});
      call.on("disconnect",()=>finishCall(wasManual,currentLeadId,autoDialRef.current?"Call ended":"Call ended — save an outcome, then resume","Completed"));
      call.on("cancel",()=>finishCall(wasManual,currentLeadId,"Call canceled","Canceled"));
      call.on("reject",()=>finishCall(wasManual,currentLeadId,"Call was rejected","Rejected"));
      call.on("error",error=>{const code="code" in error?String(error.code):undefined;finishCall(wasManual,currentLeadId,error.message||"Call failed","Failed",code)});
    }catch(error){
      deviceRef.current?.disconnectAll();
      const detail=error instanceof Error?error.message:"Unable to place call";
      const permission=error instanceof DOMException&&["NotAllowedError","PermissionDeniedError"].includes(error.name);
      finishCall(wasManual,currentLeadId,permission?"Microphone permission was blocked. Allow it in the browser address bar, then retry.":detail,"Failed");
      setPhoneStatus(permission?"Microphone permission blocked":detail);
    }
  }
  function start(){ if(postCallLeadId){setToast("Save the connected call result before continuing");return} if(!callableLeads.length){setView("leads");setToast(lineLeads.length?"No open contacts are eligible to dial":`Import ${queueLabel(activeLine,workspaceProfile.mode)} first`);return} autoDialRef.current=true;setAutoDialing(true);void placeCall(lead.phone,false,lead) }
  function hangup(){ callRef.current?.disconnect();if(!callRef.current)finishCall(manualCall,manualCall?undefined:lead.id) }
  function toggleMute(){const call=callRef.current;if(!call)return;const next=!muted;call.mute(next);setMuted(next)}
  function toggleHold(){const call=callRef.current;if(!call||!connected)return;const next=!held;call.mute(next?true:muted);setHeld(next);setPhoneStatus(next?"Call held · your microphone is private":"Live call resumed")}
  function pauseQueue(){resumeAfterWrapRef.current=false;setResumeAfterWrap(false);stopAutoDial("Auto dialing paused — finish the current call or wrap-up safely")}
  function callTypedNumber(){ if(dialNumber.replace(/\D/g,"").length<7){setToast("Enter a complete phone number");return} stopAutoDial("Manual call mode");void placeCall(dialNumber,true) }
  async function togglePhoneAvailability(){
    try{const device=await ensureDevice();if(phoneAvailable){await device.unregister();return}await device.register()}
    catch(error){const message=error instanceof Error?error.message:"Unable to start inbound calling";setPhoneStatus(message);setToast(message)}
  }
  function rejectIncoming(){incomingCall?.reject();setIncomingCall(null);setIncomingNumber("");setPhoneStatus("Incoming call declined")}
  function acceptIncoming(){
    const call=incomingCall;if(!call)return;stopAutoDial("Inbound call answered");advancingRef.current=false;callRef.current=call;setManualCall(true);setDialing(true);setIncomingCall(null);
    const matched=leadsRef.current.find(item=>phoneDigits(item.phone)===phoneDigits(incomingNumber));
    currentLogRef.current={id:crypto.randomUUID(),name:matched?.name||"Inbound caller",phone:incomingNumber,startedAt:new Date().toISOString(),duration:0,outcome:"Incoming",status:"Ringing",campaign:"Inbound",source:"Pacifica softphone"};
    call.on("accept",()=>{if(currentLogRef.current)currentLogRef.current.connectedAt=Date.now();setConnected(true);setSeconds(0);setPhoneStatus(`Live inbound call${matched?` · ${matched.name}`:""}`);if(matched){activeLineRef.current=matched.line;setActiveLine(matched.line);const queue=rankLeads(leadsRef.current.filter(item=>item.line===matched.line&&item.stage!=="Closed"&&!item.doNotCall));setIndex(Math.max(0,queue.findIndex(item=>item.id===matched.id)));setView("dialer");updateLead(matched.id,{lastContact:new Date().toLocaleString(),lastConnectedAt:new Date().toISOString()})}});
    call.on("disconnect",()=>{finishCall(true,matched?.id,"Inbound call ended","Completed");if(matched)setSelectedLead(matched.id)});
    call.on("reject",()=>finishCall(true,matched?.id,"Inbound call declined","Rejected"));
    call.on("error",error=>finishCall(true,matched?.id,error.message||"Inbound call failed","Failed","code" in error?String(error.code):undefined));
    call.accept();
  }
  function callLeadById(id:number){const item=leadsRef.current.find(candidate=>candidate.id===id);if(!item||item.doNotCall||item.stage==="Closed")return;autoDialRef.current=false;setAutoDialing(false);activeLineRef.current=item.line;setActiveLine(item.line);const queue=rankLeads(leadsRef.current.filter(candidate=>candidate.line===item.line&&candidate.stage!=="Closed"&&!candidate.doNotCall));setIndex(Math.max(0,queue.findIndex(candidate=>candidate.id===id)));setView("dialer");void placeCall(item.phone,false,item)}
  function pressKey(key:string){if(callRef.current&&connected){callRef.current.sendDigits(key);setDtmfDisplay(value=>(value+key).slice(-12));setPhoneStatus(`Touch tone ${key} sent`);return}setDialNumber(value=>value+key)}
  function parseRow(row:string,delimiter:string){
    const values:string[]=[];let value="";let quoted=false;
    for(let i=0;i<row.length;i++){const char=row[i];if(char==='"'&&quoted&&row[i+1]==='"'){value+='"';i++;continue}if(char==='"'){quoted=!quoted;continue}if(char===delimiter&&!quoted){values.push(value.trim());value="";continue}value+=char}
    values.push(value.trim());return values;
  }
  async function syncLeadFeed(notify=true){
    try{
      const response=await fetch("/api/integrations/leads",{cache:"no-store"});
      const data=await response.json() as {error?:string;leads?:Array<{id:string;vendorId?:string;source?:string;name:string;phone:string;email:string;city:string;product:string;line:LeadLine;disposition:string;notes:string;cost:number;createdAt:string;address?:string;state?:string;zip?:string;territory?:string;brand?:string;profileName?:string;received?:string;returnStatus?:string;employeeCount?:string;searchPro?:string;extraFields?:Record<string,string>}>};
      if(!response.ok)throw new Error(data.error||"Connection failed");
      let added=0;
      setLeads(old=>{
        const phones=new Set(old.map(item=>item.phone.replace(/\D/g,"")));
        const inbound=(data.leads||[]).filter(item=>{const digits=item.phone.replace(/\D/g,"");if(!digits||phones.has(digits))return false;phones.add(digits);return true}).map<Lead>((item,index)=>{
          const mapped=crmFieldsForDisposition(item.disposition);added++;
          return {id:Date.now()+index,vendorId:item.vendorId||item.id,name:item.name,phone:item.phone,email:item.email||"",city:item.city||"Imported",status:mapped.stage==="Closed"?"Closed":"Ready",stage:mapped.stage,outcome:mapped.outcome,notes:item.notes||"",followUp:"",doNotCall:false,lastContact:"Never",line:item.line==="home-auto"?"home-auto":"life",source:item.source||"Lead provider",leadCost:Number(item.cost)||0,product:item.product||"Service inquiry",sourceDisposition:item.disposition||"",importedAt:item.createdAt||new Date().toISOString(),address:item.address||"",state:item.state||"",zip:item.zip||"",territory:item.territory||"",brand:item.brand||"",profileName:item.profileName||"",received:item.received||"",returnStatus:item.returnStatus||"",employeeCount:item.employeeCount||"",searchPro:item.searchPro||"",extraFields:item.extraFields||{}};
        });
        return inbound.length?[...inbound,...old]:old;
      });
      setLeadFeedStatus(`Connected · checking every 20 seconds${added?` · ${added} new lead${added===1?"":"s"}`:""}`);
      if(notify)setToast(added?`${added} new provider lead${added===1?"":"s"} added`:"Lead feed connected — no new leads");
    }
    catch(error){setLeadFeedStatus(error instanceof Error?error.message:"Connection failed");if(notify)setToast("Lead feed connection failed")}
  }
  // Provider secrets stay server-side. The authenticated owner checks the inbound queue.
  useEffect(()=>{if(!workspaceHydrated||!isOwner)return;const initial=window.setTimeout(()=>void syncLeadFeed(false),0);const timer=window.setInterval(()=>void syncLeadFeed(false),20000);return()=>{window.clearTimeout(initial);window.clearInterval(timer)}},[workspaceHydrated,isOwner]);
  function saveLeadFeedConnection(){void syncLeadFeed(true)}
  function csvRecords(text:string){
    const records:string[]=[];let record="";let quoted=false;
    for(let index=0;index<text.length;index++){const char=text[index];if(char==='"'){record+=char;if(quoted&&text[index+1]==='"'){record+=text[++index];continue}quoted=!quoted;continue}if((char==='\n'||char==='\r')&&!quoted){if(char==='\r'&&text[index+1]==='\n')index++;if(record.trim())records.push(record);record="";continue}record+=char}
    if(record.trim())records.push(record);return records;
  }
  function importFile(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "").replace(/^\uFEFF/, "");
      const rows = csvRecords(text);
      if (!rows.length) {
        setToast("That file is empty");
        setImportReport("The selected file was empty.");
        return;
      }

      const first = rows[0];
      const delimiter = first.includes("\t") ? "\t" : first.includes(";") && !first.includes(",") ? ";" : first.includes("|") && !first.includes(",") ? "|" : ",";
      const header = parseRow(first, delimiter).map((value) => value.toLowerCase().replace(/[^a-z0-9]/g, ""));
      const hasHeader = header.some((value) => ["phone", "phonenumber", "prospect", "name", "fullname", "email", "type", "product", "disposition", "cost"].includes(value));
      const find = (...names: string[]) => header.findIndex((value) => names.includes(value));
      const get = (cells: string[], position: number) => (position >= 0 ? cells[position]?.trim() || "" : "");

      const firstNameIndex = find("firstname", "first");
      const lastNameIndex = find("lastname", "last", "surname");
      const nameIndex = find("prospect", "name", "fullname", "customername", "leadname", "contactname");
      const phoneIndex = find("phone", "phonenumber", "primaryphone", "telephone", "mobile", "cellphone");
      const emailIndex = find("email", "emailaddress");
      const typeIndex = find("type", "product", "leadtype", "category", "vertical", "insurancetype");
      const dispositionIndex = find("disposition", "status", "leadstatus", "outcome");
      const costIndex = find("cost", "leadcost", "price", "leadprice");
      const cityIndex = find("city", "location");
      const notesIndex = find("notes", "note", "comments");
      const sourceIndex = find("source", "leadsource", "provider", "vendor", "publisher");
      const addressIndex = find("address", "streetaddress", "address1");
      const stateIndex = find("state", "province");
      const zipIndex = find("zipcode", "zip", "postalcode");
      const territoryIndex = find("territory", "market");
      const brandIndex = find("brand", "agency", "company");
      const profileIndex = find("profilename", "profile", "campaign");
      const receivedIndex = find("received", "receivedat", "date", "createdat");
      const returnIndex = find("return", "returnstatus");
      const employeesIndex = find("numberofemployees", "employees", "employeecount");
      const searchProIndex = find("searchpro");
      const vendorIdIndex = find("vendorid", "leadid", "deliveryid", "externalid", "referenceid");
      const priorityIndex=find("priority","leadpriority","tier","temperature");
      const fileSource = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim() || "CSV import";

      const existingPhones = new Set(leadsRef.current.map((item) => item.phone.replace(/\D/g, "")).filter(Boolean));
      let duplicates = 0;
      let invalid = 0;
      let detectedLife = 0;
      let detectedHomeAuto = 0;
      const parsed: Lead[] = [];

      rows.slice(hasHeader ? 1 : 0).forEach((row, rowIndex) => {
        const cells = parseRow(row, delimiter);
        const phone = (hasHeader ? get(cells, phoneIndex) : cells[1] || cells[0] || "").trim();
        const digits = phone.replace(/\D/g, "");
        if (digits.length < 7) {
          invalid++;
          return;
        }
        const product = hasHeader ? get(cells, typeIndex) : "Service inquiry";
        const importedPriority=get(cells,priorityIndex).toLowerCase();
        const line: LeadLine = workspaceProfile.mode==="insurance"?leadLineForProduct(product,activeLine):/^(a|high|hot|priority)/.test(importedPriority)?"life":activeLine;
        if (line === "life") detectedLife++;
        else detectedHomeAuto++;
        if (existingPhones.has(digits)) {
          duplicates++;
          return;
        }
        existingPhones.add(digits);
        const disposition = hasHeader ? get(cells, dispositionIndex) : "";
        const mapped = crmFieldsForDisposition(disposition);
        const combinedName = hasHeader ? [get(cells, firstNameIndex), get(cells, lastNameIndex)].filter(Boolean).join(" ") : "";
        const received=get(cells,receivedIndex);

        parsed.push({
          id: Date.now() + rowIndex,
          vendorId: get(cells, vendorIdIndex),
          name: (hasHeader ? get(cells, nameIndex) : cells[0]) || combinedName || "Lead " + (rowIndex + 1),
          phone,
          city: (hasHeader ? get(cells, cityIndex) : cells[2]) || "Imported",
          email: (hasHeader ? get(cells, emailIndex) : cells[3]) || "",
          status: mapped.stage === "Closed" ? "Closed" : "Ready",
          stage: mapped.stage,
          outcome: mapped.outcome,
          notes: (hasHeader ? get(cells, notesIndex) : "") || "",
          followUp: "",
          doNotCall: false,
          lastContact: "Never",
          line,
          source: (hasHeader ? get(cells, sourceIndex) : "") || fileSource,
          leadCost: Number((hasHeader ? get(cells, costIndex) : "0").replace(/[^0-9.-]/g, "")) || 0,
          product: product || "Service inquiry",
          sourceDisposition: disposition,
          importedAt: received?validReceivedDate(received):new Date().toISOString(),
          address: get(cells, addressIndex),
          state: get(cells, stateIndex),
          zip: get(cells, zipIndex),
          territory: get(cells, territoryIndex),
          brand: get(cells, brandIndex),
          profileName: get(cells, profileIndex),
          received,
          returnStatus: get(cells, returnIndex),
          employeeCount: get(cells, employeesIndex),
          searchPro: get(cells, searchProIndex),
          priorityOverride:/^(a|high|hot|priority)/.test(importedPriority)?"high":"auto",
        });
      });

      const dominantLine: LeadLine = detectedHomeAuto > detectedLife ? "home-auto" : "life";
      if (detectedLife + detectedHomeAuto && ((activeLine === "life" && detectedLife === 0) || (activeLine === "home-auto" && detectedHomeAuto === 0))) {
        activeLineRef.current = dominantLine;
        setActiveLine(dominantLine);
        setIndex(0);
      }
      setView("leads");

      if (parsed.length) {
        setLeads((old) => [...parsed, ...old]);
        setIndex(0);
        const lifeCount = parsed.filter((item) => item.line === "life").length;
        const homeAutoCount = parsed.length - lifeCount;
        const summary = parsed.length.toLocaleString() + " imported · " + lifeCount + " Priority · " + homeAutoCount + " General" + (duplicates ? " · " + duplicates + " duplicates skipped" : "") + (invalid ? " · " + invalid + " invalid rows" : "");
        setImportReport(summary);
        setToast(summary);
      } else {
        const summary = duplicates ? duplicates + " contacts were already in the CRM. Showing the matching lead tab." : "No valid phone numbers found" + (invalid ? " · " + invalid + " rows rejected" : "");
        setImportReport(summary);
        setToast(summary);
      }
    };
    reader.readAsText(file);
  }
  const fmt=`${String(Math.floor(seconds/60)).padStart(2,"0")}:${String(seconds%60).padStart(2,"0")}`;
  const nav:[View,string,string][]=[["today","Today","spark"],["dialer","Dialer","dial"],["leads","CRM contacts","users"],["messages","Messages","chat"],["ai","Pacifica AI","spark"],["campaigns","Pipeline","list"],["activity","Reports","chart"],["quotes","Industry tools","shield"],["billing","Plans & billing","list"]];
  const activeLead=leads.find(l=>l.id===selectedLead);
  const incomingLead=leads.find(item=>phoneDigits(item.phone)===phoneDigits(incomingNumber));
  const sourceOptions=["All sources",...Array.from(new Set(lineLeads.map(item=>item.source)))];
  const matchingLeads=lineLeads.filter(l=>(stageFilter==="All stages"||l.stage===stageFilter)&&(sourceFilter==="All sources"||l.source===sourceFilter)&&`${l.name} ${l.phone} ${l.email} ${l.city} ${l.source} ${l.product}`.toLowerCase().includes(search.toLowerCase()));
  const filteredLeads=leadSort==="Next best"?rankLeads(matchingLeads):matchingLeads.toSorted((left,right)=>leadSort==="Newest"?leadCreatedAt(right)-leadCreatedAt(left):leadSort==="Follow-up due"?(Number.isFinite(dateValue(left.followUp))?dateValue(left.followUp):Number.POSITIVE_INFINITY)-(Number.isFinite(dateValue(right.followUp))?dateValue(right.followUp):Number.POSITIVE_INFINITY):leadSort==="Recently attempted"?(Number.isFinite(dateValue(right.lastAttemptAt))?dateValue(right.lastAttemptAt):0)-(Number.isFinite(dateValue(left.lastAttemptAt))?dateValue(left.lastAttemptAt):0):left.name.localeCompare(right.name));
  const dueLeadCount=lineLeads.filter(item=>leadPriority(item).due&&item.stage!=="Closed"&&!item.doNotCall).length;
  function updateLead(id:number, patch:Partial<Lead>){setLeads(list=>list.map(l=>l.id===id?{...l,...patch}:l))}
  function createLead(){const phone=newLead.phone.trim();const name=newLead.name.trim();if(!name||phone.replace(/\D/g,"").length<7){setToast("Add a name and complete phone number");return}const createdAt=new Date().toISOString();const item:Lead={id:Date.now(),name,phone,email:newLead.email.trim(),city:newLead.city.trim()||"No city",status:"Ready",stage:"New lead",outcome:"Not contacted",notes:"",followUp:"",doNotCall:false,lastContact:"Never",line:activeLine,source:newLead.source.trim()||"Manual",leadCost:Number(newLead.leadCost)||0,product:newLead.product.trim()||"Service inquiry",sourceDisposition:"New",importedAt:createdAt,received:createdAt,smsConsent:false,smsOptOut:false};setLeads(old=>[item,...old]);setNewLead({name:"",phone:"",email:"",city:"",product:"",source:"Manual",leadCost:""});setShowNewLead(false);setSelectedLead(item.id);setView("leads");setToast(`${name} added to ${queueLabel(activeLine,workspaceProfile.mode)}`)}
  function applyAiAction(action:AiAction){
    const current=leads.find(item=>item.id===action.leadId);if(!current)return;
    const patch:Partial<Lead>={};
    if(action.patch.stage)patch.stage=action.patch.stage;
    if(action.patch.outcome)patch.outcome=action.patch.outcome;
    if(action.patch.followUp)patch.followUp=action.patch.followUp;
    if(action.patch.notesToAppend)patch.notes=[current.notes,`AI suggestion: ${action.patch.notesToAppend}`].filter(Boolean).join("\n");
    updateLead(action.leadId,patch);setToast(`Updated ${current.name}`);
  }
  function switchLine(line:LeadLine){
    if(dialing||postCallLeadId){if(postCallLeadId)setToast("Save the connected call result before switching queues");return}
    autoDialRef.current=false;setAutoDialing(false);activeLineRef.current=line;setActiveLine(line);setIndex(0);setSearch("");setStageFilter("All stages");setSourceFilter("All sources");
  }
  async function subscribe(plan:"solo"|"team"|"agency"){
    setCheckoutPlan(plan);
    try{
      const response=await fetch("/api/stripe/checkout",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({plan})});
      const data=await response.json().catch(()=>({}));
      if(!response.ok||!data.url)throw new Error(data.error||"Checkout could not start");
      window.location.assign(String(data.url));
    }catch(error){setToast(error instanceof Error?error.message:"Checkout could not start");setCheckoutPlan("")}
  }
  async function manageMembership(){
    try{
      const response=await fetch("/api/stripe/portal",{method:"POST"});
      const data=await response.json().catch(()=>({}));
      if(!response.ok||!data.url)throw new Error(data.error||"Billing portal could not open");
      window.location.assign(String(data.url));
    }catch(error){setToast(error instanceof Error?error.message:"Billing portal could not open")}
  }

  return <main className="app-shell">
    <aside className="sidebar">
      <div className="logo"><span className="brand-mark"><Image src="/pacifica-mark.png" width={32} height={32} alt="" priority/></span><div><b>PACIFICA</b></div></div>
      <nav>{nav.map(([id,label,icon])=><button key={id} className={view===id?"active":""} onClick={()=>setView(id)}><Icon name={icon}/><span>{label}</span>{id==="leads"&&<em>{leads.length}</em>}{id==="quotes"&&<small className="nav-soon">SOON</small>}</button>)}</nav>
      <div className="sidebar-foot"><div className="agent"><span>AC</span><div><b>Pacifica workspace</b><small><i/> Available</small></div></div>{isOwner&&<button aria-label="Owner settings" onClick={()=>setView("settings")}><Icon name="gear"/></button>}</div>
    </aside>

    <section className="workspace">
      <header className="topbar"><div className="caller-id"><small>CALLER ID</small><b>{callerId}</b><span className={`idle-badge ${phoneReady?"online":""}`}>{phoneReady?"READY":"SETUP"}</span></div><div className="lead-line-switch" aria-label="Lead queue"><button className={activeLine==="life"?"active":""} disabled={dialing} onClick={()=>switchLine("life")}>{queueLabel("life",workspaceProfile.mode)}</button><button className={activeLine==="home-auto"?"active":""} disabled={dialing} onClick={()=>switchLine("home-auto")}>{queueLabel("home-auto",workspaceProfile.mode)}</button></div><div className="top-actions"><PwaInstallButton/><button className={`inbound-availability ${phoneAvailable?"available":""}`} disabled={!phoneReady||dialing} title={!phoneReady?"Assign this workspace a Twilio number first":undefined} onClick={()=>void togglePhoneAvailability()}><i/>{phoneAvailable?"Calls on":"Go available"}</button><button className="queue-pause" onClick={pauseQueue} disabled={!autoDialing&&!dialing&&!(postCallLeadId&&resumeAfterWrap)}><Icon name="pause"/> Pause dialing</button><span className="connection"><Icon name="wifi"/>{provider}</span><button className={`notification ${dueLeadCount?"has-alerts":""}`} aria-label={`${dueLeadCount} follow-ups due`} title={`${dueLeadCount} follow-ups due`} onClick={()=>setView("today")}><Icon name="bell"/>{dueLeadCount>0&&<em>{Math.min(99,dueLeadCount)}</em>}</button><button className="import" onClick={()=>inputRef.current?.click()}><Icon name="upload"/> Import lead CSV</button>{clerkEnabled&&<ClerkTopAuth/>}<input ref={inputRef} hidden type="file" accept=".csv,.txt,.tsv" onChange={event=>{const file=event.currentTarget.files?.[0];event.currentTarget.value="";importFile(file)}}/></div></header>

      {view==="today"&&<TodayWorkspace leads={leads} onOpen={id=>{setSelectedLead(id);setView("leads")}} onCall={callLeadById} onImport={()=>inputRef.current?.click()} onAdd={()=>setShowNewLead(true)}/>}

      {view==="dialer"&&<div className="dialer-view"><div className="dialer-main-grid">
        <section className={`hero-call ${connected?"connected":""}`}>
          <div className="hero-head"><div><span className="eyebrow">PACIFICA · {queueLabel(activeLine,workspaceProfile.mode).toUpperCase()} DIALER</span><h1>{postCallLeadId?"Finish the call result.":connected?"You’re connected.":dialing?"Calling through Twilio…":autoDialing?"Advancing to the next lead…":"Auto dialer ready."}</h1><p>{postCallLeadId?"Save the CRM update, source disposition, notes, and appointment before Pacifica calls the next lead.":connected?"Speak normally. When the call ends, choose its result and Pacifica will continue the queue.":dialing?"Twilio is dialing one contact and bridges the conversation when they answer.":`Start the ${queueLabel(activeLine,workspaceProfile.mode)} queue and let Pacifica advance through it.`}</p></div><div className="line-toggle"><button className="active">One line</button><button className={autoDialing?"active":""}>{autoDialing?"Auto running":postCallLeadId?"Wrap-up required":"Auto queue"}</button></div></div>
          <div className="call-grid">
            <article className="contact-card"><div className="avatar">{manualCall?"#":lead.name.split(" ").map(n=>n[0]).slice(0,2).join("")}</div><div><span>{connected?"CONNECTED":"NEXT CONTACT"}</span><h2>{manualCall?"Manual call":lead.name}</h2><a href={`tel:${manualCall?dialNumber:lead.phone}`}>{manualCall?dialNumber:lead.phone}</a><p>{manualCall?"Phone keypad":lead.city}</p></div><b className="timer">{connected?fmt:"—:—"}</b></article>
            <div className={`signal ${dialing?"moving":""}`}>{Array.from({length:35}).map((_,i)=><i key={i} style={{height:`${12+((i*17)%39)}px`}}/> )}</div>
            <div className="call-controls">
              <button className={`round ${muted?"muted":""}`} aria-label={muted?"Unmute":"Mute"} onClick={toggleMute} disabled={!connected||held}><Icon name="mute"/><small>{muted?"Unmute":"Mute"}</small></button>
              {!dialing?<button className="start-call" onClick={start}><Icon name="play"/><span>{autoDialing?"Call next lead":`Start ${queueLabel(activeLine,workspaceProfile.mode)} queue`}</span></button>:<button className="end-call" onClick={hangup}><Icon name="end"/><span>{connected?"Hang up":"End attempt"}</span></button>}
              <button className={`round ${held?"held":""}`} aria-label={held?"Resume":"Hold"} onClick={toggleHold} disabled={!connected}><Icon name={held?"play":"pause"}/><small>{held?"Resume":"Hold"}</small></button>
            </div>
            {dialing&&!connected&&<div className="line-status"><span><i/> Calling {manualCall?dialNumber:lead.name} from {callerId}</span></div>}
            {autoDialing&&<div className="auto-session-note"><span><i/> AUTO DIAL ACTIVE · {callableLeads.length} ELIGIBLE CONTACTS</span><button onClick={()=>stopAutoDial("Auto dial stopped after the current attempt")}>Pause auto dial</button></div>}
            {connected&&<div className="connected-note"><i/> Live conversation. Hang up when finished, record the result, then Pacifica continues the queue.</div>}
          </div>
        </section>
        <aside className="lead-file" aria-label="Current lead file">
          <header>
            <div><span>LIVE LEAD FILE</span><b>{manualCall?"Manual call":lead.name}</b></div>
            <em className={connected?"live":""}>{connected?"ON CALL":callableLeads.length?`${Math.min(index+1,callableLeads.length)} OF ${callableLeads.length}`:"NO QUEUE"}</em>
          </header>
          {lead.id&&!manualCall?<>
            <div className="lead-file-identity"><span className="file-avatar">{lead.name.split(" ").map(part=>part[0]).slice(0,2).join("")}</span><div><a href={`tel:${lead.phone}`}>{lead.phone}</a><a href={`mailto:${lead.email}`}>{lead.email||"No email provided"}</a><small>{[lead.address,lead.city,lead.state,lead.zip].filter(Boolean).join(", ")||lead.city||"No address provided"}</small></div></div>
            <div className="lead-file-grid">
              <label><span>Lead source</span><b>{lead.source||"Unknown"}</b></label>
              <label><span>Product</span><b>{lead.product||"—"}</b></label>
              <label><span>Lead cost</span><b>{lead.leadCost?`$${lead.leadCost.toFixed(2)}`:"—"}</b></label>
              <label><span>Received</span><b>{lead.received||lead.importedAt||"—"}</b></label>
              <label><span>Original status</span><b>{lead.sourceDisposition||"New lead"}</b></label>
              <label><span>Last contact</span><b>{lead.lastContact||"Never"}</b></label>
              {lead.brand&&<label><span>Brand / agency</span><b>{lead.brand}</b></label>}
              {lead.profileName&&<label><span>Lead profile</span><b>{lead.profileName}</b></label>}
              {lead.territory&&<label><span>Territory</span><b>{lead.territory}</b></label>}
              {lead.returnStatus&&<label><span>Return status</span><b>{lead.returnStatus}</b></label>}
              {lead.employeeCount&&<label><span>Employees</span><b>{lead.employeeCount}</b></label>}
              {lead.searchPro&&<label><span>Search Pro</span><b>{lead.searchPro}</b></label>}
              {Object.entries(lead.extraFields||{}).map(([field,value])=><label key={field}><span>{field.replace(/([a-z])([A-Z])/g,"$1 $2").replace(/[_-]+/g," ")}</span><b>{value}</b></label>)}
            </div>
            {postCallLeadId===lead.id?<section className="post-call-wrap" aria-label="Post-call wrap-up">
              <header><div><span>CONNECTED CALL COMPLETE</span><h3>Record the result before the next call.</h3></div><em>{lead.source||"Lead provider"}</em></header>
              <div className="post-call-fields">
                <label><span>Pacifica CRM stage</span><select value={postCallDraft.crmStage} onChange={event=>setPostCallDraft(draft=>({...draft,crmStage:event.target.value}))}><option>New lead</option><option>Follow-up</option><option>Appointment</option><option>Closed</option></select></label>
                <label><span>Pacifica outcome</span><select value={postCallDraft.crmOutcome} onChange={event=>setPostCallDraft(draft=>({...draft,crmOutcome:event.target.value}))}><option>Not contacted</option><option>No answer</option><option>Voicemail</option><option>Interested</option><option>Appointment set</option><option>Not interested</option><option>Wrong number</option><option>Completed</option></select></label>
                <label className="source-result"><span>{lead.source||"Lead source"} disposition</span><select value={postCallDraft.sourceDisposition} onChange={event=>setPostCallDraft(draft=>({...draft,sourceDisposition:event.target.value}))}>{sourceDispositionOptions(lead.source,postCallDraft.sourceDisposition).map(option=><option key={option}>{option}</option>)}</select><small>This updates the provider separately from your Pacifica workflow when its outbound API is connected.</small></label>
                <label><span>Appointment / follow-up</span><input type="datetime-local" value={postCallDraft.appointmentAt} onChange={event=>setPostCallDraft(draft=>({...draft,appointmentAt:event.target.value}))}/></label>
                <label className="wrap-notes"><span>Call notes</span><textarea value={postCallDraft.notes} onChange={event=>setPostCallDraft(draft=>({...draft,notes:event.target.value}))} placeholder="Conversation, needs, objections, and next steps…"/></label>
              </div>
              <footer><small>{lead.sourceSyncStatus||`Pacifica will save this result. ${lead.source||"Lead-source"} sync runs after its status API is connected.`}</small><button disabled={sourceSyncing} onClick={()=>void savePostCall()}>{sourceSyncing?"Saving…":resumeAfterWrap?"Save & call next":"Save result"}</button></footer>
            </section>:<div className="lead-file-edit">
              <label><span>CRM stage</span><select value={lead.stage} onChange={event=>updateLead(lead.id,{stage:event.target.value})}><option>New lead</option><option>Follow-up</option><option>Appointment</option><option>Closed</option></select></label>
              <label><span>Outcome</span><select value={lead.outcome} onChange={event=>updateLead(lead.id,{outcome:event.target.value})}><option>Not contacted</option><option>No answer</option><option>Interested</option><option>Appointment set</option><option>Not interested</option><option>Wrong number</option><option>Completed</option></select></label>
              <label><span>Follow-up</span><input value={lead.followUp} onChange={event=>updateLead(lead.id,{followUp:event.target.value})} placeholder="Date, time, or reminder"/></label>
              <label className="file-notes"><span>Agent notes</span><textarea value={lead.notes} onChange={event=>updateLead(lead.id,{notes:event.target.value})} placeholder="Add notes while you speak…"/></label>
            </div>}
            <footer><button onClick={()=>{setSelectedLead(lead.id);setView("leads")}}>Open complete CRM record</button><button className={lead.doNotCall?"dnc-active":""} onClick={()=>updateLead(lead.id,{doNotCall:!lead.doNotCall})}>{lead.doNotCall?"Remove DNC":"Mark DNC"}</button></footer>
          </>:<div className="lead-file-empty"><Icon name="users"/><b>No queued lead selected</b><span>Import contacts or switch from manual dialing to see the full lead file here.</span></div>}
        </aside>
        <aside className="phone-pad side-pad" aria-label="Phone keypad"><header><span><i/> {connected?"LIVE KEYPAD":"MANUAL KEYPAD"}</span><span className="pad-tools"><small>{held?"ON HOLD":phoneReady?"TWILIO":"SETUP"}</small></span></header><div className="number-display"><input value={connected?dtmfDisplay:dialNumber} readOnly={connected} onChange={e=>setDialNumber(e.target.value.replace(/[^0-9+*#() -]/g,""))} placeholder={connected?"Touch tones":"Enter a number"}/><small>{phoneStatus.toUpperCase()}</small></div><div className="key-grid">{[["1",""],["2","ABC"],["3","DEF"],["4","GHI"],["5","JKL"],["6","MNO"],["7","PQRS"],["8","TUV"],["9","WXYZ"],["*",""] ,["0","+"],["#",""]].map(([n,l])=><button key={n} onClick={()=>pressKey(n)}><b>{n}</b><small>{l}</small></button>)}</div>{connected?<div className="live-phone-actions"><button className={muted?"active":""} onClick={toggleMute} disabled={held}><Icon name="mute"/><span>{muted?"Unmute":"Mute"}</span></button><button className={held?"active hold":""} onClick={toggleHold}><Icon name={held?"play":"pause"}/><span>{held?"Resume":"Hold"}</span></button><button className="hangup" onClick={hangup}><Icon name="end"/><span>End</span></button></div>:<div className="phone-actions"><button className="erase" onClick={()=>setDialNumber(v=>v.slice(0,-1))}>⌫</button><button className="phone-call" onClick={callTypedNumber} disabled={dialing}><Icon name="dial"/></button><span/></div>}<p>{connected?"Every key sends a live touch tone to the connected call.":"Calls use your browser microphone and speakers over Wi-Fi."}</p></aside></div>

        <section className="bottom-grid">
          <div className="stats-row"><article><span>CALLS TODAY</span><b>{callLogs.filter(log=>new Date(log.startedAt).toDateString()===new Date().toDateString()).length}</b><small>Tracked by the browser dialer</small></article><article><span>CONVERSATIONS</span><b>{callLogs.filter(log=>log.outcome==="Completed").length}</b><small>Connected calls recorded</small></article><article><span>PHONE STATUS</span><b className="phone-stat">{phoneReady?"Ready":"Setup"}</b><small>{phoneStatus}</small></article></div>
          <article className="queue-card"><header><div><span>{queueLabel(activeLine,workspaceProfile.mode).toUpperCase()} · UP NEXT</span><b>{callableLeads.length?`${Math.max(0,callableLeads.length-index)} open contacts remaining`:"Queue is empty"}</b></div><button onClick={()=>setView("leads")}>View CRM</button></header>{callableLeads.slice(index+1,index+4).map((l,i)=><div className="queue-row" key={l.id}><em>{String(i+1).padStart(2,"0")}</em><span className="mini-avatar">{l.name.split(" ").map(x=>x[0]).slice(0,2).join("")}</span><div><b>{l.name}</b><small>{l.phone} · {l.city}</small></div><span className="ready">READY</span></div>)}{!callableLeads.length&&<div className="empty-queue"><b>{lineLeads.length?"No open contacts":"No contacts yet"}</b><span>{lineLeads.length?"Closed and do-not-call contacts stay safely out of this queue.":`Import a CSV or TXT file into the ${queueLabel(activeLine,workspaceProfile.mode)} CRM.`}</span>{!lineLeads.length&&<button onClick={()=>inputRef.current?.click()}>Import contacts</button>}</div>}</article>
        </section>
      </div>}

      {view==="leads"&&<div className="page-view crm-view"><div className="page-title"><div><span className="eyebrow">{queueLabel(activeLine,workspaceProfile.mode).toUpperCase()} CRM</span><h1>{activeLine==="life"?"Work the opportunities that matter most.":"Keep every open opportunity organized."}</h1><p>Upload a CSV from any lead company. Pacifica keeps the source, product, cost, contact details, and next step together.</p></div><button className="primary" onClick={()=>inputRef.current?.click()}><Icon name="upload"/> Import lead CSV</button></div><div className="import-hint"><span>UNIVERSAL CSV IMPORT</span><p>{importReport}</p></div><div className="crm-summary five"><article><span>THIS CRM</span><b>{lineLeads.length}</b></article><article><span>LEAD SPEND</span><b>${lineLeads.reduce((total,leadItem)=>total+leadItem.leadCost,0).toFixed(0)}</b></article><article><span>FOLLOW-UPS DUE</span><b>{dueLeadCount}</b></article><article><span>APPOINTMENTS</span><b>{lineLeads.filter(l=>l.stage==="Appointment").length}</b></article><article><span>DO NOT CALL</span><b>{lineLeads.filter(l=>l.doNotCall).length}</b></article></div><div className="crm-tools"><label><span>⌕</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, phone, source, product, email, or city"/></label><select value={sourceFilter} onChange={e=>setSourceFilter(e.target.value)}>{sourceOptions.map(source=><option key={source}>{source}</option>)}</select><select value={stageFilter} onChange={e=>setStageFilter(e.target.value)}><option>All stages</option><option>New lead</option><option>Follow-up</option><option>Appointment</option><option>Closed</option></select><select value={leadSort} onChange={e=>setLeadSort(e.target.value)}><option>Next best</option><option>Newest</option><option>Follow-up due</option><option>Recently attempted</option><option>Name</option></select></div><div className="table-card crm-table smart-table"><div className="table-head"><span>CONTACT / PRIORITY</span><span>SOURCE / COST</span><span>STAGE</span><span>LAST OUTCOME</span><span>FOLLOW-UP</span></div>{filteredLeads.map(l=>{const priority=leadPriority(l);return <button className="table-row" key={l.id} onClick={()=>setSelectedLead(l.id)}><span><i>{l.name.split(" ").map(x=>x[0]).slice(0,2).join("")}</i><span><b>{l.name}</b><small>{l.phone} · {l.email||"No email"}</small><small className="priority-summary"><em className={`priority-pill ${priority.level.toLowerCase()}`}>{priority.level}</em>{priority.reason}</small></span></span><span className="lead-source"><b>{l.source}</b><small>{l.product}{l.leadCost?` · $${l.leadCost.toFixed(2)}`:""}</small></span><span><em className={`stage ${l.stage.toLowerCase().replace(" ","-")}`}>{l.stage}</em></span><span>{l.outcome}<small>{l.attempts||0} attempt{l.attempts===1?"":"s"}</small></span><span>{l.followUp?new Date(l.followUp).toLocaleString():"—"}{l.doNotCall&&<strong className="dnc">DNC</strong>}</span></button>})}{!filteredLeads.length&&<div className="empty-state">No {queueLabel(activeLine,workspaceProfile.mode)} contacts match those filters.</div>}</div></div>}

      {view==="messages"&&<div className="page-view messages-view"><MessagesCenter workspaceId={workspaceId} profile={workspaceProfile} leads={lineLeads} onPatch={(id,patch)=>updateLead(id,patch as Partial<Lead>)}/></div>}

      {view==="ai"&&<AiCommandCenter leads={lineLeads} recentCalls={callLogs} onApply={applyAiAction} onOpen={id=>setSelectedLead(id)} onCall={callLeadById}/>}

      {view==="campaigns"&&<div className="page-view"><div className="page-title"><div><span className="eyebrow">{queueLabel(activeLine,workspaceProfile.mode).toUpperCase()} SALES PIPELINE</span><h1>See what needs attention.</h1><p>Move contacts from first touch through appointment and completion.</p></div><button className="primary" onClick={()=>setShowNewLead(true)}>+ Add lead</button></div><div className="pipeline">{["New lead","Follow-up","Appointment","Closed"].map(stage=><section className="pipeline-col" key={stage} onDragOver={event=>event.preventDefault()} onDrop={event=>{event.preventDefault();const id=Number(event.dataTransfer.getData("text"));if(id)updateLead(id,{stage,status:stage==="Closed"?"Closed":"Ready"})}}><header><b>{stage}</b><span>{lineLeads.filter(l=>l.stage===stage).length}</span></header>{rankLeads(lineLeads.filter(l=>l.stage===stage)).map(l=>{const priority=leadPriority(l);return <button className="pipeline-card" key={l.id} draggable onDragStart={event=>event.dataTransfer.setData("text",String(l.id))} onClick={()=>setSelectedLead(l.id)}><div><i>{l.name.split(" ").map(x=>x[0]).slice(0,2).join("")}</i><span><b>{l.name}</b><small>{l.city}</small></span><em className={`priority-pill ${priority.level.toLowerCase()}`}>{priority.level}</em></div><p>{l.notes||priority.reason}</p><footer><span>{l.outcome}</span><em>{l.followUp||"No follow-up"}</em></footer></button>})}</section>)}</div></div>}

      {view==="activity"&&<div className="page-view report-view"><div className="page-title"><div><span className="eyebrow">CALL REPORTS & NUMBER HEALTH</span><h1>Every call, result, and risk signal.</h1><p>Filter real browser-call history and monitor behaviors that can affect your caller reputation.</p></div></div><CallLogReport logs={callLogs}/></div>}

      {view==="quotes"&&<div className="page-view"><div className="page-title"><div><span className="eyebrow">INDUSTRY WORKSPACES · COMING SOON</span><h1>Tools made for the work your team sells.</h1><p>Pacifica is preparing optional workflows for insurance quoting, legal intake, home-service estimates, automotive appointments, real estate, and health-service inquiries.</p></div></div><div className="crm-summary"><article><span>INSURANCE</span><b>Quotes</b></article><article><span>HOME SERVICES</span><b>Estimates</b></article><article><span>PROFESSIONAL</span><b>Intakes</b></article><article><span>APPOINTMENT</span><b>Booking</b></article></div></div>}

      {view==="billing"&&<div className="page-view billing-view"><div className="page-title"><div><span className="eyebrow">PACIFICA SUBSCRIPTIONS</span><h1>Choose the workspace that fits your team.</h1><p>Every plan uses secure Stripe-hosted checkout. Assigned calling numbers are provisioned by the Pacifica team after verification.</p></div></div><div className="pricing-grid">
        <article><span>SOLO</span><h2>${pacificaPlans.solo.monthlyPrice}<small>/month</small></h2><p>{pacificaPlans.solo.description}</p><ul><li>{pacificaPlans.solo.seats}</li><li>{pacificaPlans.solo.numbers}</li><li>Universal lead CRM</li><li>Sequential auto dialer</li><li>Pacifica ClearVoice noise suppression</li><li>Pacifica AI and reports</li><li>Industry tools coming soon</li></ul><button disabled={Boolean(checkoutPlan)} onClick={()=>void subscribe("solo")}>{checkoutPlan==="solo"?"Opening secure checkout…":"Start Solo"}</button></article>
        <article className="featured"><em>MOST POPULAR</em><span>TEAM</span><h2>${pacificaPlans.team.monthlyPrice}<small>/month</small></h2><p>{pacificaPlans.team.description}</p><ul><li>{pacificaPlans.team.seats}</li><li>{pacificaPlans.team.numbers}</li><li>Separate priority and general queues</li><li>Compliance controls and call reporting</li><li>Priority onboarding</li><li>Industry tools coming soon</li></ul><button disabled={Boolean(checkoutPlan)} onClick={()=>void subscribe("team")}>{checkoutPlan==="team"?"Opening secure checkout…":"Start Team"}</button></article>
        <article><span>AGENCY</span><h2>${pacificaPlans.agency.monthlyPrice}<small>/month</small></h2><p>{pacificaPlans.agency.description}</p><ul><li>{pacificaPlans.agency.seats}</li><li>{pacificaPlans.agency.numbers}</li><li>Agency-level campaigns and reporting</li><li>Number reputation monitoring</li><li>White-glove setup</li><li>Industry tools coming soon</li></ul><button disabled={Boolean(checkoutPlan)} onClick={()=>void subscribe("agency")}>{checkoutPlan==="agency"?"Opening secure checkout…":"Start Agency"}</button></article>
      </div><div className="membership-actions"><button onClick={()=>void manageMembership()}>Manage membership</button><span>Update payment details, view invoices, or cancel securely through Stripe.</span></div><section className="billing-compliance"><div><span>COMPLIANCE IS PART OF THE PRODUCT</span><h2>Every subscriber accepts the customer compliance agreement.</h2><p>Customers remain responsible for consent, lead sources, Do Not Call suppression, calling hours, licensing, and recording disclosures. Pacifica may suspend unsafe campaigns.</p></div><a href="/terms" target="_blank">Read customer agreement ↗</a></section><p className="billing-note">Subscription prices exclude Twilio usage, applicable taxes, and optional carrier-data integrations. Recurring billing and membership management are securely handled by Stripe.</p></div>}

      {isOwner&&view==="settings"&&<div className="page-view"><div className="page-title"><div><span className="eyebrow">OWNER CONFIGURATION</span><h1>Connect the systems that feed Pacifica.</h1><p>Personalize this workspace, choose audio devices, and connect lead providers.</p></div></div><WorkspaceProfileSettings profile={workspaceProfile} onChange={setWorkspaceProfile}/><div className="phone-setup-layout"><PhoneSettings ensureDevice={ensureDevice}/><div className="phone-setup-side"><div className="provider-card"><div><span className="eyebrow">TWILIO VOICE</span><h2>{callerId}</h2><p>The token endpoint, TwiML voice webhook, microphone preflight, messaging, and runtime error reporting are installed.</p></div><div className={`twilio-selected ${phoneReady?"":"waiting"}`}><i/> {phoneReady?"SERVER CONFIGURED":"CONFIGURATION NEEDED"}</div></div><article className="setup-help"><span>REQUIRED TWIML APP URL</span><code>https://pacificacrm.com/api/twilio/voice</code><p>Method: HTTP POST. After any Vercel environment-variable change, redeploy the Production deployment.</p><a href="/api/twilio/diagnostics" target="_blank">Open safe diagnostics ↗</a></article><article className="smart-connect"><header><div><span>UNIVERSAL LEAD DELIVERY</span><h2>Any lead provider → Pacifica automatically</h2></div><strong className="connected"><i/> SERVER SECURED</strong></header><p>Give a lead company these connection details. Replace PROVIDER_NAME so every contact keeps its source:</p><dl className="lead-api-details"><div><dt>Posting URL</dt><dd>https://pacificacrm.com/api/integrations/leads?workspace={workspaceId}&amp;source=PROVIDER_NAME</dd></div><div><dt>Method</dt><dd>POST · application/json</dd></div><div><dt>API key / header name</dt><dd>x-pacifica-webhook-secret</dd></div><div><dt>API key value</dt><dd>The value saved in Vercel as LEAD_WEBHOOK_SECRET</dd></div></dl><p>The provider key stays on the server. Your signed-in owner account checks for accepted leads every 20 seconds.</p><div><button onClick={saveLeadFeedConnection}>Check for leads now</button><small>{leadFeedStatus}</small></div></article></div></div></div>}
      {isPlatformOwner&&view==="settings"&&<PhoneNumberCenter currentWorkspaceId={workspaceId} onAssignmentChange={()=>void refreshPhoneStatus()}/>}
      {isOwner&&view==="settings"&&<PhoneWorkspaceSetup phoneNumber={callerId} workspaceId={workspaceId}/>}
    </section>
    {showPhoneSettings&&<div className="phone-config-overlay"><PhoneSettings compact ensureDevice={ensureDevice} onClose={()=>setShowPhoneSettings(false)}/></div>}
    {incomingCall&&<div className="incoming-call-backdrop"><section className="incoming-call-card" role="dialog" aria-modal="true" aria-label="Incoming call"><span>INCOMING PACIFICA CALL</span><i>{incomingLead?incomingLead.name.split(" ").map(part=>part[0]).slice(0,2).join(""):"☎"}</i><h2>{incomingLead?.name||"Unknown caller"}</h2><p>{incomingNumber}</p><small>{incomingLead?`${incomingLead.product} · ${incomingLead.source}`:"New caller · create a lead after answering"}</small><div><button onClick={rejectIncoming}>Decline</button><button onClick={acceptIncoming}>Answer</button></div></section></div>}
    {showNewLead&&<div className="new-lead-backdrop" onClick={()=>setShowNewLead(false)}><form className="new-lead-modal" onSubmit={event=>{event.preventDefault();createLead()}} onClick={event=>event.stopPropagation()}><header><div><span>NEW OPPORTUNITY</span><h2>Add a lead</h2><p>Create the contact now and work it immediately.</p></div><button type="button" aria-label="Close" onClick={()=>setShowNewLead(false)}>×</button></header><div className="new-lead-fields"><label>Full name<input autoFocus value={newLead.name} onChange={event=>setNewLead(value=>({...value,name:event.target.value}))} placeholder="Maria Torres"/></label><label>Phone<input value={newLead.phone} onChange={event=>setNewLead(value=>({...value,phone:event.target.value}))} placeholder="(818) 555-0123"/></label><label>Email<input type="email" value={newLead.email} onChange={event=>setNewLead(value=>({...value,email:event.target.value}))} placeholder="maria@example.com"/></label><label>City<input value={newLead.city} onChange={event=>setNewLead(value=>({...value,city:event.target.value}))} placeholder="Van Nuys"/></label><label>Product or service<input value={newLead.product} onChange={event=>setNewLead(value=>({...value,product:event.target.value}))} placeholder="Roof estimate, legal intake, auto quote…"/></label><label>Lead source<input value={newLead.source} onChange={event=>setNewLead(value=>({...value,source:event.target.value}))} placeholder="Google Ads"/></label><label>Lead cost<input type="number" min="0" step="0.01" value={newLead.leadCost} onChange={event=>setNewLead(value=>({...value,leadCost:event.target.value}))} placeholder="0.00"/></label><label>Queue<select value={activeLine} onChange={event=>switchLine(event.target.value as LeadLine)}><option value="life">{queueLabel("life",workspaceProfile.mode)}</option><option value="home-auto">{queueLabel("home-auto",workspaceProfile.mode)}</option></select></label></div><footer><button type="button" onClick={()=>setShowNewLead(false)}>Cancel</button><button className="primary" type="submit">Add lead</button></footer></form></div>}
    {activeLead&&<div className="drawer-backdrop" onClick={()=>setSelectedLead(null)}><aside className="contact-drawer" onClick={e=>e.stopPropagation()}><header><div className="drawer-person"><i>{activeLead.name.split(" ").map(x=>x[0]).slice(0,2).join("")}</i><span><small>{queueLabel(activeLead.line,workspaceProfile.mode).toUpperCase()} CONTACT</small><h2>{activeLead.name}</h2><p>{activeLead.phone} · {activeLead.city}</p></span></div><button aria-label="Close contact" onClick={()=>setSelectedLead(null)}>×</button></header><div className="record-actions"><button disabled={activeLead.stage==="Closed"||activeLead.doNotCall} onClick={()=>{switchLine(activeLead.line);setSelectedLead(null);setView("dialer");setToast("Contact category loaded in dialer")}}><Icon name="dial"/> Load in dialer</button><button onClick={()=>updateLead(activeLead.id,{priorityOverride:activeLead.priorityOverride==="high"?"auto":"high"})}>{activeLead.priorityOverride==="high"?"Use smart priority":"Pin high priority"}</button><button onClick={()=>updateLead(activeLead.id,{doNotCall:!activeLead.doNotCall})} className={activeLead.doNotCall?"danger-active":""}>{activeLead.doNotCall?"Remove DNC":"Do not call"}</button><button className={activeLead.stage==="Closed"?"reopen-lead":"close-lead"} onClick={()=>{const reopening=activeLead.stage==="Closed";updateLead(activeLead.id,{stage:reopening?"New lead":"Closed",status:reopening?"Ready":"Closed",followUp:reopening?activeLead.followUp:""});setToast(reopening?"Lead reopened and returned to the active queue":"Lead closed and removed from follow-ups")}}>{activeLead.stage==="Closed"?"Reopen lead":"Close lead"}</button></div><section className="record-section"><span className="section-label">CONTACT DETAILS</span><div className="field-grid"><label>Name<input value={activeLead.name} onChange={e=>updateLead(activeLead.id,{name:e.target.value})}/></label><label>Phone<input value={activeLead.phone} onChange={e=>updateLead(activeLead.id,{phone:e.target.value})}/></label><label>Email<input value={activeLead.email} onChange={e=>updateLead(activeLead.id,{email:e.target.value})}/></label><label>City<input value={activeLead.city} onChange={e=>updateLead(activeLead.id,{city:e.target.value})}/></label><label>Lead queue<select value={activeLead.line} onChange={e=>updateLead(activeLead.id,{line:e.target.value as LeadLine})}><option value="life">{queueLabel("life",workspaceProfile.mode)}</option><option value="home-auto">{queueLabel("home-auto",workspaceProfile.mode)}</option></select></label><label className="sms-consent-field"><span>Text message consent</span><select value={activeLead.smsOptOut?"optout":activeLead.smsConsent?"yes":"no"} onChange={e=>updateLead(activeLead.id,e.target.value==="yes"?{smsConsent:true,smsOptOut:false}:e.target.value==="optout"?{smsConsent:false,smsOptOut:true}:{smsConsent:false,smsOptOut:false})}><option value="no">Not documented</option><option value="yes">Opted in</option><option value="optout">Opted out / STOP</option></select><small>Only select Opted in when you have documented permission to text.</small></label></div></section><section className="record-section"><span className="section-label">PIPELINE & OUTCOME</span><div className="field-grid"><label>Stage<select value={activeLead.stage} onChange={e=>updateLead(activeLead.id,{stage:e.target.value,status:e.target.value==="Closed"?"Closed":"Ready"})}><option>New lead</option><option>Follow-up</option><option>Appointment</option><option>Closed</option></select></label><label>Call outcome<select value={activeLead.outcome} onChange={e=>{const outcome=e.target.value;const closed=outcome==="Not interested"||outcome==="Wrong number";const appointment=outcome==="Appointment set";updateLead(activeLead.id,{outcome,lastContact:"Just now",sourceDisposition:sourceDispositionForOutcome(activeLead.source,outcome,activeLead.sourceDisposition),stage:closed?"Closed":appointment?"Appointment":outcome==="Interested"?"Follow-up":activeLead.stage,status:closed?"Closed":"Ready"})}}><option>Not contacted</option><option>No answer</option><option>Voicemail</option><option>Interested</option><option>Appointment set</option><option>Not interested</option><option>Wrong number</option></select></label><label>Follow-up date<input type="datetime-local" value={activeLead.followUp} onChange={e=>updateLead(activeLead.id,{followUp:e.target.value,stage:e.target.value&&activeLead.stage==="New lead"?"Follow-up":activeLead.stage})}/></label><label>Last contact<input disabled value={activeLead.lastContact}/></label></div><div className="quick-follow-up"><span>QUICK FOLLOW-UP</span><button onClick={()=>updateLead(activeLead.id,{followUp:suggestedRetryAt(),stage:"Follow-up"})}>Later today</button><button onClick={()=>updateLead(activeLead.id,{followUp:followUpInDays(1),stage:"Follow-up"})}>Tomorrow</button><button onClick={()=>updateLead(activeLead.id,{followUp:followUpInDays(3),stage:"Follow-up"})}>In 3 days</button><button onClick={()=>updateLead(activeLead.id,{followUp:""})}>Clear</button></div></section><section className="record-section"><span className="section-label">NOTES</span><textarea value={activeLead.notes} onChange={e=>updateLead(activeLead.id,{notes:e.target.value})} placeholder="Add conversation notes, needs, objections, or next steps…"/></section><section className="timeline"><span className="section-label">ACTIVITY</span><div><i/><span><b>{activeLead.outcome}</b><small>{activeLead.lastContact}</small></span></div>{activeLead.lastSmsAt&&<div><i className="navy"/><span><b>Text message sent</b><small>{new Date(activeLead.lastSmsAt).toLocaleString()}</small></span></div>}{activeLead.stage==="Closed"&&<div><i className="navy"/><span><b>Lead closed</b><small>Excluded from dialing and follow-ups</small></span></div>}{activeLead.followUp&&<div><i className="amber"/><span><b>Follow-up scheduled</b><small>{new Date(activeLead.followUp).toLocaleString()}</small></span></div>}<div><i className="navy"/><span><b>Contact added to Pacifica CRM</b><small>{activeLead.importedAt?new Date(activeLead.importedAt).toLocaleDateString():"Date unavailable"}</small></span></div></section><footer><button onClick={()=>void syncLeadDisposition(activeLead,{sourceDisposition:activeLead.sourceDisposition,stage:activeLead.stage,outcome:activeLead.outcome,followUp:activeLead.followUp,notes:activeLead.notes}).then(message=>{setToast(message);setSelectedLead(null)})}>Save contact</button></footer></aside></div>}
    {toast&&<div className="toast">{toast}</div>}
  </main>
}

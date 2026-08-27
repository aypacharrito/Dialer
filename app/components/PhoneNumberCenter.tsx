"use client";

import { useEffect, useMemo, useState } from "react";

type Workspace={id:string;email:string;name:string;createdAt:number};
type OwnedNumber={sid:string;phoneNumber:string;friendlyName:string;capabilities:{voice?:boolean;sms?:boolean;mms?:boolean};voiceReady:boolean};
type Assignment={provider:"twilio"|"telnyx";workspaceId:string;workspaceEmail:string;workspaceName:string;phoneNumber:string;phoneSid:string;smsStatus:string;assignedAt:string;assignedBy:string};
type SearchNumber={phoneNumber:string;friendlyName:string;locality:string;region:string;postalCode:string;capabilities:{voice?:boolean;sms?:boolean;mms?:boolean}};
type ProviderStatus={twilio:{configured:boolean;healthy:boolean;applicationName:string;applicationSidLast4:string;currentVoiceUrl:string};telnyx:{configured:boolean;healthy:boolean;status:string}};
type CenterData={configured:boolean;storageConfigured:boolean;voiceUrl:string;providerStatus:ProviderStatus;workspaces:Workspace[];numbers:OwnedNumber[];assignments:Assignment[]};

function formatted(phone:string){
  const digits=phone.replace(/\D/g,"");
  return digits.length===11?`+1 (${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7)}`:phone;
}

export default function PhoneNumberCenter({currentWorkspaceId,onAssignmentChange}:{currentWorkspaceId:string;onAssignmentChange:()=>void}){
  const [data,setData]=useState<CenterData|null>(null);
  const [selectedWorkspace,setSelectedWorkspace]=useState(currentWorkspaceId);
  const [areaCode,setAreaCode]=useState("818");
  const [results,setResults]=useState<SearchNumber[]>([]);
  const [busy,setBusy]=useState("");
  const [message,setMessage]=useState("Loading customer workspaces and Twilio numbers…");

  async function load(){
    try{
      const response=await fetch("/api/admin/phone-numbers",{cache:"no-store"});
      const body=await response.json() as CenterData&{error?:string};
      if(!response.ok)throw new Error(body.error||"Phone Number Center could not load");
      setData(body);
      setSelectedWorkspace(current=>body.workspaces.some(workspace=>workspace.id===current)?current:(body.workspaces[0]?.id||""));
      setMessage(body.storageConfigured?"Ready to provision and assign numbers.":"Connect Upstash Redis in Vercel before assigning numbers.");
    }catch(error){setMessage(error instanceof Error?error.message:"Phone Number Center could not load")}
  }

  useEffect(()=>{
    const timer=window.setTimeout(()=>void load(),0);
    return()=>window.clearTimeout(timer);
  },[]);
  const assignmentsByPhone=useMemo(()=>new Map((data?.assignments||[]).map(item=>[item.phoneNumber,item])),[data]);
  const selected=data?.workspaces.find(workspace=>workspace.id===selectedWorkspace);

  async function action(name:string,payload:Record<string,unknown>){
    const response=await fetch("/api/admin/phone-numbers",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:name,...payload})});
    const body=await response.json() as {error?:string;message?:string;numbers?:SearchNumber[]};
    if(!response.ok)throw new Error(body.error||"Twilio request failed");
    return body;
  }

  async function search(){
    if(!/^\d{3}$/.test(areaCode)){setMessage("Enter a three-digit US area code.");return}
    setBusy("search");setMessage(`Searching ${areaCode} voice and SMS numbers…`);
    try{const body=await action("search",{areaCode});setResults(body.numbers||[]);setMessage(body.numbers?.length?`${body.numbers.length} available numbers found.`:`No ${areaCode} numbers are currently available.`)}
    catch(error){setMessage(error instanceof Error?error.message:"Number search failed")}
    finally{setBusy("")}
  }

  async function repairVoice(){
    if(!window.confirm(`Update the configured Twilio Voice application to send calls to ${data?.voiceUrl} using HTTP POST?`))return;
    setBusy("repair");setMessage("Repairing the Twilio Voice application…");
    try{const body=await action("repair",{confirmed:true});setMessage(body.message||"Twilio Voice setup repaired.");await load()}
    catch(error){setMessage(error instanceof Error?error.message:"Voice repair failed")}
    finally{setBusy("")}
  }

  async function assignOwned(number:OwnedNumber){
    if(!selected)return;
    const existing=assignmentsByPhone.get(number.phoneNumber);
    const warning=existing&&existing.workspaceId!==selected.id?`This will move ${formatted(number.phoneNumber)} from ${existing.workspaceName} to ${selected.name}. Continue?`:`Assign ${formatted(number.phoneNumber)} to ${selected.name}?`;
    if(!window.confirm(warning))return;
    setBusy(number.sid);setMessage("Configuring the Voice webhook and saving the workspace assignment…");
    try{const body=await action("assign",{phoneSid:number.sid,phoneNumber:number.phoneNumber,workspaceId:selected.id});setMessage(body.message||"Number assigned.");await load();onAssignmentChange()}
    catch(error){setMessage(error instanceof Error?error.message:"Assignment failed")}
    finally{setBusy("")}
  }

  async function purchase(number:SearchNumber){
    if(!selected)return;
    const confirmed=window.confirm(`Purchase ${formatted(number.phoneNumber)} from Twilio and assign it to ${selected.name}? Twilio will add its recurring monthly number fee and usage charges to your account.`);
    if(!confirmed)return;
    setBusy(number.phoneNumber);setMessage("Purchasing the number, configuring Voice, and assigning the workspace…");
    try{const body=await action("purchase",{phoneNumber:number.phoneNumber,workspaceId:selected.id,confirmed:true});setMessage(body.message||"Number purchased and assigned.");setResults([]);await load();onAssignmentChange()}
    catch(error){setMessage(error instanceof Error?error.message:"Purchase failed")}
    finally{setBusy("")}
  }

  async function markSmsReady(number:OwnedNumber){
    const assignment=assignmentsByPhone.get(number.phoneNumber);if(!assignment)return;
    const messagingServiceSid=window.prompt("Paste the approved Twilio Messaging Service SID (starts with MG). Leave blank only if this number is registered without one.","");if(messagingServiceSid===null)return;
    if(!window.confirm(`Confirm Twilio shows the A2P campaign for ${formatted(number.phoneNumber)} as APPROVED? Do not enable automatic texts while it is pending or rejected.`))return;
    setBusy(`sms-${number.sid}`);setMessage("Saving the approved SMS registration…");
    try{const body=await action("sms-status",{phoneSid:number.sid,messagingServiceSid,confirmed:true});setMessage(body.message||"SMS registration saved.");await load();onAssignmentChange()}
    catch(error){setMessage(error instanceof Error?error.message:"SMS registration update failed")}
    finally{setBusy("")}
  }

  return <section className="number-center">
    <header><div><span>PACIFICA PHONE NUMBER CENTER</span><h2>Buy once. Assign without redeploying.</h2><p>Every customer gets a private caller ID and inbound route tied to their Clerk workspace.</p></div><strong>{data?.storageConfigured?"CONTROL PLANE READY":"STORAGE REQUIRED"}</strong></header>
    {data?.providerStatus&&<div className="provider-health"><article><div><span>VOICE PROVIDER</span><b>Twilio · {data.providerStatus.twilio.applicationName}</b><small>Application …{data.providerStatus.twilio.applicationSidLast4} · {data.providerStatus.twilio.currentVoiceUrl}</small></div><em className={data.providerStatus.twilio.healthy?"ready":"attention"}>{data.providerStatus.twilio.healthy?"HEALTHY":"APP URL MISMATCH"}</em>{!data.providerStatus.twilio.healthy&&<button disabled={busy!==""} onClick={()=>void repairVoice()}>{busy==="repair"?"Repairing…":"Repair Voice setup"}</button>}</article><article><div><span>ALTERNATIVE PROVIDER</span><b>Telnyx</b><small>{data.providerStatus.telnyx.status} · browser Voice adapter planned</small></div><em className={data.providerStatus.telnyx.healthy?"ready":"standby"}>{data.providerStatus.telnyx.healthy?"READY":"STANDBY"}</em></article></div>}
    <div className="number-center-toolbar"><label><span>Assign to workspace</span><select value={selectedWorkspace} onChange={event=>setSelectedWorkspace(event.target.value)}>{(data?.workspaces||[]).map(workspace=><option key={workspace.id} value={workspace.id}>{workspace.name} · {workspace.email}</option>)}</select></label><label><span>Search local area code</span><div><input inputMode="numeric" maxLength={3} value={areaCode} onChange={event=>setAreaCode(event.target.value.replace(/\D/g,"").slice(0,3))}/><button disabled={busy!==""||!data?.storageConfigured} onClick={()=>void search()}>{busy==="search"?"Searching…":"Find numbers"}</button></div></label></div>
    <p className="number-center-message" role="status">{message}</p>
    {results.length>0&&<div className="number-search-results"><h3>Available to purchase</h3>{results.map(number=><article key={number.phoneNumber}><div><b>{formatted(number.phoneNumber)}</b><span>{[number.locality,number.region].filter(Boolean).join(", ")||"United States"}</span></div><small>{number.capabilities.voice?"VOICE":""}{number.capabilities.sms?" · SMS":""}</small><button disabled={busy!==""} onClick={()=>void purchase(number)}>{busy===number.phoneNumber?"Purchasing…":"Buy & assign"}</button></article>)}</div>}
    <div className="owned-number-list"><h3>Owned Twilio numbers</h3>{(data?.numbers||[]).map(number=>{const assignment=assignmentsByPhone.get(number.phoneNumber);return <article key={number.sid}><div><b>{formatted(number.phoneNumber)}</b><span>{assignment?`${assignment.workspaceName} · ${assignment.workspaceEmail}`:"Unassigned"}</span></div><div className="number-readiness"><em className={number.voiceReady?"ready":"attention"}>{number.voiceReady?"VOICE READY":"VOICE NEEDS CONFIG"}</em><em className={assignment?.smsStatus==="registered"?"ready":"attention"}>{assignment?.smsStatus==="registered"?"SMS REGISTERED":"A2P REQUIRED"}</em></div>{assignment&&assignment.smsStatus!=="registered"&&<button disabled={busy!==""} onClick={()=>void markSmsReady(number)}>{busy===`sms-${number.sid}`?"Saving…":"Confirm A2P approval"}</button>}<button disabled={busy!==""||!data?.storageConfigured} onClick={()=>void assignOwned(number)}>{busy===number.sid?"Assigning…":assignment?.workspaceId===selectedWorkspace?"Assigned":"Assign"}</button></article>})}{data&&!data.numbers.length&&<p>No Twilio numbers are owned by the connected account yet.</p>}</div>
    <footer><b>Protected setup</b><span>Only the Pacifica platform owner can purchase or reassign numbers. A new number is not automatically reputation-ready: register each customer and number for Voice Integrity, SHAKEN/STIR, and CNAM before scaling calls. Do not rotate numbers to escape a spam label. SMS remains blocked until that customer’s A2P Brand, Campaign, and Messaging Service are approved.</span></footer>
  </section>;
}

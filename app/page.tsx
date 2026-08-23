"use client";

import { useEffect, useRef, useState } from "react";
import type { Call, Device } from "@twilio/voice-sdk";
import QuoteCenter from "./components/QuoteCenter";
import PhoneSettings from "./components/PhoneSettings";
import CallLogReport, { type CallLog } from "./components/CallLogReport";

type Lead = { id:number; name:string; phone:string; city:string; status:string; email:string; stage:string; outcome:string; notes:string; followUp:string; doNotCall:boolean; lastContact:string };
type View = "dialer" | "leads" | "quotes" | "campaigns" | "activity" | "settings";

const starterLeads: Lead[] = [];
const emptyLead: Lead = {id:0,name:"No contact selected",phone:"Import contacts to begin",city:"CRM queue is empty",status:"Empty",email:"",stage:"New lead",outcome:"Not contacted",notes:"",followUp:"",doNotCall:false,lastContact:"Never"};

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
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export default function Page(){
  const [view,setView]=useState<View>("dialer");
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
  const [phoneReady,setPhoneReady]=useState(false);
  const [phoneStatus,setPhoneStatus]=useState("Checking Twilio setup…");
  const [muted,setMuted]=useState(false);
  const [showPhoneSettings,setShowPhoneSettings]=useState(false);
  const [callLogs,setCallLogs]=useState<CallLog[]>([]);
  const inputRef=useRef<HTMLInputElement>(null);
  const deviceRef=useRef<Device|null>(null);
  const callRef=useRef<Call|null>(null);
  const watchdogRef=useRef<number|undefined>(undefined);
  const elapsedRef=useRef(0);
  const currentLogRef=useRef<(CallLog & { connectedAt?:number; finalized?:boolean })|null>(null);
  const callableLeads=leads.filter(l=>l.stage!=="Closed"&&!l.doNotCall);
  const lead=callableLeads[index%Math.max(callableLeads.length,1)] || emptyLead;

  useEffect(()=>{ if(!connected)return; const t=setInterval(()=>setSeconds(s=>{elapsedRef.current=s+1;return s+1}),1000); return()=>clearInterval(t)},[connected]);
  useEffect(()=>{ if(!toast)return; const t=setTimeout(()=>setToast(""),2600); return()=>clearTimeout(t)},[toast]);
  useEffect(()=>{ queueMicrotask(()=>{try{const saved=localStorage.getItem("pacific-crm-leads-clean");if(saved)setLeads((JSON.parse(saved) as Lead[]).map(l=>({...l,email:l.email||"",stage:l.stage||"New lead",outcome:l.outcome||"Not contacted",notes:l.notes||"",followUp:l.followUp||"",doNotCall:Boolean(l.doNotCall),lastContact:l.lastContact||"Never"})))}catch{}}) },[]);
  useEffect(()=>{ try{localStorage.setItem("pacific-crm-leads-clean",JSON.stringify(leads))}catch{} },[leads]);
  useEffect(()=>{ queueMicrotask(()=>{try{const saved=localStorage.getItem("pacific-call-logs");if(saved)setCallLogs(JSON.parse(saved) as CallLog[])}catch{}}) },[]);
  useEffect(()=>{ try{localStorage.setItem("pacific-call-logs",JSON.stringify(callLogs.slice(0,500)))}catch{} },[callLogs]);
  useEffect(()=>{ fetch("/api/twilio/status").then(r=>r.json()).then(data=>{setPhoneReady(Boolean(data.configured));setPhoneStatus(data.configured?`${data.phoneNumber} ready over Wi-Fi`:"Secure API key still needed")}).catch(()=>setPhoneStatus("Unable to check Twilio setup")); return()=>{deviceRef.current?.destroy()} },[]);

  async function fetchToken(){const response=await fetch("/api/twilio/token",{cache:"no-store"});const data=await response.json();if(!response.ok)throw new Error(data.error||"Twilio is not configured");return String(data.token)}
  async function ensureDevice(){
    const token=await fetchToken();
    let device=deviceRef.current;
    if(!device){
      const sdk=await import("@twilio/voice-sdk");
      device=new sdk.Device(token,{logLevel:1,closeProtection:true});deviceRef.current=device;
      device.on("tokenWillExpire",async()=>{try{device?.updateToken(await fetchToken())}catch(error){setPhoneStatus(error instanceof Error?error.message:"Token refresh failed")}});
      device.on("error",error=>{const code="code" in error?` ${String(error.code)}`:"";setPhoneStatus(`Twilio${code}: ${error.message}`);setToast(`Twilio${code}: ${error.message}`)});
      device.audio?.on("deviceChange",()=>setPhoneStatus("Audio device changed — run the phone test"));
    }else device.updateToken(token);
    return device;
  }
  function finalizeLog(outcome:string,status:string,errorCode?:string){
    const current=currentLogRef.current;if(!current||current.finalized)return;current.finalized=true;
    const duration=current.connectedAt?elapsedRef.current:0;
    const complete:CallLog={...current,duration,outcome,status,errorCode,callSid:callRef.current?.parameters?.CallSid||current.callSid};
    delete (complete as CallLog & {connectedAt?:number;finalized?:boolean}).connectedAt;delete (complete as CallLog & {connectedAt?:number;finalized?:boolean}).finalized;
    setCallLogs(list=>[complete,...list].slice(0,500));currentLogRef.current=null;
  }
  function finishCall(wasManual:boolean,leadId?:number,message="Call ended — save an outcome, then resume",outcome="Completed",errorCode?:string){
    if(watchdogRef.current)window.clearTimeout(watchdogRef.current);watchdogRef.current=undefined;finalizeLog(outcome,message,errorCode);
    callRef.current=null;setDialing(false);setConnected(false);setSeconds(0);elapsedRef.current=0;setMuted(false);setManualCall(false);
    if(!wasManual&&leadId){setSelectedLead(leadId);setIndex(i=>(i+1)%Math.max(callableLeads.length,1))}
    setToast(message);
  }
  async function placeCall(number:string,wasManual:boolean){
    if(dialing)return;
    setManualCall(wasManual);setDialing(true);setConnected(false);setSeconds(0);elapsedRef.current=0;setPhoneStatus("Connecting securely…");
    const currentLeadId=wasManual?undefined:lead.id;
    currentLogRef.current={id:crypto.randomUUID(),name:wasManual?"Manual call":lead.name,phone:number,startedAt:new Date().toISOString(),duration:0,outcome:"Dialing",status:"Connecting",campaign:"Pacific Outreach",source:wasManual?"Manual keypad":"CRM queue"};
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:true});stream.getTracks().forEach(track=>track.stop());
      const device=await ensureDevice();
      const connectPromise=device.connect({params:{To:number}});
      const call=await Promise.race([connectPromise,new Promise<never>((_,reject)=>window.setTimeout(()=>reject(new Error("Twilio signaling timed out after 15 seconds")),15000))]);callRef.current=call;
      watchdogRef.current=window.setTimeout(()=>{call.disconnect();finishCall(wasManual,currentLeadId,"No answer after 45 seconds","Timed out")},45000);
      call.on("accept",()=>{if(watchdogRef.current)window.clearTimeout(watchdogRef.current);watchdogRef.current=undefined;if(currentLogRef.current)currentLogRef.current.connectedAt=Date.now();setConnected(true);setSeconds(0);setPhoneStatus("Live call over Wi-Fi")});
      call.on("disconnect",()=>finishCall(wasManual,currentLeadId,"Call ended — save an outcome, then resume","Completed"));
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
  function start(){ if(!callableLeads.length){setView("leads");setToast(leads.length?"No open contacts are eligible to dial":"Import a lead list first");return} void placeCall(lead.phone,false) }
  function hangup(){ callRef.current?.disconnect();if(!callRef.current)finishCall(manualCall,manualCall?undefined:lead.id) }
  function toggleMute(){const call=callRef.current;if(!call)return;const next=!muted;call.mute(next);setMuted(next)}
  function callTypedNumber(){ if(dialNumber.replace(/\D/g,"").length<7){setToast("Enter a complete phone number");return} void placeCall(dialNumber,true) }
  function pressKey(key:string){if(callRef.current&&connected){callRef.current.sendDigits(key);return}setDialNumber(value=>value+key)}
  function importFile(file?:File){
    if(!file)return; const reader=new FileReader();
    reader.onload=()=>{ const text=String(reader.result||""); const rows=text.split(/\r?\n/).filter(Boolean); const parsed=rows.slice(rows[0]?.toLowerCase().includes("phone")?1:0).map((row,i)=>{ const c=row.split(/,|\t/).map(x=>x.trim().replace(/^"|"$/g,"")); return {id:Date.now()+i,name:c[0]||`Lead ${i+1}`,phone:c[1]||c[0]||"No phone",city:c[2]||"Imported",email:c[3]||"",status:"Ready",stage:"New lead",outcome:"Not contacted",notes:"",followUp:"",doNotCall:false,lastContact:"Never"}; }).filter(x=>x.phone); if(parsed.length){setLeads(old=>[...parsed,...old]);setIndex(0);setToast(`${parsed.length.toLocaleString()} contacts imported`)} };
    reader.readAsText(file);
  }
  const fmt=`${String(Math.floor(seconds/60)).padStart(2,"0")}:${String(seconds%60).padStart(2,"0")}`;
  const nav:[View,string,string][]=[["dialer","Dialer","dial"],["leads","CRM contacts","users"],["quotes","Quote center","shield"],["campaigns","Pipeline","list"],["activity","Reports","chart"],["settings","Phone setup","gear"]];
  const activeLead=leads.find(l=>l.id===selectedLead);
  const filteredLeads=leads.filter(l=>(stageFilter==="All stages"||l.stage===stageFilter)&&`${l.name} ${l.phone} ${l.email} ${l.city}`.toLowerCase().includes(search.toLowerCase()));
  function updateLead(id:number, patch:Partial<Lead>){setLeads(list=>list.map(l=>l.id===id?{...l,...patch}:l))}

  return <main className="app-shell">
    <aside className="sidebar">
      <div className="logo"><span>PD</span><div><b>PACIFIC</b><small>DIALER</small></div></div>
      <nav>{nav.map(([id,label,icon])=><button key={id} className={view===id?"active":""} onClick={()=>setView(id)}><Icon name={icon}/><span>{label}</span>{id==="leads"&&<em>{leads.length}</em>}</button>)}</nav>
      <div className="sidebar-foot"><div className="agent"><span>AC</span><div><b>Alex Carranza</b><small><i/> Available</small></div></div><button aria-label="Settings" onClick={()=>setView("settings")}><Icon name="gear"/></button></div>
    </aside>

    <section className="workspace">
      <header className="topbar"><div className="caller-id"><small>CALLER ID</small><b>+1 (417) 441-2831</b><span className={`idle-badge ${phoneReady?"online":""}`}>{phoneReady?"READY":"SETUP"}</span></div><div className="session-bar"><label>Campaign</label><button>Pacific Outreach <span>⌄</span></button><strong><i/> {dialing?(connected?"Call connected":"Dialing…"):"Dialer paused"}</strong></div><div className="top-actions"><span className="connection"><Icon name="wifi"/>{provider}</span><button className="notification" aria-label="Notifications"><Icon name="bell"/></button><button className="import" onClick={()=>inputRef.current?.click()}><Icon name="upload"/> Import numbers</button><input ref={inputRef} hidden type="file" accept=".csv,.txt,.tsv" onChange={e=>importFile(e.target.files?.[0])}/></div></header>

      {view==="dialer"&&<div className="dialer-view"><div className="dialer-main-grid">
        <section className={`hero-call ${connected?"connected":""}`}>
          <div className="hero-head"><div><span className="eyebrow">PACIFIC POWER DIALER</span><h1>{connected?"You’re connected.":dialing?"Calling through Twilio…":"Dialer ready."}</h1><p>{connected?"Automatic dialing is paused while you speak.":dialing?"Your browser is placing a real call over Wi-Fi.":"Start a focused calling session or use the keypad for a one-off call."}</p></div><div className="line-toggle"><button className="active">Single line</button><button disabled title="First-answer multi-line calling comes after single-line verification">Multi-line</button></div></div>
          <div className="call-grid">
            <article className="contact-card"><div className="avatar">{manualCall?"#":lead.name.split(" ").map(n=>n[0]).slice(0,2).join("")}</div><div><span>{connected?"CONNECTED":"NEXT CONTACT"}</span><h2>{manualCall?"Manual call":lead.name}</h2><a href={`tel:${manualCall?dialNumber:lead.phone}`}>{manualCall?dialNumber:lead.phone}</a><p>{manualCall?"Phone keypad":lead.city}</p></div><b className="timer">{connected?fmt:"—:—"}</b></article>
            <div className={`signal ${dialing?"moving":""}`}>{Array.from({length:35}).map((_,i)=><i key={i} style={{height:`${12+((i*17)%39)}px`}}/> )}</div>
            <div className="call-controls">
              <button className={`round ${muted?"muted":""}`} aria-label={muted?"Unmute":"Mute"} onClick={toggleMute} disabled={!connected}><Icon name="mute"/><small>{muted?"Unmute":"Mute"}</small></button>
              {!dialing?<button className="start-call" onClick={start}><Icon name="play"/><span>Start dialing</span></button>:<button className="end-call" onClick={hangup}><Icon name="end"/><span>{connected?"Hang up":"Cancel call"}</span></button>}
              <span className="control-spacer"/>
            </div>
            {dialing&&!connected&&<div className="line-status"><span><i/> Calling {manualCall?dialNumber:lead.name} from +1 (417) 441-2831</span></div>}
            {connected&&<div className="connected-note"><i/> Dialer paused automatically. Hang up when finished, then press Resume to continue.</div>}
          </div>
        </section>
        <aside className="phone-pad side-pad" aria-label="Phone keypad"><header><span><i/> MANUAL KEYPAD</span><span className="pad-tools"><button aria-label="Open phone settings" onClick={()=>setShowPhoneSettings(true)}><Icon name="gear"/></button><small>{phoneReady?"TWILIO":"SETUP"}</small></span></header><div className="number-display"><input value={dialNumber} onChange={e=>setDialNumber(e.target.value.replace(/[^0-9+*#() -]/g,""))} placeholder="Enter a number"/><small>{phoneStatus.toUpperCase()}</small></div><div className="key-grid">{[["1",""],["2","ABC"],["3","DEF"],["4","GHI"],["5","JKL"],["6","MNO"],["7","PQRS"],["8","TUV"],["9","WXYZ"],["*",""] ,["0","+"],["#",""]].map(([n,l])=><button key={n} onClick={()=>pressKey(n)}><b>{n}</b><small>{l}</small></button>)}</div><div className="phone-actions"><button className="erase" onClick={()=>setDialNumber(v=>v.slice(0,-1))}>⌫</button><button className="phone-call" onClick={callTypedNumber} disabled={dialing}><Icon name="dial"/></button><span/></div><p>{connected?"Key presses send touch tones during the call.":"Calls use your browser microphone and speakers over Wi-Fi."}</p></aside></div>

        <section className="bottom-grid">
          <div className="stats-row"><article><span>CALLS TODAY</span><b>{callLogs.filter(log=>new Date(log.startedAt).toDateString()===new Date().toDateString()).length}</b><small>Tracked by the browser dialer</small></article><article><span>CONVERSATIONS</span><b>{callLogs.filter(log=>log.outcome==="Completed").length}</b><small>Connected calls recorded</small></article><article><span>PHONE STATUS</span><b className="phone-stat">{phoneReady?"Ready":"Setup"}</b><small>{phoneStatus}</small></article></div>
          <article className="queue-card"><header><div><span>UP NEXT</span><b>{callableLeads.length?`${Math.max(0,callableLeads.length-index)} open contacts remaining`:"Queue is empty"}</b></div><button onClick={()=>setView("leads")}>View CRM</button></header>{callableLeads.slice(index+1,index+4).map((l,i)=><div className="queue-row" key={l.id}><em>{String(i+1).padStart(2,"0")}</em><span className="mini-avatar">{l.name.split(" ").map(x=>x[0]).slice(0,2).join("")}</span><div><b>{l.name}</b><small>{l.phone} · {l.city}</small></div><span className="ready">READY</span></div>)}{!callableLeads.length&&<div className="empty-queue"><b>{leads.length?"No open contacts":"No contacts yet"}</b><span>{leads.length?"Closed and do-not-call contacts stay safely out of the queue.":"Import a CSV or TXT file to build your queue."}</span>{!leads.length&&<button onClick={()=>inputRef.current?.click()}>Import contacts</button>}</div>}</article>
        </section>
      </div>}

      {view==="leads"&&<div className="page-view crm-view"><div className="page-title"><div><span className="eyebrow">CUSTOMER RELATIONSHIP MANAGEMENT</span><h1>Every relationship, in one place.</h1><p>Search contacts, record outcomes, schedule follow-ups, and keep the full history together.</p></div><button className="primary" onClick={()=>inputRef.current?.click()}><Icon name="upload"/> Import contacts</button></div><div className="crm-summary"><article><span>TOTAL CONTACTS</span><b>{leads.length}</b></article><article><span>FOLLOW-UPS DUE</span><b>{leads.filter(l=>l.followUp).length}</b></article><article><span>APPOINTMENTS</span><b>{leads.filter(l=>l.stage==="Appointment").length}</b></article><article><span>DO NOT CALL</span><b>{leads.filter(l=>l.doNotCall).length}</b></article></div><div className="crm-tools"><label><span>⌕</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, phone, email, or city"/></label><select value={stageFilter} onChange={e=>setStageFilter(e.target.value)}><option>All stages</option><option>New lead</option><option>Follow-up</option><option>Appointment</option><option>Closed</option></select></div><div className="table-card crm-table"><div className="table-head"><span>CONTACT</span><span>STAGE</span><span>LAST OUTCOME</span><span>FOLLOW-UP</span></div>{filteredLeads.map(l=><button className="table-row" key={l.id} onClick={()=>setSelectedLead(l.id)}><span><i>{l.name.split(" ").map(x=>x[0]).slice(0,2).join("")}</i><span><b>{l.name}</b><small>{l.phone} · {l.email||"No email"}</small></span></span><span><em className={`stage ${l.stage.toLowerCase().replace(" ","-")}`}>{l.stage}</em></span><span>{l.outcome}</span><span>{l.followUp||"—"}{l.doNotCall&&<strong className="dnc">DNC</strong>}</span></button>)}{!filteredLeads.length&&<div className="empty-state">No contacts match those filters.</div>}</div></div>}

      {view==="campaigns"&&<div className="page-view"><div className="page-title"><div><span className="eyebrow">SALES PIPELINE</span><h1>See what needs attention.</h1><p>Move contacts from first touch through appointment and completion.</p></div><button className="primary" onClick={()=>{setView("leads");setStageFilter("New lead")}}>+ Add contact</button></div><div className="pipeline">{["New lead","Follow-up","Appointment","Closed"].map(stage=><section key={stage}><header><b>{stage}</b><span>{leads.filter(l=>l.stage===stage).length}</span></header>{leads.filter(l=>l.stage===stage).map(l=><button key={l.id} onClick={()=>setSelectedLead(l.id)}><div><i>{l.name.split(" ").map(x=>x[0]).slice(0,2).join("")}</i><span><b>{l.name}</b><small>{l.city}</small></span></div><p>{l.notes||"No notes yet"}</p><footer><span>{l.outcome}</span><em>{l.followUp||"No follow-up"}</em></footer></button>)}</section>)}</div></div>}

      {view==="activity"&&<div className="page-view report-view"><div className="page-title"><div><span className="eyebrow">CALL REPORTS & NUMBER HEALTH</span><h1>Every call, result, and risk signal.</h1><p>Filter real browser-call history and monitor behaviors that can affect your caller reputation.</p></div></div><CallLogReport logs={callLogs}/></div>}

      {view==="quotes"&&<QuoteCenter leads={leads.map(({id,name,phone,email,city})=>({id,name,phone,email,city}))} onOpenContact={id=>setSelectedLead(id)}/>} 

      {view==="settings"&&<div className="page-view"><div className="page-title"><div><span className="eyebrow">PHONE SETUP</span><h1>Browser calling over Wi-Fi.</h1><p>Choose your microphone, speaker, and ring device, then run the connection test before dialing.</p></div></div><div className="phone-setup-layout"><PhoneSettings ensureDevice={ensureDevice}/><div className="phone-setup-side"><div className="provider-card"><div><span className="eyebrow">TWILIO VOICE</span><h2>+1 (417) 441-2831</h2><p>The token endpoint, TwiML voice webhook, microphone preflight, and runtime error reporting are installed.</p></div><div className={`twilio-selected ${phoneReady?"":"waiting"}`}><i/> {phoneReady?"SERVER CONFIGURED":"CONFIGURATION NEEDED"}</div></div><article className="setup-help"><span>REQUIRED TWIML APP URL</span><code>https://dialer-one-theta.vercel.app/api/twilio/voice</code><p>Method: HTTP POST. After any Vercel environment-variable change, redeploy the Production deployment.</p><a href="/api/twilio/diagnostics" target="_blank">Open safe diagnostics ↗</a></article></div></div></div>}
    </section>
    {showPhoneSettings&&<div className="phone-config-overlay"><PhoneSettings compact ensureDevice={ensureDevice} onClose={()=>setShowPhoneSettings(false)}/></div>}
    {activeLead&&<div className="drawer-backdrop" onClick={()=>setSelectedLead(null)}><aside className="contact-drawer" onClick={e=>e.stopPropagation()}><header><div className="drawer-person"><i>{activeLead.name.split(" ").map(x=>x[0]).slice(0,2).join("")}</i><span><small>CONTACT RECORD</small><h2>{activeLead.name}</h2><p>{activeLead.phone} · {activeLead.city}</p></span></div><button aria-label="Close contact" onClick={()=>setSelectedLead(null)}>×</button></header><div className="record-actions"><button disabled={activeLead.stage==="Closed"||activeLead.doNotCall} onClick={()=>{setSelectedLead(null);setView("dialer");setIndex(Math.max(0,callableLeads.findIndex(l=>l.id===activeLead.id)));setToast("Contact loaded in dialer")}}><Icon name="dial"/> Load in dialer</button><button onClick={()=>updateLead(activeLead.id,{doNotCall:!activeLead.doNotCall})} className={activeLead.doNotCall?"danger-active":""}>{activeLead.doNotCall?"Remove DNC":"Do not call"}</button><button className={activeLead.stage==="Closed"?"reopen-lead":"close-lead"} onClick={()=>{const reopening=activeLead.stage==="Closed";updateLead(activeLead.id,{stage:reopening?"New lead":"Closed",status:reopening?"Ready":"Closed",followUp:reopening?activeLead.followUp:""});setToast(reopening?"Lead reopened and returned to the active queue":"Lead closed and removed from follow-ups")}}>{activeLead.stage==="Closed"?"Reopen lead":"Close lead"}</button></div><section className="record-section"><span className="section-label">CONTACT DETAILS</span><div className="field-grid"><label>Name<input value={activeLead.name} onChange={e=>updateLead(activeLead.id,{name:e.target.value})}/></label><label>Phone<input value={activeLead.phone} onChange={e=>updateLead(activeLead.id,{phone:e.target.value})}/></label><label>Email<input value={activeLead.email} onChange={e=>updateLead(activeLead.id,{email:e.target.value})}/></label><label>City<input value={activeLead.city} onChange={e=>updateLead(activeLead.id,{city:e.target.value})}/></label></div></section><section className="record-section"><span className="section-label">PIPELINE & OUTCOME</span><div className="field-grid"><label>Stage<select value={activeLead.stage} onChange={e=>updateLead(activeLead.id,{stage:e.target.value,status:e.target.value==="Closed"?"Closed":"Ready"})}><option>New lead</option><option>Follow-up</option><option>Appointment</option><option>Closed</option></select></label><label>Call outcome<select value={activeLead.outcome} onChange={e=>updateLead(activeLead.id,{outcome:e.target.value,lastContact:"Just now"})}><option>Not contacted</option><option>No answer</option><option>Voicemail</option><option>Interested</option><option>Appointment set</option><option>Not interested</option><option>Wrong number</option></select></label><label>Follow-up date<input type="date" value={activeLead.followUp} onChange={e=>updateLead(activeLead.id,{followUp:e.target.value,stage:e.target.value?"Follow-up":activeLead.stage})}/></label><label>Last contact<input disabled value={activeLead.lastContact}/></label></div></section><section className="record-section"><span className="section-label">NOTES</span><textarea value={activeLead.notes} onChange={e=>updateLead(activeLead.id,{notes:e.target.value})} placeholder="Add conversation notes, needs, objections, or next steps…"/></section><section className="timeline"><span className="section-label">ACTIVITY</span><div><i/><span><b>{activeLead.outcome}</b><small>{activeLead.lastContact}</small></span></div>{activeLead.stage==="Closed"&&<div><i className="navy"/><span><b>Lead closed</b><small>Excluded from dialing and follow-ups</small></span></div>}{activeLead.followUp&&<div><i className="amber"/><span><b>Follow-up scheduled</b><small>{activeLead.followUp}</small></span></div>}<div><i className="navy"/><span><b>Contact added to Pacific CRM</b><small>July 2026</small></span></div></section><footer><button onClick={()=>{setToast("Contact changes saved");setSelectedLead(null)}}>Save contact</button></footer></aside></div>}
    {toast&&<div className="toast">{toast}</div>}
  </main>
}

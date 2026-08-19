"use client";

import { useEffect, useRef, useState } from "react";
import type { Call, Device } from "@twilio/voice-sdk";

type Lead = { id:number; name:string; phone:string; city:string; status:string; email:string; stage:string; outcome:string; notes:string; followUp:string; doNotCall:boolean; lastContact:string };
type View = "dialer" | "leads" | "campaigns" | "activity" | "settings";

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
  const inputRef=useRef<HTMLInputElement>(null);
  const deviceRef=useRef<Device|null>(null);
  const callRef=useRef<Call|null>(null);
  const callableLeads=leads.filter(l=>l.stage!=="Closed"&&!l.doNotCall);
  const lead=callableLeads[index%Math.max(callableLeads.length,1)] || emptyLead;

  useEffect(()=>{ if(!connected)return; const t=setInterval(()=>setSeconds(s=>s+1),1000); return()=>clearInterval(t)},[connected]);
  useEffect(()=>{ if(!toast)return; const t=setTimeout(()=>setToast(""),2600); return()=>clearTimeout(t)},[toast]);
  useEffect(()=>{ queueMicrotask(()=>{try{const saved=localStorage.getItem("pacific-crm-leads-clean");if(saved)setLeads((JSON.parse(saved) as Lead[]).map(l=>({...l,email:l.email||"",stage:l.stage||"New lead",outcome:l.outcome||"Not contacted",notes:l.notes||"",followUp:l.followUp||"",doNotCall:Boolean(l.doNotCall),lastContact:l.lastContact||"Never"})))}catch{}}) },[]);
  useEffect(()=>{ try{localStorage.setItem("pacific-crm-leads-clean",JSON.stringify(leads))}catch{} },[leads]);
  useEffect(()=>{ fetch("/api/twilio/status").then(r=>r.json()).then(data=>{setPhoneReady(Boolean(data.configured));setPhoneStatus(data.configured?`${data.phoneNumber} ready over Wi-Fi`:"Secure API key still needed")}).catch(()=>setPhoneStatus("Unable to check Twilio setup")); return()=>{deviceRef.current?.destroy()} },[]);

  async function fetchToken(){const response=await fetch("/api/twilio/token",{cache:"no-store"});const data=await response.json();if(!response.ok)throw new Error(data.error||"Twilio is not configured");return String(data.token)}
  function finishCall(wasManual:boolean,leadId?:number,message="Call ended — save an outcome, then resume"){
    callRef.current=null;setDialing(false);setConnected(false);setSeconds(0);setMuted(false);setManualCall(false);
    if(!wasManual&&leadId){setSelectedLead(leadId);setIndex(i=>(i+1)%Math.max(callableLeads.length,1))}
    setToast(message);
  }
  async function placeCall(number:string,wasManual:boolean){
    if(dialing)return;
    setManualCall(wasManual);setDialing(true);setConnected(false);setSeconds(0);setPhoneStatus("Connecting securely…");
    try{
      const token=await fetchToken();
      let device=deviceRef.current;
      if(!device){const sdk=await import("@twilio/voice-sdk");device=new sdk.Device(token,{logLevel:1,closeProtection:true});deviceRef.current=device;device.on("tokenWillExpire",async()=>device?.updateToken(await fetchToken()))}else device.updateToken(token);
      const currentLeadId=wasManual?undefined:lead.id;
      const call=await device.connect({params:{To:number}});callRef.current=call;
      call.on("accept",()=>{setConnected(true);setSeconds(0);setPhoneStatus("Live call over Wi-Fi")});
      call.on("disconnect",()=>finishCall(wasManual,currentLeadId));
      call.on("cancel",()=>finishCall(wasManual,currentLeadId,"Call canceled"));
      call.on("reject",()=>finishCall(wasManual,currentLeadId,"Call was rejected"));
      call.on("error",error=>finishCall(wasManual,currentLeadId,error.message||"Call failed"));
    }catch(error){finishCall(wasManual,undefined,error instanceof Error?error.message:"Unable to place call");setPhoneStatus("Secure API key still needed")}
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
  const nav:[View,string,string][]=[["dialer","Dialer","dial"],["leads","CRM contacts","users"],["campaigns","Pipeline","list"],["activity","Reports","chart"],["settings","Phone setup","gear"]];
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
        <aside className="phone-pad side-pad" aria-label="Phone keypad"><header><span><i/> MANUAL KEYPAD</span><small>{phoneReady?"TWILIO":"SETUP"}</small></header><div className="number-display"><input value={dialNumber} onChange={e=>setDialNumber(e.target.value.replace(/[^0-9+*#() -]/g,""))} placeholder="Enter a number"/><small>{phoneStatus.toUpperCase()}</small></div><div className="key-grid">{[["1",""],["2","ABC"],["3","DEF"],["4","GHI"],["5","JKL"],["6","MNO"],["7","PQRS"],["8","TUV"],["9","WXYZ"],["*",""] ,["0","+"],["#",""]].map(([n,l])=><button key={n} onClick={()=>pressKey(n)}><b>{n}</b><small>{l}</small></button>)}</div><div className="phone-actions"><button className="erase" onClick={()=>setDialNumber(v=>v.slice(0,-1))}>⌫</button><button className="phone-call" onClick={callTypedNumber} disabled={dialing}><Icon name="dial"/></button><span/></div><p>{connected?"Key presses send touch tones during the call.":"Calls use your browser microphone and speakers over Wi-Fi."}</p></aside></div>

        <section className="bottom-grid">
          <div className="stats-row"><article><span>CALLS TODAY</span><b>0</b><small>No call activity yet</small></article><article><span>CONVERSATIONS</span><b>0</b><small>No outcomes recorded</small></article><article><span>PHONE STATUS</span><b className="phone-stat">{phoneReady?"Ready":"Setup"}</b><small>{phoneStatus}</small></article></div>
          <article className="queue-card"><header><div><span>UP NEXT</span><b>{callableLeads.length?`${Math.max(0,callableLeads.length-index)} open contacts remaining`:"Queue is empty"}</b></div><button onClick={()=>setView("leads")}>View CRM</button></header>{callableLeads.slice(index+1,index+4).map((l,i)=><div className="queue-row" key={l.id}><em>{String(i+1).padStart(2,"0")}</em><span className="mini-avatar">{l.name.split(" ").map(x=>x[0]).slice(0,2).join("")}</span><div><b>{l.name}</b><small>{l.phone} · {l.city}</small></div><span className="ready">READY</span></div>)}{!callableLeads.length&&<div className="empty-queue"><b>{leads.length?"No open contacts":"No contacts yet"}</b><span>{leads.length?"Closed and do-not-call contacts stay safely out of the queue.":"Import a CSV or TXT file to build your queue."}</span>{!leads.length&&<button onClick={()=>inputRef.current?.click()}>Import contacts</button>}</div>}</article>
        </section>
      </div>}

      {view==="leads"&&<div className="page-view crm-view"><div className="page-title"><div><span className="eyebrow">CUSTOMER RELATIONSHIP MANAGEMENT</span><h1>Every relationship, in one place.</h1><p>Search contacts, record outcomes, schedule follow-ups, and keep the full history together.</p></div><button className="primary" onClick={()=>inputRef.current?.click()}><Icon name="upload"/> Import contacts</button></div><div className="crm-summary"><article><span>TOTAL CONTACTS</span><b>{leads.length}</b></article><article><span>FOLLOW-UPS DUE</span><b>{leads.filter(l=>l.followUp).length}</b></article><article><span>APPOINTMENTS</span><b>{leads.filter(l=>l.stage==="Appointment").length}</b></article><article><span>DO NOT CALL</span><b>{leads.filter(l=>l.doNotCall).length}</b></article></div><div className="crm-tools"><label><span>⌕</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, phone, email, or city"/></label><select value={stageFilter} onChange={e=>setStageFilter(e.target.value)}><option>All stages</option><option>New lead</option><option>Follow-up</option><option>Appointment</option><option>Closed</option></select></div><div className="table-card crm-table"><div className="table-head"><span>CONTACT</span><span>STAGE</span><span>LAST OUTCOME</span><span>FOLLOW-UP</span></div>{filteredLeads.map(l=><button className="table-row" key={l.id} onClick={()=>setSelectedLead(l.id)}><span><i>{l.name.split(" ").map(x=>x[0]).slice(0,2).join("")}</i><span><b>{l.name}</b><small>{l.phone} · {l.email||"No email"}</small></span></span><span><em className={`stage ${l.stage.toLowerCase().replace(" ","-")}`}>{l.stage}</em></span><span>{l.outcome}</span><span>{l.followUp||"—"}{l.doNotCall&&<strong className="dnc">DNC</strong>}</span></button>)}{!filteredLeads.length&&<div className="empty-state">No contacts match those filters.</div>}</div></div>}

      {view==="campaigns"&&<div className="page-view"><div className="page-title"><div><span className="eyebrow">SALES PIPELINE</span><h1>See what needs attention.</h1><p>Move contacts from first touch through appointment and completion.</p></div><button className="primary" onClick={()=>{setView("leads");setStageFilter("New lead")}}>+ Add contact</button></div><div className="pipeline">{["New lead","Follow-up","Appointment","Closed"].map(stage=><section key={stage}><header><b>{stage}</b><span>{leads.filter(l=>l.stage===stage).length}</span></header>{leads.filter(l=>l.stage===stage).map(l=><button key={l.id} onClick={()=>setSelectedLead(l.id)}><div><i>{l.name.split(" ").map(x=>x[0]).slice(0,2).join("")}</i><span><b>{l.name}</b><small>{l.city}</small></span></div><p>{l.notes||"No notes yet"}</p><footer><span>{l.outcome}</span><em>{l.followUp||"No follow-up"}</em></footer></button>)}</section>)}</div></div>}

      {view==="activity"&&<div className="page-view"><div className="page-title"><div><span className="eyebrow">REPORTS & FOLLOW-UPS</span><h1>Know what happened—and what’s next.</h1><p>CRM results update as you save outcomes and move contacts through the pipeline.</p></div><button className="primary" onClick={()=>setToast("Report exported")}>Export report</button></div><div className="activity-grid"><article><span>TOTAL CONTACTS</span><b>{leads.length}</b><small>CRM database</small></article><article><span>INTERESTED</span><b>{leads.filter(l=>["Interested","Appointment set"].includes(l.outcome)).length}</b><small>Qualified conversations</small></article><article><span>APPOINTMENTS</span><b>{leads.filter(l=>l.stage==="Appointment").length}</b><small>Current pipeline</small></article></div><div className="report-split"><div className="chart-card"><header><b>Pipeline distribution</b><span>Live CRM data</span></header><div className="pipeline-bars">{["New lead","Follow-up","Appointment","Closed"].map((s,i)=><div key={s}><span>{s}</span><i><b style={{width:`${Math.max(8,(leads.filter(l=>l.stage===s).length/Math.max(leads.length,1))*100)}%`}}/></i><em>{leads.filter(l=>l.stage===s).length}</em></div>)}</div></div><div className="follow-card"><header><b>Upcoming follow-ups</b><button onClick={()=>{setView("leads");setStageFilter("Follow-up")}}>View all</button></header>{leads.filter(l=>l.followUp).sort((a,b)=>a.followUp.localeCompare(b.followUp)).slice(0,5).map(l=><button key={l.id} onClick={()=>setSelectedLead(l.id)}><span><b>{l.name}</b><small>{l.outcome}</small></span><em>{l.followUp}</em></button>)}</div></div></div>}

      {view==="settings"&&<div className="page-view"><div className="page-title"><div><span className="eyebrow">PHONE SETUP</span><h1>Browser calling over Wi-Fi.</h1><p>Your computer microphone and speakers handle audio while Twilio connects the regular phone call.</p></div></div><div className="setup-grid"><button className="selected"><span><Icon name="wifi"/></span><b>Browser over Wi-Fi</b><p>Selected for calling from your computer with the Twilio number below.</p><em>SELECTED</em></button><button disabled><span><Icon name="dial"/></span><b>Connect my phone</b><p>Cellphone bridging can be added later without changing the CRM.</p><em>NOT ACTIVE</em></button><button disabled><span><Icon name="gear"/></span><b>SIP / desk phone</b><p>Optional advanced connection for a VoIP desk phone or PBX.</p><em>NOT ACTIVE</em></button></div><div className="provider-card"><div><span className="eyebrow">TWILIO VOICE</span><h2>+1 (417) 441-2831</h2><p>The dialer and secure server endpoints are installed. The TwiML App must use this site’s voice webhook, and a newly rotated API key secret must be stored in the site’s secure settings before calls can begin.</p></div><div className={`twilio-selected ${phoneReady?"":"waiting"}`}><i/> {phoneReady?"READY OVER WI-FI":"WAITING FOR SECURE KEY"}</div></div></div>}
    </section>
    {activeLead&&<div className="drawer-backdrop" onClick={()=>setSelectedLead(null)}><aside className="contact-drawer" onClick={e=>e.stopPropagation()}><header><div className="drawer-person"><i>{activeLead.name.split(" ").map(x=>x[0]).slice(0,2).join("")}</i><span><small>CONTACT RECORD</small><h2>{activeLead.name}</h2><p>{activeLead.phone} · {activeLead.city}</p></span></div><button aria-label="Close contact" onClick={()=>setSelectedLead(null)}>×</button></header><div className="record-actions"><button disabled={activeLead.stage==="Closed"||activeLead.doNotCall} onClick={()=>{setSelectedLead(null);setView("dialer");setIndex(Math.max(0,callableLeads.findIndex(l=>l.id===activeLead.id)));setToast("Contact loaded in dialer")}}><Icon name="dial"/> Load in dialer</button><button onClick={()=>updateLead(activeLead.id,{doNotCall:!activeLead.doNotCall})} className={activeLead.doNotCall?"danger-active":""}>{activeLead.doNotCall?"Remove DNC":"Do not call"}</button><button className={activeLead.stage==="Closed"?"reopen-lead":"close-lead"} onClick={()=>{const reopening=activeLead.stage==="Closed";updateLead(activeLead.id,{stage:reopening?"New lead":"Closed",status:reopening?"Ready":"Closed",followUp:reopening?activeLead.followUp:""});setToast(reopening?"Lead reopened and returned to the active queue":"Lead closed and removed from follow-ups")}}>{activeLead.stage==="Closed"?"Reopen lead":"Close lead"}</button></div><section className="record-section"><span className="section-label">CONTACT DETAILS</span><div className="field-grid"><label>Name<input value={activeLead.name} onChange={e=>updateLead(activeLead.id,{name:e.target.value})}/></label><label>Phone<input value={activeLead.phone} onChange={e=>updateLead(activeLead.id,{phone:e.target.value})}/></label><label>Email<input value={activeLead.email} onChange={e=>updateLead(activeLead.id,{email:e.target.value})}/></label><label>City<input value={activeLead.city} onChange={e=>updateLead(activeLead.id,{city:e.target.value})}/></label></div></section><section className="record-section"><span className="section-label">PIPELINE & OUTCOME</span><div className="field-grid"><label>Stage<select value={activeLead.stage} onChange={e=>updateLead(activeLead.id,{stage:e.target.value,status:e.target.value==="Closed"?"Closed":"Ready"})}><option>New lead</option><option>Follow-up</option><option>Appointment</option><option>Closed</option></select></label><label>Call outcome<select value={activeLead.outcome} onChange={e=>updateLead(activeLead.id,{outcome:e.target.value,lastContact:"Just now"})}><option>Not contacted</option><option>No answer</option><option>Voicemail</option><option>Interested</option><option>Appointment set</option><option>Not interested</option><option>Wrong number</option></select></label><label>Follow-up date<input type="date" value={activeLead.followUp} onChange={e=>updateLead(activeLead.id,{followUp:e.target.value,stage:e.target.value?"Follow-up":activeLead.stage})}/></label><label>Last contact<input disabled value={activeLead.lastContact}/></label></div></section><section className="record-section"><span className="section-label">NOTES</span><textarea value={activeLead.notes} onChange={e=>updateLead(activeLead.id,{notes:e.target.value})} placeholder="Add conversation notes, needs, objections, or next steps…"/></section><section className="timeline"><span className="section-label">ACTIVITY</span><div><i/><span><b>{activeLead.outcome}</b><small>{activeLead.lastContact}</small></span></div>{activeLead.stage==="Closed"&&<div><i className="navy"/><span><b>Lead closed</b><small>Excluded from dialing and follow-ups</small></span></div>}{activeLead.followUp&&<div><i className="amber"/><span><b>Follow-up scheduled</b><small>{activeLead.followUp}</small></span></div>}<div><i className="navy"/><span><b>Contact added to Pacific CRM</b><small>July 2026</small></span></div></section><footer><button onClick={()=>{setToast("Contact changes saved");setSelectedLead(null)}}>Save contact</button></footer></aside></div>}
    {toast&&<div className="toast">{toast}</div>}
  </main>
}

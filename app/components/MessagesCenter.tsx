"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type MessageLead={id:number;name:string;phone:string;product:string;city:string;line:"life"|"home-auto";notes:string;outcome:string;doNotCall:boolean;smsConsent?:boolean;smsOptOut?:boolean;lastSmsAt?:string};
type Message={id:string;direction:string;from:string;to:string;body:string;status:string;sentAt:string;errorCode?:number|null;failureReason?:string|null};

const digits=(value:string)=>value.replace(/\D/g,"").slice(-10);
const firstName=(value:string)=>value.trim().split(/\s+/)[0]||"there";

function browserDraft(lead:MessageLead){
  const place=lead.city?` in ${lead.city}`:"";
  return `Hey ${firstName(lead.name)}, it’s Alejandro with Pacifica. I’m following up about the ${lead.product||"insurance"} coverage you requested${place}. If you still want help comparing options, text me here or call +1 (818) 441-1987. Reply STOP to opt out.`;
}

export default function MessagesCenter({leads,onPatch}:{leads:MessageLead[];onPatch:(id:number,patch:Partial<MessageLead>)=>void}){
  const [messages,setMessages]=useState<Message[]>([]);
  const [twilioNumber,setTwilioNumber]=useState("");
  const [selectedId,setSelectedId]=useState<number|null>(null);
  const [draft,setDraft]=useState("");
  const [loading,setLoading]=useState(false);
  const [status,setStatus]=useState("Loading Twilio conversations…");
  const [dailyEnabled,setDailyEnabled]=useState(false);
  const [aiMode,setAiMode]=useState<"ai"|"smart-fallback"|"">("");
  const [connection,setConnection]=useState<"checking"|"ready"|"error">("checking");
  const dailyRunning=useRef(false);
  const selected=leads.find(lead=>lead.id===selectedId)||leads[0];

  async function load(){
    try{
      const response=await fetch("/api/twilio/messages",{cache:"no-store",credentials:"same-origin"});
      const data=await response.json() as {error?:string;phone?:string;messages?:Message[]};
      if(!response.ok)throw new Error(data.error||"Unable to load messages");
      const incoming=data.messages||[];setMessages(incoming);setTwilioNumber(data.phone||"");setConnection("ready");setStatus(incoming.length?"Synced with Twilio":"Twilio connected · no messages yet");
      for(const message of incoming){
        if(!/inbound/i.test(message.direction)||!/^\s*(stop|stopall|unsubscribe|cancel|end|quit)\s*[.!]?\s*$/i.test(message.body))continue;
        const match=leads.find(lead=>digits(lead.phone)===digits(message.from));
        if(match&&!match.smsOptOut)onPatch(match.id,{smsOptOut:true,smsConsent:false});
      }
    }catch(error){setConnection("error");setStatus(error instanceof Error?error.message:"Unable to load messages")}
  }

  useEffect(()=>{queueMicrotask(()=>setDailyEnabled(localStorage.getItem("pacifica-daily-ai-sms")==="on"));void load();const timer=window.setInterval(()=>void load(),30000);return()=>window.clearInterval(timer)},[]);

  const thread=useMemo(()=>selected?messages.filter(message=>digits(message.from)===digits(selected.phone)||digits(message.to)===digits(selected.phone)).sort((a,b)=>new Date(a.sentAt).getTime()-new Date(b.sentAt).getTime()):[],[messages,selected]);

  async function generate(lead=selected){
    if(!lead)throw new Error("Choose a contact first");
    const response=await fetch("/api/ai/message",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({lead})});
    const data=await response.json() as {draft?:string;error?:string;mode?:"ai"|"smart-fallback";notice?:string};
    if(!response.ok||!data.draft)throw new Error(data.error||"AI could not draft a message");
    setAiMode(data.mode||"ai");
    if(data.notice)setStatus(data.notice);
    return data.draft;
  }

  async function send(lead=selected,text=draft){
    if(!lead)throw new Error("Choose a contact first");
    if(lead.smsOptOut)throw new Error("This contact replied STOP. Twilio messaging is blocked.");
    if(lead.doNotCall)throw new Error("This contact is marked DNC. Messaging is blocked.");
    if(!lead.smsConsent)throw new Error("Check ‘SMS consent on file’ above before sending. The lead provider’s consent record should cover texts from your agency.");
    const response=await fetch("/api/twilio/messages",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({to:lead.phone,body:text})});
    const data=await response.json() as {message?:Message;error?:string};
    if(!response.ok||!data.message)throw new Error(data.error||"Message could not be sent");
    setMessages(old=>[...old,data.message!]);onPatch(lead.id,{lastSmsAt:new Date().toISOString()});setDraft("");
  }

  async function generateSelected(){setLoading(true);try{setDraft(await generate());setStatus("AI draft ready for your review")}catch(error){if(selected){setDraft(browserDraft(selected));setAiMode("smart-fallback");setStatus(`AI server unavailable, so Pacifica created a safe local draft. ${error instanceof Error?error.message:""}`)}else setStatus("Choose a contact first")}finally{setLoading(false)}}
  async function sendSelected(){setLoading(true);try{await send();setStatus(`Message sent to ${selected?.name}`)}catch(error){setStatus(error instanceof Error?error.message:"Send failed")}finally{setLoading(false)}}

  async function runDaily(){
    if(dailyRunning.current||!dailyEnabled)return;
    const today=new Date().toISOString().slice(0,10);
    if(localStorage.getItem("pacifica-daily-ai-sms-last-run")===today)return;
    const eligible=leads.filter(lead=>lead.smsConsent&&!lead.smsOptOut&&!lead.doNotCall&&(!lead.lastSmsAt||Date.now()-new Date(lead.lastSmsAt).getTime()>22*60*60*1000)).slice(0,25);
    if(!eligible.length){localStorage.setItem("pacifica-daily-ai-sms-last-run",today);return}
    dailyRunning.current=true;setStatus(`Preparing ${eligible.length} consented daily follow-up${eligible.length===1?"":"s"}…`);
    let sent=0;let failed=0;let firstError="";
    for(const lead of eligible){try{await send(lead,await generate(lead));sent++}catch(error){failed++;if(!firstError)firstError=error instanceof Error?error.message:"send failed"}await new Promise(resolve=>window.setTimeout(resolve,500))}
    localStorage.setItem("pacifica-daily-ai-sms-last-run",today);dailyRunning.current=false;setStatus(`${sent} daily AI follow-up${sent===1?"":"s"} sent`);
    if(failed)setStatus(`${sent} sent · ${failed} blocked or failed${firstError?` · ${firstError}`:""}`);
  }

  useEffect(()=>{if(dailyEnabled)void runDaily()},[dailyEnabled,leads.length]);

  function toggleDaily(enabled:boolean){
    if(enabled&&!window.confirm("Enable one AI follow-up per day only for contacts you mark SMS opted-in? STOP replies and DNC contacts will remain blocked."))return;
    setDailyEnabled(enabled);localStorage.setItem("pacifica-daily-ai-sms",enabled?"on":"off");if(enabled)window.setTimeout(()=>void runDaily(),0);
  }

  return <div className="messages-center">
    <header className="messages-title"><div><span>TWILIO MESSAGING</span><h1>Keep every text in the same workspace.</h1><p>Read replies, write back, and let Pacifica draft friendly follow-ups from each lead file.</p><div className={`message-connection ${connection}`}><i/>{status}<button type="button" onClick={()=>void load()}>Test connection</button></div></div><label className="daily-sms-toggle"><input type="checkbox" checked={dailyEnabled} onChange={event=>toggleDaily(event.target.checked)}/><span><b>Daily AI follow-ups</b><small>Runs while Pacifica is open · opted-in contacts only</small></span></label></header>
    <div className="messages-layout">
      <aside className="message-contacts"><header><b>Contacts</b><small>{connection==="ready"?"Live Twilio inbox":"Connection needs attention"}</small></header>{leads.map(lead=><button key={lead.id} className={selected?.id===lead.id?"active":""} onClick={()=>{setSelectedId(lead.id);setDraft("")}}><i>{lead.name.split(" ").map(value=>value[0]).slice(0,2).join("")}</i><span><b>{lead.name}</b><small>{lead.product} · {lead.phone}</small></span>{lead.smsOptOut?<em className="blocked">STOP</em>:lead.smsConsent?<em>OPTED IN</em>:null}</button>)}{!leads.length&&<p>Import leads to start a conversation.</p>}</aside>
      <section className="message-thread">{selected?<><header><div><b>{selected.name}</b><small>{selected.product} · {selected.phone}</small></div><label><input type="checkbox" checked={Boolean(selected.smsConsent&&!selected.smsOptOut)} disabled={selected.smsOptOut||selected.doNotCall} onChange={event=>onPatch(selected.id,{smsConsent:event.target.checked})}/> SMS consent on file</label></header><div className="message-history">{thread.map(message=><article key={message.id} className={/inbound/i.test(message.direction)?"incoming":"outgoing"}><p>{message.body}</p><small>{new Date(message.sentAt).toLocaleString()} · {message.status}</small>{message.failureReason&&<strong className="message-failure">{message.failureReason}</strong>}</article>)}{!thread.length&&<div className="empty-thread"><b>No conversation yet</b><span>Generate a personal draft or write your own message below.</span></div>}</div><footer>{aiMode&&<div className={`message-ai-mode ${aiMode}`}><b>{aiMode==="ai"?"Pacifica AI draft":"Pacifica Smart Fallback"}</b><span>{aiMode==="ai"?"Written from this lead’s file":"A safe personalized draft was created while the provider reconnects"}</span></div>}<textarea value={draft} onChange={event=>setDraft(event.target.value)} placeholder={selected.smsOptOut?"This contact replied STOP":"Write a friendly follow-up…"} disabled={selected.smsOptOut}/>{!selected.smsConsent&&!selected.smsOptOut&&!selected.doNotCall&&<p className="message-consent-warning">Confirm documented SMS consent above before sending. You can still generate and review a draft.</p>}<div><button onClick={()=>void generateSelected()} disabled={loading||selected.smsOptOut}>{loading?"Working…":"Draft with Pacifica AI"}</button><button className="send-message" onClick={()=>void sendSelected()} disabled={loading||!draft.trim()||selected.smsOptOut||selected.doNotCall}>Send from {twilioNumber||"Twilio"}</button></div><small>Marketing texts require documented consent. Pacifica blocks DNC records and recognized STOP replies.</small></footer></>:<div className="empty-thread"><b>No contact selected</b></div>}</section>
    </div>
  </div>;
}

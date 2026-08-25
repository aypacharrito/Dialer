"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type MessageLead={id:number;name:string;phone:string;product:string;city:string;line:"life"|"home-auto";notes:string;outcome:string;doNotCall:boolean;smsConsent?:boolean;smsOptOut?:boolean;lastSmsAt?:string};
type Message={id:string;direction:string;from:string;to:string;body:string;status:string;sentAt:string};

const digits=(value:string)=>value.replace(/\D/g,"").slice(-10);

export default function MessagesCenter({leads,onPatch}:{leads:MessageLead[];onPatch:(id:number,patch:Partial<MessageLead>)=>void}){
  const [messages,setMessages]=useState<Message[]>([]);
  const [twilioNumber,setTwilioNumber]=useState("");
  const [selectedId,setSelectedId]=useState<number|null>(null);
  const [draft,setDraft]=useState("");
  const [loading,setLoading]=useState(false);
  const [status,setStatus]=useState("Loading Twilio conversations…");
  const [dailyEnabled,setDailyEnabled]=useState(false);
  const dailyRunning=useRef(false);
  const selected=leads.find(lead=>lead.id===selectedId)||leads[0];

  async function load(){
    try{
      const response=await fetch("/api/twilio/messages",{cache:"no-store"});
      const data=await response.json() as {error?:string;phone?:string;messages?:Message[]};
      if(!response.ok)throw new Error(data.error||"Unable to load messages");
      const incoming=data.messages||[];setMessages(incoming);setTwilioNumber(data.phone||"");setStatus(incoming.length?"Synced with Twilio":"No messages yet");
      for(const message of incoming){
        if(!/inbound/i.test(message.direction)||!/^\s*(stop|stopall|unsubscribe|cancel|end|quit)\s*[.!]?\s*$/i.test(message.body))continue;
        const match=leads.find(lead=>digits(lead.phone)===digits(message.from));
        if(match&&!match.smsOptOut)onPatch(match.id,{smsOptOut:true,smsConsent:false});
      }
    }catch(error){setStatus(error instanceof Error?error.message:"Unable to load messages")}
  }

  useEffect(()=>{queueMicrotask(()=>setDailyEnabled(localStorage.getItem("pacifica-daily-ai-sms")==="on"));void load();const timer=window.setInterval(()=>void load(),30000);return()=>window.clearInterval(timer)},[]);

  const thread=useMemo(()=>selected?messages.filter(message=>digits(message.from)===digits(selected.phone)||digits(message.to)===digits(selected.phone)).sort((a,b)=>new Date(a.sentAt).getTime()-new Date(b.sentAt).getTime()):[],[messages,selected]);

  async function generate(lead=selected){
    if(!lead)throw new Error("Choose a contact first");
    const response=await fetch("/api/ai/message",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({lead})});
    const data=await response.json() as {draft?:string;error?:string};
    if(!response.ok||!data.draft)throw new Error(data.error||"AI could not draft a message");
    return data.draft;
  }

  async function send(lead=selected,text=draft){
    if(!lead)throw new Error("Choose a contact first");
    if(!lead.smsConsent||lead.smsOptOut||lead.doNotCall)throw new Error("This contact is not eligible for marketing texts");
    const response=await fetch("/api/twilio/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({to:lead.phone,body:text})});
    const data=await response.json() as {message?:Message;error?:string};
    if(!response.ok||!data.message)throw new Error(data.error||"Message could not be sent");
    setMessages(old=>[...old,data.message!]);onPatch(lead.id,{lastSmsAt:new Date().toISOString()});setDraft("");
  }

  async function generateSelected(){setLoading(true);try{setDraft(await generate());setStatus("AI draft ready for your review")}catch(error){setStatus(error instanceof Error?error.message:"Draft failed")}finally{setLoading(false)}}
  async function sendSelected(){setLoading(true);try{await send();setStatus(`Message sent to ${selected?.name}`)}catch(error){setStatus(error instanceof Error?error.message:"Send failed")}finally{setLoading(false)}}

  async function runDaily(){
    if(dailyRunning.current||!dailyEnabled)return;
    const today=new Date().toISOString().slice(0,10);
    if(localStorage.getItem("pacifica-daily-ai-sms-last-run")===today)return;
    const eligible=leads.filter(lead=>lead.smsConsent&&!lead.smsOptOut&&!lead.doNotCall&&(!lead.lastSmsAt||Date.now()-new Date(lead.lastSmsAt).getTime()>22*60*60*1000)).slice(0,25);
    if(!eligible.length){localStorage.setItem("pacifica-daily-ai-sms-last-run",today);return}
    dailyRunning.current=true;setStatus(`Preparing ${eligible.length} consented daily follow-up${eligible.length===1?"":"s"}…`);
    let sent=0;
    for(const lead of eligible){try{await send(lead,await generate(lead));sent++}catch{}await new Promise(resolve=>window.setTimeout(resolve,500))}
    localStorage.setItem("pacifica-daily-ai-sms-last-run",today);dailyRunning.current=false;setStatus(`${sent} daily AI follow-up${sent===1?"":"s"} sent`);
  }

  useEffect(()=>{if(dailyEnabled)void runDaily()},[dailyEnabled,leads.length]);

  function toggleDaily(enabled:boolean){
    if(enabled&&!window.confirm("Enable one AI follow-up per day only for contacts you mark SMS opted-in? STOP replies and DNC contacts will remain blocked."))return;
    setDailyEnabled(enabled);localStorage.setItem("pacifica-daily-ai-sms",enabled?"on":"off");if(enabled)window.setTimeout(()=>void runDaily(),0);
  }

  return <div className="messages-center">
    <header className="messages-title"><div><span>TWILIO MESSAGING</span><h1>Keep every text in the same workspace.</h1><p>Read replies, write back, and let Pacifica draft friendly follow-ups from each lead file.</p></div><label className="daily-sms-toggle"><input type="checkbox" checked={dailyEnabled} onChange={event=>toggleDaily(event.target.checked)}/><span><b>Daily AI follow-ups</b><small>Runs while Pacifica is open · opted-in contacts only</small></span></label></header>
    <div className="messages-layout">
      <aside className="message-contacts"><header><b>Contacts</b><small>{status}</small></header>{leads.map(lead=><button key={lead.id} className={selected?.id===lead.id?"active":""} onClick={()=>{setSelectedId(lead.id);setDraft("")}}><i>{lead.name.split(" ").map(value=>value[0]).slice(0,2).join("")}</i><span><b>{lead.name}</b><small>{lead.product} · {lead.phone}</small></span>{lead.smsOptOut?<em className="blocked">STOP</em>:lead.smsConsent?<em>OPTED IN</em>:null}</button>)}{!leads.length&&<p>Import leads to start a conversation.</p>}</aside>
      <section className="message-thread">{selected?<><header><div><b>{selected.name}</b><small>{selected.product} · {selected.phone}</small></div><label><input type="checkbox" checked={Boolean(selected.smsConsent&&!selected.smsOptOut)} disabled={selected.smsOptOut||selected.doNotCall} onChange={event=>onPatch(selected.id,{smsConsent:event.target.checked})}/> SMS consent on file</label></header><div className="message-history">{thread.map(message=><article key={message.id} className={/inbound/i.test(message.direction)?"incoming":"outgoing"}><p>{message.body}</p><small>{new Date(message.sentAt).toLocaleString()} · {message.status}</small></article>)}{!thread.length&&<div className="empty-thread"><b>No conversation yet</b><span>Generate a personal draft or write your own message below.</span></div>}</div><footer><textarea value={draft} onChange={event=>setDraft(event.target.value)} placeholder={selected.smsOptOut?"This contact replied STOP":"Write a friendly follow-up…"} disabled={selected.smsOptOut}/><div><button onClick={()=>void generateSelected()} disabled={loading||selected.smsOptOut}>Draft with Pacifica AI</button><button className="send-message" onClick={()=>void sendSelected()} disabled={loading||!draft.trim()||!selected.smsConsent||selected.smsOptOut||selected.doNotCall}>Send from {twilioNumber||"Twilio"}</button></div><small>Marketing texts require documented consent. Pacifica blocks DNC records and recognized STOP replies.</small></footer></>:<div className="empty-thread"><b>No contact selected</b></div>}</section>
    </div>
  </div>;
}

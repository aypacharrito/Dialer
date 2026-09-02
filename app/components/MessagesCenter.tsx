"use client";

import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import {appendCommunication,type StoredCommunication} from "../lib/communications";
import {messagePriority,rankMessageLeads} from "../lib/message-priority";
import type {WorkspaceProfile} from "../lib/workspace-profile";
import MessageTemplateVault from "./MessageTemplateVault";

export type MessageLead={id:number;name:string;phone:string;email:string;product:string;city:string;line:"life"|"home-auto";notes:string;stage:string;outcome:string;followUp:string;importedAt:string;lastContact:string;sourceDisposition:string;source?:string;received?:string;doNotCall:boolean;smsConsent?:boolean;smsOptOut?:boolean;lastSmsAt?:string;emailConsent?:boolean;emailOptOut?:boolean;lastEmailAt?:string;communications?:StoredCommunication[];attempts?:number;lastAttemptAt?:string;automationNextAt?:string;automationStatus?:string;priorityOverride?:"auto"|"high"|"low"};
type SmsMessage={id:string;direction:string;from:string;to:string;body:string;status:string;sentAt:string;errorCode?:number|null;failureReason?:string|null};
type Channel="sms"|"email";
type EmailStatus={configured:boolean;provider:"resend"|"webhook"|"none";from:string;message:string};

const digits=(value:string)=>value.replace(/\D/g,"").slice(-10);
const firstName=(value:string)=>value.trim().split(/\s+/)[0]||"there";

function browserDraft(lead:MessageLead,profile:WorkspaceProfile,channel:Channel){
  const place=lead.city?` in ${lead.city}`:"";
  const sender=[profile.agentName,profile.businessName&&`with ${profile.businessName}`].filter(Boolean).join(" ")||"from our team";
  const callback=profile.callbackNumber?` or call ${profile.callbackNumber}`:"";
  if(channel==="email")return {subject:`Following up on your ${lead.product||"request"}`,body:`Hi ${firstName(lead.name)},\n\nThis is ${sender}. I’m following up on your request for ${lead.product||"service"}${place}. I’m available to answer questions and help with the next step. You can reply directly to this email${callback}.\n\nBest,\n${profile.emailSignature||profile.agentName||profile.businessName||"The team"}`};
  return {subject:"",body:`Hi ${firstName(lead.name)}, this is ${sender}. I’m following up on your request for ${lead.product||"service"}${place}. Are you still looking for assistance? Reply here when convenient${callback}. Reply STOP to opt out.`};
}

function emailWithComplianceFooter(text:string,profile:WorkspaceProfile){return `${text.trim()}\n\n${profile.businessAddress}\nReply UNSUBSCRIBE if you no longer want emails from ${profile.businessName||"this business"}.`.slice(0,10000)}

export default function MessagesCenter({workspaceId,profile,leads,onPatch,onProfileChange}:{workspaceId:string;profile:WorkspaceProfile;leads:MessageLead[];onPatch:(id:number,patch:Partial<MessageLead>)=>void;onProfileChange:(profile:WorkspaceProfile)=>void}){
  const [smsMessages,setSmsMessages]=useState<SmsMessage[]>([]);
  const [twilioNumber,setTwilioNumber]=useState("");
  const [emailStatus,setEmailStatus]=useState<EmailStatus>({configured:false,provider:"none",from:"",message:"Checking email provider…"});
  const [selectedId,setSelectedId]=useState<number|null>(null);
  const [channel,setChannel]=useState<Channel>("sms");
  const [subject,setSubject]=useState("");
  const [draft,setDraft]=useState("");
  const [loading,setLoading]=useState(false);
  const [status,setStatus]=useState("Loading communications…");
  const [aiMode,setAiMode]=useState<"ai"|"smart-fallback"|"template"|"">("");
  const [smsConnection,setSmsConnection]=useState<"checking"|"ready"|"error">("checking");
  const [rankingNow,setRankingNow]=useState(()=>Date.now());
  const leadSnapshot=useRef(leads);
  const patchLead=useRef(onPatch);
  const orderedLeads=useMemo(()=>rankMessageLeads(leads,smsMessages,channel,rankingNow),[leads,smsMessages,channel,rankingNow]);
  const selected=orderedLeads.find(lead=>lead.id===selectedId)||orderedLeads[0];

  useEffect(()=>{leadSnapshot.current=leads;patchLead.current=onPatch},[leads,onPatch]);
  const load=useCallback(async()=>{
    const [smsResult,emailResult]=await Promise.allSettled([
      fetch("/api/twilio/messages",{cache:"no-store",credentials:"same-origin"}).then(async response=>({response,data:await response.json() as {error?:string;phone?:string;messages?:SmsMessage[]}})),
      fetch("/api/email/messages",{cache:"no-store",credentials:"same-origin"}).then(async response=>({response,data:await response.json() as EmailStatus&{error?:string}})),
    ]);
    if(smsResult.status==="fulfilled"&&smsResult.value.response.ok){
      const incoming=smsResult.value.data.messages||[];setSmsMessages(incoming);setTwilioNumber(smsResult.value.data.phone||"");setSmsConnection("ready");
      for(const message of incoming){if(!/inbound/i.test(message.direction)||!/^\s*(stop|stopall|unsubscribe|cancel|end|quit)\s*[.!]?\s*$/i.test(message.body))continue;const match=leadSnapshot.current.find(lead=>digits(lead.phone)===digits(message.from));if(match&&!match.smsOptOut)patchLead.current(match.id,{smsOptOut:true,smsConsent:false})}
    }else setSmsConnection("error");
    if(emailResult.status==="fulfilled"&&emailResult.value.response.ok)setEmailStatus(emailResult.value.data);
    else setEmailStatus({configured:false,provider:"none",from:"",message:emailResult.status==="rejected"?"Email provider check failed":emailResult.value.data.error||"Email provider not configured"});
    setStatus("Communication channels checked");
  },[]);
  useEffect(()=>{const initial=window.setTimeout(()=>void load(),0);const timer=window.setInterval(()=>void load(),30000);return()=>{window.clearTimeout(initial);window.clearInterval(timer)}},[load]);
  useEffect(()=>{const timer=window.setInterval(()=>setRankingNow(Date.now()),30000);return()=>window.clearInterval(timer)},[]);

  const thread=useMemo(()=>{
    if(!selected)return [];
    if(channel==="sms")return smsMessages.filter(message=>digits(message.from)===digits(selected.phone)||digits(message.to)===digits(selected.phone)).map(message=>({...message,channel:"sms" as const,subject:"",provider:"Twilio"})).sort((a,b)=>new Date(a.sentAt).getTime()-new Date(b.sentAt).getTime());
    return (selected.communications||[]).filter(message=>message.channel==="email").map(message=>({...message,subject:message.subject||""})).sort((a,b)=>new Date(a.sentAt).getTime()-new Date(b.sentAt).getTime());
  },[smsMessages,selected,channel]);
  function chooseChannel(next:Channel){setChannel(next);setDraft("");setSubject("");setAiMode("");setStatus(next==="email"?emailStatus.message:smsConnection==="ready"?"Twilio inbox connected":"Twilio needs attention")}
  async function generate(lead=selected){
    if(!lead)throw new Error("Choose a contact first");
    const response=await fetch("/api/ai/message",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({lead,profile,channel})});
    const data=await response.json() as {draft?:string;subject?:string;error?:string;mode?:"ai"|"smart-fallback";notice?:string};
    if(!response.ok||!data.draft)throw new Error(data.error||"AI could not draft a message");setAiMode(data.mode||"ai");if(data.notice)setStatus(data.notice);if(channel==="email")setSubject(data.subject||`Following up about your ${lead.product||"request"}`);return data.draft;
  }
  async function sendSms(lead:MessageLead,text:string){
    if(lead.smsOptOut)throw new Error("This contact replied STOP. SMS is blocked.");if(!lead.smsConsent)throw new Error("Document SMS consent before sending.");
    const response=await fetch("/api/twilio/messages",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({to:lead.phone,body:text})});const data=await response.json() as {message?:SmsMessage;error?:string};if(!response.ok||!data.message)throw new Error(data.error||"Text message could not be sent");setSmsMessages(old=>[...old,data.message!]);onPatch(lead.id,{lastSmsAt:new Date().toISOString()});
  }
  async function sendEmail(lead:MessageLead,text:string){
    if(!lead.email)throw new Error("Add an email address to this contact first.");if(lead.emailOptOut)throw new Error("This contact is unsubscribed from email.");if(!lead.emailConsent)throw new Error("Document email permission before sending.");if(!profile.businessAddress)throw new Error("Add the business mailing address under Owner Settings before sending commercial email.");
    const sentText=emailWithComplianceFooter(text,profile);const response=await fetch("/api/email/messages",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({to:lead.email,subject,text:sentText,fromName:profile.businessName||profile.agentName,replyTo:profile.replyToEmail,leadId:lead.id,idempotencyKey:`manual:${workspaceId}:${lead.id}:${crypto.randomUUID()}`})});const data=await response.json() as {message?:{id:string;provider:string;status:string;sentAt:string};error?:string};if(!response.ok||!data.message)throw new Error(data.error||"Email could not be sent");const communication:StoredCommunication={id:crypto.randomUUID(),channel:"email",direction:"outbound",subject,body:sentText,status:data.message.status,sentAt:data.message.sentAt,provider:data.message.provider,providerId:data.message.id};onPatch(lead.id,{lastEmailAt:data.message.sentAt,communications:appendCommunication(lead.communications,communication)});
  }
  async function generateSelected(){setLoading(true);try{setDraft(await generate());setStatus(`${channel==="email"?"Email":"Text"} draft ready for review`)}catch(error){if(selected){const fallback=browserDraft(selected,profile,channel);setDraft(fallback.body);setSubject(fallback.subject);setAiMode("smart-fallback");setStatus(`Pacifica created a safe local draft. ${error instanceof Error?error.message:""}`)}else setStatus("Choose a contact first")}finally{setLoading(false)}}
  async function sendSelected(){if(!selected)return;setLoading(true);try{if(selected.doNotCall)throw new Error("This contact is marked DNC. Outreach is blocked.");if(channel==="sms")await sendSms(selected,draft);else await sendEmail(selected,draft);setDraft("");setSubject("");setStatus(`${channel==="email"?"Email":"Text"} sent to ${selected.name}`)}catch(error){setStatus(error instanceof Error?error.message:"Send failed")}finally{setLoading(false)}}

  const optedOut=channel==="sms"?selected?.smsOptOut:selected?.emailOptOut;
  const consent=channel==="sms"?selected?.smsConsent:selected?.emailConsent;
  const connectionClass=channel==="sms"?smsConnection:emailStatus.configured?"ready":"error";
  return <div className="messages-center">
    <header className="messages-title"><div><span>CUSTOMER COMMUNICATIONS</span><h1>Keep every conversation in one place.</h1><p>Review replies, personalize saved templates, and send consent-aware texts or emails directly from each contact record.</p><div className={`message-connection ${connectionClass}`}><i/>{status}<button type="button" onClick={()=>void load()}>Refresh status</button></div></div><label className="daily-sms-toggle"><input type="checkbox" checked={profile.serverAutomationEnabled} disabled/><span><b>Multi-channel automation {profile.serverAutomationEnabled?"enabled":"off"}</b><small>Consent, Do Not Call, opt-out, and provider safeguards are enforced</small></span></label></header>
    <div className="channel-tabs" role="tablist" aria-label="Communication channel"><button role="tab" aria-selected={channel==="sms"} className={channel==="sms"?"active":""} onClick={()=>chooseChannel("sms")}><b>SMS</b><small>{smsConnection==="ready"?twilioNumber||"Connected":"Needs setup"}</small></button><button role="tab" aria-selected={channel==="email"} className={channel==="email"?"active":""} onClick={()=>chooseChannel("email")}><b>Email</b><small>{emailStatus.configured?`${emailStatus.provider} · ${emailStatus.from}`:"Adapter ready for setup"}</small></button></div>
    <div className="messages-layout"><aside className="message-contacts"><header><b>Priority inbox</b><small>Ordered by replies, intent, due follow-ups, and lead age</small></header>{orderedLeads.map(lead=>{const priority=messagePriority(lead,smsMessages,channel,rankingNow);return <button key={lead.id} className={selected?.id===lead.id?"active":""} title={priority.detail} onClick={()=>{setSelectedId(lead.id);setDraft("");setSubject("")}}><i>{lead.name.split(" ").map(value=>value[0]).slice(0,2).join("")}</i><span><b>{lead.name}</b><small>{channel==="email"?lead.email||"No email":lead.phone}</small></span><em className={priority.tone}>{priority.label}</em></button>})}{!orderedLeads.length&&<p>Import contacts to start a conversation.</p>}</aside>
      <section className="message-thread">{selected?<><header><div><b>{selected.name}</b><small>{selected.product} · {channel==="email"?selected.email||"No email":selected.phone}</small></div><label><input type="checkbox" checked={Boolean(consent&&!optedOut)} disabled={Boolean(optedOut||selected.doNotCall||(channel==="email"&&!selected.email))} onChange={event=>channel==="sms"?onPatch(selected.id,{smsConsent:event.target.checked}):onPatch(selected.id,{emailConsent:event.target.checked})}/> {channel==="email"?"Email permission documented":"SMS consent documented"}</label></header><div className="message-history">{thread.map(message=><article key={message.id} className={message.direction==="inbound"||/inbound/i.test(message.direction)?"incoming":"outgoing"}>{message.subject&&<b className="message-subject">{message.subject}</b>}<p>{message.body}</p><small>{new Date(message.sentAt).toLocaleString()} · {message.status} · {message.provider}</small>{message.failureReason&&<strong className="message-failure">{message.failureReason}</strong>}</article>)}{!thread.length&&<div className="empty-thread"><b>No {channel} conversation yet</b><span>Create a personalized draft or choose a saved template below.</span></div>}</div><footer><MessageTemplateVault channel={channel} lead={selected} profile={profile} subject={subject} body={draft} onUse={(nextSubject,nextBody)=>{setSubject(nextSubject);setDraft(nextBody);setAiMode("template");setStatus(`Template personalized for ${selected.name}`)}} onProfileChange={onProfileChange}/>{aiMode&&<div className={`message-ai-mode ${aiMode}`}><b>{aiMode==="ai"?"Pacifica AI draft":aiMode==="template"?"Personalized template":"Pacifica Smart Fallback"}</b><span>Filled using this contact’s name, product, city, and your workspace details</span></div>}{channel==="email"&&<input className="email-subject-input" value={subject} onChange={event=>setSubject(event.target.value)} placeholder="Email subject"/>}<textarea value={draft} onChange={event=>setDraft(event.target.value)} placeholder={optedOut?"This channel is blocked":`Write a professional ${channel==="email"?"email":"text message"}…`} disabled={Boolean(optedOut)}/>{!consent&&!optedOut&&!selected.doNotCall&&<p className="message-consent-warning">Document {channel==="email"?"email permission":"SMS consent"} above before sending. You can still prepare a draft.</p>}<div><button onClick={()=>void generateSelected()} disabled={loading||Boolean(optedOut)}>{loading?"Preparing draft…":"Create personalized draft"}</button><button className="send-message" onClick={()=>void sendSelected()} disabled={loading||!draft.trim()||Boolean(optedOut)||selected.doNotCall||(channel==="email"&&(!subject.trim()||!selected.email))}>Send {channel==="email"?"email":"text message"}</button></div><small>{channel==="email"?"Sending requires a verified domain, documented permission, a business address, and unsubscribe handling.":"Marketing texts require documented consent. Pacifica blocks Do Not Call records and recognized STOP replies."}</small></footer></>:<div className="empty-thread"><b>No contact selected</b></div>}</section></div>
  </div>;
}

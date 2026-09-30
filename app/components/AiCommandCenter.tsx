/* eslint-disable @next/next/no-img-element */
"use client";
import {quoteLinkIntent} from "../lib/quote-link-intent";
import AiControlPanel from "./AiControlPanel";
import type {ControlCommand} from "../lib/ai-control";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import AiCamera from "./AiCamera";
import type {WorkspaceProfile} from "../lib/workspace-profile";
import {hasContactPermission} from "../lib/contact-permission";
import {explicitMessageTargets,messageChannel,cleanSmsDraft,oneTimeMessageAudience,audienceMessageTargets} from "../lib/ai-message-plan";
import {smsRecipients,emailRecipients} from "../lib/ai-sms-recipients";
import { leadPriority, rankLeads } from "../lib/lead-priority";

type Lead = {
  id:number;name:string;phone?:string;email?:string;city:string;stage:string;outcome:string;notes:string;followUp:string;lastContact:string;
  line:"life"|"home-auto";doNotCall:boolean;source:string;product:string;leadCost:number;importedAt:string;sourceDisposition:string;
  smsConsent?:boolean;smsOptOut?:boolean;emailConsent?:boolean;emailOptOut?:boolean;deletedAt?:string;automationEnabled?:boolean;
  received?:string;attempts?:number;lastAttemptAt?:string;priorityOverride?:"auto"|"high"|"low";
};
type RecentCall={name:string;startedAt:string;duration:number;outcome:string;status:string;source:string};

type AiAction={leadId:number;leadName:string;title:string;reason:string;patch:{stage:string|null;outcome:string|null;followUp:string|null;notesToAppend:string|null}};
export type AiCreateLead={name:string;phone:string;email:string;city:string;state:string;product:string;line:"life"|"home-auto";source:string;notes:string;otherFields:Array<{label:string;value:string}>};
type AiResult={controlCommands?:ControlCommand[];controlRevision?:number;controlChanges?:string[];controlError?:string;summary:string;priorities:Array<{leadId:number;leadName:string;score:number;reason:string;nextStep:string}>;actions:AiAction[];draft:string;subject?:string;channel?:"sms"|"email";recipientIds?:number[];createLead?:AiCreateLead|null;mode?:"ai"|"smart-fallback";notice?:string};
type AiImage={id:string;name:string;dataUrl:string};
const isPdf=(file:AiImage)=>file.dataUrl.startsWith("data:application/pdf;");
async function attachmentForAi(file:File){
 if(file.type==="application/pdf"||/\.pdf$/i.test(file.name)){
  if(file.size>2_800_000)throw new Error("Use a PDF under 2.8 MB, or split it into smaller files.");
  if(new TextDecoder().decode(await file.slice(0,5).arrayBuffer())!=="%PDF-")throw new Error("That file is not a valid PDF.");
  return new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).replace(/^data:[^;]*;/,"data:application/pdf;"));reader.onerror=()=>reject(new Error("Could not read that PDF."));reader.readAsDataURL(file)});
 }
 return imageForAi(file);
}

const quickPrompts=[
  {title:"Plan my calls",detail:"Who should I contact first today?",prompt:"Which leads should I call first today, and why?"},
  {title:"Find missed chances",detail:"Surface stalled opportunities",prompt:"Find stalled opportunities and give me the best next step for each one."},
  {title:"Prepare me",detail:"Create useful call briefs",prompt:"Prepare concise call briefs for my strongest leads."},
  {title:"Write a follow-up",detail:"Friendly, natural, and specific",prompt:"Draft a short, natural first follow-up for new leads. Let me choose the recipients."},
];

function browserAnalysis(leads:Lead[],notice:string):AiResult{
  const priorities=rankLeads(leads).slice(0,5).map(lead=>{const priority=leadPriority(lead);return {leadId:lead.id,leadName:lead.name,score:Math.max(0,priority.score),reason:priority.reason,nextStep:priority.detail}});
  return {summary:`I reviewed ${leads.length} active contact${leads.length===1?"":"s"}. Start with the first contacts below, then work scheduled follow-ups before untouched leads.`,priorities,actions:[],draft:"",createLead:null,mode:"smart-fallback",notice};
}

async function imageForAi(file:File){
  if(!/^image\/(jpeg|png|webp)$/i.test(file.type)&&!/\.(jpe?g|png|webp)$/i.test(file.name))throw new Error("Use a JPG, PNG, or WebP image.");
  if(file.size>12*1024*1024)throw new Error("That image is too large. Use a photo under 12 MB.");
  const bitmap=await createImageBitmap(file);
  try{
    const largest=Math.max(bitmap.width,bitmap.height);const scale=Math.min(1,1800/largest);const width=Math.max(1,Math.round(bitmap.width*scale));const height=Math.max(1,Math.round(bitmap.height*scale));
    const canvas=document.createElement("canvas");canvas.width=width;canvas.height=height;const context=canvas.getContext("2d");if(!context)throw new Error("Could not prepare that image.");
    context.imageSmoothingEnabled=true;context.imageSmoothingQuality="high";context.drawImage(bitmap,0,0,width,height);
    let quality=.9;let dataUrl=canvas.toDataURL("image/jpeg",quality);while(dataUrl.length>2_350_000&&quality>.55){quality-=.08;dataUrl=canvas.toDataURL("image/jpeg",quality)}
    if(dataUrl.length>2_500_000)throw new Error("Crop closer to the useful information and try again.");
    return dataUrl;
  }finally{bitmap.close()}
}

export default function AiCommandCenter({leads,recentCalls,onApply,onCreateLead,onOpen,onCall,workspaceId,profile,onActivity,onQuoteRequests,children,visible=false}:{children?:ReactNode;onQuoteRequests?:()=>void;visible?:boolean;onActivity:(state:"idle"|"working"|"sending"|"ready")=>void;workspaceId:string;activeLine:"life"|"home-auto";profile:WorkspaceProfile;leads:Lead[];recentCalls:RecentCall[];onApply:(action:AiAction)=>void;onCreateLead:(lead:AiCreateLead)=>void;onOpen:(leadId:number)=>void;onCall:(leadId:number)=>void}){
  const [toolsOpen,setToolsOpen]=useState(false),[showRules,setShowRules]=useState(false),[quoteLink,setQuoteLink]=useState("");
  const toolsRef=useRef<HTMLDivElement>(null);
  const [prompt,setPrompt]=useState("");const [submittedPrompt,setSubmittedPrompt]=useState("");const [submittedImages,setSubmittedImages]=useState<AiImage[]>([]);const [includeNotes,setIncludeNotes]=useState(false);const [loading,setLoading]=useState(false);const [result,setResult]=useState<AiResult|null>(null);const [error,setError]=useState("");const [applied,setApplied]=useState<number[]>([]);const [service,setService]=useState("Checking AI connection…");
  const [images,setImages]=useState<AiImage[]>([]);const [dragging,setDragging]=useState(false);const [created,setCreated]=useState(false);const imageInputRef=useRef<HTMLInputElement>(null);const [cameraOpen,setCameraOpen]=useState(false);
  const [sending,setSending]=useState(false);const [sendReport,setSendReport]=useState("");const submittedSms=useRef(new Set<string>());
  const [draftChannel,setDraftChannel]=useState<"sms"|"email">("sms");
  const composerRef=useRef<HTMLTextAreaElement>(null);
  useEffect(()=>{const field=composerRef.current;if(field){field.style.height="auto";field.style.height=`${Math.min(220,Math.max(48,field.scrollHeight))}px`}},[prompt,visible]);
  const [selectedRecipients,setSelectedRecipients]=useState<number[]>([]);
  const [requestLeadIds,setRequestLeadIds]=useState<number[]>([]);
  const [recipientSearch,setRecipientSearch]=useState("");
  const [emailReady,setEmailReady]=useState<{configured:boolean;message:string}>({configured:false,message:"Checking email…"});
  const [history,setHistory]=useState<Array<{role:"user"|"assistant";content:string}>>([]);
  const currentLeads=useRef(leads);
  const stopSending=useRef(false);
  const sendLock=useRef(false);
  const [requestId,setRequestId]=useState("");
  useEffect(()=>{currentLeads.current=leads},[leads]);
  const recipients=useMemo(()=>{
    const available=draftChannel==="sms"?smsRecipients(leads,lead=>hasContactPermission(lead,profile,"sms")):emailRecipients(leads,lead=>hasContactPermission(lead,profile,"email"));
    const ids=new Set(requestLeadIds);return available.filter(lead=>ids.has(lead.id));
  },[leads,profile,draftChannel,requestLeadIds]);
  const selectedSet=new Set(selectedRecipients);const targets=recipients.filter(lead=>selectedSet.has(lead.id));
  const eligible=useMemo(()=>leads.filter(lead=>!lead.deletedAt&&!lead.doNotCall&&lead.stage!=="Closed"),[leads]);
  useEffect(()=>{void fetch("/api/email/messages",{credentials:"same-origin",cache:"no-store"}).then(response=>response.json()).then(data=>setEmailReady({configured:Boolean(data.configured),message:data.message||data.error||"Email is not connected"})).catch(()=>setEmailReady({configured:false,message:"Could not check email. Open Messages → Email to reconnect."}))},[]);

  useEffect(()=>{void fetch("/api/ai/crm",{cache:"no-store",credentials:"same-origin"}).then(async response=>{const data=await response.json().catch(()=>({})) as {providerConfigured?:boolean;error?:string};if(!response.ok)throw new Error(data.error||"AI service check failed");setService(data.providerConfigured?"AI enabled":"Local suggestions")}).catch(error=>setService(error instanceof Error?error.message:"AI connection unavailable"))},[]);

  useEffect(()=>{if(!toolsOpen)return;const close=(e:PointerEvent)=>{if(e.target instanceof Node&&!toolsRef.current?.contains(e.target))setToolsOpen(false)};const key=(e:KeyboardEvent)=>{if(e.key==='Escape')setToolsOpen(false)};document.addEventListener('pointerdown',close);document.addEventListener('keydown',key);return()=>{document.removeEventListener('pointerdown',close);document.removeEventListener('keydown',key)}},[toolsOpen]);
  useEffect(()=>{if(!visible)queueMicrotask(()=>{setQuoteLink('');setToolsOpen(false)})},[visible]);
  async function addFiles(files:FileList|File[]){
    const incoming=Array.from(files);if(!incoming.length)return;
    if(incoming.length+images.length>4){setError("Attach up to four files at a time.");return}
    try{const prepared=await Promise.all(incoming.map(async file=>({id:crypto.randomUUID(),name:file.name,dataUrl:await attachmentForAi(file)})));
      if([...images,...prepared].reduce((sum,file)=>sum+file.dataUrl.length,0)>3_800_000)throw new Error("These attachments are too large together. Send fewer files at a time.");
      setImages(current=>[...current,...prepared].slice(0,4));setError("");
    }catch(err){setError(err instanceof Error?err.message:"Could not attach that file")}

  }

  async function run(nextPrompt=prompt){
    const typed=nextPrompt.trim();const question=typed||images.length?typed||"Read the attached files and summarize their contents. Do not create a contact unless I ask.":"";if(!question||loading||sending)return;
    setQuoteLink("");setToolsOpen(false);
    const requestImages=[...images];setPrompt(typed);setLoading(true);setError("");setApplied([]);setCreated(false);setSendReport("");submittedSms.current.clear();setSelectedRecipients([]);setRequestLeadIds(eligible.map(lead=>lead.id));setRequestId(crypto.randomUUID());const channel=messageChannel(question,result?draftChannel:"sms");setDraftChannel(channel);
    const quote=images.length?null:quoteLinkIntent(question,leads);
    try{
      if(quote){if('error' in quote)throw Error(quote.error);const response=await fetch('/api/crm/opportunities',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'create-link',leadId:quote.leadId,source:'Pacifica AI quote request'})});const data=await response.json();if(!response.ok)throw Error(data.error||'Quote link could not be created.');if(typeof data.path!=='string'||!data.path.startsWith('/quote-request#'))throw Error('Quote link could not be created.');setQuoteLink(new URL(data.path,window.location.origin).href);setSubmittedPrompt(question);setSubmittedImages([]);setResult({summary:'Your new quote link is ready. Copy it to share. It expires in 7 days; this screen clears it after copying or leaving Pacifica AI.',priorities:[],actions:[],draft:''});setPrompt('');return;}
      const response=await fetch("/api/ai/crm",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt:question,includeNotes,images:images.filter(image=>!isPdf(image)).map(image=>image.dataUrl),documents:images.filter(isPdf).map(({name,dataUrl})=>({name,dataUrl})),leads:eligible.slice(0,100),recentCalls:recentCalls.slice(0,100),history:history.slice(-6)})});
      const data=await response.json().catch(()=>({})) as AiResult&{error?:string};if(!response.ok)throw new Error(data.error||"Pacifica could not complete that request");setSubmittedPrompt(question);setSubmittedImages(requestImages);setResult({...data,draft:channel==="sms"?cleanSmsDraft(data.draft||""):data.draft||""});setPrompt("");setImages([]);
      const available=(channel==="sms"?smsRecipients(leads,lead=>hasContactPermission(lead,profile,"sms")):emailRecipients(leads,lead=>hasContactPermission(lead,profile,"email"))).filter(lead=>eligible.some(item=>item.id===lead.id));
      const named=explicitMessageTargets(question,leads);
      const audience=oneTimeMessageAudience(question);
      const audienceTargets=audience?audienceMessageTargets(audience,leads):[];
      const proposed=named.length?available.filter(lead=>named.some(item=>item.id===lead.id)):audience?available.filter(lead=>audienceTargets.some(item=>item.id===lead.id)):available.filter(lead=>data.recipientIds?.includes(lead.id));
      setSelectedRecipients(proposed.map(lead=>lead.id));
      if(audience){setRequestLeadIds(proposed.map(lead=>lead.id));setResult(previous=>previous?{...previous,summary:`${proposed.length} eligible ${audience==="follow-ups"?"follow-up contacts":"contacts"} selected from your full workspace. Interested, closed and paused contacts are excluded.`}:previous)}
      setHistory(items=>[...items,{role:"user" as const,content:question},{role:"assistant" as const,content:data.summary+(data.draft?`\nDraft: ${data.draft}`:"")}].slice(-6));

    }catch(err){const message=err instanceof Error?err.message:"Pacifica could not complete that request";setError(message);if(!quote&&eligible.length){setSubmittedPrompt(question);setSubmittedImages(requestImages);setResult(browserAnalysis(eligible.slice(0,100),"Pacifica used local suggestions because the AI service did not answer."))}}
    finally{setLoading(false)}
  }

  async function sendDraft(){
    if(sendLock.current||!result?.draft.trim()||!targets.length)return;
    const body=draftChannel==="sms"?cleanSmsDraft(result.draft):result.draft.trim();
    if(draftChannel==="sms"&&body.length>1400){setSendReport("Shorten this text to 1,400 characters before sending.");return}
    if(draftChannel==="email"&&(!result.subject?.trim()||!emailReady.configured)){setSendReport("Add a subject and connect email in Messages before sending.");return}
    sendLock.current=true;stopSending.current=false;setSending(true);
    let submitted=0,failed=0,skipped=0;const failures:string[]=[];const planned=[...targets];const channel=draftChannel;
    try{
      for(const contact of planned){
        if(stopSending.current)break;
        const eligibleNow=channel==="sms"?smsRecipients(currentLeads.current,lead=>hasContactPermission(lead,profile,"sms")):emailRecipients(currentLeads.current,lead=>hasContactPermission(lead,profile,"email"));
        const current=eligibleNow.find(lead=>lead.id===contact.id);
        if(!current||current.phone!==contact.phone||current.email!==contact.email){skipped++;continue}
        const key=`${channel}:${channel==="sms"?contact.phone:contact.email}:${result.subject||""}:${body}`;
        if(submittedSms.current.has(key)){skipped++;continue}
        // Mark attempts before dispatch. A lost response must not cause an automatic duplicate.
        submittedSms.current.add(key);
        try{
          const payload=channel==="sms"?{to:contact.phone,body,sendMode:"ai"}:{to:contact.email,leadId:contact.id,subject:result.subject,text:body,sendMode:"ai",fromName:profile.businessName||profile.agentName,replyTo:profile.replyToEmail,idempotencyKey:`ai:${workspaceId}:${requestId}:${contact.id}`};
          const response=await fetch(channel==="sms"?"/api/twilio/messages":"/api/email/messages",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload),signal:AbortSignal.timeout(25000)});
          const data=await response.json();if(!response.ok)throw new Error(data.error||"Send failed");
          submitted++;
        }catch(reason){failed++;failures.push(`${contact.name}: ${reason instanceof Error?reason.message:"Submission unconfirmed; check Messages before retrying."}`)}
        setSendReport(`${submitted} of ${planned.length} submitted · ${failed} failed/unconfirmed · ${skipped} skipped`);
      }
      setSendReport(`${submitted} submitted · ${failed} failed/unconfirmed · ${skipped} skipped${stopSending.current?" · remaining messages cancelled":""}. Check Messages for delivery status.${failures.length?" Issues: "+failures.slice(0,5).join("; "):""}`);
    }finally{sendLock.current=false;setSending(false)}
  }

  function reset(){setQuoteLink("");setSubmittedPrompt("");setSubmittedImages([]);setResult(null);setPrompt("");setError("");setImages([]);setCreated(false);setHistory([]);setSelectedRecipients([])}
  const seenResult=useRef<AiResult|null>(null);
  useEffect(()=>{
    if(visible)seenResult.current=result;
    onActivity(loading?"working":sending?"sending":result&&seenResult.current!==result?"ready":"idle");
  },[loading,sending,result,visible,onActivity]);
  const displayPrompt=submittedPrompt;
  const hasDetails=Boolean(result&&(result.controlCommands?.length||result.controlError||result.createLead||result.priorities.length||result.actions.length||result.draft));
  return <div className={`ai-workspace ${hasDetails?"has-details":""}`} onDragEnter={event=>{if(Array.from(event.dataTransfer.types).includes("Files")){event.preventDefault();setDragging(true)}}} onDragOver={event=>{if(Array.from(event.dataTransfer.types).includes("Files")){event.preventDefault();event.dataTransfer.dropEffect="copy"}}} onDragLeave={event=>{if(event.currentTarget===event.target)setDragging(false)}} onDrop={event=>{event.preventDefault();event.stopPropagation();setDragging(false);void addFiles(event.dataTransfer.files)}}>
    {dragging&&<div className="ai-drop-overlay"><div><b>Drop photos or PDFs into Pacifica AI</b><span>I’ll read it together with your instructions.</span></div></div>}
    <header className="ai-shell-header"><div className="ai-shell-brand"><i>P</i><span><b>Pacifica AI</b><small role="status">{loading?"Working — you can switch CRM tabs":sending?"Sending — you can switch CRM tabs":service}</small></span></div><label className="ai-notes-control"><input type="checkbox" checked={includeNotes} onChange={event=>setIncludeNotes(event.target.checked)}/><span><b>Use CRM notes</b></span></label></header>
    <div className="ai-content-layout">
    <main className={result?"ai-chat answered":"ai-chat"}>
      {!result?<section className="ai-welcome"><h1>How can I help?</h1><p>Attach a photo or PDF, create a contact, or ask about your CRM.</p></section>:<section className="ai-conversation" aria-live="polite"><div className="ai-user-message"><span>You</span><p>{displayPrompt}</p>{submittedImages.length>0&&<div className="ai-message-images">{submittedImages.map(image=>isPdf(image)?<span key={image.id} className="ai-pdf-file">PDF · {image.name}</span>:<img key={image.id} src={image.dataUrl} alt={image.name}/>)}</div>}</div><div className="ai-assistant-message"><i>P</i><div><header><b>Pacifica</b><em className={result.mode==="smart-fallback"?"fallback":""}>{result.mode==="smart-fallback"?"Local suggestions":""}</em></header><p>{result.summary}</p>{result.notice&&<small>{result.notice}</small>}</div></div></section>}

      {!result&&<section className="ai-starters">{quickPrompts.map(item=><button key={item.title} onClick={()=>void run(item.prompt)} disabled={!eligible.length||loading||sending}><b>{item.title}</b><span>{item.detail}</span><em>→</em></button>)}</section>}

      {cameraOpen&&<AiCamera onClose={()=>setCameraOpen(false)} onCapture={file=>void addFiles([file])}/>}
      <section aria-label="Message composer" className={`ai-chat-composer ${images.length?"has-images":""}`} onPaste={event=>{const files=Array.from(event.clipboardData.files).filter(file=>file.type.startsWith("image/"));if(files.length)void addFiles(files)}}>
        {images.length>0&&<div className="ai-attachments">{images.map(image=><figure key={image.id}>{isPdf(image)?<span className="ai-pdf-file">PDF</span>:<img src={image.dataUrl} alt={image.name}/>}<button type="button" aria-label={`Remove ${image.name}`} onClick={()=>setImages(current=>current.filter(item=>item.id!==image.id))}>×</button><figcaption>{image.name}</figcaption></figure>)}{images.length<4&&<button type="button" className="ai-add-image" onClick={()=>imageInputRef.current?.click()}>＋ Add file</button>}</div>}
        <div className="ai-composer-row"><div className="ai-tools" ref={toolsRef}><button type="button" className="ai-attach-button" title="Add to your request" aria-label="Open AI tools" aria-expanded={toolsOpen} onClick={()=>setToolsOpen(open=>!open)}>+</button>{toolsOpen&&<div className="ai-tools-menu" aria-label="AI tools"><button type="button" disabled={loading||images.length>=4} onClick={()=>{setToolsOpen(false);setCameraOpen(true)}}>Use camera</button><button type="button" disabled={loading||images.length>=4} onClick={()=>{setToolsOpen(false);imageInputRef.current?.click()}}>Attach photo or PDF</button><button type="button" onClick={()=>{setShowRules(show=>!show);setToolsOpen(false)}}>Saved outreach rules</button>{onQuoteRequests&&<button type="button" onClick={()=>{onQuoteRequests();setToolsOpen(false)}}>Quote requests</button>}</div>}</div><textarea ref={composerRef} aria-label="Message Pacifica AI" value={prompt} onChange={event=>setPrompt(event.target.value)} onKeyDown={event=>{if(event.key==="Enter"&&!event.shiftKey&&!event.nativeEvent.isComposing){event.preventDefault();void run()}}} disabled={loading||sending} placeholder="Message Pacifica…" rows={1}/><button onClick={()=>void run()} disabled={loading||(!prompt.trim()&&!images.length)} aria-label="Send to Pacifica AI">{loading?<span className="ai-thinking"/>:"↑"}</button></div>
        <input ref={imageInputRef} hidden type="file" accept="image/jpeg,image/png,image/webp,application/pdf,.pdf" multiple onChange={event=>{if(event.currentTarget.files)void addFiles(event.currentTarget.files);event.currentTarget.value=""}}/>

      </section>
      {!result&&!eligible.length&&!images.length&&<p className="ai-error">Import contacts for contact analysis, or attach a photo or PDF to read.</p>}{error&&<p className="ai-error">{error}</p>}
      {quoteLink&&<div className="ai-quote-link"><label>New quote link<input readOnly value={quoteLink} onFocus={e=>e.target.select()}/></label><button onClick={()=>void navigator.clipboard.writeText(quoteLink).then(()=>setQuoteLink('')).catch(()=>setError('Select and copy the link from the field.'))}>Copy link</button><button onClick={()=>setQuoteLink('')}>Done</button></div>}
      <AiControlPanel showRules={showRules} key={requestId} requestKey={requestId} commands={loading?[]:result?.controlCommands} revision={result?.controlRevision} changes={result?.controlChanges} error={result?.controlError}/>
      {children}
    </main>

    {hasDetails&&result&&<aside className="ai-results" aria-label="CRM suggestions">
      {result.createLead&&<section className={`ai-create-lead-card ${created?"created":""}`}><header><div><span>{created?"ADDED TO CONTACTS":"NEW CONTACT FROM ATTACHMENT"}</span><h2>{result.createLead.name||"New lead"}</h2></div><em>{result.createLead.line==="home-auto"?"HOME & AUTO":"LIFE / PRIORITY"}</em></header><div className="ai-contact-review">{(["name","phone","email","city","state","product","notes"] as const).map(key=><label key={key}>{key.charAt(0).toUpperCase()+key.slice(1)}<input aria-label={`Contact ${key}`} disabled={created||loading} value={result.createLead![key]} onChange={event=>{const value=event.target.value;setResult(current=>current?.createLead?{...current,createLead:{...current.createLead,[key]:value}}:current)}}/></label>)}<label>Queue<select disabled={created||loading} value={result.createLead.line} onChange={event=>{const line=event.target.value==="home-auto"?"home-auto":"life";setResult(current=>current?.createLead?{...current,createLead:{...current.createLead,line}}:current)}}><option value="home-auto">Home &amp; Auto</option><option value="life">Life / Priority</option></select></label></div><p>{created?"Contact added to Pacifica.":"Check the extracted details before adding this contact."}</p>{!created&&<button type="button" disabled={loading||sending} onClick={()=>{const contact=result.createLead!;if(!contact.phone.trim()&&!contact.email.trim()){setError("Add a phone number or email before saving.");return;}onCreateLead(contact);setCreated(true)}}>Add to Contacts</button>}</section>}
      {result.priorities.length>0&&<section className="ai-priority-panel"><header><div><h2>Priority contacts</h2></div><em>{result.priorities.length} leads</em></header>{result.priorities.map(item=><article key={`${item.leadId}-${item.score}`}><strong>{item.score}</strong><div><b>{item.leadName}</b><p>{item.reason}</p><small>{item.nextStep}</small></div><footer><button onClick={()=>onOpen(item.leadId)}>Open</button><button onClick={()=>onCall(item.leadId)}>Call now</button></footer></article>)}</section>}
      {result.actions.length>0&&<section className="ai-actions-panel"><header><div><h2>Suggested updates</h2></div></header>{result.actions.map((action,index)=><article key={`${action.leadId}-${index}`}><div><b>{action.title}</b><span>{action.leadName}</span><p>{action.reason}</p></div><button disabled={applied.includes(index)} onClick={()=>{onApply(action);setApplied(items=>[...items,index])}}>{applied.includes(index)?"Applied":"Apply"}</button></article>)}</section>}
      {result.draft&&<section className="ai-draft-card"><header><span>{draftChannel==="email"?"EMAIL":"TEXT MESSAGE"}</span><button onClick={()=>void navigator.clipboard.writeText(result.draft)}>Copy</button></header>
        <div className="ai-channel-choice" role="group" aria-label="Send channel">{(["sms","email"] as const).map(channel=><button key={channel} type="button" disabled={sending} aria-pressed={draftChannel===channel} onClick={()=>{setDraftChannel(channel);setSelectedRecipients([])}}>{channel==="sms"?"Text":"Email"}</button>)}</div>
        {draftChannel==="email"&&<label className="ai-subject">Subject<input aria-label="Email subject" disabled={sending} value={result.subject||""} onChange={event=>setResult(current=>current?{...current,subject:event.target.value}:current)}/></label>}
        <textarea aria-label="Review message before sending" value={result.draft} disabled={sending} onChange={event=>{const draft=event.target.value;setResult(current=>current?{...current,draft}:current)}}/>
        <div className="ai-recipient-review"><b>Recipients · {targets.length} selected</b><p>Closed, opted-out, Do Not Call, deleted, wrong-number, and not-interested records stay out. Open follow-ups can be included in one-time owner-reviewed sends.</p>
          <input aria-label="Search message recipients" placeholder="Find a recipient" value={recipientSearch} onChange={event=>setRecipientSearch(event.target.value)}/>
          <div className="ai-recipient-list">{recipients.filter(lead=>[lead.name,lead.phone,lead.email].some(value=>String(value||"").toLowerCase().includes(recipientSearch.toLowerCase()))).map(lead=><label key={lead.id}><input type="checkbox" disabled={sending} checked={selectedRecipients.includes(lead.id)} onChange={event=>setSelectedRecipients(ids=>event.target.checked?[...ids,lead.id]:ids.filter(id=>id!==lead.id))}/><span><b>{lead.name}</b><small>{draftChannel==="email"?lead.email:lead.phone}</small></span></label>)}</div>
          {!recipients.length&&<p>No eligible recipients in this request. Closed, opted-out, DNC, deleted, terminal, and email-permission-blocked records are excluded.</p>}
        </div>
        {draftChannel==="email"&&!emailReady.configured&&<p role="status">Email needs setup. Open Messages → Email. {emailReady.message}</p>}
        <p>{draftChannel==="sms"?`${result.draft.length}/1,400 characters`:`${profile.businessAddress?"Business address will be included":"Add your business mailing address in Settings"}`}</p>
        <button type="button" disabled={sending||!result.draft.trim()||!targets.length||(draftChannel==="sms"&&result.draft.length>1400)||(draftChannel==="email"&&(!emailReady.configured||!result.subject?.trim()||!profile.businessAddress))} onClick={()=>void sendDraft()}>{sending?"Sending…":`Send ${draftChannel==="email"?"email":"text"} to ${targets.length} selected ${targets.length===1?"contact":"contacts"}`}</button>
        {sending&&<button type="button" onClick={()=>{stopSending.current=true;setSendReport("Stopping after the current message…")}}>Stop remaining messages</button>}
        <p role="status">{sendReport}</p></section>}

    </aside>}
    </div>
    {result&&<button type="button" className="ai-new-chat" onClick={reset} disabled={loading||sending}>New request</button>}
  </div>;
}

export type {AiAction};

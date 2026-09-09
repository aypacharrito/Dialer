/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { leadPriority, rankLeads } from "../lib/lead-priority";

type Lead = {
  id:number;name:string;phone?:string;email?:string;city:string;stage:string;outcome:string;notes:string;followUp:string;lastContact:string;
  line:"life"|"home-auto";doNotCall:boolean;source:string;product:string;leadCost:number;importedAt:string;sourceDisposition:string;
  received?:string;attempts?:number;lastAttemptAt?:string;priorityOverride?:"auto"|"high"|"low";
};
type RecentCall={name:string;startedAt:string;duration:number;outcome:string;status:string;source:string};

type AiAction={leadId:number;leadName:string;title:string;reason:string;patch:{stage:string|null;outcome:string|null;followUp:string|null;notesToAppend:string|null}};
export type AiCreateLead={name:string;phone:string;email:string;city:string;state:string;product:string;line:"life"|"home-auto";source:string;notes:string;otherFields:Array<{label:string;value:string}>};
type AiResult={summary:string;priorities:Array<{leadId:number;leadName:string;score:number;reason:string;nextStep:string}>;actions:AiAction[];draft:string;createLead?:AiCreateLead|null;mode?:"ai"|"smart-fallback";notice?:string};
type AiImage={id:string;name:string;dataUrl:string};

const quickPrompts=[
  {title:"Plan my calls",detail:"Who should I contact first today?",prompt:"Which leads should I call first today, and why?"},
  {title:"Find missed chances",detail:"Surface stalled opportunities",prompt:"Find stalled opportunities and give me the best next step for each one."},
  {title:"Prepare me",detail:"Create useful call briefs",prompt:"Prepare concise call briefs for my strongest leads."},
  {title:"Write a follow-up",detail:"Friendly, natural, and specific",prompt:"Draft a friendly business-casual follow-up for my interested prospects."},
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

export default function AiCommandCenter({leads,recentCalls,onApply,onCreateLead,onOpen,onCall}:{leads:Lead[];recentCalls:RecentCall[];onApply:(action:AiAction)=>void;onCreateLead:(lead:AiCreateLead)=>void;onOpen:(leadId:number)=>void;onCall:(leadId:number)=>void}){
  const [prompt,setPrompt]=useState("");const [includeNotes,setIncludeNotes]=useState(false);const [loading,setLoading]=useState(false);const [result,setResult]=useState<AiResult|null>(null);const [error,setError]=useState("");const [applied,setApplied]=useState<number[]>([]);const [service,setService]=useState("Checking AI connection…");
  const [images,setImages]=useState<AiImage[]>([]);const [dragging,setDragging]=useState(false);const [created,setCreated]=useState(false);const imageInputRef=useRef<HTMLInputElement>(null);
  const eligible=useMemo(()=>leads.filter(lead=>!lead.doNotCall&&lead.stage!=="Closed"),[leads]);

  useEffect(()=>{void fetch("/api/ai/crm",{cache:"no-store",credentials:"same-origin"}).then(async response=>{const data=await response.json().catch(()=>({})) as {providerConfigured?:boolean;error?:string};if(!response.ok)throw new Error(data.error||"AI service check failed");setService(data.providerConfigured?"AI vision + CRM ready":"Smart fallback ready")}).catch(error=>setService(error instanceof Error?error.message:"AI connection unavailable"))},[]);

  async function addFiles(files:FileList|File[]){
    const incoming=Array.from(files).filter(file=>/^image\/(jpeg|png|webp)$/i.test(file.type)||/\.(jpe?g|png|webp)$/i.test(file.name)).slice(0,4-images.length);if(!incoming.length)return;
    try{const prepared=await Promise.all(incoming.map(async file=>({id:crypto.randomUUID(),name:file.name,dataUrl:await imageForAi(file)})));setImages(current=>[...current,...prepared].slice(0,4));setError("")}
    catch(err){setError(err instanceof Error?err.message:"Could not attach that image")}
  }

  async function run(nextPrompt=prompt){
    const typed=nextPrompt.trim();const question=typed||images.length?typed||"Read the attached image and take the appropriate CRM action based only on what is visible.":"";if(!question||loading)return;
    setPrompt(typed);setLoading(true);setError("");setApplied([]);setCreated(false);
    try{
      const response=await fetch("/api/ai/crm",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt:question,includeNotes,images:images.map(image=>image.dataUrl),leads:eligible.slice(0,100),recentCalls:recentCalls.slice(0,100)})});
      const data=await response.json().catch(()=>({})) as AiResult&{error?:string};if(!response.ok)throw new Error(data.error||"Pacifica could not complete that request");setResult(data);
      if(data.createLead){onCreateLead(data.createLead);setCreated(true)}
    }catch(err){const message=err instanceof Error?err.message:"Pacifica could not complete that request";setError(`Server connection: ${message}.`);if(eligible.length)setResult(browserAnalysis(eligible.slice(0,100),"Pacifica used the secure browser fallback because the server AI route did not answer."))}
    finally{setLoading(false)}
  }

  function reset(){setResult(null);setPrompt("");setError("");setImages([]);setCreated(false)}
  const displayPrompt=prompt.trim()||"Attached image";
  return <div className="ai-workspace" onDragEnter={event=>{if(Array.from(event.dataTransfer.types).includes("Files")){event.preventDefault();setDragging(true)}}} onDragOver={event=>{if(Array.from(event.dataTransfer.types).includes("Files")){event.preventDefault();event.dataTransfer.dropEffect="copy"}}} onDragLeave={event=>{if(event.currentTarget===event.target)setDragging(false)}} onDrop={event=>{event.preventDefault();setDragging(false);void addFiles(event.dataTransfer.files)}}>
    {dragging&&<div className="ai-drop-overlay"><div><b>Drop image into Pacifica AI</b><span>I’ll read it together with your instructions.</span></div></div>}
    <header className="ai-shell-header"><div className="ai-shell-brand"><i>P</i><span><b>Pacifica AI</b><small>{service}</small></span></div><label className="ai-notes-control"><input type="checkbox" checked={includeNotes} onChange={event=>setIncludeNotes(event.target.checked)}/><span><b>Use CRM notes</b><small>Off by default</small></span></label></header>
    <main className={result?"ai-chat answered":"ai-chat"}>
      {!result?<section className="ai-welcome"><div className="ai-mark">P</div><h1>How can I help?</h1><p>Ask about your CRM or drop a picture and tell Pacifica what to do.</p></section>:<section className="ai-conversation" aria-live="polite"><div className="ai-user-message"><span>You</span><p>{displayPrompt}</p>{images.length>0&&<div className="ai-message-images">{images.map(image=><img key={image.id} src={image.dataUrl} alt={image.name}/>)}</div>}</div><div className="ai-assistant-message"><i>P</i><div><header><b>Pacifica</b><em className={result.mode==="smart-fallback"?"fallback":""}>{result.mode==="smart-fallback"?"SMART FALLBACK":"AI ANALYSIS"}</em></header><p>{result.summary}</p>{result.notice&&<small>{result.notice}</small>}</div></div></section>}

      {!result&&<section className="ai-starters">{quickPrompts.map(item=><button key={item.title} onClick={()=>void run(item.prompt)} disabled={!eligible.length||loading}><b>{item.title}</b><span>{item.detail}</span><em>→</em></button>)}</section>}
      <section className={`ai-chat-composer ${images.length?"has-images":""}`} onPaste={event=>{const files=Array.from(event.clipboardData.files).filter(file=>file.type.startsWith("image/"));if(files.length)void addFiles(files)}}>
        {images.length>0&&<div className="ai-attachments">{images.map(image=><figure key={image.id}><img src={image.dataUrl} alt={image.name}/><button type="button" aria-label={`Remove ${image.name}`} onClick={()=>setImages(current=>current.filter(item=>item.id!==image.id))}>×</button><figcaption>{image.name}</figcaption></figure>)}{images.length<4&&<button type="button" className="ai-add-image" onClick={()=>imageInputRef.current?.click()}>＋ Add image</button>}</div>}
        <div className="ai-composer-row"><button type="button" className="ai-attach-button" title="Attach image" aria-label="Attach image" onClick={()=>imageInputRef.current?.click()}>＋</button><textarea aria-label="Message Pacifica AI" value={prompt} onChange={event=>setPrompt(event.target.value)} onKeyDown={event=>{if(event.key==="Enter"&&!event.shiftKey&&!event.nativeEvent.isComposing){event.preventDefault();void run()}}} placeholder="Ask Pacifica anything — or drop/paste a picture here…" rows={2}/><button onClick={()=>void run()} disabled={loading||(!prompt.trim()&&!images.length)} aria-label="Send to Pacifica AI">{loading?<span className="ai-thinking"/>:"↑"}</button></div>
        <input ref={imageInputRef} hidden type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={event=>{if(event.currentTarget.files)void addFiles(event.currentTarget.files);event.currentTarget.value=""}}/>
        <footer><span>Drag, paste, or attach images · Enter to send</span></footer>
      </section>
      {!eligible.length&&!images.length&&<p className="ai-error">Import contacts for pipeline analysis, or attach an image to create/read a lead.</p>}{error&&<p className="ai-error">{error}</p>}
    </main>

    {result&&<div className="ai-results">
      {result.createLead&&<section className={`ai-create-lead-card ${created?"created":""}`}><header><div><span>{created?"ADDED TO CONTACTS":"NEW CONTACT FROM IMAGE"}</span><h2>{result.createLead.name||"New lead"}</h2></div><em>{result.createLead.line==="home-auto"?"HOME & AUTO":"LIFE / PRIORITY"}</em></header><dl><div><dt>Phone</dt><dd>{result.createLead.phone||"—"}</dd></div><div><dt>Email</dt><dd>{result.createLead.email||"—"}</dd></div><div><dt>Product</dt><dd>{result.createLead.product||"Service inquiry"}</dd></div><div><dt>Source</dt><dd>{result.createLead.source||"Pacifica AI image"}</dd></div></dl><p>{created?"Pacifica loaded this contact into the correct CRM queue. Duplicate phone/email matches are enriched instead of duplicated.":"This contact is ready to add."}</p>{!created&&<button type="button" onClick={()=>{onCreateLead(result.createLead!);setCreated(true)}}>Add to Contacts</button>}</section>}
      {result.priorities.length>0&&<section className="ai-priority-panel"><header><div><span>BEST NEXT CONVERSATIONS</span><h2>Your priority queue</h2></div><em>{result.priorities.length} leads</em></header>{result.priorities.map(item=><article key={`${item.leadId}-${item.score}`}><strong>{item.score}</strong><div><b>{item.leadName}</b><p>{item.reason}</p><small>{item.nextStep}</small></div><footer><button onClick={()=>onOpen(item.leadId)}>Open</button><button onClick={()=>onCall(item.leadId)}>Call now</button></footer></article>)}{!result.priorities.length&&<p className="ai-empty">No existing priority contacts matched this request.</p>}</section>}
      {result.actions.length>0&&<section className="ai-actions-panel"><header><div><span>YOU STAY IN CONTROL</span><h2>Suggested CRM updates</h2></div></header>{result.actions.map((action,index)=><article key={`${action.leadId}-${index}`}><div><b>{action.title}</b><span>{action.leadName}</span><p>{action.reason}</p></div><button disabled={applied.includes(index)} onClick={()=>{onApply(action);setApplied(items=>[...items,index])}}>{applied.includes(index)?"Applied":"Apply"}</button></article>)}{!result.actions.length&&<p className="ai-empty">No existing-record changes were suggested.</p>}</section>}
      {result.draft&&<section className="ai-draft-card"><header><span>MESSAGE DRAFT</span><button onClick={()=>void navigator.clipboard.writeText(result.draft)}>Copy</button></header><p>{result.draft}</p></section>}
      <button className="ai-new-chat" onClick={reset}>＋ Start a new request</button>
    </div>}
  </div>;
}

export type {AiAction};

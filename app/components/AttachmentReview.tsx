"use client";
import {useEffect,useRef,useState} from 'react';
import type {StoredCommunication} from '../lib/communications';
type Contact={id:number;name:string;communications?:StoredCommunication[]};
export default function AttachmentReview({leads}:{leads:Contact[]}){
 const [leadId,setLeadId]=useState(''),[status,setStatus]=useState(''),[busy,setBusy]=useState(false);
 const input=useRef<HTMLInputElement>(null),running=useRef(false),reviewed=useRef(new Set<string>()),current=useRef(leads);
 useEffect(()=>{current.current=leads},[leads]);
 async function review(body:Record<string,unknown>){
  if(running.current)return;running.current=true;setBusy(true);
  try{const response=await fetch('/api/crm/review-attachment',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await response.json();if(!response.ok)throw Error(data.error||'File review failed.');setStatus(data.alreadyReviewed?'Already reviewed.':`${data.added} document details added to Today for review.`);window.dispatchEvent(new Event('pacifica:ai-review'));}
  catch(error){setStatus(error instanceof Error?error.message:'File review failed.')}
  finally{running.current=false;setBusy(false)}
 }
 useEffect(()=>{
  const check=async()=>{
   if(running.current||document.visibilityState==='hidden')return;
   for(const contact of current.current)for(const message of contact.communications||[])for(const [index,file] of (message.attachments||[]).entries()){
    if(!/^(image\/(jpeg|png|webp)|application\/pdf)$/.test(file.type)||!/^\/api\/(message-media|email\/media|twilio\/messages)\//.test(file.url))continue;
    const key=`${contact.id}:${message.id}:${index}:${file.url}`;if(reviewed.current.has(key))continue;
    reviewed.current.add(key);await review({leadId:contact.id,messageId:message.id,index});return;
   }
  };
  const start=window.setTimeout(()=>void check(),1500),timer=window.setInterval(()=>void check(),60000);
  return()=>{clearTimeout(start);clearInterval(timer)};
 },[]);
 async function upload(file:File){
  if(!leadId){setStatus('Choose the contact this document belongs to.');return}
  if(file.size>2_700_000){setStatus('Choose a file smaller than 2.7 MB.');return}
  if(!/^(image\/(jpeg|png|webp)|application\/pdf)$/.test(file.type)){setStatus('Use JPEG, PNG, WebP or PDF.');return}
  const data=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(Error('File could not be read.'));reader.readAsDataURL(file)});
  await review({leadId:Number(leadId),fileName:file.name,...(file.type==='application/pdf'?{pdf:data}:{image:data})});
 }
 return <details className="public-business-search"><summary>Pictures & documents</summary><p>Saved CRM pictures and PDFs are reviewed one at a time while Today is open. Extracted details appear as suggestions here; contact fields stay unchanged. Files behind unsupported external links can be uploaded below.</p><div className="public-records-controls"><label>Contact<select value={leadId} onChange={event=>setLeadId(event.target.value)} disabled={busy}><option value="">Choose a contact</option>{leads.map(lead=><option key={lead.id} value={lead.id}>{lead.name}</option>)}</select></label><button disabled={busy||!leadId} onClick={()=>input.current?.click()}>{busy?'Reading…':'Review picture / PDF'}</button><button disabled={busy} onClick={()=>{reviewed.current.clear();setStatus('Saved attachments will be checked again on the next review.')}}>Retry saved files</button><input ref={input} type="file" hidden accept="image/jpeg,image/png,image/webp,application/pdf" onChange={event=>{const file=event.target.files?.[0];event.target.value='';if(file)void upload(file).catch(()=>setStatus('File could not be read.'))}}/></div><p role="status">{status}</p></details>;
}

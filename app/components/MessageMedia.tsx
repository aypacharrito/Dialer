"use client";
/* eslint-disable @next/next/no-img-element -- Authenticated message media must bypass the public image optimizer. */
import {useEffect,useState} from 'react';
import {cleanMessageAttachments,type MessageAttachment} from '../lib/message-attachments';
export default function MessageMedia({messageId,mediaCount=0,attachments=[]}:{messageId:string;mediaCount?:number;attachments?:MessageAttachment[]}){
 const [remote,setRemote]=useState<MessageAttachment[]>([]),[error,setError]=useState(false),[attempt,setAttempt]=useState(0);
 const [preview,setPreview]=useState<string|null>(null);
 useEffect(()=>{
  if(!mediaCount||attachments.length)return;
  const controller=new AbortController();
  void fetch(`/api/twilio/messages/${encodeURIComponent(messageId)}/media`,{signal:controller.signal,credentials:'same-origin'}).then(async response=>{if(!response.ok)throw Error();const data=await response.json();const files=cleanMessageAttachments(data.attachments);if(!files.length)throw Error();setRemote(files);setError(false)}).catch(()=>{if(!controller.signal.aborted)setError(true)});
  return()=>controller.abort();
 },[messageId,mediaCount,attachments.length,attempt]);
 const files=cleanMessageAttachments(attachments.length?attachments:remote);
 if(!files.length&&!mediaCount)return null;
 return <div className="message-media">
  {!files.length&&(error?<button onClick={()=>setAttempt(value=>value+1)}>Retry attachments</button>:<span role="status">Loading attachments…</span>)}
  {files.map(file=><div className="message-media-file" key={file.url}>
   {/^image\/(jpeg|jpg|png|gif|webp)$/i.test(file.type)?<a href={file.url} target="_blank" rel="noreferrer"><img src={file.url} alt={file.name} loading="lazy" decoding="async" onLoad={()=>{const history=document.querySelector('.message-history');if(history&&history.scrollHeight-history.scrollTop-history.clientHeight<350)history.scrollTop=history.scrollHeight}}/></a>:<div className="message-file-card"><span aria-hidden="true">{file.type==='application/pdf'?'PDF':'FILE'}</span><b>{file.name}</b>{file.type==='application/pdf'&&<button onClick={()=>setPreview(preview===file.url?null:file.url)}>{preview===file.url?'Close preview':'Preview'}</button>}</div>}
   {preview===file.url&&<iframe title={`Preview ${file.name}`} src={file.url} loading="lazy"/>}
   <div className="message-file-actions"><a href={file.url} target="_blank" rel="noreferrer">Open {file.name}</a><a href={`${file.url}${file.url.includes("?")?"&":"?"}download=1`} download={file.name}>Download</a></div>
  </div>)}
 </div>;
}

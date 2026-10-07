"use client";

import {useEffect,useRef,useState} from "react";
import {createPortal} from "react-dom";
import {isMessageAudio,mediaType,smsAudioTypes} from '../lib/message-audio';
import VoiceMessageRecorder from './VoiceMessageRecorder';
import VoiceMessagePlayer from './VoiceMessagePlayer';

type Channel="sms"|"email";
export type ComposerAttachment={url:string;name:string;type:string;size:number;expiresAt:number;channel:Channel};

const smsTypes=new Set(["image/jpeg","image/jpg","image/png","image/gif","image/heic","image/heif","application/pdf","text/vcard","text/x-vcard","text/csv",...smsAudioTypes]);
const emojis=["😀","😂","😊","😍","🔥","👍","🙏","🎉","❤️","✅","📞","📩","🚗","🏠","💰","⭐","😎","🤝","💯","👋","🙂","😉","🥳","📎","😄","😁","😅","🤣","😇","🥰","😘","🤔","😬","😔","😢","😭","😮","🤩","🙌","👏","👌","✌️","💪","🤞","🫶","💚","💙","💜","💛","🧡","💔","✨","🌟","🎈","🎂","🎁","☀️","🌈","☕","🏡","🚙","🚘","🛻","🏢","🛡️","📅","⏰","📋","📝","📄","📧","🔔","🔑","💵","✔️","❌","❗","❓","➡️","⬅️","📍","🔗","💬"];
const shortSize=(bytes:number)=>bytes<1024?`${bytes} B`:bytes<1024*1024?`${Math.round(bytes/1024)} KB`:`${(bytes/1024/1024).toFixed(1)} MB`;

function setTextareaValue(value:string,cursor?:number){
  const textarea=document.querySelector(".message-thread footer textarea") as HTMLTextAreaElement|null;if(!textarea)return;
  const setter=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,"value")?.set;setter?.call(textarea,value);textarea.dispatchEvent(new Event("input",{bubbles:true}));textarea.focus();
  if(typeof cursor==="number")requestAnimationFrame(()=>textarea.setSelectionRange(cursor,cursor));
}

function insertEmoji(emoji:string){
  const textarea=document.querySelector(".message-thread footer textarea") as HTMLTextAreaElement|null;if(!textarea)return;
  const start=textarea.selectionStart??textarea.value.length;const end=textarea.selectionEnd??start;
  const next=`${textarea.value.slice(0,start)}${emoji}${textarea.value.slice(end)}`;
  setTextareaValue(next,start+emoji.length);
}

export default function MessageAttachmentBridge({channel,onChange,disabled=false,active=true}:{channel:Channel;onChange:(files:ComposerAttachment[],busy:boolean)=>void;disabled?:boolean;active?:boolean}){
  const [attachments,setAttachments]=useState<ComposerAttachment[]>([]);
  const [busy,setBusy]=useState(false);
  const [voiceBusy,setVoiceBusy]=useState(false);
  const [dragging,setDragging]=useState(false);
  const [emojiOpen,setEmojiOpen]=useState(false);
  const [error,setError]=useState("");
  const [emojiPosition,setEmojiPosition]=useState({left:12,top:12});
  const emojiRef=useRef<HTMLDivElement>(null);
  const inputRef=useRef<HTMLInputElement>(null);
  const attachmentRef=useRef<ComposerAttachment[]>([]);const mountedRef=useRef(true),uploadRef=useRef<AbortController|null>(null);
  useEffect(()=>{if(!emojiOpen)return;const close=(e:PointerEvent)=>{if(e.target instanceof Element&&!emojiRef.current?.contains(e.target)&&!e.target.closest('[data-emoji-toggle]'))setEmojiOpen(false)};const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){setEmojiOpen(false);document.querySelector<HTMLButtonElement>('[data-emoji-toggle]')?.focus()}};const resize=()=>setEmojiOpen(false);const scroll=(e:Event)=>{if(e.target instanceof Node&&!emojiRef.current?.contains(e.target))setEmojiOpen(false)};document.addEventListener('pointerdown',close);document.addEventListener('keydown',key);document.addEventListener('scroll',scroll,true);window.addEventListener('resize',resize);return()=>{document.removeEventListener('pointerdown',close);document.removeEventListener('keydown',key);document.removeEventListener('scroll',scroll,true);window.removeEventListener('resize',resize)}},[emojiOpen]);
  useEffect(()=>{attachmentRef.current=attachments},[attachments]);
  useEffect(()=>{onChange(attachments,busy||voiceBusy)},[attachments,busy,voiceBusy,onChange]);
  useEffect(()=>{mountedRef.current=true;return()=>{mountedRef.current=false;uploadRef.current?.abort()}},[]);

  useEffect(()=>{
    const over=(event:DragEvent)=>{const footer=document.querySelector(".message-thread");if(footer&&event.target instanceof Node&&footer.contains(event.target)&&event.dataTransfer?.types.includes("Files")){event.preventDefault();event.stopPropagation();setDragging(true)}};
    const leave=(event:DragEvent)=>{const footer=document.querySelector(".message-thread");if(footer&&event.target instanceof Node&&footer.contains(event.target))setDragging(false)};
    const drop=(event:DragEvent)=>{const footer=document.querySelector(".message-thread");if(footer&&event.target instanceof Node&&footer.contains(event.target)&&event.dataTransfer?.files?.length){event.preventDefault();event.stopPropagation();setDragging(false);void addFiles(Array.from(event.dataTransfer.files))}};
    document.addEventListener("dragover",over);document.addEventListener("dragleave",leave);document.addEventListener("drop",drop);return()=>{document.removeEventListener("dragover",over);document.removeEventListener("dragleave",leave);document.removeEventListener("drop",drop)};
  });

  async function addFiles(files:File[],caption=true){
    if(uploadRef.current||disabled||!active)return false;setError("");
    const existing=attachmentRef.current.filter(item=>item.channel===channel);
    const room=Math.max(0,(channel==="sms"?10:8)-existing.length);const selected=files.slice(0,room);
    if(!selected.length){setError(`You already have the maximum number of ${channel==="sms"?"MMS":"email"} attachments.`);return false}
    if(channel==="sms"){
      const unsupported=selected.find(file=>!smsTypes.has(mediaType(file.type||"").replace('audio/x-m4a','audio/mp4')));if(unsupported){setError(`${unsupported.name} cannot be sent by MMS. Try MP3, M4A, a photo or PDF.`);return false}
      if(selected.some(file=>isMessageAudio(file.type)&&file.size>450000)){setError('Keep audio attachments under 450 KB.');return false}
      const total=existing.reduce((sum,item)=>sum+item.size,0)+selected.reduce((sum,file)=>sum+file.size,0);if(total>4_500_000){setError("Keep the combined MMS attachments under 4.5 MB.");return false}
    }
    const controller=new AbortController();uploadRef.current=controller;setBusy(true);
    try{
      const uploaded:ComposerAttachment[]=[];
      for(const file of selected){
        const form=new FormData();form.append("file",file);form.append("channel",channel);
        const response=await fetch("/api/message-media",{method:"POST",credentials:"same-origin",body:form,signal:controller.signal});const data=await response.json() as {attachment?:Omit<ComposerAttachment,"channel">;error?:string};
        if(!response.ok||!data.attachment)throw new Error(data.error||`Could not upload ${file.name}`);uploaded.push({...data.attachment,channel});
      }
      if(!mountedRef.current||controller.signal.aborted)return false;
      setAttachments(current=>[...current.filter(item=>item.channel===channel),...uploaded]);
      const textarea=document.querySelector(".message-thread footer textarea") as HTMLTextAreaElement|null;if(caption&&!uploaded.every(item=>isMessageAudio(item.type))&&textarea&&!textarea.value.trim())setTextareaValue(`Attached: ${uploaded.map(item=>item.name).join(", ")}`);
      return true;
    }catch(reason){if(mountedRef.current&&!controller.signal.aborted)setError(reason instanceof Error?reason.message:"Attachment upload failed");return false}
    finally{uploadRef.current=null;if(mountedRef.current)setBusy(false)}
  }

  const visible=attachments.filter(item=>item.channel===channel);
  return (<div className={`message-attachment-panel ${dragging?"dragging":""}`}>
    {dragging&&<div className="message-drop-overlay">Drop files to attach</div>}
    <input ref={inputRef} type="file" hidden multiple accept={channel==="sms"?"image/jpeg,image/png,image/gif,image/heic,image/heif,application/pdf,text/vcard,text/csv,audio/mpeg,audio/mp3,audio/mp4,audio/x-m4a,audio/ogg,audio/webm,audio/3gpp,audio/amr":"*/*"} onChange={event=>{const files=Array.from(event.target.files||[]);event.target.value="";void addFiles(files)}}/>
    <div className="message-attachment-toolbar">
      <button type="button" disabled={busy||voiceBusy||disabled||!active} onClick={()=>inputRef.current?.click()}>📎 {busy?"Uploading…":"Attach file"}</button>
      <button type="button" data-emoji-toggle className={emojiOpen?"active":""} aria-expanded={emojiOpen} onClick={e=>{const rect=e.currentTarget.getBoundingClientRect();setEmojiPosition({left:Math.max(12,Math.min(rect.left,window.innerWidth-402)),top:Math.max(12,rect.top-256)});setEmojiOpen(open=>!open)}}>😊 Emoji</button>
      <VoiceMessageRecorder disabled={busy||disabled} active={active} onBusyChange={setVoiceBusy} onAttach={file=>addFiles([file],false)}/>
    </div>
    {emojiOpen&&createPortal(<div ref={emojiRef} style={emojiPosition} className="message-emoji-picker" role="group" aria-label="Emoji picker">{emojis.map(emoji=><button key={emoji} type="button" aria-label={`Insert ${emoji}`} onMouseDown={e=>e.preventDefault()} onClick={()=>insertEmoji(emoji)}>{emoji}</button>)}</div>,document.body)}
    {visible.length>0&&<div className="message-attachment-chips">{visible.map(item=><span className={isMessageAudio(item.type)?'voice-attachment':''} key={item.url}>{isMessageAudio(item.type)?<VoiceMessagePlayer src={item.url} active={active}/>:<><b>{item.type==="image/gif"?"GIF":item.type.startsWith("image/")?"IMG":"FILE"}</b>{item.name}<small>{shortSize(item.size)}</small></>}<button type="button" disabled={busy||voiceBusy} aria-label={`Remove ${item.name}`} onClick={()=>setAttachments(current=>current.filter(file=>file.url!==item.url))}>×</button></span>)}</div>}
    {error&&<p className="message-attachment-error" role="alert">{error}</p>}
  </div>);
}

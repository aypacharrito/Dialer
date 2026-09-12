"use client";

import {useEffect,useRef,useState} from "react";
import {createPortal} from "react-dom";

type Channel="sms"|"email";
type Attachment={url:string;name:string;type:string;size:number;expiresAt:number;channel:Channel};

const smsTypes=new Set(["image/jpeg","image/jpg","image/png","image/gif","image/heic","image/heif","application/pdf","text/vcard","text/x-vcard","text/csv"]);
const emojis=["😀","😂","😊","😍","🔥","👍","🙏","🎉","❤️","✅","📞","📩","🚗","🏠","💰","⭐","😎","🤝","💯","👋","🙂","😉","🥳","📎"];
const shortSize=(bytes:number)=>bytes<1024?`${bytes} B`:bytes<1024*1024?`${Math.round(bytes/1024)} KB`:`${(bytes/1024/1024).toFixed(1)} MB`;
const activeChannel=():Channel=>document.querySelector('#message-tab-email[aria-selected="true"]')?"email":"sms";

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

export default function MessageAttachmentBridge(){
  const [host,setHost]=useState<HTMLElement|null>(null);
  const [attachments,setAttachments]=useState<Attachment[]>([]);
  const [busy,setBusy]=useState(false);
  const [dragging,setDragging]=useState(false);
  const [emojiOpen,setEmojiOpen]=useState(false);
  const [error,setError]=useState("");
  const inputRef=useRef<HTMLInputElement>(null);
  const attachmentRef=useRef<Attachment[]>([]);const busyRef=useRef(false);const armedUntil=useRef(0);const contextKey=useRef("");
  useEffect(()=>{attachmentRef.current=attachments},[attachments]);
  useEffect(()=>{busyRef.current=busy},[busy]);

  useEffect(()=>{
    const sync=()=>{
      const next=document.querySelector(".message-thread footer") as HTMLElement|null;setHost(next);
      const label=(document.querySelector(".thread-contact b")?.textContent||"").trim();const key=`${activeChannel()}:${label}`;
      if(contextKey.current&&key!==contextKey.current){setAttachments([]);setEmojiOpen(false);setError("")}
      contextKey.current=key;
    };
    sync();const observer=new MutationObserver(sync);observer.observe(document.body,{subtree:true,childList:true,attributes:true,characterData:true});return()=>observer.disconnect();
  },[]);

  useEffect(()=>{
    const over=(event:DragEvent)=>{const footer=document.querySelector(".message-thread footer");if(footer&&event.target instanceof Node&&footer.contains(event.target)&&event.dataTransfer?.types.includes("Files")){event.preventDefault();setDragging(true)}};
    const leave=(event:DragEvent)=>{const footer=document.querySelector(".message-thread footer");if(footer&&event.target instanceof Node&&footer.contains(event.target))setDragging(false)};
    const drop=(event:DragEvent)=>{const footer=document.querySelector(".message-thread footer");if(footer&&event.target instanceof Node&&footer.contains(event.target)&&event.dataTransfer?.files?.length){event.preventDefault();setDragging(false);void addFiles(Array.from(event.dataTransfer.files))}};
    document.addEventListener("dragover",over);document.addEventListener("dragleave",leave);document.addEventListener("drop",drop);return()=>{document.removeEventListener("dragover",over);document.removeEventListener("dragleave",leave);document.removeEventListener("drop",drop)};
  });

  useEffect(()=>{
    const click=(event:MouseEvent)=>{if(event.target instanceof Element&&event.target.closest(".message-thread .send-message"))armedUntil.current=Date.now()+5000};document.addEventListener("click",click,true);
    const original=window.fetch.bind(window);
    window.fetch=async(input,init)=>{
      const url=typeof input==="string"?input:input instanceof URL?input.toString():input instanceof Request?input.url:String(input);
      const sms=url.includes("/api/twilio/messages");const email=url.includes("/api/email/messages");const armed=(sms||email)&&Date.now()<armedUntil.current;
      let attached=false;let nextInit=init;
      if(armed&&busyRef.current)throw new Error("Your attachment is still uploading. Try Send again when the upload finishes.");
      if(armed&&attachmentRef.current.length&&typeof init?.body==="string"){
        try{
          const body=JSON.parse(init.body) as Record<string,unknown>;const channel:Channel=email?"email":"sms";const files=attachmentRef.current.filter(item=>item.channel===channel);
          if(files.length){
            if(sms)body.mediaUrls=files.map(item=>item.url);
            else body.attachments=files.map(item=>({path:item.url,filename:item.name,contentType:item.type}));
            nextInit={...init,body:JSON.stringify(body)};attached=true;
          }
        }catch{}
      }
      const response=await original(input,nextInit);
      if(armed&&attached&&response.ok){setAttachments([]);setError("");armedUntil.current=0}
      return response;
    };
    return()=>{document.removeEventListener("click",click,true);window.fetch=original};
  },[]);

  async function addFiles(files:File[]){
    const channel=activeChannel();setError("");
    const existing=attachmentRef.current.filter(item=>item.channel===channel);
    const room=Math.max(0,(channel==="sms"?10:8)-existing.length);const selected=files.slice(0,room);
    if(!selected.length){setError(`You already have the maximum number of ${channel==="sms"?"MMS":"email"} attachments.`);return}
    if(channel==="sms"){
      const unsupported=selected.find(file=>!smsTypes.has((file.type||"").toLowerCase()));if(unsupported){setError(`${unsupported.name} is not a Twilio MMS type. Use JPG, PNG, GIF, PDF, vCard, or CSV, or send it by email.`);return}
      const total=existing.reduce((sum,item)=>sum+item.size,0)+selected.reduce((sum,file)=>sum+file.size,0);if(total>4_500_000){setError("Keep the combined MMS attachments under 4.5 MB so the message stays below Twilio/carrier limits.");return}
    }
    setBusy(true);
    try{
      const uploaded:Attachment[]=[];
      for(const file of selected){
        const form=new FormData();form.append("file",file);form.append("channel",channel);
        const response=await fetch("/api/message-media",{method:"POST",credentials:"same-origin",body:form});const data=await response.json() as {attachment?:Omit<Attachment,"channel">;error?:string};
        if(!response.ok||!data.attachment)throw new Error(data.error||`Could not upload ${file.name}`);uploaded.push({...data.attachment,channel});
      }
      setAttachments(current=>[...current.filter(item=>item.channel===channel),...uploaded]);
      const textarea=document.querySelector(".message-thread footer textarea") as HTMLTextAreaElement|null;if(textarea&&!textarea.value.trim())setTextareaValue(`Attached: ${uploaded.map(item=>item.name).join(", ")}`);
    }catch(reason){setError(reason instanceof Error?reason.message:"Attachment upload failed")}
    finally{setBusy(false)}
  }

  if(!host)return null;
  const channel=activeChannel();const visible=attachments.filter(item=>item.channel===channel);
  return createPortal(<div className={`message-attachment-panel ${dragging?"dragging":""}`}>
    {dragging&&<div className="message-drop-overlay">Drop files to attach</div>}
    <input ref={inputRef} type="file" hidden multiple accept={channel==="sms"?"image/jpeg,image/png,image/gif,image/heic,image/heif,application/pdf,text/vcard,text/csv":"*/*"} onChange={event=>{const files=Array.from(event.target.files||[]);event.target.value="";void addFiles(files)}}/>
    <div className="message-attachment-toolbar">
      <button type="button" disabled={busy} onClick={()=>inputRef.current?.click()}>📎 {busy?"Uploading…":"Attach file"}</button>
      <button type="button" className={emojiOpen?"active":""} aria-expanded={emojiOpen} onClick={()=>setEmojiOpen(open=>!open)}>😊 Emoji</button>
      <small>{channel==="sms"?"Twilio MMS: JPG, PNG and GIF get the larger media allowance; HEIC/HEIF and document types use the smaller safety limit.":"Drag photos, GIFs, or files directly into this composer."}</small>
    </div>
    {emojiOpen&&<div className="message-emoji-picker" role="group" aria-label="Emoji picker">{emojis.map(emoji=><button key={emoji} type="button" aria-label={`Insert ${emoji}`} onClick={()=>insertEmoji(emoji)}>{emoji}</button>)}</div>}
    {visible.length>0&&<div className="message-attachment-chips">{visible.map(item=><span key={item.url}><b>{item.type==="image/gif"?"GIF":item.type.startsWith("image/")?"IMG":"FILE"}</b>{item.name}<small>{shortSize(item.size)}</small><button type="button" aria-label={`Remove ${item.name}`} onClick={()=>setAttachments(current=>current.filter(file=>file.url!==item.url))}>×</button></span>)}</div>}
    {error&&<p className="message-attachment-error" role="alert">{error}</p>}
  </div>,host);
}

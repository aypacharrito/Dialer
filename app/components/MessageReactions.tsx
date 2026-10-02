"use client";
import {useEffect,useId,useRef,useState} from "react";
import {messageReactions,type MessageReaction} from "../lib/message-reactions";
import type {StoredCommunication} from "../lib/communications";
export type SendMessageReaction=(message:StoredCommunication,emoji:MessageReaction)=>Promise<void>;
export default function MessageReactions({message,disabledReason,onReact}:{message:StoredCommunication;disabledReason:string;onReact:SendMessageReaction}){
 const [open,setOpen]=useState(false),[pending,setPending]=useState(false),[error,setError]=useState("");
 const root=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null),sending=useRef(false),restoreFocus=useRef(false),id=useId();
 useEffect(()=>{if(!open)return;root.current?.querySelector<HTMLButtonElement>(".message-reaction-choices button")?.focus();const outside=(e:PointerEvent)=>{if(e.target instanceof Node&&!root.current?.contains(e.target))setOpen(false)};document.addEventListener("pointerdown",outside);return()=>document.removeEventListener("pointerdown",outside)},[open]);
 useEffect(()=>{if(pending||disabledReason||!restoreFocus.current)return;restoreFocus.current=false;if(open)root.current?.querySelector<HTMLButtonElement>(".message-reaction-choices button")?.focus();else trigger.current?.focus()},[pending,disabledReason,open]);
 async function react(emoji:MessageReaction){if(sending.current||disabledReason)return;sending.current=true;setPending(true);setError("");try{await onReact(message,emoji);setOpen(false)}catch(e){setError(e instanceof Error?e.message:"Reaction could not be sent. Try again.")}finally{sending.current=false;restoreFocus.current=true;setPending(false)}}
 return <div ref={root} className="message-reactions" onKeyDown={e=>{if(e.key==="Escape"&&open){e.preventDefault();e.stopPropagation();setOpen(false);trigger.current?.focus()}}} onBlur={e=>{if(!sending.current&&!e.currentTarget.contains(e.relatedTarget))setOpen(false)}}>
  <button ref={trigger} type="button" className="message-react-toggle" aria-expanded={open} aria-controls={open?id:undefined} aria-label="React to message" title={disabledReason||"Send a reaction"} disabled={Boolean(disabledReason)||pending} onClick={()=>{setError("");setOpen(v=>!v)}}>☺ React</button>
  {open&&<div id={id} className="message-reaction-picker" role="group" aria-label="Send reaction as text" aria-busy={pending}><div className="message-reaction-choices" onKeyDown={e=>{
   if(!["ArrowLeft","ArrowRight","Home","End"].includes(e.key))return;const buttons=Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));if(!buttons.length)return;e.preventDefault();const index=buttons.indexOf(document.activeElement as HTMLButtonElement);buttons[e.key==="Home"?0:e.key==="End"?buttons.length-1:(index+(e.key==="ArrowRight"?1:-1)+buttons.length)%buttons.length].focus();
  }}>{messageReactions.map(({emoji,label})=><button key={emoji} type="button" title={label} aria-label={`Send ${label.toLowerCase()} reaction as text`} disabled={pending||Boolean(disabledReason)} onClick={()=>void react(emoji)}>{emoji}</button>)}</div><span className="message-reaction-hint" role="status">{pending?"Sending reaction…":disabledReason||"Sent as a text reply"}</span>{error&&<span role="alert">{error}</span>}</div>}
 </div>;
}

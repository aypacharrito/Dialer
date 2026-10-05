"use client";
import {useEffect,useRef,useState} from "react";
import {createPortal} from "react-dom";
const steps=[
  {view:"today",target:".today-workspace",title:"Start with Today",copy:"Review priorities. Complete or snooze reminders from your notes."},
  {view:"dialer",target:'[data-dialer-widget="contact"]',title:"Make the next call",copy:"Choose a contact and press Start calling. Mute and end controls appear during the call."},
  {view:"dialer",target:".dialer-layout-menu",title:"Make it yours",copy:"Open Layout to show panels or center everything. Drag a panel’s background to move it; drag its lower-right corner to resize. Hold Shift to skip snapping."},
  {view:"messages",target:".messages-center",title:"Keep the conversation",copy:"Select a contact to reply. Attach photos or PDFs with your message."},
  {view:"office",target:'[aria-label="Calendar view"]',title:"Plan what’s next",copy:"Create an appointment or connect Google or Outlook in Calendar settings. Routine follow-ups stay on Today."},
  {view:"ai",target:".ai-chat-composer",title:"Ask Pacifica",copy:"Type a request or use + to attach a document. Review suggested changes before applying them."},
] as const;
export default function WorkspaceTour({workspaceId,onNavigate}:{workspaceId:string;onNavigate:(view:string)=>void}){
 const [step,setStep]=useState<number|null>(null);
 const navigation=useRef(onNavigate),help=useRef<HTMLButtonElement>(null);
 const key=`pacifica:${workspaceId}:tour-v1`;
 useEffect(()=>{navigation.current=onNavigate},[onNavigate]);
 useEffect(()=>{let canceled=false;queueMicrotask(()=>{if(canceled)return;try{if(!localStorage.getItem(key)){navigation.current(steps[0].view);setStep(0)}}catch{}});return()=>{canceled=true}},[key]);
 function finish(){try{localStorage.setItem(key,"done")}catch{}setStep(null);help.current?.focus()}
 function go(index:number){navigation.current(steps[index].view);setStep(index)}
 useEffect(()=>{
  if(step===null)return;
  let target:Element|null=null;
  const highlight=()=>{const next=document.querySelector(steps[step].target);if(next===target)return;target?.removeAttribute("data-tour-highlight");target=next;target?.setAttribute("data-tour-highlight","true")};
  highlight();const observer=new MutationObserver(highlight);observer.observe(document.body,{childList:true,subtree:true});
  const escape=(event:KeyboardEvent)=>{if(event.key==="Escape"){try{localStorage.setItem(key,"done")}catch{}setStep(null);help.current?.focus()}};
  window.addEventListener("keydown",escape);
  return()=>{observer.disconnect();target?.removeAttribute("data-tour-highlight");window.removeEventListener("keydown",escape)};
 },[step,key]);
 return <><button ref={help} className="workspace-tour-help" aria-label="Show workspace walkthrough" title="Walkthrough" onClick={()=>go(0)}>?</button>{step!==null&&createPortal(<aside className="workspace-tour workspace-tour-v2" role="region" aria-label="Workspace walkthrough" aria-live="polite"><header><small>{step+1} / {steps.length}</small><button aria-label="Close walkthrough" onClick={finish}>×</button></header><h2>{steps[step].title}</h2><p>{steps[step].copy}</p><nav aria-label="Tour steps">{steps.map((item,index)=><button key={item.title} aria-label={`Step ${index+1}: ${item.title}`} aria-current={index===step?"step":undefined} onClick={()=>go(index)}/>)}</nav><footer><button onClick={finish}>Skip</button><div>{step>0&&<button onClick={()=>go(step-1)}>Back</button>}<button className="primary" onClick={()=>step===steps.length-1?finish():go(step+1)}>{step===steps.length-1?"Done":"Next →"}</button></div></footer></aside>,document.body)}</>;
}

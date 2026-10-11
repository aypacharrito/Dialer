"use client";
import {useEffect,useRef,useState} from "react";
import {createPortal} from "react-dom";
const steps=[
  {view:"today",target:".today-workspace",title:"Start with Today",copy:"Review priorities. Complete or snooze reminders from your notes."},
  {view:"leads",target:".crm-view .module-actions",title:"Bring in contacts",copy:"Use Contacts to import a CSV, scan a document, or add a lead. Search and filter below the toolbar. Export CSV saves the current filtered queue."},
  {view:"ai",target:".ai-chat-composer",title:"Scan an entire folder",copy:"Ask Pacifica to scan a folder, then select it on your device. AI first finds full names with their own phone numbers, then searches every file for matching details. Review uncertain results before adding contacts. Matching contacts gain missing details; saved values remain intact."},
  {view:"dialer",target:'[data-dialer-widget="contact"]',title:"Make the next call",copy:"Choose a contact and press Start calling. Mute and end controls appear during the call."},
  {view:"dialer",target:".dialer-layout-menu",title:"Arrange the dialer",copy:"Open Layout to show or hide panels and reset their positions. Drag a panel’s background to move it; use its lower-right corner to resize. Right-click for panel controls. Shift skips alignment snapping; panels still keep a safe distance."},
  {view:"dialer",target:'[data-dialer-widget="contact"]',title:"Finish each call",copy:"After hanging up, choose the outcome and save your notes or follow-up date. Live call controls stay available while you work elsewhere. Use Keypad for phone-menu digits after the call connects."},
  {view:"messages",target:".messages-center",title:"Keep the conversation",copy:"Select a contact to reply. Attach photos or PDFs with your message."},
  {view:"office",target:'[aria-label="Calendar view"]',title:"Plan what’s next",copy:"Create an appointment or connect Google or Outlook in Calendar settings. Routine follow-ups stay on Today."},
  {view:"ai",target:".ai-chat-composer",title:"Ask Pacifica",copy:"Type a request or use + to attach a document. Review suggested changes before applying them."},
  {view:"clients",target:".clients-view",title:"Track policies and renewals",copy:"Keep client details, policy dates and amounts together. Review upcoming renewals and open a contact to record verified changes."},
  {view:"settings",target:".workspace-display-setting",title:"Set your appearance",copy:"Choose Light or Dark and your display size in Settings. The dark dialer uses a crisp 4K starfield; light mode uses the Pacifica watermark. Optional HTTPS images and GIFs are saved with your workspace. Replay this guide anytime with the ? button."},
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

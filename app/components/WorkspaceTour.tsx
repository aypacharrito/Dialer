"use client";
import {useEffect,useState} from "react";
const steps=[
  ["today","Your day at a glance","Start here for contacts that need attention."],
  ["dialer","Call and record the result","After a call, mark Interested or Appointment and enter the agreed date to add it to Calendar. Routine follow-ups stay out."],
  ["messages","Keep the conversation together","Read and reply here. Select the contact name or info button for their details."],
  ["office","Your calendar","Appointments, interested callbacks, payments, and events you add. Connect Google in calendar settings."],
  ["ai","Ask Pacifica","Draft messages, organize leads, and manage your outreach instructions here."],
] as const;
export default function WorkspaceTour({workspaceId,onNavigate}:{workspaceId:string;onNavigate:(view:string)=>void}){
 const [step,setStep]=useState<number|null>(null);
 const key=`pacifica:${workspaceId}:tour-v1`;
 useEffect(()=>{let canceled=false;queueMicrotask(()=>{if(canceled)return;try{if(!localStorage.getItem(key))setStep(0)}catch{}});return()=>{canceled=true}},[key]);
 function finish(){try{localStorage.setItem(key,"done")}catch{}setStep(null)}
 return <><button className="workspace-tour-help" aria-label="Show workspace walkthrough" title="Workspace walkthrough" onClick={()=>setStep(0)}>?</button>{step!==null&&<aside className="workspace-tour" aria-label="Workspace walkthrough"><small>QUICK TOUR · {step+1} / {steps.length}</small><h2>{steps[step][1]}</h2><p>{steps[step][2]}</p><div><button onClick={finish}>Skip</button><button onClick={()=>onNavigate(steps[step][0])}>Show me</button><button className="primary" onClick={()=>step===steps.length-1?finish():setStep(step+1)}>{step===steps.length-1?"Done":"Next"}</button></div></aside>}</>;
}

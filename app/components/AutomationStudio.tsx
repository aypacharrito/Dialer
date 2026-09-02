"use client";

import {useEffect,useMemo,useState} from "react";
import {starterCommunicationTemplates} from "../lib/message-templates";
import type {AutomationChannel,AutomationSequence,AutomationStep,WorkspaceProfile} from "../lib/workspace-profile";

function delayLabel(minutes:number){if(minutes<60)return `${minutes} min`;if(minutes%1440===0)return `${minutes/1440} day${minutes===1440?"":"s"}`;return `${Math.round(minutes/60)} hr`}

export default function AutomationStudio({profile,onChange}:{profile:WorkspaceProfile;onChange:(profile:WorkspaceProfile)=>void}){
  const [message,setMessage]=useState("Checking the live automation schedule…");
  const [running,setRunning]=useState(false);
  const templates=useMemo(()=>[...starterCommunicationTemplates,...profile.communicationTemplates],[profile.communicationTemplates]);
  useEffect(()=>{let active=true;void fetch("/api/automation/run",{cache:"no-store"}).then(response=>response.json()).then(data=>{if(!active)return;setMessage(data.configured?`${data.browserSchedule}. Server backup: ${data.serverSchedule}.`:`${data.browserSchedule}. Add CRON_SECRET for the daily server backup.`)}).catch(()=>{if(active)setMessage("Runs every five minutes while Pacifica is open. Server schedule unavailable.")});return()=>{active=false}},[]);
  function updateSequence(id:string,patch:Partial<AutomationSequence>){onChange({...profile,automationSequences:profile.automationSequences.map(sequence=>sequence.id===id?{...sequence,...patch}:sequence)})}
  function updateStep(sequenceId:string,stepId:string,patch:Partial<AutomationStep>){onChange({...profile,automationSequences:profile.automationSequences.map(sequence=>sequence.id===sequenceId?{...sequence,steps:sequence.steps.map(step=>step.id===stepId?{...step,...patch}:step)}:sequence)})}
  function addStep(sequence:AutomationSequence){const step:AutomationStep={id:crypto.randomUUID(),channel:"task",delayMinutes:1440,templateId:"",enabled:true};updateSequence(sequence.id,{steps:[...sequence.steps,step].slice(0,12)})}
  function removeStep(sequence:AutomationSequence,stepId:string){updateSequence(sequence.id,{steps:sequence.steps.filter(step=>step.id!==stepId)})}
  async function runNow(){setRunning(true);try{const response=await fetch("/api/automation/run",{method:"POST"});const data=await response.json();if(!response.ok)throw new Error(data.error||"Automation run failed");setMessage(`Checked ${data.due} due · sent ${data.sent} · ${data.fallbacks} channel fallback${data.fallbacks===1?"":"s"} · ${data.blocked} blocked safely`)}catch(error){setMessage(error instanceof Error?error.message:"Automation run failed")}finally{setRunning(false)}}
  return <section className="automation-studio">
    <header><div><span>AUTOMATION</span><h2>Follow-up sequences</h2></div><div><label><input type="checkbox" checked={profile.serverAutomationEnabled} onChange={event=>onChange({...profile,serverAutomationEnabled:event.target.checked})}/> Active</label><button type="button" disabled={running||!profile.serverAutomationEnabled} onClick={()=>void runNow()}>{running?"Checking…":"Run now"}</button></div></header>
    <div className="automation-safety-row"><label><input type="checkbox" checked={profile.providerFallbackEnabled} onChange={event=>onChange({...profile,providerFallbackEnabled:event.target.checked})}/><span><b>Channel fallback</b></span></label><p>{message}</p></div>
    <div className="automation-sequences">{profile.automationSequences.map(sequence=><article key={sequence.id} className={sequence.active?"active":""}>
      <header><div><input value={sequence.name} onChange={event=>updateSequence(sequence.id,{name:event.target.value})}/><small>Starts from: {sequence.trigger.replace("-"," ")}</small></div><label><input type="checkbox" checked={sequence.active} onChange={event=>updateSequence(sequence.id,{active:event.target.checked})}/> Active</label></header>
      <div className="automation-steps">{sequence.steps.map((step,index)=><div key={step.id} className={step.enabled?"":"disabled"}><em>{index+1}</em><select value={step.channel} onChange={event=>updateStep(sequence.id,step.id,{channel:event.target.value as AutomationChannel,templateId:event.target.value==="task"?"":step.templateId})}><option value="sms">Text</option><option value="email">Email</option><option value="task">Sales task</option></select><label>Wait <input type="number" min="0" max="43200" value={step.delayMinutes} onChange={event=>updateStep(sequence.id,step.id,{delayMinutes:Math.max(0,Number(event.target.value)||0)})}/><small>{delayLabel(step.delayMinutes)}</small></label>{step.channel!=="task"?<select value={step.templateId} onChange={event=>updateStep(sequence.id,step.id,{templateId:event.target.value})}><option value="">Choose saved prompt</option>{templates.filter(template=>template.channel===step.channel).map(template=><option key={template.id} value={template.id}>{template.name}</option>)}</select>:<span className="task-copy">Create a personal follow-up task</span>}<button type="button" onClick={()=>updateStep(sequence.id,step.id,{enabled:!step.enabled})}>{step.enabled?"Pause":"Resume"}</button><button type="button" className="remove-step" onClick={()=>removeStep(sequence,step.id)}>×</button></div>)}</div>
      <footer><label><input type="checkbox" checked={sequence.stopOnReply} onChange={event=>updateSequence(sequence.id,{stopOnReply:event.target.checked})}/> Stop immediately when the lead replies</label><button type="button" onClick={()=>addStep(sequence)}>+ Add step</button></footer>
    </article>)}</div>
  </section>;
}

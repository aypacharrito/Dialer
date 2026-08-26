"use client";

import { useEffect, useState } from "react";
import { dateValue, leadPriority, rankLeads, type LeadPriorityInput } from "../lib/lead-priority";

type TodayLead=LeadPriorityInput&{name:string;phone:string;city:string;source:string;leadCost:number;product:string};

function relativeDate(value:string,now:number){
  const timestamp=dateValue(value);if(!Number.isFinite(timestamp))return "No date";
  const days=Math.round((timestamp-now)/(24*60*60*1000));
  if(days<0)return `${Math.abs(days)}d overdue`;
  if(days===0)return "Today";
  if(days===1)return "Tomorrow";
  return `In ${days}d`;
}

export default function TodayWorkspace({leads,onOpen,onCall,onImport,onAdd}:{leads:TodayLead[];onOpen:(id:number)=>void;onCall:(id:number)=>void;onImport:()=>void;onAdd:()=>void}){
  const [currentNow,setCurrentNow]=useState(()=>Date.now());
  useEffect(()=>{const timer=window.setInterval(()=>setCurrentNow(Date.now()),60000);return()=>window.clearInterval(timer)},[]);
  const open=leads.filter(lead=>lead.stage!=="Closed"&&!lead.doNotCall);
  const ranked=rankLeads(open,currentNow).slice(0,8);
  const overdue=open.filter(lead=>leadPriority(lead,currentNow).due).length;
  const appointments=open.filter(lead=>lead.stage==="Appointment"||lead.outcome==="Appointment set").length;
  const untouched=open.filter(lead=>lead.outcome==="Not contacted").length;
  const recent=open.filter(lead=>{const arrived=dateValue(lead.received);return Number.isFinite(arrived)&&currentNow-arrived<24*60*60*1000}).length;
  const sourceRows=Array.from(open.reduce((map,lead)=>{const row=map.get(lead.source)||{name:lead.source,count:0,cost:0,appointments:0};row.count++;row.cost+=lead.leadCost;if(lead.stage==="Appointment"||lead.outcome==="Appointment set")row.appointments++;map.set(lead.source,row);return map},new Map<string,{name:string;count:number;cost:number;appointments:number}>()).values()).toSorted((a,b)=>b.count-a.count).slice(0,4);

  return <div className="today-workspace">
    <header className="today-header"><div><span className="eyebrow">TODAY · SALES COMMAND CENTER</span><h1>Know exactly what to do next.</h1><p>Pacifica ranks fresh interest, overdue work, and open opportunities so nothing valuable sits untouched.</p></div><div className="today-actions"><button onClick={onImport}>Import leads</button><button className="primary" onClick={onAdd}>+ New lead</button></div></header>
    <section className="today-metrics">
      <article><span>NEW TODAY</span><b>{recent}</b><small>Fresh inbound opportunities</small></article>
      <article className={overdue?"urgent":""}><span>OVERDUE</span><b>{overdue}</b><small>Follow-ups needing action</small></article>
      <article><span>UNTOUCHED</span><b>{untouched}</b><small>Open leads without a call</small></article>
      <article><span>APPOINTMENTS</span><b>{appointments}</b><small>Active booked opportunities</small></article>
    </section>
    <div className="today-grid">
      <section className="focus-list"><header><div><span>FOCUS QUEUE</span><h2>Your best next conversations</h2></div><em>{open.length} open</em></header>{ranked.map((lead,index)=>{const priority=leadPriority(lead,currentNow);return <article key={lead.id}><strong>{String(index+1).padStart(2,"0")}</strong><button className="focus-person" onClick={()=>onOpen(lead.id)}><i>{lead.name.split(" ").map(part=>part[0]).slice(0,2).join("")}</i><span><b>{lead.name}</b><small>{lead.product} · {lead.source}</small></span></button><div className="focus-reason"><b><em className={`priority-pill ${priority.level.toLowerCase()}`}>{priority.level}</em>{priority.reason}</b><small>{lead.followUp?`${relativeDate(lead.followUp,currentNow)} · `:""}{priority.detail}</small></div><button className="focus-call" onClick={()=>onCall(lead.id)}>Call</button></article>})}{!ranked.length&&<div className="today-empty"><b>Your queue is clear.</b><span>Import leads or add a contact to start working opportunities.</span><button onClick={onAdd}>Add your first lead</button></div>}</section>
      <aside className="source-pulse"><header><span>LEAD SOURCE PULSE</span><h2>Where opportunity is coming from</h2></header>{sourceRows.map(row=><article key={row.name}><div><b>{row.name}</b><small>{row.count} open lead{row.count===1?"":"s"}</small></div><span><b>{row.appointments}</b><small>appts</small></span><span><b>${row.cost.toFixed(0)}</b><small>spend</small></span></article>)}{!sourceRows.length&&<p>Source performance appears after leads are added.</p>}<footer><span>QUICK RULE</span><p>Call fresh leads first, then clear overdue follow-ups before starting another list.</p></footer></aside>
    </div>
  </div>;
}

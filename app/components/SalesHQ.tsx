"use client";

import { useMemo, useState } from "react";

type SalesProspect = {
  id:number;
  name:string;
  phone:string;
  city:string;
  stage:string;
  outcome:string;
  followUp:string;
  product:string;
  notes:string;
  extraFields?:Record<string,string>;
};

type Playbook = {
  label:string;
  opener:string;
  discovery:string[];
  demo:string[];
  objection:string;
};

const playbooks:Record<string,Playbook>={
  "Home services":{label:"Roofing, HVAC, plumbing & remodeling",opener:"Hey, this is Alejandro with Pacifica CRM. We help local service companies call, text, and follow up with every estimate lead from one simple workspace. Who handles your incoming leads and sales follow-up?",discovery:["Where do most of your estimate requests come from?","How quickly does someone call a new website or ad lead?","What happens after the first missed call?"],demo:["Live estimate-lead queue","One-click calling and call outcomes","Follow-up dates and missed-lead recovery"],objection:"Totally fair. Pacifica starts at $25 a month, so recovering one estimate can cover the software for a long time. Let me show you the workflow in five minutes before you decide."},
  "Law firms":{label:"Law firms",opener:"Hey, this is Alejandro with Pacifica CRM. We help firms keep every consultation request, call, note, and follow-up together so valuable intakes do not get lost. Who manages your new-client intake process?",discovery:["How are website and referral intakes assigned?","Can you see which inquiries have not received a call?","How do you follow up with prospects who were not ready on the first conversation?"],demo:["Priority intake queue","Conversation notes and dispositions","Consultation follow-up pipeline"],objection:"I understand. Pacifica is not trying to replace case management—it handles the sales and intake work before someone becomes a client."},
  "Automotive":{label:"Automotive",opener:"Hey, this is Alejandro with Pacifica CRM. We help independent dealers work every financing, inventory, and appointment lead with calling, texting, and a clear follow-up pipeline. Who oversees your internet leads?",discovery:["How fast are online financing leads called?","Can salespeople see every previous attempt and note?","How many internet leads go quiet after one attempt?"],demo:["Internet-lead call queue","Appointment pipeline","Source and salesperson follow-up visibility"],objection:"That makes sense. This is built to be lighter and cheaper than a dealership platform—let me show you how quickly a salesperson can work the next lead."},
  "Health & beauty":{label:"Dental, med spa & clinics",opener:"Hey, this is Alejandro with Pacifica CRM. We help appointment-based businesses turn more inquiries into booked consultations with faster calling, organized follow-up, and reminders. Who manages new patient or consultation leads?",discovery:["How are consultation requests followed up?","Do you have a list of inquiries that never booked?","Can you reactivate older prospects without searching through messages?"],demo:["Consultation pipeline","Follow-up and appointment tracking","Consent-aware messaging"],objection:"I get it. The value is not another calendar—it is making sure the people who have not booked yet keep getting worked."},
  "Real estate":{label:"Real estate",opener:"Hey, this is Alejandro with Pacifica CRM. We help agents organize buyer and seller inquiries, call them quickly, and keep long-term follow-up from disappearing. Who manages your online leads?",discovery:["How many lead sources are you checking every day?","What system reminds you to call a prospect months later?","Can you separate urgent buyers from long-term nurture leads?"],demo:["Priority and nurture queues","Buyer/seller pipeline","Long-term follow-up dates"],objection:"I understand. Pacifica is designed for agents who want the core follow-up tools without paying for a large, complicated platform."},
  "General":{label:"Lead-driven business",opener:"Hey, this is Alejandro with Pacifica CRM. We help businesses call, text, organize, and follow up with every lead from one clean workspace. Who is responsible for your incoming leads?",discovery:["Where do your leads come from today?","How quickly is a new inquiry contacted?","What happens when the first call is not answered?"],demo:["Priority call queue","Complete contact history","Pipeline and follow-up tracking"],objection:"Totally fair. Pacifica starts at $25 a month. Give me five minutes to show you the workflow, and then you can decide if it would save your team time."},
};

function valueFrom(prospect:SalesProspect,...names:string[]){
  const wanted=names.map(name=>name.toLowerCase().replace(/[^a-z0-9]/g,""));
  return Object.entries(prospect.extraFields||{}).find(([key])=>wanted.includes(key.toLowerCase().replace(/[^a-z0-9]/g,"")))?.[1]||"";
}

function playbookFor(product:string){
  const value=product.toLowerCase();
  if(/roof|hvac|plumb|remodel|solar|moving|pest|construction/.test(value))return "Home services";
  if(/law|legal|attorney/.test(value))return "Law firms";
  if(/auto|dealer|automotive/.test(value))return "Automotive";
  if(/dental|dentist|med spa|clinic|health|beauty/.test(value))return "Health & beauty";
  if(/real estate|realtor|mortgage/.test(value))return "Real estate";
  return "General";
}

function priorityRank(prospect:SalesProspect){
  const priority=valueFrom(prospect,"Priority","Lead priority","Tier").toUpperCase();
  if(priority.startsWith("A")||priority.includes("HIGH"))return 0;
  if(priority.startsWith("B")||priority.includes("MEDIUM"))return 1;
  return 2;
}

export default function SalesHQ({prospects,onOpen,onStartPriority,onShowFollowUps}:{prospects:SalesProspect[];onOpen:(id:number)=>void;onStartPriority:()=>void;onShowFollowUps:()=>void}){
  const [industry,setIndustry]=useState("General");
  const [copied,setCopied]=useState("");
  const playbook=playbooks[industry]||playbooks.General;
  const ranked=useMemo(()=>prospects.filter(item=>item.stage!=="Closed").sort((a,b)=>priorityRank(a)-priorityRank(b)).slice(0,8),[prospects]);
  const untouched=prospects.filter(item=>item.outcome==="Not contacted"&&item.stage!=="Closed").length;
  const followUps=prospects.filter(item=>item.stage==="Follow-up").length;
  const demos=prospects.filter(item=>item.stage==="Appointment").length;
  const won=prospects.filter(item=>item.stage==="Closed"&&!["Not interested","Wrong number"].includes(item.outcome)).length;

  async function copy(label:string,value:string){
    try{await navigator.clipboard.writeText(value);setCopied(label);window.setTimeout(()=>setCopied(""),1800)}catch{setCopied("")}
  }

  return <div className="page-view sales-hq">
    <div className="page-title"><div><span className="eyebrow">OWNER SALES HQ</span><h1>Turn the prospect list into customers.</h1><p>Your daily Pacifica sales plan, prioritized accounts, scripts, discovery questions, and demo focus in one place.</p></div><div className="sales-hq-actions"><button onClick={onShowFollowUps}>Work follow-ups</button><button className="primary" onClick={onStartPriority}>Start priority calls</button></div></div>
    <div className="sales-scoreboard"><article><span>UNTOUCHED</span><b>{untouched}</b><small>Call these first</small></article><article><span>FOLLOW-UPS</span><b>{followUps}</b><small>Keep momentum</small></article><article><span>DEMOS BOOKED</span><b>{demos}</b><small>Show the workflow</small></article><article><span>CUSTOMERS WON</span><b>{won}</b><small>Closed opportunities</small></article></div>
    <div className="sales-hq-grid">
      <section className="sales-playbook"><header><div><span>LIVE CALL PLAYBOOK</span><h2>Sell the outcome, not the software.</h2></div><select value={industry} onChange={event=>setIndustry(event.target.value)}>{Object.entries(playbooks).map(([key,item])=><option key={key} value={key}>{item.label}</option>)}</select></header><article className="sales-opener"><span>OPENING</span><p>{playbook.opener}</p><button onClick={()=>void copy("opener",playbook.opener)}>{copied==="opener"?"Copied":"Copy opener"}</button></article><div className="sales-script-columns"><article><span>DISCOVER THE PAIN</span>{playbook.discovery.map(question=><p key={question}>“{question}”</p>)}</article><article><span>SHOW ONLY THIS</span>{playbook.demo.map(item=><p key={item}>✓ {item}</p>)}</article></div><article className="sales-objection"><span>“WE ALREADY HAVE SOMETHING”</span><p>{playbook.objection}</p><button onClick={()=>void copy("objection",playbook.objection)}>{copied==="objection"?"Copied":"Copy response"}</button></article></section>
      <section className="sales-targets"><header><div><span>NEXT BEST ACCOUNTS</span><h2>Call in this order.</h2></div><b>{ranked.length}</b></header>{ranked.map((prospect,index)=>{const website=valueFrom(prospect,"Website","URL","Business website");const reason=valueFrom(prospect,"Why Pacifica fits","Pitch reason","Reason to pitch");const priority=valueFrom(prospect,"Priority","Lead priority","Tier")||"B";return <article key={prospect.id}><em>{String(index+1).padStart(2,"0")}</em><div><b>{prospect.name}</b><small>{prospect.product} · {prospect.city} · Priority {priority}</small><p>{reason||prospect.notes||"Ask how the team handles new leads and missed follow-ups."}</p></div><div><button onClick={()=>{setIndustry(playbookFor(prospect.product));onOpen(prospect.id)}}>Open</button>{website&&<a href={website.startsWith("http")?website:`https://${website}`} target="_blank" rel="noreferrer">Site ↗</a>}</div></article>})}{!ranked.length&&<div className="sales-empty"><b>Import the Pacifica prospect spreadsheet</b><span>Your prioritized accounts will appear here automatically.</span></div>}</section>
    </div>
  </div>;
}

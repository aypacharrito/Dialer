"use client";

import { useEffect, useMemo, useState } from "react";

type QuoteLine = "life" | "home" | "auto";
type QuoteLead = { id:number; name:string; phone:string; email:string; city:string };
type ProviderStatus = { life:boolean; propertyCasualty:boolean };
type SavedQuote = { id:number; line:QuoteLine; leadId:number|null; client:string; createdAt:string; status:"Intake saved"|"Ready for carrier"; answers:Record<string,string> };

const fieldSets:Record<QuoteLine,{label:string;name:string;type?:string;placeholder?:string;options?:string[]}[]> = {
  life:[
    {label:"State",name:"state",placeholder:"TX"},{label:"Date of birth or age",name:"age",placeholder:"65"},
    {label:"Sex",name:"sex",options:["Female","Male"]},{label:"Nicotine use",name:"nicotine",options:["None","Cigarettes","Other nicotine"]},
    {label:"Coverage amount",name:"coverage",placeholder:"25000"},{label:"Monthly budget",name:"budget",placeholder:"100"},
    {label:"Health conditions",name:"conditions",placeholder:"Diabetes, heart history…"},{label:"Medications",name:"medications",placeholder:"Medication names"}
  ],
  home:[
    {label:"Property address",name:"address",placeholder:"123 Main St"},{label:"City",name:"city",placeholder:"Dallas"},
    {label:"State",name:"state",placeholder:"TX"},{label:"ZIP code",name:"zip",placeholder:"75001"},
    {label:"Year built",name:"yearBuilt",placeholder:"1998"},{label:"Dwelling coverage",name:"dwelling",placeholder:"350000"},
    {label:"Occupancy",name:"occupancy",options:["Primary residence","Secondary residence","Rental"]},{label:"Roof year / type",name:"roof",placeholder:"2020 / composition"},
    {label:"Construction",name:"construction",options:["Frame","Masonry","Other"]},{label:"Claims in last 5 years",name:"claims",placeholder:"None"}
  ],
  auto:[
    {label:"Garage ZIP",name:"zip",placeholder:"75001"},{label:"Driver date of birth",name:"dob",type:"date"},
    {label:"License status",name:"license",options:["Valid","Permit","Suspended"]},{label:"Vehicle year",name:"vehicleYear",placeholder:"2022"},
    {label:"Make",name:"make",placeholder:"Toyota"},{label:"Model",name:"model",placeholder:"Camry"},
    {label:"VIN (optional)",name:"vin",placeholder:"17-character VIN"},{label:"Liability limits",name:"limits",options:["30/60/25","50/100/50","100/300/100","Other"]},
    {label:"Comp / collision deductibles",name:"deductibles",options:["500 / 500","1000 / 1000","Other"]},{label:"Tickets or claims",name:"incidents",placeholder:"None in last 5 years"}
  ]
};

const lineCopy = {
  life:{name:"Life",detail:"Final expense and term-life intake",provider:"InsuranceToolkits or carrier life API"},
  home:{name:"Home",detail:"Property and household risk intake",provider:"Approved personal-lines comparative rater"},
  auto:{name:"Auto",detail:"Driver, vehicle, and coverage intake",provider:"Approved personal-lines comparative rater"}
};

export default function QuoteCenter({leads,onOpenContact}:{leads:QuoteLead[];onOpenContact:(id:number)=>void}){
  const [line,setLine]=useState<QuoteLine>("life");
  const [leadId,setLeadId]=useState<number|null>(null);
  const [answers,setAnswers]=useState<Record<string,string>>({});
  const [saved,setSaved]=useState<SavedQuote[]>([]);
  const [status,setStatus]=useState<ProviderStatus>({life:false,propertyCasualty:false});
  const [message,setMessage]=useState("");
  const selected=leads.find(item=>item.id===leadId);
  const connected=line==="life"?status.life:status.propertyCasualty;

  useEffect(()=>{try{const value=localStorage.getItem("pacific-crm-quotes");if(value)setSaved(JSON.parse(value) as SavedQuote[])}catch{}},[]);
  useEffect(()=>{fetch("/api/quotes/status",{cache:"no-store"}).then(r=>r.json()).then(setStatus).catch(()=>{})},[]);
  useEffect(()=>{setAnswers(current=>({...current,city:selected?.city||current.city||""}))},[selected]);
  const recent=useMemo(()=>saved.slice().sort((a,b)=>b.id-a.id).slice(0,6),[saved]);

  function update(name:string,value:string){setAnswers(current=>({...current,[name]:value}))}
  function saveQuote(){
    const client=selected?.name||answers.client||"Walk-in prospect";
    const item:SavedQuote={id:Date.now(),line,leadId,client,createdAt:new Date().toLocaleString(),status:connected?"Ready for carrier":"Intake saved",answers};
    const next=[item,...saved];setSaved(next);localStorage.setItem("pacific-crm-quotes",JSON.stringify(next));setMessage(connected?"Intake saved and ready for the connected carrier":"Intake saved — connect a provider to receive live premiums");
  }
  function requestQuotes(){
    if(!connected){saveQuote();return}
    setMessage("Provider is connected. Carrier submission mapping is the next activation step.");
  }

  return <div className="page-view quote-view">
    <div className="page-title quote-title"><div><span className="eyebrow">PACIFIC QUOTE CENTER</span><h1>Life, Home & Auto.</h1><p>Capture one complete insurance profile during the call, save it to the CRM, and compare approved carrier results once provider access is connected.</p></div><span className="quote-disclaimer">Agent-use intake · Not a binding quote</span></div>
    <div className="quote-tabs">{(["life","home","auto"] as QuoteLine[]).map(item=><button key={item} className={line===item?"active":""} onClick={()=>{setLine(item);setAnswers({});setMessage("")}}><span>{item==="life"?"♡":item==="home"?"⌂":"◇"}</span><b>{lineCopy[item].name}</b><small>{lineCopy[item].detail}</small></button>)}</div>
    <div className="quote-layout">
      <section className="quote-form-card">
        <header><div><span>CLIENT & RISK PROFILE</span><h2>{lineCopy[line].name} quote intake</h2></div><em className={connected?"connected":""}>{connected?"PROVIDER CONNECTED":"API CONNECTION NEEDED"}</em></header>
        <div className="quote-client-row"><label>CRM contact<select value={leadId??""} onChange={e=>setLeadId(e.target.value?Number(e.target.value):null)}><option value="">Walk-in / new prospect</option>{leads.map(item=><option key={item.id} value={item.id}>{item.name} · {item.phone}</option>)}</select></label>{!selected&&<label>Client name<input value={answers.client||""} onChange={e=>update("client",e.target.value)} placeholder="Full name"/></label>}{selected&&<div className="linked-client"><span>LINKED CRM RECORD</span><b>{selected.name}</b><small>{selected.phone} · {selected.email||"No email"}</small></div>}</div>
        <div className="quote-fields">{fieldSets[line].map(field=><label key={field.name}>{field.label}{field.options?<select value={answers[field.name]||""} onChange={e=>update(field.name,e.target.value)}><option value="">Select…</option>{field.options.map(option=><option key={option}>{option}</option>)}</select>:<input type={field.type||"text"} value={answers[field.name]||""} onChange={e=>update(field.name,e.target.value)} placeholder={field.placeholder}/>}</label>)}</div>
        <footer><button className="save-intake" onClick={saveQuote}>Save intake</button><button className="run-quotes" onClick={requestQuotes}>{connected?"Send to carrier rater":"Save & show connection steps"}</button></footer>{message&&<p className="quote-message">{message}</p>}
      </section>
      <aside className="quote-side">
        <section className="connection-card"><span className="eyebrow">LIVE QUOTE CONNECTION</span><h3>{lineCopy[line].provider}</h3><p>{connected?"Credentials are present. Complete the provider-specific field mapping before production submissions.":"The intake works now. Live premiums require a commercial API agreement and credentials from the carrier or comparative-rater vendor."}</p><ul><li><i className={connected?"done":""}/>Secure server credentials</li><li><i/>Carrier appointments and product access</li><li><i/>Approved field and result mapping</li></ul></section>
        <section className="recent-quotes"><header><b>Recent intakes</b><span>{saved.length} saved</span></header>{recent.map(item=><button key={item.id} onClick={()=>item.leadId&&onOpenContact(item.leadId)}><i>{item.line.slice(0,1).toUpperCase()}</i><span><b>{item.client}</b><small>{lineCopy[item.line].name} · {item.createdAt}</small></span><em>{item.status}</em></button>)}{!recent.length&&<p>No quote intakes saved yet.</p>}</section>
      </aside>
    </div>
  </div>
}

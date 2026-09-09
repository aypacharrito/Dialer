"use client";

import {useCallback,useEffect,useState} from "react";

type Check={ready:boolean;detail:string};
type Health={status:string;ready:number;total:number;checks:Record<string,Check>;lastAutomationRun?:{completedAt?:string;sent?:number;blocked?:number;failed?:number};release?:string};
const labels:Record<string,string>={storage:"Storage",voice:"Calling",sms:"Texting",email:"Email",emailReplies:"Email replies",automation:"Automation",ai:"Pacifica AI",recording:"Recordings"};

export default function SystemHealthPanel(){
  const [health,setHealth]=useState<Health|null>(null);
  const [message,setMessage]=useState("Checking…");
  const load=useCallback(async()=>{
    try{
      const response=await fetch("/api/diagnostics/system",{cache:"no-store"});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"Health check failed");
      setHealth(data);
      setMessage(data.status==="launch ready"?"Everything important is connected":"Some setup still needs attention");
    }catch(error){setMessage(error instanceof Error?error.message:"Health check failed")}
  },[]);
  useEffect(()=>{const initial=window.setTimeout(()=>void load(),0);const timer=window.setInterval(()=>void load(),60000);return()=>{window.clearTimeout(initial);window.clearInterval(timer)}},[load]);
  const needsAttention=health?Object.entries(health.checks).filter(([,check])=>!check.ready):[];
  return <section className="system-health system-health-minimal">
    <header><div><span>SYSTEM STATUS</span><h2>{!health?"Checking workspace…":needsAttention.length?`${needsAttention.length} item${needsAttention.length===1?"":"s"} need attention`:"All systems ready"}</h2><p>{message}</p></div><button onClick={()=>void load()}>Refresh</button></header>
    {health&&<div className="health-service-strip">{Object.entries(health.checks).map(([key,check])=><span key={key} className={check.ready?"ready":"setup"}><i/>{labels[key]||key}</span>)}</div>}
    {health&&<details className="health-diagnostics"><summary>Diagnostics</summary><div>{Object.entries(health.checks).map(([key,check])=><article key={key}><span><b>{labels[key]||key}</b><small>{check.detail}</small></span><em>{check.ready?"Ready":"Setup"}</em></article>)}</div>{health.lastAutomationRun&&<footer>{health.lastAutomationRun.completedAt?`Last automation ${new Date(health.lastAutomationRun.completedAt).toLocaleString()}`:"Automation history unavailable"}{health.release?` · Release ${health.release}`:""}</footer>}</details>}
  </section>;
}

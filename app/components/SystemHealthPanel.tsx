"use client";

import {useCallback,useEffect,useState} from "react";

type Check={ready:boolean;detail:string};
type Health={status:string;ready:number;total:number;checks:Record<string,Check>;lastAutomationRun?:{completedAt?:string;sent?:number;blocked?:number;failed?:number};release?:string};

const labels:Record<string,string>={storage:"Workspace storage",voice:"Calling",sms:"Automatic texting",email:"Outbound email",emailReplies:"Inbound email replies",automation:"Follow-up automation",ai:"Pacifica AI",recording:"Call intelligence"};

export default function SystemHealthPanel(){
  const [health,setHealth]=useState<Health|null>(null);
  const [message,setMessage]=useState("Checking every production dependency…");

  const load=useCallback(async()=>{
    try{
      const response=await fetch("/api/diagnostics/system",{cache:"no-store"});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"Health check failed");
      setHealth(data);
      setMessage(data.status==="launch ready"?"Every configured system reports ready.":"Finish the items marked Setup before promising them in a demo.");
    }catch(error){setMessage(error instanceof Error?error.message:"Health check failed")}
  },[]);

  useEffect(()=>{
    const initial=window.setTimeout(()=>void load(),0);
    const timer=window.setInterval(()=>void load(),60000);
    return()=>{window.clearTimeout(initial);window.clearInterval(timer)};
  },[load]);

  return <section className="system-health">
    <header><div><span>LAUNCH CONTROL</span><h2>{health?`${health.ready}/${health.total} systems ready`:"Checking Pacifica…"}</h2><p>{message}</p></div><button onClick={()=>void load()}>Refresh checks</button></header>
    <div className="health-grid">{health&&Object.entries(health.checks).map(([key,check])=><article key={key} className={check.ready?"ready":"setup"}><i/><span><b>{labels[key]||key}</b><small>{check.detail}</small></span><em>{check.ready?"READY":"SETUP"}</em></article>)}</div>
    {health?.lastAutomationRun&&<footer><span>Last automation run: {health.lastAutomationRun.completedAt?new Date(health.lastAutomationRun.completedAt).toLocaleString():"unknown"}</span><span>{health.lastAutomationRun.sent||0} sent · {health.lastAutomationRun.blocked||0} safely blocked · {health.lastAutomationRun.failed||0} failed</span><span>Release {health.release}</span></footer>}
  </section>;
}

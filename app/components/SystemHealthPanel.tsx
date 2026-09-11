"use client";

import {useCallback,useEffect,useRef,useState} from "react";

type Check={ready:boolean;detail:string};
type Health={status:string;ready:number;total:number;checks:Record<string,Check>;lastAutomationRun?:{completedAt?:string;sent?:number;blocked?:number;failed?:number};release?:string};
const labels:Record<string,string>={storage:"Storage",voice:"Calling",sms:"Texting",email:"Email",emailReplies:"Email replies",automation:"Automation",ai:"Pacifica AI",recording:"Recordings"};

export default function SystemHealthPanel(){
  const [health,setHealth]=useState<Health|null>(null);
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(false);
  const request=useRef<AbortController|null>(null);
  const load=useCallback(async()=>{
    request.current?.abort();
    const controller=new AbortController();request.current=controller;
    setLoading(true);setError("");
    try{
      const response=await fetch("/api/diagnostics/system",{cache:"no-store",signal:controller.signal});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"Health check failed");
      if(!controller.signal.aborted)setHealth(data);
    }catch(error){if(!controller.signal.aborted)setError(error instanceof Error?error.message:"Health check failed")}
    finally{if(!controller.signal.aborted)setLoading(false)}
  },[]);
  useEffect(()=>{const initial=window.setTimeout(()=>void load(),0);const timer=window.setInterval(()=>void load(),60000);return()=>{window.clearTimeout(initial);window.clearInterval(timer);request.current?.abort()}},[load]);
  const needsAttention=health?Object.values(health.checks).filter(check=>!check.ready).length:0;
  return <section className="workspace-health" aria-label="System health" aria-busy={loading}>
    <header><div><h2>System health</h2><p role="status">{error?"Could not refresh status":!health?"Checking connections…":needsAttention?`${needsAttention} connection${needsAttention===1?" needs":"s need"} attention`:"All connections ready"}</p></div><button type="button" disabled={loading} onClick={()=>void load()}>{loading?"Checking…":"Refresh"}</button></header>
    {error&&<p className="workspace-health-error" role="alert">{error}</p>}
    {health&&<div className="workspace-health-list">{Object.entries(health.checks).map(([key,check])=><details key={key} className={check.ready?"health-ready":"health-attention"}><summary><b>{labels[key]||key}</b><span>{check.ready?"Connected":"Needs attention"}</span></summary><p>{check.detail}</p></details>)}</div>}
    {health?.lastAutomationRun?.completedAt&&<footer>Last automation run: {new Date(health.lastAutomationRun.completedAt).toLocaleString()}</footer>}
  </section>;
}

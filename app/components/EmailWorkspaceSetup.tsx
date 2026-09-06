"use client";

import {useEffect,useRef,useState} from "react";

type Status={configured:boolean;provider?:string;from?:string;message?:string;error?:string};

export default function EmailWorkspaceSetup(){
  const [status,setStatus]=useState<Status>({configured:false});
  const [loading,setLoading]=useState(true);
  const requestRef=useRef(false);
  async function load(){
    if(requestRef.current)return;
    requestRef.current=true;setLoading(true);
    try{
      const response=await fetch("/api/email/messages",{cache:"no-store"});
      const data=await response.json() as Status;
      setStatus(response.ok?data:{configured:false,error:data.error||"Email status unavailable. Try again."});
    }catch{setStatus({configured:false,error:"Could not reach email service. Check your connection and try again."})}
    finally{requestRef.current=false;setLoading(false)}
  }
  useEffect(()=>{const timer=window.setTimeout(()=>void load(),0);return()=>window.clearTimeout(timer)},[]);
  return <article className="email-workspace-setup" aria-busy={loading}>
    <header><div><span>EMAIL</span><h2>{loading?"Checking connection":status.configured?"Email connected":"Connect your email"}</h2></div><strong className={status.configured?"ready":"attention"}>{loading?"CHECKING":status.error?"UNAVAILABLE":status.configured?"CONNECTED":"SETUP NEEDED"}</strong></header>
    <p role="status">{loading?"Checking your workspace’s email service…":status.error||(status.configured?`Sending from ${status.from||"your configured address"}${status.provider?` through ${status.provider}`:""}.`:status.message||"Add an email provider to send messages from your workspace.")}</p>
    <details className="integration-details"><summary>Connection details</summary><div className="integration-detail-grid">
      <section><b>Outbound · Resend</b><code>RESEND_API_KEY</code><code>PACIFICA_EMAIL_FROM</code></section>
      <section><b>Replies &amp; delivery events</b><code>RESEND_WEBHOOK_SECRET</code><code>PACIFICA_INBOUND_EMAIL_DOMAIN</code><code>https://pacificacrm.com/api/email/webhook</code></section>
      <section><b>Other outbound providers</b><code>PACIFICA_EMAIL_WEBHOOK_URL</code><code>PACIFICA_EMAIL_WEBHOOK_SECRET</code></section>
    </div></details>
    <footer><span>Delivery status and replies appear in Messages.</span><button type="button" disabled={loading} onClick={()=>void load()}>{loading?"Checking…":"Check connection"}</button></footer>
  </article>;
}

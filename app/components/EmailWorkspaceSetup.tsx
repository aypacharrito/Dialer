"use client";

import {useEffect,useState} from "react";

type Status={configured:boolean;provider?:string;from?:string;message?:string;error?:string};

export default function EmailWorkspaceSetup(){
  const [status,setStatus]=useState<Status>({configured:false,message:"Checking email adapter…"});
  async function load(){try{const response=await fetch("/api/email/messages",{cache:"no-store"});const data=await response.json() as Status;setStatus(response.ok?data:{configured:false,error:data.error||"Email status unavailable"})}catch{setStatus({configured:false,error:"Email status unavailable"})}}
  useEffect(()=>{const timer=window.setTimeout(()=>void load(),0);return()=>window.clearTimeout(timer)},[]);
  return <article className="email-workspace-setup"><header><div><span>PROVIDER-INDEPENDENT EMAIL</span><h2>{status.configured?`${status.provider} connected`:"Ready for an email provider"}</h2></div><strong className={status.configured?"ready":"attention"}>{status.configured?"DELIVERY READY":"ADAPTER WAITING"}</strong></header><p>{status.configured?`Sending from ${status.from}. Templates, permissions, compliance footers, AI drafts, and history are active.`:status.error||status.message}</p><div><section><b>Fastest setup · Resend</b><code>RESEND_API_KEY</code><code>PACIFICA_EMAIL_FROM</code></section><section><b>Any other provider</b><code>PACIFICA_EMAIL_WEBHOOK_URL</code><code>PACIFICA_EMAIL_WEBHOOK_SECRET</code></section></div><footer><span>The generic adapter accepts Pacifica’s normalized email payload, so SendGrid, Mailgun, Postmark, Telnyx integrations, or an automation service can be swapped in later.</span><button type="button" onClick={()=>void load()}>Check email setup</button></footer></article>;
}

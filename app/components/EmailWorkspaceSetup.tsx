"use client";

import {useEffect,useState} from "react";

type Status={configured:boolean;provider?:string;from?:string;message?:string;error?:string};

export default function EmailWorkspaceSetup(){
  const [status,setStatus]=useState<Status>({configured:false,message:"Checking email adapter…"});
  async function load(){try{const response=await fetch("/api/email/messages",{cache:"no-store"});const data=await response.json() as Status;setStatus(response.ok?data:{configured:false,error:data.error||"Email status unavailable"})}catch{setStatus({configured:false,error:"Email status unavailable"})}}
  useEffect(()=>{const timer=window.setTimeout(()=>void load(),0);return()=>window.clearTimeout(timer)},[]);
  return <article className="email-workspace-setup"><header><div><span>PROVIDER-INDEPENDENT EMAIL</span><h2>{status.configured?`${status.provider} connected`:"Ready for an email provider"}</h2></div><strong className={status.configured?"ready":"attention"}>{status.configured?"DELIVERY READY":"ADAPTER WAITING"}</strong></header><p>{status.configured?`Sending from ${status.from}. Templates, permissions, compliance footers, AI drafts, history, and provider events are active.`:status.error||status.message}</p><div><section><b>Outbound · Resend</b><code>RESEND_API_KEY</code><code>PACIFICA_EMAIL_FROM</code></section><section><b>Replies &amp; delivery events</b><code>RESEND_WEBHOOK_SECRET</code><code>PACIFICA_INBOUND_EMAIL_DOMAIN</code><code>https://pacificacrm.com/api/email/webhook</code></section><section><b>Any outbound provider</b><code>PACIFICA_EMAIL_WEBHOOK_URL</code><code>PACIFICA_EMAIL_WEBHOOK_SECRET</code></section></div><footer><span>Resend webhooks stop sequences on replies, bounces, complaints, suppressions, and unsubscribe replies. The generic outbound adapter keeps SendGrid, Mailgun, Postmark, or Telnyx replaceable.</span><button type="button" onClick={()=>void load()}>Check email setup</button></footer></article>;
}

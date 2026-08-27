import {logError,logEvent} from "./observability";

export type OutboundEmailInput={
  to:string;
  subject:string;
  text:string;
  fromName?:string;
  replyTo?:string;
  idempotencyKey:string;
};

export type EmailProviderStatus={configured:boolean;provider:"resend"|"webhook"|"none";from:string;message:string};

function email(value:string){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())?value.trim():""}
function escapeHtml(value:string){return value.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}

export function outboundEmailStatus():EmailProviderStatus{
  const from=email(process.env.PACIFICA_EMAIL_FROM||"");
  const webhook=(process.env.PACIFICA_EMAIL_WEBHOOK_URL||"").trim();
  if(webhook&&process.env.PACIFICA_EMAIL_WEBHOOK_SECRET&&from)return {configured:true,provider:"webhook",from,message:"Custom email adapter ready"};
  if(process.env.RESEND_API_KEY&&from)return {configured:true,provider:"resend",from,message:"Resend email ready"};
  return {configured:false,provider:"none",from,message:"Add RESEND_API_KEY and PACIFICA_EMAIL_FROM, or connect the generic email webhook adapter"};
}

export async function sendOutboundEmail(input:OutboundEmailInput){
  const status=outboundEmailStatus();
  const to=email(input.to);if(!to)throw new Error("This contact does not have a valid email address");
  if(!status.configured)throw new Error(status.message);
  const subject=input.subject.trim().slice(0,200);if(!subject)throw new Error("Add an email subject");
  const text=input.text.trim().slice(0,10000);if(!text)throw new Error("Write an email first");
  const fromName=(input.fromName||"Pacifica customer").replace(/[<>\r\n]/g,"").trim().slice(0,80);
  const from=`${fromName||"Pacifica customer"} <${status.from}>`;
  const replyTo=email(input.replyTo||"")||undefined;
  try{
    if(status.provider==="webhook"){
      const response=await fetch(process.env.PACIFICA_EMAIL_WEBHOOK_URL!,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${process.env.PACIFICA_EMAIL_WEBHOOK_SECRET}`,"Idempotency-Key":input.idempotencyKey},body:JSON.stringify({from,to,replyTo,subject,text,idempotencyKey:input.idempotencyKey})});
      const data=await response.json().catch(()=>({})) as {id?:string;messageId?:string;error?:string};
      if(!response.ok)throw new Error(data.error||`Email adapter returned HTTP ${response.status}`);
      const providerId=data.id||data.messageId||input.idempotencyKey;
      logEvent("email_sent",{provider:"webhook",providerId,toDomain:to.split("@")[1]});
      return {id:providerId,provider:"webhook" as const};
    }
    const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,"Content-Type":"application/json","Idempotency-Key":input.idempotencyKey},body:JSON.stringify({from,to:[to],subject,text,html:`<div style="font-family:Arial,sans-serif;white-space:pre-wrap;line-height:1.6">${escapeHtml(text)}</div>`,...(replyTo?{reply_to:replyTo}:{})})});
    const data=await response.json().catch(()=>({})) as {id?:string;message?:string;name?:string};
    if(!response.ok||!data.id)throw new Error(data.message||data.name||`Resend returned HTTP ${response.status}`);
    logEvent("email_sent",{provider:"resend",providerId:data.id,toDomain:to.split("@")[1]});
    return {id:data.id,provider:"resend" as const};
  }catch(error){logError("email_send_failed",error,{provider:status.provider,toDomain:to.split("@")[1]});throw error}
}

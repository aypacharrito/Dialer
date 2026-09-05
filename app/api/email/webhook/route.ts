import {Webhook} from "standardwebhooks";
import {appendCommunication,type StoredCommunication} from "../../../lib/communications";
import {logError,logEvent} from "../../../lib/observability";
import {listStoredWorkspaces,readStoredWorkspace,writeStoredWorkspace} from "../../../lib/workspace-storage";
import {sendExpoPush} from "../../../lib/expo-push";

export const runtime="nodejs";

type ResendEvent={type:string;created_at?:string;data:{email_id?:string;from?:string;to?:string[];subject?:string;created_at?:string;message_id?:string}};
type ReceivedEmail={id:string;from:string;to:string[];subject:string;text?:string|null;html?:string|null;created_at?:string;message_id?:string};

function sender(value:string){return (value.match(/<([^<>\s]+@[^<>\s]+)>/)?.[1]||value).trim().toLowerCase()}
function plain(value:string){return value.replace(/<style[\s\S]*?<\/style>/gi,"").replace(/<script[\s\S]*?<\/script>/gi,"").replace(/<[^>]+>/g," ").replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/\s+/g," ").trim().slice(0,10000)}
function workspaceHint(to:string[]=[]){for(const address of to){const match=address.match(/^reply\+([a-zA-Z0-9_-]+)@/);if(match)return match[1]}return ""}
function statusFor(type:string){return type.replace(/^email\./,"").replaceAll("_"," ")}
function suppression(type:string){return type==="email.bounced"||type==="email.complained"||type==="email.suppressed"}

function verified(raw:string,request:Request):ResendEvent{
  const secret=(process.env.RESEND_WEBHOOK_SECRET||"").trim();if(!secret)throw new Error("RESEND_WEBHOOK_SECRET is not configured");
  const id=request.headers.get("svix-id")||request.headers.get("webhook-id")||"";
  const timestamp=request.headers.get("svix-timestamp")||request.headers.get("webhook-timestamp")||"";
  const signature=request.headers.get("svix-signature")||request.headers.get("webhook-signature")||"";
  return new Webhook(secret).verify(raw,{"webhook-id":id,"webhook-timestamp":timestamp,"webhook-signature":signature}) as ResendEvent;
}

async function receivedEmail(emailId:string){
  const response=await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}`,{headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY||""}`},cache:"no-store"});
  const data=await response.json().catch(()=>({})) as ReceivedEmail&{message?:string};
  if(!response.ok)throw new Error(data.message||`Resend Receiving returned HTTP ${response.status}`);
  return data;
}

async function recordsForHint(hint:string){const direct=hint?await readStoredWorkspace(hint):null;return direct?[{workspaceId:hint,workspace:direct}]:await listStoredWorkspaces(500)}

async function saveInbound(event:ResendEvent){
  const email=await receivedEmail(String(event.data.email_id||""));const from=sender(email.from||event.data.from||"");if(!from)return false;
  const records=await recordsForHint(workspaceHint(email.to||event.data.to));
  for(const record of records){let matched=false;const body=String(email.text||"").trim()||plain(String(email.html||""))||"Email reply received";const sentAt=email.created_at||event.created_at||new Date().toISOString();const unsub=/^\s*(unsubscribe|stop)\s*[.!]?\s*$/i.test(body);
    const leads=(record.workspace.leads as Array<Record<string,unknown>>).map(raw=>{
      if(matched||String(raw.email||"").trim().toLowerCase()!==from)return raw;matched=true;
      const communication:StoredCommunication={id:String(email.id||event.data.email_id||crypto.randomUUID()),channel:"email",direction:"inbound",subject:String(email.subject||event.data.subject||"").slice(0,200),body,status:"received",sentAt,provider:"resend",providerId:String(event.data.email_id||email.id)};
      return {...raw,lastInboundAt:sentAt,lastContact:"Email reply received",automationNextAt:"",automationStatus:unsub?"opted out":"replied",...(unsub?{emailOptOut:true,emailConsent:false}:{}),communications:appendCommunication(raw.communications,communication)};
    });
    if(matched){await writeStoredWorkspace(record.workspaceId,{...record.workspace,leads});void sendExpoPush(record.workspace.profile.expoPushToken,"New Pacifica email",email.subject||body,{channel:"email"});logEvent("inbound_email_saved",{workspaceId:record.workspaceId,fromDomain:from.split("@")[1],unsubscribed:unsub});return true}
  }
  return false;
}

async function saveDelivery(event:ResendEvent){
  const providerId=String(event.data.email_id||"");if(!providerId)return 0;let changed=0;
  for(const record of await listStoredWorkspaces(500)){let workspaceChanged=false;
    const leads=(record.workspace.leads as Array<Record<string,unknown>>).map(raw=>{const communications=Array.isArray(raw.communications)?raw.communications as StoredCommunication[]:[];let matched=false;
      const next=communications.map(item=>{if(item.providerId!==providerId)return item;matched=true;return {...item,status:statusFor(event.type),failureReason:suppression(event.type)?statusFor(event.type):undefined}});
      if(!matched)return raw;workspaceChanged=true;return {...raw,communications:next,...(suppression(event.type)?{emailOptOut:true,emailConsent:false,automationStatus:"email suppressed",automationNextAt:""}:{})};
    });
    if(workspaceChanged){await writeStoredWorkspace(record.workspaceId,{...record.workspace,leads});changed++}
  }
  return changed;
}

export async function POST(request:Request){
  const raw=await request.text();let event:ResendEvent;
  try{event=verified(raw,request)}catch(error){logError("email_webhook_rejected",error);return new Response("Invalid webhook signature",{status:401})}
  try{
    if(event.type==="email.received")return Response.json({received:true,matched:await saveInbound(event)});
    if(event.type.startsWith("email."))return Response.json({received:true,updatedWorkspaces:await saveDelivery(event)});
    return Response.json({received:true,ignored:true});
  }catch(error){logError("email_webhook_failed",error,{type:event.type});return Response.json({error:"Webhook processing failed"},{status:500})}
}

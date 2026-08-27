import {getPacificaAccess} from "../../../lib/clerk-access";
import {isClerkConfigured} from "../../../lib/clerk-config";
import {inboundReplyAddress,outboundEmailStatus,sendOutboundEmail} from "../../../lib/outbound-email";
import {appendCommunication} from "../../../lib/communications";
import {readStoredWorkspace,writeStoredWorkspace} from "../../../lib/workspace-storage";

export const runtime="nodejs";

async function access(){
  const result=isClerkConfigured()?await getPacificaAccess():{allowed:!process.env.VERCEL,userId:"local",email:"local"};
  if(!result.allowed)throw new Error("An active Pacifica subscription is required.");
  return result;
}

export async function GET(){
  try{await access();return Response.json(outboundEmailStatus(),{headers:{"Cache-Control":"no-store"}})}
  catch(error){return Response.json({configured:false,error:error instanceof Error?error.message:"Email status unavailable"},{status:403})}
}

export async function POST(request:Request){
  try{
    const workspace=await access();
    const body=await request.json() as {to?:string;subject?:string;text?:string;fromName?:string;replyTo?:string;leadId?:number;idempotencyKey?:string};
    const leadId=Math.max(0,Number(body.leadId)||0);const stored=await readStoredWorkspace(workspace.userId);const lead=stored?.leads.find(raw=>Number((raw as Record<string,unknown>).id)===leadId) as Record<string,unknown>|undefined;
    if(!lead||String(lead.email||"").trim().toLowerCase()!==String(body.to||"").trim().toLowerCase())return Response.json({error:"Save this email address on the workspace contact before sending."},{status:400});
    if(lead.doNotCall||lead.emailOptOut||lead.emailConsent!==true)return Response.json({error:lead.emailOptOut?"This contact unsubscribed from email.":"Document this contact’s email permission before sending."},{status:403});
    if(!stored?.profile.businessAddress)return Response.json({error:"Add the business mailing address in Owner Settings before sending commercial email."},{status:400});
    const footer=`\n\n${stored.profile.businessAddress}\nReply UNSUBSCRIBE if you no longer want these emails.`;const text=`${String(body.text||"").trim()}${String(body.text||"").includes(stored.profile.businessAddress)?"":footer}`.slice(0,10000);
    const idempotencyKey=String(body.idempotencyKey||`manual-${workspace.userId}-${leadId}-${Date.now()}`).replace(/[^a-zA-Z0-9:_-]/g,"-").slice(0,200);
    const result=await sendOutboundEmail({to:String(body.to||""),subject:String(body.subject||""),text,fromName:String(body.fromName||""),replyTo:inboundReplyAddress(workspace.userId)||String(body.replyTo||""),idempotencyKey});const sentAt=new Date().toISOString();
    const leads=stored.leads.map(raw=>Number((raw as Record<string,unknown>).id)===leadId?{...(raw as Record<string,unknown>),lastEmailAt:sentAt,communications:appendCommunication((raw as Record<string,unknown>).communications,{id:crypto.randomUUID(),channel:"email",direction:"outbound",subject:String(body.subject||"").slice(0,200),body:text,status:"sent",sentAt,provider:result.provider,providerId:result.id})}:raw);await writeStoredWorkspace(workspace.userId,{...stored,leads});
    return Response.json({ok:true,message:{id:result.id,provider:result.provider,status:"sent",sentAt}});
  }catch(error){return Response.json({error:error instanceof Error?error.message:"Email could not be sent"},{status:503})}
}

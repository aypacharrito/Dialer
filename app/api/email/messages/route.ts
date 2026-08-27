import {getPacificaAccess} from "../../../lib/clerk-access";
import {isClerkConfigured} from "../../../lib/clerk-config";
import {outboundEmailStatus,sendOutboundEmail} from "../../../lib/outbound-email";

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
    const idempotencyKey=String(body.idempotencyKey||`manual-${workspace.userId}-${body.leadId||"contact"}-${Date.now()}`).replace(/[^a-zA-Z0-9:_-]/g,"-").slice(0,200);
    const result=await sendOutboundEmail({to:String(body.to||""),subject:String(body.subject||""),text:String(body.text||""),fromName:String(body.fromName||""),replyTo:String(body.replyTo||""),idempotencyKey});
    return Response.json({ok:true,message:{id:result.id,provider:result.provider,status:"sent",sentAt:new Date().toISOString()}});
  }catch(error){return Response.json({error:error instanceof Error?error.message:"Email could not be sent"},{status:503})}
}

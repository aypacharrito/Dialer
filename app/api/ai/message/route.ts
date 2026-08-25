import OpenAI from "openai";
import { hasPacificaWorkspaceApiAccess } from "../../../lib/clerk-access";

export const runtime="nodejs";

function firstName(name:string){return name.trim().split(/\s+/)[0]||"there"}

export async function POST(request:Request){
  if(!await hasPacificaWorkspaceApiAccess())return Response.json({error:"An active Pacifica subscription is required."},{status:403});
  try{
    const body=await request.json() as {lead?:Record<string,unknown>};
    const lead=body.lead||{};
    const name=String(lead.name||"there").slice(0,100);
    const product=String(lead.product||lead.line||"insurance").slice(0,100);
    const city=String(lead.city||"").slice(0,80);
    const outcome=String(lead.outcome||"Not contacted").slice(0,80);
    const notes=String(lead.notes||"").slice(0,600);
    const personal=(process.env.PACIFICA_PERSONAL_NUMBER||"+1 (818) 441-1987").trim();
    const fallback=`Hey ${firstName(name)}, it’s Alejandro with Pacifica. I wanted to check in about the ${product} coverage you were looking for${city?` in ${city}`:""}. Text me here or call me at ${personal} when you have a minute. Reply STOP to opt out.`;
    if(!process.env.OPENAI_API_KEY)return Response.json({draft:fallback.slice(0,500)});
    const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
    const response=await client.responses.create({
      model:process.env.OPENAI_MODEL||"gpt-5.6-luna",store:false,max_output_tokens:220,
      input:[{role:"system",content:`Write one friendly business-casual insurance follow-up SMS as Alejandro from Pacifica. It must sound human, not corporate or pushy. Use only supplied facts, never state a price or approval, never mention medical details, and never imply consent. Mention the requested coverage naturally. Include this exact callback number: ${personal}. End with: Reply STOP to opt out. Return only the message, under 480 characters.`},{role:"user",content:JSON.stringify({name,product,city,outcome,notes})}],
    });
    const draft=response.output_text.trim().replace(/^['"]|['"]$/g,"");
    return Response.json({draft:(draft||fallback).slice(0,500)});
  }catch(error){console.error("Pacifica AI message error",error instanceof Error?error.message:"unknown");return Response.json({error:"Pacifica AI could not draft this message"},{status:500})}
}

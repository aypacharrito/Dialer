import OpenAI from "openai";
import { hasPacificaWorkspaceApiAccess } from "../../../lib/clerk-access";

export const runtime="nodejs";

function firstName(name:string){return name.trim().split(/\s+/)[0]||"there"}

function modelCandidates(){return Array.from(new Set([process.env.OPENAI_MODEL?.trim(),"gpt-5-mini","gpt-4.1-mini"].filter(Boolean) as string[]))}

function stableIndex(value:string,length:number){let hash=0;for(const char of value)hash=(hash*31+char.charCodeAt(0))>>>0;return hash%length}

function localDraft(name:string,product:string,city:string,personal:string,seed:string){
  const place=city?` in ${city}`:"";
  const templates=[
    `Hey ${firstName(name)}, it’s Alejandro with Pacifica. Just checking in about the ${product} coverage you were looking for${place}. If you still want help comparing options, text me here or call ${personal}. Reply STOP to opt out.`,
    `Hi ${firstName(name)}, Alejandro from Pacifica here. I wanted to follow up on your request for ${product} coverage${place}. I’m happy to help whenever the timing is right—text me back or call ${personal}. Reply STOP to opt out.`,
    `Hey ${firstName(name)}—it’s Alejandro with Pacifica. I have your ${product} request and wanted to see what questions I can clear up for you${place}. You can reply here or reach me at ${personal}. Reply STOP to opt out.`,
    `Hi ${firstName(name)}, this is Alejandro at Pacifica. I’m following up on the ${product} information you requested${place}. No pressure—when you’re ready, text me here or call ${personal}. Reply STOP to opt out.`,
  ];
  return templates[stableIndex(seed,lengthOrOne(templates.length))].slice(0,500);
}

function lengthOrOne(length:number){return Math.max(1,length)}

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
    const fallback=localDraft(name,product,city,personal,String(lead.id||name));
    if(!process.env.OPENAI_API_KEY)return Response.json({draft:fallback,mode:"smart-fallback",notice:"OpenAI is not configured, so Pacifica wrote a safe personalized draft locally."});
    const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
    for(const model of modelCandidates()){
      try{
        const response=await client.responses.create({
          model,store:false,max_output_tokens:220,
          input:[{role:"system",content:`Write one friendly business-casual insurance follow-up SMS as Alejandro from Pacifica. It must sound human, not corporate or pushy. Use only supplied facts, never state a price or approval, never mention medical details, and never imply consent. Mention the requested coverage naturally. Include this exact callback number: ${personal}. End with: Reply STOP to opt out. Return only the message, under 480 characters.`},{role:"user",content:JSON.stringify({name,product,city,outcome,notes})}],
        });
        const draft=response.output_text.trim().replace(/^['"]|['"]$/g,"");
        if(draft)return Response.json({draft:draft.slice(0,500),mode:"ai"});
      }catch(error){console.error("[pacifica-ai/message] model failed",{model,error:error instanceof Error?error.message:"unknown"})}
    }
    return Response.json({draft:fallback,mode:"smart-fallback",notice:"The AI provider did not answer, so Pacifica prepared a safe personalized draft locally."});
  }catch(error){console.error("[pacifica-ai/message] request failed",error instanceof Error?error.message:"unknown");return Response.json({error:"Pacifica could not read this contact record"},{status:400})}
}

import {aiClient,aiConfigured,aiModel,aiProviderIssue,aiReasoning} from "../../../lib/ai-provider";
import { hasPacificaWorkspaceApiAccess } from "../../../lib/clerk-access";
import { cleanWorkspaceProfile } from "../../../lib/workspace-profile";

export const runtime="nodejs";

function firstName(name:string){return name.trim().split(/\s+/)[0]||"there"}



function stableIndex(value:string,length:number){let hash=0;for(const char of value)hash=(hash*31+char.charCodeAt(0))>>>0;return hash%length}

function localDraft(name:string,product:string,city:string,agentName:string,businessName:string,callbackNumber:string,seed:string){
  const place=city?` in ${city}`:"";
  const sender=[agentName,businessName&&`with ${businessName}`].filter(Boolean).join(" ")||"from our team";
  const callback=callbackNumber?` or call ${callbackNumber}`:"";
  const templates=[
    `Hi ${firstName(name)}, this is ${sender}. I’m following up on your request for ${product}${place}. Are you still looking for assistance? Reply here when convenient${callback}. Reply STOP to opt out.`,
    `Hi ${firstName(name)}, ${sender} here. I wanted to check in regarding ${product}${place}. I’m available to answer questions and help with the next step${callback}. Reply STOP to opt out.`,
    `Hi ${firstName(name)}, this is ${sender}. We received your ${product} inquiry${place}, and I wanted to see how I can help. You can reply directly to this message${callback}. Reply STOP to opt out.`,
    `Hi ${firstName(name)}, this is ${sender}. I’m following up on the ${product} information you requested${place}. Please let me know if you would still like assistance${callback}. Reply STOP to opt out.`,
  ];
  return templates[stableIndex(seed,lengthOrOne(templates.length))].slice(0,500);
}

function localEmailDraft(name:string,product:string,city:string,agentName:string,businessName:string,callbackNumber:string){
  const sender=[agentName,businessName&&`with ${businessName}`].filter(Boolean).join(" ")||"from our team";
  const place=city?` in ${city}`:"";
  const callback=callbackNumber?` You can also call ${callbackNumber}.`:"";
  return {subject:`Following up on your ${product} request`.slice(0,160),draft:`Hi ${firstName(name)},\n\nThis is ${sender}. I’m following up on your request for ${product}${place}. I’m available to answer questions and help with the next step whenever convenient.${callback}\n\nBest,\n${agentName||businessName||"The team"}`.slice(0,3000)};
}

function lengthOrOne(length:number){return Math.max(1,length)}

export async function POST(request:Request){
  if(!await hasPacificaWorkspaceApiAccess())return Response.json({error:"An active Pacifica subscription is required."},{status:403});
  try{
    const body=await request.json() as {lead?:Record<string,unknown>;profile?:unknown;channel?:"sms"|"email"};
    const lead=body.lead||{};
    const profile=cleanWorkspaceProfile(body.profile);
    const name=String(lead.name||"there").slice(0,100);
    const product=String(lead.product||"service").slice(0,100);
    const city=String(lead.city||"").slice(0,80);
    const outcome=String(lead.outcome||"Not contacted").slice(0,80);
    const notes=String(lead.notes||"").slice(0,600);
    const channel=body.channel==="email"?"email":"sms";
    const emailFallback=localEmailDraft(name,product,city,profile.agentName,profile.businessName,profile.callbackNumber);
    const fallback=channel==="email"?emailFallback.draft:localDraft(name,product,city,profile.agentName,profile.businessName,profile.callbackNumber,String(lead.id||name));
    const subject=channel==="email"?emailFallback.subject:"";
    if(!aiConfigured())return Response.json({draft:fallback,subject,mode:"smart-fallback",notice:"OpenAI is not configured, so Pacifica wrote a safe personalized draft locally."});
    const client=aiClient();let providerNotice="";let providerCode="";
    for(const model of [aiModel()]){
      try{
        const response=await client.responses.create({
          model,store:false,...aiReasoning(model),max_output_tokens:2000,
          input:[{role:"system",content:channel==="email"?`Write one concise, friendly business-casual sales follow-up email body. Sound human, not corporate or pushy. Use only supplied facts and never invent a price, promise, approval, consent, or appointment. Mention the requested product naturally. ${profile.callbackNumber?`You may include this exact callback number: ${profile.callbackNumber}.`:"Invite an email reply."} Include a greeting and natural signature, but no subject line or compliance footer. Return only the body, under 2,500 characters.`:`Write one friendly business-casual sales follow-up SMS. It must sound human, not corporate or pushy. Identify the sender only from the supplied representative and business names. Use only supplied facts, never invent a price, promise, approval, consent, or appointment. Mention the requested product or service naturally. ${profile.callbackNumber?`Include this exact callback number: ${profile.callbackNumber}.`:"Do not invent a callback number; invite a reply instead."} End with: Reply STOP to opt out. Return only the message, under 480 characters.`},{role:"user",content:JSON.stringify({name,product,city,outcome,notes,representative:profile.agentName,business:profile.businessName})}],
        });
        if(response.status!=="completed")throw {code:"incomplete_response"};
        const draft=response.output_text.trim().replace(/^['"]|['"]$/g,"");
        if(draft){const optOut="Reply STOP to opt out.";const complete=channel==="sms"?`${draft.replace(/Reply STOP to opt out\.?/gi,"").trim().slice(0,477)} ${optOut}`:draft.slice(0,3000);return Response.json({draft:complete,subject,mode:"ai"})}
        throw {code:"incomplete_response"};
      }catch(error){const issue=aiProviderIssue(error);providerNotice=issue.notice;providerCode=issue.code;console.error("[pacifica-ai/message] request failed",{model,code:issue.code})}
    }
    return Response.json({draft:fallback,subject,mode:"smart-fallback",notice:`${providerNotice} Pacifica prepared a local template instead.`,providerCode});
  }catch(error){console.error("[pacifica-ai/message] request failed",error instanceof Error?error.message:"unknown");return Response.json({error:"Pacifica could not read this contact record"},{status:400})}
}

import OpenAI from "openai";

export const runtime = "nodejs";

const allowedStages = ["New lead","Follow-up","Appointment","Closed"];
const allowedOutcomes = ["Not contacted","No answer","Voicemail","Interested","Appointment set","Not interested","Wrong number"];

type CrmPriority = {leadId:number;leadName:string;score:number;reason:string;nextStep:string};
type CrmAction = {leadId:number;leadName:string;title:string;reason:string;patch:{stage:string|null;outcome:string|null;followUp:string|null;notesToAppend:string|null}};
type CrmAnalysis = {summary:string;priorities:CrmPriority[];actions:CrmAction[];draft:string};

function localAnalysis(leads:Array<Record<string,unknown>>):CrmAnalysis {
  const ranked=leads.slice(0,5).map((lead,index)=>({leadId:Number(lead.id),leadName:String(lead.name||"Unknown lead"),score:Math.max(55,90-index*7),reason:lead.outcome==="Interested"?"Already showed interest and should receive prompt follow-up.":lead.followUp?"A follow-up is already scheduled and needs attention.":"Open opportunity with no completed next step.",nextStep:lead.followUp?`Follow up on ${String(lead.followUp)}`:"Call and confirm needs, timing, and preferred coverage."}));
  return {summary:`${leads.length} eligible contacts were reviewed locally. Add an OpenAI API key to unlock natural-language analysis, personalized drafts, and smarter cross-record prioritization.`,priorities:ranked,actions:[],draft:""};
}

export async function POST(request:Request) {
  try {
    const body=await request.json() as {prompt?:string;includeNotes?:boolean;leads?:Array<Record<string,unknown>>};
    const prompt=String(body.prompt||"").trim().slice(0,1000);
    const incoming=Array.isArray(body.leads)?body.leads.slice(0,100):[];
    if(!prompt)return Response.json({error:"Enter a CRM question first"},{status:400});
    if(!incoming.length)return Response.json({error:"No eligible contacts were provided"},{status:400});
    const leads=incoming.map(lead=>({id:Number(lead.id),name:String(lead.name||"Unknown lead").slice(0,100),city:String(lead.city||"").slice(0,80),stage:String(lead.stage||"New lead"),outcome:String(lead.outcome||"Not contacted"),followUp:String(lead.followUp||""),lastContact:String(lead.lastContact||"Never").slice(0,80),line:lead.line==="home-auto"?"home-auto":"life",notes:body.includeNotes?String(lead.notes||"").slice(0,1000):"[not shared]"}));
    if(!process.env.OPENAI_API_KEY)return Response.json(localAnalysis(leads));
    const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
    const response=await client.responses.create({
      model:process.env.OPENAI_MODEL||"gpt-5.6-luna",
      store:false,
      input:[{role:"system",content:"You are Pacifica AI, a careful CRM copilot for licensed insurance agents. Analyze only the provided records. Never invent facts, premiums, consent, health details, or carrier eligibility. Do not recommend contacting do-not-call records. Keep advice concise. Proposed changes require human approval."},{role:"user",content:`Request: ${prompt}\n\nCRM records:\n${JSON.stringify(leads)}`}],
      text:{format:{type:"json_schema",name:"pacifica_crm_analysis",strict:true,schema:{type:"object",additionalProperties:false,properties:{summary:{type:"string"},priorities:{type:"array",items:{type:"object",additionalProperties:false,properties:{leadId:{type:"number"},leadName:{type:"string"},score:{type:"number"},reason:{type:"string"},nextStep:{type:"string"}},required:["leadId","leadName","score","reason","nextStep"]}},actions:{type:"array",items:{type:"object",additionalProperties:false,properties:{leadId:{type:"number"},leadName:{type:"string"},title:{type:"string"},reason:{type:"string"},patch:{type:"object",additionalProperties:false,properties:{stage:{type:["string","null"]},outcome:{type:["string","null"]},followUp:{type:["string","null"]},notesToAppend:{type:["string","null"]}},required:["stage","outcome","followUp","notesToAppend"]}},required:["leadId","leadName","title","reason","patch"]}},draft:{type:"string"}},required:["summary","priorities","actions","draft"]}}},
      max_output_tokens:2200,
    });
    const result=JSON.parse(response.output_text) as CrmAnalysis;
    const validIds=new Set(leads.map(lead=>lead.id));
    result.priorities=result.priorities.filter(item=>validIds.has(item.leadId)).slice(0,10).map(item=>({...item,score:Math.max(0,Math.min(100,Math.round(item.score)))}));
    result.actions=result.actions.filter(action=>validIds.has(action.leadId)).slice(0,10).map(action=>({...action,patch:{stage:action.patch.stage&&allowedStages.includes(action.patch.stage)?action.patch.stage:null,outcome:action.patch.outcome&&allowedOutcomes.includes(action.patch.outcome)?action.patch.outcome:null,followUp:action.patch.followUp&&/^\d{4}-\d{2}-\d{2}$/.test(action.patch.followUp)?action.patch.followUp:null,notesToAppend:action.patch.notesToAppend?.slice(0,500)||null}}));
    return Response.json(result);
  } catch(error) {
    console.error("Pacifica AI CRM error",error instanceof Error?error.message:"Unknown error");
    return Response.json({error:"Pacifica AI is temporarily unavailable"},{status:500});
  }
}

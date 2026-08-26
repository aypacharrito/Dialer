import OpenAI from "openai";
import { hasPacificaWorkspaceApiAccess } from "../../../lib/clerk-access";

export const runtime = "nodejs";

const allowedStages = ["New lead","Follow-up","Appointment","Closed"];
const allowedOutcomes = ["Not contacted","No answer","Voicemail","Interested","Appointment set","Not interested","Wrong number"];

type CrmPriority = {leadId:number;leadName:string;score:number;reason:string;nextStep:string};
type CrmAction = {leadId:number;leadName:string;title:string;reason:string;patch:{stage:string|null;outcome:string|null;followUp:string|null;notesToAppend:string|null}};
type CrmAnalysis = {summary:string;priorities:CrmPriority[];actions:CrmAction[];draft:string;mode?:"ai"|"smart-fallback";notice?:string};

function localAnalysis(leads:Array<Record<string,unknown>>,notice="Pacifica Smart Fallback is active while the AI provider reconnects."):CrmAnalysis {
  const ranked=leads.slice(0,5).map((lead,index)=>({leadId:Number(lead.id),leadName:String(lead.name||"Unknown lead"),score:Math.max(55,90-index*7),reason:lead.outcome==="Interested"?"Already showed interest and should receive prompt follow-up.":lead.followUp?"A follow-up is already scheduled and needs attention.":"Open opportunity with no completed next step.",nextStep:lead.followUp?`Follow up on ${String(lead.followUp)}`:"Call and confirm needs, timing, and the best next step."}));
  return {summary:`I reviewed ${leads.length} active contact${leads.length===1?"":"s"}. Start with the highest-ranked open opportunities, then work any scheduled follow-ups before returning to untouched leads.`,priorities:ranked,actions:[],draft:"",mode:"smart-fallback",notice};
}

function modelCandidates(){
  return Array.from(new Set([process.env.OPENAI_MODEL?.trim(),"gpt-5-mini","gpt-4.1-mini"].filter(Boolean) as string[]));
}

export async function GET(){
  if(!await hasPacificaWorkspaceApiAccess())return Response.json({ok:false,error:"Your signed-in account does not have Pacifica access."},{status:403});
  return Response.json({ok:true,providerConfigured:Boolean(process.env.OPENAI_API_KEY),fallbackReady:true,model:process.env.OPENAI_MODEL?.trim()||"gpt-5-mini"},{headers:{"Cache-Control":"no-store"}});
}

export async function POST(request:Request) {
  if(!await hasPacificaWorkspaceApiAccess())return Response.json({error:"An active Pacifica subscription is required."},{status:403});
  try {
    const body=await request.json() as {prompt?:string;includeNotes?:boolean;leads?:Array<Record<string,unknown>>;recentCalls?:Array<Record<string,unknown>>};
    const prompt=String(body.prompt||"").trim().slice(0,1000);
    const incoming=(Array.isArray(body.leads)?body.leads:[]).filter(lead=>!Boolean(lead.doNotCall)&&String(lead.stage||"")!=="Closed").slice(0,100);
    if(!prompt)return Response.json({error:"Enter a CRM question first"},{status:400});
    if(!incoming.length)return Response.json({error:"No eligible contacts were provided"},{status:400});
    const leads=incoming.map(lead=>({id:Number(lead.id),name:String(lead.name||"Unknown lead").slice(0,100),city:String(lead.city||"").slice(0,80),stage:String(lead.stage||"New lead"),outcome:String(lead.outcome||"Not contacted"),followUp:String(lead.followUp||""),lastContact:String(lead.lastContact||"Never").slice(0,80),line:lead.line==="home-auto"?"home-auto":"life",source:String(lead.source||"Unknown").slice(0,100),product:String(lead.product||"Service inquiry").slice(0,120),leadCost:Math.max(0,Number(lead.leadCost)||0),notes:body.includeNotes?String(lead.notes||"").slice(0,1000):"[not shared]"}));
    const recentCalls=(Array.isArray(body.recentCalls)?body.recentCalls:[]).slice(0,100).map(call=>({name:String(call.name||"Unknown").slice(0,100),startedAt:String(call.startedAt||"").slice(0,50),duration:Math.max(0,Number(call.duration)||0),outcome:String(call.outcome||"").slice(0,80),status:String(call.status||"").slice(0,100),source:String(call.source||"").slice(0,100)}));
    if(!process.env.OPENAI_API_KEY)return Response.json(localAnalysis(leads,"OpenAI is not configured yet. Pacifica kept working with its built-in prioritizer."));
    const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
    let result:CrmAnalysis|null=null;
    let lastProviderError="";
    for(const model of modelCandidates()){
      try{
        const response=await client.responses.create({
          model,
          store:false,
          input:[{role:"system",content:`You are Pacifica AI, the native sales operating agent inside Pacifica CRM. Today is ${new Date().toISOString().slice(0,10)}. Analyze only the provided CRM and calling activity. Prioritize speed-to-lead, explicit interest, overdue follow-ups, appointment protection, and lead-source efficiency. Never invent facts, prices, consent, eligibility, promises, or appointments. Do not recommend contacting do-not-call records. Give decisive, concise advice tied to the shown product, source, outcome, and history. When a safe record update would help, propose it for human approval. When asked for outreach, return one natural ready-to-send draft without fake personalization.`},{role:"user",content:`Request: ${prompt}\n\nCRM records:\n${JSON.stringify(leads)}\n\nRecent calling activity:\n${JSON.stringify(recentCalls)}`}],
          text:{format:{type:"json_schema",name:"pacifica_crm_analysis",strict:true,schema:{type:"object",additionalProperties:false,properties:{summary:{type:"string"},priorities:{type:"array",items:{type:"object",additionalProperties:false,properties:{leadId:{type:"number"},leadName:{type:"string"},score:{type:"number"},reason:{type:"string"},nextStep:{type:"string"}},required:["leadId","leadName","score","reason","nextStep"]}},actions:{type:"array",items:{type:"object",additionalProperties:false,properties:{leadId:{type:"number"},leadName:{type:"string"},title:{type:"string"},reason:{type:"string"},patch:{type:"object",additionalProperties:false,properties:{stage:{type:["string","null"]},outcome:{type:["string","null"]},followUp:{type:["string","null"]},notesToAppend:{type:["string","null"]}},required:["stage","outcome","followUp","notesToAppend"]}},required:["leadId","leadName","title","reason","patch"]}},draft:{type:"string"}},required:["summary","priorities","actions","draft"]}}},
          max_output_tokens:2200,
        });
        result=JSON.parse(response.output_text) as CrmAnalysis;
        result.mode="ai";
        break;
      }catch(error){
        lastProviderError=error instanceof Error?error.message:"Unknown provider error";
        console.error("[pacifica-ai/crm] model failed",{model,error:lastProviderError});
      }
    }
    if(!result)return Response.json(localAnalysis(leads,"The AI provider did not answer, so Pacifica completed this request with its built-in prioritizer."));
    const validIds=new Set(leads.map(lead=>lead.id));
    result.priorities=result.priorities.filter(item=>validIds.has(item.leadId)).slice(0,10).map(item=>({...item,score:Math.max(0,Math.min(100,Math.round(item.score)))}));
    result.actions=result.actions.filter(action=>validIds.has(action.leadId)).slice(0,10).map(action=>({...action,patch:{stage:action.patch.stage&&allowedStages.includes(action.patch.stage)?action.patch.stage:null,outcome:action.patch.outcome&&allowedOutcomes.includes(action.patch.outcome)?action.patch.outcome:null,followUp:action.patch.followUp&&/^\d{4}-\d{2}-\d{2}$/.test(action.patch.followUp)?action.patch.followUp:null,notesToAppend:action.patch.notesToAppend?.slice(0,500)||null}}));
    return Response.json(result);
  } catch(error) {
    console.error("[pacifica-ai/crm] request failed",error instanceof Error?error.message:"Unknown error");
    return Response.json({error:"Pacifica could not read that request. Try again with a shorter question."},{status:400});
  }
}

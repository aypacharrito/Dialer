import OpenAI from "openai";
import {after} from "next/server";
import {logError,logEvent} from "../../../../lib/observability";
import {twilioAccountConfig} from "../../../../lib/twilio-rest";
import {rejectedTwilioWebhook,validateTwilioWebhook} from "../../../../lib/twilio-webhook";
import {readStoredWorkspace,writeStoredWorkspace} from "../../../../lib/workspace-storage";

export const runtime="nodejs";
export const maxDuration=60;

function safeWorkspace(value:string){return value.replace(/[^a-zA-Z0-9_-]/g,"").slice(0,160)}
function recordingSid(value:string){return /^RE[a-f0-9]{32}$/i.test(value)?value:""}

async function audio(sid:string){const {accountSid,credentials}=twilioAccountConfig();for(const credential of credentials){const response=await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Recordings/${sid}.mp3`,{headers:{Authorization:credential.authorization},cache:"no-store"});if(response.ok)return response.arrayBuffer();if(response.status!==401&&response.status!==403)break}throw new Error("Twilio recording audio could not be downloaded")}

async function addIntelligence(workspaceId:string,leadId:number,callSid:string,sid:string){
  if(!process.env.OPENAI_API_KEY)return;const workspace=await readStoredWorkspace(workspaceId);if(!workspace?.profile.callAiSummaryEnabled)return;
  const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});const bytes=await audio(sid);const transcript=await client.audio.transcriptions.create({file:new File([bytes],`${sid}.mp3`,{type:"audio/mpeg"}),model:process.env.OPENAI_TRANSCRIBE_MODEL||"gpt-4o-mini-transcribe"});const text=transcript.text.trim().slice(0,30000);if(!text)return;
  const summaryResponse=await client.responses.create({model:process.env.OPENAI_MODEL?.trim()||"gpt-5-mini",store:false,input:[{role:"system",content:"Summarize this sales call using only the transcript. Return concise JSON with summary, customerNeeds, objections, commitments, and nextStep. Never invent facts."},{role:"user",content:text}],text:{format:{type:"json_schema",name:"call_summary",strict:true,schema:{type:"object",additionalProperties:false,properties:{summary:{type:"string"},customerNeeds:{type:"array",items:{type:"string"}},objections:{type:"array",items:{type:"string"}},commitments:{type:"array",items:{type:"string"}},nextStep:{type:"string"}},required:["summary","customerNeeds","objections","commitments","nextStep"]}}},max_output_tokens:900});
  const summary=summaryResponse.output_text.slice(0,10000);const current=await readStoredWorkspace(workspaceId);if(!current)return;
  const callLogs=current.callLogs.map(raw=>{const log=raw as Record<string,unknown>;return log.callSid===callSid?{...log,transcript:text,aiSummary:summary}:log});
  const leads=current.leads.map(raw=>{const lead=raw as Record<string,unknown>;return Number(lead.id)===leadId?{...lead,lastCallTranscript:text,lastCallSummary:summary}:lead});
  await writeStoredWorkspace(workspaceId,{...current,callLogs,leads});logEvent("call_intelligence_complete",{workspaceId,leadId,callSidLast6:callSid.slice(-6),recordingSidLast6:sid.slice(-6)});
}

export async function POST(request:Request){
  const form=await request.formData();if(!await validateTwilioWebhook(request,form))return rejectedTwilioWebhook();
  const url=new URL(request.url);const workspaceId=safeWorkspace(url.searchParams.get("workspace")||"");const leadId=Math.max(0,Number(url.searchParams.get("lead"))||0);const callSid=String(form.get("CallSid")||"");const sid=recordingSid(String(form.get("RecordingSid")||""));const status=String(form.get("RecordingStatus")||"");
  if(!workspaceId||!sid)return Response.json({received:true,ignored:true});
  try{
    const workspace=await readStoredWorkspace(workspaceId);if(!workspace)return Response.json({received:true,ignored:true});const recordingUrl=status==="completed"?`/api/twilio/recordings?sid=${sid}`:"";
    let matched=false;const callLogs=workspace.callLogs.map(raw=>{const log=raw as Record<string,unknown>;if(log.callSid!==callSid)return log;matched=true;return {...log,recordingSid:sid,recordingStatus:status,...(recordingUrl?{recordingUrl}:{})}});
    if(!matched){const lead=workspace.leads.find(raw=>Number((raw as Record<string,unknown>).id)===leadId) as Record<string,unknown>|undefined;callLogs.unshift({id:`recording-${callSid}`,callSid,name:String(lead?.name||"Recorded call"),phone:String(lead?.phone||""),startedAt:new Date().toISOString(),duration:0,outcome:"Recording received",status:"Recording received",campaign:"Pacifica",source:"Twilio callback",recordingSid:sid,recordingStatus:status,...(recordingUrl?{recordingUrl}:{})})}
    await writeStoredWorkspace(workspaceId,{...workspace,callLogs:callLogs.slice(0,1000)});
    if(status==="completed")after(()=>addIntelligence(workspaceId,leadId,callSid,sid).catch(error=>logError("call_intelligence_failed",error,{workspaceId,leadId})));
    return Response.json({received:true});
  }catch(error){logError("recording_status_failed",error,{workspaceId});return Response.json({error:"Recording callback failed"},{status:500})}
}

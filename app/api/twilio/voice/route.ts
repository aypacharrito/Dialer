export const runtime = "nodejs";
import {updateStoredWorkspace} from "../../../lib/workspace-storage";
import {voicePhone,voicePilotEligible,voiceCallingHours} from "../../../lib/voice-pilot";

import { phoneAssignmentForClient, phoneAssignmentForNumber } from "../../../lib/phone-assignments";
import { twilioClientIdentity } from "../../../lib/twilio-workspaces";
import { rejectedTwilioWebhook, validateTwilioWebhook } from "../../../lib/twilio-webhook";
import { verifyVoiceRouteToken } from "../../../lib/voice-route-token";

function xmlEscape(value: string) {
  return value.replace(/[<>&'\"]/g, character => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", "\"": "&quot;" })[character] || character);
}

export async function POST(request: Request) {
  const form = await request.formData();
  if(!await validateTwilioWebhook(request,form))return rejectedTwilioWebhook();
  const to = String(form.get("To") || "").trim();
  const from=String(form.get("From")||form.get("Caller")||"").trim();
  const direction=String(form.get("Direction")||"").toLowerCase();
  const statusCallback=xmlEscape(new URL("/api/twilio/status",request.url).toString());
  // Twilio marks a browser Voice SDK call as `Direction=inbound` because the
  // call is entering Twilio from a Client identity. Distinguish it from an
  // actual PSTN call by the caller address, otherwise an outbound browser call
  // gets routed back to the browser instead of to the requested phone number.
  const fromBrowserClient=/^client:/i.test(from);
  if(direction==="inbound"&&!fromBrowserClient){
    const workspaceId=(await phoneAssignmentForNumber(to))?.workspaceId||"";
    if(!workspaceId){
      const unavailable=`<?xml version="1.0" encoding="UTF-8"?><Response><Say>Thank you for calling. This Pacifica workspace is not available right now.</Say><Hangup/></Response>`;
      return new Response(unavailable,{headers:{"Content-Type":"text/xml; charset=utf-8"}});
    }
    const identity=twilioClientIdentity(workspaceId);
    const inbound=`<?xml version="1.0" encoding="UTF-8"?><Response><Dial answerOnBridge="true" timeout="25" callerId="${xmlEscape(from)}"><Client statusCallback="${statusCallback}" statusCallbackEvent="initiated ringing answered completed" statusCallbackMethod="POST"><Identity>${xmlEscape(identity)}</Identity><Parameter name="From" value="${xmlEscape(from)}"/><Parameter name="Called" value="${xmlEscape(to)}"/></Client></Dial><Say>We could not answer. Please try again shortly.</Say></Response>`;
    return new Response(inbound,{headers:{"Content-Type":"text/xml; charset=utf-8"}});
  }
  const normalized = to.startsWith("+") ? `+${to.slice(1).replace(/\D/g, "")}` : `+1${to.replace(/\D/g, "")}`;
  if(!/^\+[1-9]\d{7,14}$/.test(normalized)){
    return new Response("<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response><Reject/></Response>", { status: 400, headers: { "Content-Type": "text/xml; charset=utf-8" } });
  }
  const routeToken=String(form.get("RouteToken")||"");
  // RingTimeout=30 is Pacifica's Listen Through mode token.
  // Give voicemail/call-screening services enough time to answer before the PSTN leg is abandoned.
  const ringTimeout=String(form.get("RingTimeout")||"20")==="30"?45:20;
  const secret=(process.env.TWILIO_API_KEY_SECRET||"").trim();
  const claim=routeToken&&secret?await verifyVoiceRouteToken(routeToken,secret):null;
  if(form.get("AiPilot")==="true"&&claim?.purpose!=="ai-call")return new Response("<Response><Hangup/></Response>",{status:403,headers:{"Content-Type":"text/xml"}});
  const clientIdentity=from.replace(/^client:/i,"");
  const claimedCallerId=claim&&claim.identity===clientIdentity&&twilioClientIdentity(claim.workspaceId)===clientIdentity?claim.phoneNumber:"";
  const assignment=claimedCallerId?null:await phoneAssignmentForClient(from,"twilio");
  const callerId=claimedCallerId||assignment?.phoneNumber||"";
  if(!callerId){
    console.warn("[twilio/voice] caller identity has no workspace route",{clientIdentityLast8:clientIdentity.slice(-8),routeClaim:Boolean(routeToken),validRouteClaim:Boolean(claim)});
    const explanation=`<?xml version="1.0" encoding="UTF-8"?><Response><Say>This Twilio test client is not assigned to a Pacifica workspace. Place the test call from inside Pacifica CRM.</Say><Hangup/></Response>`;
    return new Response(explanation,{headers:{"Content-Type":"text/xml; charset=utf-8"}});
  }
  if(claim?.purpose==='ai-call'){
    let permitted=false;
    if(claimedCallerId&&claim.destination===normalized&&claim.runId)await updateStoredWorkspace(claim.workspaceId,current=>{
      const run=current.voicePilot,sid=String(form.get('CallSid')||''),leads=current.leads as Record<string,unknown>[];
      if(!run||current.voicePilotBlocked?.includes(normalized)||run.id!==claim.runId||run.phone!==normalized||run.expiresAt<Date.now()||!['ready','calling'].includes(run.state)||!/^CA[a-f0-9]{32}$/i.test(sid)||run.callSid&&run.callSid!==sid||!voiceCallingHours(run.timezone)||!leads.some(l=>l.id===run.leadId&&voicePilotEligible(l))||leads.some(l=>voicePhone(l.phone)===normalized&&!voicePilotEligible(l)))return current;
      permitted=true;return {...current,voicePilot:{...run,state:'calling',callSid:sid}};
    });
    if(!permitted)return new Response('<Response><Hangup/></Response>',{status:403,headers:{'Content-Type':'text/xml'}});
  }
  console.info("[twilio/voice] outbound request", { destinationLast4: normalized.slice(-4), callerIdLast4: callerId.slice(-4) });
  const callback=new URL("/api/twilio/status",request.url);
  callback.searchParams.set("workspaceId",claimedCallerId?claim!.workspaceId:assignment!.workspaceId);
  callback.searchParams.set("phone",normalized);
  callback.searchParams.set("startedAt",new Date().toISOString());
  callback.searchParams.set("parentCallSid",String(form.get("CallSid")||""));
  if(claim?.purpose==='ai-call')callback.searchParams.set('aiPilot',claim.runId||'true');
  const outboundCallback=xmlEscape(callback.toString());
  const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Dial ${claim?.purpose==="ai-call"?'timeLimit="300" ':""}callerId="${xmlEscape(callerId)}" answerOnBridge="true" timeout="${ringTimeout}"><Number statusCallback="${outboundCallback}" statusCallbackEvent="initiated ringing answered completed" statusCallbackMethod="POST">${xmlEscape(normalized)}</Number></Dial></Response>`;
  return new Response(twiml, { headers: { "Content-Type": "text/xml; charset=utf-8" } });
}

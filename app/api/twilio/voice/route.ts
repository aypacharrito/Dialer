export const runtime = "edge";

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
  const secret=(process.env.TWILIO_API_KEY_SECRET||"").trim();
  const claim=routeToken&&secret?await verifyVoiceRouteToken(routeToken,secret):null;
  const clientIdentity=from.replace(/^client:/i,"");
  const claimedCallerId=claim&&claim.identity===clientIdentity&&twilioClientIdentity(claim.workspaceId)===clientIdentity?claim.phoneNumber:"";
  const callerId=claimedCallerId||(await phoneAssignmentForClient(from,"twilio"))?.phoneNumber||"";
  if(!callerId){
    console.warn("[twilio/voice] caller identity has no workspace route",{clientIdentityLast8:clientIdentity.slice(-8),routeClaim:Boolean(routeToken),validRouteClaim:Boolean(claim)});
    const explanation=`<?xml version="1.0" encoding="UTF-8"?><Response><Say>This Twilio test client is not assigned to a Pacifica workspace. Place the test call from inside Pacifica CRM.</Say><Hangup/></Response>`;
    return new Response(explanation,{headers:{"Content-Type":"text/xml; charset=utf-8"}});
  }
  console.info("[twilio/voice] outbound request", { destinationLast4: normalized.slice(-4), callerIdLast4: callerId.slice(-4) });
  const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Dial callerId="${xmlEscape(callerId)}" answerOnBridge="true" timeout="20"><Number statusCallback="${statusCallback}" statusCallbackEvent="initiated ringing answered completed" statusCallbackMethod="POST">${xmlEscape(normalized)}</Number></Dial></Response>`;
  return new Response(twiml, { headers: { "Content-Type": "text/xml; charset=utf-8" } });
}

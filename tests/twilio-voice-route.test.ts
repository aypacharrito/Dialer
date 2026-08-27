import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

const webhookUrl = "https://pacificacrm.com/api/twilio/voice";
const authToken = "test_auth_token";

process.env.TWILIO_AUTH_TOKEN = authToken;
process.env.TWILIO_API_KEY_SECRET = "test_api_key_secret_123456789";
process.env.TWILIO_WEBHOOK_BASE_URL = "https://pacificacrm.com";
process.env.TWILIO_PHONE_NUMBER = "+14243671060";
process.env.TWILIO_DEFAULT_WORKSPACE_ID = "user_test";

const { POST } = await import("../app/api/twilio/voice/route");
const { createVoiceRouteToken } = await import("../app/lib/voice-route-token");

function signedRequest(fields: Record<string, string>) {
  const body = new URLSearchParams(fields);
  const payload = Object.entries(fields)
    .sort(([left], [right]) => left<right?-1:left>right?1:0)
    .reduce((value, [key, field]) => `${value}${key}${field}`, webhookUrl);
  const signature = createHmac("sha1", authToken).update(payload).digest("base64");
  return new Request(webhookUrl, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "x-twilio-signature": signature,
    },
    body,
  });
}

test("browser-originated calls dial the requested phone number", async () => {
  const response = await POST(signedRequest({
    To: "+18185550123",
    From: "client:pacifica_user_test",
    Direction: "inbound",
  }));
  const twiml = await response.text();

  assert.equal(response.status, 200);
  assert.match(twiml, /<Number[^>]*>\+18185550123<\/Number>/);
  assert.doesNotMatch(twiml, /<Client/);
});

test("PSTN inbound calls ring the assigned Pacifica browser client", async () => {
  const response = await POST(signedRequest({
    To: "+14243671060",
    From: "+18185550123",
    Direction: "inbound",
  }));
  const twiml = await response.text();

  assert.equal(response.status, 200);
  assert.match(twiml, /<Client[^>]*>/);
  assert.match(twiml, /<Identity>pacifica_user_test<\/Identity>/);
});

test("unsigned webhook requests remain rejected", async () => {
  const response = await POST(new Request(webhookUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ To: "+18185550123", From: "client:pacifica_user_test" }),
  }));

  assert.equal(response.status, 403);
});

test("signed route claims securely carry the assigned caller ID", async()=>{
  const identity="pacifica_user_claim_test";
  const routeToken=await createVoiceRouteToken({workspaceId:"user_claim_test",identity,phoneNumber:"+14245550111"},process.env.TWILIO_API_KEY_SECRET!);
  const response=await POST(signedRequest({To:"+18185550123",From:`client:${identity}`,Direction:"inbound",RouteToken:routeToken}));
  const twiml=await response.text();
  assert.equal(response.status,200);
  assert.match(twiml,/callerId="\+14245550111"/);
  assert.match(twiml,/<Number[^>]*>\+18185550123<\/Number>/);
});

test("Twilio Voice field ordering validates CallSid, CallStatus, Called, and Caller correctly",async()=>{
  const identity="pacifica_user_debugger_test";
  const routeToken=await createVoiceRouteToken({workspaceId:"user_debugger_test",identity,phoneNumber:"+14174412831"},process.env.TWILIO_API_KEY_SECRET!);
  const response=await POST(signedRequest({
    ApplicationSid:"AP01bd5d6f77e8f24192fc7858893b27b1",
    ApiVersion:"2010-04-01",
    Called:"",
    Caller:`client:${identity}`,
    CallStatus:"ringing",
    To:"8184384359",
    RouteToken:routeToken,
    CallSid:"CA565fc107b1cc8a9e7e6033d00be24fe9",
    From:`client:${identity}`,
    Direction:"inbound",
    AccountSid:"AC5a4da59ec40b931fad295861a4b3677c",
  }));
  const twiml=await response.text();
  assert.equal(response.status,200);
  assert.match(twiml,/callerId="\+14174412831"/);
  assert.match(twiml,/<Number[^>]*>\+18184384359<\/Number>/);
});

test("Twilio console clients receive a useful explanation instead of an application error",async()=>{
  const response=await POST(signedRequest({To:"+18185550123",From:"client:twilio_console_test",Direction:"inbound"}));
  const twiml=await response.text();
  assert.equal(response.status,200);
  assert.match(twiml,/not assigned to a Pacifica workspace/i);
});

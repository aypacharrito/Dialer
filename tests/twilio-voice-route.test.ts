import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

const webhookUrl = "https://pacificacrm.com/api/twilio/voice";
const authToken = "test_auth_token";

process.env.TWILIO_AUTH_TOKEN = authToken;
process.env.TWILIO_WEBHOOK_BASE_URL = "https://pacificacrm.com";
process.env.TWILIO_PHONE_NUMBER = "+14243671060";
process.env.TWILIO_DEFAULT_WORKSPACE_ID = "user_test";

const { POST } = await import("../app/api/twilio/voice/route");

function signedRequest(fields: Record<string, string>) {
  const body = new URLSearchParams(fields);
  const payload = Object.entries(fields)
    .sort(([left], [right]) => left.localeCompare(right))
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

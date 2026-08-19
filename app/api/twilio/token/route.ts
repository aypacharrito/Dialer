export const runtime = "edge";

const encoder = new TextEncoder();

function base64Url(value: string | ArrayBuffer) {
  const bytes = typeof value === "string" ? encoder.encode(value) : new Uint8Array(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function createToken(secret: string, accountSid: string, apiKeySid: string, appSid: string) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ typ: "JWT", alg: "HS256", cty: "twilio-fpa;v=1" }));
  const payload = base64Url(JSON.stringify({
    jti: `${apiKeySid}-${now}`,
    grants: {
      identity: "pacific-browser",
      voice: { incoming: { allow: false }, outgoing: { application_sid: appSid } },
    },
    iat: now,
    exp: now + 3600,
    iss: apiKeySid,
    sub: accountSid,
  }));
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(`${header}.${payload}`));
  return `${header}.${payload}.${base64Url(signature)}`;
}

export async function GET() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const apiKeySid = process.env.TWILIO_API_KEY_SID;
  const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;
  const appSid = process.env.TWILIO_TWIML_APP_SID;
  if (!accountSid || !apiKeySid || !apiKeySecret || !appSid) {
    return Response.json({ error: "Twilio calling is waiting for its secure API key configuration." }, { status: 503 });
  }
  return Response.json({ token: await createToken(apiKeySecret, accountSid, apiKeySid, appSid) }, { headers: { "Cache-Control": "no-store" } });
}

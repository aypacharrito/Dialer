import { hasPacificaWorkspaceApiAccess } from "../../../lib/clerk-access";

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
    jti: `${apiKeySid}-${now}-${crypto.randomUUID()}`,
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
  if(!await hasPacificaWorkspaceApiAccess())return Response.json({error:"An active Pacifica subscription is required."},{status:403});
  const accountSid = (process.env.TWILIO_ACCOUNT_SID || "").trim();
  const apiKeySid = (process.env.TWILIO_API_KEY_SID || "").trim();
  const apiKeySecret = (process.env.TWILIO_API_KEY_SECRET || "").trim();
  const appSid = (process.env.TWILIO_TWIML_APP_SID || "").trim();
  if (!accountSid || !apiKeySid || !apiKeySecret || !appSid) {
    return Response.json({ error: "Twilio calling is waiting for its secure API key configuration." }, { status: 503 });
  }
  if (!/^AC[a-f0-9]{32}$/i.test(accountSid) || !/^SK[a-f0-9]{32}$/i.test(apiKeySid) || !/^AP[a-f0-9]{32}$/i.test(appSid)) {
    return Response.json({ error: "One or more Twilio SIDs has the wrong format. Open Phone setup for details." }, { status: 503 });
  }
  try {
    return Response.json({ token: await createToken(apiKeySecret, accountSid, apiKeySid, appSid), expiresIn: 3600 }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[twilio/token] token generation failed", error instanceof Error ? error.message : "unknown error");
    return Response.json({ error: "Twilio token generation failed. Check the API key secret and redeploy." }, { status: 500 });
  }
}

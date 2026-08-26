import { getPacificaAccess } from "../../../lib/clerk-access";
import { isClerkConfigured } from "../../../lib/clerk-config";
import { twilioPhoneForWorkspace } from "../../../lib/twilio-workspaces";
import { rejectedTwilioWebhook, validateTwilioWebhook } from "../../../lib/twilio-webhook";

export const runtime = "nodejs";

export async function GET() {
  const access=isClerkConfigured()?await getPacificaAccess():{allowed:!process.env.VERCEL,userId:"local",email:"local"};
  if(!access.allowed)return Response.json({configured:false,error:"An active Pacifica subscription is required."},{status:403});
  const phoneNumber=twilioPhoneForWorkspace(access.userId,access.email);
  const configured = Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_API_KEY_SID && process.env.TWILIO_API_KEY_SECRET && process.env.TWILIO_TWIML_APP_SID && phoneNumber);
  return Response.json({ configured, phoneNumber:phoneNumber||"No number assigned", mode: "Browser / Wi-Fi" }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const form = await request.formData();
  if(!await validateTwilioWebhook(request,form))return rejectedTwilioWebhook();
  console.info("[twilio/status] call update", {
    callSid: String(form.get("CallSid") || "").slice(0, 10),
    status: String(form.get("CallStatus") || "unknown"),
    duration: String(form.get("CallDuration") || ""),
  });
  return new Response(null, { status: 204 });
}

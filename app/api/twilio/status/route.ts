import { getPacificaAccess } from "../../../lib/clerk-access";
import { isClerkConfigured } from "../../../lib/clerk-config";
import { phoneAssignmentForWorkspace } from "../../../lib/phone-assignments";
import { rejectedTwilioWebhook, validateTwilioWebhook } from "../../../lib/twilio-webhook";

export const runtime = "nodejs";

export async function GET() {
  const access=isClerkConfigured()?await getPacificaAccess():{allowed:!process.env.VERCEL,userId:"local",email:"local"};
  if(!access.allowed)return Response.json({configured:false,error:"An active Pacifica subscription is required."},{status:403});
  const assignment=await phoneAssignmentForWorkspace(access.userId,access.email);
  const phoneNumber=assignment?.phoneNumber||"";
  const provider=assignment?.provider||"twilio";
  const configured = provider==="twilio"&&Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_API_KEY_SID && process.env.TWILIO_API_KEY_SECRET && process.env.TWILIO_TWIML_APP_SID && phoneNumber);
  return Response.json({ configured,provider, phoneNumber:phoneNumber||"No number assigned", mode: "Browser / Wi-Fi",assignmentSource:assignment?.assignedBy||"none",smsStatus:assignment?.smsStatus||"unassigned",error:provider!=="twilio"?`${provider} browser calling is not connected yet.`:undefined }, { headers: { "Cache-Control": "no-store" } });
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

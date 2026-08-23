export const runtime = "edge";

export async function GET() {
  const configured = Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_API_KEY_SID && process.env.TWILIO_API_KEY_SECRET && process.env.TWILIO_TWIML_APP_SID && process.env.TWILIO_PHONE_NUMBER);
  return Response.json({ configured, phoneNumber: process.env.TWILIO_PHONE_NUMBER || "+1 (417) 441-2831", mode: "Browser / Wi-Fi" }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const form = await request.formData();
  console.info("[twilio/status] call update", {
    callSid: String(form.get("CallSid") || "").slice(0, 10),
    status: String(form.get("CallStatus") || "unknown"),
    duration: String(form.get("CallDuration") || ""),
  });
  return new Response(null, { status: 204 });
}

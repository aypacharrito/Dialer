export const runtime = "edge";

export async function GET() {
  const configured = Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_API_KEY_SID && process.env.TWILIO_API_KEY_SECRET && process.env.TWILIO_TWIML_APP_SID && process.env.TWILIO_PHONE_NUMBER);
  return Response.json({ configured, phoneNumber: process.env.TWILIO_PHONE_NUMBER || "+1 (417) 441-2831", mode: "Browser / Wi-Fi" }, { headers: { "Cache-Control": "no-store" } });
}

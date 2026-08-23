export const runtime = "edge";

export async function GET() {
  const values = {
    accountSid: (process.env.TWILIO_ACCOUNT_SID || "").trim(),
    apiKeySid: (process.env.TWILIO_API_KEY_SID || "").trim(),
    apiKeySecret: (process.env.TWILIO_API_KEY_SECRET || "").trim(),
    appSid: (process.env.TWILIO_TWIML_APP_SID || "").trim(),
    phoneNumber: (process.env.TWILIO_PHONE_NUMBER || "").trim(),
  };
  const checks = {
    accountSid: /^AC[a-f0-9]{32}$/i.test(values.accountSid),
    apiKeySid: /^SK[a-f0-9]{32}$/i.test(values.apiKeySid),
    apiKeySecret: values.apiKeySecret.length >= 20,
    appSid: /^AP[a-f0-9]{32}$/i.test(values.appSid),
    phoneNumber: /^\+[1-9]\d{7,14}$/.test(values.phoneNumber),
  };
  return Response.json({ configured: Object.values(checks).every(Boolean), checks, phoneNumber: values.phoneNumber || "+14174412831", voiceWebhook: "/api/twilio/voice", checkedAt: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
}

export const runtime = "edge";

function xmlEscape(value: string) {
  return value.replace(/[<>&'\"]/g, character => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", "\"": "&quot;" })[character] || character);
}

export async function POST(request: Request) {
  const form = await request.formData();
  const to = String(form.get("To") || "").trim();
  const normalized = to.startsWith("+") ? `+${to.slice(1).replace(/\D/g, "")}` : `+1${to.replace(/\D/g, "")}`;
  const callerId = (process.env.TWILIO_PHONE_NUMBER || "").trim();
  if (!callerId || !/^\+[1-9]\d{7,14}$/.test(normalized)) {
    return new Response("<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response><Reject/></Response>", { status: 400, headers: { "Content-Type": "text/xml; charset=utf-8" } });
  }
  console.info("[twilio/voice] outbound request", { destinationLast4: normalized.slice(-4), callerIdLast4: callerId.slice(-4) });
  const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Dial callerId="${xmlEscape(callerId)}" answerOnBridge="true" timeout="35"><Number statusCallback="/api/twilio/status" statusCallbackEvent="initiated ringing answered completed" statusCallbackMethod="POST">${xmlEscape(normalized)}</Number></Dial></Response>`;
  return new Response(twiml, { headers: { "Content-Type": "text/xml; charset=utf-8" } });
}

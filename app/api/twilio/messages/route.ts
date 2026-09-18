import {
  twilioAccountConfig,
  twilioApiRequest,
  type TwilioApiError,
} from "../../../lib/twilio-rest";
import { blocksAiText } from "../../../lib/ai-sms-recipients";
import { hasContactPermission } from "../../../lib/contact-permission";
import { getPacificaAccess } from "../../../lib/clerk-access";
import { isClerkConfigured } from "../../../lib/clerk-config";
import { phoneAssignmentForWorkspace } from "../../../lib/phone-assignments";
import { outboundSmsStatus, sendOutboundSms } from "../../../lib/outbound-sms";
import {
  readStoredWorkspace,
  updateStoredWorkspace,
} from "../../../lib/workspace-storage";

export const runtime = "nodejs";

type TwilioMessage = {
  sid: string;
  direction: string;
  from: string;
  to: string;
  body: string;
  status: string;
  date_sent?: string;
  date_created?: string;
  error_code?: number | null;
  error_message?: string | null;
};
type TwilioError = TwilioApiError;

async function workspaceAccess() {
  const access = isClerkConfigured()
    ? await getPacificaAccess()
    : { allowed: !process.env.VERCEL, userId: "local", email: "local" };
  if (!access.allowed)
    throw new Error("An active Pacifica subscription is required.");
  return access;
}

async function workspacePhone() {
  const access = await workspaceAccess();
  const assignment = await phoneAssignmentForWorkspace(
    access.userId,
    access.email,
  );
  if (assignment && assignment.provider !== "twilio")
    throw new Error(
      `This workspace uses ${assignment.provider}. Its messaging adapter is not connected yet.`,
    );
  const phone = assignment?.phoneNumber || "";
  if (!phone)
    throw new Error(
      "This Pacifica workspace does not have a Twilio number assigned yet.",
    );
  return { phone, workspaceId: access.userId, email: access.email };
}

function twilioMessage(data: TwilioError) {
  const base = data.message || "Twilio rejected the messaging request";
  const help: Record<number, string> = {
    20003: "Check TWILIO_AUTH_TOKEN or give the API key Messaging permissions.",
    21606:
      "The selected Twilio number cannot send SMS. Choose an SMS-capable number in TWILIO_PHONE_NUMBER.",
    21608: "This Twilio trial account can only text verified recipients.",
    21610: "This recipient previously opted out and cannot be messaged.",
    30007:
      "The carrier filtered this message. Check A2P registration and message content.",
    30034: "Complete US A2P 10DLC registration for this Twilio number.",
  };
  const suffix = data.code && help[data.code] ? ` ${help[data.code]}` : "";
  return data.code ? `${base} (Twilio ${data.code}).${suffix}` : base;
}

function normalized(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (/^\+[1-9]\d{7,14}$/.test(value.trim())) return value.trim();
  return "";
}

function safe(message: TwilioMessage) {
  const failed =
    message.status === "failed" || message.status === "undelivered";
  return {
    id: message.sid,
    direction: message.direction,
    from: message.from,
    to: message.to,
    body: message.body,
    status: message.status,
    sentAt:
      message.date_sent || message.date_created || new Date().toISOString(),
    errorCode: message.error_code || null,
    failureReason: failed
      ? twilioMessage({
          message:
            message.error_message || "The carrier did not deliver this message",
          code: message.error_code || undefined,
        })
      : null,
  };
}

export async function GET() {
  try {
    const { phone, workspaceId, email } = await workspacePhone();
    const { accountSid, credentials } = twilioAccountConfig();
    const sending = await outboundSmsStatus(workspaceId, email);
    const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const [outbound, inbound] = (await Promise.all([
      twilioApiRequest<{ messages?: TwilioMessage[] } & TwilioError>(
        `${endpoint}?${new URLSearchParams({ From: phone, PageSize: "250" })}`,
        { cache: "no-store" },
        credentials,
      ),
      twilioApiRequest<{ messages?: TwilioMessage[] } & TwilioError>(
        `${endpoint}?${new URLSearchParams({ To: phone, PageSize: "250" })}`,
        { cache: "no-store" },
        credentials,
      ),
    ])) as Array<{
      response: Response;
      data: { messages?: TwilioMessage[] } & TwilioError;
      credential: string;
    }>;
    if (!outbound.response.ok) throw new Error(twilioMessage(outbound.data));
    if (!inbound.response.ok) throw new Error(twilioMessage(inbound.data));
    const unique = new Map<string, TwilioMessage>();
    for (const message of [
      ...(outbound.data.messages || []),
      ...(inbound.data.messages || []),
    ])
      unique.set(message.sid, message);
    const messages = Array.from(unique.values())
      .sort(
        (left, right) =>
          new Date(right.date_sent || right.date_created || 0).getTime() -
          new Date(left.date_sent || left.date_created || 0).getTime(),
      )
      .map(safe);
    return Response.json(
      {
        configured: sending.configured,
        historyAvailable: true,
        sending,
        phone,
        messages,
        credential: outbound.credential || inbound.credential,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error(
      "[twilio/messages] load failed",
      error instanceof Error ? error.message : "unknown",
    );
    return Response.json(
      {
        configured: false,
        error:
          error instanceof Error ? error.message : "Unable to load messages",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      to?: string;
      body?: string;
      permissionDocumented?: boolean;
      sendMode?: "ai" | "manual";
      mediaUrls?: string[];
    };
    const to = normalized(String(body.to || ""));
    const text = String(body.body || "")
      .trim()
      .slice(0, 1400);
    const mediaUrls = Array.isArray(body.mediaUrls)
      ? body.mediaUrls
          .map(String)
          .filter((value) => /^https:\/\//i.test(value))
          .slice(0, 10)
      : [];
    if (!to)
      return Response.json(
        { error: "Enter a valid US mobile number" },
        { status: 400 },
      );
    if (!text && !mediaUrls.length)
      return Response.json(
        { error: "Write a message or attach a file first" },
        { status: 400 },
      );
    const access = await workspaceAccess();
    const workspace = await readStoredWorkspace(access.userId);
    const digits = to.replace(/\D/g, "").slice(-10);
    const lead = workspace?.leads.find((raw) => {
      const item = raw as Record<string, unknown>;
      return (
        String(item.phone || "")
          .replace(/\D/g, "")
          .slice(-10) === digits
      );
    }) as Record<string, unknown> | undefined;
    if (!lead || lead.deletedAt)
      return Response.json(
        {
          error:
            "Save this phone number as a workspace contact before texting.",
        },
        { status: 400 },
      );
    if (
      body.sendMode === "ai" &&
      workspace!.leads.some((raw) => {
        const item = raw as Record<string, unknown>;
        return (
          String(item.phone || "")
            .replace(/\D/g, "")
            .slice(-10) === digits &&
          (blocksAiText(item) ||
            item.smsOptOut ||
            item.doNotCall ||
            item.deletedAt)
        );
      })
    )
      return Response.json(
        {
          error:
            "AI texting is paused for this contact. Interested and appointment leads require a personal text.",
        },
        { status: 403 },
      );
    if (body.permissionDocumented === true && lead.smsConsent !== true) {
      await updateStoredWorkspace(access.userId, (current) => ({
        ...current,
        leads: current.leads.map((raw) => {
          const item = raw as Record<string, unknown>;
          return item.id === lead.id && !item.smsOptOut
            ? { ...item, smsConsent: true }
            : item;
        }),
      }));
    }
    const permissionLead =
      body.permissionDocumented === true ? { ...lead, smsConsent: true } : lead;
    if (!hasContactPermission(permissionLead, workspace!.profile, "sms"))
      return Response.json(
        {
          error: lead.smsOptOut
            ? "This contact opted out of SMS."
            : "Document this contact’s SMS consent before sending.",
        },
        { status: 403 },
      );
    const result = await sendOutboundSms({
      workspaceId: access.userId,
      workspaceEmail: access.email,
      to,
      body: text,
      automated: body.sendMode === "ai",
      mediaUrls,
    });
    const message: TwilioMessage = {
      sid: result.id,
      direction: "outbound-api",
      from: result.from,
      to,
      body:
        text ||
        `[${mediaUrls.length} attachment${mediaUrls.length === 1 ? "" : "s"}]`,
      status: result.status,
      date_created: new Date().toISOString(),
    };
    console.log("[twilio/messages] sent", {
      sid: result.id,
      toLast4: to.slice(-4),
      credential: "tenant SMS adapter",
    });
    return Response.json({ ok: true, message: safe(message) });
  } catch (error) {
    console.error(
      "[twilio/messages] send failed",
      error instanceof Error ? error.message : "unknown",
    );
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to send message",
      },
      { status: 500 },
    );
  }
}

import type Stripe from "stripe";
import { getStripe } from "../../../lib/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET || "";
  if (!signature || !secret) return Response.json({ error: "Webhook is not configured." }, { status: 503 });
  try {
    const stripe = getStripe();
    const event = await stripe.webhooks.constructEventAsync(await request.text(), signature, secret);
    const supported: Stripe.Event.Type[] = ["checkout.session.completed", "invoice.payment_succeeded", "invoice.payment_failed", "customer.subscription.deleted"];
    if (supported.includes(event.type)) console.info("[stripe/webhook] subscription event", { type: event.type, eventId: event.id });
    return Response.json({ received: true });
  } catch {
    return Response.json({ error: "Invalid webhook signature." }, { status: 400 });
  }
}

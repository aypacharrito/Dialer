import { getStripe, stripePlanPrices, type StripePlan } from "../../../lib/stripe";

export const runtime = "nodejs";

const planNames: Record<StripePlan, string> = { solo: "Solo", team: "Team", agency: "Agency" };

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({})) as { plan?: string };
    if (!body.plan || !(body.plan in stripePlanPrices)) return Response.json({ error: "Choose a valid subscription plan." }, { status: 400 });
    const plan = body.plan as StripePlan;
    const price = stripePlanPrices[plan];
    if (!price) return Response.json({ error: `${planNames[plan]} checkout is waiting for its Stripe Price ID.` }, { status: 503 });
    const stripe = getStripe();
    const configuredOrigin = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
    const origin = configuredOrigin || new URL(request.url).origin;
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price, quantity: 1 }],
      allow_promotion_codes: true,
      billing_address_collection: "required",
      consent_collection: { terms_of_service: "required" },
      metadata: { pacifica_tools_plan: plan },
      subscription_data: { metadata: { pacifica_tools_plan: plan } },
      success_url: `${origin}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?checkout=canceled`,
      integration_identifier: "pacificatools_checkout_qzmxtrpa",
    });
    if (!session.url) throw new Error("Stripe did not return a checkout URL");
    return Response.json({ url: session.url });
  } catch (error) {
    console.error("[stripe/checkout] unable to create session", error instanceof Error ? error.message : "unknown error");
    return Response.json({ error: "Unable to start secure checkout. Verify the Stripe configuration and try again." }, { status: 500 });
  }
}

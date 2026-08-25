import { getStripe, stripePlanPrices, type StripePlan } from "../../../lib/stripe";
import { currentUser } from "@clerk/nextjs/server";

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
    const user=process.env.VERCEL?await currentUser():null;
    const email=user?.primaryEmailAddress?.emailAddress||user?.emailAddresses[0]?.emailAddress;
    const metadata={pacifica_plan:plan,...(user?.id?{clerk_user_id:user.id}:{})};
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price, quantity: 1 }],
      allow_promotion_codes: true,
      billing_address_collection: "required",
      custom_text: {
        submit: { message: `By subscribing, you agree to Pacifica's Terms of Service at ${origin}/terms.` },
      },
      ...(email?{customer_email:email}:{}),
      ...(user?.id?{client_reference_id:user.id}:{}),
      metadata,
      subscription_data: { metadata },
      success_url: `${origin}${user?.id?"/dashboard":"/login"}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?checkout=canceled`,
    });
    if (!session.url) throw new Error("Stripe did not return a checkout URL");
    return Response.json({ url: session.url });
  } catch (error) {
    const stripeError=error as {message?:string;code?:string;type?:string;param?:string};
    console.error("[stripe/checkout] unable to create session",{
      message:stripeError.message||"unknown error",
      code:stripeError.code||null,
      type:stripeError.type||null,
      param:stripeError.param||null,
    });
    return Response.json({ error: "Unable to start secure checkout. Verify the Stripe configuration and try again." }, { status: 500 });
  }
}

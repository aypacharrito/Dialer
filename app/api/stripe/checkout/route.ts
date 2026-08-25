import { getStripe, stripePlanPrices, type StripePlan } from "../../../lib/stripe";
import { currentUser } from "@clerk/nextjs/server";
import { isClerkConfigured } from "../../../lib/clerk-config";
import { pacificaPlans, planAmountInCents } from "../../../lib/plans";

export const runtime = "nodejs";

const planNames: Record<StripePlan, string> = { solo: "Solo", team: "Team", agency: "Agency" };

async function resolveMonthlyPrice(plan:StripePlan,configuredPriceId:string){
  const stripe=getStripe();
  const expectedAmount=planAmountInCents(plan);
  const configured=await stripe.prices.retrieve(configuredPriceId);
  if(configured.active&&configured.currency==="usd"&&configured.unit_amount===expectedAmount&&configured.recurring?.interval==="month")return configured.id;
  const productId=typeof configured.product==="string"?configured.product:configured.product?.id;
  if(!productId)throw new Error("STRIPE_PLAN_PRODUCT_MISSING");
  const existing=await stripe.prices.list({product:productId,active:true,limit:100});
  const match=existing.data.find(item=>item.currency==="usd"&&item.unit_amount===expectedAmount&&item.recurring?.interval==="month");
  if(match)return match.id;
  const created=await stripe.prices.create({
    product:productId,
    currency:"usd",
    unit_amount:expectedAmount,
    recurring:{interval:"month"},
    nickname:`Pacifica ${pacificaPlans[plan].name} · $${pacificaPlans[plan].monthlyPrice}/month`,
    metadata:{pacifica_plan:plan,pacifica_price_version:"2026-08-25"},
  },{idempotencyKey:`pacifica-${plan}-${expectedAmount}-monthly-v1`});
  return created.id;
}

function checkoutErrorMessage(error:{message?:string;code?:string;type?:string;param?:string}){
  if(error.message==="STRIPE_SERVER_KEY_MISSING")return "Stripe needs a server key in Vercel before checkout can open.";
  if(error.message==="STRIPE_SERVER_KEY_INVALID")return "The Stripe server key must begin with sk_live_ or rk_live_. A pk_live_ key cannot create Checkout sessions.";
  if(error.type==="StripeAuthenticationError"||error.code==="api_key_expired")return "Stripe rejected the server key. Replace it with an active sk_live_ or properly permitted rk_live_ key from this Stripe account.";
  if(error.type==="StripePermissionError")return "The restricted Stripe key does not have permission to create Checkout sessions. Add Checkout write access or use the account's server secret key.";
  if(error.code==="resource_missing"||error.param?.includes("price"))return "Stripe could not find this Price ID in the same account and mode as the server key. Confirm it begins with price_ and comes from Live mode.";
  const reference=[error.code||error.type,error.param].filter(Boolean).join(" · ")||"unknown_error";
  const safeMessage=(error.message||"Stripe rejected the Checkout request")
    .replace(/(?:sk|rk|pk)_(?:live|test)_[A-Za-z0-9]+/g,"[redacted Stripe key]")
    .replace(/whsec_[A-Za-z0-9]+/g,"[redacted webhook secret]");
  return `Stripe error (${reference}): ${safeMessage}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({})) as { plan?: string };
    if (!body.plan || !(body.plan in stripePlanPrices)) return Response.json({ error: "Choose a valid subscription plan." }, { status: 400 });
    const plan = body.plan as StripePlan;
    const price = stripePlanPrices[plan];
    if (!price) return Response.json({ error: `${planNames[plan]} checkout is waiting for its Stripe Price ID.` }, { status: 503 });
    if(!price.startsWith("price_"))return Response.json({error:`${planNames[plan]} is using a Product ID instead of a Price ID. Replace it with the value beginning price_.`},{status:503});
    const stripe = getStripe();
    const resolvedPrice=await resolveMonthlyPrice(plan,price);
    const configuredOrigin = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
    const origin = configuredOrigin || new URL(request.url).origin;
    const user=isClerkConfigured()?await currentUser():null;
    const email=user?.primaryEmailAddress?.emailAddress||user?.emailAddresses[0]?.emailAddress;
    const metadata={pacifica_plan:plan,...(user?.id?{clerk_user_id:user.id}:{})};
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price:resolvedPrice, quantity: 1 }],
      allow_promotion_codes: true,
      billing_address_collection: "required",
      ...(email?{customer_email:email}:{}),
      ...(user?.id?{client_reference_id:user.id}:{}),
      metadata,
      subscription_data: { metadata },
      integration_identifier: "pacifica_web_qmxnrvta",
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
    return Response.json({ error: checkoutErrorMessage(stripeError) }, { status: 500 });
  }
}

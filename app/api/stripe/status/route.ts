import { stripePlanPrices } from "../../../lib/stripe";

export const runtime = "edge";

export async function GET() {
  return Response.json({
    configured: Boolean((process.env.STRIPE_RESTRICTED_KEY || process.env.STRIPE_SECRET_KEY) && Object.values(stripePlanPrices).every(Boolean)),
    plans: Object.fromEntries(Object.entries(stripePlanPrices).map(([key, value]) => [key, Boolean(value)])),
  }, { headers: { "Cache-Control": "no-store" } });
}

import { getStripeConfigurationStatus } from "../../../lib/stripe";

export const runtime = "edge";

export async function GET() {
  const status=getStripeConfigurationStatus();
  return Response.json({
    configured: status.keyConfigured && Object.values(status.plans).every(plan=>plan.configured&&plan.validFormat),
    ...status,
  }, { headers: { "Cache-Control": "no-store" } });
}

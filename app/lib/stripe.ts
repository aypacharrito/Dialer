import Stripe from "stripe";

export function getStripe() {
  const apiKey = (process.env.STRIPE_RESTRICTED_KEY || process.env.STRIPE_SECRET_KEY || "").trim();
  if (!apiKey) throw new Error("Stripe is not configured");
  return new Stripe(apiKey, { apiVersion: "2026-07-29.dahlia", typescript: true });
}

export const stripePlanPrices = {
  solo: process.env.STRIPE_PRICE_SOLO || "",
  team: process.env.STRIPE_PRICE_TEAM || "",
  agency: process.env.STRIPE_PRICE_AGENCY || "",
} as const;

export type StripePlan = keyof typeof stripePlanPrices;

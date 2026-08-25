import Stripe from "stripe";

function validServerKey(value: string) {
  return /^(sk|rk)_(test|live)_/.test(value);
}

export function getStripeServerKey() {
  const secretKey = (process.env.STRIPE_SECRET_KEY || "").trim();
  const restrictedKey = (process.env.STRIPE_RESTRICTED_KEY || "").trim();

  if (validServerKey(secretKey)) return secretKey;
  if (validServerKey(restrictedKey)) return restrictedKey;
  if (secretKey || restrictedKey) {
    throw new Error("STRIPE_SERVER_KEY_INVALID");
  }
  throw new Error("STRIPE_SERVER_KEY_MISSING");
}

export function getStripe() {
  return new Stripe(getStripeServerKey(), { apiVersion: "2026-07-29.dahlia", typescript: true });
}

export const stripePlanPrices = {
  solo: process.env.STRIPE_PRICE_SOLO || "",
  team: process.env.STRIPE_PRICE_TEAM || "",
  agency: process.env.STRIPE_PRICE_AGENCY || "",
} as const;

export type StripePlan = keyof typeof stripePlanPrices;

export function getStripeConfigurationStatus() {
  const secretKey = (process.env.STRIPE_SECRET_KEY || "").trim();
  const restrictedKey = (process.env.STRIPE_RESTRICTED_KEY || "").trim();
  const selectedKey = validServerKey(secretKey) ? secretKey : validServerKey(restrictedKey) ? restrictedKey : "";
  return {
    keyConfigured: Boolean(selectedKey),
    keyType: selectedKey.startsWith("sk_") ? "secret" : selectedKey.startsWith("rk_") ? "restricted" : "invalid",
    mode: selectedKey.includes("_live_") ? "live" : selectedKey.includes("_test_") ? "test" : "unknown",
    plans: Object.fromEntries(Object.entries(stripePlanPrices).map(([key, value]) => [key, {
      configured: Boolean(value),
      validFormat: value.startsWith("price_"),
    }])),
  };
}

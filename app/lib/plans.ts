export const pacificaPlans = {
  solo: {
    name: "Solo",
    monthlyPrice: 25,
    description: "A complete lead workspace for an individual sales professional.",
    seats: "1 user seat",
    numbers: "1 assigned calling number",
  },
  team: {
    name: "Team",
    monthlyPrice: 100,
    description: "Shared calling, follow-up, and visibility for a growing sales team.",
    seats: "Up to 10 users",
    numbers: "Business numbers billed separately",
  },
  agency: {
    name: "Agency",
    monthlyPrice: 200,
    description: "Advanced lead operations and reporting for established organizations.",
    seats: "Unlimited users",
    numbers: "Business numbers billed separately",
  },
} as const;

export type PacificaPlan = keyof typeof pacificaPlans;

export function planAmountInCents(plan: PacificaPlan) {
  return pacificaPlans[plan].monthlyPrice * 100;
}

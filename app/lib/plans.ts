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
    monthlyPrice: 125,
    description: "Shared calling, follow-up, and visibility for a growing sales team.",
    seats: "Up to 5 user seats",
    numbers: "Up to 5 assigned calling numbers",
  },
  agency: {
    name: "Agency",
    monthlyPrice: 315,
    description: "Advanced lead operations and reporting for established organizations.",
    seats: "Up to 15 user seats",
    numbers: "Up to 15 assigned calling numbers",
  },
} as const;

export type PacificaPlan = keyof typeof pacificaPlans;

export function planAmountInCents(plan: PacificaPlan) {
  return pacificaPlans[plan].monthlyPrice * 100;
}

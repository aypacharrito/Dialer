export const pacificaPlans = {
  solo: {
    name: "Solo",
    monthlyPrice: 25,
    description: "For one producer building a focused book.",
    seats: "1 user seat",
    numbers: "1 assigned calling number",
  },
  team: {
    name: "Team",
    monthlyPrice: 125,
    description: "For small agencies working leads together.",
    seats: "Up to 5 user seats",
    numbers: "Up to 5 assigned calling numbers",
  },
  agency: {
    name: "Agency",
    monthlyPrice: 315,
    description: "For multi-agent production teams that need room to grow.",
    seats: "Up to 15 user seats",
    numbers: "Up to 15 assigned calling numbers",
  },
} as const;

export type PacificaPlan = keyof typeof pacificaPlans;

export function planAmountInCents(plan: PacificaPlan) {
  return pacificaPlans[plan].monthlyPrice * 100;
}

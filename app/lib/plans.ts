export const pacificaPlans = {
  solo: {
    name: "Solo",
    monthlyPrice: 25,
    description: "A complete lead workspace for an individual sales professional.",
    seatLimit: 1,
    seats: "1 user",
    numbers: "1 assigned calling number",
  },
  team: {
    name: "Team",
    monthlyPrice: 100,
    description: "Shared calling, follow-up, and visibility for a growing sales team.",
    seatLimit: 5,
    seats: "Up to 5 users",
    numbers: "Business numbers billed separately",
  },
  agency: {
    name: "Agency",
    monthlyPrice: 200,
    description: "Advanced lead operations and reporting for established organizations.",
    seatLimit: 10,
    seats: "Up to 10 users",
    numbers: "Business numbers billed separately",
  },
} as const;

export type PacificaPlan = keyof typeof pacificaPlans;

export function planSeatLimit(plan: PacificaPlan) {
  return pacificaPlans[plan].seatLimit;
}

export function planAmountInCents(plan: PacificaPlan) {
  return pacificaPlans[plan].monthlyPrice * 100;
}

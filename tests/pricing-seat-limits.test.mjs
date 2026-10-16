import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {pacificaPlans,planSeatLimit,planAmountInCents} from "../app/lib/plans.ts";

test("Public plan amounts stay unchanged while seats are tiered",()=>{
  assert.deepEqual(Object.values(pacificaPlans).map(p=>[p.monthlyPrice,p.seatLimit]),[[25,1],[100,5],[200,10]]);
  assert.equal(planAmountInCents("agency"),20000);
  assert.equal(planSeatLimit("team"),5);
});
test("Agency contact CTA is present without unlimited-user marketing",()=>{
  const text=readFileSync(new URL("../app/landing/LandingClient.tsx",import.meta.url),"utf8");
  assert.match(text,/Need more than 10 users/);
  assert.match(text,/Contact us for more/);
  assert.doesNotMatch(text,/Unlimited users/);
});
test("Member creation and reactivation both check capacity",()=>{
  const text=readFileSync(new URL("../app/api/team/members/route.ts",import.meta.url),"utf8");
  assert.ok(text.includes("if(!replacing?.active)"));
  assert.ok(text.includes("if(active&&!member.active)"));
});

import test from "node:test";
import assert from "node:assert/strict";
import { hasLeadDetail, supplementalLeadDetails } from "../app/lib/lead-presentation.ts";

test("empty imported placeholders stay out of the conversation while zero and false survive", () => {
  for (const value of [null, undefined, "", "  ", "--", "—", "N/A", "not available"]) {
    assert.equal(hasLeadDetail(value), false);
  }
  for (const value of [0, false, "0", "No", "None", "$0.00", "N/A policy exception"]) {
    assert.equal(hasLeadDetail(value), true);
  }
});

test("supplemental details retain useful values and deduplicate normalized field names", () => {
  const lead = {
    importedFields: { VIN: "ABC123", "Policy Premium": 0, "Return": "--", Phone: "5551234567" },
    extraFields: { vin: "ABC123", policy_premium: 0, priorClaims: false, dateOfBirth: "1990-01-02" },
  };
  assert.deepEqual(supplementalLeadDetails(lead), [
    { label: "VIN", value: "ABC123" },
    { label: "Policy Premium", value: "0" },
    { label: "Prior Claims", value: "false" },
    { label: "Date Of Birth", value: "1990-01-02" },
  ]);
});

test("presentation filtering never changes the imported source record", () => {
  const lead = { importedFields: Object.freeze({ Return: "--", Employees: "N/A", VIN: "ABC123" }) };
  const original = JSON.stringify(lead);
  supplementalLeadDetails(lead);
  assert.equal(JSON.stringify(lead), original);
});

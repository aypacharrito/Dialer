import assert from "node:assert/strict";
import test from "node:test";
import { normalizePhoneNumber, openDeviceAction, phoneCallUrl, textMessageUrl } from "../mobile/src/lib/device-actions.ts";

test("mobile device actions preserve a leading country code", () => {
  assert.equal(normalizePhoneNumber("+1 (310) 439-4020"), "+13104394020");
  assert.equal(phoneCallUrl("+1 (310) 439-4020"), "tel:+13104394020");
  assert.equal(textMessageUrl("310.439.4020"), "sms:3104394020");
});

test("mobile device actions reject empty phone values", () => {
  assert.equal(phoneCallUrl(" -- "), "");
  assert.equal(textMessageUrl(""), "");
});

test("mobile device actions launch the OS intent without a capability preflight", async () => {
  const opened = [];
  await openDeviceAction("tel:+13104394020", async target => { opened.push(target); });
  assert.deepEqual(opened, ["tel:+13104394020"]);
  await assert.rejects(() => openDeviceAction("", async () => {}), /No phone number/);
});

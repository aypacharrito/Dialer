import test from "node:test";
import assert from "node:assert/strict";
import { dialToneFrequencies } from "../app/lib/dtmf-tone.ts";

test("telephone keypad keys use standard dual-tone frequencies",()=>{
  assert.deepEqual(dialToneFrequencies("1"),[697,1209]);
  assert.deepEqual(dialToneFrequencies("5"),[770,1336]);
  assert.deepEqual(dialToneFrequencies("0"),[941,1336]);
  assert.deepEqual(dialToneFrequencies("#"),[941,1477]);
  assert.equal(dialToneFrequencies("A"),undefined);
});

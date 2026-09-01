import assert from "node:assert/strict";
import test from "node:test";
import { clearVoiceEngineForMode, clearVoiceEngineInfo } from "../app/clearvoice.ts";

test("ClearVoice modes select progressively stronger licensed engines", () => {
  assert.equal(clearVoiceEngineForMode("natural"), "speex");
  assert.equal(clearVoiceEngineForMode("balanced"), "rnnoise");
  assert.equal(clearVoiceEngineForMode("focus"), "gtcrn");
});

test("ClearVoice exposes understandable engine labels", () => {
  assert.match(clearVoiceEngineInfo("natural").label, /Speex/i);
  assert.match(clearVoiceEngineInfo("balanced").label, /RNNoise/i);
  assert.match(clearVoiceEngineInfo("focus").label, /GTCRN/i);
});

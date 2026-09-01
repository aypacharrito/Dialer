import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageRoot = resolve(projectRoot, "node_modules/@sapphi-red/web-noise-suppressor/dist");
const publicRoot = resolve(projectRoot, "public/clearvoice");

const assets = [
  ["noiseGate/workletProcessor.js", "noise-gate-worklet.js"],
  ["speex/workletProcessor.js", "speex-worklet.js"],
  ["rnnoise/workletProcessor.js", "rnnoise-worklet.js"],
  ["gtcrn/workletProcessor.js", "gtcrn-worklet.js"],
  ["speex.wasm", "speex.wasm"],
  ["rnnoise.wasm", "rnnoise.wasm"],
  ["rnnoise_simd.wasm", "rnnoise-simd.wasm"],
  ["gtcrn.wasm", "gtcrn.wasm"],
];

await mkdir(publicRoot, { recursive: true });
await Promise.all(assets.map(([source, destination]) =>
  copyFile(resolve(packageRoot, source), resolve(publicRoot, destination)),
));

console.log(`[clearvoice] synced ${assets.length} licensed browser audio assets`);

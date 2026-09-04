import {copyFile,mkdir} from "node:fs/promises";
import {dirname,resolve} from "node:path";

const root=resolve(import.meta.dirname,"..");
const assets=[
  ["node_modules/zxing-wasm/dist/reader/zxing_reader.wasm","public/scanner/zxing_reader.wasm"],
  ["node_modules/tesseract.js/dist/worker.min.js","public/scanner/tesseract-worker.min.js"],
  ["node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz","public/scanner/eng.traineddata.gz"],
  ["node_modules/pdfjs-dist/build/pdf.worker.min.mjs","public/scanner/pdf.worker.min.mjs"],
  ["node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js","public/scanner/tesseract-core/tesseract-core-lstm.wasm.js"],
  ["node_modules/tesseract.js-core/tesseract-core-lstm.wasm","public/scanner/tesseract-core/tesseract-core-lstm.wasm"],
  ["node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js","public/scanner/tesseract-core/tesseract-core-simd-lstm.wasm.js"],
  ["node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm","public/scanner/tesseract-core/tesseract-core-simd-lstm.wasm"],
  ["node_modules/tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js","public/scanner/tesseract-core/tesseract-core-relaxedsimd-lstm.wasm.js"],
  ["node_modules/tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm","public/scanner/tesseract-core/tesseract-core-relaxedsimd-lstm.wasm"],
];
for(const [source,target] of assets){const output=resolve(root,target);await mkdir(dirname(output),{recursive:true});await copyFile(resolve(root,source),output)}
console.log(`Scanner assets ready (${assets.length} files)`);

import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Sandboxed Electron preloads and Metro assets require CommonJS imports.
  {files:["desktop/*.cjs","mobile/**/*.tsx"],rules:{"@typescript-eslint/no-require-imports":"off"}},
  {files:["mobile/**/*.tsx"],rules:{"jsx-a11y/alt-text":"off"}},
  {files:["tests/**/*.mjs"],rules:{"@typescript-eslint/no-this-alias":"off"}},
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;

PACIFICA VERCEL FIX

Problem:
The root Next.js TypeScript config includes every **/*.ts and **/*.tsx file, so Vercel
tries to type-check the separate Expo app under /mobile without installing the Expo
dependencies from mobile/package.json.

Fix:
1. Replace root /tsconfig.json with the included tsconfig.json.
2. Replace root /eslint.config.mjs with the included eslint.config.mjs.
3. Commit and push.
4. Redeploy Vercel.

Expo remains independent:
- Vercel builds the repository root web app.
- Expo/EAS uses Base directory: mobile

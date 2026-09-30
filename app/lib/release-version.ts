// Inlined by the production build, so an old tab can compare against the new deployment.
export const releaseVersion = process.env.NEXT_PUBLIC_PACIFICA_BUILD || "v27";
export function isNewRelease(current: string, next: unknown): next is string {
  return typeof next === "string" && /^[a-zA-Z0-9._-]{1,100}$/.test(next) && next !== current;
}

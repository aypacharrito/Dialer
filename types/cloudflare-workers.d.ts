declare module "cloudflare:workers" {
  // Runtime binding injected by the Sites/Cloudflare deployment.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const env: { DB: any };
}

export function isClerkConfigured() {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();
  const secretKey = process.env.CLERK_SECRET_KEY?.trim();

  return Boolean(
    publishableKey?.startsWith("pk_") && secretKey?.startsWith("sk_"),
  );
}

import { createNeonAuth } from "@neon/auth/next/server";

// Neon Auth (Managed Better Auth): readers sign in with Google. See docs: neon.com/docs/auth/quick-start/nextjs
export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET! },
});

export async function currentUser() {
  const { data: session } = await auth.getSession();
  return session?.user ?? null;
}

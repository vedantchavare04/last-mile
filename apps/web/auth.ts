import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

const providers = process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
  ? [Google({ clientId: process.env.AUTH_GOOGLE_ID, clientSecret: process.env.AUTH_GOOGLE_SECRET })]
  : [];

export const { handlers } = NextAuth({
  providers,
  secret: process.env.AUTH_SECRET ?? "last-mile-local-development-secret-change-me",
  trustHost: true,
});

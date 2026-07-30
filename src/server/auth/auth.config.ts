import { type NextAuthConfig } from "next-auth";

/**
 * Session cookies are host-scoped by default, so a session established on
 * app.<root> would not be sent to shop.<root>. Scoping the cookie to the root
 * domain fixes that — but only where a root domain exists.
 *
 * Gated on the env var rather than merely sourced from it: a `domain=.<root>`
 * cookie is rejected outright by browsers on `*.localhost`, so an
 * unconditional block would silently break sign-in in local development, which
 * is where the subdomain surfaces get verified.
 *
 * Read from `process.env` directly rather than through `~/env` because this
 * config is imported by `middleware.ts` and runs in the edge runtime.
 */
const authCookieDomain = process.env.AUTH_COOKIE_DOMAIN?.trim();

const crossSurfaceCookies: Pick<NextAuthConfig, "cookies"> = authCookieDomain
  ? {
      cookies: {
        sessionToken: {
          name: "__Secure-authjs.session-token",
          options: {
            domain: authCookieDomain,
            sameSite: "lax" as const,
            path: "/",
            secure: true,
            httpOnly: true,
          },
        },
      },
    }
  : {};

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig = {
  providers: [],
  session: {
    strategy: "jwt",
  },
  // Requests arrive on several hosts (apex plus each surface subdomain), so the
  // forwarded host has to be trusted for callback URLs to resolve correctly.
  trustHost: true,
  ...crossSurfaceCookies,
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.tenantId = user.tenantId;
      }
      return token;
    },
    session: ({ session, token }) => ({
      ...session,
      user: {
        ...session.user,
        id: token.id as string,
        role: token.role as "ADMIN" | "MANAGER" | "CASHIER" | "USER",
        tenantId: token.tenantId as string | null,
      },
    }),
  },
  pages: {
    signIn: "/auth/signin",
  },
} satisfies NextAuthConfig;










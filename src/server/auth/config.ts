import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { type DefaultSession, type NextAuthConfig } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";

import { db } from "~/server/db";
import {
  accounts,
  sessions,
  users,
  verificationTokens,
} from "~/server/db/schema";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      tenantId: string | null;
      role: "ADMIN" | "MANAGER" | "CASHIER" | "USER"; // Default role might be USER if not specified, but our schema has default CASHIER
    } & DefaultSession["user"];
  }

  interface User {
    tenantId: string | null;
    role: "ADMIN" | "MANAGER" | "CASHIER";
  }
}

declare module "next-auth/adapters" {
  interface AdapterUser {
    tenantId: string | null;
    role: "ADMIN" | "MANAGER" | "CASHIER";
  }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig = {
  providers: [
    DiscordProvider,
    /**
     * ...add more providers here.
     *
     * Most other providers require a bit more work than the Discord provider. For example, the
     * GitHub provider requires you to add the `refresh_token_expires_in` field to the Account
     * model. Refer to the NextAuth.js docs for the provider you want to use. Example:
     *
     * @see https://next-auth.js.org/providers/github
     */
  ],
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }) as any, // eslint-disable-line @typescript-eslint/no-explicit-any
  callbacks: {
    session: ({ session, user }) => ({
      ...session,
      user: {
        ...session.user,
        id: user.id,
        tenantId: user.tenantId,
        role: user.role,
      },
    }),
  },
} satisfies NextAuthConfig;

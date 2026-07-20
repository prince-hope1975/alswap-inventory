import NextAuth, { type DefaultSession } from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { cache } from "react";

import { db } from "~/server/db";
import {
  accounts,
  sessions,
  users,
  verificationTokens,
} from "~/server/db/schema";
import { authConfig } from "./auth.config";

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
      role: "ADMIN" | "MANAGER" | "CASHIER" | "USER";
    } & DefaultSession["user"];
  }

  interface User {
    tenantId: string | null;
    role: "ADMIN" | "MANAGER" | "CASHIER" | "USER";
  }
}

declare module "next-auth/adapters" {
  interface AdapterUser {
    tenantId: string | null;
    role: "ADMIN" | "MANAGER" | "CASHIER" | "USER";
  }
}

const {
  auth: uncachedAuth,
  handlers,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  providers: [
    ...authConfig.providers,
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await db.query.users.findFirst({
          where: eq(users.email, credentials.email as string),
        });

        if (!user?.password) {
          return null;
        }

        const isValid = await compare(
          credentials.password as string,
          user.password
        );

        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role ?? "CASHIER",
          tenantId: user.tenantId,
        };
      },
    }),
  ],
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }) as any, // eslint-disable-line @typescript-eslint/no-explicit-any
});

const auth = cache(uncachedAuth);

export { auth, handlers, signIn, signOut };

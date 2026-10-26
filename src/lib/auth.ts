/**
 * NextAuth with a username/password provider; users live in MongoDB
 * (lib/cms/users). Route protection is in src/middleware.ts, not here.
 */

import type { NextAuthOptions, Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import { checkNobodysPassword, getUserByEmail, verifyPassword, updateLastLogin } from "./cms/users";
import { LOCKED_PREFIX } from "./cms/password";
import { clearMisses, lockedForMinutes, recordMiss } from "./db/login-attempts";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      role?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      // The field is still called `username` inside NextAuth; it holds the email.
      credentials: {
        username: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        const email = credentials?.username?.trim().toLowerCase();
        const password = credentials?.password;
        if (!email || !password) return null;

        const forwarded = req?.headers?.["x-forwarded-for"];
        const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(",")[0]?.trim() || null;

        // Too many wrong passwords: refuse before checking this one (lib/db/login-attempts.ts).
        const wait = await lockedForMinutes(email, ip);
        if (wait > 0) throw new Error(`${LOCKED_PREFIX} Try again in ${wait} minute${wait === 1 ? "" : "s"}.`);

        const user = await getUserByEmail(email);
        // Same work and the same answer whether or not the email exists.
        const valid = user ? await verifyPassword(user, password) : await checkNobodysPassword(password);
        if (!user || !valid) {
          await recordMiss(email, ip);
          return null;
        }

        await clearMisses(email);
        await updateLastLogin(user.id);
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],

  callbacks: {
    /**
     * JWT callback - runs when JWT is created or updated
     */
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
      }
      return token;
    },

    /**
     * Session callback - runs when session is checked
     */
    async session({ session, token }: { session: Session; token: JWT }) {
      if (session.user) {
        session.user.id = token.id || "";
        session.user.role = token.role;
      }
      return session;
    },
  },

  pages: {
    signIn: "/admin/login",
    error: "/admin/login",
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days - keeps user logged in
  },

  debug: process.env.NODE_ENV === "development",
};

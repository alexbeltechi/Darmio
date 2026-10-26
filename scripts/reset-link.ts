/**
 * Make a one-time password reset link for an account, for an owner who's
 * forgotten their password (decisions, 2026-10-26). Works against the
 * database in `.env.local`; for a site on Vercel, pull its settings first
 * with `npx vercel env pull .env.local`. The owner opens the link and
 * chooses the new password on the site; it works once, for an hour.
 *
 * Usage: npm run reset-link -- <email> [site address]
 * The address defaults to NEXTAUTH_URL.
 */

import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
  const [email, given] = process.argv.slice(2);
  if (!email) {
    console.error("Usage: npm run reset-link -- <email> [site address]");
    process.exit(1);
  }
  const address = (given || process.env.NEXTAUTH_URL || "").replace(/\/+$/, "");
  if (!address) {
    console.error("Give the site's address too: npm run reset-link -- <email> https://your-site.vercel.app");
    process.exit(1);
  }

  // Imported after dotenv so the database helper sees MONGODB_URI.
  const { getUserByEmail } = await import("../src/lib/cms/users");
  const { createResetToken } = await import("../src/lib/db/password-resets");

  const user = await getUserByEmail(email);
  if (!user) {
    console.error(`No account with the email "${email}"`);
    process.exit(1);
  }
  const { token } = await createResetToken(user.id);
  console.log(`${address}/admin/reset?token=${token}`);
  console.log("Works once, for the next hour.");
  process.exit(0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

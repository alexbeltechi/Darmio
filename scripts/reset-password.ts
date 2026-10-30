/**
 * Set a user's password from the terminal, for when you're locked out of the
 * admin. Works against the database in `.env.local`.
 *
 * Usage: npm run reset-password -- <email> <new password>
 */

import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
  const [email, password] = process.argv.slice(2);
  if (!email || !password) {
    console.error("Usage: npm run reset-password -- <email> <new password>");
    process.exit(1);
  }

  // Imported after dotenv so the database helper sees MONGODB_URI.
  const { getUserByEmail, updateUser } = await import("../src/lib/cms/users");
  const { PASSWORD_MIN } = await import("../src/lib/cms/password");

  if (password.length < PASSWORD_MIN) {
    console.error(`The new password needs at least ${PASSWORD_MIN} characters`);
    process.exit(1);
  }

  const user = await getUserByEmail(email);
  if (!user) {
    console.error(`No user "${email}"`);
    process.exit(1);
  }

  const result = await updateUser(user.id, { password });
  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }
  console.log(`Password set for ${user.name} (${user.email}). Sign in at /admin/login.`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

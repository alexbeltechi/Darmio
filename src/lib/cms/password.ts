/**
 * The password rule, shared by the account form (in the browser), the account
 * API and `npm run reset-password`. Pure, so a client component can import it
 * without pulling in the database.
 */
export const PASSWORD_MIN = 8;

/** How a locked sign-in's message starts, so the login page shows it as it is. */
export const LOCKED_PREFIX = "Too many wrong passwords.";

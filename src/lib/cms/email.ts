/**
 * The one check for an email address you sign in with. Pure, for the forms
 * and the server. Addresses reserved for examples (example.com, .test,
 * .example, .invalid, .localhost) are refused: nobody reads them, so an
 * account set to one is a stand-in that was never changed.
 */
const PLACEHOLDER_DOMAIN = /(^|\.)(example\.(com|net|org)|[^.]+\.(test|example|invalid|localhost))$/i;

/** What's wrong with an address, or null when it's one you can sign in with. */
export function emailProblem(value: string): string | null {
  const email = value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return "That doesn't look like an email";
  if (PLACEHOLDER_DOMAIN.test(email.split("@")[1])) return "That's a placeholder address: use the email you actually read";
  return null;
}

export function isEmail(value: string): boolean {
  return emailProblem(value) === null;
}

/**
 * What a maker reads when their install can't do its job yet: no database,
 * a database it can't reach, or one that refuses its key. The API answers
 * with a code (lib/api/error-handler.ts); this turns it into a sentence and
 * what to do. Pure, for the setup and sign-in pages and the site.
 */
export type InstallProblem = { title: string; fix: string };

const PROBLEMS: Record<string, InstallProblem> = {
  DB_NOT_CONFIGURED: {
    title: "This site has no database yet.",
    fix: "Ask your AI to finish the install: INSTALL.md, step 3.",
  },
  DB_AUTH_ERROR: {
    title: "The database refused this site's key.",
    fix: "Ask your AI to check MONGODB_URI: INSTALL.md, step 3.",
  },
  DB_CONNECTION_ERROR: {
    title: "Darmio can't reach its database.",
    fix: "Tell your AI: \"My Darmio site can't reach its database. Check MONGODB_URI and MongoDB Atlas network access.\"",
  },
  DB_TIMEOUT: {
    title: "The database took too long to answer.",
    fix: "Try again in a minute. If it keeps happening, ask your AI to check the database: INSTALL.md, step 3.",
  },
};

/** The problem behind an API error code, or null when it isn't an install problem. */
export function installProblem(code: unknown): InstallProblem | null {
  return typeof code === "string" && code.startsWith("DB_") ? PROBLEMS[code] ?? PROBLEMS.DB_CONNECTION_ERROR : null;
}

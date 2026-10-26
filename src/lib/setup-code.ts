/**
 * The one-time setup code (decisions, 2026-10-26): set as SETUP_CODE in the
 * install's environment by whoever installs it (INSTALL.md), and handed to
 * the owner inside the setup link. Without it the setup screen can't create
 * the owner, so nobody who reaches a fresh install first can claim it.
 * Server only: it reads the environment.
 */
import { timingSafeEqual } from "node:crypto";

export const SETUP_CODE_MIN = 16;

/** Whether this install has a usable setup code configured. */
export function hasSetupCode(): boolean {
  return (process.env.SETUP_CODE ?? "").trim().length >= SETUP_CODE_MIN;
}

/** Whether `code` is this install's setup code, compared in constant time. */
export function setupCodeMatches(code: unknown): boolean {
  const expected = (process.env.SETUP_CODE ?? "").trim();
  if (typeof code !== "string" || expected.length < SETUP_CODE_MIN) return false;
  const a = Buffer.from(code.trim());
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

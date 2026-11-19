import assert from "node:assert/strict";
import { test } from "node:test";
import { withoutPageLine } from "./custom-page-files";

const REGISTRY = ` *   "a-foggy-morning": () => import("./post-pages/a-foggy-morning"),
 */
export const POST_PAGES = {
  "a-foggy-morning": () => import("./post-pages/a-foggy-morning"),
  "lake": () => import("./post-pages/lake"),
};
`;

test("removes the page's line and leaves the comment's example and the other pages", () => {
  const next = withoutPageLine(REGISTRY, "a-foggy-morning");
  assert.ok(next.includes(' *   "a-foggy-morning"'));
  assert.ok(!next.includes('\n  "a-foggy-morning"'));
  assert.ok(next.includes('"lake": () => import("./post-pages/lake"),'));
});

test("leaves the registry as it is for a key it doesn't list", () => {
  assert.equal(withoutPageLine(REGISTRY, "foggy"), REGISTRY);
});

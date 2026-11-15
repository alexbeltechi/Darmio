import assert from "node:assert/strict";
import { test } from "node:test";
import { blockMedia, customPageOf, part, unplaced } from "./custom-pages";
import type { Block, MediaItem } from "./types";

const blocks = [
  { type: "text", id: "1", html: "<p>a</p>", name: "intro" },
  { type: "gallery", id: "2", mediaIds: ["m2", "m1", "gone"], name: "photos" },
  { type: "text", id: "3", html: "<p>b</p>" },
  { type: "video", id: "4", mediaId: "m3", name: "reel" },
] as Block[];
const media = [{ id: "m1" }, { id: "m2" }, { id: "m3" }] as MediaItem[];

test("a post's custom page setting reads only when well formed", () => {
  assert.deepEqual(customPageOf({ customPage: { key: "photos-on-a-table" } }), { key: "photos-on-a-table" });
  assert.deepEqual(customPageOf({ customPage: { key: "a", off: true } }), { key: "a", off: true });
  assert.equal(customPageOf({ customPage: { key: "../etc" } }), null);
  assert.equal(customPageOf({ customPage: "yes" }), null);
  assert.equal(customPageOf({}), null);
});

test("a custom page finds parts by name, and what it doesn't place is kept", () => {
  assert.equal(part(blocks, "intro")?.id, "1");
  assert.equal(part(blocks, "photos", "gallery")?.mediaIds.length, 3);
  assert.equal(part(blocks, "photos", "text"), undefined);
  assert.deepEqual(unplaced(blocks, ["intro", "photos"]).map((b) => b.id), ["3", "4"]);
});

test("a part's files come in the block's order, without the missing ones", () => {
  assert.deepEqual(blockMedia(part(blocks, "photos"), media).map((m) => m.id), ["m2", "m1"]);
  assert.deepEqual(blockMedia(part(blocks, "reel"), media).map((m) => m.id), ["m3"]);
  assert.deepEqual(blockMedia(undefined, media), []);
});

test("a block's name travels through the post's Markdown", async () => {
  const { parseBlocks } = await import("../agent/markdown");
  const parsed = parseBlocks("<!-- block:3f2a91c0 name=intro -->\nHello.\n\n<!-- block name=photos -->\n::divider\n\n<!-- block:7be04d12 -->\nBye.\n");
  assert.deepEqual(parsed.map((p) => [p.ref, p.block.name]), [["3f2a91c0", "intro"], [undefined, "photos"], ["7be04d12", undefined]]);
});

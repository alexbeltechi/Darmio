import assert from "node:assert/strict";
import { test } from "node:test";
import { justifiedRows } from "./justified-rows";

const PORTRAIT = 1224 / 1640;

test("a portrait alone in the reading column fills its width", () => {
  const [row] = justifiedRows([PORTRAIT], 700, 20, [1640], 1);
  assert.equal(row.mode, "fill");
  assert.ok(Math.abs(row.height * 700 - 700 / PORTRAIT) < 1);
});

test("a small portrait is never enlarged past its own pixels", () => {
  const [row] = justifiedRows([PORTRAIT], 700, 20, [400], 1);
  assert.equal(row.mode, "fixed");
  assert.equal(Math.round(row.height * 700), 400);
});

test("rows of several images keep their height cap", () => {
  const [row] = justifiedRows([PORTRAIT, PORTRAIT], 820, 20, [1640, 1640], 3);
  assert.ok(row.height * 820 <= 820);
});

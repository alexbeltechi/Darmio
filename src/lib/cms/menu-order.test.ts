import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { moveItem, orderMenu } from "./menu-order";

const items = ["writing", "about", "collaborate"].map((slug) => ({ slug }));
const slugs = (list: { slug: string }[]) => list.map((i) => i.slug);

describe("orderMenu", () => {
  it("keeps the menu's own order with no saved order", () => {
    assert.deepEqual(slugs(orderMenu(items, [])), ["writing", "about", "collaborate"]);
  });

  it("follows the saved order", () => {
    assert.deepEqual(slugs(orderMenu(items, ["about", "writing", "collaborate"])), ["about", "writing", "collaborate"]);
  });

  it("puts what the order doesn't name after it, in its own order, and ignores slugs that are gone", () => {
    const more = [...items, { slug: "shop" }];
    assert.deepEqual(slugs(orderMenu(more, ["gone", "collaborate"])), ["collaborate", "writing", "about", "shop"]);
  });
});

describe("moveItem", () => {
  it("moves an item up and down", () => {
    assert.deepEqual(moveItem(["a", "b", "c"], 2, 0), ["c", "a", "b"]);
    assert.deepEqual(moveItem(["a", "b", "c"], 0, 1), ["b", "a", "c"]);
  });

  it("leaves the list alone for a move off either end", () => {
    const list = ["a", "b"];
    assert.equal(moveItem(list, 0, -1), list);
    assert.equal(moveItem(list, 1, 2), list);
  });
});

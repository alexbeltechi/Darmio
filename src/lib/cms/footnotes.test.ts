import assert from "node:assert/strict";
import { test } from "node:test";
import { extractFootnotes, stripFootnotes } from "./footnotes";
import type { Block } from "./types";

const text = (id: string, html: string): Block => ({ type: "text", id, html });

test("numbers notes in reading order across text blocks", () => {
  const { blocks, notes } = extractFootnotes([
    text("a", "<p>One.^[First note.] Two.^[Second, with a <a href=\"/x\">link</a>.]</p>"),
    { type: "divider", id: "d" },
    text("b", "<p>Three.^[Third.]</p>"),
  ]);
  assert.deepEqual(notes, ["First note.", 'Second, with a <a href="/x">link</a>.', "Third."]);
  const [a, , b] = blocks as { html: string }[];
  assert.match(a.html, /One\.<sup id="note-ref-1"[^>]*><a href="#note-1"[^>]*>1<\/a><\/sup> Two\.<sup id="note-ref-2"/);
  assert.match(b.html, /href="#note-3"[^>]*>3<\/a>/);
  assert.ok(!a.html.includes("^["));
});

test("leaves text without notes, and an unclosed note, as written", () => {
  const plain = [text("a", "<p>No notes [here].</p>"), text("b", "<p>Open ^[never closed</p><p>Next] one.</p>")];
  const { blocks, notes } = extractFootnotes(plain);
  assert.deepEqual(notes, []);
  assert.deepEqual(blocks, plain);
});

test("strips notes for previews", () => {
  assert.equal(stripFootnotes("<p>Rain comes.^[About twenty minutes later.] Then quiet.</p>"), "<p>Rain comes. Then quiet.</p>");
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { DOC_MAX_BYTES } from "./docs";
import { fileExtension, fileLibraryKind, kindsAccept, kindsInWords, mediaLibraryKind } from "./library";

const file = (name: string, type: string, size = 100) => ({ name, type, size });

test("a text file is a document, whatever type the browser gives it", () => {
  assert.equal(fileLibraryKind(file("prompt.md", "")), "document");
  assert.equal(fileLibraryKind(file("clients.csv", "text/csv")), "document");
  assert.equal(fileLibraryKind(file("Page.HTML", "text/html")), "document");
});

test("a text file too big to be a document is kept as a plain file", () => {
  assert.equal(fileLibraryKind(file("export.csv", "text/csv", DOC_MAX_BYTES + 1)), "file");
});

test("pictures, video and everything else", () => {
  assert.equal(fileLibraryKind(file("a.jpg", "image/jpeg")), "image");
  assert.equal(fileLibraryKind(file("a.mov", "video/quicktime")), "video");
  assert.equal(fileLibraryKind(file("press-kit.pdf", "application/pdf")), "file");
  assert.equal(fileLibraryKind(file("mystery", "")), "file");
  assert.equal(mediaLibraryKind({ mime: "application/pdf" }), "file");
  assert.equal(mediaLibraryKind({ mime: "image/avif" }), "image");
});

test("the label on a file's tile", () => {
  assert.equal(fileExtension("press-kit.pdf"), "PDF");
  assert.equal(fileExtension("rules.md"), "MD");
  assert.equal(fileExtension("no-extension"), "FILE");
});

test("what a spot takes, in words and as a file input's accept", () => {
  assert.equal(kindsInWords(["image"]), "images");
  assert.equal(kindsInWords(["image", "video"]), "images and video");
  assert.equal(kindsInWords(["image", "video", "document"]), "images, video and documents");
  assert.equal(kindsAccept(["image", "video"]), "image/*,video/*");
  assert.equal(kindsAccept(["image", "file"]), undefined);
  assert.match(kindsAccept(["document"]) ?? "", /\.md/);
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { uploadMime } from "./media";

test("an upload's type comes from its name when it didn't say", () => {
  assert.equal(uploadMime("application/octet-stream", "reel.mp4"), "video/mp4");
  assert.equal(uploadMime("", "IMG_5310.MOV"), "video/quicktime");
  assert.equal(uploadMime(undefined, "photo.JPG"), "image/jpeg");
  assert.equal(uploadMime("image/png", "photo.jpg"), "image/png", "a type that was sent is kept");
  assert.equal(uploadMime("application/octet-stream", "archive.zip"), "application/octet-stream");
});

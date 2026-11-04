import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { emailProblem, isEmail } from "./email";

describe("isEmail", () => {
  it("takes ordinary addresses", () => {
    for (const email of ["maker@gmail.com", "a.b+c@studio.co.uk", "  me@mysite.io  "]) assert.equal(isEmail(email), true, email);
  });

  it("refuses what isn't an address", () => {
    for (const email of ["", "maker", "maker@", "maker@site", "two words@site.com"]) assert.equal(isEmail(email), false, email);
  });

  it("refuses placeholder addresses, with its own reason", () => {
    for (const email of ["you@example.test", "ilo@example.com", "a@example.org", "x@site.test", "x@mail.example", "x@a.invalid", "x@dev.localhost"]) {
      assert.match(emailProblem(email) ?? "", /placeholder/, email);
    }
  });

  it("doesn't mistake a real domain that only contains a reserved word", () => {
    for (const email of ["a@myexample.com", "a@example.com.au", "a@testing.com"]) assert.equal(isEmail(email), true, email);
  });
});

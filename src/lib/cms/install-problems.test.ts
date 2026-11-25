import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { installProblem } from "./install-problems";

describe("installProblem", () => {
  it("names an unreachable database plainly and says what to tell the AI", () => {
    const problem = installProblem("DB_CONNECTION_ERROR");
    assert.equal(problem?.title, "Darmio can't reach its database.");
    assert.match(problem?.fix ?? "", /MONGODB_URI/);
    assert.match(problem?.fix ?? "", /Atlas network access/);
  });

  it("is nothing for a wrong setup code or no code at all", () => {
    assert.equal(installProblem(undefined), null);
    assert.equal(installProblem("BAD_CODE"), null);
  });
});

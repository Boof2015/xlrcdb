import test from "node:test";
import assert from "node:assert/strict";
import { checkChangedFiles, classifyChangedFiles, parseNameStatus } from "../src/prScope.js";

test("empty diff passes scope check", () => {
  assert.deepEqual(checkChangedFiles([]), []);
});

test("non-data PR changes require manual review", () => {
  assert.deepEqual(checkChangedFiles([
    { status: "M", paths: ["README.md"] },
    { status: "M", paths: ["src/validator.js"] }
  ]), [
    {
      code: "manual-review-required",
      filePath: "README.md",
      message: "Pull requests must be data submissions; backend, workflow, package, and documentation changes require maintainer review"
    }
  ]);
});

test("raw incoming submission passes scope check", () => {
  assert.deepEqual(checkChangedFiles([
    { status: "A", paths: ["incoming/example-track.xlrc"] }
  ]), []);
});

test("normalized data changes pass scope check", () => {
  assert.deepEqual(checkChangedFiles([
    { status: "D", paths: ["incoming/example-track.xlrc"] },
    { status: "A", paths: ["artists/aa/bb/art_aabbccddee.toml"] },
    { status: "A", paths: ["tracks/11/22/trk_1122334455.xlrc"] },
    { status: "M", paths: ["index/aliases.json"] }
  ]), []);
});

test("data PR with non-data file fails scope check", () => {
  assert.deepEqual(checkChangedFiles([
    { status: "A", paths: ["incoming/example-track.xlrc"] },
    { status: "M", paths: ["src/validator.js"] }
  ]), [
    {
      code: "pr-scope",
      filePath: "src/validator.js",
      message: "Pull requests that change xlrcdb data may only change incoming/, artists/, tracks/, and index/"
    }
  ]);
});

test("incoming non-xlrc file fails scope check", () => {
  assert.deepEqual(checkChangedFiles([
    { status: "A", paths: ["incoming/readme.txt"] }
  ]), [
    {
      code: "incoming-path",
      filePath: "incoming/readme.txt",
      message: "Incoming contribution files must be .xlrc files"
    }
  ]);
});

test("parser handles rename name-status output", () => {
  assert.deepEqual(parseNameStatus("R100\tincoming/old.xlrc\tincoming/new.xlrc\nM\tindex/aliases.json\n"), [
    { status: "R100", paths: ["incoming/old.xlrc", "incoming/new.xlrc"] },
    { status: "M", paths: ["index/aliases.json"] }
  ]);
});

test("classifier identifies raw data submissions", () => {
  const result = classifyChangedFiles([
    { status: "A", paths: ["incoming/example-track.xlrc"] }
  ]);

  assert.equal(result.kind, "data-submission");
  assert.equal(result.shouldValidateRaw, true);
  assert.equal(result.shouldNormalizeDryRun, true);
  assert.deepEqual(result.incomingFiles, ["incoming/example-track.xlrc"]);
  assert.deepEqual(result.errors, []);
});

test("classifier identifies normalized data state", () => {
  const result = classifyChangedFiles([
    { status: "D", paths: ["incoming/example-track.xlrc"] },
    { status: "A", paths: ["artists/aa/bb/art_aabbccddee.toml"] },
    { status: "A", paths: ["tracks/11/22/trk_1122334455.xlrc"] },
    { status: "M", paths: ["index/aliases.json"] }
  ]);

  assert.equal(result.kind, "normalized-data");
  assert.equal(result.shouldValidateRaw, false);
  assert.equal(result.shouldNormalizeDryRun, false);
  assert.deepEqual(result.errors, []);
});

test("classifier identifies manual review PRs", () => {
  const result = classifyChangedFiles([
    { status: "M", paths: ["README.md"] }
  ]);

  assert.equal(result.kind, "manual-review");
  assert.deepEqual(result.errors.map((error) => error.code), ["manual-review-required"]);
});

test("classifier identifies mixed data and tooling PRs", () => {
  const result = classifyChangedFiles([
    { status: "A", paths: ["incoming/example-track.xlrc"] },
    { status: "M", paths: ["package.json"] }
  ]);

  assert.equal(result.kind, "invalid-mixed");
  assert.deepEqual(result.errors.map((error) => error.code), ["pr-scope"]);
});

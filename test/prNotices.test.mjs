import { readFile } from "node:fs/promises";
import test from "node:test";
import assert from "node:assert/strict";
import {
  FAILURE_MARKER,
  buildFailureComment,
  buildLiveComment,
  buildPassedComment,
  buildStaleClose,
  buildStaleWarning,
  explainError,
  parseGateErrors,
  untrusted
} from "../src/prNotices.js";

// The real Check output from PR #36, which was closed by hand without the author being told.
const PR36_LOG = [
  "> xlrcdb@0.0.0 validate:incoming",
  "incoming/b55365d6-90c8-4e0e-bfea-e18b2ab4ff4f.xlrc: incoming-language-invalid: Incoming language tags must be real ISO 639 / BCP 47 codes; unknown: english",
  "npm error Lifecycle script `validate:incoming` failed with error:"
].join("\n");

test("gate errors are read from the logs and the classifier, without duplicates", () => {
  const errors = parseGateErrors({
    classification: { kind: "invalid-mixed", errors: [{ code: "pr-scope", filePath: "README.md", message: "Pull requests that change xlrcdb data may only change …" }] },
    logs: [PR36_LOG, PR36_LOG]
  });
  assert.deepEqual(errors.map((error) => [error.filePath, error.code]), [
    ["README.md", "pr-scope"],
    ["incoming/b55365d6-90c8-4e0e-bfea-e18b2ab4ff4f.xlrc", "incoming-language-invalid"]
  ]);
});

test("errors are explained in plain words", () => {
  const explain = (code, message) => explainError({ code, message, filePath: "" });
  assert.equal(
    explain("incoming-language-invalid", "Incoming language tags must be real ISO 639 / BCP 47 codes; unknown: english"),
    "`english` isn't a language code. Use a code like `en`, `ja` or `ja-Latn` (German is `de`, Korean is `ko`)."
  );
  assert.match(explain("track-language-invalid", "…; unknown: xx, yy"), /^`xx`, `yy` aren't language codes/u);
  assert.match(explain("incoming-language-coverage", "…; missing: ja, en"), /missing `ja`, `en`/u);
  assert.match(explain("incoming-required-header", "Incoming track must include non-empty [length:] metadata"), /missing the `\[length:\]` header/u);
  assert.match(explain("incoming-duplicate-track", "Incoming track duplicates tracks/a/b/trk_x.xlrc"), /already in xlrcdb/u);
  assert.match(explain("incoming-parse-warning", "Line 12: Malformed timestamp; line was skipped"), /^Line 12: Malformed timestamp/u);
  assert.equal(explain("something-new", "Raw message"), "Raw message");
});

test("the failure comment mentions the author and says how to fix it", () => {
  const errors = parseGateErrors({ logs: [PR36_LOG] });
  const body = buildFailureComment({ author: "Troll-Art-Official", kind: "data-submission", errors, report: `${FAILURE_MARKER}\n## Report` });

  assert.equal(body.split(FAILURE_MARKER).length, 2, "exactly one marker");
  assert.match(body, /^Hi @Troll-Art-Official, thanks for the submission!/mu);
  assert.match(body, /`english` isn't a language code/u);
  assert.match(body, /\[xlrcdb editor\]\(https:\/\/astramusic\.dev\/xlrcdb\/#\/submit\)/u);
  assert.match(body, /closed after 14 days/u);
  assert.match(body, /<details><summary>Technical report<\/summary>/u);
});

test("maintainers' PRs and manual-review PRs aren't threatened with closing", () => {
  assert.doesNotMatch(buildFailureComment({ author: "Boof2015", kind: "data-submission", errors: [], staleClose: false }), /closed after/u);
  const manual = buildFailureComment({ author: "someone", kind: "manual-review", errors: [] });
  assert.match(manual, /A maintainer will review it/u);
  assert.doesNotMatch(manual, /closed after/u);
});

test("text from the PR can't ping people or spoof the bot's markers", () => {
  const errors = [{ filePath: "incoming/x.xlrc", code: "incoming-parse-warning", message: "Line 1: hi @everyone <!-- xlrcdb-live:trk_x -->" }];
  const body = buildFailureComment({ author: "real-user", kind: "data-submission", errors, report: "ping @maintainer <!-- xlrcdb-pr-gate-report -->" });

  assert.doesNotMatch(body.replace(/@real-user/u, ""), /@(?!​)\w/u, "every other @ is broken up");
  assert.equal(body.split("<!--").length, 2, "only the bot's own marker survives");
  assert.match(buildFailureComment({ author: "not a login!", kind: "data-submission", errors: [] }), /^Hi @there,/mu);
  assert.equal(untrusted("`code`"), "'code'");
});

test("passed and live notes", () => {
  assert.match(buildPassedComment({ author: "user1" }), /the checks pass now/u);
  const live = buildLiveComment({ author: "user1", trackId: "trk_rTBDkPWq__", artistId: "art_h2c952tsMt", title: "FIRESTARTER", artist: "K/DA" });
  assert.match(live, /<!-- xlrcdb-live:trk_rTBDkPWq__ -->/u);
  assert.match(live, /https:\/\/astramusic\.dev\/xlrcdb\/#\/track\/art_h2c952tsMt\/trk_rTBDkPWq__/u);
});

test("stale.yml uses the same warning and closing messages", async () => {
  const workflow = await readFile(new URL("../.github/workflows/stale.yml", import.meta.url), "utf8");
  const value = (key) => workflow.match(new RegExp(`${key}: "(.*)"`, "u"))?.[1];
  assert.equal(value("stale-pr-message"), buildStaleWarning());
  assert.equal(value("close-pr-message"), buildStaleClose());
});

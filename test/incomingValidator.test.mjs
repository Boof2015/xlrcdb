import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { validateIncoming } from "../src/normalizer.js";

test("empty incoming directory passes", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "xlrcdb-incoming-empty-"));

  assert.deepEqual(await validateIncoming(root), []);
});

test("valid incoming file passes", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "xlrcdb-incoming-valid-"));
  await writeIncoming(root, "example.xlrc", validTrack());

  assert.deepEqual(await validateIncoming(root), []);
});

test("incoming missing required headers fails", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "xlrcdb-incoming-required-"));
  await writeIncoming(
    root,
    "missing.xlrc",
    "[ti:Example Track]\n[ar:Example Artist]\n[lang:en]\n[langs:en]\n[00:00.00]x\n"
  );

  assertErrorCodes(await validateIncoming(root), ["incoming-required-header"]);
});

test("incoming language headers are required", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "xlrcdb-incoming-language-required-"));
  await writeIncoming(
    root,
    "missing-language.xlrc",
    "[ti:Example Track]\n[ar:Example Artist]\n[length:00:10]\n[00:00.00]x\n"
  );

  const errors = await validateIncoming(root);
  assertErrorCodes(errors, ["incoming-required-header", "incoming-required-header"]);
  assert.deepEqual(errors.map((error) => error.message), [
    "Incoming track must include non-empty [lang:] metadata",
    "Incoming track must include non-empty [langs:] metadata"
  ]);
});

test("incoming languages must cover the primary and inline translation languages", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "xlrcdb-incoming-language-coverage-"));
  await writeIncoming(root, "missing-translation-language.xlrc", validTrack({
    lang: "ja",
    langs: "ja",
    line: "[00:00.00]例\n[>en]Example"
  }));

  const errors = await validateIncoming(root);
  assertErrorCodes(errors, ["incoming-language-coverage"]);
  assert.match(errors[0].message, /missing: en$/u);
});

test("incoming language coverage is case-insensitive and allows extra languages", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "xlrcdb-incoming-language-extra-"));
  await writeIncoming(root, "language-extra.xlrc", validTrack({
    lang: "JA",
    langs: "fr,ja,EN",
    line: "[00:00.00]例\n[>en]Example"
  }));

  assert.deepEqual(await validateIncoming(root), []);
});

test("incoming unknown language tags fail", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "xlrcdb-incoming-language-invalid-"));
  await writeIncoming(root, "bad-language.xlrc", validTrack({ lang: "xx", langs: "xx" }));

  const errors = await validateIncoming(root);
  assertErrorCodes(errors, ["incoming-language-invalid"]);
  assert.match(errors[0].message, /unknown: xx$/u);
});

test("incoming uncommon but real languages pass", async () => {
  // Indonesian. Regression guard for PRs #31 / #32, which were correctly tagged [lang:id].
  const root = await mkdtemp(path.join(tmpdir(), "xlrcdb-incoming-language-real-"));
  await writeIncoming(root, "indonesian.xlrc", validTrack({ lang: "id", langs: "id" }));

  assert.deepEqual(await validateIncoming(root), []);
});

test("incoming malformed length fails", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "xlrcdb-incoming-length-"));
  await writeIncoming(root, "bad-length.xlrc", validTrack({ length: "03:99" }));

  assertErrorCodes(await validateIncoming(root), ["incoming-length-format"]);
});

test("incoming parse warnings fail before normalization", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "xlrcdb-incoming-warning-"));
  await writeIncoming(root, "bad-furigana.xlrc", validTrack({ line: "[00:00.00]無い[ない]" }));

  assertErrorCodes(await validateIncoming(root), ["incoming-parse-warning"]);
});

test("incoming duplicate of existing track fails", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "xlrcdb-incoming-duplicate-existing-"));
  await writeArtist(root, "art_5k3n9p2xq7", "Example Artist", ["Example Artist"]);
  await writeTrack(root, "trk_a1b2c3d4e5", validTrack());
  await writeIncoming(root, "duplicate.xlrc", validTrack({ length: "00:11" }));

  assertErrorCodes(await validateIncoming(root), ["incoming-duplicate-track"]);
});

test("incoming duplicate among submitted files fails", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "xlrcdb-incoming-duplicate-pair-"));
  await writeIncoming(root, "one.xlrc", validTrack());
  await writeIncoming(root, "two.xlrc", validTrack({ length: "00:11" }));

  assertErrorCodes(await validateIncoming(root), ["incoming-duplicate-track"]);
});

test("incoming duplicate under a differently punctuated artist fails", async () => {
  // Exactly PRs #31 and #32: the same song submitted twice, spelled "For - Revenge" once and
  // "for Revenge" the other time. Before matchKey these resolved to two new artist records and
  // the id comparison called them unrelated, so both would have merged.
  const root = await mkdtemp(path.join(tmpdir(), "xlrcdb-incoming-duplicate-artist-"));
  await writeIncoming(root, "one.xlrc", validTrack({ artist: "For - Revenge", title: "Sadrah" }));
  await writeIncoming(root, "two.xlrc", validTrack({ artist: "for Revenge", title: "Sadrah" }));

  const errors = await validateIncoming(root);
  assertErrorCodes(errors, ["incoming-duplicate-track"]);
  assert.match(errors[0].message, /For - Revenge/u);
});

test("incoming duplicate of an existing track under a differently punctuated artist fails", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "xlrcdb-incoming-duplicate-existing-artist-"));
  await writeArtist(root, "art_5k3n9p2xq7", "for Revenge", ["for Revenge"]);
  await writeTrack(root, "trk_a1b2c3d4e5", validTrack({ artist: "for Revenge", title: "Sadrah" }));
  await writeIncoming(root, "dupe.xlrc", validTrack({ artist: "For - Revenge", title: "Sadrah" }));

  const errors = await validateIncoming(root);
  assertErrorCodes(errors, ["incoming-duplicate-track"]);
  assert.match(errors[0].message, /already filed under "for Revenge"/u);
});

test("distinct titles under one artist are not duplicates", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "xlrcdb-incoming-distinct-"));
  await writeIncoming(root, "one.xlrc", validTrack({ title: "Track One" }));
  await writeIncoming(root, "two.xlrc", validTrack({ title: "Track Two" }));

  assert.deepEqual(await validateIncoming(root), []);
});

test("incoming validation is read-only", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "xlrcdb-incoming-readonly-"));
  await writeIncoming(root, "example.xlrc", validTrack());

  assert.deepEqual(await validateIncoming(root), []);
  assert.equal(await readFile(path.join(root, "incoming", "example.xlrc"), "utf8"), validTrack());
});

async function writeArtist(root, id, canonicalName, aliases) {
  const body = id.slice(4);
  const directory = path.join(root, "artists", body.slice(0, 2), body.slice(2, 4));
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, `${id}.toml`), [
    `id = ${JSON.stringify(id)}`,
    `canonical_name = ${JSON.stringify(canonicalName)}`,
    `aliases = [${aliases.map((alias) => JSON.stringify(alias)).join(", ")}]`,
    ""
  ].join("\n"));
}

async function writeTrack(root, id, content) {
  const body = id.slice(4);
  const directory = path.join(root, "tracks", body.slice(0, 2), body.slice(2, 4));
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, `${id}.xlrc`), content);
}

async function writeIncoming(root, name, content) {
  const directory = path.join(root, "incoming");
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, name), content);
}

function validTrack(options = {}) {
  return [
    `[ti:${options.title ?? "Example Track"}]`,
    `[ar:${options.artist ?? "Example Artist"}]`,
    `[length:${options.length ?? "00:10"}]`,
    `[lang:${options.lang ?? "en"}]`,
    `[langs:${options.langs ?? "en"}]`,
    options.line ?? "[00:00.00]x",
    ""
  ].join("\n");
}

function assertErrorCodes(errors, expectedCodes) {
  assert.deepEqual(errors.map((error) => error.code), expectedCodes);
}

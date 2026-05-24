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
  await writeIncoming(root, "missing.xlrc", "[ti:Example Track]\n[ar:Example Artist]\n[00:00.00]x\n");

  assertErrorCodes(await validateIncoming(root), ["incoming-required-header"]);
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
    options.line ?? "[00:00.00]x",
    ""
  ].join("\n");
}

function assertErrorCodes(errors, expectedCodes) {
  assert.deepEqual(errors.map((error) => error.code), expectedCodes);
}

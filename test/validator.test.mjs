import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";
import { validateRepository } from "../src/validator.js";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

test("current repository passes", async () => {
  assert.deepEqual(await validateRepository(repoRoot), []);
});

test("missing required track headers fail", async () => {
  const root = await createFixtureRepo({
    track: "[ti:Example Track]\n[length:00:10]\n[lang:en]\n[langs:en]\n[00:00.00]x\n"
  });

  assertErrorCodes(await validateRepository(root), ["track-required-header"]);
});

test("malformed length fails", async () => {
  const root = await createFixtureRepo({
    track: "[ti:Example Track]\n[ar:Example Artist]\n[length:00:99]\n[lang:en]\n[langs:en]\n[00:00.00]x\n"
  });

  assertErrorCodes(await validateRepository(root), ["track-length-format"]);
});

test("missing language headers fail", async () => {
  const root = await createFixtureRepo({
    track: "[ti:Example Track]\n[ar:Example Artist]\n[length:00:10]\n[00:00.00]x\n"
  });

  const errors = await validateRepository(root);
  assertErrorCodes(errors, ["track-required-header", "track-required-header"]);
  assert.deepEqual(errors.map((error) => error.message), [
    "Track must include non-empty [lang:] metadata",
    "Track must include non-empty [langs:] metadata"
  ]);
});

test("empty language headers fail as missing metadata", async () => {
  const root = await createFixtureRepo({
    track: [
      "[ti:Example Track]",
      "[ar:Example Artist]",
      "[length:00:10]",
      "[lang:]",
      "[langs:]",
      "[00:00.00]x",
      ""
    ].join("\n")
  });

  const errors = await validateRepository(root);
  assertErrorCodes(errors, ["track-required-header", "track-required-header"]);
  assert.deepEqual(errors.map((error) => error.message), [
    "Track must include non-empty [lang:] metadata",
    "Track must include non-empty [langs:] metadata"
  ]);
});

test("track languages must include the primary language", async () => {
  const root = await createFixtureRepo({
    track: [
      "[ti:Example Track]",
      "[ar:Example Artist]",
      "[length:00:10]",
      "[lang:ja]",
      "[langs:en]",
      "[00:00.00]例",
      ""
    ].join("\n")
  });

  const errors = await validateRepository(root);
  assertErrorCodes(errors, ["track-language-coverage"]);
  assert.match(errors[0].message, /missing: ja$/u);
});

test("track languages must cover the primary and inline translation languages", async () => {
  const root = await createFixtureRepo({
    track: [
      "[ti:Example Track]",
      "[ar:Example Artist]",
      "[length:00:10]",
      "[lang:ja]",
      "[langs:ja]",
      "[00:00.00]例",
      "[>en]Example",
      ""
    ].join("\n")
  });

  const errors = await validateRepository(root);
  assertErrorCodes(errors, ["track-language-coverage"]);
  assert.match(errors[0].message, /missing: en$/u);
});

test("track language coverage is case-insensitive and allows extra languages", async () => {
  const root = await createFixtureRepo({
    track: [
      "[ti:Example Track]",
      "[ar:Example Artist]",
      "[length:00:10]",
      "[lang:JA]",
      "[langs:fr,ja,EN]",
      "[00:00.00]例",
      "[>en]Example",
      ""
    ].join("\n")
  });

  assert.deepEqual(await validateRepository(root), []);
});

test("duplicate alias across artists fails", async () => {
  const root = await createFixtureRepo();
  await writeArtist(root, "art_aabbccddee", [
    'id = "art_aabbccddee"',
    'canonical_name = "Other Artist"',
    'aliases = ["example artist"]',
    ""
  ].join("\n"));

  assertErrorCodes(await validateRepository(root), ["artist-alias-collision"]);
});

test("duplicate track title and length for the same artist fails", async () => {
  const root = await createFixtureRepo();
  await writeTrack(root, "trk_aabbccddee", [
    "[ti: example track ]",
    "[ar:Example Artist]",
    "[length:00:11]",
    "[lang:en]",
    "[langs:en]",
    "[00:00.00]x",
    ""
  ].join("\n"));

  assertErrorCodes(await validateRepository(root), ["track-duplicate"]);
});

test("wrong sharded path fails", async () => {
  const root = await createFixtureRepo({ skipTrack: true });
  await mkdir(path.join(root, "tracks", "zz", "zz"), { recursive: true });
  await writeFile(path.join(root, "tracks", "zz", "zz", "trk_a1b2c3d4e5.xlrc"), validTrack());

  assertErrorCodes(await validateRepository(root), ["track-path"]);
});

async function createFixtureRepo(options = {}) {
  const root = await mkdtemp(path.join(tmpdir(), "xlrcdb-validator-"));
  await writeArtist(root, "art_5k3n9p2xq7", [
    'id = "art_5k3n9p2xq7"',
    'canonical_name = "Example Artist"',
    'aliases = ["Example Artist"]',
    ""
  ].join("\n"));

  if (!options.skipTrack) {
    await writeTrack(root, "trk_a1b2c3d4e5", options.track ?? validTrack());
  }

  return root;
}

async function writeArtist(root, id, content) {
  const body = id.slice(4);
  const directory = path.join(root, "artists", body.slice(0, 2), body.slice(2, 4));
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, `${id}.toml`), content);
}

async function writeTrack(root, id, content) {
  const body = id.slice(4);
  const directory = path.join(root, "tracks", body.slice(0, 2), body.slice(2, 4));
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, `${id}.xlrc`), content);
}

function validTrack() {
  return [
    "[ti:Example Track]",
    "[ar:Example Artist]",
    "[length:00:10]",
    "[lang:en]",
    "[langs:en]",
    "[00:00.00]x",
    ""
  ].join("\n");
}

function assertErrorCodes(errors, expectedCodes) {
  assert.deepEqual(errors.map((error) => error.code), expectedCodes);
}

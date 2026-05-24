import { mkdir, mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { normalizeIncoming, NormalizationError } from "../src/normalizer.js";
import { validateRepository } from "../src/validator.js";

test("normalizing with no incoming files refreshes an empty index", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "xlrcdb-normalize-empty-"));

  const result = await normalizeIncoming(root, { generateId: queuedIds([]) });

  assert.deepEqual(result, {
    incomingProcessed: 0,
    artistsCreated: 0,
    tracksCreated: 0,
    generatedFiles: 1
  });
  assert.deepEqual(JSON.parse(await readFile(path.join(root, "index", "aliases.json"), "utf8")), {
    version: 1,
    aliases: {}
  });
});

test("normalizes an incoming track for an existing artist", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "xlrcdb-normalize-existing-"));
  await writeArtist(root, "art_5k3n9p2xq7", "Example Artist", ["Example Artist"]);
  await writeIncoming(root, "one.xlrc", validTrack());

  const result = await normalizeIncoming(root, { generateId: queuedIds(["trk_a1b2c3d4e5"]) });

  assert.equal(result.incomingProcessed, 1);
  assert.equal(result.artistsCreated, 0);
  assert.equal(result.tracksCreated, 1);
  assert.equal(await readFile(path.join(root, "tracks", "a1", "b2", "trk_a1b2c3d4e5.xlrc"), "utf8"), validTrack());
  assert.equal(await pathExists(path.join(root, "incoming", "one.xlrc")), false);
  assert.deepEqual(await validateRepository(root), []);
});

test("normalizes an incoming track by creating a new artist", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "xlrcdb-normalize-new-"));
  await writeIncoming(root, "one.xlrc", validTrack());

  const result = await normalizeIncoming(root, { generateId: queuedIds(["art_5k3n9p2xq7", "trk_a1b2c3d4e5"]) });

  assert.equal(result.artistsCreated, 1);
  assert.equal(result.tracksCreated, 1);
  assert.equal(
    await readFile(path.join(root, "artists", "5k", "3n", "art_5k3n9p2xq7.toml"), "utf8"),
    [
      'id = "art_5k3n9p2xq7"',
      'canonical_name = "Example Artist"',
      "aliases = [",
      '  "Example Artist",',
      "]",
      ""
    ].join("\n")
  );
  assert.deepEqual(JSON.parse(await readFile(path.join(root, "index", "aliases.json"), "utf8")), {
    version: 1,
    aliases: {
      "example artist": "art_5k3n9p2xq7"
    }
  });
  assert.deepEqual(await validateRepository(root), []);
});

test("rejects invalid incoming files before writing", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "xlrcdb-normalize-invalid-"));
  await writeIncoming(root, "bad.xlrc", "[ti:Example Track]\n[ar:Example Artist]\n[00:00.00]x\n");

  const errors = await captureNormalizationErrors(() => normalizeIncoming(root, { generateId: queuedIds(["art_5k3n9p2xq7"]) }));

  assert.deepEqual(errors.map((error) => error.code), ["incoming-required-header"]);
  assert.equal(await pathExists(path.join(root, "incoming", "bad.xlrc")), true);
  assert.equal(await pathExists(path.join(root, "artists")), false);
  assert.equal(await pathExists(path.join(root, "tracks")), false);
});

test("rejects duplicate incoming tracks before writing", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "xlrcdb-normalize-duplicate-"));
  await writeArtist(root, "art_5k3n9p2xq7", "Example Artist", ["Example Artist"]);
  await writeTrack(root, "trk_a1b2c3d4e5", validTrack());
  await writeIncoming(root, "duplicate.xlrc", validTrack({ length: "00:11" }));

  const errors = await captureNormalizationErrors(() => normalizeIncoming(root, { generateId: queuedIds(["trk_aabbccddee"]) }));

  assert.deepEqual(errors.map((error) => error.code), ["incoming-duplicate-track"]);
  assert.equal(await pathExists(path.join(root, "tracks", "aa", "bb", "trk_aabbccddee.xlrc")), false);
  assert.equal(await pathExists(path.join(root, "incoming", "duplicate.xlrc")), true);
});

test("retries generated IDs on collision", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "xlrcdb-normalize-collision-"));
  await writeArtist(root, "art_5k3n9p2xq7", "Example Artist", ["Example Artist"]);
  await writeTrack(root, "trk_a1b2c3d4e5", validTrack({ title: "Existing Track" }));
  await writeIncoming(root, "next.xlrc", validTrack({ title: "Next Track" }));

  await normalizeIncoming(root, { generateId: queuedIds(["trk_a1b2c3d4e5", "trk_aabbccddee"]) });

  assert.equal(await pathExists(path.join(root, "tracks", "aa", "bb", "trk_aabbccddee.xlrc")), true);
  assert.deepEqual(await validateRepository(root), []);
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
    "[00:00.00]x",
    ""
  ].join("\n");
}

function queuedIds(ids) {
  const queue = [...ids];
  return () => {
    const id = queue.shift();
    assert.ok(id, "test ID queue was exhausted");
    return id;
  };
}

async function captureNormalizationErrors(callback) {
  try {
    await callback();
  } catch (error) {
    assert.ok(error instanceof NormalizationError);
    return error.errors;
  }

  assert.fail("Expected normalizeIncoming to throw");
}

async function pathExists(targetPath) {
  try {
    await stat(targetPath);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

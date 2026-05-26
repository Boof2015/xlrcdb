import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";
import { buildIndexFiles, generateIndex } from "../src/indexGenerator.js";
import { findFiles } from "../src/repository.js";
import { validateRepository } from "../src/validator.js";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

test("repository index files match generated output", {
  // The committed index is regenerated on main by the Reconcile workflow, so a PR
  // (which carries raw data with a possibly-stale index for artist/track edits)
  // is not required to match. The PR gate sets XLRCDB_SKIP_INDEX_SYNC; this still
  // runs locally and anywhere the flag is unset.
  skip: process.env.XLRCDB_SKIP_INDEX_SYNC === "1"
    ? "index is regenerated on main by Reconcile; not enforced on PRs"
    : false
}, async () => {
  const files = await buildIndexFiles(repoRoot);
  const committedIndexPaths = (await findFiles(path.join(repoRoot, "index"), ".json"))
    .map((absolutePath) => path.relative(repoRoot, absolutePath).split(path.sep).join("/"));

  assert.deepEqual([...files.keys()], committedIndexPaths);

  for (const repoPath of committedIndexPaths) {
    assert.equal(files.get(repoPath), await readFile(path.join(repoRoot, repoPath), "utf8"));
  }
});

test("aliases include canonical names and tracks resolve through aliases", async () => {
  const root = await createFixtureRepo({
    aliases: ["Alt Artist"],
    tracks: [
      {
        id: "trk_a1b2c3d4e5",
        artist: "Alt Artist",
        title: "Example Track",
        length: "00:10"
      }
    ]
  });
  const files = await buildIndexFiles(root);

  assert.deepEqual(JSON.parse(files.get("index/aliases.json")), {
    version: 1,
    aliases: {
      "alt artist": "art_5k3n9p2xq7",
      "example artist": "art_5k3n9p2xq7"
    }
  });
  assert.deepEqual(JSON.parse(files.get("index/artists/5k/3n/art_5k3n9p2xq7.json")).tracks, [
    {
      id: "trk_a1b2c3d4e5",
      title: "Example Track",
      length: 10,
      path: "tracks/a1/b2/trk_a1b2c3d4e5.xlrc"
    }
  ]);
});

test("output ordering is deterministic", async () => {
  const root = await createFixtureRepo({
    canonicalName: "Zulu",
    aliases: ["Beta", " Alpha  "],
    tracks: [
      {
        id: "trk_zzzzzzzzzz",
        artist: "Zulu",
        title: "Song B",
        length: "00:30"
      },
      {
        id: "trk_mmmmmmmmmm",
        artist: "Zulu",
        title: "Song A",
        length: "00:31"
      },
      {
        id: "trk_aaaaaaaaaa",
        artist: "Zulu",
        title: "Song A",
        length: "00:29"
      }
    ]
  });
  const files = await buildIndexFiles(root);
  const aliases = JSON.parse(files.get("index/aliases.json")).aliases;
  const artistIndex = JSON.parse(files.get("index/artists/5k/3n/art_5k3n9p2xq7.json"));

  assert.deepEqual(Object.keys(aliases), ["alpha", "beta", "zulu"]);
  assert.deepEqual(artistIndex.tracks.map((track) => [track.id, track.length]), [
    ["trk_aaaaaaaaaa", 29],
    ["trk_mmmmmmmmmm", 31],
    ["trk_zzzzzzzzzz", 30]
  ]);
});

test("valid fixture repos generate matching index files", async () => {
  const root = await createFixtureRepo();

  assert.deepEqual(await validateRepository(root), []);

  const files = await generateIndex(root);
  const aliasesPath = path.join(root, "index", "aliases.json");
  const artistPath = path.join(root, "index", "artists", "5k", "3n", "art_5k3n9p2xq7.json");

  assert.equal(await readFile(aliasesPath, "utf8"), files.get("index/aliases.json"));
  assert.equal(await readFile(artistPath, "utf8"), files.get("index/artists/5k/3n/art_5k3n9p2xq7.json"));
});

async function createFixtureRepo(options = {}) {
  const root = await mkdtemp(path.join(tmpdir(), "xlrcdb-index-"));
  await writeArtist(root, options.artistId ?? "art_5k3n9p2xq7", {
    canonicalName: options.canonicalName ?? "Example Artist",
    aliases: options.aliases ?? ["Example Artist"]
  });

  for (const track of options.tracks ?? [
    {
      id: "trk_a1b2c3d4e5",
      artist: options.canonicalName ?? "Example Artist",
      title: "Example Track",
      length: "00:10"
    }
  ]) {
    await writeTrack(root, track);
  }

  return root;
}

async function writeArtist(root, id, artist) {
  const body = id.slice(4);
  const directory = path.join(root, "artists", body.slice(0, 2), body.slice(2, 4));
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, `${id}.toml`), [
    `id = ${JSON.stringify(id)}`,
    `canonical_name = ${JSON.stringify(artist.canonicalName)}`,
    `aliases = [${artist.aliases.map((alias) => JSON.stringify(alias)).join(", ")}]`,
    ""
  ].join("\n"));
}

async function writeTrack(root, track) {
  const body = track.id.slice(4);
  const directory = path.join(root, "tracks", body.slice(0, 2), body.slice(2, 4));
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, `${track.id}.xlrc`), [
    `[ti:${track.title}]`,
    `[ar:${track.artist}]`,
    `[length:${track.length}]`,
    "[00:00.00]x",
    ""
  ].join("\n"));
}

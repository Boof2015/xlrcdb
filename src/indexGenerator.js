import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { inspectRepository } from "./validator.js";
import { expectedShardedPath, normalizeKey } from "./repository.js";

export class IndexGenerationError extends Error {
  constructor(errors) {
    super("Cannot generate index from an invalid repository");
    this.name = "IndexGenerationError";
    this.errors = errors;
  }
}

export async function buildIndexFiles(rootDir) {
  const repository = await inspectRepository(rootDir);
  if (repository.errors.length > 0) {
    throw new IndexGenerationError(repository.errors);
  }

  const files = new Map();
  const aliases = buildAliases(repository.artists);
  const tracksByArtist = buildTracksByArtist(repository.tracks);

  files.set("index/aliases.json", toJson({
    version: 1,
    aliases
  }));

  for (const artist of [...repository.artists].sort((left, right) => compareStrings(left.id, right.id))) {
    const tracks = (tracksByArtist.get(artist.id) ?? [])
      .sort(compareTracks)
      .map((track) => ({
        id: track.id,
        title: track.title,
        length: track.lengthSeconds,
        path: track.filePath
      }));

    files.set(expectedShardedPath("index/artists", artist.id, ".json"), toJson({
      version: 1,
      id: artist.id,
      canonical_name: artist.canonicalName,
      tracks
    }));
  }

  return files;
}

export async function generateIndex(rootDir) {
  const root = path.resolve(rootDir);
  const files = await buildIndexFiles(root);

  await rm(path.join(root, "index"), { recursive: true, force: true });

  for (const [repoPath, content] of files) {
    const absolutePath = path.join(root, repoPath);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, content);
  }

  return files;
}

function buildAliases(artists) {
  const aliases = new Map();

  for (const artist of [...artists].sort((left, right) => compareStrings(left.id, right.id))) {
    for (const alias of [artist.canonicalName, ...artist.aliases]) {
      const normalized = normalizeKey(alias);
      if (normalized && !aliases.has(normalized)) {
        aliases.set(normalized, artist.id);
      }
    }
  }

  return Object.fromEntries([...aliases.entries()].sort(([left], [right]) => compareStrings(left, right)));
}

function buildTracksByArtist(tracks) {
  const tracksByArtist = new Map();

  for (const track of tracks) {
    const artistTracks = tracksByArtist.get(track.artistId) ?? [];
    artistTracks.push(track);
    tracksByArtist.set(track.artistId, artistTracks);
  }

  return tracksByArtist;
}

function compareTracks(left, right) {
  return (
    compareStrings(left.normalizedTitle, right.normalizedTitle) ||
    left.lengthSeconds - right.lengthSeconds ||
    compareStrings(left.id, right.id)
  );
}

function compareStrings(left, right) {
  if (left < right) {
    return -1;
  }

  if (left > right) {
    return 1;
  }

  return 0;
}

function toJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

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

  files.set("index/catalog.json", toJson(buildCatalog(repository, tracksByArtist)));

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

// Everything a browser needs to search and browse in one file: artists with their aliases
// as written (index/aliases.json only has normalized keys), and tracks with what's in them
// and when they were added. Clients that only look tracks up keep using aliases.json and the
// per-artist files, which are unchanged.
function buildCatalog(repository, tracksByArtist) {
  const artists = [...repository.artists]
    .sort((left, right) => compareStrings(left.id, right.id))
    .map((artist) => ({
      id: artist.id,
      name: artist.canonicalName,
      ...(artist.canonicalNameLatin ? { latin: artist.canonicalNameLatin } : {}),
      aliases: artist.aliases,
      tracks: (tracksByArtist.get(artist.id) ?? []).length
    }));

  const tracks = [...repository.tracks]
    .sort((left, right) => compareStrings(left.id, right.id))
    .map((track) => ({
      id: track.id,
      artist: track.artistId,
      title: track.title,
      length: track.lengthSeconds,
      path: track.filePath,
      ...describeTrack(track.file),
      added: repository.added?.get(track.id) ?? null
    }));

  return { version: 1, artists, tracks };
}

function describeTrack(file) {
  const meta = file?.meta ?? {};
  const seen = new Set();
  const lyrics = [];
  for (const line of file?.lines ?? []) {
    if (seen.has(line.line)) continue; // a multi-timestamp line counts once
    seen.add(line.line);
    if (!line.isEmpty) lyrics.push(line);
  }
  const translations = [...new Set(lyrics.flatMap((line) => line.translations
    .filter((translation) => translation.text.trim())
    .map((translation) => translation.lang)))].sort(compareStrings);
  return {
    lang: typeof meta.lang === "string" ? meta.lang.trim() : "",
    langs: Array.isArray(meta.langs) ? meta.langs : [],
    lines: lyrics.length,
    translations,
    furigana: lyrics.some((line) => line.furigana.length > 0),
    words: lyrics.some((line) => line.words.length > 0),
    voices: lyrics.some((line) => Boolean(line.voice))
  };
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

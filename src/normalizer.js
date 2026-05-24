import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { randomInt } from "node:crypto";
import path from "node:path";
import { parseXLRC, validateXLRC } from "@boof2015/xlrc";
import { generateIndex } from "./indexGenerator.js";
import { inspectRepository, validateRepository } from "./validator.js";
import {
  ARTIST_ID_PATTERN,
  TRACK_ID_PATTERN,
  expectedShardedPath,
  findFiles,
  normalizeKey,
  parseLengthSeconds,
  validationError
} from "./repository.js";

const ID_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz-";
const MAX_ID_ATTEMPTS = 100;

export class NormalizationError extends Error {
  constructor(errors) {
    super("Cannot normalize an invalid repository or incoming file set");
    this.name = "NormalizationError";
    this.errors = errors;
  }
}

export async function normalizeIncoming(rootDir, options = {}) {
  const root = path.resolve(rootDir);
  const repository = await inspectRepository(root);
  if (repository.errors.length > 0) {
    throw new NormalizationError(repository.errors);
  }

  const incomingEntries = await readIncomingEntries(root);
  if (incomingEntries.length === 0) {
    const generatedFiles = await generateIndex(root);
    return {
      incomingProcessed: 0,
      artistsCreated: 0,
      tracksCreated: 0,
      generatedFiles: generatedFiles.size
    };
  }

  const plan = planNormalization(repository, incomingEntries, options.generateId ?? randomId);
  if (plan.errors.length > 0) {
    throw new NormalizationError(plan.errors);
  }

  for (const artist of plan.artistsToCreate) {
    await writePlannedFile(root, artist.path, serializeArtist(artist));
  }

  for (const track of plan.tracksToCreate) {
    await writePlannedFile(root, track.path, track.content);
  }

  for (const entry of incomingEntries) {
    await rm(entry.absolutePath);
  }

  const generatedFiles = await generateIndex(root);
  const validationErrors = await validateRepository(root);
  if (validationErrors.length > 0) {
    throw new NormalizationError(validationErrors);
  }

  return {
    incomingProcessed: incomingEntries.length,
    artistsCreated: plan.artistsToCreate.length,
    tracksCreated: plan.tracksToCreate.length,
    generatedFiles: generatedFiles.size
  };
}

async function readIncomingEntries(root) {
  const incomingFiles = await findFiles(path.join(root, "incoming"), ".xlrc");
  const entries = [];

  for (const absolutePath of incomingFiles) {
    const filePath = path.relative(root, absolutePath).split(path.sep).join("/");
    const content = await readFile(absolutePath, "utf8");
    let file;

    try {
      file = parseXLRC(content);
      entries.push({
        absolutePath,
        filePath,
        content,
        file,
        parseError: undefined,
        parseWarnings: file.warnings,
        validationWarnings: validateXLRC(file).warnings
      });
    } catch (error) {
      entries.push({
        absolutePath,
        filePath,
        content,
        file: undefined,
        parseError: error,
        parseWarnings: [],
        validationWarnings: []
      });
    }
  }

  return entries;
}

function planNormalization(repository, incomingEntries, generateId) {
  const errors = [];
  const usedIds = new Set([
    ...repository.artists.map((artist) => artist.id),
    ...repository.tracks.map((track) => track.id)
  ]);
  const aliasIndex = new Map(repository.aliasIndex);
  const plannedTracks = [...repository.tracks];
  const artistsToCreate = [];
  const tracksToCreate = [];

  for (const entry of incomingEntries) {
    if (entry.parseError) {
      errors.push(validationError("incoming-parse", entry.filePath, `Incoming XLRC could not be parsed: ${entry.parseError.message}`));
      continue;
    }

    for (const warning of entry.parseWarnings) {
      errors.push(validationError("incoming-parse-warning", entry.filePath, `Line ${warning.line}: ${warning.message}`));
    }

    for (const warning of entry.validationWarnings) {
      errors.push(validationError("incoming-validation-warning", entry.filePath, `Line ${warning.line}: ${warning.message}`));
    }

    const artistName = requiredIncomingHeader(entry.file.meta.ar, "ar", entry.filePath, errors);
    const title = requiredIncomingHeader(entry.file.meta.ti, "ti", entry.filePath, errors);
    const length = requiredIncomingHeader(entry.file.meta.length, "length", entry.filePath, errors);
    const lengthSeconds = typeof length === "string" ? parseLengthSeconds(length) : undefined;

    if (typeof length === "string" && lengthSeconds === undefined) {
      errors.push(validationError("incoming-length-format", entry.filePath, "Incoming [length:] must use mm:ss format"));
    }

    if (typeof artistName !== "string" || typeof title !== "string" || lengthSeconds === undefined) {
      continue;
    }

    const artist = resolveOrCreateArtist(artistName, aliasIndex, usedIds, artistsToCreate, generateId, entry.filePath, errors);
    if (!artist) {
      continue;
    }

    const normalizedTitle = normalizeKey(title);
    const duplicate = plannedTracks.find((track) => (
      track.artistId === artist.id &&
      track.normalizedTitle === normalizedTitle &&
      Math.abs(track.lengthSeconds - lengthSeconds) <= 1
    ));
    if (duplicate) {
      errors.push(validationError("incoming-duplicate-track", entry.filePath, `Incoming track duplicates ${duplicate.filePath}`));
      continue;
    }

    const id = allocateId("trk", TRACK_ID_PATTERN, usedIds, generateId, entry.filePath, errors);
    if (!id) {
      continue;
    }

    const track = {
      id,
      artistId: artist.id,
      normalizedTitle,
      title,
      lengthSeconds,
      filePath: expectedShardedPath("tracks", id, ".xlrc"),
      path: expectedShardedPath("tracks", id, ".xlrc"),
      content: entry.content
    };

    plannedTracks.push(track);
    tracksToCreate.push(track);
  }

  return { errors, artistsToCreate, tracksToCreate };
}

function resolveOrCreateArtist(artistName, aliasIndex, usedIds, artistsToCreate, generateId, filePath, errors) {
  const normalizedArtist = normalizeKey(artistName);
  const existing = aliasIndex.get(normalizedArtist);
  if (existing) {
    return existing.artist;
  }

  const id = allocateId("art", ARTIST_ID_PATTERN, usedIds, generateId, filePath, errors);
  if (!id) {
    return undefined;
  }

  const canonicalName = artistName.trim();
  const artist = {
    id,
    canonicalName,
    aliases: [canonicalName],
    filePath: expectedShardedPath("artists", id, ".toml"),
    path: expectedShardedPath("artists", id, ".toml")
  };

  artistsToCreate.push(artist);
  aliasIndex.set(normalizedArtist, { artist, alias: canonicalName });

  return artist;
}

function allocateId(prefix, pattern, usedIds, generateId, filePath, errors) {
  for (let attempt = 0; attempt < MAX_ID_ATTEMPTS; attempt += 1) {
    const id = generateId(prefix);
    if (typeof id !== "string" || !pattern.test(id)) {
      errors.push(validationError("incoming-id-generation", filePath, `Generated id "${id}" is not a valid ${prefix} id`));
      return undefined;
    }

    if (!usedIds.has(id)) {
      usedIds.add(id);
      return id;
    }
  }

  errors.push(validationError("incoming-id-collision", filePath, `Could not allocate a unique ${prefix} id`));
  return undefined;
}

function randomId(prefix) {
  let body = "";
  for (let index = 0; index < 10; index += 1) {
    body += ID_ALPHABET[randomInt(ID_ALPHABET.length)];
  }

  return `${prefix}_${body}`;
}

function requiredIncomingHeader(value, header, filePath, errors) {
  if (typeof value !== "string" || value.trim() === "") {
    errors.push(validationError("incoming-required-header", filePath, `Incoming track must include non-empty [${header}:] metadata`));
    return undefined;
  }

  return value;
}

async function writePlannedFile(root, repoPath, content) {
  const absolutePath = path.join(root, repoPath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, { flag: "wx" });
}

function serializeArtist(artist) {
  return [
    `id = ${tomlString(artist.id)}`,
    `canonical_name = ${tomlString(artist.canonicalName)}`,
    "aliases = [",
    `  ${tomlString(artist.canonicalName)},`,
    "]",
    ""
  ].join("\n");
}

function tomlString(value) {
  return JSON.stringify(value);
}

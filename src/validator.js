import path from "node:path";
import {
  ARTIST_ID_PATTERN,
  TRACK_ID_PATTERN,
  buildAliasIndex,
  expectedShardedPath,
  normalizeKey,
  parseLengthSeconds,
  readArtistEntries,
  readTrackEntries,
  validationError
} from "./repository.js";

export async function validateRepository(rootDir) {
  return (await inspectRepository(rootDir)).errors;
}

export async function inspectRepository(rootDir) {
  const root = path.resolve(rootDir);
  const errors = [];
  const artists = validateArtists(await readArtistEntries(root), errors);
  const aliasIndex = buildAliasIndex(artists, errors);
  const tracks = validateTracks(await readTrackEntries(root), aliasIndex, errors);

  validateDuplicateTracks(tracks, errors);

  return { root, artists, aliasIndex, tracks, errors };
}

function validateArtists(entries, errors) {
  const artists = [];
  const seenIds = new Map();

  for (const entry of entries) {
    const { document, filePath } = entry;

    if (entry.parseError) {
      errors.push(validationError("artist-toml-parse", filePath, `Artist TOML could not be parsed: ${entry.parseError.message}`));
      continue;
    }

    const id = document.id;
    const canonicalName = document.canonical_name;
    const aliases = document.aliases;

    if (typeof id !== "string" || !ARTIST_ID_PATTERN.test(id)) {
      errors.push(validationError("artist-id", filePath, "Artist id must match art_<10 URL-safe chars>"));
      continue;
    }

    const expectedPath = expectedShardedPath("artists", id, ".toml");
    if (filePath !== expectedPath) {
      errors.push(validationError("artist-path", filePath, `Artist file must be stored at ${expectedPath}`));
    }

    const firstPath = seenIds.get(id);
    if (firstPath) {
      errors.push(validationError("artist-duplicate-id", filePath, `Artist id already appears in ${firstPath}`));
    } else {
      seenIds.set(id, filePath);
    }

    if (typeof canonicalName !== "string" || canonicalName.trim() === "") {
      errors.push(validationError("artist-canonical-name", filePath, "Artist canonical_name must be a non-empty string"));
    }

    if (!Array.isArray(aliases) || aliases.length === 0 || aliases.some((alias) => typeof alias !== "string" || alias.trim() === "")) {
      errors.push(validationError("artist-aliases", filePath, "Artist aliases must be a non-empty array of non-empty strings"));
    }

    for (const optionalField of ["canonical_name_latin", "pronunciation"]) {
      if (document[optionalField] !== undefined && typeof document[optionalField] !== "string") {
        errors.push(validationError("artist-optional-field", filePath, `Artist ${optionalField} must be a string when present`));
      }
    }

    artists.push({
      id,
      canonicalName: typeof canonicalName === "string" ? canonicalName : "",
      aliases: Array.isArray(aliases) ? aliases.filter((alias) => typeof alias === "string") : [],
      filePath
    });
  }

  return artists;
}

function validateTracks(entries, aliasIndex, errors) {
  const tracks = [];
  const seenIds = new Map();

  for (const entry of entries) {
    const { filePath, id } = entry;

    if (!TRACK_ID_PATTERN.test(id)) {
      errors.push(validationError("track-id", filePath, "Track filename must match trk_<10 URL-safe chars>.xlrc"));
    } else {
      const expectedPath = expectedShardedPath("tracks", id, ".xlrc");
      if (filePath !== expectedPath) {
        errors.push(validationError("track-path", filePath, `Track file must be stored at ${expectedPath}`));
      }

      const firstPath = seenIds.get(id);
      if (firstPath) {
        errors.push(validationError("track-duplicate-id", filePath, `Track id already appears in ${firstPath}`));
      } else {
        seenIds.set(id, filePath);
      }
    }

    if (entry.parseError) {
      errors.push(validationError("track-parse", filePath, `Track could not be parsed: ${entry.parseError.message}`));
      continue;
    }

    for (const warning of entry.parseWarnings) {
      errors.push(validationError("track-parse-warning", filePath, `Line ${warning.line}: ${warning.message}`));
    }

    for (const warning of entry.validationWarnings.filter((warning) => warning.code !== "invalid-length")) {
      errors.push(validationError("track-validation-warning", filePath, `Line ${warning.line}: ${warning.message}`));
    }

    const { file } = entry;
    const artist = requiredHeader(file.meta.ar, "ar", filePath, errors);
    const title = requiredHeader(file.meta.ti, "ti", filePath, errors);
    const length = requiredHeader(file.meta.length, "length", filePath, errors);
    const lengthSeconds = typeof length === "string" ? parseLengthSeconds(length) : undefined;

    if (typeof length === "string" && lengthSeconds === undefined) {
      errors.push(validationError("track-length-format", filePath, "Track [length:] must use mm:ss format"));
    }

    const artistMatch = typeof artist === "string" ? aliasIndex.get(normalizeKey(artist)) : undefined;
    if (typeof artist === "string" && !artistMatch) {
      errors.push(validationError("track-artist", filePath, `Track artist "${artist}" does not match any artist alias`));
    }

    if (artistMatch && typeof title === "string" && lengthSeconds !== undefined) {
      tracks.push({
        id,
        artistId: artistMatch.artist.id,
        normalizedTitle: normalizeKey(title),
        title,
        lengthSeconds,
        filePath
      });
    }
  }

  return tracks;
}

function validateDuplicateTracks(tracks, errors) {
  for (let leftIndex = 0; leftIndex < tracks.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < tracks.length; rightIndex += 1) {
      const left = tracks[leftIndex];
      const right = tracks[rightIndex];

      if (
        left.artistId === right.artistId &&
        left.normalizedTitle === right.normalizedTitle &&
        Math.abs(left.lengthSeconds - right.lengthSeconds) <= 1
      ) {
        errors.push(
          validationError(
            "track-duplicate",
            right.filePath,
            `Duplicate track "${right.title}" for ${right.artistId}; conflicts with ${left.filePath}`
          )
        );
      }
    }
  }
}

function requiredHeader(value, header, filePath, errors) {
  if (typeof value !== "string" || value.trim() === "") {
    errors.push(validationError("track-required-header", filePath, `Track must include non-empty [${header}:] metadata`));
    return undefined;
  }

  return value;
}

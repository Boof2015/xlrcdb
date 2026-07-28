import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { parseXLRC, validateXLRC } from "@boof2015/xlrc";
import { parse as parseToml } from "smol-toml";

export const ARTIST_ID_PATTERN = /^art_[A-Za-z0-9_-]{10}$/;
export const TRACK_ID_PATTERN = /^trk_[A-Za-z0-9_-]{10}$/;

const LENGTH_PATTERN = /^(\d+):([0-5]\d)$/;

export function normalizeKey(value) {
  return value.normalize("NFKC").toLowerCase().replace(/\s+/gu, " ").trim();
}

export function parseLengthSeconds(value) {
  const match = value.match(LENGTH_PATTERN);
  if (!match) {
    return undefined;
  }

  return Number.parseInt(match[1], 10) * 60 + Number.parseInt(match[2], 10);
}

export function inspectLanguageMetadata(file) {
  const meta = file?.meta && typeof file.meta === "object" ? file.meta : {};
  const primaryLanguage = typeof meta.lang === "string" ? meta.lang.trim() : "";
  const languages = Array.isArray(meta.langs)
    ? meta.langs
      .filter((language) => typeof language === "string")
      .map((language) => language.trim())
      .filter(Boolean)
    : [];
  const missingHeaders = [];

  if (!primaryLanguage) {
    missingHeaders.push("lang");
  }
  if (languages.length === 0) {
    missingHeaders.push("langs");
  }

  const requiredLanguages = new Map();
  if (primaryLanguage) {
    requiredLanguages.set(normalizeLanguageTag(primaryLanguage), primaryLanguage);
  }

  if (Array.isArray(file?.lines)) {
    for (const line of file.lines) {
      if (!Array.isArray(line?.translations)) {
        continue;
      }
      for (const translation of line.translations) {
        if (typeof translation?.lang !== "string" || translation.lang.trim() === "") {
          continue;
        }
        const language = translation.lang.trim();
        requiredLanguages.set(normalizeLanguageTag(language), language);
      }
    }
  }

  const declaredLanguages = new Set(languages.map(normalizeLanguageTag));
  const missingLanguages = languages.length === 0
    ? []
    : [...requiredLanguages]
      .filter(([normalized]) => !declaredLanguages.has(normalized))
      .map(([, language]) => language);

  return {
    primaryLanguage,
    languages,
    missingHeaders,
    missingLanguages
  };
}

export async function readArtistEntries(root) {
  const artistFiles = await findFiles(path.join(root, "artists"), ".toml");
  const entries = [];

  for (const absolutePath of artistFiles) {
    const filePath = toRepoPath(root, absolutePath);

    try {
      entries.push({
        absolutePath,
        filePath,
        document: parseToml(await readFile(absolutePath, "utf8")),
        parseError: undefined
      });
    } catch (error) {
      entries.push({
        absolutePath,
        filePath,
        document: undefined,
        parseError: error
      });
    }
  }

  return entries;
}

export async function readTrackEntries(root) {
  const trackFiles = await findFiles(path.join(root, "tracks"), ".xlrc");
  const entries = [];

  for (const absolutePath of trackFiles) {
    const filePath = toRepoPath(root, absolutePath);
    const id = path.basename(filePath, ".xlrc");

    try {
      const file = parseXLRC(await readFile(absolutePath, "utf8"));
      entries.push({
        absolutePath,
        filePath,
        id,
        file,
        parseError: undefined,
        parseWarnings: file.warnings,
        validationWarnings: validateXLRC(file).warnings
      });
    } catch (error) {
      entries.push({
        absolutePath,
        filePath,
        id,
        file: undefined,
        parseError: error,
        parseWarnings: [],
        validationWarnings: []
      });
    }
  }

  return entries;
}

export function buildAliasIndex(artists, errors = []) {
  const aliases = new Map();

  for (const artist of artists) {
    for (const alias of [artist.canonicalName, ...artist.aliases]) {
      const normalized = normalizeKey(alias);
      if (!normalized) {
        continue;
      }

      const existing = aliases.get(normalized);
      if (existing && existing.artist.id !== artist.id) {
        errors.push(
          validationError(
            "artist-alias-collision",
            artist.filePath,
            `Alias "${alias}" normalizes to "${normalized}", already used by ${existing.artist.id} in ${existing.artist.filePath}`
          )
        );
        continue;
      }

      aliases.set(normalized, { artist, alias });
    }
  }

  return aliases;
}

export function expectedShardedPath(rootName, id, extension) {
  const body = id.slice(4);
  return `${rootName}/${body.slice(0, 2)}/${body.slice(2, 4)}/${id}${extension}`;
}

export async function findFiles(root, extension) {
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") {
      return [];
    }

    throw error;
  }

  const files = [];
  for (const entry of entries) {
    const absolutePath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...await findFiles(absolutePath, extension));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(extension)) {
      files.push(absolutePath);
    }
  }

  return files.sort();
}

export function toRepoPath(root, absolutePath) {
  return path.relative(root, absolutePath).split(path.sep).join("/");
}

export function validationError(code, filePath, message) {
  return { code, filePath, message };
}

function normalizeLanguageTag(language) {
  return language.toLowerCase();
}

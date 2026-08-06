// Language tags are checked against the ICU/CLDR registry that ships with Node rather than a
// checked-in allowlist. The upstream XLRC parser deliberately refuses to hard-code language
// logic (see SPEC.md), so the only rule it applies is a shape regex - which accepts "xx",
// "zzz" and "klingon99" alongside real codes. That check has to live here instead, and a
// hand-maintained table would drift as the registry grows.
//
// This validates that a tag names a real language, not that xlrcdb wants that language:
// "id" (Indonesian) and "haw" (Hawaiian) are as valid as "en".

// language[-script][-region] only. Extension and private-use subtags ("en-u-ca-gregory",
// "x-private") are not language identifiers for a set of lyrics, and Intl.DisplayNames
// throws on some of them, so they are rejected by shape before any lookup.
const TAG_PATTERN = /^([A-Za-z]{2,3})(?:-([A-Za-z]{4}))?(?:-([A-Za-z]{2}|[0-9]{3}))?$/u;

// Real registry entries that resolve to a display name but do not name any single language,
// so none of them describe the lyrics in a file.
const NON_SPECIFIC_LANGUAGES = new Set(["und", "mis", "mul", "zxx"]);

// ICU resolves these to "Unknown Script" / "Unknown Region" rather than undefined, so they
// survive a plain truthiness check despite carrying no information.
const UNKNOWN_SCRIPT = "Zzzz";
const UNKNOWN_REGION = "ZZ";

const languageNames = createDisplayNames("language");
const scriptNames = createDisplayNames("script");
const regionNames = createDisplayNames("region");

// A Node built with small-icu answers "unknown" for tags that are perfectly valid. Rejecting
// every submission because the runtime is misconfigured is worse than not checking at all, so
// probe the registry once and degrade to accepting everything if it is not really there.
export const LANGUAGE_REGISTRY_AVAILABLE = (
  ["en", "ja", "id"].every((probe) => resolves(languageNames, probe)) &&
  resolves(scriptNames, "Latn") &&
  resolves(regionNames, "US")
);

export function isValidLanguageTag(tag) {
  if (!LANGUAGE_REGISTRY_AVAILABLE) {
    return true;
  }

  if (typeof tag !== "string") {
    return false;
  }

  const match = tag.trim().match(TAG_PATTERN);
  if (!match) {
    return false;
  }

  const [, language, script, region] = match;

  const languageSubtag = language.toLowerCase();
  if (NON_SPECIFIC_LANGUAGES.has(languageSubtag) || !resolves(languageNames, languageSubtag)) {
    return false;
  }

  if (script) {
    const scriptSubtag = script[0].toUpperCase() + script.slice(1).toLowerCase();
    if (scriptSubtag === UNKNOWN_SCRIPT || !resolves(scriptNames, scriptSubtag)) {
      return false;
    }
  }

  if (region) {
    const regionSubtag = region.toUpperCase();
    if (regionSubtag === UNKNOWN_REGION || !resolves(regionNames, regionSubtag)) {
      return false;
    }
  }

  return true;
}

function createDisplayNames(type) {
  try {
    // fallback: "none" makes an unknown subtag return undefined instead of echoing the input
    // back, which is what turns this into a validity check.
    return new Intl.DisplayNames(["en"], { type, fallback: "none" });
  } catch {
    return undefined;
  }
}

function resolves(displayNames, subtag) {
  if (!displayNames) {
    return false;
  }

  try {
    return Boolean(displayNames.of(subtag));
  } catch {
    return false;
  }
}

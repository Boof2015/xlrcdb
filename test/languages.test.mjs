import test from "node:test";
import assert from "node:assert/strict";
import { LANGUAGE_REGISTRY_AVAILABLE, isValidLanguageTag } from "../src/languages.js";

test("the ICU language registry is available under test", () => {
  // Everything below asserts real accept/reject behaviour, which only means anything when the
  // registry is present. On a small-icu Node isValidLanguageTag degrades to accepting
  // everything and the rejection cases would pass vacuously - so fail loudly here instead.
  assert.equal(LANGUAGE_REGISTRY_AVAILABLE, true);
});

test("real language tags are accepted", () => {
  for (const tag of [
    "id", // Indonesian - the tag that prompted this check
    "en",
    "ja",
    "ko",
    "ja-Latn",
    "zh-Hans",
    "zh-Hant-TW",
    "es-419",
    "haw",
    "su",
    "ban"
  ]) {
    assert.equal(isValidLanguageTag(tag), true, `expected ${tag} to be valid`);
  }
});

test("language tags are case-insensitive", () => {
  for (const tag of ["EN", "JA", "ja-latn", "JA-LATN", "zh-hans"]) {
    assert.equal(isValidLanguageTag(tag), true, `expected ${tag} to be valid`);
  }
});

test("well-formed but unassigned tags are rejected", () => {
  // These all pass the upstream parser's shape regex, which is exactly the gap this closes.
  for (const tag of ["xx", "qq", "zzz", "en-Qqqq", "en-Zzzz", "en-ZZ"]) {
    assert.equal(isValidLanguageTag(tag), false, `expected ${tag} to be invalid`);
  }
});

test("malformed tags are rejected", () => {
  for (const tag of ["notalanguage", "klingon99", "en_US", "en-", "", "  ", "e", "abcde"]) {
    assert.equal(isValidLanguageTag(tag), false, `expected ${JSON.stringify(tag)} to be invalid`);
  }
});

test("tags that name no single language are rejected", () => {
  for (const tag of ["und", "mul", "zxx", "mis"]) {
    assert.equal(isValidLanguageTag(tag), false, `expected ${tag} to be invalid`);
  }
});

test("extension and private-use subtags are rejected", () => {
  for (const tag of ["en-u-ca-gregory", "x-private", "en-x-custom", "ja-t-en"]) {
    assert.equal(isValidLanguageTag(tag), false, `expected ${tag} to be invalid`);
  }
});

test("non-string input is rejected", () => {
  for (const value of [undefined, null, 42, {}, []]) {
    assert.equal(isValidLanguageTag(value), false);
  }
});

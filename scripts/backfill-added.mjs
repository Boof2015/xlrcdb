#!/usr/bin/env node

// Fill tracks/added.json for tracks that predate it, using the date git first saw each track
// file. Safe to re-run: tracks that already have a date are left alone. Reads git's view of the
// tree rather than the working copy, so it also works on case-insensitive checkouts.

import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { ADDED_LEDGER_PATH, TRACK_ID_PATTERN, readAddedLedger, serializeAddedLedger } from "../src/repository.js";

const root = path.resolve(process.argv[2] ?? process.cwd());
const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" });

const { ledger, errors } = await readAddedLedger(root);
if (errors.length > 0) {
  for (const error of errors) console.error(`${error.filePath}: ${error.code}: ${error.message}`);
  process.exit(1);
}

const files = git("ls-tree", "-r", "--name-only", "HEAD", "--", "tracks/")
  .split("\n")
  .filter((file) => file.endsWith(".xlrc"));

let filled = 0;
for (const file of files) {
  const id = path.posix.basename(file, ".xlrc");
  if (!TRACK_ID_PATTERN.test(id) || ledger.has(id)) continue;
  const dates = git("log", "--diff-filter=A", "--format=%cI", "--", file).trim().split("\n").filter(Boolean);
  const first = dates[dates.length - 1];
  if (!first) continue;
  ledger.set(id, new Date(first).toISOString());
  filled += 1;
}

await writeFile(path.join(root, ADDED_LEDGER_PATH), serializeAddedLedger(ledger));
console.log(`${ADDED_LEDGER_PATH}: filled ${filled} tracks, ${ledger.size} total`);

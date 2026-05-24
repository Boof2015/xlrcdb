#!/usr/bin/env node

import { appendFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { classifyChangedFiles, parseNameStatus } from "../src/prScope.js";

const execFileAsync = promisify(execFile);
const args = process.argv.slice(2);
const githubOutputIndex = args.indexOf("--github-output");
const githubOutput = githubOutputIndex >= 0 ? args[githubOutputIndex + 1] : undefined;
const positional = githubOutputIndex >= 0 ? args.slice(0, githubOutputIndex) : args;
const [base, head = "HEAD"] = positional;

if (!base) {
  const result = {
    kind: "no-base",
    changes: [],
    files: [],
    errors: [],
    incomingFiles: [],
    canonicalFiles: [],
    shouldValidateRaw: false,
    shouldNormalizeDryRun: false
  };
  await writeGithubOutputs(result, githubOutput);
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

const { stdout } = await execFileAsync("git", [
  "diff",
  "--name-status",
  "--find-renames",
  `${base}...${head}`
], { encoding: "utf8" });

const result = classifyChangedFiles(parseNameStatus(stdout));
await writeGithubOutputs(result, githubOutput);
console.log(JSON.stringify(result, null, 2));

if (result.errors.length > 0) {
  process.exit(1);
}

async function writeGithubOutputs(result, filePath) {
  if (!filePath) {
    return;
  }

  await appendFile(filePath, [
    `kind=${result.kind}`,
    `should_validate_raw=${String(result.shouldValidateRaw)}`,
    `should_normalize_dry_run=${String(result.shouldNormalizeDryRun)}`,
    `incoming_count=${result.incomingFiles.length}`,
    `canonical_count=${result.canonicalFiles.length}`,
    ""
  ].join("\n"));
}

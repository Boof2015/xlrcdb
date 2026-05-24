#!/usr/bin/env node

import { appendFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { classifyChangedFiles, parseNameStatus } from "../src/prScope.js";

const execFileAsync = promisify(execFile);
const args = process.argv.slice(2);
let githubOutput;
let jsonOutput;
const positional = [];

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];

  if (arg === "--github-output") {
    githubOutput = args[index + 1];
    index += 1;
    continue;
  }

  if (arg === "--json-output") {
    jsonOutput = args[index + 1];
    index += 1;
    continue;
  }

  positional.push(arg);
}

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
  await writeJsonOutput(result, jsonOutput);
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
await writeJsonOutput(result, jsonOutput);
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

async function writeJsonOutput(result, filePath) {
  if (!filePath) {
    return;
  }

  const { mkdir, writeFile } = await import("node:fs/promises");
  const { dirname } = await import("node:path");
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(result, null, 2)}\n`);
}

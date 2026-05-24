#!/usr/bin/env node

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { classifyChangedFiles, parseNameStatus } from "../src/prScope.js";

const execFileAsync = promisify(execFile);
const [base, head = "HEAD"] = process.argv.slice(2);

if (!base) {
  console.log("PR scope check skipped; no base ref was provided");
  process.exit(0);
}

const { stdout } = await execFileAsync("git", [
  "diff",
  "--name-status",
  "--find-renames",
  `${base}...${head}`
], { encoding: "utf8" });

const result = classifyChangedFiles(parseNameStatus(stdout));
if (result.errors.length === 0) {
  console.log(`PR scope check passed (${result.kind})`);
  process.exit(0);
}

for (const error of result.errors) {
  const location = error.filePath ? `${error.filePath}: ` : "";
  console.error(`${location}${error.code}: ${error.message}`);
}

process.exit(1);

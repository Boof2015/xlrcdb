#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const outputPath = process.argv[2] ?? ".pr-gates/report.md";
const logsDir = process.argv[3] ?? ".pr-gates";
const classification = await readJson(path.join(logsDir, "classification.json"));
const logs = {
  classify: await readText(path.join(logsDir, "classify.log")),
  validate: await readText(path.join(logsDir, "validate-raw.log")),
  normalize: await readText(path.join(logsDir, "normalize-dry-run.log")),
  check: await readText(path.join(logsDir, "check.log"))
};

const report = buildReport(classification, logs);
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, report);

if (process.env.GITHUB_STEP_SUMMARY) {
  await writeFile(process.env.GITHUB_STEP_SUMMARY, report);
}

function buildReport(result, gateLogs) {
  const lines = [
    "<!-- xlrcdb-pr-gate-report -->",
    "## XLRCDB PR Gate Report",
    "",
    `Classification: \`${result?.kind ?? "unknown"}\``,
    ""
  ];

  if (result?.files?.length > 0) {
    lines.push("Changed files:", "");
    for (const filePath of result.files) {
      lines.push(`- \`${filePath}\``);
    }
    lines.push("");
  }

  if (result?.errors?.length > 0) {
    lines.push("Blocking errors:", "");
    for (const error of result.errors) {
      const location = error.filePath ? `\`${error.filePath}\`: ` : "";
      lines.push(`- ${location}\`${error.code}\`: ${error.message}`);
    }
    lines.push("");
  }

  lines.push("What this means:", "", guidanceFor(result?.kind), "");

  addLogSection(lines, "Classify PR", gateLogs.classify);
  addLogSection(lines, "Validate Raw Incoming", gateLogs.validate);
  addLogSection(lines, "Normalize Dry-Run", gateLogs.normalize);
  addLogSection(lines, "Full Repository Check", gateLogs.check);

  return `${lines.join("\n").trimEnd()}\n`;
}

function guidanceFor(kind) {
  if (kind === "data-submission") {
    return "This is a lyric submission. Fix any raw validation or dry-run errors in `incoming/*.xlrc`, then push another commit.";
  }

  if (kind === "normalized-data") {
    return "This PR contains normalized data files. It should pass the full repository check before merge.";
  }

  if (kind === "manual-review") {
    return "This PR is not a lyric data submission. It requires maintainer review and is intentionally blocked from the automatic submission lane.";
  }

  if (kind === "invalid-mixed") {
    return "This PR mixes lyric data with non-data changes. Split the changes into separate PRs.";
  }

  if (kind === "invalid-data") {
    return "This PR touches data paths but does not match the allowed submission shape. Fix the listed file-path errors.";
  }

  if (kind === "no-changes") {
    return "No changed files were detected for this comparison.";
  }

  if (kind === "no-base") {
    return "The workflow did not receive a base ref, so PR classification was skipped.";
  }

  return "The workflow stopped before it could classify this PR. Check the workflow logs.";
}

function addLogSection(lines, title, text) {
  if (!text) {
    return;
  }

  const excerpt = excerptImportantLines(text);
  lines.push(`<details><summary>${title}</summary>`, "", "```text", excerpt, "```", "", "</details>", "");
}

function excerptImportantLines(text) {
  const cleaned = text.trim();
  if (!cleaned) {
    return "(no output)";
  }

  const important = cleaned
    .split(/\r?\n/u)
    .filter((line) => (
      /:\s*(incoming-|track-|artist-|pr-|manual-|invalid-|xlrcdb|Error:)/u.test(line) ||
      line.includes("validation passed") ||
      line.includes("normalize dry-run passed") ||
      line.includes('"kind"') ||
      line.includes('"code"') ||
      line.includes('"message"')
    ));

  const selected = important.length > 0 ? important : cleaned.split(/\r?\n/u).slice(-40);
  return selected.slice(-80).join("\n");
}

async function readJson(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return undefined;
  }
}

async function readText(filePath) {
  try {
    return await readFile(filePath, "utf8");
  } catch {
    return "";
  }
}

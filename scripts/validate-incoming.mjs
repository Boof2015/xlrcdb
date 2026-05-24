#!/usr/bin/env node

import { inspectIncoming } from "../src/normalizer.js";

const root = process.argv[2] ?? process.cwd();
const result = await inspectIncoming(root);

if (result.errors.length === 0) {
  console.log(`incoming validation passed (${result.incomingEntries.length} files)`);
  process.exit(0);
}

for (const error of result.errors) {
  const location = error.filePath ? `${error.filePath}: ` : "";
  console.error(`${location}${error.code}: ${error.message}`);
}

process.exit(1);

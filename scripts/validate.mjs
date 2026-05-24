#!/usr/bin/env node

import { validateRepository } from "../src/validator.js";

const root = process.argv[2] ?? process.cwd();
const errors = await validateRepository(root);

if (errors.length === 0) {
  console.log("xlrcdb validation passed");
  process.exit(0);
}

for (const error of errors) {
  const location = error.filePath ? `${error.filePath}: ` : "";
  console.error(`${location}${error.code}: ${error.message}`);
}

process.exit(1);

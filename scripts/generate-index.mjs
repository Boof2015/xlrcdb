#!/usr/bin/env node

import { generateIndex, IndexGenerationError } from "../src/indexGenerator.js";

const root = process.argv[2] ?? process.cwd();

try {
  const files = await generateIndex(root);
  console.log(`generated ${files.size} index files`);
} catch (error) {
  if (error instanceof IndexGenerationError) {
    for (const validationError of error.errors) {
      const location = validationError.filePath ? `${validationError.filePath}: ` : "";
      console.error(`${location}${validationError.code}: ${validationError.message}`);
    }
    process.exit(1);
  }

  throw error;
}

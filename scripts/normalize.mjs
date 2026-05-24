#!/usr/bin/env node

import { normalizeIncoming, NormalizationError } from "../src/normalizer.js";

const root = process.argv[2] ?? process.cwd();

try {
  const result = await normalizeIncoming(root);
  console.log(
    [
      `processed ${result.incomingProcessed} incoming files`,
      `created ${result.artistsCreated} artists`,
      `created ${result.tracksCreated} tracks`,
      `generated ${result.generatedFiles} index files`
    ].join("; ")
  );
} catch (error) {
  if (error instanceof NormalizationError) {
    for (const validationError of error.errors) {
      const location = validationError.filePath ? `${validationError.filePath}: ` : "";
      console.error(`${location}${validationError.code}: ${validationError.message}`);
    }
    process.exit(1);
  }

  throw error;
}

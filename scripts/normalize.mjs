#!/usr/bin/env node

import { writeFile } from "node:fs/promises";
import { normalizeIncoming, NormalizationError } from "../src/normalizer.js";

const root = process.argv[2] ?? process.cwd();

try {
  const result = await normalizeIncoming(root);
  // Reconcile reads this to tell contributors their tracks are live. It must live outside the
  // repo (the workflow commits with `git add -A`), so the path comes from the environment.
  if (process.env.XLRCDB_CREATED_OUT) {
    await writeFile(process.env.XLRCDB_CREATED_OUT, `${JSON.stringify(result.tracks ?? [], null, 2)}\n`);
  }
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

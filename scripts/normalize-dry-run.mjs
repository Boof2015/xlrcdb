#!/usr/bin/env node

import { cp, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { normalizeIncoming, NormalizationError } from "../src/normalizer.js";

const root = path.resolve(process.argv[2] ?? process.cwd());
const tempRoot = await mkdtemp(path.join(tmpdir(), "xlrcdb-normalize-dry-run-"));

try {
  await cp(root, tempRoot, {
    recursive: true,
    filter: (source) => {
      const name = path.basename(source);
      return name !== ".git" && name !== "node_modules";
    }
  });

  const result = await normalizeIncoming(tempRoot);
  console.log(
    [
      "normalize dry-run passed",
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
    process.exitCode = 1;
  } else {
    throw error;
  }
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}

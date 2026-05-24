const DATA_ROOTS = ["incoming/", "artists/", "tracks/", "index/"];

const MANUAL_REVIEW_MESSAGE = "Pull requests must be data submissions; backend, workflow, package, and documentation changes require maintainer review";
const PR_SCOPE_MESSAGE = "Pull requests that change xlrcdb data may only change incoming/, artists/, tracks/, and index/";
const INCOMING_PATH_MESSAGE = "Incoming contribution files must be .xlrc files";

export function parseNameStatus(input) {
  return input
    .split(/\r?\n/u)
    .filter(Boolean)
    .map((line) => {
      const [status = "", ...paths] = line.split("\t");
      return { status, paths };
    });
}

export function checkChangedFiles(changes) {
  return classifyChangedFiles(changes).errors;
}

export function classifyChangedFiles(changes) {
  const normalizedChanges = changes.map((change) => ({
    status: change.status,
    paths: change.paths ?? [change.path].filter(Boolean)
  }));
  const files = [...new Set(normalizedChanges.flatMap((change) => change.paths))].sort();
  if (normalizedChanges.length === 0) {
    return classification("no-changes", normalizedChanges, files, []);
  }

  const dataFiles = files.filter(isDataPath);
  const nonDataFiles = files.filter((filePath) => !isDataPath(filePath));
  const incomingFiles = files.filter((filePath) => filePath.startsWith("incoming/"));
  const canonicalFiles = files.filter((filePath) => (
    filePath.startsWith("artists/") ||
    filePath.startsWith("tracks/") ||
    filePath.startsWith("index/")
  ));

  if (dataFiles.length === 0) {
    return classification("manual-review", normalizedChanges, files, [{
      code: "manual-review-required",
      filePath: files[0] ?? "",
      message: MANUAL_REVIEW_MESSAGE
    }]);
  }

  const errors = [];
  for (const filePath of nonDataFiles) {
    errors.push({
      code: "pr-scope",
      filePath,
      message: PR_SCOPE_MESSAGE
    });
  }

  for (const filePath of incomingFiles) {
    if (!filePath.endsWith(".xlrc")) {
      errors.push({
        code: "incoming-path",
        filePath,
        message: INCOMING_PATH_MESSAGE
      });
    }
  }

  if (nonDataFiles.length > 0) {
    return classification("invalid-mixed", normalizedChanges, files, errors);
  }

  if (errors.length > 0) {
    return classification("invalid-data", normalizedChanges, files, errors);
  }

  const hasWritableIncoming = normalizedChanges.some((change) => (
    !change.status.startsWith("D") &&
    change.paths.some((filePath) => filePath.startsWith("incoming/") && filePath.endsWith(".xlrc"))
  ));
  const kind = hasWritableIncoming ? "data-submission" : "normalized-data";

  return {
    ...classification(kind, normalizedChanges, files, []),
    incomingFiles,
    canonicalFiles,
    shouldValidateRaw: kind === "data-submission",
    shouldNormalizeDryRun: kind === "data-submission"
  };
}

function isDataPath(filePath) {
  return DATA_ROOTS.some((root) => filePath.startsWith(root));
}

function classification(kind, changes, files, errors) {
  return {
    kind,
    changes,
    files,
    errors,
    incomingFiles: files.filter((filePath) => filePath.startsWith("incoming/")),
    canonicalFiles: files.filter((filePath) => (
      filePath.startsWith("artists/") ||
      filePath.startsWith("tracks/") ||
      filePath.startsWith("index/")
    )),
    shouldValidateRaw: false,
    shouldNormalizeDryRun: false
  };
}

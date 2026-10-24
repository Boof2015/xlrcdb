// What xlrcdb-bot says on pull requests: why a submission was rejected (in plain words),
// that it passed after a fix, the stale-PR warnings, and that a merged track is live.
//
// Everything that comes from a PR's own Check run (file paths, log lines) is untrusted: a PR
// can change the scripts that produce it. It is only ever quoted, with @mentions neutralized
// and its length capped, so a crafted PR can't make the bot ping people or spoof its markers.

export const SITE_URL = "https://astramusic.dev/xlrcdb/";
export const EDITOR_URL = `${SITE_URL}#/submit`;
export const FAILURE_MARKER = "<!-- xlrcdb-pr-gate-report -->";
export const NEEDS_FIX_LABEL = "needs-fix";
export const STALE_WARN_DAYS = 7;
export const STALE_CLOSE_DAYS = 14;

const LOG_LINE = /^(.+?): ([a-z]+(?:-[a-z]+)+): (.+)$/u;
const MAX_REPORT = 6000;
const MAX_ERRORS = 15;

// Errors from the gate's logs ("path: code: message") plus the classifier's own errors,
// deduplicated.
export function parseGateErrors({ classification, logs = [] } = {}) {
  const errors = [];
  const seen = new Set();
  const add = (error) => {
    const key = `${error.filePath}|${error.code}|${error.message}`;
    if (seen.has(key)) return;
    seen.add(key);
    errors.push(error);
  };
  for (const error of classification?.errors ?? []) {
    if (error?.code && error?.message) add({ filePath: error.filePath ?? "", code: error.code, message: error.message });
  }
  for (const text of logs) {
    for (const line of String(text ?? "").split(/\r?\n/u)) {
      const match = line.trim().match(LOG_LINE);
      if (match && !match[1].includes(" ")) add({ filePath: match[1], code: match[2], message: match[3] });
    }
  }
  return errors;
}

// One sentence a contributor can act on.
export function explainError(error) {
  const code = error.code.replace(/^(incoming|track)-/u, "");
  const message = error.message;
  switch (code) {
    case "language-invalid": {
      const unknown = message.split("unknown:")[1]?.trim();
      return `${unknown ? `${listCodes(unknown)} ${unknown.includes(",") ? "aren't language codes" : "isn't a language code"}` : "A language code isn't a real language"}. Use a code like \`en\`, \`ja\` or \`ja-Latn\` (German is \`de\`, Korean is \`ko\`).`;
    }
    case "language-coverage": {
      const missing = message.split("missing:")[1]?.trim();
      return `\`[langs:]\` has to list the main language and every translation language${missing ? `; it's missing ${listCodes(missing)}` : ""}.`;
    }
    case "required-header": {
      const header = message.match(/\[[a-z]+:\]/u)?.[0];
      return header ? `The file is missing the \`${header}\` header (or it's empty).` : "A required header is missing or empty.";
    }
    case "length-format":
      return "`[length:]` has to be minutes and seconds, like `03:42`.";
    case "duplicate-track":
    case "duplicate":
      return "This song is already in xlrcdb (same artist, title and length). If yours fixes or improves it, edit the existing track instead.";
    case "parse-warning":
    case "validation-warning":
      return `${untrusted(message)}. Lyric lines look like \`[00:12.34]words\`.`;
    case "parse":
      return "The file couldn't be read as XLRC.";
    case "artist":
      return "`[ar:]` doesn't match an existing artist or alias. An edit has to keep an artist that's already in xlrcdb.";
    case "path":
      return "Only `.xlrc` files can go in `incoming/`.";
    default:
      break;
  }
  if (error.code === "pr-scope") return "Submissions can only change lyric data (`incoming/`, `artists/`, `tracks/`). Put other changes in a separate pull request.";
  if (error.code === "manual-review-required") return "This doesn't change any lyric data, so a maintainer reviews it by hand.";
  return untrusted(message);
}

export function buildFailureComment({ author, kind, errors = [], report = "", staleClose = true }) {
  const who = `@${safeLogin(author)}`;
  if (kind === "manual-review") {
    return [
      FAILURE_MARKER,
      `Thanks ${who}! This pull request doesn't change lyric data, so it isn't part of the automatic submission lane. A maintainer will review it.`,
      technicalReport(report)
    ].filter(Boolean).join("\n\n");
  }

  const shown = errors.slice(0, MAX_ERRORS).map((error) => {
    const where = error.filePath ? `**${code(error.filePath)}**: ` : "";
    return `- ${where}${explainError(error)}`;
  });
  if (errors.length > MAX_ERRORS) shown.push(`- …and ${errors.length - MAX_ERRORS} more (see the technical report).`);

  const lines = [
    FAILURE_MARKER,
    shown.length
      ? `Hi ${who}, thanks for the submission! It can't be merged yet because the checks found ${errors.length === 1 ? "a problem" : "some problems"}:`
      : `Hi ${who}, thanks for the submission! It can't be merged yet: the checks failed, but not in a way I can summarize. The technical report below has the details.`,
    ...(shown.length ? [shown.join("\n")] : []),
    `**How to fix it:** push a corrected file to this pull request and the checks run again. Or open your file in the [xlrcdb editor](${EDITOR_URL}), which points these problems out as you type and can open a fresh pull request for you.`
  ];
  if (staleClose) {
    lines.push(`If there's no update, this pull request will be closed after ${STALE_CLOSE_DAYS} days.`);
  }
  lines.push(technicalReport(report));
  return lines.filter(Boolean).join("\n\n");
}

export function buildPassedComment({ author }) {
  return [
    FAILURE_MARKER,
    `Thanks @${safeLogin(author)}, the checks pass now. This will be merged automatically shortly.`
  ].join("\n\n");
}

export function buildStaleWarning() {
  return `The checks on this pull request failed and it hasn't been updated in ${STALE_WARN_DAYS} days. It will be closed in ${STALE_CLOSE_DAYS - STALE_WARN_DAYS} days unless it's updated: push a fix (or reply) to keep it open.`;
}

export function buildStaleClose() {
  return `Closing this because the checks failed and there's been no update for ${STALE_CLOSE_DAYS} days. You're welcome to push a fix and reopen it, or start fresh in the [xlrcdb editor](${EDITOR_URL}).`;
}

export function liveMarker(trackId) {
  return `<!-- xlrcdb-live:${trackId} -->`;
}

export function trackUrl(artistId, trackId) {
  return `${SITE_URL}#/track/${encodeURIComponent(artistId)}/${encodeURIComponent(trackId)}`;
}

export function buildLiveComment({ author, trackId, artistId, title, artist }) {
  return [
    liveMarker(trackId),
    `Thanks @${safeLogin(author)}! **${untrusted(title)}** by **${untrusted(artist)}** is now in xlrcdb: ${trackUrl(artistId, trackId)}`,
    "It can take a minute or two for the page to update."
  ].join("\n\n");
}

// Quoted, never trusted: break @mentions and HTML comments (marker spoofing), drop backticks
// that would break our code spans, and cap the length.
export function untrusted(text, max = 500) {
  const clean = String(text ?? "")
    .replace(/@/gu, "@​")
    .replace(/<!--/gu, "&lt;!--")
    .replace(/`/gu, "'");
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

function code(text) {
  return `\`${untrusted(text, 200)}\``;
}

function listCodes(list) {
  return list.split(",").map((item) => code(item.trim())).join(", ");
}

// GitHub logins are [A-Za-z0-9-]; anything else means the value didn't come from GitHub.
function safeLogin(login) {
  return /^[A-Za-z0-9-]{1,39}$/u.test(String(login ?? "")) ? login : "there";
}

function technicalReport(report) {
  const body = String(report ?? "").replace(FAILURE_MARKER, "").trim();
  if (!body) return "";
  const capped = body.length > MAX_REPORT ? `${body.slice(0, MAX_REPORT)}\n…(truncated)` : body;
  return `<details><summary>Technical report</summary>\n\n${capped.replace(/@/gu, "@​").replace(/<!--/gu, "&lt;!--")}\n\n</details>`;
}

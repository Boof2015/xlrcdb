# Contributing to xlrcdb

## Use the Editor

**[astramusic.dev/xlrcdb/#/submit](https://astramusic.dev/xlrcdb/#/submit)**

The editor is the recommended way to contribute and it is far easier than doing this by hand.
It builds a valid `.xlrc` for you, fills in the headers xlrcdb requires, validates the file
before it goes anywhere, and — once you sign in with GitHub — opens the pull request for you.

It also handles artist metadata: the **Edit aliases** page opens a pull request against an
artist's record so you can set a latin name, a pronunciation, or extra aliases.

You do not need to clone this repository, install Node, or learn the format. The rest of this
document is for people who would rather work in git directly, and for reference on what the
format requires.

## Rights and Responsibilities

**Only submit lyrics you have the rights to.** By opening a pull request you are representing
that you own the content, have permission from the rights holder, or that it is otherwise
lawful for you to publish it.

**xlrcdb does not verify this and cannot verify this.** CI checks the format only. Your pull
request is merged by a bot as soon as it parses — no person reads the lyrics, and a merge is
not a review, an approval, or a statement about who owns anything.

**Upheld takedowns produce strikes.** If a rights holder successfully has content removed and
it traces back to your submission, that is a strike against your account: a warning, then loss
of automatic merging, then a permanent block on the third.

Full policy, and how to report content, in [LEGAL.md](LEGAL.md).

## Submitting by Hand

### Checklist

- Use a valid `.xlrc` file.
- Include non-empty `[ti:]`, `[ar:]`, `[length:]`, `[lang:]`, and `[langs:]` headers.
- Format length as `mm:ss`, with seconds below 60.
- List the primary lyric language in both `[lang:]` and `[langs:]`, and include every
  inline translation language in `[langs:]`.
- Put the file under `incoming/`.
- Keep one track per `.xlrc` file.
- Do not edit `artists/`, `tracks/`, or `index/` by hand for a normal lyric submission.

### Required Headers

Every submitted track must include these headers before the lyric lines:

```text
[ti:Track Title]
[ar:Artist Name]
[length:03:42]
[lang:en]
[langs:en]
```

The `[length:]` header is required by xlrcdb so lookup clients can match a track by artist,
title, and duration. The upstream XLRC format treats this field as optional, but this database
requires it.

The `[lang:]` header identifies the primary language of the lyrics. The `[langs:]` header is
a comma-separated list of every language present in the file, including the primary language
and inline `[>language]` translations. A Japanese track with English translations would use:

```text
[lang:ja]
[langs:ja,en]
```

Additional languages are allowed for multilingual base lyrics. Language comparisons are
case-insensitive, and the primary language does not have to appear first.

### File Location

Place new submissions in `incoming/` using a readable lowercase filename:

```text
incoming/artist-name-track-title.xlrc
```

The filename is only temporary. Normalization generates a stable ID and moves the file into a
sharded path under `tracks/`.

### Local Validation

Install dependencies once:

```sh
npm install
```

Run the repository check:

```sh
npm run check
```

`npm run check` verifies committed source data, pending incoming files, and generated indexes.
To validate incoming files without moving or rewriting anything, run:

```sh
npm run validate:incoming
```

The `Reconcile` workflow runs the normalizer on `main` automatically, so you do not need to.
To preview what it will do without rewriting anything, run the dry-run:

```sh
npm run normalize:dry-run
```

If it reports an XLRC parser or validation warning, fix the `incoming/*.xlrc` file and run it
again.

## Furigana Notes

Furigana must attach directly to the kanji being annotated. If a word includes okurigana, put
the reading on the kanji span only:

```text
無[な]い
間違[まちが]い
```

Do not attach the reading to the kanji plus trailing kana:

```text
無い[ない]
間違い[まちがい]
```

## Pull Request Flow

1. Fork or branch from `main`.
2. Add your `.xlrc` file under `incoming/` (for an alias or lyric edit, change the relevant
   `artists/` or `tracks/` file in place instead).
3. Open a pull request.
4. `Check` classifies the PR and validates the raw submission. It never regenerates `index/`,
   so two submissions can't conflict on it.
5. When `Check` passes, the **XLRCDB Bot** GitHub App squash-merges the PR (fork PRs
   included). This is automated on format validity alone; it is not a review of the content.
6. On `main`, `Reconcile` normalizes any `incoming/*.xlrc` (assigns stable IDs, moves them
   under `tracks/`, auto-creates artists) and regenerates `index/`, then commits. It runs on
   each merge plus a periodic backstop, so a track is searchable shortly after merge and
   `incoming/` is briefly non-empty in between.

Submission PRs should only change xlrcdb data files. CI fails PRs that do not touch data paths
at all, and also fails data PRs that mix in tooling, workflow, package metadata, or
documentation changes. Those non-submission changes require explicit maintainer review.

A brand-new artist is created automatically from the `[ar:]` header. To set a latin name,
pronunciation, or extra aliases, edit the artist's `.toml` after it exists — or use the
editor's **Edit aliases** page, which opens that pull request for you.

Auto-merge applies a content-neutral per-author daily limit (a spam throttle, not a review of
the lyrics). Over the limit, a valid PR simply waits for a maintainer or for the 24-hour window
to roll. Maintainers are exempt, and the cap is tunable via the `DAILY_MERGE_CAP` repository
variable.

Repository internals — layout, CI details, bot setup — are in
[docs/MAINTAINERS.md](docs/MAINTAINERS.md).

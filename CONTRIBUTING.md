# Contributing to xlrcdb

xlrcdb accepts lyric submissions as plain `.xlrc` files. Contributors add files
under `incoming/`; once the PR's `Check` passes it is merged automatically, and a
`Reconcile` job on `main` moves them into canonical `artists/`, `tracks/`, and
`index/` paths.

## Submission Checklist

- Use a valid `.xlrc` file.
- Include non-empty `[ti:]`, `[ar:]`, and `[length:]` headers.
- Format length as `mm:ss`, with seconds below 60.
- Put the file under `incoming/`.
- Keep one track per `.xlrc` file.
- Do not edit `artists/`, `tracks/`, or `index/` by hand for a normal lyric
  submission.

## Required Headers

Every submitted track must include these headers before the lyric lines:

```text
[ti:Track Title]
[ar:Artist Name]
[length:03:42]
```

The `[length:]` header is required by xlrcdb so lookup clients can match a track
by artist, title, and duration. The upstream XLRC format treats this field as
optional, but this database requires it.

## File Location

Place new submissions in `incoming/` using a readable lowercase filename:

```text
incoming/artist-name-track-title.xlrc
```

The filename is only temporary. When a maintainer runs normalization, xlrcdb will
generate stable IDs and move the file into a sharded path under `tracks/`.

## Local Validation

Install dependencies once:

```sh
npm install
```

Run the repository check:

```sh
npm run check
```

`npm run check` verifies committed source data, pending incoming files, and
generated indexes. To validate incoming files without moving or rewriting
anything, run:

```sh
npm run validate:incoming
```

The `Reconcile` workflow runs the normalizer on `main` automatically, so you do
not need to. To preview what it will do without rewriting anything, run the
dry-run:

```sh
npm run normalize:dry-run
```

If it reports an XLRC parser or validation warning, fix the `incoming/*.xlrc`
file and run it again.

## Furigana Notes

Furigana must attach directly to the kanji being annotated. If a word includes
okurigana, put the reading on the kanji span only:

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
2. Add your `.xlrc` file under `incoming/` (for an alias or lyric edit, change
   the relevant `artists/` or `tracks/` file in place instead).
3. Open a pull request.
4. `Check` classifies the PR and validates the raw submission. It never
   regenerates `index/`, so two submissions can't conflict on it.
5. When `Check` passes, `Auto-merge` merges the PR (fork PRs included).
6. On `main`, `Reconcile` normalizes any `incoming/*.xlrc` (assigns stable IDs,
   moves them under `tracks/`, auto-creates artists) and regenerates `index/`,
   then commits. It runs on each merge plus a periodic backstop, so a track is
   searchable shortly after merge and `incoming/` is briefly non-empty in between.

The browser submit page can prepare and export a valid `.xlrc`, and once GitHub
sign-in is configured it can open the pull request for you.

Submission PRs should only change xlrcdb data files. CI fails PRs that do not
touch data paths at all, and also fails data PRs that mix in tooling, workflow,
package metadata, or documentation changes. Those non-submission changes require
explicit maintainer review.

A brand-new artist is created automatically from the `[ar:]` header. To set a
latin name, pronunciation, or extra aliases, edit the artist's `.toml` after it
exists (the submit site's "Edit aliases" page opens that PR for you).

Auto-merge applies a content-neutral per-author daily limit (a spam throttle, not
a review of the lyrics). Over the limit, a valid PR simply waits for a maintainer
or for the 24-hour window to roll. Maintainers are exempt, and the cap is tunable
via the `DAILY_MERGE_CAP` repository variable.

Reconcile commits directly to `main`. If `main` is a protected branch, allow the
`github-actions` bot to push to it (or run Reconcile with a token that can),
otherwise the index will not update.

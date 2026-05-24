# Contributing to xlrcdb

xlrcdb accepts lyric submissions as plain `.xlrc` files. For now, contributors
submit files under `incoming/`; maintainers run the normalizer to move them into
canonical `artists/`, `tracks/`, and `index/` paths.

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

Maintainers also run the incoming normalizer before merging new lyric
submissions:

```sh
npm run normalize
npm run check
```

If normalization reports an XLRC parser or validation warning, fix the
`incoming/*.xlrc` file and run it again.

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
2. Add your `.xlrc` file under `incoming/`.
3. Open a pull request.
4. Wait for the `Check` workflow.
5. A maintainer runs the `Normalize Incoming` workflow on the PR branch.
6. Review the generated artist, track, and index changes.
7. Merge after checks pass.

The browser submit page can prepare and export a valid `.xlrc`, but it does not
create GitHub pull requests automatically yet.

Submission PRs should only change xlrcdb data files. CI fails PRs that do not
touch data paths at all, and also fails data PRs that mix in tooling, workflow,
package metadata, or documentation changes. Those non-submission changes require
explicit maintainer review.

The automated check currently reports the decision only. It classifies the PR,
validates raw incoming files, runs normalization in a temporary dry-run copy, and
then runs the full repository check. Failed PR checks update one bot comment with
the gate report. They do not close, normalize, commit, or merge pull requests
automatically.

The manual `Normalize Incoming` workflow is the controlled automation step. It
only accepts raw `incoming/*.xlrc` submission branches, validates and dry-runs
them first, commits the normalized source and index files back to the same
branch, and stops there. Maintainers still review and merge manually.

# xlrcdb
Official community lyrics database for the XLRC format

xlrcdb stores XLRC lyric files and generated lookup indexes as plain files in
this repository. The repository is designed to be served as static files and
checked by CI.

## Repository Layout

- `artists/` contains canonical artist records as TOML.
- `tracks/` contains canonical XLRC files.
- `incoming/` is the temporary holding area for raw submitted `.xlrc` files.
- `index/` is generated from `artists/` and `tracks/`.
- `scripts/` contains the local maintenance CLIs.

## Local Checks

Install dependencies once:

```sh
npm install
```

Run the same check used by CI:

```sh
npm run check
```

This runs tests, validates source data, validates any pending `incoming/`
submissions, regenerates `index/`, and fails if the generated index differs from
what is committed.

## Static Data Source

xlrcdb is intended to be served directly from GitHub Pages. 

The default project-site URL is:

```text
https://boof2015.github.io/xlrcdb/
```

Clients using `@boof2015/xlrc` should pass that URL as the lookup source:

```ts
await lookup({
  artist: "Artist Name",
  title: "Track Title",
  length: 222,
  source: "https://boof2015.github.io/xlrcdb/"
});
```


## Adding Lyrics Locally

For contributor-facing instructions, see [CONTRIBUTING.md](CONTRIBUTING.md).

For the current v0 workflow, add raw contribution files under `incoming/`:

```text
incoming/my-track.xlrc
```

Each incoming XLRC file must include:

```text
[ar:Artist Name]
[ti:Track Title]
[length:mm:ss]
```

Then normalize the repository:

```sh
npm run normalize
```

Normalization promotes incoming files into canonical sharded paths under
`artists/` and `tracks/`, creates artist records when needed, removes processed
incoming files, and regenerates `index/`.

After normalizing, run:

```sh
npm run check
```

To validate incoming files without moving or rewriting anything, run:

```sh
npm run validate:incoming
```

## Maintainer Workflow

The `Check` GitHub Actions workflow runs automatically on pull requests and
pushes to `main`.

On pull requests, `Check` also verifies that PRs are data submissions. A normal
submission PR may only change xlrcdb data paths: `incoming/`, `artists/`,
`tracks/`, and `index/`. Backend, workflow, package, and documentation changes
intentionally fail this check so they require explicit maintainer review.

The PR check is deliberately gated:

1. Classify the PR as a data submission, normalized data, manual review, or
   invalid mixed change.
2. Validate raw `incoming/*.xlrc` files for data submissions.
3. Run normalization in a temporary dry-run copy for data submissions.
4. Run the full repository check.

The check workflow only reports and fails. It does not close, normalize, commit,
or merge pull requests.

For branches that contain `incoming/*.xlrc`, maintainers can run the
`Normalize Incoming` workflow manually with the target branch/ref. It normalizes
the branch, commits generated changes back to that ref, and then the normal PR
checks apply.

[mixed-pr-test]

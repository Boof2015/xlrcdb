# Maintainer Notes

Internals of the xlrcdb repository: layout, local tooling, and the CI pipeline. Contributors
do not need any of this — see [CONTRIBUTING.md](../CONTRIBUTING.md).

## Repository Layout

- `artists/` — canonical artist records as TOML, sharded by ID prefix.
- `tracks/` — canonical XLRC files, sharded by ID prefix.
- `incoming/` — temporary holding area for raw submitted `.xlrc` files. Normally empty;
  Reconcile drains it.
- `index/` — generated from `artists/` and `tracks/`. Never edit by hand.
- `src/` — library modules (`repository.js`, `validator.js`, `indexGenerator.js`,
  `normalizer.js`, `prScope.js`).
- `scripts/` — CLI entrypoints wrapping `src/`.
- `test/` — `node:test` suites.

IDs are `art_`/`trk_` plus ten characters; the shard path is the first two and next two
characters of that suffix, so `art_61iD-18vfX` lives at `artists/61/iD/art_61iD-18vfX.toml`.

The repository is served directly from GitHub Pages (`.nojekyll` is present, there is no build
step) at `https://boof2015.github.io/xlrcdb/`.

## Local Commands

Install once:

```sh
npm install
```

| Command | What it does |
| --- | --- |
| `npm run check` | The full gate: tests, validate source data, validate `incoming/`, regenerate `index/`, then fail if the regenerated index differs from what is committed. |
| `npm run validate` | Validate committed `artists/` and `tracks/`. |
| `npm run validate:incoming` | Validate pending `incoming/*.xlrc` without moving or rewriting anything. |
| `npm run normalize` | Promote `incoming/` into canonical sharded paths, create artist records as needed, delete processed incoming files, regenerate `index/`. |
| `npm run normalize:dry-run` | Preview normalization without writing. |
| `npm run generate:index` | Regenerate `index/` only. |

`npm run check` is what CI runs, so a green local `check` means a green CI check.

## Pull Request Classification

[`src/prScope.js`](../src/prScope.js) sorts every PR into one of these, based only on which
paths changed. Data paths are `incoming/`, `artists/`, `tracks/`, and `index/`.

| Kind | Condition | Result |
| --- | --- | --- |
| `data-submission` | Only data paths, and at least one added or modified `incoming/*.xlrc` | Passes; raw validation and a dry-run normalization both run |
| `normalized-data` | Only data paths, no writable incoming file (e.g. an artist alias or lyric edit) | Passes |
| `manual-review` | No data paths touched at all (docs, workflows, tooling, package metadata) | **Fails by design** — requires a maintainer to merge |
| `invalid-mixed` | Data paths mixed with non-data paths | Fails |
| `invalid-data` | Data paths only, but something is wrong (e.g. a non-`.xlrc` file under `incoming/`) | Fails |

`manual-review` failing is intentional: it keeps automation away from anything that is not a
lyric submission. **Changes to this repository's own docs or workflows — including the change
that added this file — will fail `Check` and must be merged by hand.** That is the design
working, not a bug to fix.

## CI Pipeline

Three workflows, in order. A fourth (`Comment PR Report`) only reports.

### 1. `Check` — [.github/workflows/check.yml](../.github/workflows/check.yml)

Triggers on `pull_request` and `workflow_dispatch`. Permissions are `contents: read`, and it
uses the `pull_request` trigger rather than `pull_request_target`, so fork PRs run with a
read-only token and never see secrets.

Steps: classify the PR, validate committed data, conditionally validate raw `incoming/` files,
conditionally run a dry-run normalization, run the tests, then write and upload the
`pr-gate-report` artifact.

`Check` **never regenerates `index/`.** That is why two submissions in flight cannot conflict
on the index. Tests run with `XLRCDB_SKIP_INDEX_SYNC=1` for the same reason — index
consistency is enforced on `main` by Reconcile, not on PRs.

### 2. `Auto-merge` — [.github/workflows/auto-merge.yml](../.github/workflows/auto-merge.yml)

A `workflow_run` job on `Check` completion, so it holds write permissions even for fork PRs
without ever checking out fork code. It resolves the PR (by head SHA, since
`workflow_run.pull_requests` is empty for forks), confirms the PR is still open, not a draft,
and still at the exact commit that passed, applies the daily cap, then squash-merges.

The only gates are a green `Check` and a per-author 24-hour merge cap — a spam throttle,
applied without regard to content. Maintainers (`OWNER`, `MEMBER`, `COLLABORATOR`) are exempt.
Tune the cap with the `DAILY_MERGE_CAP` repository variable; the default is 30.

There is no human approval step. Nobody reviews submitted lyrics. See
[LEGAL.md](../LEGAL.md).

### 3. `Reconcile` — [.github/workflows/reconcile.yml](../.github/workflows/reconcile.yml)

Runs on pushes to `main` that touch data paths, on a `*/15` cron backstop, and on dispatch.
`concurrency: reconcile-main` means only one ever runs at a time, so index commits stay linear.

It runs `npm run normalize` on `main` and commits the result as `github-actions[bot]`. This is
the single owner of `index/`. A track is searchable shortly after merge; `incoming/` is briefly
non-empty in between.

If `main` is protected, `github-actions[bot]` needs permission to push to it, or the index
will silently stop updating.

## Bot Identity

Merges are performed by the **`xlrcdb-bot`** machine account, not by a maintainer. This is
deliberate: merges are automated and carry no human judgement about the lyrics, so they must
not appear under a person's name as though that person reviewed and approved them.

### Setup

1. Register a dedicated GitHub account (`xlrcdb-bot`) with its own email and 2FA.
2. Add it to this repository as a collaborator with **Write** access, and accept the invite
   from that account.
3. From that account, create a **classic** personal access token with the `public_repo`
   scope. Set a long expiry and a calendar reminder before it lapses.
4. Store it as the repository secret `XLRCDB_BOT_TOKEN`.

### Why a classic PAT and not something better

This is the constraint that drives the whole design, so it is worth recording:

- **`GITHUB_TOKEN`** and **GitHub App installation tokens** are both scoped to this
  repository. Merging a pull request opened from a *fork* returns
  `403 Resource not accessible by integration`, because the token has no standing on the
  contributor's fork. Nearly every real submission is a fork PR, so this rules both out.
  This was verified empirically: an App token merged a same-repo PR successfully and failed
  on a fork PR from the same installation.
- **Fine-grained PATs** only reach repositories owned by the token's selected resource owner.
  The bot is a collaborator here, not the owner, so this repository is not selectable at all.
- **A classic PAT** is a user token, so it can merge any pull request targeting a repository
  the account can write to, forks included.

The usual objection to classic PATs is their breadth, which does not bite here: the bot
account is a collaborator on this repository only, so `public_repo` reaches exactly one repo.

The real cost is expiry. When the token lapses, merging stops. There is deliberately **no
fallback token** — `Auto-merge` fails loudly instead of quietly falling back to a token that
cannot merge fork PRs and leaving valid submissions to rot on a green run.

### Notes

- The post-merge `createWorkflowDispatch` needs the classic `repo` scope; with `public_repo`
  it logs a 403 warning. That is harmless. A user-token merge is not `GITHUB_TOKEN`, so the
  push to `main` already fired Reconcile's push trigger, and the cron sits behind that.
- If `main` is ever protected, give `xlrcdb-bot` permission to merge, or merges will 403.

## Handling a Takedown

1. Confirm the notice identifies the material and the sender's authority — see
   [LEGAL.md](../LEGAL.md) for the required elements.
2. Delete the `tracks/**` file (and the `artists/**` record if it has no remaining tracks).
3. Push to `main`. Reconcile regenerates `index/`, which removes the entry from the served
   lookup data.
4. Record the strike against the contributor who submitted it, per the repeat infringer policy.
5. If the history itself must be purged rather than just the current tree, that is a separate,
   destructive operation — history rewriting on `main` breaks every fork and clone.

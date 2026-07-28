# xlrcdb

The community lyrics database for the [XLRC format](https://www.npmjs.com/package/@boof2015/xlrc).

XLRC is a plain-text lyric format with timing, furigana, translations, and per-word
timestamps. xlrcdb collects `.xlrc` files, gives every track a stable ID, and publishes a
generated index that apps can look tracks up in by artist, title, and duration.

Everything here is static files. There is no server and no account required to read it.

## Find Lyrics

Search the database at **[astramusic.dev/xlrcdb](https://astramusic.dev/xlrcdb/)**.

## Use It In Your App

The database is served from GitHub Pages. Point the `@boof2015/xlrc` client at it:

```ts
import { lookup } from "@boof2015/xlrc";

await lookup({
  artist: "Artist Name",
  title: "Track Title",
  length: 222,
  source: "https://boof2015.github.io/xlrcdb/"
});
```

`length` is the track duration in seconds. It is required — xlrcdb matches on artist, title,
and duration together so that different recordings of the same song stay distinct.

## Contribute

**Use the editor: [astramusic.dev/xlrcdb/#/submit](https://astramusic.dev/xlrcdb/#/submit)**

The editor is the recommended way to contribute, and it is much easier than editing files by
hand. It writes valid XLRC for you, fills in the headers xlrcdb requires, checks the file
before you send it, and opens the pull request on your behalf. It also has a page for editing
artist names and aliases.

You do not need to clone the repository, install anything, or know the format.

If you would rather work in git directly, [CONTRIBUTING.md](CONTRIBUTING.md) covers the manual
path, the format requirements, and how the pipeline handles your submission.

### Before You Contribute

**Only submit lyrics you have the rights to.** By opening a pull request you are stating that
you own the content or have permission to publish it.

xlrcdb does not check this and cannot check this. Submissions are merged automatically once
the format validates — no person reads them, and a merge is not a review, an approval, or any
statement about who owns what.

If a takedown lands on something you submitted and it is upheld, it counts as a strike against
your account. Three strikes is a permanent block. See [LEGAL.md](LEGAL.md) for the full policy.

## Reporting Content

If you hold the rights to something in xlrcdb and want it removed, email
**xlrcdb-dmca@novaml.ai** with the repository path or index URL of the file and proof that you
are entitled to make the request.

[LEGAL.md](LEGAL.md) lists exactly what to include and what happens next.

## More

- [CONTRIBUTING.md](CONTRIBUTING.md) — format requirements and the manual submission path
- [LEGAL.md](LEGAL.md) — content policy, contributor rights terms, takedowns
- [LICENSE](LICENSE) — MIT, tooling only; lyric content is not covered
- [docs/MAINTAINERS.md](docs/MAINTAINERS.md) — repository layout, local checks, CI internals

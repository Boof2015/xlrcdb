# xlrcdb Legal & Content Policy

This page covers who is responsible for the content in xlrcdb, what you agree to when
you contribute, and how to get content removed.

Contact for all matters on this page: **xlrcdb-dmca@novaml.ai**

## What xlrcdb Is

xlrcdb is a static index of `.xlrc` lyric files submitted by the community. It is a
distribution and lookup mechanism for a file format, not a publisher.

xlrcdb does not author lyric content, does not own it, and does not claim any licence
to it. Every lyric file in `tracks/` was submitted by a contributor who represented
that they had the right to submit it.

## Contributor Representation

By opening a pull request against this repository, you represent and warrant that:

- You own the rights to the content you are submitting, or you have permission from the
  rights holder, or the content is otherwise lawful for you to publish.
- Submitting the content does not infringe anyone's copyright or other rights.
- The content is not subject to a licence or agreement that your submission would breach.

You are responsible for your own submissions. If you are unsure whether you have the
right to submit something, do not submit it.

## xlrcdb Does Not Verify Rights

**xlrcdb performs no rights check of any kind.** Continuous integration validates format
only: that the file parses as XLRC, that `[ti:]`, `[ar:]`, and `[length:]` are present and
well-formed, and that the pull request touches only data paths.

**A merge is automated and is neither a review nor an endorsement of the content.** Pull
requests are merged by a bot the moment the format check passes. No person reads the lyrics,
assesses their provenance, or approves their publication. The only other gate is a per-author
daily merge cap, which is a spam throttle applied without regard to content.

Do not read a merge — or the absence of a takedown — as xlrcdb asserting anything about the
rights status of a file.

## Repeat Infringer Policy

Contributors are accountable for what they submit. Each upheld takedown that is traceable to
a contributor's submission counts as one strike against that contributor's account:

1. **First strike** — the content is removed and you receive a warning.
2. **Second strike** — automatic merging is revoked for your account. Your pull requests
   remain welcome but are held for manual review.
3. **Third strike** — you are permanently blocked from contributing to this repository.

Strikes may be escalated immediately, up to and including a permanent block on a first
offence, where a submission appears deliberate, in bulk, or made in bad faith.

Strikes attach to upheld takedowns. A notice that is withdrawn, successfully countered, or
plainly invalid does not produce a strike.

## Reporting Content (Takedown Notices)

If you hold rights to a work in xlrcdb and you want it removed, email
**xlrcdb-dmca@novaml.ai**.

To act on your notice we need enough information to identify the work and confirm you are
entitled to make the request. Please include the elements required by 17 U.S.C. § 512(c)(3):

1. A physical or electronic signature of the rights holder or a person authorised to act on
   their behalf.
2. Identification of the copyrighted work you claim has been infringed.
3. Identification of the material you want removed, **including the repository path or index
   URL** — for example `tracks/ab/cd/trk_xxxxxxxxxx.xlrc`. A file path or a direct link is by
   far the fastest way to get a result; a song title alone may not be enough to locate it.
4. Your contact information: name, address, telephone number, and email address.
5. A statement that you have a good-faith belief that the use is not authorised by the rights
   holder, its agent, or the law.
6. A statement, made under penalty of perjury, that the information in your notice is accurate
   and that you are the rights holder or are authorised to act on their behalf.

We aim to respond within **5 business days**. Removal is performed as a commit to `main`,
which also drops the entry from the generated index, so the content stops being served by
the lookup API as well as disappearing from the repository.

Note that the repository's git history is public. Where the history itself must be purged
rather than just the current files, say so in your notice.

### If You Are a Contributor Whose Content Was Removed

If you believe your submission was removed in error, you may send a counter-notice to the same
address. Include the material and its former location, a statement under penalty of perjury
that you have a good-faith belief it was removed as a result of mistake or misidentification,
your contact information, and your consent to jurisdiction as described in 17 U.S.C. § 512(g)(3).

### Filing With GitHub Instead

This repository is hosted on GitHub, and GitHub operates its own takedown process. You are
free to use it instead of, or in addition to, emailing us. Contacting us directly is usually
faster; contacting GitHub is available to you regardless of whether we respond.

## Licensing

The xlrcdb tooling is MIT licensed — see [LICENSE](LICENSE). That licence covers the code
only. It does not cover, and grants you no rights in, the lyric content under `tracks/` or the
artist records under `artists/`.

## Not Legal Advice

This page describes how xlrcdb handles rights complaints as a matter of project policy. It is
not legal advice, it does not create any contract or obligation beyond what the law requires,
and it should not be read as a claim to any particular legal status or statutory safe harbour.

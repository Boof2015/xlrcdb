# xlrcdb badges

## Add xlrcdb to your README

If your app uses xlrcdb for lyrics, start with this badge. It opens the lyrics catalog when someone clicks it.

[![Lyrics from xlrcdb](https://img.shields.io/badge/lyrics-xlrcdb-6750a4?style=flat-square)](https://astramusic.dev/xlrcdb/)

Copy this line into your README.

```markdown
[![Lyrics from xlrcdb](https://img.shields.io/badge/lyrics-xlrcdb-6750a4?style=flat-square)](https://astramusic.dev/xlrcdb/)
```

For a fan page or a playlist, jump to the [artist badge](#feature-an-artist) or [song badge](#link-to-a-song).

## Show what’s in the catalog

Choose the number you want to show, then open **Copy Markdown** beneath its preview. These badges update as xlrcdb publishes new counts.

### Catalog size

Each track contributes its full duration in seconds.

[![Tracks in xlrcdb](https://img.shields.io/badge/dynamic/json?url=https://boof2015.github.io/xlrcdb/index/stats.json&query=$.totals.tracks&label=xlrcdb&suffix=%20tracks&color=6750a4)](https://astramusic.dev/xlrcdb/)
[![Artists in xlrcdb](https://img.shields.io/badge/dynamic/json?url=https://boof2015.github.io/xlrcdb/index/stats.json&query=$.totals.artistCount&label=xlrcdb&suffix=%20artists&color=6750a4)](https://astramusic.dev/xlrcdb/)
[![Lyric lines in xlrcdb](https://img.shields.io/badge/dynamic/json?url=https://boof2015.github.io/xlrcdb/index/stats.json&query=$.totals.lyricLines&label=xlrcdb&suffix=%20lyric%20lines&color=6750a4)](https://astramusic.dev/xlrcdb/)
[![Total runtime in xlrcdb](https://img.shields.io/badge/dynamic/json?url=https://boof2015.github.io/xlrcdb/index/stats.json&query=$.totals.runtimeSeconds&label=xlrcdb&suffix=%20seconds%20of%20music&color=6750a4)](https://astramusic.dev/xlrcdb/)

<details>
<summary>Copy Markdown for catalog size</summary>

**Tracks**

```markdown
[![Tracks in xlrcdb](https://img.shields.io/badge/dynamic/json?url=https://boof2015.github.io/xlrcdb/index/stats.json&query=$.totals.tracks&label=xlrcdb&suffix=%20tracks&color=6750a4)](https://astramusic.dev/xlrcdb/)
```

**Artists**

```markdown
[![Artists in xlrcdb](https://img.shields.io/badge/dynamic/json?url=https://boof2015.github.io/xlrcdb/index/stats.json&query=$.totals.artistCount&label=xlrcdb&suffix=%20artists&color=6750a4)](https://astramusic.dev/xlrcdb/)
```

**Lyric lines**

```markdown
[![Lyric lines in xlrcdb](https://img.shields.io/badge/dynamic/json?url=https://boof2015.github.io/xlrcdb/index/stats.json&query=$.totals.lyricLines&label=xlrcdb&suffix=%20lyric%20lines&color=6750a4)](https://astramusic.dev/xlrcdb/)
```

**Total runtime**

```markdown
[![Total runtime in xlrcdb](https://img.shields.io/badge/dynamic/json?url=https://boof2015.github.io/xlrcdb/index/stats.json&query=$.totals.runtimeSeconds&label=xlrcdb&suffix=%20seconds%20of%20music&color=6750a4)](https://astramusic.dev/xlrcdb/)
```

</details>

### Word timing and furigana

A timed segment is one word or syllable. A furigana annotation gives the reading of Japanese text.

[![Tracks with word timing in xlrcdb](https://img.shields.io/badge/dynamic/json?url=https://boof2015.github.io/xlrcdb/index/stats.json&query=$.totals.tracksWithWordTiming&label=xlrcdb&suffix=%20word-timed%20tracks&color=27665b)](https://astramusic.dev/xlrcdb/)
[![Individually timed segments in xlrcdb](https://img.shields.io/badge/dynamic/json?url=https://boof2015.github.io/xlrcdb/index/stats.json&query=$.totals.timedSegments&label=xlrcdb&suffix=%20timed%20segments&color=27665b)](https://astramusic.dev/xlrcdb/)
[![Tracks with furigana in xlrcdb](https://img.shields.io/badge/dynamic/json?url=https://boof2015.github.io/xlrcdb/index/stats.json&query=$.totals.tracksWithFurigana&label=xlrcdb&suffix=%20tracks%20with%20furigana&color=27665b)](https://astramusic.dev/xlrcdb/)
[![Furigana annotations in xlrcdb](https://img.shields.io/badge/dynamic/json?url=https://boof2015.github.io/xlrcdb/index/stats.json&query=$.totals.furiganaAnnotations&label=xlrcdb&suffix=%20furigana%20readings&color=27665b)](https://astramusic.dev/xlrcdb/)

<details>
<summary>Copy Markdown for word timing and furigana</summary>

**Tracks with word timing**

```markdown
[![Tracks with word timing in xlrcdb](https://img.shields.io/badge/dynamic/json?url=https://boof2015.github.io/xlrcdb/index/stats.json&query=$.totals.tracksWithWordTiming&label=xlrcdb&suffix=%20word-timed%20tracks&color=27665b)](https://astramusic.dev/xlrcdb/)
```

**Individually timed segments**

```markdown
[![Individually timed segments in xlrcdb](https://img.shields.io/badge/dynamic/json?url=https://boof2015.github.io/xlrcdb/index/stats.json&query=$.totals.timedSegments&label=xlrcdb&suffix=%20timed%20segments&color=27665b)](https://astramusic.dev/xlrcdb/)
```

**Tracks with furigana**

```markdown
[![Tracks with furigana in xlrcdb](https://img.shields.io/badge/dynamic/json?url=https://boof2015.github.io/xlrcdb/index/stats.json&query=$.totals.tracksWithFurigana&label=xlrcdb&suffix=%20tracks%20with%20furigana&color=27665b)](https://astramusic.dev/xlrcdb/)
```

**Furigana annotations**

```markdown
[![Furigana annotations in xlrcdb](https://img.shields.io/badge/dynamic/json?url=https://boof2015.github.io/xlrcdb/index/stats.json&query=$.totals.furiganaAnnotations&label=xlrcdb&suffix=%20furigana%20readings&color=27665b)](https://astramusic.dev/xlrcdb/)
```

</details>

### Languages and translations

Track language comes from the primary language tag. A lyric line can have an English translation and a romanized reading, and counts once in each language.

[![Japanese-language tracks in xlrcdb](https://img.shields.io/badge/dynamic/json?url=https://boof2015.github.io/xlrcdb/index/stats.json&query=$.totals.tracksByPrimaryLanguage.ja&label=xlrcdb&suffix=%20Japanese%20tracks&color=365b94)](https://astramusic.dev/xlrcdb/)
[![Tracks with translations or romanization in xlrcdb](https://img.shields.io/badge/dynamic/json?url=https://boof2015.github.io/xlrcdb/index/stats.json&query=$.totals.tracksWithTranslations&label=xlrcdb&suffix=%20tracks%20with%20translations&color=365b94)](https://astramusic.dev/xlrcdb/)
[![Lines with English translations in xlrcdb](https://img.shields.io/badge/dynamic/json?url=https://boof2015.github.io/xlrcdb/index/stats.json&query=$.totals.translatedLinesByLanguage.en&label=xlrcdb&suffix=%20lines%20with%20English%20translations&color=365b94)](https://astramusic.dev/xlrcdb/)
[![Lines with romanized Japanese in xlrcdb](https://img.shields.io/badge/dynamic/json?url=https://boof2015.github.io/xlrcdb/index/stats.json&query=$.totals.translatedLinesByLanguage%5B%27ja-latn%27%5D&label=xlrcdb&suffix=%20romanized%20Japanese%20lines&color=365b94)](https://astramusic.dev/xlrcdb/)

<details>
<summary>Copy Markdown for languages and translations</summary>

**Japanese-language tracks**

```markdown
[![Japanese-language tracks in xlrcdb](https://img.shields.io/badge/dynamic/json?url=https://boof2015.github.io/xlrcdb/index/stats.json&query=$.totals.tracksByPrimaryLanguage.ja&label=xlrcdb&suffix=%20Japanese%20tracks&color=365b94)](https://astramusic.dev/xlrcdb/)
```

**Tracks with translations or romanization**

```markdown
[![Tracks with translations or romanization in xlrcdb](https://img.shields.io/badge/dynamic/json?url=https://boof2015.github.io/xlrcdb/index/stats.json&query=$.totals.tracksWithTranslations&label=xlrcdb&suffix=%20tracks%20with%20translations&color=365b94)](https://astramusic.dev/xlrcdb/)
```

**Lines with English translations**

```markdown
[![Lines with English translations in xlrcdb](https://img.shields.io/badge/dynamic/json?url=https://boof2015.github.io/xlrcdb/index/stats.json&query=$.totals.translatedLinesByLanguage.en&label=xlrcdb&suffix=%20lines%20with%20English%20translations&color=365b94)](https://astramusic.dev/xlrcdb/)
```

**Lines with romanized Japanese**

```markdown
[![Lines with romanized Japanese in xlrcdb](https://img.shields.io/badge/dynamic/json?url=https://boof2015.github.io/xlrcdb/index/stats.json&query=$.totals.translatedLinesByLanguage%5B%27ja-latn%27%5D&label=xlrcdb&suffix=%20romanized%20Japanese%20lines&color=365b94)](https://astramusic.dev/xlrcdb/)
```

</details>

## Feature an artist

On a fan page or playlist README, this badge shows how many K/DA tracks have word timing. Clicking it opens K/DA’s tracks in xlrcdb.

[![K/DA tracks with word timing on xlrcdb](https://img.shields.io/badge/dynamic/json?url=https://boof2015.github.io/xlrcdb/index/stats.json&query=$.artists.art_h2c952tsMt.tracksWithWordTiming&label=K%2FDA&suffix=%20word-timed%20tracks&color=27665b)](https://astramusic.dev/xlrcdb/#/artist/art_h2c952tsMt)

```markdown
[![K/DA tracks with word timing on xlrcdb](https://img.shields.io/badge/dynamic/json?url=https://boof2015.github.io/xlrcdb/index/stats.json&query=$.artists.art_h2c952tsMt.tracksWithWordTiming&label=K%2FDA&suffix=%20word-timed%20tracks&color=27665b)](https://astramusic.dev/xlrcdb/#/artist/art_h2c952tsMt)
```

For another artist, copy the `art_…` ID from their xlrcdb page address. Replace both copies of `art_h2c952tsMt` in the snippet, then change the badge label and alt text to the artist’s name.

## Link to a song

This badge reads the duration from the XLRC file for *God only knows -Secrets of the Goddess-* and opens the synced lyrics for that recording.

[![God only knows — track duration and lyrics on xlrcdb](https://img.shields.io/badge/dynamic/regex?url=https://boof2015.github.io/xlrcdb/tracks/ho/iw/trk_hoiwxqbe5s.xlrc&search=%5C%5Blength%3A%28%5B0-9%3A%5D%2B%29%5C%5D&replace=%241&label=God%20only%20knows&color=6750a4)](https://astramusic.dev/xlrcdb/#/track/art_KId1XhjXMt/trk_hoiwxqbe5s)

```markdown
[![God only knows — track duration and lyrics on xlrcdb](https://img.shields.io/badge/dynamic/regex?url=https://boof2015.github.io/xlrcdb/tracks/ho/iw/trk_hoiwxqbe5s.xlrc&search=%5C%5Blength%3A%28%5B0-9%3A%5D%2B%29%5C%5D&replace=%241&label=God%20only%20knows&color=6750a4)](https://astramusic.dev/xlrcdb/#/track/art_KId1XhjXMt/trk_hoiwxqbe5s)
```

For another song, find its title in the catalog and copy its `path` over the `tracks/…xlrc` path in the snippet. Update the title and use the song’s xlrcdb page as the final link. [Track catalog](https://boof2015.github.io/xlrcdb/index/catalog.json)

For more language and artist counts, see the [xlrcdb badge data reference](MAINTAINERS.md#stats-for-badges).

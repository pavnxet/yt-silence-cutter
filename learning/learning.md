<!-- verified-at: v1.13.0 · 2026-11-19 -->
# Persistent Learnings & Domain Knowledge

> One line per lesson, grouped under `## [area: <name>]`. Grep the area you need; never read this whole file.
> Entry shape: `- [PITFALL|CONVENTION|FACT|FIX|PERF|TOOLING] <lesson> (v:YYYY-MM-DD · high|med|low · S-<id>)`

## [area: github]
- [PITFALL] `GITHUB_COMMIT_MULTIPLE_FILES` returns a Cloudflare "Attention Required" page from the MCP host. Use `GITHUB_CREATE_OR_UPDATE_FILE_CONTENTS` once per file instead. (v:2026-11-19 · high · S-20261119-0001)
- [PITFALL] Plain-text content sent through the API normalises CRLF to LF; base64 preserves bytes exactly. Always push base64 and verify with `cmp`. (v:2026-11-19 · high · S-20261119-0001)
- [PITFALL] The WAF also blocks bodies containing a literal inline `<script>…</script>` pair; split the tag string in the source (also correct for HTML parsers). (v:2026-11-19 · med · S-20261119-0001)

## [area: content engine]
- [PITFALL] Never persist settings from a `ratechange` handler. A temporary speed (YouTube hold-to-2x) becomes the stored base speed and sticks across pause/resume. (v:2026-11-19 · high · S-20261119-0001)
- [PITFALL] The speech guard's release threshold must not sit below the silence line. A level in between counts as both "quiet enough to start" and "loud enough to stop", which breaks a long silence into 2–3 s chunks. (v:2026-11-19 · high · S-20261119-0001)
- [FACT] `video.duration` is `NaN` before metadata loads and `Infinity` on a live stream. Both must be skipped — `!isFinite(duration)` covers both. (v:2026-11-19 · high · S-20261119-0001)
- [FACT] `playbackRate` is clamped to [0.0625, 16] by the browser; a custom base x boost must be clamped or it throws. (v:2026-11-19 · med · S-20261119-0001)
- [CONVENTION] `content-scripts/content.js` is minified WXT output. Patch it by exact string with an assertion on the match count, never by rewriting. (v:2026-11-19 · med · S-20261119-0001)

## [area: popup]
- [FACT] The popup chunk (`chunks/popup-*.js`) writes `.textContent` on the value nodes. Replacing those spans with `<input type="number">` is safe — `textContent` on an input is a no-op, it does not throw. (v:2026-11-19 · med · S-20261119-0001)
- [CONVENTION] `chunks/custom.js` owns the sliders and number boxes for every control: it paints on load and on `storage.onChanged`, and saves on the number's `change` **and** the slider's `change`. A new control needs an entry in its `FIELDS` and a range in `value-core.js`. (v:2026-11-19 · high · S-20261119-0001)
- [FACT] `value-core.sanitize()` clamps a whole settings object and fills defaults — use it when loading from storage so a corrupt value cannot break the UI. (v:2026-11-19 · med · S-20261119-0001)

## [area: tests]
- [PITFALL] Overriding `video.playbackRate` with a plain property does not fire a native `ratechange`; dispatch one manually or the extension never sees the change. (v:2026-11-19 · high · S-20261119-0001)
- [PITFALL] The harness's `chrome.storage.local.get` must accept a callback as well as returning a promise, like the real API. (v:2026-11-19 · high · S-20261119-0001)
- [PITFALL] A `-1` "no result" sentinel satisfies `< 2200` assertions. Always assert a lower bound too. (v:2026-11-19 · med · S-20261119-0001)
- [CONVENTION] Derive the popup test's script list from `popup.html` so deleting a script cannot silently break the test. (v:2026-11-19 · med · S-20261119-0001)

## [area: workflow]
- [CONVENTION] Every build bumps the version in `manifest.json` **and** the zip filename. (v:2026-11-19 · high · S-20261119-0001)
- [CONVENTION] Commits stay honest and single-purpose; never bury a change among unrelated edits. (v:2026-11-19 · high · S-20261119-0001)

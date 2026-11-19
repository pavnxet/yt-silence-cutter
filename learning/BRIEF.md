<!-- verified-at: v1.13.0 · 2026-11-19 · rewritten whole, not appended -->
# BRIEF: cold-start summary

## State
- **YT Silence Cutter** — a fully local MV3 extension that fast-forwards quiet parts of any HTML5 video. No network calls, no paywall, no accounts. Author `pavnxet`, MIT.
- Works: per-video Web Audio detection, speech guard, live 3-state graph, stats page, custom values, speed lock, 12 keyboard shortcuts + guide, `?` help popovers.
- Does not work yet: DRM audio (browsers block it), captions-based skipping, per-site rules.

## Active work / handoff
- S-20261119-0001 · T2 · DONE · next: none · blocked on: nothing

## Top pitfalls (most expensive to rediscover first)
- github: the multi-file commit action is WAF-blocked → push per file, base64, then `cmp` → `learning.md [area: github]`
- engine: never persist a `ratechange`; a temporary 2x becomes the saved base → `[area: content engine]`
- engine: the guard's release threshold must not sit below the silence line, or long silences break into chunks → `[area: content engine]`
- popup: sliders/numbers are owned by `chunks/custom.js`; save on slider `change`, not only on the number → `[area: popup]`
- tests: the headless harness needs a manually dispatched `ratechange` and a callback-capable `storage.get` → `[area: tests]`

## Verified commands
- test: `for t in stats smooth curve guard value shortcuts help popup engine; do node tests/$t.test.js; done` (~60 s)
- syntax: `for f in chunks/*.js content-scripts/content.js background.js; do node --check "$f"; done`
- package: `zip -rq yt-silence-cutter-<version>.zip yt-silence-cutter`

## Where to look (task -> place)
- the skip decision -> `chunks/guard-core.js` (pure, tested)
- the engine / rate control -> `content-scripts/content.js` (minified; patch by exact string)
- popup controls -> `popup.html` + `chunks/custom.js` + `chunks/value-core.js`
- help copy -> `chunks/help-core.js`; shortcuts -> `chunks/shortcuts-core.js`
- analytics -> `chunks/stats-core.js` + `background.js`
- full docs -> `README.md` (16 sections)

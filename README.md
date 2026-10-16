# YT Silence Cutter

Automatically fast-forwards the silent and low-volume parts of any video you watch — right in your browser.

**Author:** Pavneet Singh ([@pavnxet](https://github.com/pavnxet)) · **License:** MIT · **Version:** 1.8.1

---

## Features

### Skipping
- **Skip silence** — watches the audio of any playing `<video>`, detects quiet stretches, speeds through them, and returns to normal speed the instant speech resumes.
- **Speech guard** — leaves a margin of untouched audio on both sides of speech, so a high skip speed doesn't clip word onsets. Adjustable 0–600 ms; `0` disables it.
- **Silence boost** — how much faster silence plays, as a multiple of your base speed (2×–8×).
- **Sensitivity** — the loudness threshold (in dB) below which audio counts as silence (−60 to −25 dB).
- **Works on any site** — the skip is generic HTML5-video logic, not YouTube-specific. Multiple videos on a page are handled, and each keeps its own skip state so they don't interfere.

### Playback speed
- **Manual base speed** — set 0.5×–4× in the popup.
- **Adopts your choice** — change the speed on the site itself (e.g. YouTube's menu) and the extension takes that as the new base instead of fighting it.
- **Relative skipping** — silence and speech are both scaled from the base, so boosting to 1.5× and skipping at 6× behaves sensibly.

### Live audio view (popup)
- **Real-time waveform** — speech vs. silence as it plays, colour-coded in the brand palette.
- **Smooth motion** — the window slides on a continuous clock and bar heights are interpolated between samples, so it animates at 60 fps rather than stepping one bar per message.
- **Live legend** — shows the effective speech and silence rates.
- **Time-saved readout** — running total for the current session.
- **Honours `prefers-reduced-motion`** — draws only when new data arrives instead of animating.

### Stats page
- **Time saved** — total wall-clock time skipping has bought you.
- **Silence skipped**, **Videos processed**, **Sessions**.
- **Saved today** and **Saved this week**.
- **Average skip speed**.
- **Last 14 days** — a per-day bar chart.
- **Reset stats** — one click, with a confirm.

### Privacy & platform
- **Fully local** — no account, no server, no network requests of any kind. Every bit of audio analysis happens in your browser.
- **No data collection** — nothing is transmitted anywhere; stats live in `chrome.storage.local`.
- **Manifest V3** — Chrome, Edge, Brave and other Chromium browsers; also loads in Firefox via `about:debugging`.
- **Warm, quiet UI** — ivory canvas, terracotta accent and serif headings, with eased transitions throughout.

---

## Install (unpacked)

1. Download or clone this repository.
2. Open `chrome://extensions` (or `edge://extensions`).
3. Turn on **Developer mode**.
4. Click **Load unpacked** and select this folder.
5. Open any page with a video and click the toolbar icon.

**Firefox:** go to `about:debugging` → *This Firefox* → *Load Temporary Add-on…* and pick `manifest.json`.

---

## Using it

| Control | What it does | Default | Range |
|---|---|---|---|
| **Skip silence** | Master on/off | On | on / off |
| **Playback speed** | Your base speed | 1× | 0.5× – 4× |
| **Silence boost** | Multiplier applied to the base while skipping | 4× | 2× – 8× |
| **Sensitivity** | Loudness below which audio is "silence" | −45 dB | −60 – −25 dB |
| **Speech guard** | Untouched margin around speech | 150 ms | 0 – 600 ms |
| **View full stats** | Opens the analytics page | — | — |

A worked example: base **1.5×** with a **4×** boost plays silence at **6×** and speech at **1.5×**.

---

## Settings reference

All settings live in `chrome.storage.local` under the `settings` key:

| Key | Meaning | Default |
|---|---|---|
| `enabled` | Skipping on/off | `true` |
| `playbackSpeed` | Base speed | `1` |
| `silenceSpeed` | Silence boost (relative to base) | `4` |
| `thresholdDb` | Silence threshold (dB) | `-45` |
| `guardMs` | Speech-guard margin (ms) | `150` |
| `minSilenceMs` | Quiet must last this long before boosting | `350` |

---

## Stats

Stored locally in `chrome.storage.local` under the `stats` key and never sent anywhere.

**How "time saved" is calculated.** Playing `wall` ms of wall-clock silence at a rate `boost` times your base speed covers `wall × boost` ms of content and takes `wall` ms instead of `wall × boost` ms — so the saving is `wall × (boost − 1)` ms. Because the skip rate is `base × boost`, this figure is independent of the base speed. See `chunks/stats-core.js`.

---

## How the speech guard works

At a high skip speed the detector can overshoot into the start of a word: 50 ms of real time at 8× is 400 ms of content, so by the time a frame notices speech it has already fast-forwarded through it. The speech guard (`chunks/guard-core.js`) attacks this three ways:

- **lead-in** — quiet must last `minSilenceMs` before the fast-forward starts, so the tail of the previous word is safe;
- **lead-out** — the fast-forward is released on a *quieter* threshold than the one that started it, so it lets go before the level actually reaches speech;
- **onset** — a sharp rise in level over a short window releases it at once, catching a word's leading edge.

The lead-out is approximate by design: in real time there is no way to know speech is coming, so the guard exits early rather than late. On top of that, the sampling interval shrinks as the skip speed rises, so the detector sees roughly a constant amount of *content* per frame (about 100 ms) instead of ballooning at high speed.

---

## How the live graph stays smooth

The raw audio level is jittery, and brief dips inside speech would flicker the graph into "silence". `chunks/smooth-core.js` fixes that with an **asymmetric EMA** — it rises fast (so speech onset shows immediately) and falls slowly (so short gaps don't read as silence) — plus a hold before the state may flip to silence.

The drawing is smooth too: `chunks/curve-core.js` renders the waveform on a continuous clock and **linearly interpolates** every bar height between the ~60 ms samples, so motion runs at 60 fps rather than stepping one bar per message.

---

## Architecture

```
content script (one per tab)
  ├─ attaches a Web Audio analyser to each <video>
  ├─ decides skip on/off (smooth-core + guard-core)
  ├─ drives playbackRate
  └─ sends level + stats deltas over chrome.runtime
                │
                ▼
background service worker
  └─ aggregates stats deltas (single writer, so tabs can't clobber each other)
                │
                ▼
chrome.storage.local  ──►  popup (live view)  +  stats page (analytics)
```

---

## Permissions

- `storage` — remembers your settings and stats.
- Access to all sites — needed so the skip works on any site with a video.

The extension makes **no network requests**. All audio analysis happens locally.

---

## Development

No build step — the extension is plain HTML/CSS/JS. The decision-making lives in four pure, dependency-free modules that run unchanged in the browser and under Node:

| Module | Responsibility |
|---|---|
| `chunks/smooth-core.js` | Level smoothing + speech/silence hysteresis |
| `chunks/curve-core.js` | Waveform interpolation |
| `chunks/guard-core.js` | The speech guard state machine |
| `chunks/stats-core.js` | Analytics maths |

Run the suites:

```sh
node tests/stats.test.js
node tests/smooth.test.js
node tests/curve.test.js
node tests/guard.test.js
node tests/engine.test.js   # runs the real content script in headless Chromium; skips if absent
```

`tests/engine.test.js` stubs the Web Audio analyser with a scripted silence→speech signal and checks the actual skip decisions the content script makes.

---

## Project layout

```
manifest.json            extension manifest (MV3)
background.js            service worker — analytics aggregator
content-scripts/
  content.js             the in-page engine
chunks/
  stats-core.js          analytics maths (pure, tested)
  smooth-core.js         audio smoothing filter (pure, tested)
  curve-core.js          waveform interpolation (pure, tested)
  guard-core.js          speech guard (pure, tested)
  guard.js               popup speech-guard control
  speed.js               popup playback-speed control
  wave.js                popup live-audio visualiser
  stats.js               stats page renderer
  nav.js                 popup navigation
popup.html               toolbar popup
stats.html               full stats page
icon/                    icon set (16–128 px)
tests/                   Node test suites
```

---

## Browser support

| Browser | Status |
|---|---|
| Chrome / Edge / Brave | Supported (Manifest V3) |
| Firefox | Loads as a temporary add-on via `about:debugging` |

---

## Troubleshooting

- **Nothing happens on a page.** The extension only acts on HTML5 `<video>` elements that are actually playing and unmuted. It also can't analyse media that the browser treats as cross-origin — the console logs `cannot analyse this video` in that case.
- **Speech still sounds rushed at high speed.** Raise **Speech guard**; it leaves more untouched audio around words. Lowering **Silence boost** also helps.
- **It skips too little.** Lower **Speech guard**, or raise **Sensitivity** toward −60 dB if your audio is quiet.
- **Stats look wrong after a settings change.** Time saved is only counted for silence that was actually skipped, so changing settings mid-video affects only what follows.

---

## Not in this version (yet)

Per-site rules, daily goals/streaks, stats export/import, a toolbar badge, an options page, keyboard shortcuts, and caption-based filler-word skipping are all designed but not implemented. The extension is local-only, so anything needing a server is deliberately out of scope.

---

## License

MIT — see [LICENSE](LICENSE).

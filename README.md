# YT Silence Cutter

Automatically fast-forwards the silent and low-volume parts of any video you watch — right in your browser.

**Author:** Pavneet Singh ([@pavnxet](https://github.com/pavnxet)) · MIT License

---

## What it does

- **Skip silence** — detects quiet stretches in a playing video and speeds through them, then returns to normal speed the moment speech resumes.
- **Live audio view** — a smooth, real-time waveform in the popup shows speech vs. silence as it plays.
- **Manual playback speed** — set a base speed (0.5×–4×) in the popup, or just change it on the site; the extension adopts whatever you pick and scales skipping relative to it.
- **Stats page** — a full analytics view of your time saved, silence skipped, videos and sessions, with a 14-day chart.
- **Fully local** — no account, no server, no network calls; every bit of analysis happens in your browser.
- **Works everywhere** — applies to any HTML5 video, not just YouTube.

## Install (unpacked)

1. Download or clone this repository.
2. Open `chrome://extensions` (or `edge://extensions`).
3. Turn on **Developer mode**.
4. Click **Load unpacked** and select this folder.
5. Open any page with a video and click the toolbar icon.

Firefox: load `manifest.json` via `about:debugging` → *This Firefox* → *Load Temporary Add-on*.

## Using it

- The main toggle turns skipping on or off.
- **Playback speed** sets your base speed.
- **Silence boost** multiplies that base while skipping (e.g. base 1.5× with a 4× boost skips silence at 6×).
- **Sensitivity** is the loudness threshold (in dB) below which audio counts as silence.
- **View full stats** opens the analytics page.

## Stats

Everything is stored locally in `chrome.storage.local` and never leaves your browser.

- **Time saved** — how much wall-clock time skipping has saved you, compared with watching at your chosen base speed.
- **Silence skipped**, **Videos processed**, **Sessions**, **Saved today / this week**, **Average skip speed**.
- **Last 14 days** — a per-day bar chart.

How "time saved" is calculated: playing `wall` ms of wall-clock silence at a rate `boost` times your base speed covers `wall × boost` ms of content and takes `wall` ms instead of `wall × boost` ms — so the saving is `wall × (boost − 1)` ms. Because the skip rate is `base × boost`, this figure is independent of the base speed. See `chunks/stats-core.js`.

## How the live graph stays smooth

The raw audio level is jittery, and brief dips inside speech would flicker the graph into "silence". `chunks/smooth-core.js` fixes that with an **asymmetric EMA** — it rises fast (so speech onset shows immediately) and falls slowly (so short gaps don't read as silence) — plus a 300 ms hold before the state is allowed to flip to silence.

## Development

No build step. The extension is plain HTML/CSS/JS. Pure logic lives in two testable modules:

- `chunks/stats-core.js` — analytics maths
- `chunks/smooth-core.js` — the audio smoothing filter

Both run unchanged in the browser and under Node. Run the suites with:

```sh
node tests/stats.test.js
node tests/smooth.test.js
```

## Permissions

- `storage` — remembers your settings and stats.
- Access to all sites — needed so the skip works on any site with a video.

The extension does not collect or transmit any data — it makes no network requests at all. All audio analysis happens locally in your browser.

## Project layout

```
manifest.json            extension manifest (MV3)
background.js            service worker + analytics aggregator
content-scripts/         the in-page engine
chunks/
  stats-core.js          analytics maths (pure, tested)
  smooth-core.js         audio smoothing filter (pure, tested)
  stats.js               stats page renderer
  wave.js                popup live-audio visualiser
  speed.js               popup playback-speed control
  nav.js                 popup navigation
popup.html               toolbar popup
stats.html               full stats page
icon/                    icon set
tests/                   Node test suites
```

## License

MIT — see [LICENSE](LICENSE).

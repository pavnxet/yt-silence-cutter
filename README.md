# YT Silence Cutter

Automatically fast-forwards the silent and low-volume parts of any video you watch — right in your browser.

**Author:** Pavneet Singh ([@pavnxet](https://github.com/pavnxet))

---

## What it does

- **Skip silence** — detects quiet stretches in a playing video and speeds through them, then returns to normal speed the moment speech resumes.
- **Live audio view** — a real-time waveform in the popup shows speech vs. silence as it plays, plus how much time you've saved.
- **Manual playback speed** — set a base speed (0.5×–4×) in the popup, or just change it on the site; the extension adopts whatever you pick and scales skipping relative to it.
- **Works everywhere** — the basic skip runs entirely locally and applies to any HTML5 video, not just YouTube.

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
- **Silence boost** / **Filler boost** multiply that base while skipping (e.g. base 1.5× with a 4× boost skips silence at 6×).
- **Sensitivity** is the loudness threshold (in dB) below which audio counts as silence.

## Permissions

- `storage` — remembers your settings.
- Access to all sites — needed so the skip works on any site with a video.

The extension does not collect or transmit any data. All audio analysis happens locally in your browser.

## Project layout

```
manifest.json            extension manifest (MV3)
background.js            service worker
content-scripts/         the in-page engine
chunks/                  popup script + live-audio + speed control
popup.html               toolbar popup
icon/                    icon set
```

## License

MIT — see [LICENSE](LICENSE).

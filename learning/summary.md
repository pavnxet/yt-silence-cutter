# Session Execution Summary

> **Append-only**: one entry per session that changed something. Never delete history — rotate to `learning/archive/` at ~500 lines. Newest entry goes at the bottom.

## S-20261119-0001 · Bug sweep, ? help popovers, new control, project memory
- **Agent**: General Assistant · **Tier**: T2 · **Status**: DONE
- **Repo**: branch `main` · base `v1.12.0` · tree clean after push
- **Request**: find bugs, research enhancements, add `?` help popovers to the sliders, add features, test, push with a version bump, and adopt `pavnxet/learnings-for-agents` for future edits
- **Did**:
  - Added `chunks/help-core.js` (copy) + `chunks/help.js` (popover); a `?` on all six controls, with `aria-expanded`, Escape and click-outside to close.
  - New control: **Skip gaps longer than** (`minSilenceMs`, 100–2000 ms), wired through `custom.js` + `value-core.js`.
  - Fixed: `custom.js` never saved on slider `change` (only the number box) — new and existing sliders relied on other scripts; it now saves both ways.
  - Fixed: dead paywall auth listener removed from `background.js` (it would store a token/email if that message ever arrived).
  - Fixed: live streams (`duration` not finite) are no longer sped up; `NaN` before metadata covered too.
  - Fixed: the `reset` shortcut left `minSilenceMs` untouched.
  - Fixed: `applyAll` now runs `value-core.sanitize()`, so a corrupt stored value can't break the UI.
  - Removed now-redundant `chunks/speed.js` and `chunks/guard.js` (their display writes had been no-ops since the number boxes landed in v1.10.0).
  - Tightened two weak engine assertions that a `-1` sentinel used to satisfy.
  - Seeded `learning/` (this kit) so the pitfalls above are not rediscovered.
- **Verified**: `node tests/{stats,smooth,curve,guard,value,shortcuts,help,popup,engine}.test.js` → 9 suites, 344 assertions, all pass; `node --check` on every shipped script → clean; popup rendered headless to confirm the `?` popover.
- **Refs**: learning.md [area: github], [area: content engine], [area: popup], [area: tests]
- **Open / Next**: researched but deferred — adaptive threshold, mute-during-silence, per-site rules, in-player UI. See README "Not in this version (yet)".

## S-20261119-0002 · Fix: the ? popovers never bound
- **Agent**: General Assistant · **Tier**: T1 · **Status**: DONE
- **Repo**: branch `main` · base `v1.13.0` · tree clean after push
- **Request**: "the ? thing not working"
- **Cause**: `#helpPop` was emitted after the `help.js` script tag, so `getElementById` returned null at load and the module returned early — nothing was ever bound. The test passed because its harness moved all scripts to the end of the body, after the host.
- **Did**: moved the host above the scripts; `help.js` now resolves the host lazily; harness now inlines each script in place and preserves `type="module"`.
- **Verified**: `node tests/popup.test.js` → reproduced the failure first (2 FAIL), then 15/15 pass; full suite 9 suites / 344 assertions; popup rendered headless with the real DOM order.
- **Refs**: learning.md [area: popup], [area: tests]
- **Open / Next**: none

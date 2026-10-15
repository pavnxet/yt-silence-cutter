/* YT Silence Cutter — live-audio smoothing core.
   Turns a raw, jittery dB reading into a steady level + a stable speech/silence
   state, so continuous speech doesn't flicker into "silence" on every small dip.

   - EMA on the dB reading removes frame-to-frame jitter (smoother bars).
   - Hysteresis holds a short dip below the threshold from flipping the state
     until it has lasted `holdMs`, so brief gaps inside speech stay "speech".

   Loaded by the content script and the Node test suite, so the filter that
   runs is the filter that is tested.

   Author: Pavneet Singh (pavnxet) · MIT License
   https://github.com/pavnxet/yt-silence-cutter */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.YSCSmooth = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function create(opts) {
    opts = opts || {};
    // Asymmetric EMA — rise fast (attack), fall slow (release). A slow
    // release is what keeps brief dips inside speech from showing as breaks;
    // a fast attack means speech onset is reflected straight away.
    var base = opts.alpha > 0 && opts.alpha <= 1 ? opts.alpha : null;
    var up = opts.alphaUp > 0 && opts.alphaUp <= 1 ? opts.alphaUp : (base || 0.55);
    var down = opts.alphaDown > 0 && opts.alphaDown <= 1 ? opts.alphaDown : (base || 0.22);
    var holdMs = typeof opts.holdMs === "number" ? opts.holdMs : 300; // silence hold
    var floor = typeof opts.floor === "number" ? opts.floor : -60;    // dB -> 0
    var span = typeof opts.span === "number" ? opts.span : 50;        // dB range -> 1

    var sm = null, silent = false, silT = 0;

    return {
      /* db: current reading; thresholdDb: silence threshold; nowMs: clock.
         Returns { level (0..1), silent, smoothed }. */
      step: function (db, thresholdDb, nowMs) {
        var a = (sm === null || db >= sm) ? up : down;
        sm = sm === null ? db : sm + (db - sm) * a;

        if (sm >= thresholdDb) {
          silent = false;
          silT = 0;
        } else {
          if (!silT) silT = nowMs;
          if (!silent && nowMs - silT >= holdMs) silent = true;
        }

        var level = (sm - floor) / span;
        if (level < 0) level = 0;
        if (level > 1) level = 1;

        return { level: level, silent: silent, smoothed: sm };
      },
      reset: function () { sm = null; silent = false; silT = 0; }
    };
  }

  return { create: create };
});

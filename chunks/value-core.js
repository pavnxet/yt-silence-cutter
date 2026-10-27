/* YT Silence Cutter — value core.
   Validation and clamping for the settings the popup exposes, so a hand-typed
   value can never push the extension somewhere it can't go (e.g. a playback
   rate above the browser's 16x ceiling).

   Pure and dependency-free, so it runs unchanged in the browser and under Node.

   Author: Pavneet Singh (pavnxet) · MIT License
   https://github.com/pavnxet/yt-silence-cutter */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.YSCValue = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  /* The ranges the UI offers. Anything typed outside these is clamped. */
  var RANGES = {
    playbackSpeed: [0.25, 4],
    silenceSpeed: [1, 10],
    thresholdDb: [-80, -10],
    guardMs: [0, 2000]
  };

  var MIN_RATE = 0.0625;   // browser floor
  var MAX_RATE = 16;       // browser ceiling

  /* Clamp a numeric value into [min, max]. Returns `fallback` when the input
     isn't a usable number (NaN, "", "abc", Infinity). */
  function clampNum(v, min, max, fallback) {
    if (v === null || v === undefined || v === "") return fallback;
    var n = Number(v);
    if (!isFinite(n)) return fallback;
    if (n < min) return min;
    if (n > max) return max;
    return n;
  }

  /* The rate the engine should actually set, kept inside the browser's limits.
     This is what stops a custom base x boost (e.g. 4 x 10 = 40) from throwing. */
  function safeRate(base, boost) {
    var b = clampNum(base, RANGES.playbackSpeed[0], RANGES.playbackSpeed[1], 1);
    var s = clampNum(boost, RANGES.silenceSpeed[0], RANGES.silenceSpeed[1], 1);
    return clampNum(b * s, MIN_RATE, MAX_RATE, 1);
  }

  /* Clamp every exposed setting at once. Unknown keys pass through untouched. */
  function sanitize(settings) {
    var s = settings || {};
    var out = {};
    for (var k in s) if (Object.prototype.hasOwnProperty.call(s, k)) out[k] = s[k];
    out.playbackSpeed = clampNum(s.playbackSpeed, RANGES.playbackSpeed[0], RANGES.playbackSpeed[1], 1);
    out.silenceSpeed = clampNum(s.silenceSpeed, RANGES.silenceSpeed[0], RANGES.silenceSpeed[1], 4);
    out.thresholdDb = clampNum(s.thresholdDb, RANGES.thresholdDb[0], RANGES.thresholdDb[1], -45);
    out.guardMs = clampNum(s.guardMs, RANGES.guardMs[0], RANGES.guardMs[1], 150);
    return out;
  }

  return {
    RANGES: RANGES,
    MIN_RATE: MIN_RATE,
    MAX_RATE: MAX_RATE,
    clampNum: clampNum,
    safeRate: safeRate,
    sanitize: sanitize
  };
});

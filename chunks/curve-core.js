/* YT Silence Cutter — curve core.
   Turns a sparse series of audio samples (one every ~60 ms) into a value at
   any instant, by linear interpolation. This is what lets the popup waveform
   glide smoothly instead of stepping one bar per message.

   Pure and dependency-free, so it runs unchanged in the browser and under Node.

   Author: Pavneet Singh (pavnxet) · MIT License
   https://github.com/pavnxet/yt-silence-cutter */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.YSCCurve = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var BASE = 0.02;

  function clamp01(v) {
    v = Number(v);
    if (!(v >= 0)) return 0;
    if (v > 1) return 1;
    return v;
  }

  /* Largest index i with samples[i].t <= t, or -1 if t precedes the first
     sample, or the last index if t is at/after the last sample. */
  function indexBefore(samples, t) {
    var hi = samples.length - 1;
    if (hi < 0) return -1;
    if (t < samples[0].t) return -1;
    if (t >= samples[hi].t) return hi;
    var lo = 0;
    while (hi - lo > 1) {
      var mid = (lo + hi) >> 1;
      if (samples[mid].t <= t) lo = mid; else hi = mid;
    }
    return lo;
  }

  function levelAt(samples, t, base) {
    base = base == null ? BASE : base;
    if (!samples || !samples.length) return base;
    var last = samples.length - 1;
    if (t <= samples[0].t) return clamp01(samples[0].level);
    if (t >= samples[last].t) return clamp01(samples[last].level);
    var i = indexBefore(samples, t);
    var a = samples[i], b = samples[i + 1];
    var span = b.t - a.t;
    var p = span > 0 ? (t - a.t) / span : 0;
    return clamp01(a.level + (b.level - a.level) * p);
  }

  /* Colour class at t — the nearest preceding sample decides it. */
  function kindAt(samples, t) {
    if (!samples || !samples.length) return false;
    var last = samples.length - 1;
    if (t <= samples[0].t) return !!samples[0].speech;
    if (t >= samples[last].t) return !!samples[last].speech;
    return !!samples[indexBefore(samples, t)].speech;
  }

  /* Drop samples older than cutoff (in place). Returns how many went. */
  function prune(samples, cutoff) {
    var n = 0;
    while (samples.length && samples[0].t < cutoff) { samples.shift(); n++; }
    return n;
  }

  return { BASE: BASE, clamp01: clamp01, indexBefore: indexBefore, levelAt: levelAt, kindAt: kindAt, prune: prune };
});

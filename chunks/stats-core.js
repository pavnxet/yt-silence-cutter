/* YT Silence Cutter — stats core.
   Pure, dependency-free analytics helpers. Loaded by the background worker
   (via importScripts), the stats page, and the Node test suite, so the maths
   that runs is exactly the maths that is tested.

   Author: Pavneet Singh (pavnxet) · MIT License
   https://github.com/pavnxet/yt-silence-cutter */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.YSCStats = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  /* Time saved by playing `silenceWallMs` of wall-clock silence at a rate
     `boost` times the user's base speed.
       content time covered = wall * boost
       time it would have taken at base speed = wall * boost
       saved = wall*boost - wall = wall*(boost-1)          (in base-seconds)
     Because the rate is base*boost, this is independent of the base speed. */
  function savedMs(silenceWallMs, boost) {
    var w = Number(silenceWallMs);
    var b = Number(boost);
    if (!isFinite(w) || !isFinite(b) || w <= 0 || b <= 1) return 0;
    return Math.round(w * (b - 1));
  }

  function blank() {
    return { savedMs: 0, silenceMs: 0, videos: 0, sessions: 0, boostSum: 0, boostN: 0, days: {}, updated: 0 };
  }

  function normalize(s) {
    var o = blank();
    if (s && typeof s === "object") {
      o.savedMs = +s.savedMs || 0;
      o.silenceMs = +s.silenceMs || 0;
      o.videos = +s.videos || 0;
      o.sessions = +s.sessions || 0;
      o.boostSum = +s.boostSum || 0;
      o.boostN = +s.boostN || 0;
      o.days = s.days && typeof s.days === "object" ? s.days : {};
      o.updated = +s.updated || 0;
    }
    return o;
  }

  function pad(n) {
    return (n < 10 ? "0" : "") + n;
  }

  function dayKey(ts) {
    var d = new Date(ts);
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  /* Fold one delta (a slice of activity) into a stats object. Pure. */
  function applyDelta(stats, delta, nowMs) {
    var s = normalize(stats);
    var d = delta || {};
    var saved = Math.round(+d.savedMs || 0);
    s.savedMs += saved;
    s.silenceMs += Math.round(+d.silenceMs || 0);
    s.videos += +d.videos || 0;
    s.sessions += +d.sessions || 0;
    if (+d.boost > 0) {
      s.boostSum += +d.boost;
      s.boostN += 1;
    }
    if (saved) {
      var k = dayKey(nowMs || Date.now());
      s.days[k] = (s.days[k] || 0) + saved;
    }
    s.updated = nowMs || Date.now();
    return s;
  }

  function avgBoost(stats) {
    var s = normalize(stats);
    return s.boostN ? s.boostSum / s.boostN : 0;
  }

  /* Per-day totals for the last `count` days, oldest first. */
  function seriesByDay(stats, count, nowMs) {
    var s = normalize(stats);
    var now = nowMs || Date.now();
    var out = [];
    for (var i = count - 1; i >= 0; i--) {
      var d = new Date(now);
      d.setDate(d.getDate() - i);
      var k = dayKey(d.getTime());
      out.push({ day: k, savedMs: s.days[k] || 0 });
    }
    return out;
  }

  /* Total saved over the last `days` days (inclusive of today). */
  function savedInLastDays(stats, days, nowMs) {
    var total = 0;
    seriesByDay(stats, days, nowMs).forEach(function (p) {
      total += p.savedMs;
    });
    return total;
  }

  function formatDuration(ms) {
    var total = Math.max(0, Math.round((+ms || 0) / 1000));
    var h = Math.floor(total / 3600);
    var m = Math.floor((total % 3600) / 60);
    var sec = total % 60;
    if (h) return h + "h " + m + "m";
    if (m) return m + "m " + sec + "s";
    return sec + "s";
  }

  return {
    savedMs: savedMs,
    blank: blank,
    normalize: normalize,
    dayKey: dayKey,
    applyDelta: applyDelta,
    avgBoost: avgBoost,
    seriesByDay: seriesByDay,
    savedInLastDays: savedInLastDays,
    formatDuration: formatDuration
  };
});

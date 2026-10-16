/* YT Silence Cutter — speech-guard core.
   Decides when a stream is quiet enough to fast-forward, leaving a guard band
   around speech so a high skip speed doesn't chew into word onsets.

   Three mechanisms:
     • lead-in  — quiet must last `enterMs` before the boost starts (exact).
     • lead-out — the boost is released on a *quieter* threshold than the one
                  that starts it (exitGuardDb below threshold), so it lets go
                  before the level actually reaches speech.
     • onset    — a sharp rise over a short window releases the boost at once,
                  catching the leading edge of a word.

   The lead-out is deliberately approximate: in real time there is no way to
   know speech is coming, so we exit early rather than late.

   Pure and dependency-free, so it runs unchanged in the browser and under Node.

   Author: Pavneet Singh (pavnxet) · MIT License
   https://github.com/pavnxet/yt-silence-cutter */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.YSCGuard = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function num(v, d) { v = Number(v); return isFinite(v) ? v : d; }

  /* Map the user-facing "speech guard" (ms) to exit sensitivity.
     Bigger guard -> exit on a quieter signal and arm the onset detector.
     Zero -> no guard at all (behaves like a plain threshold). */
  function paramsFor(guardMs) {
    var g = num(guardMs, 150);
    if (g <= 0) return { exitGuardDb: 0, riseDb: Infinity, riseWindowMs: 90 };
    return {
      exitGuardDb: Math.max(3, Math.min(12, Math.round(g / 40))),
      riseDb: 8,
      riseWindowMs: 90
    };
  }

  function create() {
    var quietSince = null; // when the current quiet run began (null = not quiet)
    var boosting = false;
    var hist = [];        // recent {t, db} for the onset detector

    function prune(now, win) {
      while (hist.length && hist[0].t < now - win) hist.shift();
    }
    function minRecent() {
      var m = Infinity;
      for (var i = 0; i < hist.length; i++) if (hist[i].db < m) m = hist[i].db;
      return m;
    }

    return {
      /* db: current level; thresholdDb: the silence line; now: clock.
         opts: { enterMs, exitGuardDb, riseDb, riseWindowMs } */
      step: function (db, thresholdDb, now, opts) {
        opts = opts || {};
        var enterMs = num(opts.enterMs, 350);
        var exitGuardDb = num(opts.exitGuardDb, 0);
        var riseDb = num(opts.riseDb, Infinity);
        var riseWindowMs = num(opts.riseWindowMs, 90);

        hist.push({ t: now, db: db });
        prune(now, riseWindowMs);

        var exitThr = thresholdDb - exitGuardDb;
        var rise = hist.length ? db - minRecent() : 0;

        if (boosting) {
          if (db >= exitThr || rise >= riseDb) {
            boosting = false;
            quietSince = null;
          }
        } else {
          if (db < thresholdDb) {
            if (quietSince === null) quietSince = now;
            if (now - quietSince >= enterMs) boosting = true;
          } else {
            quietSince = null;
          }
        }

        return { boost: boosting, quietSince: quietSince === null ? 0 : quietSince, rise: rise };
      },
      reset: function () { quietSince = null; boosting = false; hist = []; },
      isBoosting: function () { return boosting; }
    };
  }

  return { create: create, paramsFor: paramsFor };
});

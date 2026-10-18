/* YT Silence Cutter — speech-guard core.
   Decides when a stream is quiet enough to fast-forward, leaving a guard band
   around speech so a high skip speed doesn't chew into word onsets — without
   letting a brief blip inside a long silence break the skip into chunks.

   The boost is released only when EITHER:
     • the level actually reaches the silence line (`db >= thresholdDb`) — a
       sound that loud is not silence by the user's own definition; or
     • a genuine onset: the level has risen `riseDb` above the recent quiet
       floor *and* is meaningfully louder than that floor.

   Deliberately, the release threshold is NOT below the silence line. Sitting
   below it means any level between the two counts as "quiet enough to start"
   and "loud enough to stop", which makes the skip flap on room tone and breaks
   long silences into chunks.

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

  /* Map the user-facing "speech guard" (ms) to how eager the onset detector is.
     Bigger guard -> smaller rise needed -> releases earlier (more protection
     around word starts, but more willing to interrupt on brief sounds).
     Zero disables the onset detector entirely. */
  function paramsFor(guardMs) {
    var g = num(guardMs, 150);
    if (g <= 0) return { riseDb: Infinity, riseWindowMs: 90, floorMarginDb: 0 };
    return {
      riseDb: Math.max(11, Math.min(14, Math.round(14 - g / 150))),
      riseWindowMs: 90,
      floorMarginDb: 3
    };
  }

  function create() {
    var quietSince = null;   // when the current quiet run began
    var quietFloor = null;   // quietest level seen during that run
    var boosting = false;
    var hist = [];           // recent {t, db} for the onset detector

    function prune(now, win) {
      while (hist.length && hist[0].t < now - win) hist.shift();
    }
    function minRecent() {
      var m = Infinity;
      for (var i = 0; i < hist.length; i++) if (hist[i].db < m) m = hist[i].db;
      return m;
    }

    return {
      step: function (db, thresholdDb, now, opts) {
        opts = opts || {};
        var enterMs = num(opts.enterMs, 350);
        var riseDb = num(opts.riseDb, Infinity);
        var riseWindowMs = num(opts.riseWindowMs, 90);
        var floorMarginDb = num(opts.floorMarginDb, 0);

        hist.push({ t: now, db: db });
        prune(now, riseWindowMs);
        var rise = hist.length ? db - minRecent() : 0;

        if (boosting) {
          if (db >= thresholdDb ||
              (rise >= riseDb && quietFloor !== null && db >= quietFloor + floorMarginDb)) {
            boosting = false;
            quietSince = null;
            quietFloor = null;
          }
        } else {
          if (db < thresholdDb) {
            if (quietSince === null) { quietSince = now; quietFloor = db; }
            else if (db < quietFloor) quietFloor = db;
            if (now - quietSince >= enterMs) boosting = true;
          } else {
            quietSince = null;
            quietFloor = null;
          }
        }

        return {
          boost: boosting,
          quietSince: quietSince === null ? 0 : quietSince,
          rise: rise,
          floor: quietFloor
        };
      },
      reset: function () { quietSince = null; quietFloor = null; boosting = false; hist = []; },
      isBoosting: function () { return boosting; }
    };
  }

  return { create: create, paramsFor: paramsFor };
});

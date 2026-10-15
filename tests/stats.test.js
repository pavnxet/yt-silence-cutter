/* YT Silence Cutter — stats core test suite.
   Run:  node tests/stats.test.js
   Author: Pavneet Singh (pavnxet) · MIT License */
"use strict";

var S = require("../chunks/stats-core.js");

var pass = 0, fail = 0;
function eq(actual, expected, label) {
  var a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { pass++; console.log("  ok   " + label); }
  else { fail++; console.log("  FAIL " + label + "\n         expected " + e + "\n         got      " + a); }
}
function ok(cond, label) { eq(!!cond, true, label); }
function section(t) { console.log("\n" + t); }

/* ------------------------------------------------------------------ */
section("savedMs — against ground truth (content time, base, boost)");
/* Ground truth: a stretch of content silence of D ms, played at rate
   R = base*boost, instead of base.  wall = D/R ; saved = D/base - D/R. */
function truth(D, base, boost) {
  var R = base * boost;
  return Math.round(D / base - D / R);
}
[
  [10000, 1, 4],
  [10000, 2, 4],
  [10000, 1, 1.8],
  [3500, 1, 6],
  [60000, 1.5, 2],
  [800, 3, 4],
].forEach(function (c) {
  var D = c[0], base = c[1], boost = c[2];
  var wall = D / (base * boost);              // wall-clock ms spent in silence
  eq(S.savedMs(wall, boost), truth(D, base, boost),
     "D=" + D + " base=" + base + "x boost=" + boost + "x");
});

section("savedMs — edges");
eq(S.savedMs(1000, 1), 0, "boost of 1 saves nothing");
eq(S.savedMs(1000, 0.5), 0, "boost below 1 saves nothing");
eq(S.savedMs(0, 4), 0, "zero silence");
eq(S.savedMs(-500, 4), 0, "negative silence");
eq(S.savedMs(NaN, 4), 0, "NaN silence");
eq(S.savedMs(1000, NaN), 0, "NaN boost");

/* ------------------------------------------------------------------ */
section("applyDelta — accumulation");
var t0 = Date.UTC(2026, 0, 10, 12, 0, 0); // 2026-01-10
var s = S.blank();
s = S.applyDelta(s, { savedMs: 3000, silenceMs: 1000, videos: 1, sessions: 1, boost: 4 }, t0);
s = S.applyDelta(s, { savedMs: 2000, silenceMs: 500, videos: 1, sessions: 0, boost: 6 }, t0);
eq(s.savedMs, 5000, "saved accumulates");
eq(s.silenceMs, 1500, "silence accumulates");
eq(s.videos, 2, "videos accumulate");
eq(s.sessions, 1, "sessions accumulate");
eq(s.boostN, 2, "boost samples counted");
eq(s.boostSum, 10, "boost sum");
eq(S.avgBoost(s), 5, "average boost = 5x");
eq(s.days["2026-01-10"], 5000, "day bucket = 5000");

section("applyDelta — day bucketing across days");
var s2 = S.blank();
s2 = S.applyDelta(s2, { savedMs: 1000, boost: 4 }, Date.UTC(2026, 0, 9, 23, 0, 0));
s2 = S.applyDelta(s2, { savedMs: 4000, boost: 4 }, Date.UTC(2026, 0, 10, 1, 0, 0));
eq(s2.days["2026-01-09"], 1000, "day 1");
eq(s2.days["2026-01-10"], 4000, "day 2");
eq(s2.savedMs, 5000, "total across days");

section("applyDelta — empty / malformed deltas are safe");
var s3 = S.blank();
s3 = S.applyDelta(s3, {}, t0);
s3 = S.applyDelta(s3, null, t0);
s3 = S.applyDelta(s3, { savedMs: "abc", videos: undefined }, t0);
eq(s3.savedMs, 0, "junk saved ignored");
eq(s3.videos, 0, "junk videos ignored");
eq(s3.boostN, 0, "no boost sample from empty delta");

section("normalize — garbage in, zeroes out");
var n = S.normalize({ savedMs: "x", days: "nope", boostSum: null });
eq(n.savedMs, 0, "saved coerced");
eq(n.days, {}, "days coerced to object");
eq(n.boostSum, 0, "boostSum coerced");
eq(S.normalize(null).sessions, 0, "null -> blank");

/* ------------------------------------------------------------------ */
section("dayKey");
eq(S.dayKey(Date.UTC(2026, 0, 5)), "2026-01-05", "zero-padded month/day");
eq(S.dayKey(new Date(2026, 11, 31, 10, 0, 0).getTime()), "2026-12-31", "year end");

section("seriesByDay — window and ordering");
var s4 = S.blank();
var now = new Date(2026, 0, 10, 12, 0, 0).getTime();
s4 = S.applyDelta(s4, { savedMs: 500, boost: 4 }, new Date(2026, 0, 10, 9, 0, 0).getTime());
s4 = S.applyDelta(s4, { savedMs: 700, boost: 4 }, new Date(2026, 0, 8, 9, 0, 0).getTime());
var series = S.seriesByDay(s4, 5, now);
eq(series.length, 5, "5 points");
eq(series[0].day, "2026-01-06", "oldest first");
eq(series[4].day, "2026-01-10", "newest last");
eq(series[4].savedMs, 500, "today's value");
eq(series[2].savedMs, 700, "two days ago value");
eq(series[1].savedMs, 0, "empty day is zero");

section("savedInLastDays");
eq(S.savedInLastDays(s4, 1, now), 500, "last 1 day = today only");
eq(S.savedInLastDays(s4, 3, now), 1200, "last 3 days = Jan 8 + today");
eq(S.savedInLastDays(s4, 5, now), 1200, "last 5 days = both");
eq(S.savedInLastDays(s4, 2, now), 500, "last 2 days excludes Jan 8");

section("formatDuration");
eq(S.formatDuration(0), "0s", "0");
eq(S.formatDuration(45000), "45s", "seconds");
eq(S.formatDuration(125000), "2m 5s", "minutes");
eq(S.formatDuration(3 * 3600e3 + 12 * 60e3), "3h 12m", "hours");
eq(S.formatDuration(-100), "0s", "negative clamps");

/* ------------------------------------------------------------------ */
console.log("\n" + (fail === 0 ? "PASS" : "FAIL") + " — " + pass + " passed, " + fail + " failed");
process.exit(fail === 0 ? 0 : 1);

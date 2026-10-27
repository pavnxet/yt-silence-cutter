/* YT Silence Cutter — value core test suite.
   Verifies the clamping that lets users type arbitrary custom values safely.
   Run:  node tests/value.test.js
   Author: Pavneet Singh (pavnxet) · MIT License */
"use strict";

var V = require("../chunks/value-core.js");

var pass = 0, fail = 0;
function eq(a, e, label) {
  var A = JSON.stringify(a), E = JSON.stringify(e);
  if (A === E) { pass++; console.log("  ok   " + label); }
  else { fail++; console.log("  FAIL " + label + "\n         expected " + E + "\n         got      " + A); }
}
function ok(c, l) { eq(!!c, true, l); }
function section(t) { console.log("\n" + t); }

section("clampNum — accepts custom values inside the range");
eq(V.clampNum(1.37, 0.25, 4, null), 1.37, "1.37 is allowed as typed");
eq(V.clampNum("5.25", 1, 10, null), 5.25, "numeric strings are accepted");
eq(V.clampNum(-47.5, -80, -10, null), -47.5, "fractional dB is allowed");
eq(V.clampNum(175, 0, 2000, null), 175, "custom ms is allowed");

section("clampNum — clamps out-of-range");
eq(V.clampNum(9, 0.25, 4, null), 4, "above max clamps to max");
eq(V.clampNum(0.1, 0.25, 4, null), 0.25, "below min clamps to min");
eq(V.clampNum(-200, -80, -10, null), -80, "very low dB clamps");
eq(V.clampNum(99999, 0, 2000, null), 2000, "huge ms clamps");

section("clampNum — rejects junk");
eq(V.clampNum("abc", 0.25, 4, null), null, "letters -> fallback");
eq(V.clampNum("", 0.25, 4, null), null, "empty -> fallback");
eq(V.clampNum(null, 0.25, 4, null), null, "null -> fallback");
eq(V.clampNum(undefined, 0.25, 4, null), null, "undefined -> fallback");
eq(V.clampNum(Infinity, 0.25, 4, null), null, "Infinity -> fallback");
eq(V.clampNum(NaN, 0.25, 4, null), null, "NaN -> fallback");
eq(V.clampNum("abc", 0.25, 4, 1), 1, "junk uses the supplied fallback");

section("safeRate — never exceeds the browser ceiling");
eq(V.safeRate(1, 4), 4, "1x base with 4x boost = 4x");
eq(V.safeRate(1.5, 6), 9, "1.5x with 6x boost = 9x");
eq(V.safeRate(2, 5), 10, "2x with 5x = 10x");
eq(V.safeRate(4, 10), 16, "4x with 10x is capped at 16x");
eq(V.safeRate(4, 8), 16, "4x with 8x is capped at 16x");
ok(V.safeRate(4, 10) <= V.MAX_RATE, "never above MAX_RATE");
ok(V.safeRate(0.25, 1) >= V.MIN_RATE, "never below MIN_RATE");
eq(V.safeRate("abc", 4), 4, "junk base falls back to 1x");
eq(V.safeRate(1, 999), 10, "absurd boost clamps to 10x first");

section("sanitize — clamps a whole settings object");
var s = V.sanitize({ playbackSpeed: 9, silenceSpeed: 99, thresholdDb: -5, guardMs: 99999, enabled: false });
eq(s.playbackSpeed, 4, "playbackSpeed clamped");
eq(s.silenceSpeed, 10, "silenceSpeed clamped");
eq(s.thresholdDb, -10, "thresholdDb clamped");
eq(s.guardMs, 2000, "guardMs clamped");
eq(s.enabled, false, "unrelated keys pass through");
eq(V.sanitize({}).playbackSpeed, 1, "missing values get defaults");
eq(V.sanitize({}).silenceSpeed, 4, "silenceSpeed default");
eq(V.sanitize({}).thresholdDb, -45, "thresholdDb default");
eq(V.sanitize({}).guardMs, 150, "guardMs default");

section("ranges are sane");
eq(V.RANGES.playbackSpeed, [0.25, 4], "playback range");
eq(V.RANGES.silenceSpeed, [1, 10], "boost range");
eq(V.RANGES.thresholdDb, [-80, -10], "sensitivity range");
eq(V.RANGES.guardMs, [0, 2000], "guard range");

console.log("\n" + (fail === 0 ? "PASS" : "FAIL") + " — " + pass + " passed, " + fail + " failed");
process.exit(fail === 0 ? 0 : 1);

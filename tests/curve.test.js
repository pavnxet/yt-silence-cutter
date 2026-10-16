/* YT Silence Cutter — curve core test suite.
   Verifies the interpolation that makes the popup waveform smooth.
   Run:  node tests/curve.test.js
   Author: Pavneet Singh (pavnxet) · MIT License */
"use strict";

var C = require("../chunks/curve-core.js");

var pass = 0, fail = 0;
function eq(a, e, label) {
  var A = JSON.stringify(a), E = JSON.stringify(e);
  if (A === E) { pass++; console.log("  ok   " + label); }
  else { fail++; console.log("  FAIL " + label + "\n         expected " + E + "\n         got      " + A); }
}
function ok(c, l) { eq(!!c, true, l); }
function near(a, e, tol, l) { eq(Math.abs(a - e) <= tol, true, l + " (" + a.toFixed(4) + " ≈ " + e + ")"); }
function section(t) { console.log("\n" + t); }

function sample(t, level, kind) { return { t: t, level: level, kind: kind == null ? 0 : kind }; }

/* ------------------------------------------------------------------ */
section("clamp01");
eq(C.clamp01(0.5), 0.5, "in range");
eq(C.clamp01(-1), 0, "negative clamps");
eq(C.clamp01(2), 1, "above one clamps");
eq(C.clamp01("nope"), 0, "junk clamps to 0");

section("indexBefore");
var s1 = [sample(0, 0), sample(100, 0), sample(200, 0)];
eq(C.indexBefore(s1, -1), -1, "before first");
eq(C.indexBefore(s1, 0), 0, "exactly first");
eq(C.indexBefore(s1, 50), 0, "between first and second");
eq(C.indexBefore(s1, 100), 1, "exactly second");
eq(C.indexBefore(s1, 999), 2, "after last");
eq(C.indexBefore([], 5), -1, "empty");

section("levelAt — edges");
eq(C.levelAt([], 0, 0.02), 0.02, "empty returns base");
eq(C.levelAt(null, 0), C.BASE, "null returns default base");
eq(C.levelAt([sample(100, 0.8, true)], 0), 0.8, "before first holds first");
eq(C.levelAt([sample(100, 0.8, true)], 500), 0.8, "after last holds last");

section("levelAt — interpolation");
var s2 = [sample(0, 0, false), sample(100, 1, true)];
near(C.levelAt(s2, 0), 0, 1e-9, "t=0 -> 0");
near(C.levelAt(s2, 100), 1, 1e-9, "t=100 -> 1");
near(C.levelAt(s2, 50), 0.5, 1e-9, "t=50 -> midpoint 0.5");
near(C.levelAt(s2, 25), 0.25, 1e-9, "t=25 -> quarter");
near(C.levelAt(s2, 75), 0.75, 1e-9, "t=75 -> three quarters");
var s3 = [sample(0, 1, true), sample(100, 0, false)];
near(C.levelAt(s3, 50), 0.5, 1e-9, "descending midpoint");

section("levelAt — many samples, exact hits");
var many = [];
for (var i = 0; i < 100; i++) many.push(sample(i * 60, (i % 10) / 10, i % 2 === 0));
for (var j = 0; j < 100; j++) {
  near(C.levelAt(many, j * 60), (j % 10) / 10, 1e-9, "exact sample " + j);
}

section("kindAt — 0 protected, 1 speech, 2 skipped");
var s4 = [sample(0, 0, 0), sample(100, 1, 1)];
eq(C.kindAt(s4, 10), 0, "before the speech sample -> protected");
eq(C.kindAt(s4, 100), 1, "at the speech sample -> speech");
eq(C.kindAt(s4, 200), 1, "after -> holds last");
eq(C.kindAt([], 0), 0, "empty -> protected (default)");
eq(C.kindAt([], 0, 2), 2, "empty honours the fallback");
var s4b = [sample(0, 0, 0), sample(100, 0, 2), sample(200, 1, 1)];
eq(C.kindAt(s4b, 150), 2, "skipped region reads as skipped");
eq(C.kindAt(s4b, 250), 1, "back to speech");

section("prune");
var s5 = [sample(0, 0), sample(100, 0), sample(200, 0), sample(300, 0)];
eq(C.prune(s5, 150), 2, "removes the two oldest");
eq(s5.length, 2, "two left");
eq(s5[0].t, 200, "oldest now 200");

/* The whole point: no per-message jumps. Feed a deliberately spiky series
   and step the clock in 1 ms increments — the drawn value must never jump. */
section("smoothness — no visible steps between samples");
var spiky = [];
for (var k = 0; k < 60; k++) {
  var lvl = (k % 2 === 0) ? 0.05 : 0.95;      // worst case: alternating
  spiky.push(sample(k * 60, lvl, k % 2 === 0));
}
var maxStep = 0, prev = null;
for (var ms = 0; ms <= 59 * 60; ms += 1) {
  var v = C.levelAt(spiky, ms);
  if (prev !== null) maxStep = Math.max(maxStep, Math.abs(v - prev));
  prev = v;
}
ok(maxStep < 0.02, "max 1ms step is tiny (" + maxStep.toFixed(4) + " < 0.02) — motion is continuous");

section("smoothness — value stays bounded");
var bounded = true;
for (var ms2 = 0; ms2 <= 4000; ms2 += 7) {
  var v2 = C.levelAt(spiky, ms2);
  if (!(v2 >= 0 && v2 <= 1)) { bounded = false; break; }
}
ok(bounded, "interpolated value always within [0,1]");

console.log("\n" + (fail === 0 ? "PASS" : "FAIL") + " — " + pass + " passed, " + fail + " failed");
process.exit(fail === 0 ? 0 : 1);

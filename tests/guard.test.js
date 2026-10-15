/* YT Silence Cutter — speech-guard core test suite.
   Run:  node tests/guard.test.js
   Author: Pavneet Singh (pavnxet) · MIT License */
"use strict";

var G = require("../chunks/guard-core.js");

var pass = 0, fail = 0;
function eq(a, e, label) {
  var A = JSON.stringify(a), E = JSON.stringify(e);
  if (A === E) { pass++; console.log("  ok   " + label); }
  else { fail++; console.log("  FAIL " + label + "\n         expected " + E + "\n         got      " + A); }
}
function ok(c, l) { eq(!!c, true, l); }
function section(t) { console.log("\n" + t); }

var THR = -45;

/* Drive a guard over a dB signal sampled every `frameMs`. Returns the last
   time the boost was on. */
function lastBoost(signal, opts, frameMs) {
  var g = G.create(), last = -1;
  for (var i = 0; i < signal.length; i++) {
    if (g.step(signal[i], THR, i * frameMs, opts).boost) last = i * frameMs;
  }
  return last;
}
function firstBoost(signal, opts, frameMs) {
  var g = G.create();
  for (var i = 0; i < signal.length; i++) {
    if (g.step(signal[i], THR, i * frameMs, opts).boost) return i * frameMs;
  }
  return -1;
}

/* silence -> consonant ramp -> speech */
function speechSignal() {
  var sig = [];
  for (var t = 0; t < 2600; t += 10) {
    if (t < 2000) sig.push(-60);
    else if (t < 2200) sig.push(-60 + 40 * (t - 2000) / 200);
    else sig.push(-20);
  }
  return sig;
}

/* ------------------------------------------------------------------ */
section("paramsFor — maps the ms slider to exit sensitivity");
eq(G.paramsFor(0), { exitGuardDb: 0, riseDb: Infinity, riseWindowMs: 90 }, "0 ms disables the guard");
eq(G.paramsFor(150).exitGuardDb, 6, "150 ms -> 6 dB");
eq(G.paramsFor(300).exitGuardDb, 12, "300 ms -> 12 dB");
eq(G.paramsFor(600).exitGuardDb, 12, "600 ms capped at 12 dB");
eq(G.paramsFor(50).exitGuardDb, 3, "small guard floored at 3 dB");
eq(G.paramsFor(undefined).exitGuardDb, 6, "undefined defaults to 150 ms");
ok(G.paramsFor(150).riseDb < Infinity, "guard arms the onset detector");

section("lead-in — quiet must persist before boosting");
var quiet = [];
for (var q = 0; q < 3000; q += 10) quiet.push(-60);
var opt = { enterMs: 350, exitGuardDb: 6, riseDb: 8, riseWindowMs: 90 };
eq(firstBoost(quiet, opt, 10), 350, "boost starts exactly after enterMs");
eq(firstBoost(quiet, { enterMs: 350, exitGuardDb: 0, riseDb: Infinity, riseWindowMs: 90 }, 10), 350, "lead-in unaffected by the exit guard");

section("short quiet does not boost");
var shortQuiet = [];
for (var s = 0; s < 1000; s += 10) shortQuiet.push(s < 200 ? -60 : -20);
eq(firstBoost(shortQuiet, opt, 10), -1, "200 ms of quiet is below the 350 ms lead-in");

section("exit — immediate when the level reaches the threshold");
var g1 = G.create();
eq(g1.step(-60, THR, 0, opt).boost, false, "quiet, not boosting yet");
for (var a = 10; a <= 350; a += 10) g1.step(-60, THR, a, opt);
eq(g1.step(-60, THR, 360, opt).boost, true, "boosting after the lead-in");
eq(g1.step(-44, THR, 370, opt).boost, false, "a frame above the threshold stops it");

section("exit — early, on the quieter guard threshold");
var g2 = G.create();
for (var b = 0; b <= 360; b += 10) g2.step(-60, THR, b, opt);
eq(g2.step(-50, THR, 370, opt).boost, false, "-50 (below threshold, above guard) already releases");
var g3 = G.create();
for (var c = 0; c <= 360; c += 10) g3.step(-60, THR, c, opt);
eq(g3.step(-55, THR, 370, opt).boost, true, "-55 is below the guard threshold and a small change, so still boosting");

section("exit — on a sharp rise (word onset)");
var g4 = G.create();
for (var d = 0; d <= 360; d += 10) g4.step(-60, THR, d, opt);
eq(g4.step(-59, THR, 370, opt).boost, true, "still quiet");
var st = g4.step(-52, THR, 380, opt);   // +7 dB in one frame, and above the guard
eq(st.boost, false, "a sudden rise releases the boost");

section("reset");
var g5 = G.create();
for (var e = 0; e <= 360; e += 10) g5.step(-60, THR, e, opt);
eq(g5.isBoosting(), true, "boosting before reset");
g5.reset();
eq(g5.isBoosting(), false, "reset clears the boost");

/* The headline behaviour: the guard must end the fast-forward earlier. */
section("behaviour — the guard ends the boost earlier on a speech onset");
var sig = speechSignal();
var withGuard = lastBoost(sig, opt, 10);
var noGuard = lastBoost(sig, { enterMs: 350, exitGuardDb: 0, riseDb: Infinity, riseWindowMs: 90 }, 10);
ok(withGuard < noGuard, "guard releases earlier (" + withGuard + "ms vs " + noGuard + "ms)");
ok(withGuard < 2200, "guard never boosts into full speech (" + withGuard + " < 2200)");
ok(noGuard <= 2200, "unguarded also stops before full speech here (" + noGuard + ")");
ok(noGuard - withGuard >= 10, "guard buys at least 10ms of lead (" + (noGuard - withGuard) + "ms)");

console.log("\n" + (fail === 0 ? "PASS" : "FAIL") + " — " + pass + " passed, " + fail + " failed");
process.exit(fail === 0 ? 0 : 1);

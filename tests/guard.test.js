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
var opt = { enterMs: 350, riseDb: G.paramsFor(150).riseDb, riseWindowMs: 90, floorMarginDb: 3 };

function firstBoost(sig, o, frameMs) {
  var g = G.create();
  for (var i = 0; i < sig.length; i++) if (g.step(sig[i], THR, i * frameMs, o).boost) return i * frameMs;
  return -1;
}
function lastBoost(sig, o, frameMs) {
  var g = G.create(), last = -1;
  for (var i = 0; i < sig.length; i++) if (g.step(sig[i], THR, i * frameMs, o).boost) last = i * frameMs;
  return last;
}
function flips(sig, o, frameMs) {
  var g = G.create(), prev = false, n = 0;
  for (var i = 0; i < sig.length; i++) {
    var b = g.step(sig[i], THR, i * frameMs, o).boost;
    if (b !== prev) n++;
    prev = b;
  }
  return n;
}
function hold(sig, level, frameMs) { for (var i = 0; i < sig.length; i++) sig.push(level); return sig; }
function repeat(sig, level, ms, frameMs) { for (var i = 0; i < ms / frameMs; i++) sig.push(level); return sig; }

/* ------------------------------------------------------------------ */
section("paramsFor — maps the ms slider to onset sensitivity");
eq(G.paramsFor(0), { riseDb: Infinity, riseWindowMs: 90, floorMarginDb: 0 }, "0 ms disables the onset detector");
eq(G.paramsFor(150).riseDb, 13, "150 ms -> 13 dB");
eq(G.paramsFor(300).riseDb, 12, "300 ms -> 12 dB");
eq(G.paramsFor(600).riseDb, 11, "600 ms -> 11 dB (still tolerant)");
eq(G.paramsFor(undefined).riseDb, 13, "undefined defaults to 150 ms");
ok(G.paramsFor(150).riseDb >= 11 && G.paramsFor(600).riseDb >= 11, "every setting tolerates an 11 dB blip");
eq(G.paramsFor(150).floorMarginDb, 3, "onset must clear the floor");

section("lead-in — quiet must persist before boosting");
var quiet = hold([], -60, 10);
repeat(quiet, -60, 3000, 10);
eq(firstBoost(quiet, opt, 10), 350, "boost starts exactly after enterMs");

section("short quiet does not boost");
var shortQ = [];
repeat(shortQ, -60, 200, 10); repeat(shortQ, -20, 800, 10);
eq(firstBoost(shortQ, opt, 10), -1, "200 ms of quiet is below the 350 ms lead-in");

section("release — reaching the silence line");
var g1 = G.create();
for (var a = 0; a <= 360; a += 10) g1.step(-60, THR, a, opt);
eq(g1.step(-60, THR, 370, opt).boost, true, "boosting after the lead-in");
eq(g1.step(-44, THR, 380, opt).boost, false, "a frame above the silence line releases it");

section("no release below the silence line (the chunking fix)");
var g2 = G.create();
for (var b = 0; b <= 360; b += 10) g2.step(-60, THR, b, opt);
eq(g2.step(-50, THR, 370, opt).boost, true, "-50 is still below the line, so it keeps skipping");
eq(g2.step(-48, THR, 380, opt).boost, true, "-48 is below both the line and the onset threshold, so it keeps skipping");

section("release — on a genuine onset (a big rise above the floor)");
var g3 = G.create();
for (var c = 0; c <= 360; c += 10) g3.step(-60, THR, c, opt);
eq(g3.step(-59, THR, 370, opt).boost, true, "still quiet");
eq(g3.step(-42, THR, 380, opt).boost, false, "an 18 dB rise releases it even before the line");

section("reset");
var g4 = G.create();
for (var d = 0; d <= 360; d += 10) g4.step(-60, THR, d, opt);
eq(g4.isBoosting(), true, "boosting before reset");
g4.reset();
eq(g4.isBoosting(), false, "reset clears the boost");

/* The headline behaviour: a long silence with brief sounds inside it must not
   be broken into chunks. */
section("behaviour — a long silence with periodic brief sounds stays one run");
function blipSignal(floorDb, blipDb, blipMs, everyMs, totalMs, frameMs) {
  var sig = [];
  repeat(sig, -25, 1000, frameMs);                       // speech first
  var t = 0;
  while (t < totalMs) {
    repeat(sig, blipDb, blipMs, frameMs);
    t += blipMs;
    var gap = Math.min(everyMs - blipMs, totalMs - t);
    repeat(sig, floorDb, gap, frameMs);
    t += gap;
  }
  return sig;
}
var blips = blipSignal(-58, -48, 300, 2500, 12000, 5);   // 10 dB above the floor
eq(flips(blips, opt, 5), 1, "one single boost run (no chunking)");
ok(lastBoost(blips, opt, 5) > 10000, "the boost runs to the end of the silence");

var louder = blipSignal(-58, -44, 300, 2500, 12000, 5);  // above the silence line
ok(flips(louder, opt, 5) > 1, "a sound above the silence line DOES break the run (correct)");

section("behaviour — the guard still releases before a word arrives");
function onsetSignal() {
  var sig = [];
  repeat(sig, -58, 2000, 10);
  for (var i = 0; i < 15; i++) sig.push(-58 + 40 * i / 15);
  repeat(sig, -20, 1000, 10);
  return sig;
}
var on = onsetSignal();
ok(lastBoost(on, opt, 10) < 2200, "released before full speech (" + lastBoost(on, opt, 10) + "ms)");

console.log("\n" + (fail === 0 ? "PASS" : "FAIL") + " — " + pass + " passed, " + fail + " failed");
process.exit(fail === 0 ? 0 : 1);

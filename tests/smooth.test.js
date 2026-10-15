/* YT Silence Cutter — live-audio smoothing test suite.
   Exercises the SAME configuration the content script uses:
   YSCSmooth.create({ holdMs: 300 })  (asymmetric EMA defaults).
   Run:  node tests/smooth.test.js
   Author: Pavneet Singh (pavnxet) · MIT License */
"use strict";

var M = require("../chunks/smooth-core.js");

var pass = 0, fail = 0;
function eq(a, e, label) {
  var A = JSON.stringify(a), E = JSON.stringify(e);
  if (A === E) { pass++; console.log("  ok   " + label); }
  else { fail++; console.log("  FAIL " + label + "\n         expected " + E + "\n         got      " + A); }
}
function ok(c, l) { eq(!!c, true, l); }
function section(t) { console.log("\n" + t); }

var FRAME = 60;    // ms between readings (matches the content script)
var THRESH = -45;  // silence threshold in dB
var SHIPPED = { holdMs: 300 };

/* Synthetic dB track: steady speech ~-22 dB with periodic dips to -50 dB
   (the "small breaks" the user reported inside continuous speech). */
function speechWithDips(frames, dipEvery, dipLen) {
  var out = [];
  for (var i = 0; i < frames; i++) {
    if (i > 5 && i % dipEvery === 0) {
      for (var k = 0; k < dipLen && i + k < frames; k++) out.push(-50);
      i += dipLen - 1;
    } else {
      out.push(-22 + (i % 3) * 1.5);
    }
  }
  return out;
}

function run(track) {
  var t = 0, rawSilent = 0, smSilent = 0, sm = [], raw = [];
  var s = M.create(SHIPPED);
  track.forEach(function (db) {
    if (db < THRESH) rawSilent++;
    raw.push(Math.max(0, Math.min(1, (db + 60) / 50)));
    var r = s.step(db, THRESH, t);
    if (r.silent) smSilent++;
    sm.push(r.level);
    t += FRAME;
  });
  return { rawSilent: rawSilent, smSilent: smSilent, raw: raw, sm: sm };
}

function variance(a) {
  var m = a.reduce(function (x, y) { return x + y; }, 0) / a.length;
  return a.reduce(function (x, y) { return x + (y - m) * (y - m); }, 0) / a.length;
}

/* ------------------------------------------------------------------ */
section("continuous speech with 1-frame dips (the reported problem)");
var r1 = run(speechWithDips(180, 12, 1));
ok(r1.rawSilent > 0, "raw reading DOES flicker to silence (" + r1.rawSilent + " frames)");
eq(r1.smSilent, 0, "smoothed reading shows NO breaks in continuous speech");

section("continuous speech with 2-frame dips");
var r2 = run(speechWithDips(180, 15, 2));
ok(r2.rawSilent > 0, "raw still flickers (" + r2.rawSilent + " frames)");
eq(r2.smSilent, 0, "smoothed still clean");

section("continuous speech with 3-frame (180ms) dips");
eq(run(speechWithDips(200, 18, 3)).smSilent, 0, "smoothed absorbs 180ms dips");

section("a real silence IS still detected");
var track = [], i;
for (i = 0; i < 30; i++) track.push(-22);   // speech
for (i = 0; i < 60; i++) track.push(-62);   // 3.6s of true silence
var s4 = M.create(SHIPPED), at = -1, t = 0;
track.forEach(function (db) {
  if (s4.step(db, THRESH, t).silent && at < 0) at = t;
  t += FRAME;
});
ok(at >= 30 * FRAME, "silence only registered after speech ended (" + at + "ms)");
ok(at > 0 && at < 30 * FRAME + 1000, "silence registered within ~1s of onset");

section("speech onset clears the silence flag with one loud frame (fast attack)");
var s5 = M.create(SHIPPED);
for (i = 0; i < 40; i++) s5.step(-62, THRESH, i * FRAME);
eq(s5.step(-15, THRESH, 40 * FRAME).silent, false, "one loud frame ends the silent state");

section("attack responds faster than release");
var sUp = M.create(SHIPPED); sUp.step(-60, THRESH, 0);
var rise = sUp.step(-20, THRESH, FRAME).smoothed - (-60);
var sDn = M.create(SHIPPED); sDn.step(-20, THRESH, 0);
var fall = (-20) - sDn.step(-60, THRESH, FRAME).smoothed;
ok(rise > fall, "attack step (" + rise.toFixed(1) + ") > release step (" + fall.toFixed(1) + ")");

section("smoothing reduces jitter");
ok(variance(r1.sm) < variance(r1.raw), "smoothed level variance < raw variance");

section("level mapping is (db+60)/50 clamped");
var s6 = M.create({ alpha: 1, holdMs: 300 });   // alpha 1 = pass-through
eq(s6.step(-10, THRESH, 0).level, 1, "-10 dB clamps to 1");
eq(s6.step(-60, THRESH, 0).level, 0, "-60 dB maps to 0");
eq(s6.step(-35, THRESH, 0).level, 0.5, "-35 dB maps to 0.5");

section("reset clears state");
var s7 = M.create(SHIPPED);
for (i = 0; i < 40; i++) s7.step(-62, THRESH, i * FRAME);
s7.reset();
eq(s7.step(-20, THRESH, 0).silent, false, "after reset, a loud frame is not silent");

console.log("\n" + (fail === 0 ? "PASS" : "FAIL") + " — " + pass + " passed, " + fail + " failed");
process.exit(fail === 0 ? 0 : 1);

/* YT Silence Cutter — engine test.
   Runs the real content script in headless Chromium against a stubbed Web Audio
   analyser that emits a scripted silence -> ramp -> speech signal, then checks
   that the speech guard stops the fast-forward before speech arrives.

   Skips (exit 0) if no Chromium is available.

   Run:  node tests/engine.test.js
   Author: Pavneet Singh (pavnxet) · MIT License */
"use strict";

var fs = require("fs"), os = require("os"), path = require("path"), cp = require("child_process");

var ROOT = path.join(__dirname, "..");

// Split so the literal tag never appears in source (keeps HTML parsers and
// naive payload filters happy).
var S_OPEN = "<" + "script>";
var S_CLOSE = "<" + "/script>";
var pass = 0, fail = 0;
function ok(c, l) {
  if (c) { pass++; console.log("  ok   " + l); }
  else { fail++; console.log("  FAIL " + l); }
}
function section(t) { console.log("\n" + t); }

function chromeBin() {
  var cands = ["chromium", "chromium-browser", "google-chrome", "/usr/local/bin/chromium", "/usr/bin/chromium"];
  for (var i = 0; i < cands.length; i++) {
    try { cp.execSync(cands[i] + " --version", { stdio: "ignore" }); return cands[i]; } catch (e) {}
  }
  return null;
}

var BIN = chromeBin();
if (!BIN) { console.log("SKIP — no Chromium found; engine test not run"); process.exit(0); }

function harness(settings) {
  var smooth = fs.readFileSync(path.join(ROOT, "chunks/smooth-core.js"), "utf8");
  var guard = fs.readFileSync(path.join(ROOT, "chunks/guard-core.js"), "utf8");
  var cjs = fs.readFileSync(path.join(ROOT, "content-scripts/content.js"), "utf8");
  return [
    '<!DOCTYPE html><html><head><meta charset="utf-8"><title>x</title></head><body>',
    S_OPEN,
    'window.__log=[];',
    'function dbAt(t){ if(t<2000) return -70; if(t<2200) return -70 + 50*(t-2000)/200; return -20; }',
    'window.AudioContext=function(){ return {',
    '  state:"running", resume:function(){return Promise.resolve();}, destination:{},',
    '  createMediaElementSource:function(v){ return {connect:function(){}}; },',
    '  createAnalyser:function(){ return { fftSize:512, connect:function(){},',
    '    getFloatTimeDomainData:function(buf){ var a=Math.pow(10,dbAt(performance.now())/20); for(var i=0;i<buf.length;i++) buf[i]=a; } }; }',
    '};};',
    'var video=document.createElement("video"); document.body.appendChild(video);',
    'var _rate=1, log=window.__log;',
    'Object.defineProperty(video,"playbackRate",{get:function(){return _rate;},set:function(v){_rate=v;log.push([Math.round(performance.now()),v]);}});',
    '["paused","muted","ended"].forEach(function(k){Object.defineProperty(video,k,{get:function(){return false;}});});',
    'Object.defineProperty(video,"currentSrc",{get:function(){return "stub";}});',
    'window.chrome={runtime:{id:"t",getURL:function(p){return p;},sendMessage:function(){return Promise.resolve();},onMessage:{addListener:function(){}}},',
    ' storage:{local:{get:function(k){var d={settings:' + JSON.stringify(settings) + '};return Promise.resolve(k?{[k]:d[k]}:d);},set:function(){return Promise.resolve();}},',
    ' onChanged:{addListener:function(){},removeListener:function(){}}}};',
    S_CLOSE,
    S_OPEN + smooth + S_CLOSE,
    S_OPEN + guard + S_CLOSE,
    S_OPEN + cjs + S_CLOSE,
    S_OPEN,
    'setTimeout(function(){',
    '  var b=window.__log.filter(function(e){return e[1]>1;}).map(function(e){return e[0];});',
    '  var base=window.__log.filter(function(e){return e[1]<=1;}).map(function(e){return e[0];}).filter(function(t){return t>1000;});',
    '  var maxr=window.__log.reduce(function(m,e){return Math.max(m,e[1]);},0);',
    '  document.title="NBOOST="+b.length+" FIRSTBASE="+(base.length?base[0]:-1)+" MAXRATE="+maxr;',
    '},2600);',
    S_CLOSE,
    '</body></html>'
  ].join("\n");
}

function run(settings) {
  var f = path.join(os.tmpdir(), "ysc-engine-" + JSON.stringify(settings).replace(/[^a-z0-9]/gi, "") + ".html");
  fs.writeFileSync(f, harness(settings));
  var out = cp.execSync(
    BIN + " --headless=new --no-sandbox --disable-gpu --virtual-time-budget=4000 --dump-dom file://" + f,
    { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 64 * 1024 * 1024 }
  );
  var m = out.match(/<title>([^<]*)<\/title>/);
  if (!m) return null;
  var res = {};
  m[1].split(" ").forEach(function (kv) {
    var p = kv.split("=");
    if (p.length === 2) res[p[0]] = Number(p[1]);
  });
  return res;
}

/* ------------------------------------------------------------------ */
section("content script — real skip decisions in Chromium");

var BASE = { enabled: true, playbackSpeed: 1, silenceSpeed: 8, thresholdDb: -45, minSilenceMs: 350 };
var guarded = run(Object.assign({}, BASE, { guardMs: 150 }));
var bare = run(Object.assign({}, BASE, { guardMs: 0 }));
var hot = run(Object.assign({}, BASE, { playbackSpeed: 4, silenceSpeed: 10, guardMs: 150 }));

ok(guarded !== null, "guarded run produced a result");
ok(bare !== null, "unguarded run produced a result");

if (guarded && bare) {
  // The speech onset is pinned at 2000ms on the same clock in both runs, so the
  // "returned to base" time is directly comparable across the two runs.
  ok(guarded.NBOOST >= 1, "the guard run actually boosted (NBOOST=" + guarded.NBOOST + ")");
  ok(guarded.FIRSTBASE > 1000, "guarded: returned to base at " + guarded.FIRSTBASE + "ms");
  ok(bare.FIRSTBASE > 1000, "unguarded: returned to base at " + bare.FIRSTBASE + "ms");
  ok(guarded.FIRSTBASE < 2200, "guarded: stops before full speech (" + guarded.FIRSTBASE + " < 2200)");
  ok(bare.FIRSTBASE < 2200, "unguarded: stops before full speech too (" + bare.FIRSTBASE + ")");
  ok(guarded.FIRSTBASE < bare.FIRSTBASE,
     "guard releases earlier than no guard (" + guarded.FIRSTBASE + "ms vs " + bare.FIRSTBASE + "ms)");
  ok(bare.FIRSTBASE - guarded.FIRSTBASE >= 15,
     "guard buys real lead (" + (bare.FIRSTBASE - guarded.FIRSTBASE) + "ms)");
}

section("engine — a custom base x boost cannot exceed the browser ceiling");
ok(hot !== null, "high-setting run produced a result");
if (hot) {
  ok(hot.MAXRATE <= 16, "max playback rate stays at or below 16x (got " + hot.MAXRATE + "x)");
  ok(hot.MAXRATE > 1, "it still boosted at all (" + hot.MAXRATE + "x)");
}

console.log("\n" + (fail === 0 ? "PASS" : "FAIL") + " — " + pass + " passed, " + fail + " failed");
process.exit(fail === 0 ? 0 : 1);

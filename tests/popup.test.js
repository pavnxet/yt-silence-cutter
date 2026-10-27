/* YT Silence Cutter — popup custom-value test.
   Loads the real popup in headless Chromium, types custom values into each
   number box, and checks they reach storage (and that junk is rejected).

   Skips (exit 0) if no Chromium is available.

   Run:  node tests/popup.test.js
   Author: Pavneet Singh (pavnxet) · MIT License */
"use strict";

var fs = require("fs"), os = require("os"), path = require("path"), cp = require("child_process");

var ROOT = path.join(__dirname, "..");

// Split so the literal tag never appears in source (keeps HTML parsers and
// naive payload filters happy).
var S_OPEN = "<" + "script>";
var S_CLOSE = "<" + "/script>";
var pass = 0, fail = 0;
function eq(a, e, label) {
  var A = JSON.stringify(a), E = JSON.stringify(e);
  if (A === E) { pass++; console.log("  ok   " + label); }
  else { fail++; console.log("  FAIL " + label + "\n         expected " + E + "\n         got      " + A); }
}
function ok(c, l) { eq(!!c, true, l); }
function section(t) { console.log("\n" + t); }

function chromeBin() {
  var c = ["chromium", "chromium-browser", "google-chrome", "/usr/local/bin/chromium", "/usr/bin/chromium"];
  for (var i = 0; i < c.length; i++) { try { cp.execSync(c[i] + " --version", { stdio: "ignore" }); return c[i]; } catch (e) {} }
  return null;
}
var BIN = chromeBin();
if (!BIN) { console.log("SKIP — no Chromium found; popup test not run"); process.exit(0); }

var SCRIPTS = ["popup-DdYYQyqW.js", "nav.js", "speed.js", "guard.js", "value-core.js", "custom.js", "curve-core.js", "wave.js"];

function harness() {
  var html = fs.readFileSync(path.join(ROOT, "popup.html"), "utf8");
  html = html.replace(/<script[^>]*src="[^"]*"[^>]*><\/script>/g, "");

  var shim = [
    "window.__store={settings:{enabled:true,playbackSpeed:1,silenceSpeed:4,thresholdDb:-45,minSilenceMs:350,guardMs:150}};",
    "window.__saved=[];",
    "window.chrome={",
    "  runtime:{onMessage:{addListener:function(){}},sendMessage:function(){return Promise.resolve();},getURL:function(p){return p;}},",
    "  tabs:{query:function(q,cb){cb([{id:1}]);},create:function(){}},",
    "  storage:{",
    "    local:{",
    "      get:function(k,cb){var out={};if(typeof k==='string'){out[k]=window.__store[k];}else if(Array.isArray(k)){k.forEach(function(x){out[x]=window.__store[x];});}else{out=window.__store;}if(cb)cb(out);return Promise.resolve(out);},",
    "      set:function(o){Object.keys(o).forEach(function(x){window.__store[x]=o[x];});window.__saved.push(JSON.parse(JSON.stringify(o)));return Promise.resolve();}",
    "    },",
    "    onChanged:{addListener:function(){}}",
    "  }",
    "};"
  ].join("\n");

  var body = SCRIPTS.map(function (f) {
    return S_OPEN + fs.readFileSync(path.join(ROOT, "chunks", f), "utf8") + S_CLOSE;
  }).join("\n");

  var probe = [
    S_OPEN,
    "(async function(){",
    "  function type(id,v){var el=document.getElementById(id);el.value=v;el.dispatchEvent(new Event('change',{bubbles:true}));}",
    "  function wait(ms){return new Promise(function(r){setTimeout(r,ms);});}",
    "  await wait(120);",
    "  var n={};",
    "  type('baseVal','1.37');   await wait(40); n.ps=window.__store.settings.playbackSpeed;",
    "  type('speedVal','5.25');  await wait(40); n.ss=window.__store.settings.silenceSpeed;",
    "  type('threshVal','-47.5'); await wait(40); n.td=window.__store.settings.thresholdDb;",
    "  type('guardVal','175');   await wait(40); n.gm=window.__store.settings.guardMs;",
    "  type('baseVal','99');     await wait(40); n.psClamped=window.__store.settings.playbackSpeed;",
    "  type('guardVal','abc');   await wait(40); n.gmAfterJunk=window.__store.settings.guardMs;",
    "  n.sliderBase=document.getElementById('base').value;",
    "  n.numBase=document.getElementById('baseVal').value;",
    "  n.numGuard=document.getElementById('guardVal').value;",
    "  n.writes=window.__saved.length;",
    "  document.title='RES='+JSON.stringify(n);",
    "})();",
    S_CLOSE
  ].join("\n");

  return html.replace("</body>", S_OPEN + shim + S_CLOSE + "\n" + body + "\n" + probe + "\n</body>");
}

function run() {
  var f = path.join(os.tmpdir(), "ysc-popup.html");
  fs.writeFileSync(f, harness());
  var out = cp.execSync(BIN + " --headless=new --no-sandbox --disable-gpu --virtual-time-budget=3000 --dump-dom file://" + f,
    { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 64 * 1024 * 1024 });
  var m = out.match(/<title>RES=([^<]*)<\/title>/);
  if (!m) return null;
  try { return JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&")); } catch (e) { return null; }
}

/* ------------------------------------------------------------------ */
section("popup — typing custom values reaches storage");
var r = run();
ok(r !== null, "popup produced a result");

if (r) {
  eq(r.ps, 1.37, "typed 1.37 -> playbackSpeed 1.37");
  eq(r.ss, 5.25, "typed 5.25 -> silenceSpeed 5.25");
  eq(r.td, -47.5, "typed -47.5 -> thresholdDb -47.5");
  eq(r.gm, 175, "typed 175 -> guardMs 175");
  eq(r.psClamped, 4, "out-of-range 99 clamps playbackSpeed to 4");
  eq(r.sliderBase, "4", "the slider follows the clamp");
  eq(r.numBase, "4", "the number box shows the clamped value");
  eq(r.gmAfterJunk, 175, "junk 'abc' leaves guardMs untouched");
  eq(r.numGuard, "175", "junk reverts the number box to the slider value");
  ok(r.writes >= 4, "each accepted value was saved (" + r.writes + " writes)");
}

console.log("\n" + (fail === 0 ? "PASS" : "FAIL") + " — " + pass + " passed, " + fail + " failed");
process.exit(fail === 0 ? 0 : 1);

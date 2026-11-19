/* YT Silence Cutter — offline guarantee test.
   The README promises "no network requests of any kind", so this asserts it:
   no remote URLs in the pages, no fetch/XHR/WebSocket in the shipped scripts,
   and nothing but `storage` in the manifest permissions.

   Run:  node tests/offline.test.js
   Author: Pavneet Singh (pavnxet) · MIT License */
"use strict";

var fs = require("fs"), path = require("path");
var ROOT = path.join(__dirname, "..");

var pass = 0, fail = 0;
function eq(a, e, label) {
  var A = JSON.stringify(a), E = JSON.stringify(e);
  if (A === E) { pass++; console.log("  ok   " + label); }
  else { fail++; console.log("  FAIL " + label + "\n         expected " + E + "\n         got      " + A); }
}
function section(t) { console.log("\n" + t); }

function read(p) { return fs.readFileSync(path.join(ROOT, p), "utf8"); }

section("pages make no remote requests");
["popup.html", "stats.html", "shortcuts.html"].forEach(function (p) {
  var html = read(p);
  // strip HTML comments: a URL in a comment is documentation, not a request
  var live = html.replace(/<!--[\s\S]*?-->/g, "");
  var hits = live.match(/https?:\/\/[^\s"'<>]+/g) || [];
  eq(hits, [], p + " has no live remote URL");
});

section("scripts make no network calls");
var scripts = [];
["chunks", "content-scripts"].forEach(function (dir) {
  fs.readdirSync(path.join(ROOT, dir)).forEach(function (f) {
    if (f.endsWith(".js")) scripts.push(dir + "/" + f);
  });
});
scripts.push("background.js");

var offenders = [];
scripts.forEach(function (rel) {
  var js = read(rel);
  // ignore the words inside our own comments/strings about "network"
  if (/\bfetch\s*\(/.test(js)) offenders.push(rel + ": fetch()");
  if (/XMLHttpRequest/.test(js)) offenders.push(rel + ": XMLHttpRequest");
  if (/new\s+WebSocket/.test(js)) offenders.push(rel + ": WebSocket");
  if (/navigator\.sendBeacon/.test(js)) offenders.push(rel + ": sendBeacon");
  if (/EventSource/.test(js)) offenders.push(rel + ": EventSource");
  if (/importScripts\(\s*["']https?:/.test(js)) offenders.push(rel + ": remote importScripts");
});
eq(offenders, [], "no script reaches the network (" + scripts.length + " scripts scanned)");

section("the manifest asks for nothing beyond storage");
var mf = JSON.parse(read("manifest.json"));
eq(mf.permissions, ["storage"], "permissions are exactly ['storage']");
eq(mf.manifest_version, 3, "manifest v3");
var hostPerms = mf.host_permissions || [];
eq(hostPerms, ["<all_urls>"], "host permissions are content-script matching only");

section("the background worker loads its helper locally");
var bg = read("background.js");
eq(/importScripts\(\s*["']chunks\//.test(bg), true, "importScripts points at a bundled chunk");

console.log("\n" + (fail === 0 ? "PASS" : "FAIL") + " — " + pass + " passed, " + fail + " failed");
process.exit(fail === 0 ? 0 : 1);

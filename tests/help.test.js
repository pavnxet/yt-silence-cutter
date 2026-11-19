/* YT Silence Cutter — help copy test suite.
   Asserts the ? popovers and the popup markup agree, so no control can ship
   without an explanation (or with one that nothing shows).
   Run:  node tests/help.test.js
   Author: Pavneet Singh (pavnxet) · MIT License */
"use strict";

var fs = require("fs");
var path = require("path");
var H = require("../chunks/help-core.js");

var pass = 0, fail = 0;
function eq(a, e, label) {
  var A = JSON.stringify(a), E = JSON.stringify(e);
  if (A === E) { pass++; console.log("  ok   " + label); }
  else { fail++; console.log("  FAIL " + label + "\n         expected " + E + "\n         got      " + A); }
}
function ok(c, l) { eq(!!c, true, l); }
function section(t) { console.log("\n" + t); }

section("every entry is complete");
var incomplete = [];
H.IDS.forEach(function (id) {
  var h = H.get(id);
  if (!h || !h.title || !h.body || !h.range) incomplete.push(id);
});
eq(incomplete, [], "each entry has a title, body and range");
ok(H.IDS.length >= 6, "there is help for at least 6 controls (" + H.IDS.length + ")");
eq(H.get("nope"), null, "an unknown id returns null");

section("the popup asks for help that exists");
var html = fs.readFileSync(path.join(__dirname, "..", "popup.html"), "utf8");
var asked = [];
var re = /data-help="([a-zA-Z]+)"/g, m;
while ((m = re.exec(html))) if (asked.indexOf(m[1]) === -1) asked.push(m[1]);

eq(asked.length, H.IDS.length, "the popup has one ? per help entry");
var missing = asked.filter(function (id) { return !H.get(id); });
eq(missing, [], "every ? button points at real copy");
var unused = H.IDS.filter(function (id) { return asked.indexOf(id) === -1; });
eq(unused, [], "no copy is written but never shown");
ok(html.indexOf('id="helpPop"') > -1, "the popup has a popover host");

section("the popover host is wired");
var helpJs = fs.readFileSync(path.join(__dirname, "..", "chunks", "help.js"), "utf8");
ok(helpJs.indexOf("helpPop") > -1, "help.js binds the host");
ok(helpJs.indexOf("Escape") > -1, "Escape closes the popover");
ok(html.indexOf("/chunks/help-core.js") > -1, "popup loads help-core.js");
ok(html.indexOf("/chunks/help.js") > -1, "popup loads help.js");

console.log("\n" + (fail === 0 ? "PASS" : "FAIL") + " — " + pass + " passed, " + fail + " failed");
process.exit(fail === 0 ? 0 : 1);

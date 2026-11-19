/* Static checks for the extension's HTML <-> script wiring.
   1. a classic script must not grab an element that appears later in the page
   2. no duplicate element ids
   3. ids grabbed by a page's scripts must exist in that page
   4. every referenced script file must exist                                     */
"use strict";
var fs = require("fs"), path = require("path");
var ROOT = process.argv[2] || ".";
var PAGES = ["popup.html", "stats.html", "shortcuts.html"];
var problems = [];

function positions(html) {
  // document order of ids and of classic script tags
  var ids = {}, scripts = [];
  var re = /<(\/?)([a-zA-Z][\w-]*)([^>]*)>/g, m, i = 0;
  while ((m = re.exec(html))) {
    var tag = m[2].toLowerCase(), attrs = m[3], pos = m.index;
    var idm = /\sid\s*=\s*"([^"]+)"/.exec(attrs);
    if (idm && m[1] !== "/") {
      if (ids[idm[1]] === undefined) ids[idm[1]] = pos;
      else problems.push("duplicate id '" + idm[1] + "' in " + PAGES.cur);
    }
    var srcm = /\ssrc\s*=\s*"([^"]+)"/.exec(attrs);
    if (srcm && tag === "script") {
      var isModule = /type\s*=\s*"module"/.test(attrs);
      scripts.push({ src: srcm[1], pos: pos, module: isModule });
    }
    i++;
  }
  return { ids: ids, scripts: scripts };
}

PAGES.forEach(function (page) {
  var file = path.join(ROOT, page);
  if (!fs.existsSync(file)) return;
  PAGES.cur = page;
  var html = fs.readFileSync(file, "utf8");
  var p = positions(html);

  p.scripts.forEach(function (s) {
    if (!s.src || s.src.indexOf("/chunks/") !== 0) return;
    var jsPath = path.join(ROOT, s.src.replace(/^\//, ""));
    if (!fs.existsSync(jsPath)) { problems.push(page + ": missing script " + s.src); return; }
    if (s.module) return;   // module scripts are deferred: order does not matter

    var js = fs.readFileSync(jsPath, "utf8");
    var re = /getElementById\(\s*["']([^"']+)["']\s*\)/g, m;
    while ((m = re.exec(js))) {
      var id = m[1];
      if (p.ids[id] === undefined) {
        problems.push(page + ": " + s.src + " grabs #" + id + ", which does not exist");
      } else if (p.ids[id] > s.pos) {
        problems.push(page + ": " + s.src + " grabs #" + id + " BEFORE it exists (script at " +
                      s.pos + ", element at " + p.ids[id] + ")");
      }
    }
  });
});

if (problems.length) { problems.forEach(function (x) { console.log("BUG  " + x); }); process.exit(1); }
console.log("OK — no DOM-order, duplicate-id or missing-file problems");

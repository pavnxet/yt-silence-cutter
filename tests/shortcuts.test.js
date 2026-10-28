/* YT Silence Cutter — shortcut binding test suite.
   Verifies the bindings fire only on Alt+Shift and can never shadow a YouTube
   or browser shortcut.
   Run:  node tests/shortcuts.test.js
   Author: Pavneet Singh (pavnxet) · MIT License */
"use strict";

var S = require("../chunks/shortcuts-core.js");

var pass = 0, fail = 0;
function eq(a, e, label) {
  var A = JSON.stringify(a), E = JSON.stringify(e);
  if (A === E) { pass++; console.log("  ok   " + label); }
  else { fail++; console.log("  FAIL " + label + "\n         expected " + E + "\n         got      " + A); }
}
function ok(c, l) { eq(!!c, true, l); }
function section(t) { console.log("\n" + t); }

function ev(code, mods) {
  mods = mods || {};
  return { code: code, altKey: !!mods.alt, shiftKey: !!mods.shift, ctrlKey: !!mods.ctrl, metaKey: !!mods.meta };
}
var AS = { alt: true, shift: true };

section("the list is well formed");
ok(S.LIST.length >= 10, "there are at least 10 shortcuts (" + S.LIST.length + ")");
var ids = {}, codes = {};
var dupId = false, dupCode = false, missing = false;
for (var i = 0; i < S.LIST.length; i++) {
  var s = S.LIST[i];
  if (ids[s.id]) dupId = true; ids[s.id] = 1;
  if (codes[s.code]) dupCode = true; codes[s.code] = 1;
  if (!s.title || !s.keys || !s.group || !s.code) missing = true;
}
ok(!dupId, "every id is unique");
ok(!dupCode, "every key code is bound once");
ok(!missing, "every entry has a title, keys, group and code");
eq(S.GROUPS.length, 5, "five groups");
eq(S.GROUPS[0], "Core", "Core comes first");

section("match — requires Alt + Shift");
eq(S.match(ev("KeyS", AS)), "toggle", "Alt+Shift+S toggles skipping");
eq(S.match(ev("ArrowUp", AS)), "speedUp", "Alt+Shift+Up raises the speed");
eq(S.match(ev("ArrowDown", AS)), "speedDown", "Alt+Shift+Down lowers the speed");
eq(S.match(ev("ArrowRight", AS)), "boostUp", "Alt+Shift+Right raises the boost");
eq(S.match(ev("ArrowLeft", AS)), "boostDown", "Alt+Shift+Left lowers the boost");
eq(S.match(ev("PageUp", AS)), "sensUp", "Alt+Shift+PgUp raises sensitivity");
eq(S.match(ev("PageDown", AS)), "sensDown", "Alt+Shift+PgDn lowers sensitivity");
eq(S.match(ev("KeyG", AS)), "guardUp", "Alt+Shift+G lengthens the guard");
eq(S.match(ev("KeyB", AS)), "guardDown", "Alt+Shift+B shortens the guard");
eq(S.match(ev("KeyL", AS)), "lock", "Alt+Shift+L toggles the lock");
eq(S.match(ev("KeyR", AS)), "reset", "Alt+Shift+R resets");
eq(S.match(ev("KeyH", AS)), "help", "Alt+Shift+H opens the guide");

section("match — ignores anything that could clash");
eq(S.match(ev("KeyS", {})), null, "bare S (YouTube: stats) is ignored");
eq(S.match(ev("KeyK", {})), null, "bare K (YouTube: play/pause) is ignored");
eq(S.match(ev("KeyJ", {})), null, "bare J (YouTube: back 10s) is ignored");
eq(S.match(ev("KeyL", {})), null, "bare L (YouTube: forward 10s) is ignored");
eq(S.match(ev("Space", {})), null, "bare Space (YouTube: pause) is ignored");
eq(S.match(ev("ArrowUp", {})), null, "bare ArrowUp (YouTube: volume) is ignored");
eq(S.match(ev("Digit0", {})), null, "bare 0 (YouTube: seek to start) is ignored");
eq(S.match(ev("KeyS", { ctrl: true })), null, "Ctrl+S (browser: save) is ignored");
eq(S.match(ev("KeyS", { meta: true })), null, "Cmd+S is ignored");
eq(S.match(ev("KeyS", { alt: true })), null, "Alt alone is ignored");
eq(S.match(ev("KeyS", { shift: true })), null, "Shift alone is ignored");
eq(S.match(ev("KeyS", { alt: true, shift: true, ctrl: true })), null, "Alt+Shift+Ctrl is ignored");
eq(S.match(ev("KeyS", { alt: true, shift: true, meta: true })), null, "Alt+Shift+Cmd is ignored");
eq(S.match(ev("KeyZ", AS)), null, "an unbound key is ignored");
eq(S.match(null), null, "a null event is ignored");
eq(S.match({}), null, "an event with no code is ignored");

section("byId");
eq(S.byId("toggle").code, "KeyS", "byId resolves a known id");
eq(S.byId("nope"), null, "byId returns null for an unknown id");

console.log("\n" + (fail === 0 ? "PASS" : "FAIL") + " — " + pass + " passed, " + fail + " failed");
process.exit(fail === 0 ? 0 : 1);

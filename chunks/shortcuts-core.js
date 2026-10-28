/* YT Silence Cutter — shortcut definitions.
   One source of truth: the content script binds from this list and the guide
   page renders from it, so the two can never drift apart.

   Every shortcut is Alt + Shift + <key>. That combination is deliberately
   chosen: YouTube binds bare keys (k, j, l, space, arrows, 0-9, …) and the
   browser owns Ctrl/Cmd combos, so Alt + Shift collides with neither.

   Pure and dependency-free, so it runs unchanged in the browser and under Node.

   Author: Pavneet Singh (pavnxet) · MIT License
   https://github.com/pavnxet/yt-silence-cutter */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.YSCShortcuts = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  /* `code` is the physical key (KeyboardEvent.code), so the binding survives
     keyboard layouts and modifier-generated characters. */
  var LIST = [
    { id: "toggle",    group: "Core",           code: "KeyS",       keys: "Alt + Shift + S",    title: "Turn skipping on or off" },

    { id: "speedUp",   group: "Playback speed", code: "ArrowUp",    keys: "Alt + Shift + \u2191", title: "Base speed up",   delta: "+0.05\u00d7" },
    { id: "speedDown", group: "Playback speed", code: "ArrowDown",  keys: "Alt + Shift + \u2193", title: "Base speed down", delta: "\u22120.05\u00d7" },

    { id: "boostUp",   group: "Silence",        code: "ArrowRight", keys: "Alt + Shift + \u2192", title: "Silence boost up",   delta: "+0.25\u00d7" },
    { id: "boostDown", group: "Silence",        code: "ArrowLeft",  keys: "Alt + Shift + \u2190", title: "Silence boost down", delta: "\u22120.25\u00d7" },
    { id: "guardUp",   group: "Silence",        code: "KeyG",       keys: "Alt + Shift + G",    title: "Speech guard longer",  delta: "+25 ms" },
    { id: "guardDown", group: "Silence",        code: "KeyB",       keys: "Alt + Shift + B",    title: "Speech guard shorter", delta: "\u221225 ms" },

    { id: "sensUp",    group: "Detection",      code: "PageUp",     keys: "Alt + Shift + PgUp", title: "Sensitivity up \u2014 skips more", delta: "+2 dB" },
    { id: "sensDown",  group: "Detection",      code: "PageDown",   keys: "Alt + Shift + PgDn", title: "Sensitivity down \u2014 skips less", delta: "\u22122 dB" },

    { id: "lock",      group: "App",            code: "KeyL",       keys: "Alt + Shift + L",    title: "Toggle the speed lock" },
    { id: "reset",     group: "App",            code: "KeyR",       keys: "Alt + Shift + R",    title: "Reset all settings to defaults" },
    { id: "help",      group: "App",            code: "KeyH",       keys: "Alt + Shift + H",    title: "Open this shortcuts guide" }
  ];

  var GROUPS = [];
  for (var i = 0; i < LIST.length; i++) {
    if (GROUPS.indexOf(LIST[i].group) === -1) GROUPS.push(LIST[i].group);
  }

  /* Returns the shortcut id for a keyboard event, or null. Requires Alt+Shift
     with no Ctrl/Meta, so it can never shadow a YouTube or browser binding. */
  function match(e) {
    if (!e || !e.altKey || !e.shiftKey || e.ctrlKey || e.metaKey) return null;
    var code = e.code;
    if (!code) return null;
    for (var i = 0; i < LIST.length; i++) if (LIST[i].code === code) return LIST[i].id;
    return null;
  }

  function byId(id) {
    for (var i = 0; i < LIST.length; i++) if (LIST[i].id === id) return LIST[i];
    return null;
  }

  return { LIST: LIST, GROUPS: GROUPS, match: match, byId: byId };
});

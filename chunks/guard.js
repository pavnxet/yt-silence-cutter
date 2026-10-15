/* YT Silence Cutter — "Speech guard" control for the popup.
   Writes settings.guardMs; the content script uses it to leave a guard band
   around speech so a high skip speed doesn't clip word onsets.

   Author: Pavneet Singh (pavnxet) · MIT License
   https://github.com/pavnxet/yt-silence-cutter */
(function () {
  "use strict";

  var RT = (typeof browser !== "undefined" && browser.runtime && browser.runtime.id) ? browser : chrome;
  var DEFAULT = 150;

  var el = document.getElementById("guard");
  var val = document.getElementById("guardVal");
  if (!el) return;

  function paint(v) { if (val) val.textContent = Number(v) + " ms"; }

  function save(v) {
    RT.storage.local.get("settings", function (r) {
      var s = (r && r.settings) || {};
      s.guardMs = v;
      RT.storage.local.set({ settings: s });
    });
  }

  RT.storage.local.get("settings", function (r) {
    var s = (r && r.settings) || {};
    var v = typeof s.guardMs === "number" ? s.guardMs : DEFAULT;
    el.value = String(v);
    paint(v);
  });

  el.addEventListener("input", function () { paint(el.value); });
  el.addEventListener("change", function () { save(Number(el.value)); });

  RT.storage.onChanged.addListener(function (ch, area) {
    if (area !== "local" || !ch.settings || !ch.settings.newValue) return;
    if (document.activeElement === el) return;
    var v = ch.settings.newValue.guardMs;
    if (typeof v === "number") { el.value = String(v); paint(v); }
  });
})();

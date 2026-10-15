/* Manual playback-speed control for the YT Silence Cutter popup.
   Writes settings.playbackSpeed; the content script treats it as the base
   speed and scales silence/filler skipping relative to it. */
(function () {
  "use strict";

  var el = document.getElementById("base");
  var val = document.getElementById("baseVal");
  if (!el) return;

  function fmt(v) {
    var n = Number(v);
    var s = n.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
    return s + "×";
  }

  function paint(v) {
    if (val) val.textContent = fmt(v);
  }

  function save(v) {
    chrome.storage.local.get("settings", function (r) {
      var s = (r && r.settings) || {};
      s.playbackSpeed = v;
      chrome.storage.local.set({ settings: s });
    });
  }

  chrome.storage.local.get("settings", function (r) {
    var s = (r && r.settings) || {};
    var v = typeof s.playbackSpeed === "number" ? s.playbackSpeed : 1;
    el.value = String(v);
    paint(v);
  });

  el.addEventListener("input", function () {
    paint(el.value);
  });
  el.addEventListener("change", function () {
    save(Number(el.value));
  });

  // If the speed is changed elsewhere (e.g. YouTube's own menu), reflect it here.
  chrome.storage.onChanged.addListener(function (ch, area) {
    if (area !== "local" || !ch.settings || !ch.settings.newValue) return;
    var v = ch.settings.newValue.playbackSpeed;
    if (typeof v === "number" && document.activeElement !== el) {
      el.value = String(v);
      paint(v);
    }
  });
})();

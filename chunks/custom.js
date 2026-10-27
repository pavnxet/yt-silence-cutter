/* YT Silence Cutter — custom values for the popup sliders.
   Every slider gets a number box so you can type an exact value (1.37x,
   5.25x, -47.5 dB, 175 ms) instead of being stuck on the slider's steps.
   Typed values are clamped to the safe range and saved like a slider change.

   Author: Pavneet Singh (pavnxet) · MIT License
   https://github.com/pavnxet/yt-silence-cutter */
(function () {
  "use strict";

  var RT = (typeof browser !== "undefined" && browser.runtime && browser.runtime.id) ? browser : chrome;
  var V = window.YSCValue;
  if (!V) return;

  var FIELDS = [
    { slider: "base",   num: "baseVal",   key: "playbackSpeed" },
    { slider: "speed",  num: "speedVal",  key: "silenceSpeed" },
    { slider: "thresh", num: "threshVal", key: "thresholdDb" },
    { slider: "guard",  num: "guardVal",  key: "guardMs" }
  ];

  function el(id) { return document.getElementById(id); }

  function save(key, value) {
    RT.storage.local.get("settings", function (r) {
      var s = (r && r.settings) || {};
      s[key] = value;
      RT.storage.local.set({ settings: s });
    });
  }

  function paint(f, value) {
    var num = el(f.num), sl = el(f.slider);
    var range = V.RANGES[f.key];
    var v = V.clampNum(value, range[0], range[1], null);
    if (v === null) return;
    if (num && document.activeElement !== num) num.value = String(v);
    if (sl && document.activeElement !== sl) sl.value = String(v);
  }

  function wire(f) {
    var num = el(f.num), sl = el(f.slider);
    if (!num || !sl) return;
    var range = V.RANGES[f.key];

    num.min = String(range[0]);
    num.max = String(range[1]);
    sl.min = String(range[0]);
    sl.max = String(range[1]);

    // dragging the slider updates the number box live
    sl.addEventListener("input", function () {
      if (document.activeElement !== num) num.value = sl.value;
    });

    // typing a number updates the slider and saves
    function commit() {
      var v = V.clampNum(num.value, range[0], range[1], null);
      if (v === null) { num.value = sl.value; return; }   // reject garbage
      num.value = String(v);
      sl.value = String(v);
      save(f.key, v);
    }
    num.addEventListener("change", commit);
    num.addEventListener("blur", commit);
    num.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { commit(); num.blur(); }
    });
  }

  function applyAll(s) {
    if (!s) return;
    for (var i = 0; i < FIELDS.length; i++) {
      var f = FIELDS[i];
      if (typeof s[f.key] === "number") paint(f, s[f.key]);
    }
  }

  for (var i = 0; i < FIELDS.length; i++) wire(FIELDS[i]);

  RT.storage.local.get("settings", function (r) { applyAll(r && r.settings); });
  RT.storage.onChanged.addListener(function (ch, area) {
    if (area === "local" && ch.settings && ch.settings.newValue) applyAll(ch.settings.newValue);
  });
})();

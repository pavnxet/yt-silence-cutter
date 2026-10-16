/* YT Silence Cutter — live-audio visualiser for the popup.
   Receives frames from the content script ("yt-silence-cutter:level") and draws
   a scrolling waveform.

   Bars are coloured by what the extension is actually doing:
     • speech    — loud, played at the base speed        (terracotta)
     • skipped   — quiet, being fast-forwarded            (grey)
     • protected — quiet, but inside the speech guard     (pale grey)

   Rendering is time-based: the window slides continuously with the clock and
   bar heights are interpolated between the ~60 ms samples (via curve-core), so
   the animation is smooth at 60 fps. Honours prefers-reduced-motion.

   Author: Pavneet Singh (pavnxet) · MIT License
   https://github.com/pavnxet/yt-silence-cutter */
(function () {
  "use strict";

  var canvas = document.getElementById("wave");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var C = window.YSCCurve;

  var W = canvas.width, H = canvas.height;
  var BAR = 6, GAP = 3;
  var N = Math.floor((W + GAP) / (BAR + GAP));
  var WINDOW_MS = 3600;
  var SLOT_MS = WINDOW_MS / N;
  var BASE = (C && C.BASE) || 0.02;

  var SPEECH = 1, PROTECTED = 0, SKIPPED = 2;

  var reduce = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  var samples = [];   // { t, level, kind }, oldest first
  var lastMsg = 0;
  var savedMs = 0;
  var enabled = true;
  var rates = { speech: 1, silence: 4 };
  var activeTab = null;

  function grad(a, b) {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, a);
    g.addColorStop(1, b);
    return g;
  }
  var G_SPEECH = grad("#DE9476", "#C15F3C");
  var G_SKIPPED = grad("#C9C6BC", "#B0AC9F");
  var G_PROTECTED = grad("#EFEDE6", "#DFDCD1");

  function kindFromMessage(m) {
    if (m.state === "skipped") return SKIPPED;
    if (m.state === "speech") return SPEECH;
    if (m.state === "protected") return PROTECTED;
    return m.silent ? PROTECTED : SPEECH;   // fallback for older senders
  }

  function addSample(level, kind) {
    var t = performance.now();
    samples.push({ t: t, level: C ? C.clamp01(level) : Math.max(0, Math.min(1, level)), kind: kind });
    if (C) C.prune(samples, t - WINDOW_MS - 500);
    else while (samples.length > 400) samples.shift();
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(x, y, w, h, r);
    } else {
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }
    ctx.fill();
  }

  function drawFrame() {
    var now = performance.now();
    ctx.clearRect(0, 0, W, H);
    var maxH = H - 6;
    for (var i = 0; i < N; i++) {
      var t = now - (N - 1 - i) * SLOT_MS;
      var lv = C ? C.levelAt(samples, t, BASE) : BASE;
      var kind = C ? C.kindAt(samples, t, PROTECTED) : PROTECTED;
      var h = Math.max(3, lv * maxH);
      var x = i * (BAR + GAP);
      var y = H - h - 3;
      ctx.fillStyle = kind === SKIPPED ? G_SKIPPED : (kind === SPEECH ? G_SPEECH : G_PROTECTED);
      roundRect(x, y, BAR, h, 2);
    }
  }

  function loop() {
    drawFrame();
    if (!reduce) requestAnimationFrame(loop);
  }

  var badge = document.getElementById("activeBadge");
  function paintBadge() {
    if (!badge) return;
    badge.textContent = enabled ? "Active" : "Off";
    badge.className = "badge" + (enabled ? "" : " off");
  }

  var savedEl = document.getElementById("statSaved");
  function paintSaved() {
    if (!savedEl) return;
    var s = Math.round(savedMs / 1000);
    var txt = s >= 60 ? Math.floor(s / 60) + "m " + (s % 60) + "s" : s + "s";
    savedEl.textContent = "Time saved · " + txt;
  }

  var speechEl = document.getElementById("speechRate");
  var silenceEl = document.getElementById("silenceRate");
  function paintRates() {
    if (speechEl) speechEl.textContent = rates.speech + "×";
    if (silenceEl) silenceEl.textContent = rates.silence + "×";
  }

  function applySettings(s) {
    if (!s) return;
    enabled = s.enabled !== false;
    if (typeof s.playbackSpeed === "number") rates.speech = s.playbackSpeed;
    if (typeof s.silenceSpeed === "number") rates.silence = s.silenceSpeed;
    paintBadge();
    paintRates();
  }

  if (chrome && chrome.tabs && chrome.tabs.query) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs && tabs[0]) activeTab = tabs[0].id;
    });
  }

  if (chrome && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener(function (m, sender) {
      if (!m || m.type !== "yt-silence-cutter:level") return;
      if (activeTab !== null && (!sender || !sender.tab || sender.tab.id !== activeTab)) return;
      lastMsg = Date.now();
      if (m.active) {
        addSample(m.level || 0, kindFromMessage(m));
        if (typeof m.savedMs === "number") { savedMs = m.savedMs; paintSaved(); }
        if (typeof m.speechRate === "number") rates.speech = m.speechRate;
        if (typeof m.silenceSpeed === "number") rates.silence = m.silenceSpeed;
        paintRates();
      } else {
        addSample(BASE, PROTECTED);
      }
      if (reduce) drawFrame();
    });
  }

  if (chrome && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get("settings", function (r) { applySettings(r && r.settings); });
    chrome.storage.onChanged.addListener(function (ch, area) {
      if (area === "local" && ch.settings) applySettings(ch.settings.newValue);
    });
  }

  setInterval(function () {
    if (Date.now() - lastMsg > 600) {
      addSample(BASE, PROTECTED);
      if (reduce) drawFrame();
    }
  }, 120);

  paintBadge();
  paintRates();
  paintSaved();
  loop();
})();

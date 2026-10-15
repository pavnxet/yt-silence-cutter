/* Live-audio visualiser for the YT Silence Cutter popup.
   Receives level frames from the content script (chrome.runtime message
   "yt-silence-cutter:level") and draws a scrolling speech/silence waveform. */
(function () {
  "use strict";

  var canvas = document.getElementById("wave");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var W = canvas.width;
  var H = canvas.height;
  var BAR = 6;
  var GAP = 3;
  var N = Math.floor((W + GAP) / (BAR + GAP));

  var hist = new Array(N).fill(0);
  var kinds = new Array(N).fill(0); // 0 = silence, 1 = speech
  for (var i = 0; i < N; i++) hist[i] = 0.02;

  var activeTab = null;
  var lastMsg = 0;
  var savedMs = 0;
  var enabled = true;
  var rates = { speech: 1, silence: 4 };

  function push(level, speech) {
    hist.push(Math.max(0, Math.min(1, level)));
    hist.shift();
    kinds.push(speech ? 1 : 0);
    kinds.shift();
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

  function draw() {
    ctx.clearRect(0, 0, W, H);
    var maxH = H - 6;
    for (var i = 0; i < N; i++) {
      var h = Math.max(3, hist[i] * maxH);
      var x = i * (BAR + GAP);
      var y = H - h - 3;
      var g = ctx.createLinearGradient(0, y, 0, H);
      if (kinds[i] === 1) {
        g.addColorStop(0, "#DE9476");
        g.addColorStop(1, "#C15F3C");
      } else {
        g.addColorStop(0, "#E8E6DF");
        g.addColorStop(1, "#D9D6CC");
      }
      ctx.fillStyle = g;
      roundRect(x, y, BAR, h, 2);
    }
    requestAnimationFrame(draw);
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

  // Only follow the tab the popup is open over, so background tabs don't fight.
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
        push(m.level || 0, !m.silent);
        if (typeof m.savedMs === "number") {
          savedMs = m.savedMs;
          paintSaved();
        }
        if (typeof m.speechRate === "number") rates.speech = m.speechRate;
        if (typeof m.silenceSpeed === "number") rates.silence = m.silenceSpeed;
        paintRates();
      } else {
        push(0.02, false);
      }
    });
  }

  if (chrome && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get("settings", function (r) {
      applySettings(r && r.settings);
    });
    chrome.storage.onChanged.addListener(function (ch, area) {
      if (area === "local" && ch.settings) applySettings(ch.settings.newValue);
    });
  }

  // Keep the view alive at a quiet baseline if the tab sends nothing.
  setInterval(function () {
    if (Date.now() - lastMsg > 600) push(0.02, false);
  }, 120);

  paintBadge();
  paintRates();
  paintSaved();
  draw();
})();

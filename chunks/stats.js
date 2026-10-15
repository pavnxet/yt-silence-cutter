/* YT Silence Cutter — stats page renderer.
   Reads the aggregated analytics from chrome.storage.local and draws them.
   Author: Pavneet Singh (pavnxet) · MIT License */
(function () {
  "use strict";

  var S = window.YSCStats;
  var KEY = "stats";
  var DAYS = 14;

  function $(id) { return document.getElementById(id); }

  function render(stats) {
    var s = S.normalize(stats);
    var now = Date.now();

    $("vSaved").textContent = S.formatDuration(s.savedMs);
    $("vSilence").textContent = S.formatDuration(s.silenceMs);
    $("vVideos").textContent = String(s.videos);
    $("vSessions").textContent = String(s.sessions);
    $("vToday").textContent = S.formatDuration(S.savedInLastDays(s, 1, now));
    $("vWeek").textContent = S.formatDuration(S.savedInLastDays(s, 7, now));

    var ab = S.avgBoost(s);
    $("vBoost").textContent = ab ? ab.toFixed(1).replace(/\.0$/, "") + "×" : "—";

    var series = S.seriesByDay(s, DAYS, now);
    var max = 1;
    series.forEach(function (p) { if (p.savedMs > max) max = p.savedMs; });

    var chart = $("chart");
    chart.innerHTML = "";
    series.forEach(function (p) {
      var col = document.createElement("div");
      col.className = "col";

      var bar = document.createElement("div");
      bar.className = "bar" + (p.savedMs > 0 ? "" : " zero");
      bar.style.height = Math.max(2, Math.round((p.savedMs / max) * 100)) + "%";
      bar.title = p.day + " · " + S.formatDuration(p.savedMs);

      var lab = document.createElement("span");
      lab.className = "lab";
      lab.textContent = p.day.slice(8);

      col.appendChild(bar);
      col.appendChild(lab);
      chart.appendChild(col);
    });

    var any = s.savedMs > 0 || s.silenceMs > 0 || s.videos > 0 || s.sessions > 0;
    $("empty").hidden = any;
  }

  function load() {
    chrome.storage.local.get(KEY, function (r) { render(r && r[KEY]); });
  }

  $("reset").addEventListener("click", function () {
    if (!window.confirm("Reset all stats? This cannot be undone.")) return;
    var o = {}; o[KEY] = S.blank();
    chrome.storage.local.set(o, load);
  });

  chrome.storage.onChanged.addListener(function (ch, area) {
    if (area === "local" && ch[KEY]) render(ch[KEY].newValue);
  });

  load();
})();

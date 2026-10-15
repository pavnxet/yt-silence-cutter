/* YT Silence Cutter — popup navigation.
   Opens the full stats page in a tab.
   Author: Pavneet Singh (pavnxet) · MIT License */
(function () {
  "use strict";
  var btn = document.getElementById("openStats");
  if (!btn) return;
  btn.addEventListener("click", function () {
    chrome.tabs.create({ url: chrome.runtime.getURL("stats.html") });
    window.close();
  });
})();

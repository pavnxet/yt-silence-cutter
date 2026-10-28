/* YT Silence Cutter — popup navigation.
   Opens the full stats page in a tab.
   Author: Pavneet Singh (pavnxet) · MIT License */
(function () {
  "use strict";
  function open(id, page) {
    var btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener("click", function () {
      chrome.tabs.create({ url: chrome.runtime.getURL(page) });
      window.close();
    });
  }

  open("openStats", "stats.html");
  open("openShortcuts", "shortcuts.html");
})();

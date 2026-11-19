/* YT Silence Cutter — ? help popovers for the popup controls.
   Click the ? beside any control to see what it does, its range, and a tip.
   Copy comes from chunks/help-core.js so the popup and the tests agree.

   Author: Pavneet Singh (pavnxet) · MIT License
   https://github.com/pavnxet/yt-silence-cutter */
(function () {
  "use strict";

  var H = window.YSCHelp;
  if (!H) return;

  var pop = null;
  var openBtn = null;

  // Resolved on use, not at load: the host element only has to exist by the
  // time someone clicks, so a script-order change cannot silently break this.
  function host() {
    if (!pop) pop = document.getElementById("helpPop");
    return pop;
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function close() {
    if (!openBtn) return;
    openBtn.setAttribute("aria-expanded", "false");
    openBtn = null;
    var p = host();
    if (p) { p.hidden = true; p.innerHTML = ""; }
  }

  function place(btn) {
    // fixed position, clamped so it never leaves the popup's viewport
    var p = host();
    if (!p) return;
    var r = btn.getBoundingClientRect();
    var pw = p.offsetWidth, ph = p.offsetHeight;
    var left = Math.min(Math.max(8, r.left - 12), Math.max(8, window.innerWidth - pw - 8));
    var top = r.bottom + 6;
    if (top + ph > window.innerHeight - 8) top = Math.max(8, r.top - ph - 6);
    p.style.left = left + "px";
    p.style.top = top + "px";
  }

  function show(btn) {
    var id = btn.getAttribute("data-help");
    var h = H.get(id);
    var p = host();
    if (!h || !p) return;

    p.innerHTML = "";
    p.appendChild(el("div", "hp-title", h.title));
    p.appendChild(el("p", "hp-body", h.body));
    if (h.range) p.appendChild(el("div", "hp-range", h.range));
    if (h.tip) p.appendChild(el("p", "hp-tip", h.tip));

    p.hidden = false;
    btn.setAttribute("aria-expanded", "true");
    openBtn = btn;
    place(btn);
  }

  document.addEventListener("click", function (e) {
    var btn = e.target.closest ? e.target.closest(".hbtn") : null;
    if (btn) {
      e.preventDefault();
      e.stopPropagation();
      if (openBtn === btn) { close(); return; }
      close();
      show(btn);
      return;
    }
    var p = host();
    if (openBtn && p && !p.contains(e.target)) close();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && openBtn) close();
  });

  window.addEventListener("resize", function () { if (openBtn) place(openBtn); });
  // the popup body scrolls, so a fixed popover has to follow its button
  document.addEventListener("scroll", function () { if (openBtn) place(openBtn); }, true);
})();

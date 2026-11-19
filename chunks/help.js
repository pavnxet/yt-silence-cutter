/* YT Silence Cutter — ? help popovers for the popup controls.
   Click the ? beside any control to see what it does, its range, and a tip.
   Copy comes from chunks/help-core.js so the popup and the tests agree.

   Author: Pavneet Singh (pavnxet) · MIT License
   https://github.com/pavnxet/yt-silence-cutter */
(function () {
  "use strict";

  var H = window.YSCHelp;
  var pop = document.getElementById("helpPop");
  if (!H || !pop) return;

  var openBtn = null;

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
    pop.hidden = true;
    pop.innerHTML = "";
  }

  function place(btn) {
    // fixed position, clamped so it never leaves the popup's viewport
    var r = btn.getBoundingClientRect();
    var pw = pop.offsetWidth, ph = pop.offsetHeight;
    var left = Math.min(Math.max(8, r.left - 12), Math.max(8, window.innerWidth - pw - 8));
    var top = r.bottom + 6;
    if (top + ph > window.innerHeight - 8) top = Math.max(8, r.top - ph - 6);
    pop.style.left = left + "px";
    pop.style.top = top + "px";
  }

  function show(btn) {
    var id = btn.getAttribute("data-help");
    var h = H.get(id);
    if (!h) return;

    pop.innerHTML = "";
    pop.appendChild(el("div", "hp-title", h.title));
    pop.appendChild(el("p", "hp-body", h.body));
    if (h.range) pop.appendChild(el("div", "hp-range", h.range));
    if (h.tip) pop.appendChild(el("p", "hp-tip", h.tip));

    pop.hidden = false;
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
    if (openBtn && !pop.contains(e.target)) close();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && openBtn) close();
  });

  window.addEventListener("resize", function () { if (openBtn) place(openBtn); });
})();

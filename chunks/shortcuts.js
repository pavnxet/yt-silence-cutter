/* YT Silence Cutter — shortcuts guide renderer.
   Renders the list from chunks/shortcuts-core.js so the guide always matches
   what the extension actually binds.

   Author: Pavneet Singh (pavnxet) · MIT License
   https://github.com/pavnxet/yt-silence-cutter */
(function () {
  "use strict";

  var S = window.YSCShortcuts;
  var host = document.getElementById("list");
  if (!S || !host) return;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function keysNode(keys) {
    var wrap = el("span", "keys");
    var parts = String(keys).split(" + ");
    for (var i = 0; i < parts.length; i++) {
      if (i) wrap.appendChild(el("span", "plus", "+"));
      wrap.appendChild(el("kbd", null, parts[i]));
    }
    return wrap;
  }

  for (var g = 0; g < S.GROUPS.length; g++) {
    var group = S.GROUPS[g];
    var section = el("section", "group");
    section.appendChild(el("h2", null, group));

    var rows = el("div", "rows");
    for (var i = 0; i < S.LIST.length; i++) {
      var s = S.LIST[i];
      if (s.group !== group) continue;

      var row = el("div", "row");
      var left = el("div", "what");
      left.appendChild(el("span", "title", s.title));
      if (s.delta) left.appendChild(el("span", "delta", s.delta));
      row.appendChild(left);
      row.appendChild(keysNode(s.keys));
      rows.appendChild(row);
    }
    section.appendChild(rows);
    host.appendChild(section);
  }
})();

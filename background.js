/* YT Silence Cutter — background service worker.
   The WXT bundle that used to sit here only logged a "ready" line and handled the
   paywall auth message. The paywall is gone, so both are gone too.
   Author: Pavneet Singh (pavnxet) · MIT License
   https://github.com/pavnxet/yt-silence-cutter */


/* ---- analytics aggregator (single writer) ---- */
try{importScripts("chunks/stats-core.js")}catch(e){console.warn("[yt-silence-cutter] stats-core unavailable",e)}
(function(){var RT=(typeof browser!=="undefined"&&browser.runtime&&browser.runtime.id)?browser:chrome,KEY="stats",chain=Promise.resolve();RT.runtime.onMessage.addListener(function(m){if(!m||m.type!=="yt-silence-cutter:stats"||!m.delta)return;if(typeof YSCStats==="undefined")return;chain=chain.then(function(){return RT.storage.local.get(KEY).then(function(r){var nx=YSCStats.applyDelta(r&&r[KEY],m.delta,Date.now()),o={};o[KEY]=nx;return RT.storage.local.set(o)})}).catch(function(){})})})();


/* ---- open a bundled page on request (from a shortcut) ---- */
(function () {
  var RT = (typeof browser !== "undefined" && browser.runtime && browser.runtime.id) ? browser : chrome;
  var ALLOWED = { "shortcuts.html": 1, "stats.html": 1 };
  RT.runtime.onMessage.addListener(function (m) {
    if (!m || m.type !== "yt-silence-cutter:open" || !ALLOWED[m.page]) return;
    try { RT.tabs.create({ url: RT.runtime.getURL(m.page) }); } catch (e) {}
  });
})();

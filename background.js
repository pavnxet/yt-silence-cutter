/* YT Silence Cutter — https://github.com/pavnxet/yt-silence-cutter
   Author: Pavneet Singh (pavnxet) · MIT License */
var background=(function(){"use strict";var s,i;function u(n){return n==null||typeof n=="function"?{main:n}:n}const r=(i=(s=globalThis.browser)==null?void 0:s.runtime)!=null&&i.id?globalThis.browser:globalThis.chrome,c="auth";async function l(n){await r.storage.local.set({[c]:n})}const d=u(()=>{console.log("[yt-silence-cutter] background ready",{id:r.runtime.id}),r.runtime.onMessage.addListener(n=>{const t=n;if((t==null?void 0:t.type)==="yt-silence-cutter:auth"&&t.payload){const o=t.payload;l({authenticated:!!o.authenticated,plan:o.plan,pro:o.pro,email:o.email,name:o.name,planExpiresAt:o.planExpiresAt??null,token:o.token,ts:o.ts??Date.now()})}})});function h(){}function e(n,...t){}const b={debug:(...n)=>e(console.debug,...n),log:(...n)=>e(console.log,...n),warn:(...n)=>e(console.warn,...n),error:(...n)=>e(console.error,...n)};let a;try{a=d.main(),a instanceof Promise&&console.warn("The background's main() function return a promise, but it must be synchronous")}catch(n){throw b.error("The background crashed on startup!"),n}var g=a;return g})();

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

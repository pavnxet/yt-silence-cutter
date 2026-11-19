/* YT Silence Cutter — help copy for the popup's ? popovers.
   One source of truth: the popup renders from this and the tests assert that
   every control in popup.html has an entry here (and vice versa).

   Pure and dependency-free, so it runs unchanged in the browser and under Node.

   Author: Pavneet Singh (pavnxet) · MIT License
   https://github.com/pavnxet/yt-silence-cutter */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.YSCHelp = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var HELP = {
    base: {
      title: "Playback speed",
      body: "The speed used for normal speech. Silence is sped up on top of this, so 1.5\u00d7 here means talking plays at 1.5\u00d7 and gaps play at 1.5\u00d7 \u00d7 boost.",
      range: "0.25\u00d7 \u2013 4\u00d7",
      tip: "1.25\u00d7\u20131.5\u00d7 is comfortable for most lectures and talks."
    },
    speed: {
      title: "Silence boost",
      body: "How much faster quiet parts play, as a multiple of your base speed. It is capped at 16\u00d7 overall, the most browsers allow.",
      range: "1\u00d7 \u2013 10\u00d7",
      tip: "4\u00d7\u20136\u00d7 saves a lot of time and stays easy to follow."
    },
    thresh: {
      title: "Sensitivity",
      body: "The loudness below which audio counts as silence. Lower (more negative) means only true silence is skipped; higher means quiet speech is skipped too.",
      range: "\u221280 dB \u2013 \u221210 dB",
      tip: "Quiet speech getting skipped? Lower it. Gaps being missed? Raise it."
    },
    minSil: {
      title: "Skip gaps longer than",
      body: "Quiet has to last this long before the fast-forward starts. Short pauses between words and sentences are left alone.",
      range: "100 ms \u2013 2000 ms",
      tip: "Raise it if the skip feels jumpy; lower it to catch short gaps too."
    },
    guard: {
      title: "Speech guard",
      body: "How carefully the extension backs off before a word starts. Bigger values release the fast-forward earlier, protecting the first syllables.",
      range: "0 ms \u2013 2000 ms",
      tip: "Word starts sounding clipped? Raise it. Gaps not being skipped? Lower it."
    },
    lock: {
      title: "Lock playback speed",
      body: "While on, a speed change made anywhere else \u2014 YouTube's speed menu, its hold-to-2\u00d7, another extension \u2014 is put straight back, so the speed stays the one you set here.",
      range: "on / off",
      tip: "Turn it off if you prefer the site's own speed control to win."
    }
  };

  var IDS = [];
  for (var k in HELP) if (Object.prototype.hasOwnProperty.call(HELP, k)) IDS.push(k);

  function get(id) { return HELP[id] || null; }

  return { HELP: HELP, IDS: IDS, get: get };
});

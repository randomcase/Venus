/* ═══════════════════════════════════════════════════════════════════════════
   AUTOMAT — the script layer of the Venus yard.

   Every board in this yard does its thinking in CSS. Counters are the
   arithmetic, :has() is the state, compound :has() is the lookup table, and
   the cascade is the authority. None of that changes here. This file adds no
   rules, reads no outcome, and decides nothing.

   All it does is press.

   ─────────────────────────────────────────────────────────────── THE CHANNEL
   It is inert unless the URL carries ?run.

   That is not a convenience, it is the architecture. persist.html established
   the rule the hard way: CSS can read the fragment (:target) and cannot read
   the query string. Nothing can. The query is the half of a URL the style
   layer is structurally blind to — which makes it the one place a script can
   be switched on without the stylesheet ever knowing a script exists.

       page.html        the board, exactly as scriptless as it always was
       page.html?run    the same board, with a hand on it

   The two layers cannot collide, because they read different halves of the
   same address. That is the whole trick and it is worth more than the loop.

   ───────────────────────────────────────────────────────────────── THE TRIBES
   The yard keeps its state in three kinds of control, and each group of them
   becomes a TRIBE: a named band with its own cadence, moving on its own beat,
   ignoring every other band completely.

       RADIO   n options, one live. The tribe advances its index, mod n.
       BANK    k checkboxes. The tribe counts in GRAY CODE — one bit flips per
               step, every one of the 2^k combinations is visited exactly once
               before any repeats. A binary counter would flip up to k boxes at
               a time and skip nothing either, but Gray code changes one thing
               per beat, which is what a hand does.
       GATE    the fragment links. One :target per document, so the tribe walks
               the anchors in order and the scroll position is put back.

   Cadences are drawn from the primes. Two tribes on periods 3 and 5 do not
   fall into step for fifteen beats; a board of six tribes on 2·3·5·7·11·13
   walks its whole lattice rather than its diagonal. The HUD prints the exact
   orbit length — the number of beats before the board is in a state it has
   been in before — because that number is the honest measure of the thing.

   ────────────────────────────────────────────────── WHAT IS NOT IN THIS FILE
   There is no scoring function. There is no goal state, no target
   configuration, no comparison of one arrangement against another, no
   termination test, no "solved", no "failed", and no counter that only goes
   one way.

   That is deliberate and it is theory.md's argument in forty lines: a loss
   condition is a scarcity, and a scarcity is a rent. Nothing here is scarce.
   Every state is reachable from every other, all of them are worth the same,
   and the run has no more reason to stop at one than at another. It runs.

   ───────────────────────────────────────────────────────────── FOUR AND A STOP
   Four lights, all go — ALPHA, BETA, DELTA, OMEGA — and one stop, kept for
   emergencies and for nothing else. STOP does not reset anything. Press a
   light and the run picks up on the beat it was on.

   No fetch. No storage. No cookie. Nothing leaves the page and nothing
   survives it. Classic script, no module, works from file://.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ───────────────────────────────────────────────────────── 0 · the channel */
  if (!/[?&](run|automat)(=|&|$)/.test(String(location.search || ''))) return;

  var D = document;
  var slice = function (l) { return Array.prototype.slice.call(l); };

  /* ─────────────────────────────────────────────────────────── 1 · the roster
     Twenty names. A tribe gets the next one off the list, in document order,
     and the same page always names its tribes the same way. */
  var ROSTER = ['Hrafn', 'Sigrun', 'Bjorn', 'Ingrid', 'Ketil', 'Ragna',
                'Torstein', 'Gunnhild', 'Eirik', 'Solveig', 'Hakon', 'Asta',
                'Leif', 'Yrsa', 'Vidar', 'Halla', 'Sten', 'Frida', 'Orm',
                'Thora'];

  /* pairwise coprime by construction — every one is prime */
  var PERIOD = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29,
                31, 37, 41, 43, 47, 53, 59, 61, 67, 71];

  /* ─────────────────────────────────────────────────────── 2 · the discovery
     Nothing is configured. The tribes are whatever the page turns out to have,
     which is why one file drives fifty boards it has never seen. */
  var tribes = [];

  /* ---- radio groups: one tribe per name -------------------------------- */
  (function () {
    var seen = {};
    slice(D.querySelectorAll('input[type=radio]')).forEach(function (el) {
      var n = el.name;
      if (!n || seen[n]) return;
      seen[n] = 1;
      var m = slice(D.querySelectorAll('input[type=radio][name="' + n + '"]'));
      if (m.length > 1) tribes.push({ kind: 'RADIO', key: n, m: m, i: 0 });
    });
  }());

  /* ---- checkbox banks: grouped by their nearest shared ancestor ---------
     Walk up from each box until the ancestor holds more than one of them.
     That ancestor is the bank. It is how the page is already grouped
     visually, so the tribes come out where a reader would draw them. */
  (function () {
    var boxes = slice(D.querySelectorAll('input[type=checkbox]'));
    if (!boxes.length) return;
    var banks = [], owner = [];
    boxes.forEach(function (el) {
      var p = el.parentNode, hops = 0;
      while (p && p !== D.body && hops < 8 &&
             p.querySelectorAll('input[type=checkbox]').length < 2) {
        p = p.parentNode; hops++;
      }
      p = p || D.body;
      var k = owner.indexOf(p);
      if (k < 0) { owner.push(p); banks.push([]); k = banks.length - 1; }
      banks[k].push(el);
    });
    banks.forEach(function (b) {
      /* 16 boxes is 65,536 arrangements; past that split the bank so the HUD
         can still say something true about the orbit. */
      while (b.length) {
        var cut = b.splice(0, 16);
        tribes.push({ kind: 'BANK', key: cut.length + ' boxes', m: cut, i: 0 });
      }
    });
  }());

  /* ---- fragment gates: the anchors a :target board actually uses -------- */
  (function () {
    var hrefs = [], seen = {};
    slice(D.querySelectorAll('a[href^="#"]')).forEach(function (a) {
      var id = a.getAttribute('href').slice(1);
      if (!id || seen[id] || !D.getElementById(id)) return;
      seen[id] = 1; hrefs.push(id);
    });
    if (hrefs.length > 1) tribes.push({ kind: 'GATE', key: 'fragment',
                                        m: hrefs, i: 0 });
  }());

  if (!tribes.length) return;

  /* ─────────────────────────────────────────────────────── 3 · the cadences */
  tribes.forEach(function (t, k) {
    t.name = ROSTER[k % ROSTER.length] + (k >= ROSTER.length ? '·' + k : '');
    t.period = PERIOD[k % PERIOD.length];
    t.steps = (t.kind === 'BANK') ? Math.pow(2, t.m.length) : t.m.length;
    t.moved = 0;
  });

  /* ── the orbit: lcm over tribes of (period × steps). The number of beats
        before the whole board is in an arrangement it has held before. It is
        computed, not asserted, and printed in the HUD. BigInt because for a
        board with a sixteen-box bank it leaves the safe integers early. */
  var orbit = (function () {
    var gcd = function (a, b) { while (b) { var t = a % b; a = b; b = t; } return a; };
    var L = 1n;
    tribes.forEach(function (t) {
      var v = BigInt(t.period) * BigInt(t.steps);
      L = L / gcd(L, v) * v;
    });
    return L;
  }());

  /* ────────────────────────────────────────────────────────── 4 · the moves
     Each is one press. None of them looks at anything before deciding. */
  function fire(el) {
    /* a real click, so :has(:checked) and any :focus-visible rule behave the
       way they do for a hand. Radios and checkboxes both. */
    el.click();
  }

  var ntz = function (n) { var c = 0; while (!(n & 1)) { n >>= 1; c++; } return c; };

  function advance(t) {
    t.i = (t.i + 1) % t.steps;
    t.moved++;
    if (t.kind === 'RADIO') { fire(t.m[t.i]); return; }
    if (t.kind === 'BANK') {
      /* Gray code: the bit that changes between k-1 and k is the number of
         trailing zeros of k. At k = 0 the whole bank is cleared, which is the
         only moment a bank does more than one thing, and it is the wrap. */
      if (t.i === 0) { t.m.forEach(function (b) { if (b.checked) fire(b); }); return; }
      fire(t.m[ntz(t.i) % t.m.length]);
      return;
    }
    if (t.kind === 'GATE') {
      var y = window.scrollY, x = window.scrollX;
      /* replace, not assign: :target updates either way, but a run at four
         beats a second would otherwise bury the Back button under an hour of
         history. The reader keeps their scroll position too. */
      location.replace(location.pathname + location.search + '#' + t.m[t.i]);
      window.scrollTo(x, y);
    }
  }

  /* ────────────────────────────────────────────────────────── 5 · the lights */
  var LIGHTS = [
    { n: 'ALPHA', ms: 240 }, { n: 'BETA', ms: 480 },
    { n: 'DELTA', ms: 900 }, { n: 'OMEGA', ms: 1800 }
  ];
  var light = 2, timer = null, beat = 0;

  function tick() {
    beat++;
    for (var k = 0; k < tribes.length; k++) {
      if (beat % tribes[k].period === 0) advance(tribes[k]);
    }
    paint();
  }

  function run(ix) {
    light = ix;
    if (timer) { clearInterval(timer); timer = null; }
    if (ix >= 0) timer = setInterval(tick, LIGHTS[ix].ms);
    paint();
  }

  /* ────────────────────────────────────────────────────────────── 6 · the HUD
     Its own stylesheet, its own id, no class the pages use. It reports and it
     does not judge: beats, tribes, cadence, position, orbit. There is no score
     on it because there is nothing to score. */
  var css = D.createElement('style');
  css.textContent = [
    '#automat{position:fixed;left:12px;bottom:12px;z-index:2147483000;',
      'width:268px;max-height:72vh;display:flex;flex-direction:column;',
      'font:10.5px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;',
      'color:#dfe7ee;background:rgba(9,12,17,.93);border:1px solid #2b3644;',
      'border-radius:11px;box-shadow:0 10px 34px rgba(0,0,0,.55);',
      'backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}',
    '#automat *{box-sizing:border-box}',
    '#automat .hd{display:flex;align-items:baseline;gap:7px;padding:9px 11px 7px;',
      'border-bottom:1px solid #2b3644;cursor:pointer;user-select:none}',
    '#automat .hd b{font-size:10px;letter-spacing:.19em;color:#e0b155}',
    '#automat .hd s{margin-left:auto;text-decoration:none;color:#67788a}',
    '#automat .bd{overflow-y:auto;padding:8px 11px 4px}',
    '#automat.min .bd,#automat.min .ft{display:none}',
    '#automat .t{display:grid;grid-template-columns:1fr auto auto;gap:8px;',
      'align-items:baseline;padding:3px 0}',
    '#automat .t i{font-style:normal;color:#8a9aa8;font-size:9px;',
      'letter-spacing:.1em;margin-right:5px}',
    '#automat .t u{text-decoration:none;color:#f0f4f8}',
    '#automat .t em{font-style:normal;color:#4fd18b;font-size:9.5px}',
    '#automat .t s{text-decoration:none;color:#67788a;font-size:9.5px}',
    '#automat .lg{display:flex;gap:4px;padding:8px 11px;border-top:1px solid #2b3644}',
    '#automat .lg button{flex:1;cursor:pointer;font:8.5px/1 inherit;',
      'letter-spacing:.11em;padding:7px 0;border-radius:6px;',
      'border:1px solid #2b3644;background:#121821;color:#8a9aa8}',
    '#automat .lg button:hover{color:#dfe7ee;border-color:#3d4a5c}',
    '#automat .lg button.on{color:#0b0f14;background:#4fd18b;border-color:#4fd18b;',
      'font-weight:700}',
    '#automat .lg button.stop.on{background:#e0705a;border-color:#e0705a}',
    '#automat .ft{padding:7px 11px 10px;color:#67788a;font-size:9px;line-height:1.6;',
      'border-top:1px solid #2b3644}',
    '#automat .ft b{color:#8a9aa8;font-weight:600}',
    '@media (max-width:640px){#automat{width:auto;right:12px}}',
    '@media (prefers-reduced-motion:reduce){#automat{backdrop-filter:none}}'
  ].join('');
  D.head.appendChild(css);

  var hud = D.createElement('div');
  hud.id = 'automat';
  hud.innerHTML =
    '<div class="hd"><b>AUTOMAT</b><s id="au-min">&minus;</s></div>' +
    '<div class="bd" id="au-bd"></div>' +
    '<div class="lg" id="au-lg"></div>' +
    '<div class="ft" id="au-ft"></div>';
  D.body.appendChild(hud);

  D.getElementById('au-min').parentNode.addEventListener('click', function () {
    hud.className = hud.className ? '' : 'min';
  });

  var lg = D.getElementById('au-lg');
  LIGHTS.concat([{ n: 'STOP', ms: 0 }]).forEach(function (L, ix) {
    var b = D.createElement('button');
    b.textContent = L.n;
    if (L.n === 'STOP') b.className = 'stop';
    b.addEventListener('click', function (e) {
      e.stopPropagation();
      run(ix >= LIGHTS.length ? -1 : ix);
    });
    lg.appendChild(b);
  });

  /* the orbit, said in whatever unit is not a lie */
  function orbitText(ms) {
    var s = orbit.toString();
    if (s.length > 15) return '10^' + (s.length - 1) + ' beats — no human span';
    var sec = Number(orbit) * ms / 1000;
    var u = [[31557600, 'y'], [86400, 'd'], [3600, 'h'], [60, 'm'], [1, 's']];
    for (var k = 0; k < u.length; k++) {
      if (sec >= u[k][0]) {
        var v = sec / u[k][0];
        return s + ' beats ≈ ' + (v >= 100 ? Math.round(v) : v.toFixed(1)) + u[k][1];
      }
    }
    return s + ' beats';
  }

  var bd = D.getElementById('au-bd'), ft = D.getElementById('au-ft');

  function paint() {
    var rows = '';
    for (var k = 0; k < tribes.length; k++) {
      var t = tribes[k];
      rows += '<div class="t"><span><i>' + t.kind + '</i><u>' + t.name +
              '</u></span><em>&times;' + t.period + '</em><s>' +
              (t.i + 1) + '/' + t.steps + '</s></div>';
    }
    bd.innerHTML = rows;
    var btns = lg.children;
    for (var j = 0; j < btns.length; j++) {
      btns[j].className = (btns[j].className.indexOf('stop') === 0 ? 'stop ' : '') +
        ((light < 0 ? j === LIGHTS.length : j === light) ? 'on' : '');
    }
    ft.innerHTML =
      'beat <b>' + beat + '</b> · ' + tribes.length + ' tribes · ' +
      (light < 0 ? 'held' : LIGHTS[light].ms + 'ms') + '<br>' +
      'orbit <b>' + orbitText(light < 0 ? LIGHTS[2].ms : LIGHTS[light].ms) + '</b><br>' +
      'no win condition &middot; no ending';
  }

  run(2);   /* DELTA. A pace you can read at. */
}());

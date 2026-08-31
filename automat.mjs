#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   automat.mjs — builds automat.html, the script layer's own board.

   It reads the yard rather than a list, so a page added tomorrow appears on
   the wall tomorrow without anybody editing anything. For each board it counts
   the three things automat.js will find — radio groups, checkboxes, fragment
   anchors — and computes, exactly, how many beats that board runs before it is
   in an arrangement it has held before. That number is the point of the page.

       node automat.mjs
   ═══════════════════════════════════════════════════════════════════════════ */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* the same primes automat.js hands out, in the same order */
const PERIOD = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29,
                31, 37, 41, 43, 47, 53, 59, 61, 67, 71];
const ROSTER = ['Hrafn', 'Sigrun', 'Bjorn', 'Ingrid', 'Ketil', 'Ragna',
                'Torstein', 'Gunnhild', 'Eirik', 'Solveig', 'Hakon', 'Asta',
                'Leif', 'Yrsa', 'Vidar', 'Halla', 'Sten', 'Frida', 'Orm', 'Thora'];

const gcd = (a, b) => { while (b) { const t = a % b; a = b; b = t; } return a; };

function scan(rel) {
  const s = readFileSync(rel, 'utf8');
  const title = (s.match(/<title>([\s\S]*?)<\/title>/) || [, rel])[1].trim();
  const groups = new Set();
  for (const m of s.matchAll(/<input[^>]*type="radio"[^>]*name="([^"]+)"/g)) groups.add(m[1]);
  for (const m of s.matchAll(/name="([^"]+)"[^>]*type="radio"/g)) groups.add(m[1]);

  /* radio group sizes */
  const sizes = [...groups].map((n) => {
    const re = new RegExp(`name="${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g');
    return (s.match(re) || []).length;
  }).filter((k) => k > 1);

  const boxes = (s.match(/type="checkbox"/g) || []).length;
  const frags = new Set();
  for (const m of s.matchAll(/href="#([\w-]+)"/g)) {
    if (s.includes(`id="${m[1]}"`)) frags.add(m[1]);
  }

  /* the tribes automat.js will build, in the order it builds them: radios
     first, then checkbox banks (capped at 16 boxes each), then the gate. */
  const tribes = [];
  sizes.forEach((k) => tribes.push({ kind: 'RADIO', steps: k }));
  let left = boxes;
  while (left > 0) { const c = Math.min(16, left); tribes.push({ kind: 'BANK', steps: 2 ** c }); left -= c; }
  if (frags.size > 1) tribes.push({ kind: 'GATE', steps: frags.size });

  /* orbit = lcm over tribes of period × steps */
  let orbit = 1n;
  tribes.forEach((t, i) => {
    t.name = ROSTER[i % ROSTER.length];
    t.period = PERIOD[i % PERIOD.length];
    const v = BigInt(t.period) * BigInt(t.steps);
    orbit = orbit / gcd(orbit, v) * v;
  });
  return { rel, title, tribes, radios: sizes.length, boxes, frags: frags.size, orbit };
}

/* 900ms is DELTA, the light the run opens on */
function span(orbit) {
  const s = orbit.toString();
  if (s.length > 15) return '10^' + (s.length - 1) + ' beats';
  let sec = Number(orbit) * 0.9;
  for (const [n, u] of [[31557600, 'y'], [86400, 'd'], [3600, 'h'], [60, 'm'], [1, 's']]) {
    if (sec >= n) { const v = sec / n; return (v >= 100 ? Math.round(v) : v.toFixed(1)) + u; }
  }
  return '<1s';
}

const files = [
  ...readdirSync('.').filter((f) => f.endsWith('.html') && f !== 'automat.html').sort(),
  ...readdirSync('lessons').filter((f) => f.endsWith('.html')).sort().map((f) => 'lessons/' + f)
];
const all = files.map(scan);
const live = all.filter((b) => b.tribes.length).sort((a, b) => b.tribes.length - a.tribes.length);
const inert = all.filter((b) => !b.tribes.length);
const deepest = live[0];
const totalTribes = live.reduce((a, b) => a + b.tribes.length, 0);

/* ── the same beat, in every language that can script ─────────────────────
   One function each. It takes the beat, advances every tribe whose period
   divides it, and returns nothing — because there is nothing to return. The
   languages differ in eleven ways and in none of the ones that matter. */
const TONGUES = [
  ['JavaScript', 'automat.js — the one that actually runs', `function tick(beat, tribes) {
  for (const t of tribes)
    if (beat % t.period === 0) t.i = (t.i + 1) % t.steps;
}`],
  ['Python', 'the yard’s build scripts are written in it', `def tick(beat, tribes):
    for t in tribes:
        if beat % t.period == 0:
            t.i = (t.i + 1) % t.steps`],
  ['Scala', 'venus-core speaks it — see the ledger book', `def tick(beat: Long, tribes: Seq[Tribe]): Unit =
  for (t <- tribes if beat % t.period == 0)
    t.i = (t.i + 1) % t.steps`],
  ['Java', 'the firefly swarm is a Spring Modulith service', `void tick(long beat, List<Tribe> tribes) {
  for (Tribe t : tribes)
    if (beat % t.period == 0) t.i = (t.i + 1) % t.steps;
}`],
  ['PowerShell', 'the shell this repo is driven from', `function Tick($beat, $tribes) {
  foreach ($t in $tribes) {
    if ($beat % $t.period -eq 0) { $t.i = ($t.i + 1) % $t.steps }
  }
}`],
  ['bash', 'arrays, arithmetic, and no types at all', `tick() {
  local beat=$1 k
  for k in "\${!period[@]}"; do
    (( beat % period[k] == 0 )) && (( i[k] = (i[k] + 1) % steps[k] ))
  done
}`],
  ['Lua', 'one-indexed, so the modulo moves', `function tick(beat, tribes)
  for _, t in ipairs(tribes) do
    if beat % t.period == 0 then t.i = t.i % t.steps + 1 end
  end
end`],
  ['Ruby', 'the block is the loop', `def tick(beat, tribes)
  tribes.each { |t| t.i = (t.i + 1) % t.steps if (beat % t.period).zero? }
end`],
  ['Go', 'no while, no ternary, one loop keyword', `func tick(beat int, tribes []*Tribe) {
	for _, t := range tribes {
		if beat%t.period == 0 {
			t.i = (t.i + 1) % t.steps
		}
	}
}`],
  ['SQL', 'set-at-a-time: there is no loop to write', `UPDATE tribes
   SET i = (i + 1) % steps
 WHERE :beat % period = 0;`]
];

const wallRow = (b) => `      <a class="b" href="${esc(b.rel)}?run">
        <b>${esc(b.title)}</b>
        <s>${esc(b.rel)}</s>
        <span>${b.tribes.length} tribe${b.tribes.length === 1 ? '' : 's'}
          &middot; ${b.radios} radio &middot; ${b.boxes} box &middot; ${b.frags} frag</span>
        <em>orbit ${span(b.orbit)}</em>
      </a>`;

const STYLE = readFileSync('.sky-block.txt', 'utf8').replace('#060a08', '#080a0e');

writeFileSync('automat.html', `<title>Automat &middot; the script layer</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<!--
  AUTOMAT — the script layer of the Venus yard, and its own board.

  Every other page here decides in CSS. This one is about the two files that
  do not: automat.js, which presses the controls forever, and devmode.js, which
  lets you put something into a live page and watch the cascade take it.

  Both are inert unless the URL carries a query string, and that is the whole
  design rather than a courtesy. persist.html established the rule the hard
  way: CSS reads the fragment through :target and cannot read the query. So the
  query is the half of a URL the style layer is structurally blind to, and a
  script switched on there cannot collide with a stylesheet that cannot see it.

  Generated by automat.mjs from the yard itself. ${live.length} boards have
  tribes; ${inert.length} have nothing for a hand to press. The orbit column is
  computed, not asserted: it is lcm over the board's tribes of (period × steps)
  at 900ms a beat, which is how long that board runs before it is in an
  arrangement it has already been in.

  This page is a document about scripts. It runs none of its own.
-->
<style>
  :root{--void:#080a0e;--card:#111721;--card2:#161d28;--edge:#28323f;
    --ink:#e6ecf3;--dim:#8795a5;--bone:#e4d9b8;--cool:#6ec6ff;--go:#4fd18b;
    --stop:#e0705a;--gold:#e0b155;--violet:#9d8ae0}
  *{box-sizing:border-box}
  body{margin:0;padding:20px 16px 52px;color:var(--ink);background:var(--void);
    font:13.5px/1.64 ui-rounded,system-ui,-apple-system,sans-serif;
    background-image:
      radial-gradient(circle at 14% -6%,rgba(110,198,255,.11),transparent 44%),
      radial-gradient(circle at 88% 96%,rgba(79,209,139,.08),transparent 42%)}
  .w{max-width:1040px;margin:0 auto}
  header{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;
    border-bottom:1px solid var(--edge);padding-bottom:12px;margin-bottom:18px}
  h1{margin:0;font-size:22px;letter-spacing:-.018em;color:var(--bone)}
  header .sub{color:var(--dim);font-size:11.5px;max-width:70ch}
  header .tag{margin-left:auto;font:9px/1 ui-monospace,monospace;letter-spacing:.2em;
    text-transform:uppercase;color:var(--cool);border:1px solid var(--cool);
    border-radius:4px;padding:4px 9px}
  h2{font:9.5px/1 ui-monospace,Menlo,monospace;letter-spacing:.2em;
    text-transform:uppercase;color:var(--dim);margin:28px 0 10px;font-weight:600;
    display:flex;justify-content:space-between;align-items:baseline;gap:12px}
  h2 b{color:var(--bone);font-family:inherit;letter-spacing:0;text-transform:none;
    font-size:10.5px;font-weight:600}
  p.n{color:var(--dim);font-size:11px;line-height:1.7;margin:9px 0 0;max-width:96ch}
  p.n b{color:var(--ink)} p.n em{color:var(--gold);font-style:normal}
  a{color:var(--gold)}
  code{font:10.5px ui-monospace,monospace;color:var(--ink);background:#0b1017;
    border:1px solid var(--edge);border-radius:4px;padding:1px 5px}
  .panel{background:linear-gradient(180deg,var(--card),var(--card2));
    border:1px solid var(--edge);border-radius:12px;padding:15px 16px}
  pre{margin:0;padding:12px 13px;background:#0a0f16;border:1px solid var(--edge);
    border-radius:9px;overflow-x:auto;font:10.5px/1.7 ui-monospace,monospace;
    color:#b9c6d4}
  pre b{color:var(--cool);font-weight:600}
  pre i{color:#5f6f80;font-style:normal}

  /* ---------------------------------------------------------- the channel */
  .chan{display:grid;gap:10px;grid-template-columns:1fr 1fr}
  @media (max-width:820px){.chan{grid-template-columns:1fr}}
  .chan div{background:#0c1219;border:1px solid var(--edge);border-radius:10px;
    padding:12px 13px}
  .chan div:first-child{border-left:3px solid var(--violet)}
  .chan div:last-child{border-left:3px solid var(--cool)}
  .chan h4{margin:0 0 5px;font:9px/1 ui-monospace,monospace;letter-spacing:.16em;
    text-transform:uppercase;color:var(--dim)}
  .chan code{display:block;background:none;border:0;padding:0;font-size:12px;
    color:var(--bone);margin-bottom:6px}
  .chan p{margin:0;font-size:10.5px;color:var(--dim);line-height:1.65}

  /* ------------------------------------------------------------- the wall */
  .wall{display:grid;gap:9px;grid-template-columns:repeat(3,1fr)}
  @media (max-width:900px){.wall{grid-template-columns:repeat(2,1fr)}}
  @media (max-width:600px){.wall{grid-template-columns:1fr}}
  .b{display:block;text-decoration:none;background:#0c1219;
    border:1px solid var(--edge);border-radius:10px;padding:11px 12px;
    color:var(--dim)}
  .b:hover{border-color:var(--go);background:#0e1720}
  .b b{display:block;font-size:12px;color:var(--ink);line-height:1.4;
    margin-bottom:3px}
  .b:hover b{color:var(--go)}
  .b s{display:block;text-decoration:none;font:9px/1.5 ui-monospace,monospace;
    color:var(--gold);margin-bottom:5px}
  .b span{display:block;font:9px/1.5 ui-monospace,monospace;color:#5f6f80}
  .b em{display:block;font:9px/1.5 ui-monospace,monospace;font-style:normal;
    color:var(--violet);margin-top:3px}
  .flat{display:flex;flex-wrap:wrap;gap:6px}
  .flat a{font:10px/1 ui-monospace,monospace;text-decoration:none;color:var(--dim);
    border:1px solid var(--edge);border-radius:6px;padding:6px 8px}
  .flat a:hover{color:var(--ink);border-color:#3d4a5c}

  /* ------------------------------------------------------------- the gray */
  .gray{width:100%;border-collapse:collapse;font:10.5px/1.5 ui-monospace,monospace;
    margin-top:10px}
  .gray th{text-align:left;font-weight:600;color:var(--dim);font-size:9px;
    letter-spacing:.13em;text-transform:uppercase;padding:0 8px 6px 0;
    border-bottom:1px solid var(--edge)}
  .gray td{padding:4px 8px 4px 0;border-bottom:1px solid #18202a;color:#b9c6d4}
  .gray td.f{color:var(--go)}
  .gray td.g{color:var(--bone);letter-spacing:.24em}

  /* ------------------------------------------------------------ the lights */
  .lights{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}
  .lights span{font:9px/1 ui-monospace,monospace;letter-spacing:.13em;
    padding:9px 13px;border-radius:7px;border:1px solid var(--edge);
    color:var(--dim)}
  .lights span.go{border-color:var(--go);color:var(--go)}
  .lights span.no{border-color:var(--stop);color:var(--stop)}

  /* ----------------------------------------------------------- the tongues */
  .tng{display:grid;gap:11px;grid-template-columns:1fr 1fr}
  @media (max-width:880px){.tng{grid-template-columns:1fr}}
  .tng section{background:#0c1219;border:1px solid var(--edge);border-radius:10px;
    padding:11px 12px}
  .tng h4{margin:0;font-size:12px;color:var(--bone);display:flex;
    align-items:baseline;gap:8px}
  .tng h4 i{font-style:normal;font:9px/1 ui-monospace,monospace;color:#5f6f80;
    margin-left:auto;text-align:right;max-width:60%}
  .tng pre{margin-top:8px;background:#080d13}

  footer{margin-top:34px;padding-top:14px;border-top:1px solid var(--edge);
    color:var(--dim);font-size:10.5px}
${STYLE}</style>

<div class="w">
  <header>
    <h1>Automat</h1>
    <span class="sub">The script layer. It adds no rules, reads no outcome and
      decides nothing &mdash; it presses. ${live.length} boards, ${totalTribes}
      tribes, no win condition and no ending.</span>
    <span class="tag">?run &middot; ?dev</span>
  </header>

  <h2>The channel <b>why a query string and not a fragment</b></h2>
  <div class="panel">
    <div class="chan">
      <div>
        <h4>the style layer reads this half</h4>
        <code>board.html<b style="color:var(--violet)">#st-b2</b></code>
        <p>The fragment. <code>:target</code> is the only selector that can see
          it, which is why it is the yard&rsquo;s durable state and why
          <a href="persist.html">persist.html</a> is built entirely out of
          links. One target per document, so the table has to be enumerated.</p>
      </div>
      <div>
        <h4>the script layer reads this half</h4>
        <code>board.html<b style="color:var(--cool)">?run&amp;dev</b></code>
        <p>The query. <b>CSS cannot read it. Nothing in CSS can.</b> That makes
          it the one place a script can be switched on without the stylesheet
          ever learning a script exists &mdash; the two layers read different
          halves of the same address and cannot collide.</p>
      </div>
    </div>
    <p class="n">So every page in this yard now ships two inert
      <code>&lt;script&gt;</code> tags and every page in this yard still decides
      everything in its stylesheet. Open one plainly and nothing runs. The claim
      was never <em>there is no script file</em>; it was <b>the logic is the
      cascade</b>, and that is intact, checkable, and now checkable from inside
      the page with <code>?dev</code>.</p>
  </div>

  <h2>The tribes <b>three kinds of control, one hand</b></h2>
  <div class="panel">
    <p class="n"><b>RADIO</b> &mdash; n options, one live; the tribe advances its
      index mod n. <b>BANK</b> &mdash; k checkboxes counted in <em>Gray
      code</em>. <b>GATE</b> &mdash; the fragment links, walked in order with
      the scroll position put back, using <code>location.replace</code> so four
      beats a second does not bury the Back button under an hour of history.</p>
    <p class="n">Gray code is the one worth explaining. A binary counter visits
      every arrangement too, but it flips up to k boxes in a single step. Gray
      code flips exactly one, every time, and still visits all 2<sup>k</sup>
      exactly once before repeating &mdash; which is what a hand does, and it
      means every beat is one legible change rather than a shuffle. The bit that
      moves between step <code>k&minus;1</code> and step <code>k</code> is the
      number of trailing zeros of <code>k</code>, and that is the entire
      implementation.</p>
    <table class="gray">
      <tr><th>step</th><th>trailing zeros</th><th>flips</th><th>bank of three</th></tr>
${Array.from({ length: 8 }, (_, k) => {
  const g = k ^ (k >> 1);
  const ntz = k === 0 ? '— wrap' : (() => { let n = k, c = 0; while (!(n & 1)) { n >>= 1; c++; } return c; })();
  const bits = [2, 1, 0].map((b) => (g >> b) & 1 ? '■' : '□').join('');
  return `      <tr><td>${k}</td><td>${ntz}</td><td class="f">${k === 0 ? 'clear all' : 'box ' + ntz}</td><td class="g">${bits}</td></tr>`;
}).join('\n')}
    </table>
  </div>

  <h2>The cadences <b>primes, so the board walks its lattice and not its diagonal</b></h2>
  <div class="panel">
    <p class="n">Tribes get periods off the primes in document order:
      <code>${PERIOD.slice(0, 8).join(' &middot; ')} &hellip;</code> Two tribes
      on 3 and 5 do not fall into step for fifteen beats. Six tribes on
      2&middot;3&middot;5&middot;7&middot;11&middot;13 do not for
      ${2 * 3 * 5 * 7 * 11 * 13}. Give them all period 1 and the run only ever
      sees the diagonal of the state space; give them coprime periods and it
      walks the whole thing.</p>
    <p class="n">The <b>orbit</b> is the honest number: lcm over the board&rsquo;s
      tribes of (period &times; steps), the count of beats before that board is
      in an arrangement it has already held. It is printed on every tile below
      and in the HUD, and it is computed both places rather than claimed.
      <b>${esc(deepest.title)}</b> is the deepest board in the yard at
      ${deepest.tribes.length} tribes &mdash; ${span(deepest.orbit)} at 900ms a
      beat, which is longer than anyone is going to sit there.</p>
    <div class="lights">
      <span class="go">ALPHA 240ms</span><span class="go">BETA 480ms</span>
      <span class="go">DELTA 900ms</span><span class="go">OMEGA 1800ms</span>
      <span class="no">STOP</span>
    </div>
    <p class="n">Four lights, all go, and one stop kept for emergencies. STOP
      resets nothing; press a light and the run picks up on the beat it was on.
      There is no reset anywhere in the file, because a reset implies a
      beginning and there is not one.</p>
  </div>

  <h2>What is not in the file <b>and why that is the argument</b></h2>
  <div class="panel">
    <p class="n">No scoring function. No goal state. No comparison of one
      arrangement against another, no termination test, no <em>solved</em>, no
      <em>failed</em>, and no counter that only goes one way. That is
      <a href="theory.md">theory.md</a> in forty lines: <b>a loss condition is a
      scarcity, and a scarcity is a rent.</b> Nothing here is scarce, every state
      is reachable from every other, all of them are worth the same, and the run
      has no more reason to stop at one than at another.</p>
    <p class="n">Which is also the answer to what a fungible, decentralised
      thing actually is, stated as code rather than as a pitch: <b>fungible</b>
      because no arrangement is worth more than another and the automat has no
      way to prefer one; <b>decentralised</b> because no tribe reads any other
      tribe. There is no coordinator in the loop. Each band keeps its own beat
      and the pattern on the board is what falls out of them not talking. Take
      any tribe away and the rest do not notice, which is the property, and it
      is the only one that matters.</p>
  </div>

  <h2>Dev mode <b>devmode.js &middot; put something in and watch the cascade take it</b></h2>
  <div class="panel">
    <p class="n"><b>CSS</b> &mdash; a textarea that is a stylesheet, injected
      last, after every rule the page ships. So if what you typed still does not
      apply, the loss was specificity and not order. <b>HTML</b> &mdash; a
      selector and a fragment; state here is structural, so adding a checkbox is
      adding a term to the arithmetic and you can watch the counters move.
      <b>PROBE</b> &mdash; click anything and get every rule in the page that
      matches it, in source order, with specificity computed the way the spec
      counts it (<code>:has()</code> and <code>:is()</code> contribute their
      most specific argument; <code>:where()</code> contributes nothing).
      <b>CENSUS</b> &mdash; what the page is made of.</p>
    <p class="n">PROBE exists because of a real failure in this repo. A blanket
      stop rule in <a href="ecosystem.html">ecosystem.html</a> at
      <code>(1,3,0)</code> lost silently to every capability rule at
      <code>(2,4,0)</code>, and nothing on the screen said so &mdash; a rule
      that loses looks exactly like a rule that was never written. The
      arithmetic is still nailed to the foot of that stylesheet. This panel is
      what would have caught it in ten seconds.</p>
    <div class="flat" style="margin-top:11px">
      <a href="ecosystem.html?dev">ecosystem.html?dev</a>
      <a href="persist.html?dev">persist.html?dev</a>
      <a href="pulse.html?run&amp;dev">pulse.html?run&amp;dev</a>
      <a href="station.html?run&amp;dev">station.html?run&amp;dev</a>
    </div>
  </div>

  <h2>The wall <b>${live.length} boards with something to press &middot; orbit at 900ms</b></h2>
  <div class="wall">
${live.map(wallRow).join('\n')}
  </div>
  <p class="n">Every tile opens that board with <code>?run</code>. Add
    <code>&amp;dev</code> for the panel. ${inert.length} more pages have no
    control for a hand to reach &mdash; they are documents, and they are listed
    here so the wall is a census and not a selection:</p>
  <div class="flat" style="margin-top:9px">
${inert.map((b) => `    <a href="${esc(b.rel)}">${esc(b.rel)}</a>`).join('\n')}
  </div>

  <h2>The same beat, in every language that can script <b>one function, ${TONGUES.length} tongues</b></h2>
  <p class="n">The whole automat is one function: take the beat, advance every
    tribe whose period divides it, return nothing &mdash; because there is
    nothing to return. Here it is in each language the yard touches or expects
    to. They differ in eleven ways and in none of the ones that matter, which is
    the actual lesson: <b>the loop is not the hard part and it never was.</b>
    The hard part was deciding there is no win condition.</p>
  <div class="tng" style="margin-top:12px">
${TONGUES.map(([n, why, code]) => `    <section>
      <h4>${esc(n)}<i>${esc(why)}</i></h4>
      <pre>${esc(code)}</pre>
    </section>`).join('\n')}
  </div>
  <p class="n">SQL is the odd one and it is the instructive one: there is no
    loop to write, because the language is set-at-a-time and the iteration is
    the engine&rsquo;s business. Every other entry here is spelling. That one is
    a different idea about what a step is.</p>

  <footer>
    Generated by <a href="automat.mjs">automat.mjs</a> from the yard itself
    &mdash; ${all.length} pages read, ${live.length} with tribes. The script
    layer is <a href="automat.js">automat.js</a> and
    <a href="devmode.js">devmode.js</a>; both are inert without a query string.
    &middot; <a href="theory.md">theory.md</a>
    &middot; <a href="templates/index.html">the compiled templates</a>
    &middot; <a href="index.html">the yard</a>
  </footer>
</div>
<script src="automat.js"></script>
<script src="devmode.js"></script>
`);

console.log(`automat.html · ${all.length} pages · ${live.length} with tribes · ${totalTribes} tribes`);
console.log(`  deepest: ${deepest.rel} — ${deepest.tribes.length} tribes, orbit ${span(deepest.orbit)}`);
console.log(`  tongues: ${TONGUES.map((t) => t[0]).join(', ')}`);

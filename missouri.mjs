#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   missouri.mjs — builds missouri.html: ten riverfront sites, and whether the
   water can actually carry the load.

   YOU ASKED WHICH OF THREE ANALYSES TO RUN FIRST. It should be the flow rate,
   and not because it is the most interesting — because it is the only one of
   the three that can KILL the plan. The brick timeline and the plant layout
   are both questions about how to do it. The flow rate is a question about
   whether it can be done at all, and answering the how-questions first is how
   a project spends two years on a schedule for something that was never going
   to work.

   ── the physics, which is the whole finding ─────────────────────────────
   A free-stream turbine — no dam, no head, just a rotor in a current — takes

       P = ½ · ρ · A · v³ · Cp

   and every term in that is unremarkable except the CUBE on velocity. Betz
   caps Cp at 16/27, about 0.593, for any open-flow device; real in-stream
   units land nearer 0.35.

   The consequence is the thing worth internalising: DISCHARGE DOES NOT APPEAR
   IN THAT EQUATION. Discharge is the number that impresses — the Mississippi
   at Cape Girardeau moves three times the Missouri at Hermann — and it buys
   you nothing per turbine. Only velocity pays, and it pays as the cube, so a
   third off the speed takes seventy per cent off the power.

   ── and what that does to the site list ─────────────────────────────────
   Missouri's great rivers are enormous and slow, because they are low
   gradient. The two lake sites are worse than slow: an impoundment has no
   through-current at the shore at all, and a tailwater below a dam has
   current only while the dam is generating.

   The file computes the load, computes what one rotor returns at each site,
   and prints the number of rotors. Where that number is absurd it says so.

   ── the brick number is also wrong ──────────────────────────────────────
   Five million bricks across ten castles is five hundred thousand each.
   Malbork — the largest castle on Earth — took about four and a half million
   for one. The file derives the requirement from wall volume and prints the
   gap rather than arguing about it.

   EVERY HYDROLOGICAL FIGURE HERE IS ORDER-OF-MAGNITUDE and labelled. A real
   project pulls the USGS gauge record for the specific reach and the specific
   season. What survives the uncertainty is the SHAPE of the answer, and the
   shape is not close.

       node missouri.mjs
   ═══════════════════════════════════════════════════════════════════════════ */
import { writeFileSync } from 'node:fs';

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const n0 = (x) => Math.round(x).toLocaleString();
const n1 = (x) => x.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/* ═══ 1 · the physics ══════════════════════════════════════════════════ */
const RHO = 1000;              /* fresh water, kg/m³ */
const BETZ = 16 / 27;          /* 0.5926 — the hard ceiling for any open flow */
const CP = 0.35;               /* what a real in-stream rotor returns */
const ROTOR_D = 3.0;           /* metres — a large unit for a river */
const AREA = Math.PI * (ROTOR_D / 2) ** 2;

const kinetic = (v) => 0.5 * RHO * AREA * v ** 3 * CP;   /* watts */

/* ═══ 2 · the load one estate actually draws ═══════════════════════════ */
/* Built up from the functions in the brief rather than guessed as a lump. */
const LOAD = [
  ['Estate baseload', 'lighting, controls, domestic, workshops', 50, 1.0],
  ['Cannery', 'retort steam, seamer, wash-down', 150, 0.25],
  ['Distillery', 'still heat and condenser pumping', 100, 0.30],
  ['Fishery', 'circulation, aeration, chillers', 80, 0.85],
  ['Dewatering', 'centrifuge and pellet dryer', 45, 0.40],
  ['Incinerator', 'forced draught, scrubber, controls', 30, 0.60]
];
const PEAK_KW = LOAD.reduce((a, l) => a + l[2], 0);
const AVG_KW = LOAD.reduce((a, l) => a + l[2] * l[3], 0);

/* ═══ 3 · the ten sites ════════════════════════════════════════════════ */
/* Mean discharge in m³/s and a representative mid-channel velocity in m/s.
   ORDER OF MAGNITUDE, from published means, not gauge readings. `duty` is the
   share of the year the current is actually there — 1.0 for a free river, far
   less below a peaking dam, and effectively nil in an impoundment. */
const SITES = [
  { n: 1, name: 'Hermann',        water: 'Missouri River',        q: 2600, v: 1.4, duty: 1.00,
    kind: 'free river', note: 'Big, and slow because it is flat. The discharge is not the number that matters.' },
  { n: 2, name: 'Camdenton',      water: 'Lake of the Ozarks',    q: 0,    v: 0.05, duty: 1.00,
    kind: 'impoundment', note: 'A reservoir has no through-current at the shore. There is nothing for a rotor to take.' },
  { n: 3, name: 'Cape Girardeau', water: 'Mississippi River',     q: 7400, v: 1.5, duty: 1.00,
    kind: 'free river', note: 'Three times Hermann’s discharge and the same velocity, so the same power per rotor.' },
  { n: 4, name: 'St. Charles',    water: 'Missouri River',        q: 2700, v: 1.4, duty: 1.00,
    kind: 'free river', note: 'Alluvial plain — the shallow water table is real and is the site’s actual asset.' },
  { n: 5, name: 'Ste. Genevieve', water: 'Mississippi River',     q: 6400, v: 1.4, duty: 1.00,
    kind: 'free river', note: 'Same reach, same physics.' },
  { n: 6, name: 'Warsaw',         water: 'Osage below Truman',    q: 90,   v: 0.9, duty: 0.30,
    kind: 'tailwater', note: 'Current only while the dam generates. A peaking dam is not a baseload source.' },
  { n: 7, name: 'Hannibal',       water: 'Upper Mississippi',     q: 3300, v: 1.2, duty: 1.00,
    kind: 'free river', note: 'Slower than the lower reach; the cube makes that matter more than it sounds.' },
  { n: 8, name: 'Rocheport',      water: 'Missouri River',        q: 2500, v: 1.4, duty: 1.00,
    kind: 'free river', note: 'Same river, same answer.' },
  { n: 9, name: 'Branson',        water: 'Lake Taneycomo',        q: 60,   v: 0.6, duty: 0.25,
    kind: 'tailwater', note: 'Cold bottom release is genuinely useful — for cooling, which is not electricity.' },
  { n: 10, name: 'Doniphan',      water: 'Current River',         q: 36,   v: 0.8, duty: 1.00,
    kind: 'spring-fed', note: 'Clean and steady and small. Excellent hatchery water, negligible kinetic power.' }
];

const rows = SITES.map((s) => {
  const perRotor = kinetic(s.v);                      /* watts, while flowing */
  const effective = perRotor * s.duty;                /* averaged over a year */
  const needAvg = effective > 0 ? (AVG_KW * 1000) / effective : Infinity;
  const needPeak = perRotor > 0 ? (PEAK_KW * 1000) / perRotor : Infinity;
  /* how much of the river you would be standing in: rotor swept area against
     a plausible channel cross-section */
  const channel = s.q > 0 && s.v > 0 ? s.q / s.v : 0;  /* m² of wetted section */
  const blockage = channel > 0 ? (needAvg * AREA) / channel : Infinity;
  return { ...s, perRotor, effective, needAvg, needPeak, channel, blockage };
});

const viable = rows.filter((r) => r.needAvg < 40);
const best = rows.reduce((a, b) => (a.perRotor > b.perRotor ? a : b));
const worst = rows.filter((r) => r.perRotor > 0)
  .reduce((a, b) => (a.perRotor < b.perRotor ? a : b));
const ratio = best.perRotor / worst.perRotor;
const vRatio = best.v / worst.v;

/* the head comparison: what a 6 m drop on a small stream returns, for scale.
   P = rho g Q H eta */
const headP = (q, h, eta) => RHO * 9.81 * q * h * eta;
const SMALL = { q: 1.2, h: 6, eta: 0.75 };
const smallHead = headP(SMALL.q, SMALL.h, SMALL.eta);

/* ═══ 4 · the bricks ═══════════════════════════════════════════════════ */
/* From wall volume, not from a round number. A common red brick with mortar
   occupies about 0.002 m³, so roughly 500 to the cubic metre. */
const BRICK_PER_M3 = 500;
const WALL_T = 0.6;                              /* metres, load-bearing */
const CASTLE = { w: 90, d: 70, wallH: 9 };       /* a modest keep-and-ward */
const perimeter = 2 * (CASTLE.w + CASTLE.d);
const wallVol = perimeter * CASTLE.wallH * WALL_T;
const rangeVol = (CASTLE.w * CASTLE.d * 0.34) * 0.18 * 12;   /* internal ranges */
const bricksOne = (wallVol + rangeVol) * BRICK_PER_M3;
const bricksTen = bricksOne * 10;
const CLAIMED = 5e6;
const gap = bricksTen / CLAIMED;
const BRICK_KG = 2.3;
const tonnesTen = bricksTen * BRICK_KG / 1000;

/* ═══ 5 · the page ═════════════════════════════════════════════════════ */
const html = '<!doctype html>\n<html lang="en">\n<head>\n' +
'<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n' +
'<title>Ten sites on the water &middot; does the river carry it?</title>\n' +
'<!-- No off-origin requests. Every figure computed in missouri.mjs. -->\n' +
'<style>\n' +
`  :root{
    --paper:#f6f3ea; --paper2:#ece6d6; --ink:#1f1d19; --dim:#5c574d;
    --faint:#8c8578; --rule:#d9d1bf; --edge:#c4b9a2;
    --river:#2d5a6b; --warn:#9a3d2c; --good:#3f6636; --gold:#8a6a1c;
    --serif:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;
    --mono:ui-monospace,"Cascadia Mono",Consolas,"SF Mono",Menlo,monospace;
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--paper);color:var(--ink);
    font:17px/1.72 var(--serif);padding:46px 22px 100px}
  main{max-width:900px;margin:0 auto}
  a{color:var(--river)}
  .kick{margin:0 0 9px;font:400 9px/1 var(--mono);letter-spacing:.34em;
    text-transform:uppercase;color:var(--warn)}
  h1{margin:0 0 8px;font:500 42px/1.06 var(--serif)}
  .sub{margin:0 0 6px;font:italic 400 19px/1.5 var(--serif);color:var(--dim);max-width:62ch}
  .warn{margin:20px 0 30px;padding:15px 17px;background:var(--paper2);
    border-left:2px solid var(--warn);font:400 13.5px/1.72 var(--serif);color:var(--dim)}
  .warn b{color:var(--ink)}
  h2{margin:50px 0 12px;font:500 27px/1.2 var(--serif);
    padding-bottom:8px;border-bottom:1px solid var(--rule)}
  h2 s{text-decoration:none;display:block;margin-bottom:5px;
    font:400 8.5px/1 var(--mono);letter-spacing:.22em;text-transform:uppercase;color:var(--warn)}
  p{margin:0 0 15px;max-width:74ch} b{font-weight:600}
  .eq{margin:22px 0;padding:20px;background:#2a2721;color:#e8e2d4;text-align:center;
    font:400 22px/1.5 var(--mono)}
  .eq u{text-decoration:none;color:#e8a33c}
  .eq s{display:block;text-decoration:none;margin-top:10px;font:400 11px/1.6 var(--mono);
    color:#a49a86}
  .scroll{overflow-x:auto;margin:22px 0}
  table{width:100%;border-collapse:collapse;min-width:700px;font:400 12.5px/1.5 var(--mono)}
  th{text-align:right;padding:0 10px 9px 0;color:var(--faint);font-weight:400;
    font-size:8px;letter-spacing:.14em;text-transform:uppercase;
    border-bottom:1px solid var(--edge)}
  th:first-child,th:nth-child(2),td:first-child,td:nth-child(2){text-align:left}
  td{padding:9px 10px 9px 0;border-bottom:1px solid var(--rule);text-align:right;
    font-variant-numeric:tabular-nums}
  td.d{text-align:left;color:var(--dim);font:400 13px/1.4 var(--serif)}
  tr.dead td{background:#f7ebe7;color:var(--warn)}
  tr.ok td{background:#eef2ea}
  .n{font:400 13px/1 var(--mono)}
  .find{margin:30px 0;padding:22px 24px;background:#efe9dc;border-left:3px solid var(--warn)}
  .find h4{margin:0 0 10px;font:400 8.5px/1 var(--mono);letter-spacing:.22em;
    text-transform:uppercase;color:var(--warn)}
  .find p:last-child{margin:0}
  .big{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(210px,100%),1fr));
    gap:1px;background:var(--edge);border:1px solid var(--edge);margin:22px 0}
  .big div{background:var(--paper);padding:16px 15px}
  .big u{display:block;text-decoration:none;font:400 8px/1.3 var(--mono);
    letter-spacing:.14em;text-transform:uppercase;color:var(--faint);margin-bottom:7px}
  .big b{font:400 27px/1.1 var(--mono);color:var(--ink);font-weight:400;
    font-variant-numeric:tabular-nums}
  .big b.bad{color:var(--warn)} .big b.good{color:var(--good)}
  .big s{display:block;text-decoration:none;margin-top:7px;
    font:400 11px/1.55 var(--serif);color:var(--dim)}
  ol{padding-left:22px;max-width:74ch} li{margin-bottom:11px}
  footer{margin-top:64px;padding-top:20px;border-top:1px solid var(--rule);
    color:var(--faint);font:400 11.5px/1.85 var(--mono)}
</style>\n</head>\n<body>\n<main>\n` +

'<p class="kick">Ten sites &middot; the first question</p>\n' +
'<h1>Does the river carry it?</h1>\n' +
'<p class="sub">Of the three analyses on offer, this is the only one that can ' +
'kill the plan. The brick schedule and the plant layout are both questions ' +
'about how. This one is about whether.</p>\n' +

'<div class="warn"><b>On the numbers.</b> Every hydrological figure here is ' +
'order-of-magnitude, from published means rather than gauge records, and a real ' +
'project pulls the USGS record for the specific reach and season. What survives ' +
'that uncertainty is the <b>shape</b> of the answer &mdash; and the shape here ' +
'is not close enough for the uncertainty to matter.</div>\n' +

'<h2><s>the physics</s>One term does all the work</h2>\n' +
'<p>A free-stream turbine has no dam and no head. It is a rotor in a current, ' +
'and it takes:</p>\n' +
'<div class="eq">P = &frac12; &middot; &rho; &middot; A &middot; <u>v&sup3;</u> ' +
'&middot; C<sub>p</sub>' +
'<s>&rho; water &middot; A swept area &middot; v velocity &middot; ' +
'C<sub>p</sub> capture, capped by Betz at 16/27 = ' + BETZ.toFixed(3) + '</s></div>\n' +
'<p>Every term is unremarkable except the <b>cube on velocity</b>. And note ' +
'what is <em>not</em> in that equation: <b>discharge</b>. How much water the ' +
'river moves does not appear anywhere. Discharge is the number that impresses ' +
'in a prospectus and it buys nothing at all per rotor.</p>\n' +
'<p>Take a third off the velocity and you lose <b>' +
Math.round((1 - Math.pow(2 / 3, 3)) * 100) + ' per cent</b> of the power. That ' +
'single sensitivity decides this whole site list.</p>\n' +
'<div class="big">\n' +
'  <div><u>rotor</u><b>' + ROTOR_D.toFixed(1) + ' m</b><s>' + n1(AREA) +
   ' m&sup2; swept &mdash; a large unit for a river</s></div>\n' +
'  <div><u>capture</u><b>' + CP.toFixed(2) + '</b><s>realistic in-stream, against a ' +
   'Betz ceiling of ' + BETZ.toFixed(3) + '</s></div>\n' +
'  <div><u>estate peak</u><b>' + n0(PEAK_KW) + ' kW</b><s>everything running at once</s></div>\n' +
'  <div><u>estate average</u><b>' + n0(AVG_KW) + ' kW</b><s>with realistic duty cycles</s></div>\n' +
'</div>\n' +

'<h2><s>the load</s>What one estate actually draws</h2>\n' +
'<p>Built up from the functions in the brief rather than guessed as a lump, ' +
'with a duty cycle on each because a cannery is not running in February.</p>\n' +
'<div class="scroll"><table>\n' +
'<tr><th>function</th><th>what it is</th><th>connected</th><th>duty</th><th>average</th></tr>\n' +
LOAD.map((l) => '<tr><td class="d"><b>' + esc(l[0]) + '</b></td><td class="d">' + esc(l[1]) +
  '</td><td>' + l[2] + ' kW</td><td>' + Math.round(l[3] * 100) + '%</td><td>' +
  n1(l[2] * l[3]) + ' kW</td></tr>').join('\n') +
'\n<tr class="ok"><td class="d"><b>total</b></td><td class="d"></td><td><b>' + n0(PEAK_KW) +
' kW</b></td><td></td><td><b>' + n0(AVG_KW) + ' kW</b></td></tr>\n</table></div>\n' +

'<h2><s>the ten sites</s>Rotors required, per site</h2>\n' +
'<div class="scroll"><table>\n' +
'<tr><th>#</th><th>site</th><th>water</th><th>discharge</th><th>velocity</th>' +
'<th>per rotor</th><th>duty</th><th>rotors for ' + n0(AVG_KW) + ' kW</th></tr>\n' +
rows.map((r) => {
  const dead = !isFinite(r.needAvg) || r.needAvg > 200;
  const good = r.needAvg <= 40;
  return '<tr class="' + (dead ? 'dead' : good ? 'ok' : '') + '">' +
    '<td>' + r.n + '</td><td class="d"><b>' + esc(r.name) + '</b></td>' +
    '<td class="d">' + esc(r.water) + '</td>' +
    '<td>' + (r.q ? n0(r.q) + ' m&sup3;/s' : '&mdash;') + '</td>' +
    '<td>' + r.v.toFixed(2) + ' m/s</td>' +
    '<td>' + (r.perRotor >= 1000 ? n1(r.perRotor / 1000) + ' kW' : n0(r.perRotor) + ' W') + '</td>' +
    '<td>' + Math.round(r.duty * 100) + '%</td>' +
    '<td><b>' + (isFinite(r.needAvg) ? n0(r.needAvg) : 'never') + '</b></td></tr>';
}).join('\n') + '\n</table></div>\n' +

'<div class="find">\n' +
'  <h4>the finding</h4>\n' +
'  <p>The best site on the list returns <b>' + n1(best.perRotor / 1000) + ' kW</b> ' +
'from a three-metre rotor. The estate needs <b>' + n0(AVG_KW) + ' kW</b> on ' +
'average. That is <b>' + n0(best.needAvg) + ' rotors</b>, at the best site, ' +
'running continuously, to carry one castle.</p>\n' +
'  <p>And the cube shows itself in the spread. ' + esc(best.name) + ' at ' +
best.v.toFixed(2) + ' m/s against ' + esc(worst.name) + ' at ' + worst.v.toFixed(2) +
' &mdash; a velocity ratio of <b>' + n1(vRatio) + '&times;</b> &mdash; is a power ' +
'ratio of <b>' + n0(ratio) + '&times;</b>. Nothing else in the site list moves ' +
'numbers like that.</p>\n' +
'  <p><b>Sites 2 and 9 are not hydro sites.</b> An impoundment has no ' +
'through-current at the shore, so there is nothing for a rotor to take, and a ' +
'tailwater below a peaking dam has current only when the dam happens to be ' +
'generating. Baseload is the one thing they cannot supply, and baseload was the ' +
'stated reason for choosing them.</p>\n' +
'  <p>The Mississippi sites are the sharpest illustration. Cape Girardeau moves ' +
'<b>' + n0(rows[2].q / rows[0].q * 10) / 10 + '&times;</b> the water Hermann does ' +
'and returns the same power per rotor, because the velocities are the same. It ' +
'gives you more room for rotors, not more power from one. Discharge is the ' +
'wrong number to have chosen sites on.</p>\n' +
'</div>\n' +

'<h2><s>what would work</s>Head, not flow</h2>\n' +
'<p>The equation for a turbine with a drop is a different animal entirely:</p>\n' +
'<div class="eq">P = &rho; &middot; g &middot; Q &middot; <u>H</u> &middot; &eta;' +
'<s>Q flow &middot; H head &middot; &eta; efficiency &mdash; linear in both, and ' +
'no cube anywhere</s></div>\n' +
'<p>A small Ozark stream carrying <b>' + SMALL.q + ' m&sup3;/s</b> down a ' +
'<b>' + SMALL.h + ' m</b> drop at ' + Math.round(SMALL.eta * 100) + '% returns ' +
'<b>' + n1(smallHead / 1000) + ' kW</b> from one machine. That is <b>' +
n1(smallHead / best.perRotor) + '&times;</b> what the best free-stream site on ' +
'this list gives, from a creek you could wade across.</p>\n' +
'<p>Which inverts the site logic completely. The plan chose the biggest water ' +
'in the state. The physics wants <b>the steepest</b>, and in Missouri that means ' +
'the small Ozark streams with a usable fall &mdash; not the Missouri, not the ' +
'Mississippi, and emphatically not a lake.</p>\n' +
'<p>Everything else in the brief that uses water still works at the big-river ' +
'sites, and works well: cooling, process water, the fishery loop, the wetland ' +
'filtration, barge access for finished goods. Those all want <b>volume</b>, and ' +
'volume is exactly what those sites have. It is only the electricity that was ' +
'mis-sited, and it was mis-sited because discharge and power got treated as the ' +
'same idea.</p>\n' +

'<h2><s>the other number</s>Five million bricks is off by an order</h2>\n' +
'<p>Derived from wall volume rather than argued about. A modest ' + CASTLE.w +
' by ' + CASTLE.d + ' metre ward with a ' + CASTLE.wallH + ' metre wall at ' +
WALL_T + ' m thick, plus internal ranges, at roughly ' + BRICK_PER_M3 +
' bricks to the cubic metre:</p>\n' +
'<div class="big">\n' +
'  <div><u>one castle</u><b>' + n0(bricksOne / 1e6) + 'M</b><s>bricks, from the ' +
   'wall and range volume</s></div>\n' +
'  <div><u>ten castles</u><b class="bad">' + n1(bricksTen / 1e6) + 'M</b><s>against ' +
   'the five million in the brief</s></div>\n' +
'  <div><u>the gap</u><b class="bad">' + n1(gap) + '&times;</b><s>and this is a ' +
   'modest castle, not Malbork</s></div>\n' +
'  <div><u>mass to move</u><b>' + n0(tonnesTen) + ' t</b><s>about ' +
   n0(tonnesTen / 25) + ' truckloads</s></div>\n' +
'</div>\n' +
'<p>For scale: Malbork, the largest castle on Earth, took roughly four and a ' +
'half million bricks &mdash; for <b>one</b>. Five million across ten sites is ' +
'about a tenth of what a single large castle needs. The good news is that ' +
'site 4 already has the answer in the brief: alluvial clay and an estate ' +
'brickworks. <b>Do not haul bricks. Make them where the clay is.</b> That is ' +
'also why Malbork is brick and not stone.</p>\n' +

'<h2><s>so</s>Where the analysis should go</h2>\n' +
'<ol>\n' +
'  <li><b>Re-site the generation, keep the sites.</b> The ten locations are ' +
'good for everything they were chosen for except electricity. Pair each with a ' +
'nearby fall &mdash; a tributary, a millrace, an existing low-head structure ' +
'&mdash; and the power problem changes shape entirely.</li>\n' +
'  <li><b>Cost solar against river.</b> At ' + n0(AVG_KW) + ' kW average, a ' +
'photovoltaic array with storage is the obvious comparison and the brief has ' +
'not made it. It should be made before any turbine is specified, because if ' +
'solar wins the river question becomes a process-water question and gets much ' +
'easier.</li>\n' +
'  <li><b>Then the brickworks, then the plant layout.</b> Both are real ' +
'questions and both are downstream of the two above. A construction schedule ' +
'for a number that is ten times too small would have to be thrown away.</li>\n' +
'</ol>\n' +
'<p>The reason for that order is the same reason this page exists. Answering ' +
'the how-questions first is how a project spends two years scheduling something ' +
'that was never going to work.</p>\n' +

'<footer>\n' +
'Computed by <a href="missouri.mjs">missouri.mjs</a>. Free-stream power from ' +
'P = &frac12;&rho;Av&sup3;C<sub>p</sub> with C<sub>p</sub> = ' + CP + ' against a ' +
'Betz ceiling of 16/27; head power from P = &rho;gQH&eta;. Discharges and ' +
'velocities are published order-of-magnitude means, not gauge readings. Brick ' +
'counts derived from wall volume at ' + BRICK_PER_M3 + '/m&sup3;.<br>\n' +
'<a href="castle.html">the plans</a> &middot; <a href="estate.html">the upkeep</a> ' +
'&middot; <a href="dev.html">the hub</a>\n' +
'</footer>\n</main>\n</body>\n</html>\n';

writeFileSync('missouri.html', html);

console.log('missouri.html · ' + SITES.length + ' sites');
console.log('  estate load: ' + n0(PEAK_KW) + ' kW peak, ' + n0(AVG_KW) + ' kW average');
console.log('  rotor: ' + ROTOR_D + ' m, ' + n1(AREA) + ' m2, Cp ' + CP +
  ' (Betz ceiling ' + BETZ.toFixed(3) + ')');
rows.forEach((r) => console.log('  ' + String(r.n).padStart(2) + ' ' + r.name.padEnd(16) +
  r.v.toFixed(2) + ' m/s · ' +
  (r.perRotor >= 1000 ? n1(r.perRotor / 1000) + ' kW' : n0(r.perRotor) + ' W').padStart(8) +
  ' per rotor · ' + (isFinite(r.needAvg) ? n0(r.needAvg) + ' rotors' : 'never')));
console.log('\n  best site needs ' + n0(best.needAvg) + ' rotors for one castle');
console.log('  velocity spread ' + n1(vRatio) + 'x becomes a power spread of ' + n0(ratio) + 'x');
console.log('  a 1.2 m3/s stream on a 6 m drop: ' + n1(smallHead / 1000) + ' kW from ONE machine — ' +
  n1(smallHead / best.perRotor) + 'x the best free-stream site');
console.log('  bricks: ' + n1(bricksTen / 1e6) + 'M needed against 5M claimed — ' +
  n1(gap) + 'x short, and Malbork alone took ~4.5M');

#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   steading.mjs — builds steading.html: the six clans build the castle, and it
   rises while nobody is watching.

   THE TWO BOARDS WERE ALREADY THE SAME BOARD. clans.html has six longhouses on
   coprime cadences producing forever with nothing pressed. keep.html has a
   plan, a bill of materials and a validator. This is what happens when the
   output of the first becomes the input of the second: an idle game whose
   score is a castle, drawn as it goes.

   NOTHING NEW IS DECLARED. The clans, their prime periods and their +1
   monotone tier tables come from templates-clan/. The plan, its wards and its
   brick count come from templates-castle/ through castle-rules.mjs. This file
   adds one thing only — the STAGES, and the order they must happen in.

   ── the order is the interesting part ───────────────────────────────────
   A castle cannot be built in any order and the constraints are physical
   rather than decorative:

     · the ditch and the mound are ONE operation — the spoil from the ditch is
       the motte, and a plan that digs them separately has done the work twice
     · the palisade goes up before the stone because the site has to be
       defensible during the years the stone takes
     · footings before anything they carry
     · the ranges before the roof, because a roof needs walls under it
     · the gallery last, because glass in a building site is glass on a floor

   This file REFUSES a stage list with a cycle in it, a stage needing a
   material no clan produces, or a stage whose prerequisites are not all
   earlier in the order — the same shape of check bases.mjs runs on rosters.

   ── and the +1 law holds ────────────────────────────────────────────────
   Stages complete. They do not un-complete. Materials accrue and are spent,
   and the spend is the only thing on the board that goes down — which is why
   the WORK done is tracked separately from the stock, and the work is the
   number that is never allowed to fall.

       node steading.mjs
   ═══════════════════════════════════════════════════════════════════════════ */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fabric, bricks, checkPlan } from './castle-rules.mjs';

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const n0 = (x) => Math.round(x).toLocaleString();

/* ═══ 1 · the six, from the layer that already validates them ══════════ */
const clans = readdirSync('templates-clan').filter((f) => f.endsWith('.json')).sort()
  .map((f) => JSON.parse(readFileSync(join('templates-clan', f), 'utf8')))
  .sort((a, b) => a.order - b.order);

/* the same six houses on the same six cadences, in a different century. The
   trade changes; the period, the tier table and the +1 monotone do not,
   because those are the layer's and not this file's to alter. */
const TRADE = {
  hrafn:    { gives: 'lime',   was: 'hydrogen', why: 'Burners. Lime is what makes stone into a wall rather than a heap.' },
  bjorn:    { gives: 'timber', was: 'nitrogen', why: 'Foresters. The palisade, the scaffold, the floors and the roof frame.' },
  ulf:      { gives: 'stone',  was: 'silicate', why: 'Quarrymen. Already the kiln clan; the trade barely changes.' },
  sigrid:   { gives: 'food',   was: 'biomass',  why: 'Fields. Nothing gets built by people who are not fed.' },
  thorvald: { gives: 'iron',   was: 'signal',   why: 'Smiths. Hinges, nails, grilles, tools that wear out faster than walls.' },
  ingrid:   { gives: 'record', was: 'record',   why: 'The scriptorium, unchanged. Somebody writes down what was built and when.' }
};

/* ═══ 2 · the plan being built ═════════════════════════════════════════ */
const plans = readdirSync('templates-castle').filter((f) => f.endsWith('.json')).sort()
  .map((f) => JSON.parse(readFileSync(join('templates-castle', f), 'utf8')))
  .sort((a, b) => a.order - b.order)
  .filter((p) => checkPlan(p).length === 0);

/* ═══ 3 · the stages, and the order they must happen in ════════════════ */
/* cost is a share of the plan's own fabric, so a bigger plan takes longer
   rather than a different number being typed for each one. */
const STAGES = [
  { id: 'ditch',    name: 'The ditch and the mound', needs: [],
    take: { food: 0.10 },
    note: 'One operation, not two. The spoil from the ditch IS the motte, and digging them separately does the work twice.' },
  { id: 'palisade', name: 'The palisade', needs: ['ditch'],
    take: { timber: 0.22, iron: 0.04, food: 0.06 },
    note: 'Timber goes up first because the site must be defensible for the years the stone will take.' },
  { id: 'footings', name: 'The footings', needs: ['ditch'],
    take: { stone: 0.14, lime: 0.10, food: 0.06 },
    note: 'Everything above is carried by this and nothing above can start before it.' },
  { id: 'keep',     name: 'The keep', needs: ['footings'],
    take: { stone: 0.26, lime: 0.20, timber: 0.08, iron: 0.06, food: 0.10 },
    note: 'The last thing to fall, so the first thing in stone.' },
  { id: 'curtain',  name: 'The curtain wall', needs: ['footings', 'palisade'],
    take: { stone: 0.30, lime: 0.26, food: 0.10 },
    note: 'It replaces the palisade, which is why the palisade had to exist and why it does not survive.' },
  { id: 'towers',   name: 'The towers', needs: ['curtain'],
    take: { stone: 0.18, lime: 0.16, iron: 0.10, food: 0.08 },
    note: 'Corners first. A curtain wall with an undefended corner is a wall with a door in it.' },
  { id: 'gate',     name: 'The gatehouse', needs: ['curtain'],
    take: { stone: 0.08, lime: 0.06, iron: 0.24, timber: 0.10, food: 0.06 },
    note: 'The weakest point of any wall by construction, so it gets the ironwork.' },
  { id: 'ranges',   name: 'The ranges', needs: ['keep'],
    take: { stone: 0.10, timber: 0.28, lime: 0.10, food: 0.12 },
    note: 'Where the household actually lives, which is not the keep.' },
  { id: 'roof',     name: 'The roof', needs: ['ranges', 'towers'],
    take: { timber: 0.24, iron: 0.20, food: 0.08 },
    note: 'A roof needs walls under it. This is the stage everybody schedules too early.' },
  { id: 'gallery',  name: 'The long gallery', needs: ['roof', 'gate'],
    take: { stone: 0.06, timber: 0.10, iron: 0.16, lime: 0.06, food: 0.10 },
    note: 'Last, because glass in a building site is glass on a floor.' }
];

/* ── refuse a stage list that cannot be executed ────────────────────── */
const errs = [];
const gives = new Set(Object.values(TRADE).map((t) => t.gives));
const seen = new Set();
STAGES.forEach((s, i) => {
  for (const m of Object.keys(s.take))
    if (!gives.has(m)) errs.push(s.id + ' needs "' + m + '" and no clan produces it');
  for (const p of s.needs) {
    if (!STAGES.some((x) => x.id === p))
      errs.push(s.id + ' needs "' + p + '", which is not a stage');
    else if (!seen.has(p))
      errs.push(s.id + ' needs "' + p + '", which comes later in the order');
  }
  if (seen.has(s.id)) errs.push('two stages called ' + s.id);
  seen.add(s.id);
});
/* and no cycles, checked properly rather than assumed from the ordering */
const state = new Map();
function walk(id, trail) {
  if (state.get(id) === 'done') return;
  if (state.get(id) === 'open') { errs.push('cycle: ' + trail.concat(id).join(' -> ')); return; }
  state.set(id, 'open');
  const s = STAGES.find((x) => x.id === id);
  (s ? s.needs : []).forEach((p) => walk(p, trail.concat(id)));
  state.set(id, 'done');
}
STAGES.forEach((s) => walk(s.id, []));

if (errs.length) {
  errs.forEach((e) => console.log('REFUSED  ' + e));
  console.log('\n' + errs.length + ' problem(s). steading.html not written.');
  process.exit(1);
}

/* ═══ 4 · the bill, from each plan's own fabric ════════════════════════ */
/* One unit of material is one tonne. Stone and lime scale with the masonry,
   timber and iron with the floor, food with the whole job — so a plan twice
   the size takes about twice as long, which is the behaviour you want. */
function billFor(p) {
  const f = fabric(p), b = bricks(p);
  const masonry = b.wallVol + f.floor * 0.05;
  return {
    stone:  masonry * 2.4,
    lime:   masonry * 0.35,
    timber: f.floor * 0.09,
    iron:   f.floor * 0.012,
    food:   (masonry + f.floor) * 0.05,
    record: 40
  };
}

const priced = plans.map((p) => {
  const bill = billFor(p);
  const total = Object.values(bill).reduce((a, b) => a + b, 0);
  /* how fast the six can supply it at tier 1, in ticks */
  const rate = {};
  clans.forEach((c) => { rate[TRADE[c.id].gives] = c.tiers[0].yield / c.period; });
  const slowest = Object.entries(bill).reduce((worst, [m, need]) => {
    const t = need / (rate[m] || 1e-9);
    return t > worst.t ? { m, t } : worst;
  }, { m: '', t: 0 });
  return { p, bill, total, slowest };
});

/* ═══ 5 · the page ═════════════════════════════════════════════════════ */
const MATS = ['stone', 'lime', 'timber', 'iron', 'food', 'record'];

const html = '<!doctype html>\n<html lang="en">\n<head>\n' +
'<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n' +
'<title>The steading &middot; six clans, one castle, nothing pressed</title>\n' +
'<!-- No off-origin requests. Clans from templates-clan, plan from templates-castle. -->\n' +
'<style>\n' +
`  :root{
    --night:#0a0d10; --hall:#121820; --edge:#1e2831; --edge2:#2b3947;
    --ink:#e2ddd0; --dim:#8b8778; --faint:#5c5850;
    --stone:#c8bda6; --fire:#c8762b; --gold:#c9a227; --moss:#7d9d6a; --iron:#7d8b96;
    --serif:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;
    --mono:ui-monospace,"Cascadia Mono",Consolas,"SF Mono",Menlo,monospace;
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--night);color:var(--ink);font:16px/1.68 var(--serif);
    padding:30px 16px 70px}
  main{max-width:1280px;margin:0 auto}
  a{color:var(--gold);text-decoration:none} a:hover{text-decoration:underline}
  .top{display:flex;align-items:baseline;gap:14px;flex-wrap:wrap;margin-bottom:3px}
  h1{margin:0;font:500 36px/1.08 var(--serif)}
  .top span{font:400 9px/1 var(--mono);letter-spacing:.28em;text-transform:uppercase;
    color:var(--fire)}
  .intro{margin:0 0 18px;max-width:84ch;color:var(--dim);font-size:15px}

  .stock{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(110px,100%),1fr));
    gap:1px;background:var(--edge);border:1px solid var(--edge);margin-bottom:14px}
  .stock div{background:var(--hall);padding:11px 8px;text-align:center}
  .stock u{display:block;text-decoration:none;font:400 19px/1 var(--mono);
    font-variant-numeric:tabular-nums}
  .stock b{display:block;font-weight:400;margin-top:5px;font:400 7.5px/1 var(--mono);
    letter-spacing:.13em;text-transform:uppercase;color:var(--faint)}
  .stock .stone u{color:var(--stone)} .stock .lime u{color:#d9d2bd}
  .stock .timber u{color:var(--moss)} .stock .iron u{color:var(--iron)}
  .stock .food u{color:var(--gold)}  .stock .record u{color:var(--faint)}

  .rig{display:grid;grid-template-columns:minmax(0,1fr) 330px;gap:14px}
  @media (max-width:1020px){ .rig{grid-template-columns:1fr} }
  .stage{background:linear-gradient(180deg,#151c24,#0d1217);border:1px solid var(--edge);
    position:relative}
  canvas{display:block;width:100%;height:auto}
  .cap{position:absolute;left:12px;bottom:10px;right:12px;font:400 9px/1.5 var(--mono);
    color:var(--faint);pointer-events:none}

  aside{display:flex;flex-direction:column;gap:12px}
  .card{background:var(--hall);border:1px solid var(--edge);padding:13px 14px}
  .card h3{margin:0 0 10px;font:400 8.5px/1 var(--mono);letter-spacing:.2em;
    text-transform:uppercase;color:var(--fire)}
  #plan{width:100%;background:#0d1217;border:1px solid var(--edge2);color:var(--ink);
    padding:8px;font:400 11px/1.2 var(--mono);cursor:pointer}
  .turn{display:flex;align-items:center;gap:5px;margin-top:9px}
  .turn span{font:400 8px/1 var(--mono);letter-spacing:.14em;text-transform:uppercase;
    color:var(--faint);margin-right:2px}
  .turn button{flex:1;background:#0d1217;border:1px solid var(--edge2);color:var(--faint);
    padding:7px 4px;cursor:pointer;font:400 9px/1 var(--mono);letter-spacing:.08em}
  .turn button:hover{color:var(--ink)}
  .turn button.on{color:var(--fire);border-color:var(--fire)}

  .work{margin:0;padding:0;list-style:none}
  .work li{padding:9px 0;border-bottom:1px dotted #202a33}
  .work li:last-child{border-bottom:none}
  .work .hd{display:flex;align-items:baseline;gap:8px;font:400 11px/1.3 var(--mono)}
  .work .hd b{flex:1;color:var(--dim);font-weight:400}
  .work .hd u{text-decoration:none;color:var(--faint);font-size:9.5px}
  .work li.on .hd b{color:var(--ink)}
  .work li.done .hd b{color:var(--moss)}
  .work li.done .hd u{color:var(--moss)}
  .work li.locked{opacity:.42}
  .t{height:5px;background:#182029;margin-top:6px}
  .t i{display:block;height:100%;background:var(--fire);width:0}
  .work li.done .t i{background:var(--moss)}
  .work .why{margin:6px 0 0;font:400 12px/1.55 var(--serif);color:var(--faint);display:none}
  .work li.on .why{display:block}

  .clans{margin:0;padding:0;list-style:none;font:400 10.5px/1.4 var(--mono)}
  .clans li{display:flex;align-items:baseline;gap:8px;padding:5px 0;
    border-bottom:1px dotted #202a33}
  .clans li:last-child{border-bottom:none}
  .clans b{flex:1;color:var(--dim);font-weight:400}
  .clans em{font-style:normal;color:var(--fire);width:26px;text-align:right}
  .clans u{text-decoration:none;color:var(--faint);width:52px;text-align:right}

  .say{margin:0;font:400 12.5px/1.65 var(--serif);color:var(--dim)}
  .say b{color:var(--ink)}
  .done-note{margin:10px 0 0;padding:10px 12px;background:#121a14;
    border-left:2px solid var(--moss);font:400 12.5px/1.6 var(--serif);color:var(--moss)}
  footer{margin-top:40px;padding-top:16px;border-top:1px solid var(--edge);
    color:var(--faint);font:400 10px/1.85 var(--mono);
    display:flex;gap:16px;flex-wrap:wrap}
  footer .r{margin-left:auto}
</style>\n</head>\n<body>\n<main>\n` +

'<div class="top"><h1>The steading</h1><span>six clans &middot; one castle &middot; nothing pressed</span></div>\n' +
'<p class="intro">The two boards were already the same board. Six longhouses on ' +
'coprime cadences producing forever, and a plan with a bill of materials and a ' +
'validator &mdash; put the output of the first into the second and the score is ' +
'a castle. It builds while the page is shut and the whole absence is credited ' +
'when you come back. The only thing this file adds to the two layers is ' +
'<b>the order the work has to happen in</b>.</p>\n' +

'<div class="stock" id="stock"></div>\n' +
'<div class="rig">\n' +
'  <div class="stage"><canvas id="c" width="1080" height="600"></canvas>' +
'<div class="cap" id="cap"></div></div>\n' +
'  <aside>\n' +
'    <div class="card"><h3>what is being built</h3>\n' +
'      <select id="plan"></select>\n' +
'      <div class="turn"><span>look from</span>' +
'<button data-turn="0" class="on">SW</button><button data-turn="1">NW</button>' +
'<button data-turn="2">NE</button><button data-turn="3">SE</button></div>\n' +
'      <p class="say" id="planwhy" style="margin-top:10px"></p>\n' +
'    </div>\n' +
'    <div class="card"><h3>the work</h3><ul class="work" id="work"></ul></div>\n' +
'    <div class="card"><h3>the six</h3><ul class="clans" id="clans"></ul>\n' +
'      <p class="say" style="margin-top:10px">Same six houses, same six ' +
'cadences, different century. The periods and the tier tables belong to ' +
'<a href="clans.html">the clans layer</a> and are not this board&rsquo;s to ' +
'change.</p></div>\n' +
'  </aside>\n</div>\n' +

'<footer>\n' +
'  <span>ticks <b id="t-tick">0</b></span>\n' +
'  <span>stages <b id="t-stage">0</b></span>\n' +
'  <span>work done <b id="t-work">0</b></span>\n' +
'  <span class="r"><a href="clans.html">the clans</a> &middot; ' +
'<a href="keep.html">the bench</a> &middot; <a href="castle.html">the plans</a> ' +
'&middot; <a href="steading.mjs">steading.mjs</a></span>\n' +
'</footer>\n</main>\n\n' +

'<script>\n' +
'const CLANS = ' + JSON.stringify(clans.map((c) => ({
  id: c.id, name: c.name, period: c.period, tiers: c.tiers,
  gives: TRADE[c.id].gives, why: TRADE[c.id].why
}))) + ';\n' +
'const STAGES = ' + JSON.stringify(STAGES) + ';\n' +
'const PLANS = ' + JSON.stringify(priced.map((x) => ({
  id: x.p.id, name: x.p.name, kind: x.p.kind, lesson: x.p.lesson,
  wards: x.p.wards, motte: x.p.motte, keep: x.p.keep, towers: x.p.towers,
  gallery: x.p.gallery || null, bill: x.bill, total: x.total
}))) + ';\n' +
'const MATS = ' + JSON.stringify(MATS) + ';\n' +
`
const KEY = 'venus.steading.v1';
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const TICK_MS = 900;
const n0 = (x) => x >= 1e4 ? Math.round(x / 1e3) + 'k' : Math.round(x).toLocaleString();

function fresh(planId) {
  const s = { plan: planId || PLANS[0].id, t: 0, stock: {}, put: {}, done: [], seen: Date.now() };
  MATS.forEach((m) => { s.stock[m] = 0; });
  STAGES.forEach((st) => { s.put[st.id] = {}; MATS.forEach((m) => { s.put[st.id][m] = 0; }); });
  return s;
}
function load() {
  try { const g = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (g && g.stock && g.put) return g; } catch (e) {}
  return null;
}
let G = load() || fresh();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(G)); } catch (e) {} };
const plan = () => PLANS.find((p) => p.id === G.plan) || PLANS[0];

/* what a stage costs, from the plan's own bill */
function cost(st) {
  const b = plan().bill, out = {};
  for (const [m, share] of Object.entries(st.take)) out[m] = b[m] * share;
  return out;
}
const unlocked = (st) => st.needs.every((n) => G.done.includes(n));
const doneShare = (st) => {
  const c = cost(st);
  const keys = Object.keys(c);
  if (!keys.length) return 1;
  return keys.reduce((a, m) => a + Math.min(1, (G.put[st.id][m] || 0) / c[m]), 0) / keys.length;
};

/* ══ the tick. Clans on their own primes; the site takes what it can. ══
   Nothing is pressed. The stock rises, the work consumes it, and the WORK is
   the number that never falls — the stock is allowed to, because spending is
   the only downward motion on the board and it is spending on something that
   stays built. */
function tick(n) {
  for (let i = 0; i < n; i++) {
    G.t++;
    for (const c of CLANS)
      if (G.t % c.period === 0) G.stock[c.gives] += c.tiers[0].yield;

    /* the site works on the earliest unlocked, unfinished stage */
    for (const st of STAGES) {
      if (G.done.includes(st.id) || !unlocked(st)) continue;
      const c = cost(st);
      let complete = true;
      for (const [m, need] of Object.entries(c)) {
        const short = need - G.put[st.id][m];
        if (short <= 0) continue;
        const take = Math.min(short, G.stock[m]);
        G.stock[m] -= take;
        G.put[st.id][m] += take;
        if (G.put[st.id][m] < need - 1e-9) complete = false;
      }
      if (complete) G.done.push(st.id);
      break;                    /* one stage at a time, in order */
    }
  }
}

/* ══ drawing — iso, depth, tone, from lesson one ═════════════════════ */
const HALF_W = 15, HALF_H = 7.5, UNIT_Z = 8;
const iso = (x, y, z) => [(x - y) * HALF_W, (x + y) * HALF_H - z * UNIT_Z];
const depth = (x, y, z) => x + y + z;
const tone = (f) => f === 'top' ? 1 : f === 'lit' ? 0.72 : 0.52;
const cv = $('#c'), ctx = cv.getContext('2d');
const SCALE = 4;

/* Quarter turns. An axis-aligned box stays axis-aligned under a 90-degree
   turn if you swap its footprint: [x,x+w]x[y,y+d] becomes [y,y+d]x[-(x+w),-x].
   So the view rotates without the geometry knowing, and the camera auto-fits
   whatever comes out. One isometric viewpoint reads as a picture; four read
   as a solid, and that is the whole of 2.5D. */
let TURN = 0;
function turn(x, y, w, d) {
  for (let i = 0; i < TURN; i++) {
    const nx = y, ny = -(x + w), nw = d, nd = w;
    x = nx; y = ny; w = nw; d = nd;
  }
  return [x, y, w, d];
}
function box(L, x, y, z, w, d, h, rgb) {
  const r = turn(x, y, w, d);
  L.push({ x: r[0], y: r[1], z, w: r[2], d: r[3], h, rgb, o: depth(r[0], r[1], z) });
}
function drawBox(b) {
  const [r, g, bl] = b.rgb;
  const put = (t) => ctx.fillStyle = 'rgb(' + [r, g, bl]
    .map((c) => Math.min(255, Math.round(c * tone(t)))).join(',') + ')';
  const P = iso, { x, y, z, w, d, h } = b;
  const poly = (pts, t) => { put(t); ctx.beginPath();
    pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
    ctx.closePath(); ctx.fill(); };
  poly([P(x, y + d, z), P(x, y + d, z + h), P(x + w, y + d, z + h), P(x + w, y + d, z)], 'lit');
  poly([P(x + w, y, z), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x + w, y + d, z)], 'dark');
  poly([P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)], 'top');
}
function drum(L, cx, cy, z, r, h, rgb) {
  for (let i = 0; i < 5; i++) { const t = i / 5, rr = r * (1 - t * 0.07);
    box(L, cx - rr, cy - rr, z + h * t, rr * 2, rr * 2, h / 5 + 0.02, rgb); }
  box(L, cx - r * 0.8, cy - r * 0.8, z + h, r * 1.6, r * 1.6, r * 0.5, [95, 108, 118]);
}

/* only what has been built gets drawn, and part-built stages rise partway */
function scene() {
  const p = plan(), L = [];
  const STONE = [200, 189, 166], WOOD = [124, 104, 74], LEAD = [111, 123, 132];
  const has = (id) => G.done.includes(id);
  const part = (id) => { const st = STAGES.find((s) => s.id === id);
    return has(id) ? 1 : (unlocked(st) ? doneShare(st) : 0); };

  box(L, -2, -2, -1.2, 48, 36, 1.2, [58, 76, 48]);

  const w0 = p.wards[0] || { w: 120, d: 100, wall: 8 };
  const ww = Math.max(7, w0.w / (SCALE * 2.4)), wd = Math.max(7, w0.d / (SCALE * 2.4));
  const x0 = 5, y0 = 5;

  /* the ditch and the mound, one operation */
  const dm = part('ditch');
  if (dm > 0) {
    box(L, x0 - 1.4, y0 - 1.4, -0.5, ww + 2.8, 1.2, 0.5, [44, 52, 38]);
    const mr = (p.motte ? p.motte.diameter : 44) / (SCALE * 4.4);
    const mh = ((p.motte ? p.motte.height : 10) / SCALE) * dm;
    for (let i = 0; i < 6; i++) { const t = i / 6, rr = mr * (1 - t * 0.34);
      box(L, x0 + 3 - rr, y0 + 4 - rr, mh * t, rr * 2, rr * 2, mh / 6 + 0.02,
          [84 - i * 3, 108 - i * 4, 66 - i * 2]); }
  }
  /* the palisade, which the curtain later replaces */
  const pa = part('palisade');
  if (pa > 0 && !has('curtain'))
    for (let i = 0; i < Math.round(ww * 2 * pa); i++)
      box(L, x0 + i * 0.5, y0 + wd, 0, 0.34, 0.34, 1.7, WOOD);
  /* footings */
  if (part('footings') > 0) box(L, x0 + 1.5, y0 + 2.5, 0, ww - 3, wd - 5, 0.3 * part('footings'), STONE);
  /* the keep, on the mound */
  const kp = part('keep');
  if (kp > 0) {
    const mh = p.motte ? (p.motte.height / SCALE) : 0;
    drum(L, x0 + 3, y0 + 4, mh, (p.keep && p.keep.diameter ? p.keep.diameter : 22) / (SCALE * 5),
         ((p.keep ? p.keep.height : 18) / SCALE) * kp, [210, 199, 176]);
  }
  /* the curtain */
  const cu = part('curtain');
  if (cu > 0) {
    const h = (w0.wall || 8) * cu / 2.4, t = 0.9;
    box(L, x0, y0, 0, ww, t, h, STONE);
    box(L, x0, y0 + wd - t, 0, ww, t, h, STONE);
    box(L, x0, y0, 0, t, wd, h, STONE);
    box(L, x0 + ww - t, y0, 0, t, wd, h, STONE);
  }
  /* towers, corners first */
  const tw = part('towers');
  if (tw > 0) {
    const spots = [[x0, y0], [x0 + ww - 1, y0], [x0, y0 + wd - 1], [x0 + ww - 1, y0 + wd - 1]];
    const n = Math.max(0, Math.round(Math.min(p.towers, 10) * tw));
    for (let k = 4; k < n; k++) spots.push([x0 + ww * ((k - 3) / (n - 3)), k % 2 ? y0 : y0 + wd - 1]);
    spots.slice(0, Math.max(0, n)).forEach((s) =>
      drum(L, s[0] + 0.5, s[1] + 0.5, 0, 1.4, (w0.wall || 8) / 1.7, STONE));
  }
  /* the gatehouse */
  const ga = part('gate');
  if (ga > 0) box(L, x0 + ww / 2 - 1.6, y0 + wd - 1.2, 0, 3.2, 1.8,
                  ((w0.wall || 8) / 1.5) * ga, [188, 176, 152]);
  /* the ranges, then the roof on top of them */
  const ra = part('ranges');
  if (ra > 0) box(L, x0 + 2, y0 + wd - 5, 0.3, (ww - 4) * ra, 3, 3.4, [198, 187, 163]);
  const ro = part('roof');
  if (ro > 0 && ra > 0.99) box(L, x0 + 2, y0 + wd - 5, 3.7, (ww - 4) * ro, 3, 1.1, LEAD);
  /* and the gallery */
  const gl = part('gallery');
  if (gl > 0) box(L, x0 + 2, y0 + 1.5, 0.3, (ww - 4) * gl, 2.2, 3.9, [205, 190, 150]);
  return L;
}

function draw() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, cv.width, cv.height);
  const L = scene();
  L.sort((a, b) => a.o - b.o);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const b of L) for (const cx of [b.x, b.x + b.w]) for (const cy of [b.y, b.y + b.d])
    for (const cz of [b.z, b.z + b.h]) { const q = iso(cx, cy, cz);
      if (q[0] < x0) x0 = q[0]; if (q[0] > x1) x1 = q[0];
      if (q[1] < y0) y0 = q[1]; if (q[1] > y1) y1 = q[1]; }
  const pad = 30;
  const k = Math.min((cv.width - pad * 2) / (x1 - x0), (cv.height - pad * 2) / (y1 - y0));
  ctx.setTransform(k, 0, 0, k, cv.width / 2 - k * (x0 + x1) / 2,
                                cv.height / 2 - k * (y0 + y1) / 2);
  L.forEach(drawBox);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  $('#cap').textContent = G.done.length + ' of ' + STAGES.length + ' stages, ' +
    L.length + ' solids, painted far to near.';
}

/* ══ the panels ══════════════════════════════════════════════════════ */
function paintStock() {
  $('#stock').innerHTML = MATS.map((m) =>
    '<div class="' + m + '"><u>' + n0(G.stock[m] || 0) + '</u><b>' + m + '</b></div>').join('');
}
function paintWork() {
  $('#work').innerHTML = STAGES.map((st) => {
    const done = G.done.includes(st.id), open = !done && unlocked(st);
    const share = done ? 1 : (open ? doneShare(st) : 0);
    const c = cost(st);
    const short = Object.entries(c)
      .filter(([m, need]) => G.put[st.id][m] < need - 1e-9)
      .sort((a, b) => (b[1] - G.put[st.id][b[0]]) - (a[1] - G.put[st.id][a[0]]))[0];
    return '<li class="' + (done ? 'done' : open ? 'on' : 'locked') + '">' +
      '<div class="hd"><b>' + esc(st.name) + '</b><u>' +
        (done ? 'built' : open ? Math.round(share * 100) + '%' +
          (short ? ' \\u00b7 wants ' + short[0] : '') : 'waits on ' + st.needs.join(', ')) +
      '</u></div>' +
      '<div class="t"><i style="width:' + Math.round(share * 100) + '%"></i></div>' +
      '<p class="why">' + esc(st.note) + '</p></li>';
  }).join('');
}
function paintClans() {
  $('#clans').innerHTML = CLANS.map((c) =>
    '<li><b>' + esc(c.name) + '</b><em>' + c.period + '</em><u>' + esc(c.gives) + '</u></li>').join('');
}
function paintPlan() {
  const p = plan();
  $('#planwhy').innerHTML = esc(p.lesson.slice(0, 210)) +
    '<br><br><b>' + n0(p.total) + '</b> tonnes of material in all.' +
    (G.done.length === STAGES.length
      ? '<span class="done-note">It stands. Every stage built, in the only order they could have been built in.</span>'
      : '');
}
function paintFoot() {
  $('#t-tick').textContent = G.t.toLocaleString();
  $('#t-stage').textContent = G.done.length + ' / ' + STAGES.length;
  const total = STAGES.reduce((a, st) => a + doneShare(st), 0);
  $('#t-work').textContent = Math.round(total / STAGES.length * 100) + '%';
}
function all() { paintStock(); paintWork(); paintClans(); paintPlan(); paintFoot(); draw(); }

$('#plan').innerHTML = PLANS.map((p) =>
  '<option value="' + esc(p.id) + '"' + (p.id === G.plan ? ' selected' : '') + '>' +
  esc(p.name) + '</option>').join('');
document.querySelectorAll('[data-turn]').forEach((b) => {
  b.onclick = () => {
    TURN = +b.dataset.turn;
    document.querySelectorAll('[data-turn]').forEach((x) => x.classList.remove('on'));
    b.classList.add('on');
    draw();
  };
});

$('#plan').onchange = (e) => {
  const keepStock = G.stock;
  G = fresh(e.target.value);
  G.stock = keepStock;          /* the materials are yours; the site is new */
  save(); all();
};

/* the absence, credited in full */
(function () {
  const gap = Date.now() - (G.seen || Date.now());
  const missed = Math.floor(gap / TICK_MS);
  if (missed > 1) tick(missed);
  G.seen = Date.now();
})();

all();
setInterval(() => {
  tick(1);
  G.seen = Date.now();
  if (G.t % 20 === 0) save();
  paintStock(); paintFoot();
  if (G.t % 3 === 0) { paintWork(); draw(); }
}, TICK_MS);
addEventListener('beforeunload', () => { G.seen = Date.now(); save(); });
<\/script>\n</body>\n</html>\n`;

writeFileSync('steading.html', html);

console.log('steading.html · ' + clans.length + ' clans building ' + plans.length + ' possible plans');
console.log('  stages: ' + STAGES.length + ', order checked for cycles and forward references');
console.log('  trades (same cadences, different century):');
clans.forEach((c) => console.log('    ' + c.name.padEnd(15) + 'period ' +
  String(c.period).padStart(2) + '  ' + TRADE[c.id].was.padEnd(9) + '-> ' + TRADE[c.id].gives));
console.log('\n  the bill, and what gates each plan:');
priced.forEach((x) => console.log('    ' + x.p.name.padEnd(21) +
  n0(x.total).padStart(8) + ' t  · slowest material: ' + x.slowest.m +
  ' (' + n0(x.slowest.t) + ' ticks at tier one)'));

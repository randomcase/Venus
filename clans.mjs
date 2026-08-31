#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   clans.mjs — builds clans.html: the war of clans, which is not a war.

   IT RUNS WITH NOTHING PRESSED. Open it and the six longhouses tick on their
   own; close it and they keep accruing; come back and the elapsed time is
   credited in full. Pressing does not raise output — it never can — it only
   changes which clan the next house is built for. You cannot optimise the
   total. You can only choose the composition, and every choice is +1.

   That is the whole design and it is deliberate. A game whose output you can
   maximise is a game that can be played wrong, and a game that can be played
   wrong has somebody in it who is behind. Nobody here is behind.

   ── the war part ────────────────────────────────────────────────────────
   The clans do not fight each other. They raid the same problem, which is the
   deck, and this file REFUSES a clan file that encodes a loss of any kind:

     · any field naming casualties, defeat, destruction or ruin
     · any field ranking one clan against another
     · a tier whose houses or yield falls below the tier before it — the +1
       law as a table a machine can check, the same rule builds.mjs enforces
     · a period that is not prime, or that another clan already took

   The prime periods are not decoration. Six coprime cadences make the board
   walk its whole lattice rather than its diagonal: the pattern of which
   longhouses fire together does not repeat until the product of the six,
   which this file computes rather than my asserting it.

   ── what is monotone, and what is only reported ─────────────────────────
   Stock, houses, tiers and the best composition ever reached only ever rise.
   Current composition is reported and is allowed to move in both directions,
   because it is a fact about right now and not a score. The distinction is
   the honest one: a number that can fall is a grade, and there are no grades
   here.

       node clans.mjs
   ═══════════════════════════════════════════════════════════════════════════ */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* ═══ 1 · read the clans, and refuse the bad ones ══════════════════════ */
const DIR = 'templates-clan';
const LOSS = ['casualties', 'casualty', 'losses', 'lost', 'dead', 'killed',
              'defeat', 'defeated', 'destroy', 'destroyed', 'ruin', 'razed',
              'defeats', 'beats', 'rank', 'ranking', 'score', 'wins', 'winner',
              'loser', 'versus', 'against'];

const isPrime = (n) => {
  if (n < 2) return false;
  for (let i = 2; i * i <= n; i++) if (n % i === 0) return false;
  return true;
};

const clans = [];
const periods = new Map();
const orders = new Map();
let fatal = 0;

for (const file of readdirSync(DIR).filter((f) => f.endsWith('.json')).sort()) {
  const c = JSON.parse(readFileSync(join(DIR, file), 'utf8'));
  const errs = [];

  for (const k of ['id', 'name', 'house', 'resource', 'period', 'base', 'saga', 'tiers', 'order'])
    if (c[k] === undefined) errs.push('missing ' + k);

  /* nothing here may encode a loss */
  for (const k of Object.keys(c))
    if (LOSS.includes(k.toLowerCase()))
      errs.push('carries "' + k + '" — nothing on this board loses anything');

  if (!isPrime(c.period))
    errs.push('period ' + c.period + ' is not prime, so this clan will fall into ' +
      'step with another and the board walks its diagonal');
  if (periods.has(c.period))
    errs.push('period ' + c.period + ' is already ' + periods.get(c.period));
  periods.set(c.period, c.id);

  if (orders.has(c.order)) errs.push('order ' + c.order + ' is already ' + orders.get(c.order));
  orders.set(c.order, c.id);

  /* the +1 law, as a table */
  let lastH = 0, lastY = 0;
  for (const t of c.tiers || []) {
    if (t.houses < lastH)
      errs.push('tier ' + t.n + ' has ' + t.houses + ' houses, fewer than tier ' +
        (t.n - 1) + ' had — a promotion that takes something away is not one');
    if (t.yield < lastY)
      errs.push('tier ' + t.n + ' yields ' + t.yield + ', less than tier ' +
        (t.n - 1) + ' — nothing on this board goes down');
    if (!t.note) errs.push('tier ' + t.n + ' says nothing about what changed');
    lastH = t.houses; lastY = t.yield;
  }

  console.log((errs.length ? 'REFUSED' : 'ok     ') + ' ' + (c.id || file).padEnd(10) +
    (c.resource || '?').padEnd(9) + 'period ' + String(c.period).padStart(2) +
    ' · ' + (c.tiers || []).length + ' tiers · ' +
    (c.tiers || []).map((t) => t.yield).join(' '));
  errs.forEach((e) => console.log('        x ' + e));
  if (errs.length) { fatal++; continue; }
  clans.push(c);
}

clans.sort((a, b) => a.order - b.order);

if (fatal) {
  console.log('\n' + fatal + ' refused. clans.html not written.');
  process.exit(1);
}

/* the lattice: how long before the six cadences line up the same way again */
const LATTICE = clans.reduce((a, c) => a * c.period, 1);

/* what the deck actually needs, in the proportions the white paper argues
   for: hydrogen is the constraint so it dominates the requirement, nitrogen
   is free so almost none has to be produced, biomass is small and is the
   point of the whole thing. These are the target shares. */
const NEED = { hydrogen: 38, nitrogen: 6, silicate: 24, biomass: 18, signal: 9, record: 5 };
const needTotal = Object.values(NEED).reduce((a, b) => a + b, 0);

/* the doubling time of the board at tier 1, computed: total yield per tick
   against the cost of the next house. This is the number an idle game is
   actually about and it is nearly always hidden. */
const tick1 = clans.reduce((a, c) => a + c.tiers[0].yield / c.period, 0);
const tickMax = clans.reduce((a, c) => a + c.tiers[c.tiers.length - 1].yield / c.period, 0);

/* ═══ 2 · the page ═════════════════════════════════════════════════════ */
const html = '<!doctype html>\n<html lang="en">\n<head>\n' +
'<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n' +
'<title>War of clans &middot; the longhouses</title>\n' +
'<!-- No off-origin requests. It runs with nothing pressed. -->\n' +
'<style>\n' +
`  :root{
    --night:#0b0d10; --hall:#12161b; --edge:#1f262e; --edge2:#2c3742;
    --ink:#e2ddd0; --dim:#8c8677; --faint:#5e5a51;
    --fire:#c8762b; --gold:#c9a227; --ice:#6f9bb5; --moss:#7d9d6a; --blood:#9d4a3a;
    --serif:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;
    --mono:ui-monospace,"Cascadia Mono",Consolas,"SF Mono",Menlo,monospace;
  }
  *{box-sizing:border-box}
  html,body{height:100%}
  body{margin:0;background:var(--night);color:var(--ink);overflow:hidden;
    font:15px/1.65 var(--serif);
    display:grid;grid-template-rows:auto 1fr auto;
    grid-template-columns:minmax(0,1fr);height:100vh}

  /* ── the ridge: the stockpile, always moving ──────────────────────── */
  header{border-bottom:1px solid var(--edge);background:var(--hall);
    padding:11px 18px;display:flex;align-items:center;gap:20px;flex-wrap:wrap}
  h1{margin:0;font:500 19px/1.2 var(--serif);letter-spacing:.05em;flex:none}
  h1 s{text-decoration:none;display:block;font:400 7.5px/1.3 var(--mono);
    letter-spacing:.28em;text-transform:uppercase;color:var(--fire);margin-top:3px}
  .stock{display:flex;gap:16px;flex-wrap:wrap;margin-left:auto}
  .stock div{text-align:right;min-width:78px}
  .stock u{display:block;text-decoration:none;font:400 17px/1.1 var(--mono);
    font-variant-numeric:tabular-nums}
  .stock b{display:block;font-weight:400;margin-top:3px;
    font:400 7.5px/1 var(--mono);letter-spacing:.13em;text-transform:uppercase;
    color:var(--faint)}
  .stock .hydrogen u{color:var(--ice)} .stock .nitrogen u{color:var(--moss)}
  .stock .silicate u{color:var(--dim)} .stock .biomass u{color:var(--gold)}
  .stock .signal u{color:var(--fire)}  .stock .record u{color:var(--faint)}

  main{display:grid;grid-template-columns:minmax(0,1fr) 330px;
    min-height:0;overflow:hidden}
  @media (max-width:980px){
    body{overflow:auto;height:auto;display:block}
    main{grid-template-columns:1fr}
    #halls{max-height:none}
  }

  /* ── the halls ────────────────────────────────────────────────────── */
  #halls{overflow-y:auto;padding:16px 18px 30px;min-height:0}
  .clan{background:var(--hall);border:1px solid var(--edge);margin-bottom:10px;
    display:grid;grid-template-columns:184px minmax(0,1fr) 128px;
    align-items:stretch}
  @media (max-width:700px){ .clan{grid-template-columns:1fr} }
  .who{padding:13px 14px;border-right:1px solid var(--edge)}
  .who h3{margin:0 0 1px;font:600 17px/1.2 var(--serif)}
  .who p{margin:0;font:400 8px/1.4 var(--mono);letter-spacing:.14em;
    text-transform:uppercase;color:var(--faint)}
  .who em{display:block;margin-top:9px;font-style:normal;
    font:400 10px/1 var(--mono);color:var(--dim)}
  .who em i{font-style:normal;color:var(--fire)}

  .yard{padding:13px 14px;display:flex;flex-direction:column;gap:9px;min-width:0}
  .roof{display:flex;gap:4px;flex-wrap:wrap;min-height:26px;align-items:flex-end}
  /* a longhouse, drawn: a ridge and a door, no images */
  .house{width:30px;height:24px;position:relative;flex:none;
    background:linear-gradient(180deg,#2a3038 0 46%,#1b2027 46%);
    border:1px solid #39424e;border-radius:2px 2px 0 0}
  .house::before{content:"";position:absolute;left:50%;top:-5px;
    transform:translateX(-50%);border-left:16px solid transparent;
    border-right:16px solid transparent;border-bottom:6px solid #454f5c}
  .house::after{content:"";position:absolute;left:50%;bottom:0;width:6px;height:9px;
    transform:translateX(-50%);background:var(--night)}
  .house.lit{border-color:var(--fire);
    background:linear-gradient(180deg,#3a2f24 0 46%,#241c15 46%)}
  .house.lit::before{border-bottom-color:var(--fire)}
  .house.lit::after{background:var(--fire);box-shadow:0 0 7px var(--fire)}

  .rate{display:flex;align-items:baseline;gap:9px;
    font:400 10.5px/1 var(--mono);color:var(--faint)}
  .rate b{color:var(--ink);font-weight:400;font-size:14px;
    font-variant-numeric:tabular-nums}
  .track{height:4px;background:#171d24;border-radius:2px;overflow:hidden;flex:1}
  .track i{display:block;height:100%;background:var(--fire);width:0}
  .note{margin:0;font:400 12px/1.55 var(--serif);color:var(--dim)}

  .act{padding:13px 12px;border-left:1px solid var(--edge);
    display:flex;flex-direction:column;justify-content:center;gap:7px}
  .act button{background:#1a2028;border:1px solid var(--edge2);color:var(--ink);
    padding:9px 6px;cursor:pointer;font:400 9.5px/1.3 var(--mono);
    letter-spacing:.08em;width:100%}
  .act button:hover:not(:disabled){border-color:var(--fire);color:var(--fire)}
  .act button:disabled{color:var(--faint);cursor:default;border-color:#232a33}
  .act s{text-decoration:none;text-align:center;
    font:400 8.5px/1.4 var(--mono);color:var(--faint)}
  .act s b{color:var(--gold);font-weight:400}

  /* ── the right column ─────────────────────────────────────────────── */
  aside{border-left:1px solid var(--edge);background:#0e1216;overflow-y:auto;
    padding:16px 16px 30px;min-height:0}
  aside h4{margin:0 0 8px;font:400 8px/1 var(--mono);letter-spacing:.2em;
    text-transform:uppercase;color:var(--fire)}
  aside h4:not(:first-child){margin-top:26px}
  aside p{margin:0 0 11px;font:400 12.5px/1.68 var(--serif);color:var(--dim)}

  .mix{margin-bottom:6px}
  .mix .row{display:flex;align-items:center;gap:8px;margin-bottom:5px;
    font:400 10px/1 var(--mono)}
  .mix .row span{width:62px;color:var(--faint)}
  .mix .bars{flex:1;height:11px;background:#151a20;position:relative;overflow:hidden}
  .mix .bars .have{position:absolute;left:0;top:0;bottom:0;background:#37424e}
  .mix .bars .want{position:absolute;top:0;bottom:0;width:2px;background:var(--gold)}
  .mix .row u{width:34px;text-align:right;text-decoration:none;color:var(--dim);
    font-variant-numeric:tabular-nums}

  .best{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--edge);
    border:1px solid var(--edge);margin:14px 0 6px}
  .best div{background:var(--hall);padding:11px 8px;text-align:center}
  .best u{display:block;text-decoration:none;font:400 21px/1 var(--mono);
    color:var(--gold);font-variant-numeric:tabular-nums}
  .best b{display:block;font-weight:400;margin-top:5px;
    font:400 7.5px/1.25 var(--mono);letter-spacing:.11em;text-transform:uppercase;
    color:var(--faint)}

  #saga{margin-top:8px;font:400 11px/1.62 var(--mono);color:var(--faint);
    max-height:210px;overflow-y:auto}
  #saga div{padding:4px 0;border-bottom:1px solid #161c22}
  #saga b{color:var(--ink);font-weight:400}
  #saga i{font-style:normal;color:var(--fire)}

  footer{border-top:1px solid var(--edge);background:var(--hall);
    padding:9px 18px;font:400 9.5px/1.6 var(--mono);color:var(--faint);
    display:flex;gap:18px;flex-wrap:wrap;align-items:center}
  footer b{color:var(--dim);font-weight:400}
  footer a{color:var(--fire);text-decoration:none}
  footer a:hover{text-decoration:underline}
  footer .r{margin-left:auto}
</style>\n</head>\n<body>\n\n` +

'<header>\n' +
'  <h1>War of clans<s>nobody is fighting anybody</s></h1>\n' +
'  <div class="stock" id="stock"></div>\n' +
'</header>\n\n' +
'<main>\n  <div id="halls"></div>\n' +
'  <aside>\n' +
'    <h4>what the deck needs</h4>\n' +
'    <p>The gold mark is the share the deck actually wants, from the white ' +
'paper: hydrogen is the constraint, nitrogen is nearly free, biomass is small ' +
'and is the point of all of it. The bar is what you have.</p>\n' +
'    <div class="mix" id="mix"></div>\n' +
'    <div class="best">\n' +
'      <div><u id="b-fit">0%</u><b>closest ever reached</b></div>\n' +
'      <div><u id="b-now">0%</u><b>right now</b></div>\n' +
'    </div>\n' +
'    <p>The first only rises. The second is a fact about this moment and is ' +
'allowed to fall, because it is not a score and there are no scores here.</p>\n' +
'    <h4>the saga</h4>\n' +
'    <div id="saga"></div>\n' +
'  </aside>\n</main>\n\n' +
'<footer>\n' +
'  <span>ticks <b id="t-tick">0</b></span>\n' +
'  <span>houses <b id="t-house">0</b></span>\n' +
'  <span>per tick <b id="t-rate">0</b></span>\n' +
'  <span>the six cadences realign every <b>' + LATTICE.toLocaleString() + '</b> ticks</span>\n' +
'  <span class="r"><a href="dev.html">the hub</a> &middot; ' +
'<a href="arcade.html">the arcade</a> &middot; <a href="clans.mjs">clans.mjs</a></span>\n' +
'</footer>\n\n' +

'<script>\n' +
'const CLANS = ' + JSON.stringify(clans) + ';\n' +
'const NEED = ' + JSON.stringify(NEED) + ';\n' +
'const LATTICE = ' + LATTICE + ';\n' +
`
/* ══ the board ═════════════════════════════════════════════════════════
   It runs with nothing pressed. Every clan ticks on its own prime cadence,
   the stock accrues, and closing the page does not stop it — the elapsed
   time is credited in full when you come back. Pressing never raises output.
   It only chooses which clan gets the next house, and every choice is +1. */

const KEY = 'venus.clans.v1';
const $ = (s) => document.querySelector(s);
const TICK_MS = 900;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

function fresh() {
  const s = { t: 0, stock: {}, tier: {}, bestFit: 0, saga: [], seen: Date.now() };
  CLANS.forEach((c) => { s.stock[c.resource] = 0; s.tier[c.id] = 1; });
  return s;
}
function load() {
  try {
    const g = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (g && g.stock && g.tier) return g;
  } catch (e) { /* private window, cleared data */ }
  return null;
}
let G = load() || fresh();
CLANS.forEach((c) => {
  if (G.stock[c.resource] === undefined) G.stock[c.resource] = 0;
  if (!G.tier[c.id]) G.tier[c.id] = 1;
});
function save() { try { localStorage.setItem(KEY, JSON.stringify(G)); } catch (e) {} }

const tierOf = (c) => c.tiers[Math.min(G.tier[c.id], c.tiers.length) - 1];
const nextTier = (c) => c.tiers[G.tier[c.id]];       /* undefined at the top */

/* the cost of the next house. It rises, so the board slows down — but the
   stock never falls, so there is no state you can be sent back to. */
const costOf = (c) => {
  const n = nextTier(c);
  if (!n) return null;
  return Math.round(n.yield * n.houses * 14);
};

/* how much a clan puts out per tick, averaged over its own cadence */
const rateOf = (c) => tierOf(c).yield / c.period;
const totalRate = () => CLANS.reduce((a, c) => a + rateOf(c), 0);
const houses = () => CLANS.reduce((a, c) => a + tierOf(c).houses, 0);

/* ── one tick. A clan produces only on ticks its own period divides, which
   is why the six of them never fall into step. ─────────────────────────── */
function tick(n) {
  for (let i = 0; i < n; i++) {
    G.t++;
    for (const c of CLANS)
      if (G.t % c.period === 0) G.stock[c.resource] += tierOf(c).yield;
  }
}

/* ── the composition. Reported, never scored. ──────────────────────────── */
function fit() {
  const tot = Object.values(G.stock).reduce((a, b) => a + b, 0);
  if (!tot) return 0;
  const wantTot = Object.values(NEED).reduce((a, b) => a + b, 0);
  /* one minus half the total absolute difference between the two
     distributions: 100 per cent when they match exactly, 0 when disjoint */
  let diff = 0;
  for (const k of Object.keys(NEED))
    diff += Math.abs((G.stock[k] || 0) / tot - NEED[k] / wantTot);
  return Math.max(0, Math.round((1 - diff / 2) * 100));
}

function log(text, kind) {
  G.saga.unshift({ t: G.t, text, kind });
  G.saga = G.saga.slice(0, 60);
}

/* ── drawing ───────────────────────────────────────────────────────────── */
const num = (n) => n >= 1e6 ? (n / 1e6).toFixed(2) + 'M'
  : n >= 1e4 ? Math.round(n / 1e3) + 'k' : Math.round(n).toLocaleString();

function drawStock() {
  $('#stock').innerHTML = CLANS.map((c) =>
    '<div class="' + c.resource + '"><u>' + num(G.stock[c.resource]) + '</u><b>' +
    c.resource + '</b></div>').join('');
}

function drawHalls() {
  $('#halls').innerHTML = CLANS.map((c) => {
    const t = tierOf(c), nx = nextTier(c), cost = costOf(c);
    const can = nx && G.stock[c.resource] >= cost;
    const roof = Array.from({ length: t.houses }, (_, i) =>
      '<div class="house' + (G.t % c.period === 0 ? ' lit' : '') + '"></div>').join('');
    return '<article class="clan" data-c="' + c.id + '">' +
      '<div class="who"><h3>' + esc(c.name) + '</h3><p>' + esc(c.house) + '</p>' +
        '<em>every <i>' + c.period + '</i> ticks &middot; tier ' + G.tier[c.id] +
        ' of ' + c.tiers.length + '</em></div>' +
      '<div class="yard">' +
        '<div class="roof">' + roof + '</div>' +
        '<div class="rate"><b>' + t.yield + '</b> ' + esc(c.resource) +
          ' each firing <div class="track"><i style="width:' +
          Math.round((G.t % c.period) / c.period * 100) + '%"></i></div>' +
          num(rateOf(c) * 100 / 100) + '/tick</div>' +
        '<p class="note">' + esc(t.note) + '</p>' +
      '</div>' +
      '<div class="act">' +
        (nx
          ? '<button ' + (can ? '' : 'disabled ') + 'data-raise="' + c.id + '">' +
            'raise the roof</button><s>' + num(cost) + ' ' + esc(c.resource) +
            '<br>&rarr; <b>' + nx.yield + '</b> a firing</s>'
          : '<s>every house built.<br>the bottleneck has<br>moved off this clan</s>') +
      '</div></article>';
  }).join('');

  document.querySelectorAll('[data-raise]').forEach((b) => {
    b.onclick = () => raise(b.dataset.raise);
  });
}

function drawMix() {
  const tot = Object.values(G.stock).reduce((a, b) => a + b, 0) || 1;
  const wantTot = Object.values(NEED).reduce((a, b) => a + b, 0);
  $('#mix').innerHTML = CLANS.map((c) => {
    const have = (G.stock[c.resource] || 0) / tot * 100;
    const want = NEED[c.resource] / wantTot * 100;
    return '<div class="row"><span>' + esc(c.resource) + '</span>' +
      '<div class="bars"><div class="have" style="width:' + have.toFixed(1) + '%"></div>' +
      '<div class="want" style="left:' + want.toFixed(1) + '%"></div></div>' +
      '<u>' + have.toFixed(0) + '%</u></div>';
  }).join('');
  const now = fit();
  if (now > G.bestFit) G.bestFit = now;
  $('#b-fit').textContent = G.bestFit + '%';
  $('#b-now').textContent = now + '%';
}

function drawSaga() {
  $('#saga').innerHTML = G.saga.map((s) =>
    '<div><i>' + s.t + '</i>  ' + esc(s.text) + '</div>').join('') ||
    '<div>Nothing has happened yet. It will anyway.</div>';
}

function drawFoot() {
  $('#t-tick').textContent = G.t.toLocaleString();
  $('#t-house').textContent = houses();
  $('#t-rate').textContent = totalRate().toFixed(2);
}

function drawAll() { drawStock(); drawHalls(); drawMix(); drawSaga(); drawFoot(); }

/* ── raising a roof. The only thing a press does, and it is always +1. ─── */
function raise(id) {
  const c = CLANS.find((x) => x.id === id);
  const nx = nextTier(c), cost = costOf(c);
  if (!nx || G.stock[c.resource] < cost) return;
  G.stock[c.resource] -= cost;
  G.tier[c.id]++;
  const t = tierOf(c);
  log(c.name + ' raise a ' + c.house.toLowerCase() + '. ' + t.note);
  save(); drawAll();
}

/* ── idle. This is the part that matters. ──────────────────────────────
   The board does not need you. On load it works out how long the page was
   shut and credits every tick of it — no cap, no penalty, no bonus for
   having been here. Being present is not rewarded, because rewarding
   presence is how an idle game turns into a job. */
(function creditTheAbsence() {
  const gap = Date.now() - (G.seen || Date.now());
  const missed = Math.floor(gap / TICK_MS);
  if (missed > 1) {
    const before = Object.values(G.stock).reduce((a, b) => a + b, 0);
    tick(missed);
    const after = Object.values(G.stock).reduce((a, b) => a + b, 0);
    const mins = Math.round(gap / 60000);
    log('The halls worked ' + missed.toLocaleString() + ' firings while nobody ' +
        'watched' + (mins > 1 ? ' — about ' + mins.toLocaleString() + ' minutes' : '') +
        ', and brought in ' + Math.round(after - before).toLocaleString() + '.');
  }
  G.seen = Date.now();
})();

if (!G.saga.length)
  log('Six halls, six cadences, none of them the same. They have started.');

drawAll();

/* the clock. Nothing here waits to be pressed. */
setInterval(() => {
  tick(1);
  G.seen = Date.now();
  if (G.t % 20 === 0) save();
  drawStock(); drawMix(); drawFoot();
  /* only redraw the halls on a firing, so the lit doors mean something */
  if (CLANS.some((c) => G.t % c.period === 0)) drawHalls();
  if (G.t % LATTICE === 0)
    log('All six cadences have come back into line. That is ' +
        LATTICE.toLocaleString() + ' firings and it will not happen again soon.');
}, TICK_MS);

addEventListener('beforeunload', () => { G.seen = Date.now(); save(); });
<\/script>\n</body>\n</html>\n`;

writeFileSync('clans.html', html);

console.log('\nclans.html · ' + clans.length + ' clans, ' +
  clans.reduce((a, c) => a + c.tiers.length, 0) + ' tiers');
console.log('  periods ' + clans.map((c) => c.period).join(' ') +
  ' — all prime, all distinct, realigning every ' + LATTICE.toLocaleString() + ' ticks');
console.log('  output at tier 1: ' + tick1.toFixed(2) + '/tick · at the top: ' +
  tickMax.toFixed(2) + '/tick · ' + (tickMax / tick1).toFixed(1) + 'x over the whole game');
console.log('  the deck wants ' + Object.entries(NEED)
  .map(([k, v]) => k + ' ' + Math.round(v / needTotal * 100) + '%').join(', '));
console.log('  refuses: a loss of any kind, a non-prime or duplicate cadence,');
console.log('           a tier whose houses or yield falls below the one before it');
console.log('  idle: the absence is credited in full, with no cap and no bonus for');
console.log('        being present — rewarding presence is how this becomes a job');

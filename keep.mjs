#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   keep.mjs — builds keep.html: build your own, and be told when it will not
   stand.

   The castle board shows seven plans somebody else arrived at. This one is a
   bench. You move the walls and the towers and the mound, the drawing follows
   under your hand, and the same validator that refuses a bad plan file refuses
   yours — live, while you are still holding the slider, rather than at the end.

   THE VALIDATOR IS NOT A COPY. keep.mjs reads castle-rules.mjs as text, strips
   the export keywords and embeds the source, so the rules running under
   somebody's mouse are byte-for-byte the rules castle.mjs enforces at build
   time and estate.mjs costs against. A rule written down twice goes stale in
   one of them, and this is the version of "template template template" that
   actually holds: not two copies kept in step, one copy used twice.

   Which means the upkeep figure moves as you build. Add a ward and the
   insurance line moves before you have let go. That is the point — the cost of
   a castle is decided in the ten minutes somebody spends deciding how big to
   make it, and every tool that shows you the plan without showing you the bill
   is hiding the only number that will matter.

   You can export the result as JSON, drop it in templates-castle/, and it will
   pass because it already passed.

       node keep.mjs
   ═══════════════════════════════════════════════════════════════════════════ */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { checkPlan, upkeep, bricks } from './castle-rules.mjs';

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* ── the rules, as source, for the browser to run unchanged ──────────── */
const RULES_SRC = readFileSync('castle-rules.mjs', 'utf8')
  .replace(/^export /gm, '')
  .replace(/\/\* ═+[\s\S]*?═+ \*\/\n/, '');   /* drop the file header only */

/* ── the reference plans, to start from ──────────────────────────────── */
const plans = readdirSync('templates-castle').filter((f) => f.endsWith('.json')).sort()
  .map((f) => JSON.parse(readFileSync(join('templates-castle', f), 'utf8')))
  .sort((a, b) => a.order - b.order);

/* a blank one, which must itself be refused until it is filled in — the bench
   starts you at something that does not stand, on purpose */
const BLANK = {
  id: 'my-keep', name: 'My keep', kind: 'yours', era: 'now',
  ground: 'Say where it is and why there.',
  motte: { diameter: 50, height: 8, note: 'piled from the ditch' },
  keep: { name: 'The keep', diameter: 22, height: 18, shape: 'round', note: '' },
  wards: [{ id: 'inner', name: 'Inner ward', w: 110, d: 90, wall: 8, note: '' }],
  towers: 4,
  axis: { name: 'The approach', length_m: 400, note: '' },
  gallery: null,
  figures: [],
  lesson: 'Say what this plan teaches that another one does not.'
};

/* prove the bench's own starting point behaves as intended before shipping */
const blankErrs = checkPlan(BLANK);
const blankCost = upkeep(BLANK);
const blankBrick = bricks(BLANK);

const html = '<!doctype html>\n<html lang="en">\n<head>\n' +
'<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n' +
'<title>The bench &middot; build your own keep</title>\n' +
'<!-- No off-origin requests. The validator is castle-rules.mjs, embedded verbatim. -->\n' +
'<style>\n' +
`  :root{
    --sky:#0c0f13; --panel:#141a20; --edge:#212b34; --edge2:#2e3b47;
    --ink:#e3ddcf; --dim:#8c8778; --faint:#5d5951;
    --stone:#c8bda6; --gold:#c9a227; --bad:#c4674f; --good:#7d9d6a; --cool:#5f92a8;
    --serif:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;
    --mono:ui-monospace,"Cascadia Mono",Consolas,"SF Mono",Menlo,monospace;
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--sky);color:var(--ink);font:16px/1.68 var(--serif);
    padding:34px 18px 80px}
  main{max-width:1240px;margin:0 auto}
  a{color:var(--gold);text-decoration:none} a:hover{text-decoration:underline}
  .top{display:flex;align-items:baseline;gap:15px;flex-wrap:wrap;margin-bottom:4px}
  h1{margin:0;font:500 38px/1.08 var(--serif)}
  .top span{font:400 9px/1 var(--mono);letter-spacing:.3em;text-transform:uppercase;
    color:var(--gold)}
  .intro{margin:0 0 22px;max-width:82ch;color:var(--dim);font-size:15.5px}

  .rig{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:16px}
  @media (max-width:1000px){ .rig{grid-template-columns:1fr} }

  .stage{background:linear-gradient(180deg,#161d24,#0e1318);border:1px solid var(--edge);
    position:relative}
  canvas{display:block;width:100%;height:auto}
  .cap{position:absolute;left:12px;bottom:10px;right:12px;
    font:400 9px/1.55 var(--mono);color:var(--faint);pointer-events:none}

  aside{display:flex;flex-direction:column;gap:12px}
  .card{background:var(--panel);border:1px solid var(--edge);padding:14px 15px}
  .card h3{margin:0 0 10px;font:400 8.5px/1 var(--mono);letter-spacing:.2em;
    text-transform:uppercase;color:var(--gold)}
  .card.bill h3{color:var(--cool)} .card.judge h3{color:var(--bad)}
  .card.judge.ok h3{color:var(--good)}

  .k{margin-bottom:11px}
  .k label{display:flex;justify-content:space-between;align-items:baseline;
    font:400 9px/1 var(--mono);letter-spacing:.1em;text-transform:uppercase;
    color:var(--faint);margin-bottom:6px}
  .k label b{color:var(--gold);font-weight:400;font-size:12px}
  .k input[type=range]{width:100%;accent-color:var(--gold)}
  .k input[type=text]{width:100%;background:#0e1318;border:1px solid var(--edge2);
    color:var(--ink);padding:7px 8px;font:400 12px/1.3 var(--mono);outline:none}
  .k input[type=text]:focus{border-color:var(--gold)}

  .wards{display:flex;flex-direction:column;gap:9px}
  .ward{border:1px solid var(--edge2);padding:10px 11px;background:#0f151a}
  .ward .hd{display:flex;align-items:baseline;gap:8px;margin-bottom:9px}
  .ward .hd b{font:400 11px/1 var(--mono);color:var(--ink)}
  .ward .hd button{margin-left:auto;background:none;border:1px solid var(--edge2);
    color:var(--faint);cursor:pointer;padding:3px 7px;font:400 9px/1 var(--mono)}
  .ward .hd button:hover{color:var(--bad);border-color:var(--bad)}
  .row{display:flex;gap:7px}
  .row .k{flex:1;margin-bottom:8px}
  .add{width:100%;background:#182029;border:1px solid var(--edge2);color:var(--ink);
    padding:9px;cursor:pointer;font:400 10px/1 var(--mono);letter-spacing:.11em}
  .add:hover{border-color:var(--gold);color:var(--gold)}

  .bill dl{margin:0;display:grid;grid-template-columns:1fr auto;gap:6px 10px;
    font:400 11.5px/1.35 var(--mono)}
  .bill dt{color:var(--faint)} .bill dd{margin:0;text-align:right;
    font-variant-numeric:tabular-nums}
  .bill .tot{margin-top:10px;padding-top:10px;border-top:1px solid var(--edge)}
  .bill .tot u{display:block;text-decoration:none;font:400 8px/1.3 var(--mono);
    letter-spacing:.14em;text-transform:uppercase;color:var(--faint);margin-bottom:5px}
  .bill .tot b{font:400 26px/1 var(--mono);color:var(--cool);font-weight:400}
  .bill .tot s{display:block;text-decoration:none;margin-top:6px;
    font:400 11px/1.5 var(--serif);color:var(--dim)}

  .judge ul{margin:0;padding:0;list-style:none}
  .judge li{display:flex;gap:8px;padding:7px 0;border-bottom:1px dotted #232c35;
    font:400 12px/1.5 var(--serif);color:var(--dim)}
  .judge li:last-child{border-bottom:none}
  .judge li b{flex:none;color:var(--bad)}
  .judge .stands{font:400 13px/1.6 var(--serif);color:var(--good);margin:0}
  .judge .stands b{color:var(--good)}

  .out{display:flex;gap:8px;flex-wrap:wrap}
  .out button{flex:1;background:#182029;border:1px solid var(--edge2);color:var(--ink);
    padding:10px 8px;cursor:pointer;font:400 10px/1 var(--mono);letter-spacing:.1em}
  .out button:hover{border-color:var(--gold);color:var(--gold)}
  .out button:disabled{color:var(--faint);border-color:#1c242c;cursor:default}
  #json{width:100%;height:150px;margin-top:10px;background:#0a0e12;
    border:1px solid var(--edge2);color:var(--dim);padding:10px;
    font:400 10px/1.5 var(--mono);resize:vertical;display:none}
  #json.on{display:block}

  #from{width:100%;background:#0e1318;border:1px solid var(--edge2);color:var(--ink);
    padding:8px;font:400 11px/1.2 var(--mono);cursor:pointer;margin-bottom:11px}

  footer{margin-top:44px;padding-top:18px;border-top:1px solid var(--edge);
    color:var(--faint);font:400 10px/1.9 var(--mono)}
</style>\n</head>\n<body>\n<main>\n` +

'<div class="top"><h1>The bench</h1><span>build your own keep</span></div>\n' +
'<p class="intro">The castle board shows seven plans somebody else arrived at. ' +
'This is a bench. Move the walls and the drawing follows, and <b>the same ' +
'validator that refuses a bad plan file refuses yours</b> &mdash; live, while ' +
'you are still holding the slider. It is not a copy of those rules: ' +
'<a href="castle-rules.mjs">castle-rules.mjs</a> is embedded here verbatim, so ' +
'what judges your plan under your mouse is the same function that judges one at ' +
'build time. The bill moves as you build, because the cost of a castle is ' +
'settled in the ten minutes somebody spends deciding how big to make it.</p>\n' +

'<div class="rig">\n' +
'  <div class="stage"><canvas id="c" width="1080" height="620"></canvas>' +
'<div class="cap" id="cap"></div></div>\n' +
'  <aside>\n' +
'    <div class="card judge" id="judge"><h3>the judgement</h3><div id="jbody"></div></div>\n' +
'    <div class="card bill"><h3>what it costs to keep</h3><div id="bill"></div></div>\n' +
'    <div class="card"><h3>start from</h3>\n' +
'      <select id="from"></select>\n' +
'      <div class="k"><label>name</label><input type="text" id="f-name"></div>\n' +
'      <div class="k"><label>motte height <b id="v-mh"></b></label>' +
'<input type="range" id="k-mh" min="0" max="30" step="1"></div>\n' +
'      <div class="k"><label>keep height <b id="v-kh"></b></label>' +
'<input type="range" id="k-kh" min="6" max="70" step="1"></div>\n' +
'      <div class="k"><label>towers <b id="v-tw"></b></label>' +
'<input type="range" id="k-tw" min="0" max="28" step="1"></div>\n' +
'      <div class="k"><label>sun <b id="v-sun"></b></label>' +
'<input type="range" id="k-sun" min="0" max="3" step="1"></div>\n' +
'    </div>\n' +
'    <div class="card"><h3>the wards</h3>\n' +
'      <div class="wards" id="wards"></div>\n' +
'      <button class="add" id="addward">+ another ward</button>\n' +
'    </div>\n' +
'    <div class="card"><h3>take it away</h3>\n' +
'      <div class="out">\n' +
'        <button id="show">show the json</button>\n' +
'        <button id="save">save</button>\n' +
'        <button id="dl">download</button>\n' +
'      </div>\n' +
'      <textarea id="json" readonly spellcheck="false"></textarea>\n' +
'    </div>\n' +
'  </aside>\n' +
'</div>\n' +

'<footer>\n' +
'Built by <a href="keep.mjs">keep.mjs</a>. Rules and costing from ' +
'<a href="castle-rules.mjs">castle-rules.mjs</a>, embedded verbatim rather than ' +
'restated &mdash; the same functions run in ' +
'<a href="castle.html">castle.html</a> and <a href="estate.html">estate.html</a>. ' +
'Drawn with iso, depth and tone from ' +
'<a href="writing.html">lesson one</a>. Saved in this browser only.<br>\n' +
'<a href="dev.html">the hub</a> &middot; <a href="arcade.html">the arcade</a>\n' +
'</footer>\n</main>\n\n' +

'<script>\n' +
'/* ── castle-rules.mjs, embedded verbatim. Not a translation. ─────────── */\n' +
RULES_SRC + '\n' +
'const PLANS = ' + JSON.stringify(plans) + ';\n' +
'const BLANK = ' + JSON.stringify(BLANK) + ';\n' +
`
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const money = (n) => n >= 1e6 ? '$' + (n / 1e6).toFixed(2) + 'M' : '$' + Math.round(n / 1000) + 'k';
const n0 = (n) => Math.round(n).toLocaleString();

const KEY = 'venus.keep.v1';
let P = load() || JSON.parse(JSON.stringify(BLANK));
let SUN = 0;

function load() {
  try { const g = JSON.parse(localStorage.getItem(KEY) || 'null'); if (g && g.wards) return g; }
  catch (e) { /* private window, cleared data */ }
  return null;
}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (e) {} };

/* ══ the three functions from lesson one, unchanged ═══════════════════ */
const HALF_W = 15, HALF_H = 7.5, UNIT_Z = 8;
const iso = (x, y, z) => [(x - y) * HALF_W, (x + y) * HALF_H - z * UNIT_Z];
const depth = (x, y, z) => x + y + z;
const tone = (face) => face === 'top' ? 1 : face === 'lit' ? 0.72 : 0.52;

const cv = $('#c'), ctx = cv.getContext('2d');
const SCALE = 4;

function box(L, x, y, z, w, d, h, rgb) {
  L.push({ x, y, z, w, d, h, rgb, o: depth(x, y, z) });
}
function drawBox(b) {
  const [r, g, bl] = b.rgb;
  const put = (t) => ctx.fillStyle = 'rgb(' + [r, g, bl]
    .map((c) => Math.min(255, Math.round(c * tone(t)))).join(',') + ')';
  const P2 = (x, y, z) => iso(x, y, z);
  const { x, y, z, w, d, h } = b;
  const lit = SUN % 2 === 0 ? 'lit' : 'dark';
  const dark = SUN % 2 === 0 ? 'dark' : 'lit';
  const poly = (pts, t) => {
    put(t); ctx.beginPath();
    pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
    ctx.closePath(); ctx.fill();
  };
  poly([P2(x, y + d, z), P2(x, y + d, z + h), P2(x + w, y + d, z + h), P2(x + w, y + d, z)], lit);
  poly([P2(x + w, y, z), P2(x + w, y, z + h), P2(x + w, y + d, z + h), P2(x + w, y + d, z)], dark);
  poly([P2(x, y, z + h), P2(x + w, y, z + h), P2(x + w, y + d, z + h), P2(x, y + d, z + h)], 'top');
}
function drum(L, cx, cy, z, r, h, rgb) {
  for (let i = 0; i < 5; i++) {
    const t = i / 5, rr = r * (1 - t * 0.07);
    box(L, cx - rr, cy - rr, z + h * t, rr * 2, rr * 2, h / 5 + 0.02, rgb);
  }
  box(L, cx - r * 0.8, cy - r * 0.8, z + h, r * 1.6, r * 1.6, r * 0.5, [95, 108, 118]);
}

function scene() {
  const L = [];
  const STONE = [200, 189, 166], LEAD = [111, 123, 132];
  const wards = P.wards || [];
  const gw = 48, gd = 36;
  box(L, -2, -2, -1.2, gw, gd, 1.2, [58, 76, 48]);

  const ax = Math.min(26, (P.axis ? P.axis.length_m : 0) / 200);
  if (ax > 0) box(L, gw / 2 - 3, gd - 2, 0, 6, ax, 0.18, [122, 116, 94]);

  let cursor = 3;
  const walledN = wards.filter((w) => w.wall > 0).length || 1;
  wards.forEach((w) => {
    const ww = Math.max(5, w.w / (SCALE * 2.2)), wd = Math.max(5, w.d / (SCALE * 2.2));
    const y0 = 4;
    box(L, cursor, y0, 0, ww, wd, 0.25, [78, 100, 64]);
    if (w.wall > 0) {
      const t = 0.9, h = w.wall;
      box(L, cursor, y0, 0, ww, t, h, STONE);
      box(L, cursor, y0 + wd - t, 0, ww, t, h, STONE);
      box(L, cursor, y0, 0, t, wd, h, STONE);
      box(L, cursor + ww - t, y0, 0, t, wd, h, STONE);
      const spots = [[cursor, y0], [cursor + ww - t, y0],
                     [cursor, y0 + wd - t], [cursor + ww - t, y0 + wd - t]];
      const share = Math.round((P.towers || 0) / walledN);
      for (let k = 4; k < share; k++) {
        const f = (k - 3) / Math.max(1, share - 3);
        spots.push(k % 2 ? [cursor + ww * f, y0] : [cursor + ww * f, y0 + wd - t]);
      }
      spots.slice(0, Math.max(0, share)).forEach((s) =>
        drum(L, s[0] + 0.45, s[1] + 0.45, 0, 1.5, h * 1.45, STONE));
    } else {
      box(L, cursor + 1, y0 + wd * 0.15, 0.25, Math.max(1, ww - 2), wd * 0.35, 5.2, [206, 196, 172]);
      box(L, cursor + 1, y0 + wd * 0.15, 5.45, Math.max(1, ww - 2), wd * 0.35, 1.1, LEAD);
    }
    cursor += ww + 2;
  });

  if (P.motte && P.motte.height > 0) {
    const mr = P.motte.diameter / (SCALE * 4), mh = P.motte.height / SCALE;
    const cx = 8, cy = 11;
    for (let i = 0; i < 6; i++) {
      const t = i / 6, rr = mr * (1 - t * 0.34);
      box(L, cx - rr, cy - rr, mh * t, rr * 2, rr * 2, mh / 6 + 0.02,
          [84 - i * 3, 108 - i * 4, 66 - i * 2]);
    }
    drum(L, cx, cy, mh, (P.keep && P.keep.diameter) / (SCALE * 5) || 2,
         (P.keep ? P.keep.height : 12) / SCALE, [210, 199, 176]);
  } else if (P.keep) {
    box(L, 9, 10, 0.25, 12, 4, P.keep.height / SCALE, [212, 203, 180]);
    box(L, 9, 10, 0.25 + P.keep.height / SCALE, 12, 4, 1.2, LEAD);
  }
  return L;
}

function draw() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, cv.width, cv.height);
  const L = scene();
  L.sort((a, b) => a.o - b.o);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const b of L)
    for (const cx of [b.x, b.x + b.w]) for (const cy of [b.y, b.y + b.d])
      for (const cz of [b.z, b.z + b.h]) {
        const q = iso(cx, cy, cz);
        if (q[0] < x0) x0 = q[0]; if (q[0] > x1) x1 = q[0];
        if (q[1] < y0) y0 = q[1]; if (q[1] > y1) y1 = q[1];
      }
  const pad = 30;
  const k = Math.min((cv.width - pad * 2) / (x1 - x0), (cv.height - pad * 2) / (y1 - y0));
  ctx.setTransform(k, 0, 0, k, cv.width / 2 - k * (x0 + x1) / 2,
                                cv.height / 2 - k * (y0 + y1) / 2);
  L.forEach(drawBox);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  $('#cap').textContent = L.length + ' solids, painted far to near, camera at ' +
    k.toFixed(2) + '\\u00d7. Sort key is x + y + z — the order IS the depth.';
}

/* ══ the judgement — the imported rules, not a restatement ═══════════ */
function judge() {
  const errs = checkPlan(P);
  const card = $('#judge');
  card.classList.toggle('ok', errs.length === 0);
  $('#jbody').innerHTML = errs.length
    ? '<ul>' + errs.map((e) => '<li><b>\\u00d7</b><span>' + esc(e) + '</span></li>').join('') + '</ul>'
    : '<p class="stands"><b>\\u2713 it stands.</b> Every rule the reference plans ' +
      'are held to, this passes. Download it and it will load.</p>';
  $('#dl').disabled = errs.length > 0;
  return errs;
}

function bill() {
  const u = upkeep(P), b = bricks(P);
  $('#bill').innerHTML =
    '<dl>' +
    '<dt>footprint</dt><dd>' + u.ha.toFixed(2) + ' ha</dd>' +
    '<dt>wall face</dt><dd>' + n0(u.wallFace) + ' m&sup2;</dd>' +
    '<dt>floor</dt><dd>' + n0(u.floor) + ' m&sup2;</dd>' +
    '<dt>pointing</dt><dd>' + money(u.repoint) + '</dd>' +
    '<dt>roof</dt><dd>' + money(u.roof) + '</dd>' +
    '<dt>heat</dt><dd>' + money(u.heat) + '</dd>' +
    '<dt>insurance</dt><dd>' + money(u.insure) + '</dd>' +
    '<dt>custodians</dt><dd>' + money(u.staff) + '</dd>' +
    '</dl>' +
    '<div class="tot"><u>every year, forever</u><b>' + money(u.outflow) + '</b>' +
    '<s>and <b>' + (b.count / 1e6).toFixed(2) + 'M bricks</b> to build it &mdash; ' +
    n0(b.tonnes) + ' tonnes, about ' + n0(b.tonnes / 25) + ' truckloads. Make them ' +
    'where the clay is.</s></div>';
}

/* ══ the controls ════════════════════════════════════════════════════ */
function wardCards() {
  $('#wards').innerHTML = (P.wards || []).map((w, i) =>
    '<div class="ward" data-i="' + i + '">' +
      '<div class="hd"><b>' + esc(w.name || w.id || ('ward ' + (i + 1))) + '</b>' +
      (P.wards.length > 1 ? '<button data-del="' + i + '">remove</button>' : '') + '</div>' +
      '<div class="row">' +
        '<div class="k"><label>width <b>' + w.w + ' m</b></label>' +
          '<input type="range" data-f="w" data-i="' + i + '" min="20" max="320" step="5" value="' + w.w + '"></div>' +
        '<div class="k"><label>depth <b>' + w.d + ' m</b></label>' +
          '<input type="range" data-f="d" data-i="' + i + '" min="20" max="260" step="5" value="' + w.d + '"></div>' +
      '</div>' +
      '<div class="k"><label>wall <b>' + w.wall + ' m</b>' +
        (w.wall === 0 ? ' <span style="color:var(--faint)">unwalled &mdash; a ch&acirc;teau</span>' : '') +
        '</label><input type="range" data-f="wall" data-i="' + i + '" min="0" max="30" step="1" value="' + w.wall + '"></div>' +
    '</div>').join('');

  document.querySelectorAll('#wards input[type=range]').forEach((el) => {
    el.oninput = () => {
      P.wards[+el.dataset.i][el.dataset.f] = +el.value;
      refresh();
    };
  });
  document.querySelectorAll('#wards [data-del]').forEach((b) => {
    b.onclick = () => { P.wards.splice(+b.dataset.del, 1); refresh(true); };
  });
}

function refresh(rebuild) {
  $('#v-mh').textContent = (P.motte ? P.motte.height : 0) + ' m';
  $('#v-kh').textContent = (P.keep ? P.keep.height : 0) + ' m';
  $('#v-tw').textContent = P.towers;
  $('#v-sun').textContent = ['south-west', 'north-west', 'north-east', 'south-east'][SUN];
  if (rebuild) wardCards();
  judge(); bill(); draw(); save();
  if ($('#json').classList.contains('on')) $('#json').value = JSON.stringify(P, null, 1);
}

$('#from').innerHTML = '<option value="-1">a blank plot</option>' +
  PLANS.map((p, i) => '<option value="' + i + '">' + esc(p.name) + '</option>').join('');
$('#from').onchange = (e) => {
  const i = +e.target.value;
  P = JSON.parse(JSON.stringify(i < 0 ? BLANK : PLANS[i]));
  if (i >= 0) { P.id = P.id + '-mine'; P.name = P.name + ' (mine)'; }
  syncInputs(); refresh(true);
};

function syncInputs() {
  $('#f-name').value = P.name || '';
  $('#k-mh').value = P.motte ? P.motte.height : 0;
  $('#k-kh').value = P.keep ? P.keep.height : 12;
  $('#k-tw').value = P.towers || 0;
}

$('#f-name').oninput = (e) => { P.name = e.target.value; refresh(); };
$('#k-mh').oninput = (e) => {
  const h = +e.target.value;
  if (h === 0) P.motte = null;
  else P.motte = Object.assign({ diameter: 50, note: 'piled from the ditch' },
                               P.motte || {}, { height: h });
  refresh();
};
$('#k-kh').oninput = (e) => {
  P.keep = Object.assign({ name: 'The keep', diameter: 22, shape: 'round', note: '' },
                         P.keep || {}, { height: +e.target.value });
  refresh();
};
$('#k-tw').oninput = (e) => { P.towers = +e.target.value; refresh(); };
$('#k-sun').oninput = (e) => { SUN = +e.target.value; refresh(); };

$('#addward').onclick = () => {
  const n = P.wards.length + 1;
  P.wards.push({ id: 'ward' + n, name: 'Ward ' + n, w: 140, d: 110, wall: 8,
                 note: 'say what happens in here' });
  refresh(true);
};

$('#show').onclick = () => {
  const t = $('#json');
  t.classList.toggle('on');
  if (t.classList.contains('on')) t.value = JSON.stringify(P, null, 1);
};
$('#save').onclick = () => { save(); $('#save').textContent = 'saved';
  setTimeout(() => { $('#save').textContent = 'save'; }, 1400); };
$('#dl').onclick = () => {
  if (checkPlan(P).length) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(P, null, 1) + '\\n'],
    { type: 'application/json' }));
  a.download = (P.id || 'my-keep') + '.json';
  a.click(); URL.revokeObjectURL(a.href);
};

syncInputs();
refresh(true);
<\/script>\n</body>\n</html>\n`;

writeFileSync('keep.html', html);

console.log('keep.html · a bench, not a gallery');
console.log('  rules embedded verbatim from castle-rules.mjs (' +
  RULES_SRC.split('\n').length + ' lines) — the browser runs the same functions');
console.log('  ' + plans.length + ' reference plans to start from, plus a blank plot');
console.log('\n  the blank plot, checked with the shipped validator:');
console.log('    ' + (blankErrs.length ? blankErrs.length + ' complaints' : 'stands as given'));
blankErrs.forEach((e) => console.log('      x ' + e));
console.log('    upkeep  $' + Math.round(blankCost.outflow).toLocaleString() + '/yr · ' +
  blankCost.ha.toFixed(2) + ' ha · ' + Math.round(blankCost.wallFace).toLocaleString() + ' m2 of wall face');
console.log('    bricks  ' + (blankBrick.count / 1e6).toFixed(2) + 'M · ' +
  Math.round(blankBrick.tonnes).toLocaleString() + ' t');

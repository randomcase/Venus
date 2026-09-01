#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   hall.mjs — builds hall.html: the entrance hall, in one-point perspective.

   THE EXTERIOR IS ISOMETRIC AND THE INTERIOR IS NOT, on purpose. Isometric has
   no vanishing point, which is exactly what you want when the question is
   "what is the plan" and exactly wrong when the question is "what does it feel
   like to walk in". A hall is experienced from one position, standing in the
   door, and one-point perspective is that position drawn.

   So this board uses a different projection from castle.html and steading.html
   and says so rather than quietly switching. Everything recedes to a single
   vanishing point on the far wall, at eye height, and eye height is the only
   reason the composition works: the stair rises past it, the gallery sits
   above it, and the window on the half-landing is placed so that it is the
   first thing you see.

   ── the honest part ─────────────────────────────────────────────────────
   This room is VICTORIAN. Scottish baronial is a revival style of roughly
   1830 to 1900 quoting sixteenth-century tower houses — the same move
   Neuschwanstein makes, and the castle glossary already gives you the tool to
   spot it. Saying so is not a demotion. What a 1560 hall was optimised for
   was defence and smoke; what this one is optimised for is ARRIVING, and it
   is very good at that because arriving was the entire brief.

   Every element below is drawn to do one job in that brief, and the page says
   which job as you hover it.

       node hall.mjs
   ═══════════════════════════════════════════════════════════════════════════ */
import { writeFileSync } from 'node:fs';

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* ── what the room is made of, and what each part is for ─────────────── */
const PARTS = [
  ['The stair', 'It turns. A straight run would show you the whole climb at once ' +
   'and a dog-leg with a half-landing hides the top, so the house keeps something ' +
   'back. The turn is also where the light is.'],
  ['The runner', 'Red, held by brass rods. The rods are not decoration — a runner ' +
   'that is not held slides, and a stair carpet that slides is how people fall. ' +
   'Every ornamental thing in this room started as a fixing.'],
  ['The half-landing window', 'Placed at the turn, which is the one point in the ' +
   'room where you are looking up and stationary. Stained glass needs you to stop, ' +
   'and the stair is what stops you.'],
  ['The panelling', 'Floor to ceiling, in oak. It is doing acoustics as much as ' +
   'anything: a stone hall rings, and a room this size with hard walls would make ' +
   'conversation impossible at the exact moment you are meant to be greeted.'],
  ['The chimneypiece', 'Enormous, and mostly performance. The fire heats a fraction ' +
   'of the volume; what it actually does is give the room a centre for people to ' +
   'stand at while they wait, which is what an entrance hall is for.'],
  ['The gallery', 'A balcony over the entrance. It exists so that the household can ' +
   'see who has arrived before deciding to come down, and that is not sinister, it ' +
   'is just what a big house needs.'],
  ['The parquet', 'Geometric, in two woods. It is laid on the diagonal, which makes ' +
   'the floor read as wider than it is and gives the eye something to travel along ' +
   'toward the stair.'],
  ['The coffered ceiling', 'Squares getting smaller as they recede. Nothing else in ' +
   'the room tells you how big it is so directly — a flat ceiling has no scale, ' +
   'and a coffered one is a ruler.']
];

/* ── the choices that are actually yours ─────────────────────────────── */
const PANELS = [
  ['linenfold', 'Linenfold', 'Carved to look like folded cloth. Early Tudor, and by ' +
   'the 1870s a quotation rather than a technique. Warm, busy, and it reads as old.'],
  ['arcaded', 'Arcaded', 'Blind arches in a row. More architectural, more severe, and ' +
   'it makes the walls read as a colonnade rather than as furniture.'],
  ['fielded', 'Fielded', 'Plain raised panels with a bevel. The quietest of the three ' +
   'and the only one that does not announce a century.']
];
const GLASS = [
  ['heraldic', 'Heraldic', 'Shields and mottoes. It says who lives here before anybody ' +
   'has spoken, which is the whole point of putting it where you stop.'],
  ['landscape', 'Landscape', 'A scene in glass. Softer, later, and it makes the window ' +
   'a picture rather than a claim.'],
  ['plain', 'Leaded plain', 'Clear quarries in lead. Most light, least statement, and ' +
   'the only option that lets you see the weather.']
];
const HOUR = [
  ['day', 'Daylight', 'The window does the work and the lamps are off.'],
  ['dusk', 'Dusk', 'Both at once. The glass goes flat and the fire takes over.'],
  ['night', 'Night', 'The window is a dark shape and the room is entirely lamplight.']
];

const html = '<!doctype html>\n<html lang="en">\n<head>\n' +
'<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n' +
'<title>The entrance hall &middot; one-point perspective</title>\n' +
'<!-- No off-origin requests. Drawn from a projection, not an image. -->\n' +
'<style>\n' +
`  :root{
    --dark:#120d08; --panel:#1a130c; --edge:#2c2116; --edge2:#3d2e1f;
    --ink:#e8dcc6; --dim:#a4907a; --faint:#6f6153;
    --oak:#7a5230; --amber:#d9a441; --ember:#c85a2b; --stone:#b9a78c;
    --serif:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;
    --mono:ui-monospace,"Cascadia Mono",Consolas,"SF Mono",Menlo,monospace;
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--dark);color:var(--ink);
    font:16px/1.7 var(--serif);padding:30px 18px 70px}
  main{max-width:1300px;margin:0 auto}
  a{color:var(--amber);text-decoration:none} a:hover{text-decoration:underline}
  .top{display:flex;align-items:baseline;gap:14px;flex-wrap:wrap;margin-bottom:3px}
  h1{margin:0;font:500 37px/1.08 var(--serif)}
  .top span{font:400 9px/1 var(--mono);letter-spacing:.3em;text-transform:uppercase;
    color:var(--amber)}
  .intro{margin:0 0 18px;max-width:84ch;color:var(--dim);font-size:15px}

  .rig{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:16px}
  @media (max-width:1040px){ .rig{grid-template-columns:1fr} }
  .stage{background:#0b0704;border:1px solid var(--edge);position:relative}
  svg#hall{width:100%;height:auto;display:block}
  .cap{position:absolute;left:12px;bottom:10px;right:12px;
    font:400 9px/1.5 var(--mono);color:#5a4a3a;pointer-events:none}

  aside{display:flex;flex-direction:column;gap:12px}
  .card{background:var(--panel);border:1px solid var(--edge);padding:14px 15px}
  .card h3{margin:0 0 11px;font:400 8.5px/1 var(--mono);letter-spacing:.2em;
    text-transform:uppercase;color:var(--amber)}
  .opt{display:flex;flex-direction:column;gap:6px}
  .opt label{display:flex;gap:9px;align-items:flex-start;cursor:pointer;
    padding:8px 10px;border:1px solid transparent;background:#150f09}
  .opt label:hover{border-color:var(--edge2)}
  .opt label.on{border-color:var(--amber);background:#1e150c}
  .opt input{margin:4px 0 0}
  .opt b{display:block;font:600 14px/1.3 var(--serif)}
  .opt s{display:block;text-decoration:none;margin-top:3px;
    font:400 11.5px/1.55 var(--serif);color:var(--faint)}
  .opt label.on s{color:var(--dim)}

  .parts{margin:0;padding:0;list-style:none}
  .parts li{padding:9px 0;border-bottom:1px dotted #2a2018}
  .parts li:last-child{border-bottom:none}
  .parts b{display:block;font:600 15px/1.3 var(--serif);color:var(--ink);cursor:default}
  .parts s{display:block;text-decoration:none;margin-top:4px;
    font:400 12.5px/1.6 var(--serif);color:var(--faint)}

  .said{margin:26px 0;padding:20px 22px;background:#170f08;
    border-left:3px solid var(--amber)}
  .said h4{margin:0 0 9px;font:400 8.5px/1 var(--mono);letter-spacing:.2em;
    text-transform:uppercase;color:var(--amber)}
  .said p{margin:0 0 12px;max-width:80ch} .said p:last-child{margin:0}
  footer{margin-top:44px;padding-top:18px;border-top:1px solid var(--edge);
    color:var(--faint);font:400 10px/1.9 var(--mono)}
</style>\n</head>\n<body>\n<main>\n` +

'<div class="top"><h1>The entrance hall</h1><span>one-point perspective</span></div>\n' +
'<p class="intro">The exterior boards are isometric because isometric has no ' +
'vanishing point, which is what you want when the question is <em>what is the ' +
'plan</em>. A hall is not a plan. It is experienced from one position, standing ' +
'in the door, and this is that position drawn &mdash; everything receding to a ' +
'single point on the far wall at eye height, which is the only reason the ' +
'composition works.</p>\n' +

'<div class="rig">\n' +
'  <div class="stage"><svg id="hall" viewBox="0 0 1200 660"></svg>' +
'<div class="cap" id="cap"></div></div>\n' +
'  <aside>\n' +
'    <div class="card"><h3>the panelling</h3><div class="opt" id="o-panel"></div></div>\n' +
'    <div class="card"><h3>the window at the turn</h3><div class="opt" id="o-glass"></div></div>\n' +
'    <div class="card"><h3>the hour</h3><div class="opt" id="o-hour"></div></div>\n' +
'    <div class="card"><h3>the fire</h3><div class="opt" id="o-fire"></div></div>\n' +
'  </aside>\n' +
'</div>\n' +

'<div class="said">\n' +
'  <h4>the honest part</h4>\n' +
'  <p>This room is <b>Victorian</b>. Scottish baronial is a revival of roughly ' +
'1830 to 1900 quoting sixteenth-century tower houses, and the castle ' +
'glossary already hands you the tool to spot the move: ' +
'<a href="castle.html">machicolations with no opening through them</a> are a ' +
'carving of a function, and a baronial hall is the same trick indoors.</p>\n' +
'  <p>That is not a demotion. A 1560 hall was optimised for defence and smoke ' +
'and it was a miserable room. This one is optimised for <b>arriving</b>, and it ' +
'is extremely good at it, because arriving was the entire brief. Every element ' +
'in the panel on the right is doing a job in that brief rather than quoting one, ' +
'and the jobs are worth knowing.</p>\n' +
'</div>\n' +

'<h2 style="margin:44px 0 8px;font:500 25px/1.2 var(--serif)">What each part is for</h2>\n' +
'<ul class="parts">\n' +
PARTS.map(([n, w]) => '  <li><b>' + esc(n) + '</b><s>' + esc(w) + '</s></li>').join('\n') +
'\n</ul>\n' +

'<footer>\n' +
'Built by <a href="hall.mjs">hall.mjs</a>. One-point perspective: every point ' +
'projected as x&middot;k&middot;f/(f+z) about a vanishing point at eye height, ' +
'so the room is drawn rather than drawn over. Deliberately a different ' +
'projection from <a href="castle.html">the plans</a> and ' +
'<a href="steading.html">the steading</a>, which are isometric because they ' +
'answer a different question.<br>\n' +
'<a href="explorer.html">edit it</a> &middot; <a href="dev.html">the hub</a> ' +
'&middot; <a href="arcade.html">the arcade</a>\n' +
'</footer>\n</main>\n\n' +

'<script>\n' +
'const PANELS = ' + JSON.stringify(PANELS) + ';\n' +
'const GLASS = ' + JSON.stringify(GLASS) + ';\n' +
'const HOUR = ' + JSON.stringify(HOUR) + ';\n' +
`
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

/* ══ the projection ═══════════════════════════════════════════════════
   One point. x is metres right of centre, y is metres above EYE height,
   z is metres away from where you are standing. Everything shrinks by
   f/(f+z), which is the whole of perspective and is four characters. */
const W = 1200, H = 660;
const VPX = W * 0.56, VPY = H * 0.47;     /* the vanishing point, off centre */
const K = 62, F = 13;                      /* pixels per metre, focal distance */
const s = (z) => F / (F + z);
const P = (x, y, z) => [VPX + x * K * s(z), VPY - y * K * s(z)];
const pts = (arr) => arr.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');

/* the room */
const HALF = 6.2, EYE = 1.62, TALL = 9.2, DEEP = 13;
const FLOOR = -EYE, CEIL = TALL - EYE;

const state = { panel: 'linenfold', glass: 'heraldic', hour: 'dusk', fire: 'lit' };

/* ══ drawing ══════════════════════════════════════════════════════════ */
function draw() {
  const warm = state.hour === 'night' ? 1 : state.hour === 'dusk' ? 0.72 : 0.34;
  const day = state.hour === 'day' ? 1 : state.hour === 'dusk' ? 0.45 : 0.06;
  const o = [];
  const add = (t) => o.push(t);
  const poly = (a, fill, extra) => add('<polygon points="' + pts(a) + '" fill="' + fill +
    '"' + (extra || '') + '/>');
  const line = (a, b, st, wd) => add('<line x1="' + a[0].toFixed(1) + '" y1="' +
    a[1].toFixed(1) + '" x2="' + b[0].toFixed(1) + '" y2="' + b[1].toFixed(1) +
    '" stroke="' + st + '" stroke-width="' + (wd || 1) + '"/>');
  const mix = (a, b, t) => a.map((c, i) => Math.round(c + (b[i] - c) * t));
  const rgb = (c) => 'rgb(' + c.join(',') + ')';

  /* --- the shell ------------------------------------------------------ */
  const backTL = P(-HALF, CEIL, DEEP), backTR = P(HALF, CEIL, DEEP);
  const backBL = P(-HALF, FLOOR, DEEP), backBR = P(HALF, FLOOR, DEEP);
  const nearTL = P(-HALF, CEIL, 0), nearTR = P(HALF, CEIL, 0);
  const nearBL = P(-HALF, FLOOR, 0), nearBR = P(HALF, FLOOR, 0);

  const oakBase = [92, 60, 34];
  const lit = (t) => rgb(mix([26, 18, 12], oakBase, t));

  /* floor: parquet on the diagonal, drawn as a receding grid */
  poly([nearBL, nearBR, backBR, backBL], '#2a1c11');
  const step = 1.15;
  for (let z = 0; z <= DEEP; z += step) {
    const a = P(-HALF, FLOOR, z), b = P(HALF, FLOOR, z);
    line(a, b, 'rgba(200,160,110,' + (0.10 + 0.16 * s(z)) + ')', 1);
  }
  for (let x = -HALF; x <= HALF + 0.01; x += step) {
    line(P(x, FLOOR, 0), P(x, FLOOR, DEEP), 'rgba(200,160,110,.09)', 1);
  }
  /* the diagonal that makes it parquet rather than boards */
  for (let x = -HALF * 2; x <= HALF * 2; x += step * 2) {
    const a = P(Math.max(-HALF, x), FLOOR, Math.max(0, -x));
    const b = P(Math.min(HALF, x + DEEP), FLOOR, Math.min(DEEP, DEEP - x));
    line(a, b, 'rgba(190,150,100,.055)', 1);
  }

  /* ceiling: coffers, which are the only ruler in the room */
  poly([nearTL, nearTR, backTR, backTL], '#170f09');
  for (let z = 0; z <= DEEP; z += step * 1.4)
    line(P(-HALF, CEIL, z), P(HALF, CEIL, z), 'rgba(150,110,70,.20)', 1.4);
  for (let x = -HALF; x <= HALF + 0.01; x += step * 1.4)
    line(P(x, CEIL, 0), P(x, CEIL, DEEP), 'rgba(150,110,70,.14)', 1.4);

  /* the two side walls, panelled */
  poly([nearTL, backTL, backBL, nearBL], '#20170e');
  poly([nearTR, backTR, backBR, nearBR], '#1b130c');
  const bays = 9;
  for (let i = 0; i <= bays; i++) {
    const z = (i / bays) * DEEP;
    const t = 0.30 + 0.55 * s(z) * (warm * 0.8 + 0.35);
    line(P(-HALF, FLOOR, z), P(-HALF, CEIL, z), lit(t), 1.6);
    line(P(HALF, FLOOR, z), P(HALF, CEIL, z), lit(t * 0.8), 1.6);
    if (i < bays) {
      const z2 = ((i + 0.5) / bays) * DEEP;
      panelBay(-HALF, z, ((i + 1) / bays) * DEEP, add, lit, warm, s);
      panelBay(HALF, z, ((i + 1) / bays) * DEEP, add, lit, warm * 0.75, s);
    }
  }
  /* the dado and the cornice run the length of both walls */
  for (const x of [-HALF, HALF]) {
    for (const y of [FLOOR + 1.15, CEIL - 0.75])
      line(P(x, y, 0), P(x, y, DEEP), lit(0.55), 1.5);
  }

  /* --- the back wall, the stair, the window --------------------------- */
  poly([backTL, backTR, backBR, backBL], '#1d150d');

  /* the half-landing: a platform at 2.6 m, right of centre */
  const LY = 2.6 - EYE, LZ = DEEP - 0.6;
  const lx0 = -0.4, lx1 = HALF;
  poly([P(lx0, LY, LZ), P(lx1, LY, LZ), P(lx1, LY, LZ - 2.4), P(lx0, LY, LZ - 2.4)],
       lit(0.5));

  /* the window above it — this is the thing you see first */
  drawGlass(add, poly, line, P, lit, day, state.glass, LY, DEEP - 0.02);

  /* the stair: a dog-leg. The lower flight comes toward you on the right. */
  const treads = 11;
  for (let i = 0; i < treads; i++) {
    const y0 = FLOOR + (LY - FLOOR) * (i / treads);
    const y1 = FLOOR + (LY - FLOOR) * ((i + 1) / treads);
    const z0 = LZ - 2.4 - (i * 0.62);
    const z1 = z0 - 0.62;
    const a = P(0.7, y1, z1), b = P(HALF, y1, z1);
    const c = P(HALF, y1, z0), d = P(0.7, y1, z0);
    poly([a, b, c, d], lit(0.30 + 0.34 * s(z0)));           /* the tread */
    /* the runner, held by its rods */
    const r0 = 1.9, r1 = 4.4;
    poly([P(r0, y1, z1), P(r1, y1, z1), P(r1, y1, z0), P(r0, y1, z0)],
         'rgb(' + mix([96, 26, 22], [150, 44, 34], s(z0)).join(',') + ')');
    line(P(r0, y1 + 0.02, z0), P(r1, y1 + 0.02, z0), 'rgba(214,178,96,.5)', 1.2);
    /* the riser */
    poly([P(0.7, y0, z0), P(HALF, y0, z0), P(HALF, y1, z0), P(0.7, y1, z0)],
         lit(0.16 + 0.2 * s(z0)));
  }
  /* the balustrade: newel, rail, and balusters between */
  for (let i = 0; i <= treads; i += 1) {
    const y1 = FLOOR + (LY - FLOOR) * (i / treads);
    const z0 = LZ - 2.4 - (i * 0.62);
    line(P(0.75, y1, z0), P(0.75, y1 + 0.92, z0), lit(0.42), 1.3);
  }
  line(P(0.75, FLOOR + 0.95, LZ - 2.4), P(0.75, LY + 0.95, LZ - 2.4 - treads * 0.62),
       lit(0.62), 3);
  /* the newel post, which is the most carved thing in the room */
  const nz = LZ - 2.4 - treads * 0.62;
  poly([P(0.55, FLOOR, nz), P(0.95, FLOOR, nz), P(0.95, FLOOR + 1.5, nz),
        P(0.55, FLOOR + 1.5, nz)], lit(0.5));
  poly([P(0.5, FLOOR + 1.5, nz), P(1.0, FLOOR + 1.5, nz), P(0.75, FLOOR + 1.95, nz)],
       lit(0.66));

  /* --- the chimneypiece, on the left ---------------------------------- */
  const fz0 = 4.2, fz1 = 7.4;
  const stone = state.fire === 'lit' ? [150, 120, 92] : [116, 100, 84];
  poly([P(-HALF, FLOOR, fz0), P(-HALF, FLOOR + 3.5, fz0),
        P(-HALF, FLOOR + 3.5, fz1), P(-HALF, FLOOR, fz1)],
       rgb(mix([40, 32, 24], stone, 0.55)));
  poly([P(-HALF, FLOOR, fz0 + 0.75), P(-HALF, FLOOR + 1.9, fz0 + 0.75),
        P(-HALF, FLOOR + 1.9, fz1 - 0.75), P(-HALF, FLOOR, fz1 - 0.75)],
       state.fire === 'lit' ? '#3a1408' : '#140d08');
  if (state.fire === 'lit') {
    add('<defs><radialGradient id="fire"><stop offset="0" stop-color="#ffd48a"/>' +
        '<stop offset=".45" stop-color="#e5732a" stop-opacity=".8"/>' +
        '<stop offset="1" stop-color="#7a2408" stop-opacity="0"/></radialGradient></defs>');
    const c = P(-HALF, FLOOR + 0.55, (fz0 + fz1) / 2);
    add('<ellipse cx="' + c[0].toFixed(1) + '" cy="' + c[1].toFixed(1) +
        '" rx="52" ry="34" fill="url(#fire)"/>');
    /* what a fire actually does to a room: throws light on the floor */
    add('<ellipse cx="' + (c[0] + 90) + '" cy="' + (c[1] + 26) +
        '" rx="150" ry="30" fill="#e5732a" opacity=".07"/>');
  }
  /* the overmantel */
  for (let i = 0; i < 4; i++) {
    const z = fz0 + 0.3 + i * 0.78;
    line(P(-HALF, FLOOR + 3.5, z), P(-HALF, CEIL - 1.1, z), lit(0.4), 1.2);
  }

  /* --- the gallery over the entrance ---------------------------------- */
  const gy = 4.5 - EYE;
  poly([P(-HALF, gy, 1.2), P(HALF, gy, 1.2), P(HALF, gy, 2.6), P(-HALF, gy, 2.6)],
       lit(0.34));
  for (let x = -HALF; x <= HALF; x += 0.42)
    line(P(x, gy, 1.2), P(x, gy + 0.95, 1.2), lit(0.46), 1.1);
  line(P(-HALF, gy + 0.98, 1.2), P(HALF, gy + 0.98, 1.2), lit(0.6), 2.4);

  /* --- the light ------------------------------------------------------ */
  const ch = P(0.2, CEIL - 1.6, 5.4);
  line(P(0.2, CEIL, 5.4), ch, 'rgba(180,140,90,.5)', 1.4);
  add('<defs><radialGradient id="lamp"><stop offset="0" stop-color="#ffe6ae" ' +
      'stop-opacity="' + (0.5 + warm * 0.5) + '"/><stop offset="1" ' +
      'stop-color="#d9a441" stop-opacity="0"/></radialGradient></defs>');
  add('<ellipse cx="' + ch[0].toFixed(1) + '" cy="' + ch[1].toFixed(1) +
      '" rx="' + (60 + warm * 55) + '" ry="' + (44 + warm * 40) + '" fill="url(#lamp)"/>');
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const p = [ch[0] + Math.cos(a) * 34, ch[1] + Math.sin(a) * 15];
    add('<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) +
        '" r="3.2" fill="#ffe6ae" opacity="' + (0.35 + warm * 0.6) + '"/>');
  }

  /* the whole room sits under one warm wash, because one light source is
     what makes a painted interior read as a place rather than a diagram */
  add('<rect width="' + W + '" height="' + H + '" fill="#d9a441" opacity="' +
      (0.035 + warm * 0.05).toFixed(3) + '" style="mix-blend-mode:overlay"/>');
  add('<rect width="' + W + '" height="' + H + '" fill="url(#vig)"/>');
  o.unshift('<defs><radialGradient id="vig" cx="52%" cy="47%" r="72%">' +
    '<stop offset=".55" stop-color="#000" stop-opacity="0"/>' +
    '<stop offset="1" stop-color="#000" stop-opacity=".62"/></radialGradient></defs>');

  $('#hall').innerHTML = o.join('');
  $('#cap').textContent = 'vanishing point at eye height, ' + EYE.toFixed(2) +
    ' m · room ' + (HALF * 2) + ' by ' + DEEP + ' by ' + TALL +
    ' m · everything scaled by ' + F + '/(' + F + '+z)';
}

/* one bay of panelling, in whichever pattern */
function panelBay(x, z0, z1, add, lit, warm, s) {
  const P2 = (y, z) => P(x, y, z);
  const t = 0.24 + 0.4 * s(z0) * (warm + 0.4);
  const y0 = FLOOR + 1.2, y1 = CEIL - 0.85;
  const box = (a, b) => add('<polygon points="' + pts([P2(a, z0 + 0.12), P2(b, z0 + 0.12),
    P2(b, z1 - 0.12), P2(a, z1 - 0.12)]) + '" fill="none" stroke="' + lit(t) +
    '" stroke-width="1"/>');
  if (state.panel === 'linenfold') {
    for (let y = y0; y < y1 - 0.3; y += 0.62) box(y, y + 0.5);
  } else if (state.panel === 'arcaded') {
    box(y0, y1);
    const mid = (y0 + y1) / 2;
    const a = P2(mid, z0 + 0.12), b = P2(mid, z1 - 0.12), top = P2(y1 - 0.25, (z0 + z1) / 2);
    add('<path d="M' + a[0].toFixed(1) + ' ' + a[1].toFixed(1) + ' Q' +
        top[0].toFixed(1) + ' ' + (top[1] - 8).toFixed(1) + ' ' +
        b[0].toFixed(1) + ' ' + b[1].toFixed(1) + '" fill="none" stroke="' +
        lit(t) + '" stroke-width="1.1"/>');
  } else {
    box(y0, (y0 + y1) / 2 - 0.1);
    box((y0 + y1) / 2 + 0.1, y1);
  }
}

/* the window at the turn */
function drawGlass(add, poly, line, P, lit, day, kind, ly, z) {
  const x0 = 0.4, x1 = 4.6, y0 = ly + 0.5, y1 = ly + 4.4;
  const back = [
    [x0, y0], [x1, y0], [x1, y1], [x0, y1]
  ].map(([x, y]) => P(x, y, z));
  const pal = kind === 'heraldic'
    ? ['#7d1f28', '#1f4a7d', '#c9a227', '#2f6b3a', '#f0e4c8']
    : kind === 'landscape'
      ? ['#3f6b4a', '#6d8fa8', '#c9b06a', '#8a6a48', '#dfe6ea']
      : ['#cfe0e6', '#d9e6ea', '#c6d8e0', '#dde8ec', '#e8f0f2'];
  poly(back, '#0d0a06');
  const cols = kind === 'plain' ? 7 : 4, rows = kind === 'plain' ? 10 : 6;
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const a = x0 + (x1 - x0) * (i / cols) + 0.05;
    const b = x0 + (x1 - x0) * ((i + 1) / cols) - 0.05;
    const c = y0 + (y1 - y0) * (j / rows) + 0.05;
    const d = y0 + (y1 - y0) * ((j + 1) / rows) - 0.05;
    const col = pal[(i * 3 + j * 5) % pal.length];
    poly([P(a, c, z), P(b, c, z), P(b, d, z), P(a, d, z)], col,
         ' opacity="' + (0.16 + day * 0.8).toFixed(2) + '"');
  }
  /* the leading, and the transom */
  for (let i = 0; i <= cols; i++)
    line(P(x0 + (x1 - x0) * (i / cols), y0, z), P(x0 + (x1 - x0) * (i / cols), y1, z),
         'rgba(20,14,8,.85)', 1.4);
  for (let j = 0; j <= rows; j++)
    line(P(x0, y0 + (y1 - y0) * (j / rows), z), P(x1, y0 + (y1 - y0) * (j / rows), z),
         'rgba(20,14,8,.7)', 1.1);
  /* light landing on the half-landing floor, which is what a window is for */
  if (day > 0.15) {
    const c = P((x0 + x1) / 2, ly + 0.05, z - 1.1);
    add('<ellipse cx="' + c[0].toFixed(1) + '" cy="' + c[1].toFixed(1) +
        '" rx="' + (70 * day) + '" ry="' + (16 * day) +
        '" fill="#f4e3b8" opacity="' + (day * 0.22).toFixed(2) + '"/>');
  }
}

/* ══ the choices ══════════════════════════════════════════════════════ */
function group(el, list, key) {
  $(el).innerHTML = list.map(([id, name, why]) =>
    '<label class="' + (state[key] === id ? 'on' : '') + '">' +
    '<input type="radio" name="' + key + '" value="' + id + '"' +
    (state[key] === id ? ' checked' : '') + '>' +
    '<span><b>' + esc(name) + '</b><s>' + esc(why) + '</s></span></label>').join('');
  $(el).oninput = (e) => {
    state[key] = e.target.value;
    group(el, list, key);
    draw();
  };
}
group('#o-panel', PANELS, 'panel');
group('#o-glass', GLASS, 'glass');
group('#o-hour', HOUR, 'hour');
group('#o-fire', [
  ['lit', 'Lit', 'It throws light on the floor and gives the room its centre.'],
  ['laid', 'Laid, not lit', 'The chimneypiece still does its job. It is a place to stand.']
], 'fire');
draw();
<\/script>\n</body>\n</html>\n`;

writeFileSync('hall.html', html);
console.log('hall.html · the entrance hall, one-point perspective');
console.log('  projection: x·k·f/(f+z) about a vanishing point at eye height');
console.log('  deliberately NOT isometric — the exteriors answer "what is the plan",');
console.log('  a hall answers "what is it like to walk in", and those want different');
console.log('  projections');
console.log('  yours to choose: ' + PANELS.length + ' panellings, ' + GLASS.length +
  ' windows, ' + HOUR.length + ' hours, fire lit or laid');
console.log('  = ' + (PANELS.length * GLASS.length * HOUR.length * 2) + ' rooms');
console.log('  ' + PARTS.length + ' parts, each with what it is actually for');

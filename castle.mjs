#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   castle.mjs — builds castle.html: three plans, drawn, and the words for them.

   IT DRAWS WITH THE THREE FUNCTIONS LESSON ONE TEACHES, unchanged and by
   name: iso for the projection, depth for the painter's order, tone for the
   one sun on three surfaces. If the lesson is worth setting then the yard
   should be built out of the thing it sets, and this board is the proof that
   it is — every wall, tower, motte and roof below is those three functions
   and nothing else.

   ── the three plans ─────────────────────────────────────────────────────
   Two real castles that are opposite answers to the same question, and one
   that does not exist.

   WINDSOR grew. A motte thrown up in the 1070s, a round tower on it, and nine
   hundred years of walls added around whatever was already there. Two wards
   of different sizes either side of a mound, because the mound came first.
   Nobody designed it and it cannot be designed; it can only be arrived at.

   VERSAILLES was laid out at once, on one axis, and the axis IS the argument.
   It is not a castle at all and the glossary below is firm about why: a
   château is a country seat, fortified or not, and a fortified one is a
   château fort. Versailles has no keep because there is nothing to defend
   against, and saying so out loud was the message.

   THE DECK KEEP keeps every defensive form and repurposes all of them. A
   round tower resists pressure for the same reason it resists undermining,
   which is either lazy or the whole point.

   ── what this file refuses ──────────────────────────────────────────────
     · a ward with no dimensions
     · a motte lower than the wall around it — a mound you can see over is
       not a mound, it is a step
     · fewer towers than the wards have corners, on a plan that has towers
       at all, because a curtain wall with an undefended corner is a wall
       with a door in it
     · a gallery whose mirrors do not divide evenly by its bays

   That last one is not pedantry. Versailles has 357 mirrors in 17 arches,
   which is exactly 21 each, and the evenness of that division is why the room
   reads as calm rather than as a lot of mirrors. A remainder there would mean
   somebody had run out of wall.

       node castle.mjs
   ═══════════════════════════════════════════════════════════════════════════ */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { checkPlan } from './castle-rules.mjs';

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* ═══ 1 · the plans ════════════════════════════════════════════════════ */
const DIR = 'templates-castle';
const plans = [];
let fatal = 0;

for (const file of readdirSync(DIR).filter((f) => f.endsWith('.json')).sort()) {
  const c = JSON.parse(readFileSync(join(DIR, file), 'utf8'));
  /* one validator, shared with estate.mjs and with the bench in
     keep.html, which embeds this module's source verbatim */
  const errs = checkPlan(c);

  console.log((errs.length ? 'REFUSED' : 'ok     ') + ' ' + (c.id || file).padEnd(12) +
    (c.kind || '?').padEnd(10) + (c.wards || []).length + ' wards · ' +
    String(c.towers).padStart(2) + ' towers · axis ' +
    (c.axis ? c.axis.length_m.toLocaleString() + ' m' : '?') +
    (c.gallery ? ' · gallery ' + c.gallery.mirrors + '/' + c.gallery.bays +
      ' = ' + (c.gallery.mirrors / c.gallery.bays) : ''));
  errs.forEach((e) => console.log('        x ' + e));
  if (errs.length) { fatal++; continue; }
  plans.push(c);
}

plans.sort((a, b) => a.order - b.order);
if (fatal) {
  console.log('\n' + fatal + ' refused. castle.html not written.');
  process.exit(1);
}

/* ═══ 2 · the glossary ═════════════════════════════════════════════════ */
/* The words you need on the way in. Several of them are routinely used
   wrongly, and the wrong use is noted rather than tutted at. */
const WORDS = [
  ['château', 'shah-TOH',
   'A country seat of the nobility. NOT necessarily fortified, which is the ' +
   'thing everybody gets wrong: Versailles is a château and has no defences ' +
   'at all. A fortified one is a château fort, and the two words are not ' +
   'interchangeable in French even though the English "chateau" has flattened ' +
   'them together.'],
  ['castle', 'KAH-sul',
   'A fortified residence of a lord. Both halves matter. A fortification ' +
   'nobody lives in is a fortress; a residence with no defences is a house. ' +
   'The castle is the awkward middle, and every awkward thing about the form ' +
   'comes from being asked to do two jobs.'],
  ['motte', 'MOT',
   'The artificial mound. Piled from the spoil of the ditch dug around it, so ' +
   'the ditch and the mound are one operation and you get both for one set of ' +
   'shovels. Windsor’s is fifteen metres of chalk from the 1070s.'],
  ['bailey / ward', 'BAY-lee / WORD',
   'The enclosed courtyard. Bailey is the older word and ward the later one ' +
   'for the same thing. Windsor has two of unequal size, because the mound ' +
   'was there first and the wards went where there was room.'],
  ['donjon / keep', 'DON-zhon',
   'The great tower, and the last thing to fall. English took the French ' +
   'donjon and demoted it to "dungeon", meaning the cell underneath — the ' +
   'strongest room in the castle became the word for the worst one.'],
  ['curtain wall', '',
   'The wall running between the towers. It is not the strong part and was ' +
   'never meant to be; the towers are, and the curtain exists to make an ' +
   'attacker approach one of them.'],
  ['enceinte', 'on-SANT',
   'The whole enclosure, taken as one thing. Useful when you want to say ' +
   '"everything inside the walls" without listing what is inside them.'],
  ['barbican', 'BAR-bi-kan',
   'The outwork in front of a gate. A gate is the weakest point of any wall ' +
   'by construction, so the barbican exists to make the weakest point happen ' +
   'somewhere you chose.'],
  ['machicolation', 'muh-chik-uh-LAY-shun',
   'Openings in a projecting floor, for dropping things through onto whoever ' +
   'is at the foot of the wall. By the seventeenth century they are carved ' +
   'decoratively on buildings that will never be attacked, which is how you ' +
   'date a fake castle at a glance.'],
  ['corps de logis', 'kor duh loh-ZHEE',
   'The main block of a château — the part that is actually lived in, as ' +
   'against the wings. Versailles’s runs the whole axis through.'],
  ['enfilade', 'on-fee-LAHD',
   'Rooms in a row with their doors aligned, so that from one end you see ' +
   'through every one of them. It is a social instrument and not a plan: ' +
   'how far down the run you are admitted says what you are.'],
  ['parterre', 'par-TAIR',
   'A flat formal garden, laid out to be read from above. It only works from ' +
   'the first floor of the building, which tells you who it was for.'],
  ['patte d’oie', 'pat DWAH',
   'Goose-foot: three avenues radiating from a single point. At Versailles ' +
   'the point is the palace, and the device makes the building the origin of ' +
   'the countryside rather than something sitting in it.'],
  ['glacis', 'GLAH-see',
   'The cleared, gently sloping ground outside the walls. Its purpose is ' +
   'that there is nothing on it — an empty field is a defensive work.'],
  ['ha-ha', 'HAH-hah',
   'A ditch with a wall on its inner face, sunk so it cannot be seen from the ' +
   'house. It keeps livestock out while showing an uninterrupted view. The ' +
   'name is what you say when you fall into one.']
];

/* ═══ 3 · the page ═════════════════════════════════════════════════════ */
const SCALE = 4;                                  /* metres per world unit */

const html = '<!doctype html>\n<html lang="en">\n<head>\n' +
'<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n' +
'<title>The castle &middot; the plans and the words for them</title>\n' +
'<!-- No off-origin requests. Drawn with the three functions lesson one teaches. -->\n' +
'<style>\n' +
`  :root{
    --sky:#0d1014; --panel:#141a20; --edge:#222b34; --edge2:#2f3b47;
    --ink:#e4ded0; --dim:#8d8878; --faint:#5d5a52;
    --stone:#c8bda6; --lead:#6f7b84; --grass:#5d7a4a; --gold:#c9a227;
    --serif:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;
    --mono:ui-monospace,"Cascadia Mono",Consolas,"SF Mono",Menlo,monospace;
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--sky);color:var(--ink);
    font:16px/1.7 var(--serif);padding:38px 20px 90px}
  main{max-width:1150px;margin:0 auto}
  a{color:var(--gold);text-decoration:none} a:hover{text-decoration:underline}

  .top{display:flex;align-items:baseline;gap:16px;flex-wrap:wrap;margin-bottom:4px}
  h1{margin:0;font:500 40px/1.08 var(--serif);letter-spacing:.02em}
  .top span{font:400 9px/1 var(--mono);letter-spacing:.32em;
    text-transform:uppercase;color:var(--gold)}
  .intro{margin:0 0 30px;max-width:80ch;color:var(--dim)}

  #pick{display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap}
  #pick button{background:var(--panel);border:1px solid var(--edge2);color:var(--dim);
    padding:10px 18px;cursor:pointer;font:400 11px/1 var(--mono);letter-spacing:.1em}
  #pick button:hover{color:var(--ink)}
  #pick button.on{background:#1d2731;color:var(--gold);border-color:var(--gold)}

  .stage{background:linear-gradient(180deg,#161d24 0%,#0e1318 100%);
    border:1px solid var(--edge);position:relative}
  canvas{display:block;width:100%;height:auto}
  .cap{position:absolute;left:14px;bottom:12px;right:14px;
    font:400 9.5px/1.6 var(--mono);color:var(--faint);pointer-events:none}

  .knobs{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(180px,100%),1fr));
    gap:12px;margin:14px 0 26px}
  .knob{background:var(--panel);border:1px solid var(--edge);padding:11px 13px}
  .knob label{display:flex;justify-content:space-between;align-items:baseline;
    font:400 8.5px/1 var(--mono);letter-spacing:.14em;text-transform:uppercase;
    color:var(--faint);margin-bottom:8px}
  .knob label b{color:var(--gold);font-weight:400;font-size:12px}
  .knob input{width:100%;accent-color:var(--gold)}

  .two{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(320px,100%),1fr));
    gap:18px;margin:24px 0}
  .blk{background:var(--panel);border:1px solid var(--edge);padding:17px 19px}
  .blk h3{margin:0 0 3px;font:600 19px/1.25 var(--serif)}
  .blk .k{margin:0 0 12px;font:400 8.5px/1 var(--mono);letter-spacing:.18em;
    text-transform:uppercase;color:var(--gold)}
  .blk p{margin:0 0 12px;font-size:14.5px;line-height:1.72;color:var(--dim)}
  .blk p:last-child{margin:0}
  .blk .said{border-left:2px solid var(--gold);padding-left:14px;color:var(--ink);
    font-style:italic}

  .figs{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(190px,100%),1fr));
    gap:1px;background:var(--edge);border:1px solid var(--edge);margin:22px 0}
  .figs div{background:var(--panel);padding:14px 15px}
  .figs u{display:block;text-decoration:none;font:400 8px/1.3 var(--mono);
    letter-spacing:.14em;text-transform:uppercase;color:var(--faint);margin-bottom:6px}
  .figs b{font:400 15px/1.4 var(--serif);color:var(--ink);font-weight:500}

  h2{margin:52px 0 12px;font:500 26px/1.2 var(--serif);
    padding-bottom:8px;border-bottom:1px solid var(--edge)}
  h2 s{text-decoration:none;display:block;margin-bottom:5px;
    font:400 8.5px/1 var(--mono);letter-spacing:.22em;text-transform:uppercase;
    color:var(--gold)}

  /* the gallery, in elevation */
  /* The Hall of Mirrors is the brightest room in Europe and drawing it in
     near-black was simply wrong. Gilt, painted vault, and mirrors catching
     the light off a wall of windows that is not there. */
  .hall{background:#1b1409;border:1px solid #4a3a18;padding:18px;margin:20px 0}
  .hall svg{width:100%;height:auto;display:block}
  .mirror{fill:#6d5a2c;stroke:#d8b45c;stroke-width:1.4}
  .win{fill:#cfd8dc;stroke:#8fa0a8;stroke-width:.5}
  .glow{fill:#f0d488;opacity:.5}
  .vault{fill:#8a6a30;stroke:#d8b45c;stroke-width:1.2}
  .chand{fill:#ffe9a8}
  .dim2{fill:#c9a227;font:400 8px/1 var(--mono);letter-spacing:.1em}

  .gloss{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(330px,100%),1fr));
    gap:12px;margin:18px 0}
  .word{background:var(--panel);border:1px solid var(--edge);padding:14px 16px;
    border-left:2px solid var(--gold)}
  .word h4{margin:0 0 2px;font:600 17px/1.25 var(--serif);color:var(--ink)}
  .word .say{margin:0 0 8px;font:400 9.5px/1 var(--mono);color:var(--faint);
    letter-spacing:.1em}
  .word p{margin:0;font-size:13.5px;line-height:1.7;color:var(--dim)}

  footer{margin-top:64px;padding-top:18px;border-top:1px solid var(--edge);
    color:var(--faint);font:400 10px/1.9 var(--mono)}
</style>\n</head>\n<body>\n<main>\n` +

'<div class="top"><h1>The castle</h1><span>' + plans.length + ' plans &middot; and the words for them</span></div>\n' +
'<p class="intro">' + plans.length + ' of them: real ones that are opposite ' +
'answers to the same question, and one that does not exist yet. ' +
'Everything is drawn with the three functions ' +
'the notebook&rsquo;s first lesson sets &mdash; <b>iso</b> for the projection, ' +
'<b>depth</b> for the painter&rsquo;s order, <b>tone</b> for one sun on three ' +
'surfaces &mdash; unchanged and by name, because a lesson worth setting should ' +
'be the thing the yard is built out of.</p>\n' +

'<div id="pick"></div>\n' +
'<div class="stage"><canvas id="c" width="1120" height="580"></canvas>' +
'<div class="cap" id="cap"></div></div>\n' +
'<div class="knobs">\n' +
'  <div class="knob"><label>wall height <b id="v-wall"></b></label>' +
'<input type="range" id="k-wall" min="2" max="18" step="1"></div>\n' +
'  <div class="knob"><label>towers <b id="v-tower"></b></label>' +
'<input type="range" id="k-tower" min="0" max="24" step="1"></div>\n' +
'  <div class="knob"><label>keep height <b id="v-keep"></b></label>' +
'<input type="range" id="k-keep" min="6" max="46" step="1"></div>\n' +
'  <div class="knob"><label>sun <b id="v-sun"></b></label>' +
'<input type="range" id="k-sun" min="0" max="3" step="1"></div>\n' +
'</div>\n' +
'<div class="two" id="say"></div>\n' +
'<div class="figs" id="figs"></div>\n' +

'<h2><s>the room</s>Seventeen answering seventeen</h2>\n' +
'<p>The Hall of Mirrors is seventy-three metres long, ten and a half wide and ' +
'twelve and a third high, with <b>seventeen mirrored arches facing seventeen ' +
'windows</b>. Three hundred and fifty-seven mirrors, which is <b>exactly ' +
'twenty-one an arch</b> &mdash; and the evenness of that division is why the ' +
'room reads as calm rather than as a great many mirrors. A remainder there ' +
'would mean somebody had run out of wall. This generator refuses a gallery ' +
'whose mirrors do not divide.</p>\n' +
'<div class="hall" id="hall"></div>\n' +
'<p>The device is simple and it is not decoration. The garden is on one side ' +
'only. The mirrors put it on the other side too, so a room with windows on a ' +
'single wall reads as a room with windows on both &mdash; and at night the ' +
'same surface multiplies the candles instead. On the deck, where the night is ' +
'fifty-eight days long, that second use stops being a flourish and becomes the ' +
'lighting budget.</p>\n' +

'<h2><s>the scoreboard nobody keeps</s>The heap of rocks won</h2>\n' +
'<p>Windsor was a mound of chalk with a wooden tower on it, thrown up by an ' +
'invader who needed somewhere to sleep a day’s march from London. Versailles ' +
'was the richest building project in Europe, laid out at once by the most ' +
'powerful man in it, and every part of it was chosen.</p>\n' +
'<p><b>Windsor has been continuously occupied since the 1070s.</b> No other ' +
'castle manages that. Versailles stopped being a royal residence in 1789 and ' +
'has been a museum ever since — magnificently, and as a museum.</p>\n' +
'<p>That is not a verdict on architecture and it would be cheap to pretend it ' +
'was. It is a fact about the two strategies. A plan arrived at can absorb the ' +
'next thing that happens, because it was never finished and has no proportion ' +
'to break. A plan argued all at once cannot: it is only correct while the ' +
'argument holds, and the argument at Versailles was about who the king was. ' +
'Windsor never made a claim it could be wrong about, so nothing it said ever ' +
'stopped being true.</p>\n' +
'<p>Worth knowing before you lay out your own. One more nut, one more bolt, on ' +
'everything, always, beats a thing that was perfect once.</p>\n' +

'<h2><s>the words</s>The glossary, on the way in</h2>\n' +
'<p>Several of these are routinely used wrongly and the wrong use is noted ' +
'rather than tutted at. The first two are the ones that matter.</p>\n' +
'<div class="gloss">\n' +
WORDS.map(([w, say, def]) =>
'  <article class="word"><h4>' + esc(w) + '</h4>' +
  (say ? '<p class="say">' + esc(say) + '</p>' : '') +
  '<p>' + esc(def) + '</p></article>').join('\n') + '\n</div>\n' +

'<footer>\n' +
'Built by <a href="castle.mjs">castle.mjs</a> from ' + plans.length + ' plans in ' +
'templates-castle/. Refuses a ward with no dimensions, a motte lower than its ' +
'own wall, a walled plan with fewer towers than corners, and a gallery whose ' +
'mirrors do not divide by its bays.<br>\n' +
'Drawn with iso, depth and tone from ' +
'<a href="writing.html">the notebook</a>&rsquo;s lesson one. ' +
'<a href="dev.html">the hub</a> &middot; <a href="arcade.html">the arcade</a>\n' +
'</footer>\n</main>\n\n' +

'<script>\n' +
'const PLANS = ' + JSON.stringify(plans) + ';\n' +
'const SCALE = ' + SCALE + ';\n' +
`
/* ══ the three functions, from lesson one, unchanged ═══════════════════ */
const HALF_W = 15, HALF_H = 7.5, UNIT_Z = 8;
const iso = (x, y, z) => [(x - y) * HALF_W, (x + y) * HALF_H - z * UNIT_Z];
const depth = (x, y, z) => x + y + z;
const tone = (face) => face === 'top' ? 1 : face === 'lit' ? 0.72 : 0.52;

const $ = (s) => document.querySelector(s);
const cv = $('#c'), ctx = cv.getContext('2d');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

let pick = 0;
let SUN = 0;                       /* which way the light comes from */
const knob = { wall: 0, tower: 0, keep: 0 };

/* ── a box, painted as three faces from one colour ──────────────────── */
function box(list, x, y, z, w, d, h, rgb, label) {
  /* the sort key is the box's NEAR-BACK corner, not its far one. Keyed on the
     far corner, a big ground plate sorts last and paints over the castle
     standing on it — which is precisely the failure lesson one warns about,
     and I walked straight into it. */
  list.push({ k: 'box', x, y, z, w, d, h, rgb, label, o: depth(x, y, z) });
}
function drawBox(b, ox, oy) {
  const [r, g, bl] = b.rgb;
  const put = (t) => ctx.fillStyle = 'rgb(' + [r, g, bl]
    .map((c) => Math.min(255, Math.round(c * tone(t)))).join(',') + ')';
  const P = (x, y, z) => { const p = iso(x, y, z); return [p[0] + ox, p[1] + oy]; };
  const { x, y, z, w, d, h } = b;
  /* which side the sun is on rotates the two lit faces */
  const lit = SUN % 2 === 0 ? 'lit' : 'dark';
  const dark = SUN % 2 === 0 ? 'dark' : 'lit';

  const poly = (pts, t) => {
    put(t); ctx.beginPath();
    pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
    ctx.closePath(); ctx.fill();
  };
  /* left face */
  poly([P(x, y + d, z), P(x, y + d, z + h), P(x + w, y + d, z + h), P(x + w, y + d, z)], lit);
  /* right face */
  poly([P(x + w, y, z), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x + w, y + d, z)], dark);
  /* top */
  poly([P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)], 'top');
}

/* ── a round tower: a stack of narrowing boxes reads as a drum at this
      scale, and costs nothing that a real cylinder would buy ────────── */
function drum(list, cx, cy, z, r, h, rgb) {
  const steps = 5;
  for (let i = 0; i < steps; i++) {
    const t = i / steps, rr = r * (1 - t * 0.06);
    box(list, cx - rr, cy - rr, z + h * t, rr * 2, rr * 2, h / steps + 0.02, rgb);
  }
  /* the roof: a smaller, darker cap */
  box(list, cx - r * 0.78, cy - r * 0.78, z + h, r * 1.56, r * 1.56, r * 0.5,
      [95, 108, 118]);
}

/* ── build the scene from a plan ────────────────────────────────────── */
function scene(p) {
  const L = [];
  const STONE = [200, 189, 166], LEAD = [111, 123, 132], GRASS = [93, 122, 74];
  const wallH = knob.wall, towers = knob.tower, keepH = knob.keep;

  /* the ground plate: everything sits on it, so it is painted first and its
     depth key is the smallest */
  const gw = 46, gd = 34;
  box(L, -2, -2, -1.2, gw, gd, 1.2, [58, 76, 48]);

  /* the axis, running off the near corner */
  const ax = Math.min(26, p.axis.length_m / 200);
  box(L, gw / 2 - 3, gd - 2, 0, 6, ax, 0.18, [122, 116, 94], 'axis');

  /* the wards, laid side by side along x */
  let cursor = 3;
  p.wards.forEach((w, i) => {
    const ww = Math.max(6, w.w / (SCALE * 2.2));
    const wd = Math.max(6, w.d / (SCALE * 2.2));
    const y0 = 4;
    /* the enclosed ground, a shade lighter */
    box(L, cursor, y0, 0, ww, wd, 0.25, [78, 100, 64]);

    if (w.wall > 0) {
      const t = 0.9, h = wallH;
      box(L, cursor, y0, 0, ww, t, h, STONE);                    /* far */
      box(L, cursor, y0 + wd - t, 0, ww, t, h, STONE);           /* near */
      box(L, cursor, y0, 0, t, wd, h, STONE);                    /* left */
      box(L, cursor + ww - t, y0, 0, t, wd, h, STONE);           /* right */

      /* towers: corners first, because a corner with nothing on it is a door */
      const spots = [[cursor, y0], [cursor + ww - t, y0],
                     [cursor, y0 + wd - t], [cursor + ww - t, y0 + wd - t]];
      const share = Math.round(towers / p.wards.filter((x) => x.wall > 0).length);
      for (let k = 4; k < share; k++) {
        const f = (k - 3) / (share - 3);
        spots.push(k % 2 ? [cursor + ww * f, y0] : [cursor + ww * f, y0 + wd - t]);
      }
      spots.slice(0, Math.max(0, share)).forEach((s) =>
        drum(L, s[0] + 0.45, s[1] + 0.45, 0, 1.5, h * 1.45, STONE));
    } else {
      /* no wall: a block instead, which is what a château is */
      box(L, cursor + 1, y0 + wd * 0.15, 0.25, ww - 2, wd * 0.35, 5.2, [206, 196, 172]);
      box(L, cursor + 1, y0 + wd * 0.15, 5.45, ww - 2, wd * 0.35, 1.1, LEAD);
    }
    cursor += ww + 2;
  });

  /* the motte and the keep on it */
  if (p.motte) {
    const mr = p.motte.diameter / (SCALE * 4);
    const mh = p.motte.height / SCALE;
    const cx = 3 + 5, cy = 4 + 7;
    for (let i = 0; i < 6; i++) {
      const t = i / 6, rr = mr * (1 - t * 0.34);
      box(L, cx - rr, cy - rr, mh * t, rr * 2, rr * 2, mh / 6 + 0.02,
          [84 - i * 3, 108 - i * 4, 66 - i * 2]);
    }
    drum(L, cx, cy, mh, p.keep.diameter / (SCALE * 5) || 2, keepH / SCALE, [210, 199, 176]);
  } else if (p.keep) {
    /* no motte: the block sits on the ground and the axis runs through it */
    box(L, 3 + 6, 4 + 6, 0.25, 12, 4, keepH / SCALE, [212, 203, 180]);
    box(L, 3 + 6, 4 + 6, 0.25 + keepH / SCALE, 12, 4, 1.2, LEAD);
  }
  return L;
}

/* ── paint. Far away first: that is the whole depth buffer there is. ── */
function draw() {
  const p = PLANS[pick];
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, cv.width, cv.height);
  const L = scene(p);
  L.sort((a, b) => a.o - b.o);

  /* fit the camera to whatever it was handed. Framing it by eye against one
     plan meant Krak — 25 m walls and seventeen towers — walked off the top.
     Project the eight corners of every solid, take the bounds, and scale. */
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const b of L)
    for (const cx of [b.x, b.x + b.w])
      for (const cy of [b.y, b.y + b.d])
        for (const cz of [b.z, b.z + b.h]) {
          const q = iso(cx, cy, cz);
          if (q[0] < x0) x0 = q[0];
          if (q[0] > x1) x1 = q[0];
          if (q[1] < y0) y0 = q[1];
          if (q[1] > y1) y1 = q[1];
        }
  const pad = 34;
  const k = Math.min((cv.width - pad * 2) / (x1 - x0), (cv.height - pad * 2) / (y1 - y0));
  ctx.setTransform(k, 0, 0, k, cv.width / 2 - k * (x0 + x1) / 2,
                                cv.height / 2 - k * (y0 + y1) / 2);
  const ox = 0, oy = 0;
  L.forEach((b) => drawBox(b, ox, oy));
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  $('#cap').textContent = L.length + ' solids, painted far to near, camera at ' +
    k.toFixed(2) + '\u00d7. ' +
    'Sort key is x + y + z and there is no depth buffer — the order IS the depth.';
}

/* ── the gallery, in elevation and to proportion ────────────────────── */
function hall(g) {
  if (!g) return '<p style="color:var(--dim);margin:0">This plan has no gallery.</p>';
  const W = 1100, H = Math.round(W * (g.height_m / g.length_m) * 1.9);
  const n = g.bays, pad = 26;
  const bw = (W - pad * 2) / n;
  const floor = H - 22, springer = H * 0.42;
  let s = '<svg viewBox="0 0 ' + W + ' ' + H + '">';
  /* the barrel vault */
  s += '<path class="vault" d="M' + pad + ' ' + springer + ' Q ' + (W / 2) + ' -14 ' +
       (W - pad) + ' ' + springer + ' L' + (W - pad) + ' ' + (springer + 8) +
       ' Q ' + (W / 2) + ' 2 ' + pad + ' ' + (springer + 8) + ' Z"/>';
  for (let i = 0; i < n; i++) {
    const x = pad + i * bw + 3, w = bw - 6;
    /* mirrored arch */
    s += '<path class="mirror" d="M' + x + ' ' + floor + ' L' + x + ' ' + (springer + 34) +
         ' Q ' + (x + w / 2) + ' ' + (springer - 6) + ' ' + (x + w) + ' ' + (springer + 34) +
         ' L' + (x + w) + ' ' + floor + ' Z"/>';
    /* the mirrors inside it: 21 panes, in three columns of seven */
    for (let r = 0; r < 7; r++) for (let c = 0; c < 3; c++)
      s += '<rect class="win" x="' + (x + 4 + c * (w - 8) / 3) + '" y="' +
           (springer + 44 + r * (floor - springer - 52) / 7) + '" width="' +
           ((w - 8) / 3 - 2) + '" height="' + ((floor - springer - 52) / 7 - 2) + '"/>';
    /* a chandelier between each pair */
    if (i < n - 1)
      s += '<circle class="chand" cx="' + (pad + (i + 1) * bw) + '" cy="' +
           (springer + 26) + '" r="3.4"/>';
  }
  s += '<rect class="glow" x="' + pad + '" y="' + (floor - 3) + '" width="' +
       (W - pad * 2) + '" height="5"/>';
  s += '<text class="dim2" x="' + pad + '" y="' + (H - 6) + '">' +
       g.length_m + ' m long &#183; ' + g.width_m + ' m wide &#183; ' + g.height_m +
       ' m high &#183; ' + n + ' bays &#183; ' + g.mirrors + ' mirrors &#183; ' +
       (g.mirrors / g.bays) + ' each</text>';
  return s + '</svg>';
}

/* ── the words beside the picture ───────────────────────────────────── */
function say() {
  const p = PLANS[pick];
  $('#say').innerHTML =
    '<div class="blk"><p class="k">' + esc(p.kind) + ' &middot; ' + esc(p.era) + '</p>' +
      '<h3>' + esc(p.name) + '</h3><p>' + esc(p.ground) + '</p>' +
      '<p><b>' + esc(p.axis.name) + '</b> — ' + esc(p.axis.note) + '</p></div>' +
    '<div class="blk"><p class="k">what it teaches</p>' +
      '<p class="said">' + esc(p.lesson) + '</p></div>';
  $('#figs').innerHTML = (p.figures || []).map((f) =>
    '<div><u>' + esc(f.what) + '</u><b>' + esc(f.value) + '</b></div>').join('');
  $('#hall').innerHTML = hall(p.gallery);
}

function setPlan(i) {
  pick = i;
  const p = PLANS[i];
  knob.wall = Math.max(2, Math.max(0, ...p.wards.map((w) => w.wall || 0)));
  knob.tower = p.towers;
  knob.keep = p.keep ? p.keep.height : 12;
  $('#k-wall').value = knob.wall;
  $('#k-tower').value = knob.tower;
  $('#k-keep').value = knob.keep;
  document.querySelectorAll('#pick button').forEach((b, k) =>
    b.classList.toggle('on', k === i));
  refresh();
}
function refresh() {
  $('#v-wall').textContent = knob.wall + ' m';
  $('#v-tower').textContent = knob.tower;
  $('#v-keep').textContent = knob.keep + ' m';
  $('#v-sun').textContent = ['south-west', 'north-west', 'north-east', 'south-east'][SUN];
  draw(); say();
}

$('#pick').innerHTML = PLANS.map((p, i) =>
  '<button data-i="' + i + '">' + esc(p.name) + '</button>').join('');
document.querySelectorAll('#pick button').forEach((b) =>
  b.onclick = () => setPlan(+b.dataset.i));

$('#k-wall').oninput = (e) => { knob.wall = +e.target.value; refresh(); };
$('#k-tower').oninput = (e) => { knob.tower = +e.target.value; refresh(); };
$('#k-keep').oninput = (e) => { knob.keep = +e.target.value; refresh(); };
$('#k-sun').oninput = (e) => { SUN = +e.target.value; refresh(); };

setPlan(0);
<\/script>\n</body>\n</html>\n`;

writeFileSync('castle.html', html);

console.log('\ncastle.html · ' + plans.length + ' plans · ' + WORDS.length + ' glossary words');
plans.forEach((p) => console.log('  ' + p.name.padEnd(13) + p.kind.padEnd(10) +
  p.wards.length + ' wards, ' + String(p.towers).padStart(2) + ' towers' +
  (p.motte ? ', motte ' + p.motte.height + ' m' : ', no motte') +
  (p.gallery ? ', gallery ' + p.gallery.mirrors + '/' + p.gallery.bays + ' = ' +
    (p.gallery.mirrors / p.gallery.bays) + ' a bay' : '')));
console.log('  drawn with iso, depth and tone from lesson one, unchanged and by name');
console.log('  the glossary is firm about the one everybody gets wrong:');
console.log('    a chateau is a country seat and need not be fortified.');
console.log('    A fortified one is a chateau fort. Versailles is the former.');

#!/usr/bin/env node
/* quarter.mjs — the living quarter of the Hesperus, furnished.

   One quarter of the ship is living space, 45,100 square kilometres, and
   the bridge says what it holds: a library, a loom hall, a long walk, a
   workshop, the dispatch shelf, and one room kept empty. This furnishes
   them, and every piece is a template woven from something the yard
   already has: the library's shelves from the verse forms, its chairs
   upholstered in the fabrics that survive Venus; the loom hall's looms
   from the ten top-level looms, its benches cushioned in the fabrics that
   will not survive and are here anyway; the long walk's lanterns in the
   fireflies' colours; the workshop's benches from the twelve instruments;
   the shelf's pigeonholes from the dispatches on it. The empty room has
   one template, which says it is empty, and no furniture, and that is the
   furnishing. Nothing here has a face.
       node quarter.mjs */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { TOONAMI, FIREFLIES } from './toonami.mjs';

const J = d => readdirSync(d).filter(f => f.endsWith('.json') && !f.startsWith('_')).map(f => JSON.parse(readFileSync(d + '/' + f, 'utf8')));
const forms = J('templates-form').sort((a, b) => (a.order || 0) - (b.order || 0)), fabrics = J('templates-fabric').sort((a, b) => a.order - b.order), instruments = J('templates-instrument').sort((a, b) => a.order - b.order);
const looms = J('templates-loom').filter(l => l.depth === '4' || l.depth === 4 || /^l4-/.test(l.id));
const dispatches = existsSync('dispatches.jsonl') ? readFileSync('dispatches.jsonl', 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)) : [];
const HUES = ['#d9ff5a', '#ffe66b', '#b6ff7a', '#fff3a0', '#c8ff4a', '#e8ff8a'];

const ROOMS = [
  { id: 'library', name: 'The library', km2: 12000, light: 'low and warm', what: 'Shelves by verse form, chairs in whatever survives, lanterns. Reading is the only thing it is for.' },
  { id: 'loom-hall', name: 'The loom hall', km2: 9000, light: 'daylight from the corn side', what: 'The ten looms that weave the templates, and benches to watch them from.' },
  { id: 'long-walk', name: 'The long walk', km2: 6100, light: 'fireflies only', what: 'Ten kilometres wide and six hundred and ten long. Benches at intervals, lanterns, and nothing else on it.' },
  { id: 'workshop', name: 'The workshop', km2: 8000, light: 'bright and even', what: 'A bench for every figure the yard leans on, and the whiteboard.' },
  { id: 'dispatch-shelf', name: 'The dispatch shelf', km2: 5000, light: 'one lamp over the stand', what: 'A pigeonhole for every sealed dispatch, and a stand to open one on.' },
  { id: 'empty', name: 'A room kept empty', km2: 5000, light: 'whatever comes in', what: 'Nothing. Somewhere on a ship this size nobody has decided anything about yet.' },
];
const P = [];
const piece = (room, id, kind, name, text, wovenBy, extra = {}) => P.push({ id: `${room}-${id}`, kind, room, name, text, wovenBy, ...extra });
/* the library */
forms.forEach((f, i) => piece('library', 'shelf-' + f.id, 'shelf', `a shelf of ${f.name.toLowerCase()}`, `${(f.note || '').split('.')[0]}.`, f.id, { bay: i }));
fabrics.filter(f => ['good', 'fair', 'inert'].includes(f.survives)).forEach((f, i) => piece('library', 'chair-' + f.id, 'chair', `a reading chair in ${f.name.toLowerCase()}`, `Upholstered in ${f.name.toLowerCase()}, which survives Venus ${f.survives === 'inert' ? 'by not reacting to anything' : f.survives === 'good' ? 'well' : 'fairly'}. ${f.why || ''}`.trim(), f.id, { seat: i }));
HUES.forEach((h, i) => piece('library', 'lantern-' + (i + 1), 'lantern', `a lantern, ${['first', 'second', 'third', 'fourth', 'fifth', 'sixth'][i]}`, 'Lit in one of the fireflies\' colours; it blinks on its own rhythm and never goes fully dark.', 'toonami.mjs', { hue: h }));
piece('library', 'table', 'table', 'the long table', 'One table down the middle of the room, long enough that nobody has to sit near anybody.', 'the bridge');
/* the loom hall */
looms.forEach((l, i) => piece('loom-hall', 'loom-' + l.id, 'loom', l.name || l.id, `One of the ten looms at the top of the chain. It weaves ${(l.kind || 'its kind')}s, and what it weaves weaves the rest.`, l.id, { bay: i }));
fabrics.filter(f => f.survives === 'no').forEach((f, i) => piece('loom-hall', 'bench-' + f.id, 'bench', `a bench cushioned in ${f.name.toLowerCase()}`, `${f.name} will not survive Venus. It is here anyway, because a bench you watch a loom from should be comfortable, and it can be re-covered.`, f.id, { seat: i }));
/* the long walk */
for (let i = 0; i < 13; i++) piece('long-walk', 'bench-' + (i + 1), 'bench', `the bench at ${i * 47} km`, `A bench on the long walk, ${i * 47} kilometres from the library door. Nothing on either side of it but the walk.`, 'the bridge', { at: i * 47 });
HUES.concat(HUES).forEach((h, i) => piece('long-walk', 'lantern-' + (i + 1), 'lantern', `a lantern at ${Math.round(i * 610 / 12)} km`, 'A lantern on the walk, in one of the fireflies\' colours.', 'toonami.mjs', { hue: h, at: Math.round(i * 610 / 12) }));
/* the workshop */
instruments.forEach((n, i) => piece('workshop', 'bench-' + n.id, 'workbench', `the ${(n.quantity || n.id).toLowerCase()} bench`, `A bench for one figure: ${n.quantity}, ${n.value} ${n.unit}${n.uncertainty ? ' give or take ' + n.uncertainty : ''}. ${n.wrong_if ? 'Wrong if ' + n.wrong_if.charAt(0).toLowerCase() + n.wrong_if.slice(1).split('.')[0] + '.' : ''}`, n.id, { bay: i }));
piece('workshop', 'whiteboard', 'whiteboard', 'the whiteboard', 'The surface on its own. Whatever is on it is on it until it is wiped.', 'whiteboard.html');
/* the dispatch shelf */
dispatches.forEach((d, i) => piece('dispatch-shelf', 'hole-' + d.id, 'pigeonhole', `pigeonhole ${d.id}`, `Holds ${d.title || d.id}, sealed. It opens with the words it was sealed with and no others.`, d.id, { bay: i }));
piece('dispatch-shelf', 'stand', 'stand', 'the reading stand', 'One stand under one lamp. You bring a dispatch to it, say the words, and read.', 'dispatch.html');
/* the empty room */
piece('empty', 'nothing', 'nothing', 'nothing', 'This room has no furniture, and this file exists so that the absence is on the record as a decision rather than an oversight.', 'the bridge');

rmSync('templates-quarter', { recursive: true, force: true }); mkdirSync('templates-quarter');
for (const r of ROOMS) writeFileSync(`templates-quarter/room-${r.id}.json`, JSON.stringify({ kind: 'room', ...r, pieces: P.filter(p => p.room === r.id).length, wovenBy: 'the bridge' }, null, 1));
for (const p of P) writeFileSync(`templates-quarter/${p.id}.json`, JSON.stringify(p, null, 1));
const total = readdirSync('.').filter(d => d.startsWith('templates-')).reduce((n, d) => n + readdirSync(d).filter(f => f.endsWith('.json')).length, 0);
console.log(`the quarter: ${ROOMS.length} rooms, ${P.length} pieces (${Object.entries(P.reduce((a, p) => (a[p.kind] = (a[p.kind] || 0) + 1, a), {})).map(([k, v]) => v + ' ' + k).join(', ')}) · templates on disk: ${total}`);
const DEF = { rooms: ROOMS.map(r => ({ ...r, pieces: P.filter(p => p.room === r.id) })), total };
const page = readFileSync('quarter.page.js', 'utf8');
const html = `<title>The quarter &middot; furnished</title>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<!--
  THE QUARTER — the living quarter of the Hesperus, furnished. Six rooms, ${P.length} pieces,
  every piece a template woven from something the yard already had: shelves from the
  verse forms, chairs from the fabrics that survive Venus, looms from the ten at the
  top of the chain, benches from the fabrics that do not survive and are here anyway,
  lanterns in the fireflies' colours, workbenches from the twelve instruments,
  pigeonholes from the dispatches. The empty room stays empty, on the record.
  ${total} templates on disk at build. Nothing with a face. SCRIPT: yes, and marked.
-->
<style>
  :root{--void:#0b0d12;--panel:#151922;--panel2:#1c2230;--edge:#2b3445;--ink:#efe9dc;--dim:#95a0b3;--gold:#f2c98a;--ok:#6fd4a8;--sea:#3f8fbf;--serif:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif}
  *{box-sizing:border-box}html,body{margin:0;background:var(--void);color:var(--ink);font:13.5px/1.5 ui-rounded,system-ui,-apple-system,sans-serif}
  header{padding:20px 24px 8px;max-width:1200px;margin:0 auto;display:flex;align-items:baseline;gap:14px;flex-wrap:wrap}header h1{margin:0;font:500 30px/1.1 var(--serif);color:var(--gold)}header small{color:var(--dim)}
  main{padding:8px 24px 40px;max-width:1200px;margin:0 auto;display:grid;grid-template-columns:minmax(0,1fr) 380px;gap:12px}@media (max-width:900px){main{grid-template-columns:1fr}}
  .plan{background:var(--panel);border:1px solid var(--edge);border-radius:14px;padding:12px}.plan canvas{display:block;width:100%;aspect-ratio:3/2;border-radius:8px;background:#06070d;cursor:pointer}
  .plan p{color:var(--dim);font-size:12px;margin:8px 0 0}
  section{background:var(--panel);border:1px solid var(--edge);border-radius:14px;padding:12px;margin-bottom:12px}section h2{margin:0 0 6px;font:500 17px/1.2 var(--serif)}section h2 i{font:400 11.5px/1.4 ui-rounded,system-ui,sans-serif;color:var(--dim);display:block;margin-top:2px}
  .stat{display:flex;justify-content:space-between;border-top:1px solid var(--edge);padding:5px 0;font-size:12.5px;gap:8px}.stat span{color:var(--dim)}.stat b{font-weight:500;text-align:right}
  .piece{border-top:1px solid var(--edge);padding:6px 0;font-size:12px}.piece b{font-weight:600;display:block}.piece p{margin:2px 0 0;color:var(--dim)}.piece small{color:var(--sea)}
  .rooms{display:flex;gap:6px;flex-wrap:wrap}.rooms button{font:inherit;color:var(--ink);background:var(--panel2);border:1px solid var(--edge);border-radius:9px;padding:5px 10px;cursor:pointer}.rooms button.on{border-color:var(--gold);color:var(--gold)}
  .list{max-height:52vh;overflow:auto}
  footer{padding:10px 24px 28px;color:var(--dim);font-size:12px;max-width:1200px;margin:0 auto}footer a{color:var(--sea);text-decoration:none}
</style>
${TOONAMI}
<header><h1>The quarter</h1><small>the living quarter of the Hesperus, furnished · 45,100 km² · six rooms · ${P.length} pieces, every one a template</small></header>
<main>
  <div class="plan"><canvas id="plan" width="1200" height="800"></canvas><p>Click a room. Shelves are rows, chairs are rounded, looms are lines with their warp, lanterns are lit, benches are bars, pigeonholes are a grid. The empty room is drawn empty.</p></div>
  <div>
    <section><h2>Rooms</h2><div class="rooms" id="rooms"></div></section>
    <section><h2 id="room-name">—</h2><div id="room-stats"></div></section>
    <section><h2>Pieces<i>what is in the room, and what each was woven from</i></h2><div class="list" id="pieces"></div></section>
    <section><h2>The console<i>the counsel aboard; it answers from what the decks saved in this browser, through the ledger server on port 7332</i></h2>
      <div class="log" id="console-log" style="font-size:12px;max-height:220px;overflow:auto;color:var(--dim)"></div>
      <div class="row" style="display:flex;gap:6px;margin-top:6px"><input id="console-q" type="text" placeholder="ask the counsel" style="flex:1;font:inherit;color:var(--ink);background:var(--panel2);border:1px solid var(--edge);border-radius:9px;padding:6px 8px"><button id="console-send">Ask</button></div>
    </section>
    <section><h2>The editor<i>any template on the ship, loaded, changed, kept in this browser, and handed back as a file</i></h2>
      <div class="row" style="display:flex;gap:6px;flex-wrap:wrap"><input id="ed-path" type="text" value="templates-rules/clans.json" style="flex:1;min-width:200px;font:inherit;color:var(--ink);background:var(--panel2);border:1px solid var(--edge);border-radius:9px;padding:6px 8px"><button id="ed-load">Load</button></div>
      <textarea id="ed-text" spellcheck="false" style="width:100%;height:160px;margin-top:6px;font:12px/1.4 ui-monospace,Menlo,monospace;color:var(--ink);background:var(--panel2);border:1px solid var(--edge);border-radius:9px;padding:8px"></textarea>
      <div class="row" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px"><button class="primary" id="ed-keep">Keep in this browser</button><button id="ed-file">Download this file</button><button id="ed-bundle">Download every customization</button><button id="ed-forget">Forget this one</button></div>
      <p style="color:var(--dim);font-size:12px;margin:8px 0 0" id="ed-note">Customizations live in this browser under custom.v1, keyed by path. The quarter reads its own back: change a room or a piece here and it changes on the plan. The rulebooks in templates-rules/ are read by their decks the same way: keep a changed one and that deck plays by it on its next load. The themes in templates-theme/ are the ship's look, and they are the one exception: the look is stamped CSS so that pages with no script still have none, which means a changed theme needs node toonami-all.mjs to show. The download is the file to write into the yard, and the generators do the rest.</p>
    </section>
  </div>
</main>
<footer>The plan is on <a href="index.html">the bridge</a>. Shelves from <a href="paper.html">the forms</a>, chairs and benches from the fabrics, looms from <a href="farm.html">the loom</a>, benches from <a href="instruments.html">the instruments</a>, pigeonholes from <a href="dispatch.html">the shelf</a>. ${total} templates on disk at build. <a href="arcade.html">← the arcade</a></footer>
<script id="def-json" type="application/json">${JSON.stringify(DEF).replace(/<\//g, '<\\/')}</script>
${FIREFLIES}
<script>
${page}
</script>
`;
writeFileSync('quarter.html', html); console.log(`wrote quarter.html (${html.length} bytes)`);

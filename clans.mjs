#!/usr/bin/env node
/* clans.mjs — the base layer: a Viking war of clans on Venus, as a portfolio.

   Not one farm that pays a single enormous number. A jarl holds individual
   assets, each a template, each yielding its clan's resource on its clan's
   own period, and the six periods are coprime (2, 3, 5, 7, 11, 13) so no
   two ever fire together, which is what the idle board lesson is about. The
   assets are woven from the six clans in templates-clan/ (Venus houses:
   fixing bed, cracking house, scriptorium, bed, relay mast, kiln) into
   templates-asset/: works that yield, stockpiles that hold, bands that raid
   or hold the ford, and three turns of the Venusian day. Bronze age, sword
   and sorcery: the warlock's spells are the sorcery and bronze is what the
   kiln's silicate and the cracking house's hydrogen make together.

   The weave is one function, `weave(clans, seed)`, and the same function is
   inlined into clans.html, so the game can re-weave its own templates from
   inside the game and hand them back as files. That is the seed of the
   thing you asked for: a game that can recreate itself.
       node clans.mjs
*/
import { readFileSync, writeFileSync, readdirSync, mkdirSync, rmSync } from 'node:fs';
import { TOONAMI, FIREFLIES } from './toonami.mjs';

export const WEAVE = `function weave(clans, seed) {
  const h32 = (a, b, c) => { let x = (Math.imul(a, 73856093) ^ Math.imul(b, 19349663) ^ Math.imul(c, 83492791)) | 0; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return x >>> 0; };
  const pick = (arr, k) => arr[k % arr.length]; const out = [];
  const BANDS = ['shieldwall', 'skirmishers', 'longship crew', 'berserks', 'bowmen', 'scouts', 'housecarls', 'thralls with spears', 'the jarl\\'s own', 'sworn men', 'wardens of the ford', 'night raiders'];
  const PILES = ['a pit', 'jars in the cold store', 'a cairn', 'a sealed cistern', 'a longhouse loft', 'a stone chest', 'a buried hoard', 'a tally on the mast', 'a raft of barrels', 'the temple store'];
  clans.forEach((c, ci) => {
    c.tiers.forEach((t, ti) => out.push({ id: c.id + '-work-' + t.n, kind: 'work', clan: c.id, clanName: c.name, house: c.house, resource: c.resource, period: c.period, tier: t.n, yield: t.yield, cost: Math.round(t.yield * 120 * (1 + ti)), name: c.house + ' ' + t.n + ' of ' + c.name, text: t.note + ' Yields ' + t.yield + ' ' + c.resource + ' every ' + c.period + ' days.', wovenBy: c.id }));
    for (let i = 0; i < 12; i++) { const h = h32(seed, ci * 100 + i, 1), r = h % 1000 / 1000; const raids = i % 2 === 1;
      out.push({ id: c.id + '-band-' + (i + 1), kind: 'band', clan: c.id, clanName: c.name, resource: c.resource, period: c.period, name: pick(BANDS, h) + ' of ' + c.name, strength: 3 + Math.round(r * 12) + ti(i), raids, cost: 400 + Math.round(r * 1600), upkeep: 1 + Math.round(r * 3), text: (raids ? 'Raids on the clan\\'s period, taking a share of what the others have piled. ' : 'Holds the ford on the clan\\'s period; raids against you break on it. ') + 'Strength ' + (3 + Math.round(r * 12) + ti(i)) + '; eats ' + (1 + Math.round(r * 3)) + ' ' + c.resource + ' a day.', wovenBy: c.id }); }
    for (let i = 0; i < 10; i++) { const h = h32(seed, ci * 100 + 50 + i, 2), r = h % 1000 / 1000;
      out.push({ id: c.id + '-pile-' + (i + 1), kind: 'pile', clan: c.id, clanName: c.name, resource: c.resource, name: pick(PILES, h) + ' for ' + c.resource, holds: 50 * (1 + Math.round(r * 19)), cost: 60 * (1 + Math.round(r * 19)), text: 'Holds ' + (50 * (1 + Math.round(r * 19))) + ' ' + c.resource + '. What is not piled is not yours by morning.', wovenBy: c.id }); }
  });
  [['dawn', 'the long dawn', 'works ×1.2', 1.2], ['noon', 'the two-day noon', 'raids ×1.3', 1.3], ['night', 'the two-day night', 'works ×0.6, raids ×0.7', 0.6]].forEach(([id, name, does, mul], i) => out.push({ id: 'turn-' + id, kind: 'turn', name, does, mul, days: i === 0 ? 1 : 2, text: 'Venus turns once in four days; ' + name + ' is a ' + (i === 0 ? 'day' : 'two days') + ' of it. ' + does + '.', wovenBy: 'the planet' }));
  function ti(i) { return Math.floor(i / 4); }
  return out;
}`;
const clans = readdirSync('templates-clan').filter(f => f.endsWith('.json')).map(f => JSON.parse(readFileSync('templates-clan/' + f, 'utf8'))).sort((a, b) => a.period - b.period);
const weave = new Function(WEAVE + '; return weave;')();
const assets = weave(clans, 793);
rmSync('templates-asset', { recursive: true, force: true }); mkdirSync('templates-asset');
for (const a of assets) writeFileSync(`templates-asset/${a.id}.json`, JSON.stringify(a, null, 1));
/* three more sagas of the same six clans, other seeds: the same houses, other bands and other hoards. On disk as templates, prefixed by the saga. */
for (const seed of [41, 1597, 8191]) for (const a of weave(clans, seed)) writeFileSync(`templates-asset/saga${seed}-${a.id}.json`, JSON.stringify({ ...a, id: `saga${seed}-${a.id}`, saga: seed }, null, 1));
const total = readdirSync('.').filter(d => d.startsWith('templates-')).reduce((n, d) => n + readdirSync(d).filter(f => f.endsWith('.json')).length, 0);
console.log(`assets ${assets.length} × 4 sagas from ${clans.length} clans (${assets.filter(a => a.kind === 'work').length} works, ${assets.filter(a => a.kind === 'band').length} bands, ${assets.filter(a => a.kind === 'pile').length} piles, 3 turns) · templates on disk: ${total}`);
const spells = readdirSync('templates-spell').filter(f => f.endsWith('.json')).map(f => JSON.parse(readFileSync('templates-spell/' + f, 'utf8')));
const DEF = { clans: clans.map(c => ({ id: c.id, name: c.name, house: c.house, resource: c.resource, period: c.period, base: c.base, saga: c.saga })), assets, spells: spells.map(s => ({ id: s.id, name: s.name, glyph: s.glyph, cost: s.cost, cooldown: s.cooldown, kind: s.kind, does: s.does })), seed: 793, total };
const page = readFileSync('clans.page.js', 'utf8');
const html = `<title>War of clans &middot; a portfolio on Venus</title>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<!--
  WAR OF CLANS — the base layer. A jarl's portfolio of individual assets on a
  Venusian continent: ${assets.length} templates woven by clans.mjs from the six clans in
  templates-clan/, each yielding on its clan's coprime period (2, 3, 5, 7, 11, 13) so
  nothing ever fires together and nothing can be maximised, only composed. Raids come on
  the other clans' periods; bands hold the ford; piles keep what the night would take;
  the warlock's spells are the sorcery. Absence is credited in full. The weave function is
  in this page: re-weave with another seed and the game hands its own templates back.
  ${total} templates on disk at build. No faces; shields, masts, cairns.
  SCRIPT: yes, and marked.
-->
<style>
  :root{--void:#0b0d12;--panel:#151922;--panel2:#1c2230;--edge:#2b3445;--ink:#efe9dc;--dim:#95a0b3;--gold:#f2c98a;--venus:#f0a83c;--ok:#6fd4a8;--bad:#e06f5a;--sea:#3f8fbf;--serif:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif}
  *{box-sizing:border-box}html,body{margin:0;background:var(--void);color:var(--ink);font:13.5px/1.5 ui-rounded,system-ui,-apple-system,sans-serif}
  header{padding:20px 24px 8px;max-width:1160px;margin:0 auto;display:flex;align-items:baseline;gap:14px;flex-wrap:wrap}header h1{margin:0;font:500 30px/1.1 var(--serif);color:var(--gold)}header small{color:var(--dim)}header .sp{flex:1}
  #scene{display:block;width:100%;max-width:1160px;height:240px;margin:0 auto;border-radius:14px;background:#1a0f0a}
  main{padding:12px 24px 40px;max-width:1160px;margin:0 auto;display:grid;gap:12px}
  .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px}.stat{background:var(--panel);border:1px solid var(--edge);border-radius:12px;padding:9px 12px}.stat b{display:block;font-size:10.5px;color:var(--dim);font-weight:500;text-transform:uppercase;letter-spacing:.08em}.stat span{font:500 20px/1.2 var(--serif);font-variant-numeric:tabular-nums}.stat i{font-style:normal;color:var(--dim);font-size:11px;display:block}
  .cols{display:grid;grid-template-columns:1.1fr 1fr;gap:12px}@media (max-width:900px){.cols{grid-template-columns:1fr}}
  section{background:var(--panel);border:1px solid var(--edge);border-radius:14px;padding:12px}section h2{margin:0 0 8px;font:500 17px/1.2 var(--serif)}section h2 i{font:400 11.5px/1.4 ui-rounded,system-ui,sans-serif;color:var(--dim);display:block;margin-top:2px}
  .clan{border:1px solid var(--edge);border-radius:12px;padding:8px 10px;margin:6px 0;background:var(--panel2)}.clan h3{margin:0;font:500 15px/1.2 var(--serif);display:flex;justify-content:space-between;gap:8px}.clan h3 small{font:400 11px ui-rounded,system-ui,sans-serif;color:var(--dim)}.clan p{margin:2px 0 6px;color:var(--dim);font-size:11.5px}
  .asset{display:grid;grid-template-columns:1fr auto;gap:2px 10px;align-items:center;border-top:1px solid var(--edge);padding:6px 0}.asset b{font-weight:600;font-size:12.5px}.asset p{margin:0;font-size:11.5px;color:var(--dim);grid-column:1}.asset .n{grid-row:span 2;font-size:12px;color:var(--gold);text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}.asset.held b{color:var(--ok)}
  button{font:inherit;color:var(--ink);background:var(--panel2);border:1px solid var(--edge);border-radius:9px;padding:5px 11px;cursor:pointer}button:hover:not(:disabled){border-color:var(--gold)}button:disabled{opacity:.4;cursor:not-allowed}button.primary{background:#2a2036;border-color:var(--venus)}
  .row{display:flex;gap:6px;flex-wrap:wrap;align-items:center}.badge{display:inline-block;background:var(--panel);border:1px solid var(--edge);border-radius:999px;padding:2px 9px;font-size:11px;color:var(--dim)}.badge.hot{border-color:var(--venus);color:var(--venus)}.badge.ok{border-color:var(--ok);color:var(--ok)}
  .spell{display:inline-flex;flex-direction:column;align-items:center;gap:2px;min-width:70px}.spell b{font-size:18px}.spell small{color:var(--dim)}
  .log{font-size:12px;color:var(--dim);max-height:220px;overflow:auto}.log div{border-bottom:1px solid var(--edge);padding:3px 0}.log b{color:var(--ink);font-weight:500;margin-right:6px}
  .piles{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:6px}.pile{background:var(--panel2);border:1px solid var(--edge);border-radius:10px;padding:8px 10px}.pile b{display:block;font-size:11px;color:var(--dim);text-transform:uppercase;letter-spacing:.06em}.pile span{font:500 18px/1.2 var(--serif);font-variant-numeric:tabular-nums}.bar{height:5px;background:#0e1118;border-radius:3px;margin-top:5px;overflow:hidden}.bar div{height:100%;background:var(--sea)}
  textarea,input[type=number]{font:inherit;color:var(--ink);background:var(--panel2);border:1px solid var(--edge);border-radius:9px;padding:6px 8px}
  footer{padding:10px 24px 28px;color:var(--dim);font-size:12px;max-width:1160px;margin:0 auto}footer a{color:var(--sea);text-decoration:none}
</style>
${TOONAMI}
<header><h1>War of clans</h1><small>a portfolio on Venus · six clans, six coprime periods · one day a second · bronze age, sword and sorcery</small><span class="sp"></span><small id="clock"></small></header>
<canvas id="scene" width="1160" height="240"></canvas>
<main>
  <div class="stats" id="stats"></div>
  <section><h2>Stockpiles<i>what is not piled is not yours by morning</i></h2><div class="piles" id="piles"></div></section>
  <div class="cols">
    <div><section><h2>The portfolio<i>individual assets, one clan at a time; works yield on the period, bands raid or hold, piles keep</i></h2><div id="clans"></div></section></div>
    <div>
      <section><h2>Sorcery<i>the warlock's six, on a reserve of twenty</i></h2><div class="row" id="spells"></div></section>
      <section><h2>The record</h2><div class="log" id="log"></div><div class="row" style="margin-top:8px"><button id="wipe">Start the war again</button></div></section>
      <section><h2>Re-weave<i>the loom is in this page: another seed, another ${assets.length} templates, handed back as files</i></h2><div class="row"><input id="seed" type="number" value="793" style="width:110px"><button class="primary" id="reweave">Weave with this seed</button><button id="download">Download the templates</button><span class="badge" id="woven"></span></div><p style="color:var(--dim);font-size:12px;margin:8px 0 0">The same function that wrote templates-asset/ runs here. Weaving in the page changes the assets on offer for this browser; the download is the JSON of all of them, one file per template inside, ready to be written back into the yard.</p></section>
    </div>
  </div>
</main>
<footer>Clans from <a href="clans.html">templates-clan/</a>, spells from <a href="warlock.html">the warlock</a>, the cadence from the sixth lesson in <a href="school.html">the school</a>; the docket from <a href="descent.html">the ground landing</a>. ${total} templates on disk at build. <a href="arcade.html">← the arcade</a> · <a href="index.html">the yard</a></footer>
${FIREFLIES}
<script id="def-json" type="application/json">${JSON.stringify(DEF).replace(/<\//g, '<\\/')}</script>
<script>
${WEAVE}
${page}
</script>
`;
writeFileSync('clans.html', html); console.log(`wrote clans.html (${html.length} bytes)`);

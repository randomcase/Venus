#!/usr/bin/env node
/* village.mjs — the interface after the farm, woven from the farm's leaves.

   The farm's hundred leaves (templates-farm/) each weave one thing in the
   village (templates-village/): a crop weaves a trade, a store a hall, a
   market a square, a tool a workshop, a beast a byre, a water a well, a fence
   a lane, a season a festival, a field a smallholding, a weather a saying.
   Every village template names its leaf, so the chain now runs five deep:
   village ← leaf ← mould ← pattern ← loom.

   The page reads the farm's own saved state: what the farm harvested is what
   the village has to mill, bake, brew and weave. Nothing is written by hand.
       node village.mjs
*/
import { readFileSync, writeFileSync, readdirSync, mkdirSync, rmSync } from 'node:fs';
import { TOONAMI, FIREFLIES } from './toonami.mjs';
const leaves = readdirSync('templates-farm').filter(f => f.endsWith('.json')).map(f => JSON.parse(readFileSync('templates-farm/' + f, 'utf8')));
rmSync('templates-village', { recursive: true, force: true }); mkdirSync('templates-village');
const h32 = (a, b, c) => { let x = (Math.imul(a, 73856093) ^ Math.imul(b, 19349663) ^ Math.imul(c, 83492791)) | 0; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return x >>> 0; };
const CRAFT = { barley: ['the brewhouse', 'ale'], oats: ['the oatcake stall', 'oatcakes'], rye: ['the bakehouse', 'dark bread'], flax: ['the weaving shed', 'linen'], beans: ['the pottage kitchen', 'pottage'], millet: ['the mill', 'flour'], hemp: ['the ropewalk', 'rope'], rice: ['the steaming house', 'rice cakes'], vetch: ['the fodder yard', 'fodder'], buckwheat: ['the griddle', 'pancakes'] };
const V = [];
for (const l of leaves) { const r = h32(21, leaves.indexOf(l), 5) % 1000 / 1000; let t = null;
  if (l.kind === 'crop') { const [name, good] = CRAFT[l.plant]; t = { kind: 'trade', name, good, eats: Math.max(2, Math.round(l.harvest / 25)), pays: Math.round(l.harvest / 6 + r * 20), cost: 1200 + Math.round(r * 1800), text: `${good} from ${l.plant}. Eats ${Math.max(2, Math.round(l.harvest / 25))} of the harvest a day, pays ${Math.round(l.harvest / 6 + r * 20)} HEZE a day, feeds two households.` }; }
  else if (l.kind === 'store') t = { kind: 'hall', name: `the hall over ${l.roof}`, houses: Math.max(2, Math.round(l.holds / 250)), cost: l.holds * 2, text: `Rooms over ${l.roof}: ${Math.max(2, Math.round(l.holds / 250))} households.` };
  else if (l.kind === 'market') t = { kind: 'square', name: `the square at ${l.where}`, every: l.every, mul: l.price, cost: 1500 + Math.round(r * 2000), text: `A market square: every ${l.every} days the trades sell at ×${l.price}.` };
  else if (l.kind === 'tool') t = { kind: 'workshop', name: `the ${l.metal === 'wood' ? 'wright' : 'smith'}'s shop of the ${l.thing}`, mul: +(1 + (l.mul - 1) / 2).toFixed(2), cost: l.cost * 2, text: `Trades pay ×${(1 + (l.mul - 1) / 2).toFixed(2)} for the ${l.metal} ${l.thing}.` };
  else if (l.kind === 'beast') t = { kind: 'byre', name: `the byre of ${l.beast}`, good: l.beast === 'bees' ? 'honey' : l.beast === 'hens' ? 'eggs' : l.beast === 'a milk cow' ? 'milk' : l.beast === 'worms' ? 'black earth' : 'dung for the fields', feeds: 1, cost: l.cost * 2, text: `${l.beast}, ${l.does}. Feeds one household on its own; heard, not seen.` };
  else if (l.kind === 'water') t = { kind: 'well', name: `the well at ${l.source}`, waters: Math.max(2, Math.round(l.holds / 200)), cost: l.holds, text: `Clean water, free, for ${Math.max(2, Math.round(l.holds / 200))} households. Nobody pays for water.` };
  else if (l.kind === 'fence') t = { kind: 'lane', name: `the lane along the ${l.wall}`, keep: l.keep, cost: l.cost, text: `A lane that keeps ${l.keeps}; the village loses ×${l.keep} less to the road.` };
  else if (l.kind === 'season') t = { kind: 'festival', name: `the festival of ${l.turn}`, mul: +(1 + l.grows.length * 0.15).toFixed(2), text: `Held when ${l.turn} comes in: prosperity ×${(1 + l.grows.length * 0.15).toFixed(2)} for the season.` };
  else if (l.kind === 'field') t = { kind: 'holding', name: `the smallholding on ${l.name.replace('the ', '')}`, grows: Math.round(l.yield * l.size * 2), cost: l.cost, text: `A household grows ${Math.round(l.yield * l.size * 2)} of its own a day and asks for nothing.` };
  else if (l.kind === 'weather') t = { kind: 'saying', name: `a saying about ${l.sky}`, text: ({ rain: 'Rain at seven, fine by eleven.', drought: 'Dry June, dear corn.', frost: 'A green winter makes a fat churchyard.', wind: 'When the wind is in the east, it is neither good for man nor beast.', haze: 'A haze on the hill, the barns will fill.', 'still heat': 'Heat that stands still is heat that is thinking.', hail: 'Hail on the barley, ale in the barrel.', fog: 'Fog on the ridge, keep to the bridge.' })[l.sky] };
  if (t) { t.id = `v-${l.id}`; t.wovenBy = l.id; t.chain = [l.id, l.wovenBy, l.wovenBy.replace(/^l2-/, 'l3-').replace(/-\d+$/, ''), `l4-${l.kind}`, 'loom.mjs']; V.push(t); writeFileSync(`templates-village/${t.id}.json`, JSON.stringify(t, null, 1)); } }
const by = k => V.filter(v => v.kind === k);
const DEF = { trades: by('trade'), halls: by('hall'), squares: by('square'), workshops: by('workshop'), byres: by('byre'), wells: by('well'), lanes: by('lane'), festivals: by('festival'), holdings: by('holding'), sayings: by('saying'), seasons: leaves.filter(l => l.kind === 'season').map(l => l.turn) };
console.log(`village: ${V.length} templates from ${leaves.length} leaves · ` + Object.entries(DEF).filter(([k]) => k !== 'seasons').map(([k, v]) => `${v.length} ${k}`).join(', '));
const page = readFileSync('village.page.js', 'utf8');
const html = `<title>The village &middot; built from the farm</title>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<!--
  THE VILLAGE — the interface after the farm.

  Generated by village.mjs from templates-village/ (${V.length}), each woven from one of the
  farm's ${leaves.length} leaves, which were woven by moulds, by patterns, by looms. The chain is
  five deep and every file names the one above it. The page reads the farm's own saved
  state: what the farm harvested is what the village has to mill, bake, brew and weave.
  Households are counted and never drawn; the roofs have chimneys and no windows.
  Water is free. Bread is free once there is a bakehouse. Nothing here is money.
  SCRIPT: yes, and marked.
-->
<style>
  :root{--void:#0b0d12;--panel:#151922;--panel2:#1c2230;--edge:#2b3445;--ink:#efe9dc;--dim:#95a0b3;--gold:#f2c98a;--ok:#6fd4a8;--bad:#e06f5a;--sea:#3f8fbf;--serif:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif}
  *{box-sizing:border-box}html,body{margin:0;background:var(--void);color:var(--ink);font:14px/1.55 ui-rounded,system-ui,-apple-system,sans-serif}
  header{padding:22px 24px 10px;max-width:1120px;margin:0 auto;display:flex;align-items:baseline;gap:14px;flex-wrap:wrap}
  header h1{margin:0;font:500 30px/1.1 var(--serif);color:var(--gold);letter-spacing:.01em}header small{color:var(--dim);font-size:13px}header .sp{flex:1}
  #scene{display:block;width:100%;max-width:1120px;height:260px;margin:0 auto;border-radius:14px;background:#0d1a26}
  main{padding:14px 24px 40px;max-width:1120px;margin:0 auto;display:grid;gap:14px}
  .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px}
  .stat{background:var(--panel);border:1px solid var(--edge);border-radius:12px;padding:10px 12px}.stat b{display:block;font-size:10.5px;color:var(--dim);font-weight:500;text-transform:uppercase;letter-spacing:.08em}.stat span{font:500 22px/1.2 var(--serif);font-variant-numeric:tabular-nums}.stat i{font-style:normal;color:var(--dim);font-size:11.5px;display:block;margin-top:2px}
  .cols{display:grid;grid-template-columns:1fr 1fr;gap:14px}@media (max-width:860px){.cols{grid-template-columns:1fr}}
  section{background:var(--panel);border:1px solid var(--edge);border-radius:14px;padding:14px}
  section h2{margin:0 0 8px;font:500 17px/1.2 var(--serif);color:var(--ink)}section h2 i{font:400 11.5px/1.4 ui-rounded,system-ui,sans-serif;color:var(--dim);display:block;margin-top:2px;letter-spacing:.02em}
  .card{background:var(--panel2);border:1px solid var(--edge);border-radius:12px;padding:9px 12px;margin:6px 0;display:grid;grid-template-columns:1fr auto;gap:2px 10px;align-items:center;transition:border-color .15s}.card:hover{border-color:#3a4660}.card.done{border-color:var(--ok)}
  .card b{font-weight:600}.card p{margin:0;color:var(--dim);font-size:12px;grid-column:1}.card .n{grid-row:span 2;font-size:12px;color:var(--gold);text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
  button{font:inherit;color:var(--ink);background:var(--panel2);border:1px solid var(--edge);border-radius:9px;padding:6px 12px;cursor:pointer;transition:border-color .15s}button:hover:not(:disabled){border-color:var(--gold)}button:disabled{opacity:.4;cursor:not-allowed}
  .row{display:flex;gap:6px;flex-wrap:wrap;align-items:center}.badge{display:inline-block;background:var(--panel);border:1px solid var(--edge);border-radius:999px;padding:2px 9px;font-size:11px;color:var(--dim)}.badge.hot{border-color:var(--gold);color:var(--gold)}.badge.ok{border-color:var(--ok);color:var(--ok)}
  .log{font-size:12px;color:var(--dim);max-height:200px;overflow:auto}.log div{border-bottom:1px solid var(--edge);padding:3px 0}.log b{color:var(--ink);font-weight:500;margin-right:6px;font-variant-numeric:tabular-nums}
  .saying{font:italic 15px/1.5 var(--serif);color:var(--gold);margin:0}
  .chain{font-size:11px;color:var(--dim)}.chain code{color:var(--sea)}
  footer{padding:10px 24px 28px;color:var(--dim);font-size:12px;max-width:1120px;margin:0 auto}footer a{color:var(--sea);text-decoration:none}
</style>
${TOONAMI}
<header><h1>The village</h1><small>built from the farm · the chain is five deep · one day a second</small><span class="sp"></span><small id="clock"></small></header>
<canvas id="scene" width="1120" height="260"></canvas>
<main>
  <div class="stats" id="stats"></div>
  <section style="border-color:var(--edge)"><p class="saying" id="saying"></p><p style="margin:4px 0 0;color:var(--dim);font-size:12px" id="saying-from"></p></section>
  <div class="cols">
    <div>
      <section><h2>Trades<i>each eats the farm's harvest and pays HEZE; each feeds two households</i></h2><div id="trades"></div></section>
      <section><h2>Halls, wells, lanes<i>rooms for households, water for nothing, lanes that keep</i></h2><div id="civic"></div></section>
    </div>
    <div>
      <section><h2>Squares, workshops, byres, smallholdings<i>what makes the trades pay more and the households ask less</i></h2><div id="more"></div></section>
      <section><h2>The record</h2><div class="log" id="log"></div><div class="row" style="margin-top:8px"><button id="wipe">Unbuild the village</button></div></section>
      <section><h2>The chain<i>from any building back to its loom</i></h2><div class="chain" id="chain">Click a building.</div></section>
    </div>
  </div>
</main>
<footer>Templates in templates-village/, each naming its leaf in templates-farm/; the harvest comes from <a href="farm.html">the farm</a>; the docket from <a href="descent.html">the ground landing</a>. Nothing here is money. <a href="arcade.html">← the arcade</a> · <a href="index.html">the yard</a></footer>
${FIREFLIES}
<script id="def-json" type="application/json">${JSON.stringify(DEF).replace(/<\//g, '<\\/')}</script>
<script>
${page}
</script>
`;
writeFileSync('village.html', html); console.log(`wrote village.html (${html.length} bytes)`);

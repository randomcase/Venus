#!/usr/bin/env node
/* loom.mjs — templates that build templates that build templates that build templates.

   Four depths, one routine, one seed:

     depth 4   10 LOOMS        templates-loom/l4-*.json   a kind of thing and the vocabulary for it
     depth 3   25 PATTERNS     templates-loom/l3-*.json   a loom with some of its slots fixed
     depth 2   50 MOULDS       templates-loom/l2-*.json   a pattern with more slots fixed
     depth 1  100 LEAVES       templates-farm/*.json       a finished thing: ten per loom

   Each file at a depth names the file above it that wove it, so the chain
   can be read back from any leaf to its loom. The leaves are the next
   interface's material: farm.html is built from them and from nothing else.
   The farm is the yard's own, tended by the build: run `node yard.mjs` and
   the looms weave, the leaves fall, the farm is laid out again from them.

       node loom.mjs
*/
import { writeFileSync, mkdirSync, rmSync, readFileSync, readdirSync } from 'node:fs';

const h32 = (a, b, c) => { let x = (Math.imul(a, 73856093) ^ Math.imul(b, 19349663) ^ Math.imul(c, 83492791)) | 0; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return x >>> 0; };
const SEED = 21; const pick = (arr, k) => arr[k % arr.length];

/* depth 4: the ten looms. Each is a kind of thing on a farm and the words it can be woven from. */
const LOOMS = [
  { id: 'field', kind: 'field', name: 'The field loom', soil: ['loam', 'clay', 'chalk', 'peat', 'sand', 'silt'], lie: ['flat', 'south-facing', 'terraced', 'riverside', 'high', 'walled'], size: [1, 2, 3, 5, 8], gives: 'ground for a crop; yield × soil × lie' },
  { id: 'crop', kind: 'crop', name: 'The crop loom', plant: ['barley', 'oats', 'rye', 'flax', 'beans', 'millet', 'hemp', 'rice', 'vetch', 'buckwheat'], season: ['spring', 'summer', 'autumn'], days: [40, 60, 90, 120], gives: 'a harvest in HEZE at the end of its days' },
  { id: 'tool', kind: 'tool', name: 'The tool loom', thing: ['plough', 'harrow', 'scythe', 'flail', 'hoe', 'sickle', 'drill', 'roller'], metal: ['iron', 'bronze', 'wood', 'flint'], gives: 'a multiplier on one kind of field' },
  { id: 'weather', kind: 'weather', name: 'The weather loom', sky: ['rain', 'drought', 'frost', 'wind', 'haze', 'still heat', 'hail', 'fog'], lasts: [3, 5, 8, 13], gives: 'a multiplier on everything while it lasts' },
  { id: 'season', kind: 'season', name: 'The season loom', turn: ['thaw', 'sowing', 'the long days', 'first cut', 'harvest', 'the fallow', 'frost', 'deep winter'], length: [30, 45, 60], gives: 'which crops grow, and how fast' },
  { id: 'beast', kind: 'beast', name: 'The beast loom', beast: ['bees', 'worms', 'a mule', 'geese', 'a milk cow', 'a sow', 'hens', 'a mole'], does: ['pollinates', 'turns the soil', 'draws the plough', 'eats the slugs', 'manures', 'clears the stubble'], gives: 'a helper with a cost in grain and no eyes drawn' },
  { id: 'water', kind: 'water', name: 'The water loom', source: ['a well', 'a spring', 'a leat', 'a pond', 'a cistern', 'rain barrels'], holds: [100, 250, 500, 1000], gives: 'water held against the dry weathers' },
  { id: 'fence', kind: 'fence', name: 'The fence loom', wall: ['hedge', 'dry stone', 'post and rail', 'ditch and bank', 'wattle'], keeps: ['the geese in', 'the deer out', 'the wind off', 'the cow home'], gives: 'a field kept, which is a field that does not lose its yield' },
  { id: 'store', kind: 'store', name: 'The store loom', roof: ['a barn', 'a granary', 'a rick', 'a cellar', 'a loft'], holds: [200, 500, 1000, 2000], gives: 'harvest kept for the market instead of sold at the gate' },
  { id: 'market', kind: 'market', name: 'The market loom', where: ['the village', 'the river town', 'the fair', 'the mill', 'the abbey', 'the port'], every: [7, 14, 30], gives: 'a price for the store, in HEZE, on its own days' },
];

const out = { l4: [], l3: [], l2: [], leaves: [] };
rmSync('templates-loom', { recursive: true, force: true }); rmSync('templates-farm', { recursive: true, force: true }); mkdirSync('templates-loom'); mkdirSync('templates-farm');
const slots = L => Object.keys(L).filter(k => Array.isArray(L[k]));
const write = (dir, t) => writeFileSync(`${dir}/${t.id}.json`, JSON.stringify(t, null, 1));

LOOMS.forEach((L, li) => {
  const l4 = { id: `l4-${L.id}`, depth: 4, wovenBy: 'loom.mjs', kind: L.kind, name: L.name, slots: Object.fromEntries(slots(L).map(k => [k, L[k]])), gives: L.gives, weaves: 3 - (li % 2) };
  out.l4.push(l4); write('templates-loom', l4);
  /* depth 3: 2 or 3 patterns per loom, 25 in all. A pattern fixes the first slot. */
  const nPat = li % 2 === 0 ? 3 : 2;
  for (let p = 0; p < nPat; p++) { const sl = slots(L); const fixed = { [sl[0]]: pick(L[sl[0]], h32(SEED, li * 10 + p, 3)) };
    const l3 = { id: `l3-${L.id}-${p + 1}`, depth: 3, wovenBy: l4.id, kind: L.kind, name: `${L.name.replace(' loom', '')} pattern ${p + 1}: ${fixed[sl[0]]}`, fixed, open: sl.slice(1), weaves: 2 }; out.l3.push(l3); write('templates-loom', l3);
    /* depth 2: 2 moulds per pattern, 50 in all. A mould fixes the second slot too. */
    for (let m = 0; m < 2; m++) { const fx = { ...fixed }; if (sl[1]) fx[sl[1]] = pick(L[sl[1]], h32(SEED, li * 100 + p * 10 + m, 2));
      const l2 = { id: `l2-${L.id}-${p + 1}-${m + 1}`, depth: 2, wovenBy: l3.id, kind: L.kind, name: `${L.name.replace(' loom', '')} mould ${p + 1}.${m + 1}: ${Object.values(fx).join(', ')}`, fixed: fx, open: sl.slice(2) }; out.l2.push(l2); write('templates-loom', l2); }
  }
  /* depth 1: ten leaves per loom, each woven by one of its moulds, every remaining slot chosen by the seed. */
  const moulds = out.l2.filter(x => x.kind === L.kind);
  for (let i = 0; i < 10; i++) { const mould = moulds[i % moulds.length]; const leaf = { id: `${L.id}-${String(i + 1).padStart(2, '0')}`, depth: 1, wovenBy: mould.id, kind: L.kind };
    for (const k of slots(L)) leaf[k] = mould.fixed[k] != null ? mould.fixed[k] : pick(L[k], h32(SEED, li * 1000 + i, 1 + k.length));
    leaf.name = L.kind === 'field' ? `the ${leaf.lie} ${leaf.soil} field of ${leaf.size}` : L.kind === 'crop' ? `${leaf.plant}, ${leaf.season}-sown, ${leaf.days} days` : L.kind === 'tool' ? `an ${leaf.metal} ${leaf.thing}`.replace('an wood', 'a wooden').replace('an flint', 'a flint').replace('an bronze', 'a bronze') : L.kind === 'weather' ? `${leaf.sky} for ${leaf.lasts} days` : L.kind === 'season' ? `${leaf.turn}, ${leaf.length} days` : L.kind === 'beast' ? `${leaf.beast}, which ${leaf.does}` : L.kind === 'water' ? `${leaf.source} holding ${leaf.holds}` : L.kind === 'fence' ? `${leaf.wall} that keeps ${leaf.keeps}` : L.kind === 'store' ? `${leaf.roof} holding ${leaf.holds}` : `${leaf.where}, every ${leaf.every} days`;
    /* a few numbers the farm needs, drawn from the same seed so the leaf is complete */
    const r = h32(SEED, li * 7 + i, 9) % 1000 / 1000;
    if (L.kind === 'field') { leaf.cost = leaf.size * 400; leaf.yield = +((({ loam: 1.3, silt: 1.2, clay: 1, chalk: .9, peat: 1.1, sand: .7 })[leaf.soil]) * (({ 'south-facing': 1.2, terraced: 1.1, riverside: 1.15, flat: 1, high: .9, walled: 1.05 })[leaf.lie])).toFixed(2); }
    if (L.kind === 'crop') { leaf.seed = 40 + Math.round(r * 60); leaf.harvest = Math.round(leaf.days * (2 + r * 2)); }
    if (L.kind === 'tool') { leaf.cost = ({ iron: 900, bronze: 700, wood: 250, flint: 150 })[leaf.metal]; leaf.mul = +(1 + ({ iron: .5, bronze: .35, wood: .15, flint: .1 })[leaf.metal]).toFixed(2); leaf.on = ['loam', 'clay', 'chalk', 'peat', 'sand', 'silt'][Math.floor(r * 6)]; }
    if (L.kind === 'weather') { leaf.mul = +(({ rain: 1.2, drought: .5, frost: .3, wind: .9, haze: 1, 'still heat': .8, hail: .4, fog: .95 })[leaf.sky]).toFixed(2); leaf.p = +(0.002 + r * 0.003).toFixed(4); leaf.water = leaf.sky === 'rain' ? 60 : leaf.sky === 'drought' || leaf.sky === 'still heat' ? -40 : 0; }
    if (L.kind === 'season') { leaf.grows = ({ thaw: ['spring'], sowing: ['spring'], 'the long days': ['spring', 'summer'], 'first cut': ['summer'], harvest: ['summer', 'autumn'], 'the fallow': ['autumn'], frost: [], 'deep winter': [] })[leaf.turn]; leaf.mul = leaf.grows.length ? 1 + 0.2 * leaf.grows.length : 0.1; }
    if (L.kind === 'beast') { leaf.cost = 300 + Math.round(r * 500); leaf.eats = 1 + Math.round(r * 3); leaf.mul = 1.08 + Math.round(r * 12) / 100; }
    if (L.kind === 'water') leaf.cost = leaf.holds * 1.5; if (L.kind === 'fence') { leaf.cost = 200 + Math.round(r * 400); leaf.keep = +(0.85 + r * 0.14).toFixed(2); }
    if (L.kind === 'store') leaf.cost = leaf.holds; if (L.kind === 'market') { leaf.price = +(1.1 + r * 0.9).toFixed(2); leaf.cost = 500 + Math.round(r * 1500); }
    out.leaves.push(leaf); write('templates-farm', leaf); }
});
const count = d => readdirSync(d).length;
writeFileSync('templates-loom/_index.json', JSON.stringify({ seed: SEED, looms: out.l4.length, patterns: out.l3.length, moulds: out.l2.length, leaves: out.leaves.length, note: 'depth 4 weaves 3, 3 weaves 2, 2 weaves 1; a leaf names its mould, a mould its pattern, a pattern its loom' }, null, 1));
console.log(`looms ${out.l4.length} → patterns ${out.l3.length} → moulds ${out.l2.length} → leaves ${out.leaves.length}  (templates-loom ${count('templates-loom')} files, templates-farm ${count('templates-farm')} files)`);

/* the next interface, from the leaves and nothing else */
const page = readFileSync('farm.page.js', 'utf8');
const byKind = k => out.leaves.filter(l => l.kind === k);
const DEF = { fields: byKind('field'), crops: byKind('crop'), tools: byKind('tool'), weathers: byKind('weather'), seasons: byKind('season'), beasts: byKind('beast'), waters: byKind('water'), fences: byKind('fence'), stores: byKind('store'), markets: byKind('market'), chain: { looms: out.l4.length, patterns: out.l3.length, moulds: out.l2.length, leaves: out.leaves.length } };
const html = `<title>The farm &middot; woven from a hundred leaves</title>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<!--
  THE FARM — the yard's own, and the next interface after the looms.

  Built by loom.mjs from templates-farm/ (${out.leaves.length} leaves), which were woven by ${out.l2.length} moulds,
  which were woven by ${out.l3.length} patterns, which were woven by ${out.l4.length} looms in templates-loom/. Nothing on
  this page is written by hand: every field, crop, tool, weather, season, beast, water,
  fence, store and market is a leaf, and every leaf names what wove it.

  An idle farm, one day a second, paid in the same HEZE docket as the ground landing,
  Troy and the siege. Absence is credited in full. No eyes are drawn; the beasts are
  named and heard, not seen. SCRIPT: yes, and marked.
-->
<style>
  :root{--void:#0b0d12;--panel:#151922;--panel2:#1c2230;--edge:#2b3445;--ink:#efe9dc;--dim:#95a0b3;--gold:#f2c98a;--ok:#6fd4a8;--bad:#e06f5a;--sea:#3f8fbf;--green:#9ad36a}
  *{box-sizing:border-box}html,body{margin:0;background:var(--void);color:var(--ink);font:13px/1.45 ui-rounded,system-ui,-apple-system,sans-serif}
  header{padding:12px 16px 6px;display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}header h1{margin:0;font-size:19px;color:var(--gold);font-weight:600}header small{color:var(--dim)}
  #land{display:block;width:100%;height:220px;background:#0e1a12}
  main{padding:8px 12px 30px;max-width:1200px;margin:0 auto;display:grid;gap:10px}
  .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:6px}.stat{background:var(--panel);border:1px solid var(--edge);border-radius:10px;padding:7px 10px}.stat b{display:block;font-size:10.5px;color:var(--dim);font-weight:500;text-transform:uppercase;letter-spacing:.06em}.stat span{font-size:17px;font-variant-numeric:tabular-nums}.stat i{font-style:normal;color:var(--dim);font-size:11px;display:block}
  .cols{display:grid;grid-template-columns:1fr 1fr;gap:10px}@media (max-width:860px){.cols{grid-template-columns:1fr}}
  section{background:var(--panel);border:1px solid var(--edge);border-radius:12px;padding:10px}section h2{margin:0 0 6px;font-size:11.5px;color:var(--dim);text-transform:uppercase;letter-spacing:.08em;font-weight:600}section h2 i{font-style:normal;text-transform:none;letter-spacing:0;font-weight:400;margin-left:6px}
  .card{background:var(--panel2);border:1px solid var(--edge);border-radius:10px;padding:7px 9px;margin:5px 0;display:grid;grid-template-columns:1fr auto;gap:2px 8px;align-items:center}.card.done{border-color:var(--ok)}.card b{font-weight:600}.card p{margin:0;color:var(--dim);font-size:11.5px;grid-column:1}.card .n{grid-row:span 2;font-size:12px;color:var(--gold);text-align:right;white-space:nowrap}
  button{font:inherit;color:var(--ink);background:var(--panel2);border:1px solid var(--edge);border-radius:8px;padding:6px 10px;cursor:pointer}button:hover:not(:disabled){border-color:var(--gold)}button:disabled{opacity:.45;cursor:not-allowed}button.primary{background:#2a2036;border-color:var(--gold)}
  .row{display:flex;gap:6px;flex-wrap:wrap;align-items:center}.badge{display:inline-block;background:var(--panel);border:1px solid var(--edge);border-radius:999px;padding:1px 8px;font-size:11px;color:var(--dim)}.badge.hot{border-color:var(--gold);color:var(--gold)}
  .log{font-size:12px;color:var(--dim);max-height:180px;overflow:auto}.log div{border-bottom:1px solid var(--edge);padding:2px 0}.log b{color:var(--ink);font-weight:500;margin-right:6px}
  .chain{font-size:11px;color:var(--dim)}.chain code{color:var(--sea)}
  footer{padding:10px 16px 24px;color:var(--dim);font-size:12px;max-width:1200px;margin:0 auto}footer a{color:var(--sea);text-decoration:none}
</style>
<header><h1>The farm</h1><small>woven from ${out.leaves.length} leaves, by ${out.l2.length} moulds, by ${out.l3.length} patterns, by ${out.l4.length} looms · one day a second</small><span style="flex:1"></span><small id="clock"></small></header>
<canvas id="land" width="1200" height="220"></canvas>
<main>
  <div class="stats" id="stats"></div>
  <div class="cols">
    <div>
      <section><h2>Fields<i>buy ground, then sow; a field grows one crop at a time</i></h2><div id="fields"></div></section>
      <section><h2>Crops<i>sow into the picked field; each is a leaf with its own days and harvest</i></h2><div id="crops"></div></section>
    </div>
    <div>
      <section><h2>Tools, beasts, water, fences, stores, markets<i>everything else the looms wove</i></h2><div id="things"></div></section>
      <section><h2>The record</h2><div class="log" id="log"></div><div class="row" style="margin-top:6px"><button id="wipe">Clear the land</button></div></section>
      <section><h2>The chain<i>from any leaf back to its loom</i></h2><div class="chain" id="chain"></div></section>
    </div>
  </div>
</main>
<footer>Leaves in templates-farm/, looms in templates-loom/, both written by <code>loom.mjs</code> and re-woven by <code>node yard.mjs</code>. The docket is shared with <a href="descent.html">the ground landing</a>, <a href="troy.html">Troy</a> and <a href="siege.html">the siege</a>. Nothing here is money. <a href="arcade.html">← the arcade</a> · <a href="index.html">the yard</a></footer>
<script id="def-json" type="application/json">${JSON.stringify(DEF).replace(/<\//g, '<\\/')}</script>
<script>
${page}
</script>
`;
writeFileSync('farm.html', html); console.log(`wrote farm.html (${html.length} bytes)`);

#!/usr/bin/env node
/* continent.mjs — the continental farm, built from the clans' piles.

   Aphrodite Terra, the real continent of Venus, as 4,096 parcels in six
   regions named for its real features (Ovda, Thetis, Atla, Artemis, Diana,
   Ulfrun), one region per clan. Every parcel is a template woven from one
   of the clans' piles in templates-asset/, and that is where the seed comes
   from: continent.html reads the piles the war of clans saved (clans.v1),
   sowing a parcel draws from its clan's pile, and the pile is written back.

   The point is propagation. A sown parcel grows on its clan's period, and a
   grown parcel propagates into a bare neighbour of the same region each
   period, drawing one unit of the pile per new parcel. The continent greens
   outward from wherever you sow and stops exactly where the piles run dry;
   the six periods are coprime, so the six regions never advance together.
   Grown parcels yield provision on the period; provision sells to the
   docket. Terrain is from the planet: tessera holds less, plains more,
   lava flows nothing.

   The weave function is inlined so the page can re-weave the continent from
   another seed and hand back 4,096 files. Seven deep: clan → pile → parcel.
       node continent.mjs */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, rmSync } from 'node:fs';

export const WEAVE = `function weave(clans, piles, seed, N) {
  const h32 = (a, b, c) => { let x = (Math.imul(a, 73856093) ^ Math.imul(b, 19349663) ^ Math.imul(c, 83492791)) | 0; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return x >>> 0; };
  const u = (a, b, c) => (h32(a, b, c) % 10000) / 10000;
  const REGIONS = ['Ovda Regio', 'Thetis Regio', 'Atla Regio', 'Artemis Chasma', 'Diana Chasma', 'Ulfrun Regio'];
  const TERRAIN = [['plains', 1.0, 'volcanic plains, the easy ground'], ['tessera', 0.6, 'tessera, folded highland that holds less'], ['corona', 1.3, 'the rim of a corona, rich and warm'], ['lava', 0, 'a young lava flow; nothing takes'], ['chasma', 0.8, 'the floor of a chasma, sheltered']];
  const seats = clans.map((c, i) => ({ x: (0.18 + 0.64 * u(seed, i, 11)) * N, y: (0.18 + 0.64 * u(seed, i, 12)) * N }));
  const out = [], regions = clans.map((c, i) => ({ id: 'region-' + c.id, kind: 'region', name: REGIONS[i], clan: c.id, clanName: c.name, resource: c.resource, period: c.period, seat: [Math.round(seats[i].x), Math.round(seats[i].y)], parcels: 0, wovenBy: c.id }));
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let best = 0, bd = 1e9; seats.forEach((s, i) => { const d = (s.x - x) ** 2 + (s.y - y) ** 2 + 3 * u(seed, x * N + y, i) * (N / 8); if (d < bd) { bd = d; best = i; } });
    const c = clans[best]; const r = u(seed, x, y), n = (u(seed + 1, x >> 2, y >> 2) + u(seed + 2, x >> 3, y >> 3)) / 2;
    const ti = n < 0.12 ? 3 : n < 0.3 ? 1 : n > 0.8 ? 2 : r < 0.08 ? 4 : 0; const [terrain, fert, tdesc] = TERRAIN[ti];
    const cp = piles.filter(p => p.clan === c.id); const pile = cp[h32(seed, x, y) % cp.length]; regions[best].parcels++;
    out.push({ id: 'parcel-' + x + '-' + y, kind: 'parcel', x, y, region: regions[best].name, clan: c.id, resource: c.resource, period: c.period, terrain, fertility: fert, yield: +(fert * (0.6 + 0.8 * u(seed + 3, x, y)) * 2).toFixed(2), text: tdesc + ', in ' + regions[best].name + ', sown from ' + pile.name + '.', wovenBy: pile.id, chain: 'seven deep' });
  }
  return { regions, parcels: out };
}`;
const clans = readdirSync('templates-clan').filter(f => f.endsWith('.json')).map(f => JSON.parse(readFileSync('templates-clan/' + f, 'utf8'))).sort((a, b) => a.period - b.period);
const piles = readdirSync('templates-asset').filter(f => f.endsWith('.json') && !f.startsWith('saga')).map(f => JSON.parse(readFileSync('templates-asset/' + f, 'utf8'))).filter(a => a.kind === 'pile').map(p => ({ id: p.id, clan: p.clan, name: p.name, holds: p.holds }));
const weave = new Function(WEAVE + '; return weave;')();
const SEED = 4096, N = 64; const { regions, parcels } = weave(clans, piles, SEED, N);
rmSync('templates-continent', { recursive: true, force: true }); mkdirSync('templates-continent');
for (const r of regions) writeFileSync(`templates-continent/${r.id}.json`, JSON.stringify(r, null, 1));
for (const p of parcels) writeFileSync(`templates-continent/${p.id}.json`, JSON.stringify(p, null, 1));
const total = readdirSync('.').filter(d => d.startsWith('templates-')).reduce((n, d) => n + readdirSync(d).filter(f => f.endsWith('.json')).length, 0);
const byT = {}; for (const p of parcels) byT[p.terrain] = (byT[p.terrain] || 0) + 1;
console.log(`Aphrodite Terra: ${parcels.length} parcels in ${regions.length} regions (${Object.entries(byT).map(([k, v]) => k + ' ' + v).join(', ')}) from ${piles.length} piles · templates on disk: ${total}`);
const DEF = { clans: clans.map(c => ({ id: c.id, name: c.name, house: c.house, resource: c.resource, period: c.period })), piles, seed: SEED, N, total, hues: { hrafn: '#5aa8f0', bjorn: '#5ec8a0', ulf: '#f0a83c', sigrid: '#8fd35a', thorvald: '#d08ae0', ingrid: '#e8d9a0' } };
const page = readFileSync('continent.page.js', 'utf8');
const html = `<title>Aphrodite Terra &middot; the continental farm</title>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<!--
  APHRODITE TERRA — the continental farm, built from the clans' piles. 4,096 parcels
  in six regions, one per clan, each parcel a template woven from one of the clans'
  piles. The page reads the piles the war of clans saved; sowing draws from them and
  writes them back. A sown parcel grows on its clan's period and then propagates into
  bare neighbours, one unit of the pile per parcel, so the continent greens outward and
  stops where the piles run dry. Provision sells to the shared docket. Seven deep:
  clan, pile, parcel. ${total} templates on disk at build. No faces. SCRIPT: yes, and marked.
-->
<style>
  :root{--void:#0b0d12;--panel:#151922;--panel2:#1c2230;--edge:#2b3445;--ink:#efe9dc;--dim:#95a0b3;--gold:#f2c98a;--ok:#6fd4a8;--bad:#e06f5a;--sea:#3f8fbf;--serif:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif}
  *{box-sizing:border-box}html,body{margin:0;background:var(--void);color:var(--ink);font:13.5px/1.5 ui-rounded,system-ui,-apple-system,sans-serif}
  header{padding:20px 24px 8px;max-width:1200px;margin:0 auto;display:flex;align-items:baseline;gap:14px;flex-wrap:wrap}header h1{margin:0;font:500 30px/1.1 var(--serif);color:var(--gold)}header small{color:var(--dim)}header .sp{flex:1}
  main{padding:8px 24px 40px;max-width:1200px;margin:0 auto;display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:12px}@media (max-width:900px){main{grid-template-columns:1fr}}
  .map{background:var(--panel);border:1px solid var(--edge);border-radius:14px;padding:12px}.map canvas{display:block;width:100%;aspect-ratio:1;image-rendering:pixelated;border-radius:8px;background:#000;cursor:crosshair}
  .legend{display:flex;gap:10px;flex-wrap:wrap;margin:8px 0 0;font-size:11.5px;color:var(--dim)}.legend i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:4px;vertical-align:-1px}
  section{background:var(--panel);border:1px solid var(--edge);border-radius:14px;padding:12px;margin-bottom:12px}section h2{margin:0 0 8px;font:500 17px/1.2 var(--serif)}section h2 i{font:400 11.5px/1.4 ui-rounded,system-ui,sans-serif;color:var(--dim);display:block;margin-top:2px}
  .stat{display:flex;justify-content:space-between;border-top:1px solid var(--edge);padding:5px 0;font-size:12.5px;gap:8px}.stat span{color:var(--dim)}.stat b{font-weight:500;font-variant-numeric:tabular-nums;text-align:right}
  .region{border-top:1px solid var(--edge);padding:6px 0;font-size:12px}.region b{font-weight:500}.region small{color:var(--dim);display:block}.bar{height:4px;background:#0e1118;border-radius:2px;margin-top:4px;overflow:hidden}.bar div{height:100%}
  button{font:inherit;color:var(--ink);background:var(--panel2);border:1px solid var(--edge);border-radius:9px;padding:5px 11px;cursor:pointer}button:hover:not(:disabled){border-color:var(--gold)}button:disabled{opacity:.4;cursor:not-allowed}button.primary{background:#2a2036;border-color:#f0a83c}
  .row{display:flex;gap:6px;flex-wrap:wrap;align-items:center}input[type=number]{font:inherit;color:var(--ink);background:var(--panel2);border:1px solid var(--edge);border-radius:9px;padding:5px 8px;width:90px}
  .log{font-size:12px;color:var(--dim);max-height:180px;overflow:auto}.log div{border-bottom:1px solid var(--edge);padding:3px 0}.warn{color:var(--gold);font-size:12px;margin:0 0 8px}
  footer{padding:10px 24px 28px;color:var(--dim);font-size:12px;max-width:1200px;margin:0 auto}footer a{color:var(--sea);text-decoration:none}
</style>
<header><h1>Aphrodite Terra</h1><small>the continental farm · 4,096 parcels, six regions, one per clan · sown from the clans' piles · one day a second</small><span class="sp"></span><small id="clock"></small></header>
<main>
  <div class="map"><canvas id="map" width="64" height="64"></canvas><div class="legend" id="legend"></div><p style="color:var(--dim);font-size:12px;margin:8px 0 0">Click a parcel to sow it from its clan's pile. Grown parcels propagate into bare neighbours of their region on the clan's period, one unit of the pile per parcel. Lava takes nothing.</p></div>
  <div>
    <section><h2>The continent</h2><div id="stats"></div></section>
    <section><h2>The piles<i>read from the war of clans; sowing draws them down and writes them back</i></h2><p class="warn" id="warn" hidden>No piles saved. Gather and pile in <a href="clans.html" style="color:var(--gold)">the war of clans</a> first; the continent is sown from them.</p><div id="piles"></div></section>
    <section><h2>Regions</h2><div id="regions"></div></section>
    <section><h2>Parcel</h2><div id="pick"><p style="color:var(--dim);margin:0">Nothing picked.</p></div></section>
    <section><h2>Re-weave<i>the loom is in this page: another seed, another continent, handed back as 4,102 files</i></h2><div class="row"><input id="seed" type="number" value="${SEED}"><button class="primary" id="reweave">Weave</button><button id="download">Download the templates</button><button id="wipe">Bare the continent</button></div></section>
    <section><h2>The record</h2><div class="log" id="log"></div></section>
  </div>
</main>
<footer>Sown from <a href="clans.html">the war of clans</a>; the regions are real features of Venus; the docket is shared with <a href="descent.html">the ground landing</a>. ${total} templates on disk at build. <a href="arcade.html">← the arcade</a> · <a href="index.html">the yard</a></footer>
<script id="def-json" type="application/json">${JSON.stringify(DEF).replace(/<\//g, '<\\/')}</script>
<script>
${WEAVE}
${page}
</script>
`;
writeFileSync('continent.html', html); console.log(`wrote continent.html (${html.length} bytes)`);

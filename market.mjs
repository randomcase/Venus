#!/usr/bin/env node
/* market.mjs — a stock market of syndicated tickers.

   Take the four stock-standard farms on Venus (the fixing bed, the bed, the
   kiln, the cracking house: nitrogen, biomass, silicate, hydrogen) and
   syndicate each one: split it into four tranches, then each tranche into
   four, and so on to the ninth degree. Degree d has 4^d tickers per farm;
   the ninth has 262,144 per farm and 1,048,576 in all.

   The question was which degree brings visual complexity. The answer, drawn:
   the board is a quadtree, so every degree doubles the grid on each side.
   To the third degree (64 a farm) every ticker still carries a name. At the
   fourth (256) the names go and the cells stay. At the FIFTH (1,024 a farm,
   4,096 on the board) no cell is a thing any more and the board becomes a
   texture: that is where complexity becomes visual, because the eye stops
   reading tickers and starts reading weather. The seventh is grain. At the
   ninth, on a 1024-pixel board, every ticker is exactly one pixel.

   Templates on disk are the farms and their first degree (20 files); the
   syndicate function is inlined into market.html and weaves any degree in
   the page, handing back the files to the fourth degree (340) as a bundle.
       node market.mjs */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, rmSync } from 'node:fs';

export const SYNDICATE = `function syndicate(farms, degree, seed) {
  const h32 = (a, b, c) => { let x = (Math.imul(a, 73856093) ^ Math.imul(b, 19349663) ^ Math.imul(c, 83492791)) | 0; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return x >>> 0; };
  const out = [];
  const walk = (f, fi, path, price, d) => { const id = f.ticker + (path.length ? '.' + path.join('') : ''); const key = path.reduce((a, c) => a * 4 + c + 1, fi + 1);
    const w = d === 0 ? 1 : 0.7 + 0.6 * (h32(seed, key, d) % 1000) / 1000;
    const t = { id, kind: d === 0 ? 'farm' : 'tranche', farm: f.ticker, farmName: f.name, resource: f.resource, period: f.period, degree: d, path: path.join(''), weight: +w.toFixed(3), price: +(price * w / (d ? 4 : 1)).toFixed(2), volatility: +(0.04 * (1 + d * 0.35)).toFixed(3), text: d === 0 ? f.name + ', the whole farm: ' + f.resource + ' every ' + f.period + ' days.' : 'Tranche ' + path.join('.') + ' of ' + f.name + ', the ' + ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth'][d - 1] + ' degree: a quarter of the one above, weighted ' + w.toFixed(2) + '.', wovenBy: d === 0 ? f.wovenBy : (path.length > 1 ? f.ticker + '.' + path.slice(0, -1).join('') : f.ticker) };
    out.push(t); if (d < degree) for (let c = 0; c < 4; c++) walk(f, fi, [...path, c], t.price, d + 1); };
  farms.forEach((f, fi) => walk(f, fi, [], f.price, 0)); return out;
}`;
const clans = Object.fromEntries(readdirSync('templates-clan').filter(f => f.endsWith('.json')).map(f => { const c = JSON.parse(readFileSync('templates-clan/' + f, 'utf8')); return [c.resource, c]; }));
const FARMS = [['FIX', 'nitrogen', '#5ec8a0'], ['BED', 'biomass', '#8fd35a'], ['KLN', 'silicate', '#f0a83c'], ['CRK', 'hydrogen', '#5aa8f0']].map(([ticker, resource, hue]) => { const c = clans[resource]; return { ticker, name: c.house + ' of ' + c.name, resource, period: c.period, hue, yield: c.tiers[0].yield, price: c.tiers[0].yield * 40 * { nitrogen: 3, biomass: 2, silicate: 4, hydrogen: 9 }[resource], wovenBy: c.id }; });
const syndicate = new Function(SYNDICATE + '; return syndicate;')();
const SEED = 1597; const files = syndicate(FARMS, 1, SEED);
rmSync('templates-ticker', { recursive: true, force: true }); mkdirSync('templates-ticker');
for (const t of files) writeFileSync(`templates-ticker/${t.id}.json`, JSON.stringify(t, null, 1));
const total = readdirSync('.').filter(d => d.startsWith('templates-')).reduce((n, d) => n + readdirSync(d).filter(f => f.endsWith('.json')).length, 0);
console.log(`tickers on disk ${files.length} (4 farms, first degree) · ninth degree in the page: ${4 * 4 ** 9} · templates on disk: ${total}`);
const DEF = { farms: FARMS, seed: SEED, total, degrees: 9 };
const page = readFileSync('market.page.js', 'utf8');
const html = `<title>The market &middot; syndicated tickers</title>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<!--
  THE MARKET — four stock-standard farms on Venus, syndicated to the ninth degree.
  Degree d is 4^d tickers a farm; the ninth is 1,048,576 tickers and, on a
  1024-pixel board, one pixel each. The board is a quadtree drawn as pixels, so
  the slider shows where visual complexity begins: the fifth degree, where the
  cells stop being things and the board becomes weather. Tickers move on a smooth
  hash of their path and the day, deeper tranches wider. Buy and sell against the
  shared HEZE docket; the farms pay dividends on their coprime periods. The
  syndicate function is in this page; re-weave and download to the fourth degree.
  ${total} templates on disk at build. No faces. SCRIPT: yes, and marked.
-->
<style>
  :root{--void:#0b0d12;--panel:#151922;--panel2:#1c2230;--edge:#2b3445;--ink:#efe9dc;--dim:#95a0b3;--gold:#f2c98a;--ok:#6fd4a8;--bad:#e06f5a;--sea:#3f8fbf;--serif:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif}
  *{box-sizing:border-box}html,body{margin:0;background:var(--void);color:var(--ink);font:13.5px/1.5 ui-rounded,system-ui,-apple-system,sans-serif}
  header{padding:20px 24px 6px;max-width:1200px;margin:0 auto;display:flex;align-items:baseline;gap:14px;flex-wrap:wrap}header h1{margin:0;font:500 30px/1.1 var(--serif);color:var(--gold)}header small{color:var(--dim)}header .sp{flex:1}
  .tape{max-width:1200px;margin:0 auto;padding:4px 24px;overflow:hidden;white-space:nowrap;color:var(--dim);font-size:12px;font-variant-numeric:tabular-nums}.tape span{display:inline-block;margin-right:28px}.tape b{color:var(--ink);font-weight:500}.up{color:var(--ok)}.dn{color:var(--bad)}
  main{padding:8px 24px 40px;max-width:1200px;margin:0 auto;display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:12px}@media (max-width:900px){main{grid-template-columns:1fr}}
  .board{background:var(--panel);border:1px solid var(--edge);border-radius:14px;padding:12px}.board canvas{display:block;width:100%;aspect-ratio:1;image-rendering:pixelated;border-radius:8px;background:#000;cursor:crosshair}
  .deg{display:flex;align-items:center;gap:10px;margin:0 0 10px;flex-wrap:wrap}.deg input[type=range]{flex:1;min-width:160px}.deg b{font:500 22px/1 var(--serif);color:var(--gold);min-width:2ch}.deg small{color:var(--dim)}
  .regime{margin:10px 0 0;padding:8px 10px;background:var(--panel2);border:1px solid var(--edge);border-radius:10px;font-size:12.5px}.regime b{color:var(--gold);font-weight:500}
  section{background:var(--panel);border:1px solid var(--edge);border-radius:14px;padding:12px;margin-bottom:12px}section h2{margin:0 0 8px;font:500 17px/1.2 var(--serif)}section h2 i{font:400 11.5px/1.4 ui-rounded,system-ui,sans-serif;color:var(--dim);display:block;margin-top:2px}
  .stat{display:flex;justify-content:space-between;border-top:1px solid var(--edge);padding:5px 0;font-size:12.5px}.stat span{color:var(--dim)}.stat b{font-weight:500;font-variant-numeric:tabular-nums}
  button{font:inherit;color:var(--ink);background:var(--panel2);border:1px solid var(--edge);border-radius:9px;padding:5px 11px;cursor:pointer}button:hover:not(:disabled){border-color:var(--gold)}button:disabled{opacity:.4;cursor:not-allowed}button.primary{background:#2a2036;border-color:#f0a83c}
  .row{display:flex;gap:6px;flex-wrap:wrap;align-items:center}input[type=number]{font:inherit;color:var(--ink);background:var(--panel2);border:1px solid var(--edge);border-radius:9px;padding:5px 8px;width:90px}
  .hold{display:grid;grid-template-columns:1fr auto auto;gap:2px 8px;align-items:center;border-top:1px solid var(--edge);padding:5px 0;font-size:12px}.hold b{font-weight:500}.hold small{color:var(--dim);grid-column:1}.hold .v{font-variant-numeric:tabular-nums;text-align:right}
  .log{font-size:12px;color:var(--dim);max-height:160px;overflow:auto}.log div{border-bottom:1px solid var(--edge);padding:3px 0}
  footer{padding:10px 24px 28px;color:var(--dim);font-size:12px;max-width:1200px;margin:0 auto}footer a{color:var(--sea);text-decoration:none}
</style>
<header><h1>The market</h1><small>four stock-standard farms, syndicated to the ninth degree · one day a second</small><span class="sp"></span><small id="clock"></small></header>
<div class="tape" id="tape"></div>
<main>
  <div class="board">
    <div class="deg"><span>degree</span><input id="degree" type="range" min="0" max="9" value="3"><b id="degN">3</b><small id="degCount"></small></div>
    <canvas id="board" width="1024" height="1024"></canvas>
    <div class="regime" id="regime"></div>
  </div>
  <div>
    <section><h2>The docket</h2><div id="docket"></div></section>
    <section><h2>Ticker<i>click the board; the cell under the pointer at this degree</i></h2><div id="pick"></div></section>
    <section><h2>Holdings<i>a portfolio of individual tranches, dividends on the farm's period</i></h2><div id="holdings"></div></section>
    <section><h2>Re-syndicate<i>the loom is in this page</i></h2><div class="row"><input id="seed" type="number" value="${SEED}"><button class="primary" id="reweave">Weave</button><button id="download">Download to the 4th degree</button></div><p style="color:var(--dim);font-size:12px;margin:8px 0 0">340 files in one JSON bundle, each a template for templates-ticker/. Above the fourth degree the tickers are computed, not stored: nobody keeps a million files for a board that can draw them.</p></section>
    <section><h2>The record</h2><div class="log" id="log"></div></section>
  </div>
</main>
<footer>The farms are four of the six clans in <a href="clans.html">the war of clans</a>; prices settle to the shared docket from <a href="descent.html">the ground landing</a>. ${total} templates on disk at build. <a href="arcade.html">← the arcade</a> · <a href="index.html">the yard</a></footer>
<script id="def-json" type="application/json">${JSON.stringify(DEF).replace(/<\//g, '<\\/')}</script>
<script>
${SYNDICATE}
${page}
</script>
`;
writeFileSync('market.html', html); console.log(`wrote market.html (${html.length} bytes)`);

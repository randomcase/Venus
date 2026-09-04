#!/usr/bin/env node
/* terminal.mjs — the text layer: the whole ship, played by typing.

   Everything the decks do with buttons can be done here in words, against the
   same saved state, so this is not a companion to the ship but another way in
   to it. Type `sow 31 44` and a parcel of Aphrodite Terra is really sown and
   the pile it drew from is really lighter; open the continent afterwards and
   it is there.

   TWO RULES MAKE THAT SAFE. Every command reads the deck's state fresh from
   the browser at the moment it runs and writes it back immediately, holding
   nothing between commands, so a deck open in another tab is never clobbered
   by something this page remembered. And every command that changes anything
   says what it changed, with the number, so the transcript is an account of
   the ship and not a story about it.

   `look` says where the work is stuck and what to do about it. `define` reads
   the glossary. `chronicle` reads the idle text layer. `help` lists the rest.
       node terminal.mjs */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { FIREFLIES } from './toonami.mjs';
import { rulesFor, RULES } from './rules.mjs';

const J = d => readdirSync(d).filter(f => f.endsWith('.json') && !f.startsWith('_')).map(f => JSON.parse(readFileSync(`${d}/${f}`, 'utf8')));
const clans = J('templates-clan').sort((a, b) => a.period - b.period);
const assets = J('templates-asset').filter(a => !a.id.startsWith('saga'));
/* the continent, compactly: one clan index and one fertility code per parcel, so 4,096
   parcels ride in two short strings instead of a megabyte of JSON */
const parcels = J('templates-continent').filter(p => p.kind === 'parcel');
const N = 64, idx = new Array(N * N).fill(0), fert = new Array(N * N).fill(0);
const cid = Object.fromEntries(clans.map((c, i) => [c.id, i]));
const FERT = ['0', '0.6', '0.8', '1', '1.3'];
for (const p of parcels) { idx[p.y * N + p.x] = cid[p.clan]; fert[p.y * N + p.x] = Math.max(0, FERT.indexOf(String(p.fertility))); }
const REGIONS = Object.fromEntries(J('templates-continent').filter(p => p.kind === 'region').map(r => [r.clan, r.name]));
/* the glossary, gathered the same way glossary.mjs gathers it, but only what a definition needs */
const terms = [];
for (const r of J('templates-rules')) for (const [k, v] of Object.entries(r.rules || {})) terms.push({ w: k, d: ((r.notes || {})[k] ? (r.notes[k] + '. ') : '') + `In the ${r.deck}'s rulebook, set to ${typeof v === 'object' ? Object.entries(v).map(([a, b]) => `${a} ${b}`).join(', ') : v}.` });
const docket = existsSync('templates-rules/docket.json') ? JSON.parse(readFileSync('templates-rules/docket.json', 'utf8')) : { rules: {} };
for (const [k, v] of Object.entries(docket.rules)) if (typeof v === 'string') terms.push({ w: k, d: v.charAt(0).toUpperCase() + v.slice(1) + ' (the docket, and it does not change).' });
for (const c of clans) terms.push({ w: c.name, d: `A clan of Venus keeping ${c.house.toLowerCase()}, yielding ${c.resource} every ${c.period} days.` });
for (const g of J('templates-corn')) terms.push({ w: g.name, d: `${g.text} Takes ${g.takes}, gives ${g.gives}.` });
for (const s of J('templates-spell')) terms.push({ w: s.name, d: `${s.glyph} ${s.does || ''} Costs ${s.cost}, cools in ${s.cooldown} days.` });
[['witch', 'Keeps a door. One each, local; if she will not sign, that door does not move.'],
 ['wizard', 'Keeps the book. Replays the chain and says whether a balance is the sum of its events.'],
 ['warlock', 'Carries between. The word is oath-breaker, and that is the office a six-month crossing needs.'],
 ['syndicate', 'Three custodians and one tranche of a million, holding a span of doors. Two of three sign.'],
 ['door', 'One of two hundred places a unit can be issued. Door 1 and door 200 issue the same unit.'],
 ['HEZE', 'The unit of account inside these files. Never a token, never for sale, never in a wallet. Capped at 21,000,000, which is a budget of chances rather than a scarcity.'],
 ['the Hesperus', 'This ship. The size of Missouri: three quarters corn, which is everyone’s, and one quarter living space.']].forEach(([w, d]) => terms.push({ w, d }));

const total = readdirSync('.').filter(d => d.startsWith('templates-')).reduce((n, d) => n + readdirSync(d).filter(f => f.endsWith('.json')).length, 0);
console.log(`the terminal: ${terms.length} definitions, ${assets.length} assets, ${parcels.length} parcels compacted, ${clans.length} clans · templates on disk: ${total}`);

const DEF = { clans: clans.map(c => ({ id: c.id, name: c.name, house: c.house, resource: c.resource, period: c.period })), assets: assets.map(a => ({ id: a.id, name: a.name, kind: a.kind, clan: a.clan, cost: a.cost, yield: a.yield || 0, holds: a.holds || 0, strength: a.strength || 0, raids: !!a.raids, upkeep: a.upkeep || 0, resource: a.resource })), idx: idx.join(''), fert: fert.join(''), N, regions: REGIONS, terms, rules: { clans: rulesFor('clans'), continent: rulesFor('continent'), coven: rulesFor('coven'), town: rulesFor('town'), village: rulesFor('village') }, total };
const page = readFileSync('terminal.page.js', 'utf8');
const html = `<title>The terminal &middot; the ship, typed</title>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<!--
  THE TERMINAL — the text layer. Everything the decks do with buttons can be done here in
  words, against the same saved state: sow a parcel and it is really sown, sign a door and
  it is really signed. Every command reads its deck fresh and writes it back at once, so a
  deck open in another tab is never clobbered; and every command that changes something says
  what it changed, with the number. ${terms.length} definitions, ${assets.length} assets, ${parcels.length} parcels.
  ${total} templates on disk at build. Nothing with a face. SCRIPT: yes, and marked.
-->
<style>
  :root{--void:#0b0d12;--panel:#151922;--panel2:#1c2230;--edge:#2b3445;--ink:#efe9dc;--dim:#95a0b3;--gold:#f2c98a;--ok:#6fd4a8;--bad:#e06f5a;--sea:#3f8fbf;--mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace}
  *{box-sizing:border-box}html,body{margin:0;background:var(--void);color:var(--ink);font:13.5px/1.6 var(--mono)}
  header{padding:18px 24px 6px;max-width:1080px;margin:0 auto;display:flex;align-items:baseline;gap:12px;flex-wrap:wrap}
  header h1{margin:0;font:600 22px/1.1 var(--mono);color:var(--gold);letter-spacing:.06em}header small{color:var(--dim)}header .sp{flex:1}
  main{padding:6px 24px 30px;max-width:1080px;margin:0 auto}
  #out{background:#080a10;border:1px solid var(--edge);border-radius:12px;padding:14px 16px;height:62vh;overflow:auto;white-space:pre-wrap;word-break:break-word;box-shadow:inset 0 0 40px rgba(63,143,191,.06)}
  #out .you{color:var(--gold)}#out .ok{color:var(--ok)}#out .bad{color:var(--bad)}#out .dim{color:var(--dim)}#out .sea{color:var(--sea)}
  #out div{margin:0 0 2px}
  .bar{display:flex;gap:8px;align-items:center;margin-top:10px}
  .bar span{color:var(--gold)}
  #in{flex:1;font:inherit;color:var(--ink);background:var(--panel2);border:1px solid var(--edge);border-radius:9px;padding:9px 12px;outline:none}
  #in:focus{border-color:var(--sea)}
  .hint{color:var(--dim);font-size:12px;margin-top:8px}.hint code{color:var(--sea)}
  footer{padding:10px 24px 28px;color:var(--dim);font-size:12px;max-width:1080px;margin:0 auto}footer a{color:var(--sea);text-decoration:none}
</style>
<header><h1>the terminal</h1><small>the ship, typed &middot; every command acts on the decks' own state</small><span class="sp"></span><small id="where"></small></header>
<main>
  <div id="out"></div>
  <div class="bar"><span>&gt;</span><input id="in" autocomplete="off" spellcheck="false" placeholder="type help"></div>
  <p class="hint">Try <code>look</code>, <code>piles</code>, <code>take</code>, <code>sow 31 44</code>, <code>doors</code>, <code>sign</code>, <code>carry</code>, <code>define heze</code>, <code>chronicle</code>. Up and down step through what you have typed.</p>
</main>
<footer>The same state the decks save: open <a href="clans.html">the clans</a>, <a href="continent.html">the continent</a>, <a href="coven.html">the coven</a> or <a href="index.html">the bridge</a> and what you typed here is already there. ${total} templates on disk at build.</footer>
<script id="def-json" type="application/json">${JSON.stringify(DEF).replace(/<\//g, '<\\/')}</script>
${FIREFLIES}
<script>
${page}
</script>
`;
writeFileSync('terminal.html', html); console.log(`wrote terminal.html (${html.length} bytes)`);

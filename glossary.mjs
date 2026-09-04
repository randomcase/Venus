#!/usr/bin/env node
/* glossary.mjs — the ship's own words, and the text that writes itself.

   TWO LAYERS ON ONE DECK.

   THE CHRONICLE is the idle text layer. It watches what every deck saved in
   this browser and writes a line whenever something actually changed: a pile
   filled, a parcel grew, a tranche was carried, a charter taken. It writes
   while you are away and it keeps what it wrote, so the ship accumulates a
   history nobody typed. It never invents: every line names the quantity that
   moved and by how much, and when nothing moved it says nothing rather than
   filling the silence.

   THE GLOSSARY is every word the ship uses, gathered from the templates
   themselves at build: the rulebooks and their notes, the coins, the clans,
   the corn guilds, the market's regimes, the instruments, the verse forms,
   the fabrics, the spells, the three offices, the themes, the enums the
   digest speaks in. It is constantly updating in both senses: regenerated
   from disk whenever the yard is built, so a new template is a new entry
   without anybody writing one; and live in the page, where a term with a
   current value shows it from the decks' own state.
       node glossary.mjs */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { FIREFLIES } from './toonami.mjs';

const J = d => existsSync(d) ? readdirSync(d).filter(f => f.endsWith('.json') && !f.startsWith('_')).map(f => JSON.parse(readFileSync(`${d}/${f}`, 'utf8'))) : [];
const one = f => existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : null;
const T = [];
const term = (word, sense, source, from, live) => T.push({ word, sense, source, from, live: live || null });

/* the rulebooks: every rule is a word, and its note is the definition */
for (const r of J('templates-rules')) for (const [k, v] of Object.entries(r.rules || {})) {
  const note = (r.notes || {})[k];
  term(k, note ? `${note}. Currently ${typeof v === 'object' ? Object.entries(v).map(([a, b]) => `${a} ${b}`).join(', ') : v}.` : `A rule of the ${r.deck}, set to ${typeof v === 'object' ? JSON.stringify(v) : v}.`, `the ${r.deck}'s rulebook`, r.path);
}
/* the docket's terms, which are the ones that do not move */
const docket = one('templates-rules/docket.json');
if (docket) for (const [k, v] of Object.entries(docket.rules)) if (typeof v === 'string') term(k, v.charAt(0).toUpperCase() + v.slice(1) + '.', 'the docket, from door 1 to door 200', 'templates-rules/docket.json');
/* the things the ship is made of */
for (const c of J('templates-coin')) term(c.name || c.id, `${c.what || c.text || c.why || 'A unit the yard reasons in.'}`, 'the coins', 'templates-coin');
for (const c of J('templates-clan')) term(c.name, `A clan of Venus, keeping ${c.house.toLowerCase()}, yielding ${c.resource} every ${c.period} days.`, 'the clans', 'templates-clan');
for (const g of J('templates-corn')) term(g.name, `${g.text} Takes ${g.takes}, gives ${g.gives}.`, 'the corn guilds', 'templates-corn');
for (const r of J('templates-regime')) term(`degree ${r.degree}`, `${r.name} ${r.text}`, 'the market', 'templates-regime');
for (const i of J('templates-instrument')) term(i.quantity, `${i.value} ${i.unit}${i.uncertainty ? ` give or take ${i.uncertainty}` : ''}. ${i.method || ''}`.trim(), 'the instruments', 'templates-instrument');
for (const f of J('templates-form')) term(f.name, (f.note || '').split('.')[0] + '.', 'the verse forms', 'templates-form');
for (const f of J('templates-fabric')) term(f.name, `${f.family} ${f.kind}; survives Venus ${f.survives}. ${f.why || ''}`.trim(), 'the fabrics', 'templates-fabric');
for (const s of J('templates-spell')) term(s.name, `${s.glyph} ${s.does || s.text || ''} Costs ${s.cost}, cools in ${s.cooldown} days.`, 'the spells', 'templates-spell');
for (const t of J('templates-theme')) term(t.name, `${t.text}`, 'the themes', 'templates-theme');
/* the three offices, said once and properly */
term('witch', 'Keeps a door. One door each, local, works with what is at hand, and signs at her own door and no other. If she will not sign, that door does not move.', 'the coven', 'templates-coven');
term('wizard', 'Keeps the book. Replays the chain from nothing and says whether a balance is what the events add up to. Wise, from the same root as wisdom.', 'the coven', 'templates-coven');
term('warlock', 'Carries between. The word is oath-breaker, one who works outside the coven, which is exactly the office syndication needs: somebody who crosses from one world’s chain to another’s and is trusted anyway.', 'the coven', 'templates-coven');
term('syndicate', 'Three custodians and one tranche of a million, holding a span of doors. Two of the three sign or nothing moves.', 'the coven', 'templates-coven');
term('door', 'One of two hundred places a unit can be issued. A unit issued at door 1 and a unit issued at door 200 are the same unit.', 'the coven', 'templates-coven');
term('syndication', 'The six-month crossing. What was signed is carried to the other world’s chain, and a checkpoint is committed over it, hashed and chained to the one before.', 'the coven', 'templates-coven');
/* the words the digest speaks in */
const enums = one('digest-enums.json') || {};
for (const [field, list] of Object.entries(enums)) if (Array.isArray(list)) term(field, `An enum the digest speaks in: ${list.join(', ')}.`, 'the digest', 'digest-enums.json');
/* the decks themselves */
const DECKS = [['the bridge', 'index.html', 'The front page, and the bridge of the Hesperus: the viewscreen, the stations, the ship’s plan, the launch.'],
  ['the clans', 'clans.html', 'The base layer. Six clans on coprime periods, and a jarl’s portfolio of works, bands and piles.'],
  ['Aphrodite Terra', 'continent.html', 'The continental farm. 4,096 parcels sown from the clans’ piles, propagating on the periods.'],
  ['the market', 'market.html', 'Four farms syndicated to the ninth degree, a quadtree drawn as pixels.'],
  ['the village', 'village.html', 'Where the continent’s provision arrives as grain and the trades mill it.'],
  ['the town', 'town.html', 'Where the village’s grain feeds citizens, and where the rent is paid back down to the clans.'],
  ['the coven', 'coven.html', 'Who holds the doors: 21 syndicates, 63 practitioners, and the six-month carry.'],
  ['the quarter', 'quarter.html', 'The living quarter, furnished, with the console and the editor in the workshop.'],
  ['the shelf', 'dispatch.html', 'The sealed dispatches, each opened by the words it was sealed with.'],
  ['the ledger', 'ledger/explorer.html', 'The two-hundred-year bank: a hash-chained JSONL ledger, replayed and verified in the browser.']];
for (const [w, f, s] of DECKS) term(w, s, 'a deck', f);

T.sort((a, b) => a.word.toLowerCase().localeCompare(b.word.toLowerCase()));
const total = readdirSync('.').filter(d => d.startsWith('templates-')).reduce((n, d) => n + readdirSync(d).filter(f => f.endsWith('.json')).length, 0);
console.log(`the glossary: ${T.length} terms from ${new Set(T.map(t => t.source)).size} sources · templates on disk: ${total}`);

const DEF = { terms: T, total, sources: [...new Set(T.map(t => t.source))].sort() };
const page = readFileSync('glossary.page.js', 'utf8');
const html = `<title>The glossary &middot; and the chronicle that writes itself</title>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<!--
  THE GLOSSARY AND THE CHRONICLE. The chronicle is the idle text layer: it watches what every
  deck saved in this browser and writes a line whenever a quantity actually moved, keeps what
  it wrote, and goes on writing while you are away. It never invents; when nothing moved it
  says nothing. The glossary is ${T.length} terms gathered from the templates themselves at build,
  so a new template is a new entry without anybody writing one, and a term with a current value
  shows it live from the decks. ${total} templates on disk at build. Nothing with a face.
  SCRIPT: yes, and marked.
-->
<style>
  :root{--void:#0b0d12;--panel:#151922;--panel2:#1c2230;--edge:#2b3445;--ink:#efe9dc;--dim:#95a0b3;--gold:#f2c98a;--ok:#6fd4a8;--sea:#3f8fbf;--serif:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif}
  *{box-sizing:border-box}html,body{margin:0;background:var(--void);color:var(--ink);font:13.5px/1.5 ui-rounded,system-ui,-apple-system,sans-serif}
  header{padding:20px 24px 8px;max-width:1180px;margin:0 auto;display:flex;align-items:baseline;gap:14px;flex-wrap:wrap}header h1{margin:0;font:500 30px/1.1 var(--serif);color:var(--gold)}header small{color:var(--dim)}header .sp{flex:1}
  main{padding:8px 24px 40px;max-width:1180px;margin:0 auto;display:grid;grid-template-columns:minmax(0,1fr) 400px;gap:12px}@media (max-width:980px){main{grid-template-columns:1fr}}
  section{background:var(--panel);border:1px solid var(--edge);border-radius:14px;padding:12px;margin-bottom:12px}section h2{margin:0 0 8px;font:500 17px/1.2 var(--serif)}section h2 i{font:400 11.5px/1.4 ui-rounded,system-ui,sans-serif;color:var(--dim);display:block;margin-top:2px}
  .entry{border-top:1px solid var(--edge);padding:7px 0}.entry b{font-weight:600}.entry p{margin:2px 0 0;color:var(--dim);font-size:12px}
  .entry .src{color:var(--sea);font-size:11px}.entry .now{color:var(--gold);font-size:12px}
  .chron{font:13px/1.75 var(--serif);max-height:56vh;overflow:auto;padding-right:6px}
  .chron p{margin:0 0 8px;color:var(--ink)}.chron p small{color:var(--dim);font:400 11px/1 ui-rounded,system-ui,sans-serif;display:block;margin-bottom:1px}
  .chron p.q{color:var(--dim);font-style:italic}
  input[type=search],input[type=text]{font:inherit;color:var(--ink);background:var(--panel2);border:1px solid var(--edge);border-radius:9px;padding:6px 10px;width:100%}
  button{font:inherit;color:var(--ink);background:var(--panel2);border:1px solid var(--edge);border-radius:9px;padding:5px 10px;cursor:pointer}button:hover{border-color:var(--gold)}
  .row{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:8px}
  .stat{display:flex;justify-content:space-between;border-top:1px solid var(--edge);padding:5px 0;font-size:12.5px}.stat span{color:var(--dim)}.stat b{font-weight:500;font-variant-numeric:tabular-nums}
  footer{padding:10px 24px 28px;color:var(--dim);font-size:12px;max-width:1180px;margin:0 auto}footer a{color:var(--sea);text-decoration:none}
</style>
<header><h1>The glossary</h1><small>every word the ship uses, gathered from its own templates &middot; and the chronicle, which writes itself while you are away</small><span class="sp"></span><small id="count"></small></header>
<main>
  <div>
    <section><h2>The glossary<i>${T.length} terms, from ${DEF.sources.length} sources; a new template is a new entry, and a term with a value shows it live</i></h2>
      <input type="search" id="q" placeholder="a word, or part of one">
      <div class="row" id="sources"></div>
      <div id="terms" style="max-height:64vh;overflow:auto;margin-top:6px"></div></section>
  </div>
  <div>
    <section><h2>The chronicle<i>the idle text layer: a line whenever a quantity actually moved, and nothing when nothing did</i></h2>
      <div class="chron" id="chron"></div>
      <div class="row"><button id="download">Download the chronicle</button><button id="clear">Start a new one</button></div></section>
    <section><h2>What it is watching</h2><div id="watch"></div></section>
  </div>
</main>
<footer>Gathered from the rulebooks, the coins, the clans, the corn guilds, the regimes, the instruments, the forms, the fabrics, the spells, the offices, the themes and the digest's enums. Change a template and run <code>node glossary.mjs</code>; the entry changes with it. ${total} templates on disk at build. <a href="index.html">← the bridge</a></footer>
<script id="def-json" type="application/json">${JSON.stringify(DEF).replace(/<\//g, '<\\/')}</script>
${FIREFLIES}
<script>
${page}
</script>
`;
writeFileSync('glossary.html', html); console.log(`wrote glossary.html (${html.length} bytes)`);

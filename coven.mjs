#!/usr/bin/env node
/* coven.mjs — the starting layer: who holds the doors, and how they syndicate.

   The docket's rulebook says two of three custodians sign an event, and that
   the chain is syndicated between worlds every six months. This is who those
   custodians are. Twenty-one syndicates, one per tranche of a million, three
   custodians each, sixty-three practitioners in all, procedurally generated
   from a seed, and each of the two hundred doors belongs to one syndicate.

   THE THREE OFFICES, from what the words actually meant.
     A WITCH keeps a door. Local, one door each, works with what is at hand.
     A WIZARD keeps the book: replays the chain and says whether a balance is
       what the events add up to. Wise, from the same root as wisdom.
     A WARLOCK carries between. The word is oath-breaker, one who works outside
       the coven, and that is exactly the office syndication needs: somebody
       who crosses from one world's chain to another's and is trusted anyway.
   Two of the three sign, so no office can move a unit on its own: a door
   cannot pay itself, a book cannot write what it audits, a carrier cannot
   invent what it carries.

   THE NAMES ARE INVENTED, and deliberately. templates-warlock/ holds
   twenty-two real people, several of them killed for witchcraft, and this
   file will not generate plausible fakes to stand beside them. Every
   practitioner instead names one of the twenty-two as the predecessor they
   read, so the archive is cited and never impersonated.

   The generation is one function, `weave(seed)`, inlined into coven.html, so
   the page can re-generate the whole roster from another seed and hand the
   templates back. Sigils are geometry: rings, bars, chords. Nothing with a face.
       node coven.mjs */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, rmSync } from 'node:fs';
import { FIREFLIES } from './toonami.mjs';
import { rulesFor } from './rules.mjs';

const warlocks = readdirSync('templates-warlock').filter(f => f.endsWith('.json') && !f.startsWith('_')).map(f => JSON.parse(readFileSync('templates-warlock/' + f, 'utf8'))).sort((a, b) => (a.order || 0) - (b.order || 0));
const spells = readdirSync('templates-spell').filter(f => f.endsWith('.json')).map(f => JSON.parse(readFileSync('templates-spell/' + f, 'utf8')));
/* Two of the twenty-two are venerated in living traditions — a canonised saint and a
   teacher millions call Guru Rinpoche. The archive is right to hold them, because the
   archive is about who got called a sorcerer and by whom. A procedurally generated
   magic roster is a different thing, and it does not get to enlist them: they stay in
   the archive and out of the pool. The filter is on the archive's own words. */
const LIVING = w => /living practitioner|SAINT|canonised/i.test(`${w.why || ''} ${w.fate || ''}`);
const HELD_BACK = warlocks.filter(LIVING).map(w => w.name);
const PRED = warlocks.filter(w => !LIVING(w)).map(w => ({ id: w.id, name: w.name, klass: w.klass, where: w.where, when: w.when, why: (w.why || '').split('.')[0] + '.' }));
const SPELLS = spells.map(s => ({ id: s.id, name: s.name, glyph: s.glyph, kind: s.kind }));

export const WEAVE = `function weave(seed, PRED, SPELLS, SYNDICATES, DOORS) {
  const h32 = (a, b, c) => { let x = (Math.imul(a, 73856093) ^ Math.imul(b, 19349663) ^ Math.imul(c, 83492791)) | 0; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return x >>> 0; };
  const pick = (arr, k) => arr[k % arr.length];
  const HEAD = ['Ash', 'Bram', 'Cael', 'Dorn', 'Eln', 'Fenn', 'Gral', 'Hesp', 'Irm', 'Joss', 'Kel', 'Lume', 'Mor', 'Nix', 'Orr', 'Pell', 'Quill', 'Rhen', 'Sable', 'Tarn', 'Umbr', 'Vess', 'Wend', 'Yarr', 'Zeph'];
  const TAIL = ['a', 'en', 'is', 'or', 'wyn', 'ith', 'ax', 'eth', 'ur', 'ael', 'ic', 'une'];
  const HOUSE = ['the cold store', 'the ninth arch', 'the lower flue', 'the salt stair', 'the long gallery', 'the quiet lamp', 'the turned key', 'the second bell', 'the open ledger', 'the shut window', 'the counted step', 'the borrowed hour', 'the thin wall', 'the fourth watch'];
  const OFFICE = { witch: 'keeps a door', wizard: 'keeps the book', warlock: 'carries between' };
  const KEEPS = { witch: ['what grows on her side of the wall', 'the tally at her own door', 'the weights, and the habit of checking them', 'the names of everyone who came through'], wizard: ['the replay, event by event', 'the two hashes, and the disagreement between them', 'the checkpoint, and what it was taken over', 'the arithmetic nobody else wants to do'], warlock: ['the crossing, and the six months between', 'what one world owes another and has not said', 'the oath he is named for breaking', 'the route, which is not written down'] };
  const DOES = { witch: 'Signs at one door and no other. If she will not sign, that door does not move.', wizard: 'Replays the chain from nothing and says whether the balance is the sum of the events. Signs when it is.', warlock: 'Carries the chain across at the syndication and brings the other world\\'s back. Signs for what he carried and for nothing else.' };
  const KINDS = ['witch', 'wizard', 'warlock'];
  const people = [], syndicates = [], doors = [];
  for (let s = 0; s < SYNDICATES; s++) {
    const lo = Math.floor(s * DOORS / SYNDICATES) + 1, hi = Math.floor((s + 1) * DOORS / SYNDICATES);
    const trio = KINDS.map((kind, k) => {
      const h = h32(seed, s * 3 + k, 7), g = h32(seed, s * 3 + k, 11);
      const name = pick(HEAD, h) + pick(TAIL, h >>> 5) + ' ' + pick(HEAD, g).toLowerCase() + pick(TAIL, g >>> 7);
      const pred = pick(PRED, h >>> 11), spell = pick(SPELLS, g >>> 3);
      return { id: 'p-' + (s * 3 + k + 1), kind: 'practitioner', office: kind, name: name.replace(/(^| )([a-z])/g, (m, a, b) => a + b.toUpperCase()), syndicate: 'syn-' + (s + 1), tranche: s + 1, doors: [lo, hi],
        house: pick(HOUSE, h >>> 13), sigil: { ring: 1 + (h % 3), bars: 1 + ((h >>> 3) % 5), chord: (h >>> 6) % 6, turn: (g % 360) },
        keeps: pick(KEEPS[kind], h >>> 17), does: DOES[kind], office_is: OFFICE[kind],
        reads: pred.name, readsId: pred.id, reason: pred.why, spell: spell.name, spellId: spell.id, glyph: spell.glyph,
        share: (h32(seed, s * 3 + k, 23) >>> 8).toString(16).padStart(6, '0'),
        text: name + ' of ' + pick(HOUSE, h >>> 13) + ', ' + OFFICE[kind] + ' for the ' + (s + 1) + (s === 0 ? 'st' : s === 1 ? 'nd' : s === 2 ? 'rd' : 'th') + ' tranche, doors ' + lo + ' to ' + hi + '. Keeps ' + pick(KEEPS[kind], h >>> 17) + '. Reads ' + pred.name + '.',
        wovenBy: pred.id };
    });
    people.push(...trio);
    syndicates.push({ id: 'syn-' + (s + 1), kind: 'syndicate', tranche: s + 1, holds: 1000000, doors: [lo, hi], doorCount: hi - lo + 1, custodians: trio.map(p => p.id), quorum: 2, of: 3,
      name: 'The ' + (s + 1) + (s === 0 ? 'st' : s === 1 ? 'nd' : s === 2 ? 'rd' : 'th') + ' syndicate', seat: trio[0].house,
      text: 'Holds one tranche of a million against doors ' + lo + ' to ' + hi + '. Two of its three sign or nothing moves: the witch at the door, the wizard over the book, the warlock who carries. Reconciles at every syndication.', wovenBy: 'the docket' });
    for (let d = lo; d <= hi; d++) doors.push({ id: 'door-' + d, kind: 'door', door: d, syndicate: 'syn-' + (s + 1), tranche: s + 1, keeper: trio[0].id, share: +(1000000 / (hi - lo + 1)).toFixed(2),
      text: 'Door ' + d + ' of ' + DOORS + '. Draws on the ' + (s + 1) + (s === 0 ? 'st' : s === 1 ? 'nd' : s === 2 ? 'rd' : 'th') + ' tranche, kept by ' + trio[0].name + ', signed with two of three. A unit issued here is the same unit as one issued at door 1 and at door ' + DOORS + '.', wovenBy: 'syn-' + (s + 1) });
  }
  /* THE CROFTS. One per syndicate, at its seat, growing the wax a proposal is sealed with. The
     period is the (s+1)th prime — 2, 3, 5, 7, ... 73 for the 21 syndicates — continuing the war of
     clans' own trick: coprime periods mean no two syndicates' crofts ever come due together, so the
     wax supply is never idle everywhere at once and never all spent at once either. */
  const PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73];
  const crofts = syndicates.map((syn, s) => { const h = h32(seed, s, 41);
    return { id: 'croft-' + syn.id, kind: 'croft', syndicate: syn.id, tranche: syn.tranche, seat: syn.seat, period: PRIMES[s % PRIMES.length],
      yield: 2 + (h % 4), cap: 30, text: 'The croft at ' + syn.seat + ', growing sealing wax for ' + syn.name.toLowerCase() + ' every ' + PRIMES[s % PRIMES.length] + ' days.', wovenBy: syn.id }; });
  return { people, syndicates, doors, crofts };
}`;

/* THE HOLDS. Four buildable structures, one catalog offered to every syndicate rather than one
   instance per syndicate (like the corn guilds, not like the clans' per-clan assets) — a syndicate
   builds from this same list, and which three offices it favours is the whole design: a watch-tower
   for the witch's door, an archive for the wizard's book, a waystation for the warlock's crossing,
   and a granary that favours none of them and just holds more. Effects are the yard's own mini
   language: {type, target, x}, read by coven.page.js, never hard-coded there. */
const HOLDS = [
  { id: 'watch-tower', kind: 'hold', name: 'A watch-tower', office: 'witch', costWax: 20, costHeze: 400,
    effect: { type: 'mul', target: 'signChance', x: 1.6 }, text: 'Favours the witch. A door with a watch-tower is signed at 60% better odds when the custodians are left to sign on their own.' },
  { id: 'archive', kind: 'hold', name: 'An archive', office: 'wizard', costWax: 25, costHeze: 500,
    effect: { type: 'mul', target: 'staleAfter', x: 2 }, text: 'Favours the wizard. A proposal at a syndicate with an archive is kept twice as long before it counts against the bank\'s health as stale.' },
  { id: 'waystation', kind: 'hold', name: 'A waystation', office: 'warlock', costWax: 30, costHeze: 600,
    effect: { type: 'unlock', target: 'earlyCarry' }, text: 'Favours the warlock. A syndicate with a waystation can carry its own signed proposals the moment they are ready, without waiting for the six-month interval — only its own, never another syndicate\'s.' },
  { id: 'granary', kind: 'hold', name: 'A granary', office: 'none', costWax: 15, costHeze: 250,
    effect: { type: 'add', target: 'waxCap', x: 40 }, text: 'Favours no office. Raises how much sealing wax the croft can hold before it is wasted — a thing every syndicate needs and none of the three offices claims for itself.' },
];

const SYNDICATES = 21, DOORS = 200;
const weave = new Function(WEAVE + '; return weave;')();
const SEED = 1621;
const { people, syndicates, doors, crofts } = weave(SEED, PRED, SPELLS, SYNDICATES, DOORS);
rmSync('templates-coven', { recursive: true, force: true }); mkdirSync('templates-coven');
for (const p of people) writeFileSync(`templates-coven/${p.id}.json`, JSON.stringify(p, null, 1));
for (const s of syndicates) writeFileSync(`templates-coven/${s.id}.json`, JSON.stringify(s, null, 1));
for (const d of doors) writeFileSync(`templates-coven/${d.id}.json`, JSON.stringify(d, null, 1));
rmSync('templates-croft', { recursive: true, force: true }); mkdirSync('templates-croft');
for (const c of crofts) writeFileSync(`templates-croft/${c.id}.json`, JSON.stringify(c, null, 1));
rmSync('templates-hold', { recursive: true, force: true }); mkdirSync('templates-hold');
for (const h of HOLDS) writeFileSync(`templates-hold/${h.id}.json`, JSON.stringify(h, null, 1));
const total = readdirSync('.').filter(d => d.startsWith('templates-')).reduce((n, d) => n + readdirSync(d).filter(f => f.endsWith('.json')).length, 0);
console.log(`the coven: ${people.length} practitioners (${people.filter(p => p.office === 'witch').length} witches, ${people.filter(p => p.office === 'wizard').length} wizards, ${people.filter(p => p.office === 'warlock').length} warlocks) in ${syndicates.length} syndicates over ${doors.length} doors, reading ${PRED.length} of the archive's ${warlocks.length}, holding back ${HELD_BACK.join(' and ')}; ${crofts.length} crofts, ${HOLDS.length} hold types · templates on disk: ${total}`);

const DEF = { people, syndicates, doors, crofts, holds: HOLDS, pred: PRED, spells: SPELLS, seed: SEED, syndicateCount: SYNDICATES, doorCount: DOORS, total, rules: rulesFor('coven') };
const page = readFileSync('coven.page.js', 'utf8');
const html = `<title>The coven &middot; who holds the doors</title>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<!--
  THE COVEN — the starting layer of the syndication. 21 syndicates, one per tranche of a
  million, three custodians each (a witch who keeps a door, a wizard who keeps the book, a
  warlock who carries between), 63 practitioners over 200 doors, procedurally generated
  from a seed. Two of three sign or nothing moves. Proposals accrue at the doors; signed
  ones wait; every six months the syndication carries them across and commits a checkpoint,
  hashed with real SHA-256 through WebCrypto and chained to the one before.
  A croft at every seat grows sealing wax on its own coprime period, the war of clans'
  own trick; four buildable holds, one favouring each office and one favouring none, spend
  wax and HEZE to change the odds of signing, how long a proposal stays fresh, or unlock
  an early carry outside the six-month interval.
  The names are invented; templates-warlock/ holds twenty-two real people, several of them
  killed for witchcraft, and each practitioner cites one rather than standing in for one.
  Sigils are geometry: rings, bars, chords. Nothing with a face.
  ${total} templates on disk at build. SCRIPT: yes, and marked.
-->
<style>
  :root{--void:#0b0d12;--panel:#151922;--panel2:#1c2230;--edge:#2b3445;--ink:#efe9dc;--dim:#95a0b3;--gold:#f2c98a;--ok:#6fd4a8;--bad:#e06f5a;--sea:#3f8fbf;--serif:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif}
  *{box-sizing:border-box}html,body{margin:0;background:var(--void);color:var(--ink);font:13.5px/1.5 ui-rounded,system-ui,-apple-system,sans-serif}
  header{padding:20px 24px 8px;max-width:1240px;margin:0 auto;display:flex;align-items:baseline;gap:14px;flex-wrap:wrap}header h1{margin:0;font:500 30px/1.1 var(--serif);color:var(--gold)}header small{color:var(--dim)}header .sp{flex:1}
  main{padding:8px 24px 40px;max-width:1240px;margin:0 auto;display:grid;grid-template-columns:minmax(0,1fr) 380px;gap:12px}@media (max-width:980px){main{grid-template-columns:1fr}}
  section{background:var(--panel);border:1px solid var(--edge);border-radius:14px;padding:12px;margin-bottom:12px}section h2{margin:0 0 8px;font:500 17px/1.2 var(--serif)}section h2 i{font:400 11.5px/1.4 ui-rounded,system-ui,sans-serif;color:var(--dim);display:block;margin-top:2px}
  .stat{display:flex;justify-content:space-between;border-top:1px solid var(--edge);padding:5px 0;font-size:12.5px;gap:8px}.stat span{color:var(--dim)}.stat b{font-weight:500;text-align:right;font-variant-numeric:tabular-nums}
  .syns{display:grid;grid-template-columns:repeat(auto-fill,minmax(108px,1fr));gap:6px}
  .syn{background:var(--panel2);border:1px solid var(--edge);border-radius:10px;padding:7px 8px;cursor:pointer;font-size:11px}.syn:hover{border-color:var(--gold)}.syn.on{border-color:var(--gold);box-shadow:0 0 10px rgba(242,201,138,.2)}
  .syn b{display:block;font-size:12px;font-weight:600}.syn span{color:var(--dim)}.syn .q{color:var(--ok)}.syn .w{color:var(--bad)}
  .who{display:grid;grid-template-columns:52px 1fr auto;gap:8px;align-items:start;border-top:1px solid var(--edge);padding:8px 0}
  .who canvas{width:52px;height:52px;border:1px solid var(--edge);border-radius:8px;background:#0a0d14}
  .who b{font-weight:600;display:block}.who em{font-style:normal;color:var(--sea);font-size:11px;text-transform:uppercase;letter-spacing:.1em}
  .who p{margin:3px 0 0;color:var(--dim);font-size:11.5px}.who small{color:var(--gold)}
  button{font:inherit;color:var(--ink);background:var(--panel2);border:1px solid var(--edge);border-radius:9px;padding:5px 10px;cursor:pointer}button:hover:not(:disabled){border-color:var(--gold)}button:disabled{opacity:.4;cursor:not-allowed}button.primary{background:#2a2036;border-color:var(--gold)}
  .row{display:flex;gap:6px;flex-wrap:wrap;align-items:center}[hidden]{display:none!important}input[type=number]{font:inherit;color:var(--ink);background:var(--panel2);border:1px solid var(--edge);border-radius:9px;padding:5px 8px;width:100px}
  .prop{border-top:1px solid var(--edge);padding:6px 0;font-size:12px;display:grid;grid-template-columns:1fr auto;gap:4px 8px;align-items:center}
  .prop b{font-weight:600}.prop p{margin:0;color:var(--dim);font-size:11.5px;grid-column:1}
  .sigs{display:flex;gap:3px}.sigs i{width:9px;height:9px;border-radius:50%;border:1px solid var(--edge);display:block}.sigs i.on{background:var(--ok);border-color:var(--ok)}
  .clock{height:6px;background:#0a0d14;border-radius:3px;overflow:hidden;margin:6px 0}.clock div{height:100%;background:linear-gradient(90deg,var(--sea),var(--gold))}
  .chain{font:11.5px/1.5 ui-monospace,Menlo,monospace;color:var(--dim);max-height:200px;overflow:auto}.chain div{border-top:1px solid var(--edge);padding:4px 0}.chain b{color:var(--gold);font-weight:400}
  .log{font-size:12px;color:var(--dim);max-height:170px;overflow:auto}.log div{border-bottom:1px solid var(--edge);padding:3px 0}
  footer{padding:10px 24px 28px;color:var(--dim);font-size:12px;max-width:1240px;margin:0 auto}footer a{color:var(--sea);text-decoration:none}
</style>
<header><h1>The coven</h1><small>who holds the doors &middot; 21 syndicates, one per tranche &middot; a witch at the door, a wizard over the book, a warlock who carries &middot; two of three sign</small><span class="sp"></span><small id="clock"></small></header>
<main>
  <div>
    <section><h2>The syndicates<i>one per tranche of a million; click one to read its three and its doors</i></h2><div class="syns" id="syns"></div></section>
    <section><h2 id="syn-name">—</h2><div id="syn-stats"></div><div id="who"></div></section>
    <section><h2>The croft<i>sealing wax, grown on its own coprime period — never due the same day as another syndicate's</i></h2><div id="croft-stats"></div></section>
    <section><h2>Holds<i>four kinds, one favouring each office and one favouring none; wax and HEZE both, and one per syndicate</i></h2><div id="holds"></div></section>
  </div>
  <div>
    <section><h2>The syndication<i>every six months the warlocks carry what was signed across, and a checkpoint is committed</i></h2>
      <div id="sync-stats"></div><div class="clock"><div id="clock-bar" style="width:0%"></div></div>
      <div class="row"><button class="primary" id="carry">Carry now</button><button id="autosign">Let them sign</button></div>
      <div class="row" id="early-carry-wrap" hidden style="margin-top:6px"><button id="early-carry">Carry this syndicate early, via the waystation</button></div></section>
    <section><h2>The bank's health<i>read from the chain and the desk, not asserted</i></h2><div id="health"></div></section>
    <section><h2>At the doors<i>a proposal needs two of its syndicate's three; sign for whichever office you are standing in</i></h2><div id="props"></div></section>
    <section><h2>The chain<i>SHA-256 over each syndication, chained to the one before, and what came back from the far side</i></h2><div class="chain" id="chain"></div>
      <p style="color:var(--dim);font-size:12px;margin:8px 0 0">The syndicate is multiplanetary and it is enormous, so it does not care. At every carry the other world's chain arrives with an interval's volume orders of magnitude past anything these doors did, and it never rejects, never asks and never answers. It reconciles. That is not contempt, it is scale, and it is also the safety in it: a thing that cannot notice you cannot single you out.</p></section>
    <section><h2>Re-generate<i>the whole roster from another seed, handed back as ${people.length + syndicates.length + doors.length + crofts.length} files</i></h2>
      <div class="row"><input id="seed" type="number" value="${SEED}"><button id="regen">Generate</button><button id="download">Download</button></div>
      <p style="color:var(--dim);font-size:12px;margin:8px 0 0">Names are invented. The ${warlocks.length} in <a href="warlock.html" style="color:var(--gold)">the archive</a> are real people, several of them killed for witchcraft; every practitioner cites one and none stands in for one. ${HELD_BACK.join(' and ')} are held out of the pool: they are venerated in living traditions, and a magic roster does not get to enlist them.</p></section>
    <section><h2>The record</h2><div class="log" id="log"></div></section>
  </div>
</main>
<footer>The offices answer the docket's rulebook in <a href="quarter.html">templates-rules</a>: two of three sign, and the chain is syndicated every six months. The archive is <a href="warlock.html">the warlocks</a>; the spells are <a href="siege.html">the siege's</a>. ${total} templates on disk at build. <a href="index.html">← the bridge</a></footer>
<script id="def-json" type="application/json">${JSON.stringify(DEF).replace(/<\//g, '<\\/')}</script>
${FIREFLIES}
<script>
${WEAVE}
${page}
</script>
`;
writeFileSync('coven.html', html); console.log(`wrote coven.html (${html.length} bytes)`);

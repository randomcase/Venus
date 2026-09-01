#!/usr/bin/env node
/* tribunal.mjs — a hundred acts of war, a hundred votes, a hundred verdicts,
   one casus belli, and the question of who is king of kings.

   Writes the templates first, then the page from them:
     templates-act/      100 acts of war, composed from the Iliad's parts by a
                         seeded hash so the same hundred come out every time
     templates-vote/     100 votes by the judge, Antenor, each decided by the
                         first lesson's test: one party who could stop it is a
                         discretion; two moving together are a syndicate; else
                         the act stands on its own
     templates-verdict/  100 verdicts, one per vote
     templates-casus/    one casus belli, the judgement on Ida

   Thermopylae is folded into Priam: he holds the pass with three hundred, the
   verdicts against Troy are the men who come through it, and a hundred
   verdicts do not exhaust three hundred. The page shows the arithmetic.

   The final verdict is computed, not written: king of kings is whoever the
   votes find to be a single choke point most often. That is Agamemnon, by
   construction of the Iliad and not of this file. Paris is a prince. The king
   before Paris is Priam, and before Priam Laomedon, and the page says so.

       node tribunal.mjs
*/
import { writeFileSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';

const h32 = (a, b, c) => { let x = (Math.imul(a, 73856093) ^ Math.imul(b, 19349663) ^ Math.imul(c, 83492791)) | 0; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return x >>> 0; };
const SEED = 1184; // the fall, by Eratosthenes
const ACTORS = [
  { id: 'agamemnon', name: 'Agamemnon', side: 'fleet', rank: 'anax andron, king of Mycenae', choke: true },
  { id: 'achilles', name: 'Achilles', side: 'fleet', rank: 'lord of the Myrmidons', choke: true },
  { id: 'hector', name: 'Hector', side: 'troy', rank: 'prince, eldest of Priam', choke: true },
  { id: 'paris', name: 'Paris', side: 'troy', rank: 'prince of Troy', choke: false, pair: 'deiphobus' },
  { id: 'deiphobus', name: 'Deiphobus', side: 'troy', rank: 'prince of Troy', choke: false, pair: 'paris' },
  { id: 'odysseus', name: 'Odysseus', side: 'fleet', rank: 'king of Ithaca', choke: false, pair: 'diomedes' },
  { id: 'diomedes', name: 'Diomedes', side: 'fleet', rank: 'king of Argos', choke: false, pair: 'odysseus' },
  { id: 'ajax', name: 'Ajax', side: 'fleet', rank: 'lord of Salamis', choke: false },
  { id: 'menelaus', name: 'Menelaus', side: 'fleet', rank: 'king of Sparta', choke: false },
  { id: 'patroclus', name: 'Patroclus', side: 'fleet', rank: 'companion', choke: false },
  { id: 'priam', name: 'Priam', side: 'troy', rank: 'king of Troy', choke: true },
  { id: 'nestor', name: 'Nestor', side: 'fleet', rank: 'king of Pylos', choke: false },
  { id: 'sarpedon', name: 'Sarpedon', side: 'troy', rank: 'king of Lycia, ally', choke: false },
  { id: 'aeneas', name: 'Aeneas', side: 'troy', rank: 'prince of Dardania, ally', choke: false },
  { id: 'helenus', name: 'Helenus', side: 'troy', rank: 'prince and seer', choke: false },
  { id: 'antenor', name: 'Antenor', side: 'troy', rank: 'the judge', choke: false },
];
const DEEDS = [
  ['took', 'Briseis from the tent'], ['refused', 'the ransom for Chryseis'], ['returned', 'Chryseis to her father'], ['sacked', 'a city on the coast'], ['held', 'the gate against the fleet'],
  ['ransomed', 'a son from the ships'], ['duelled', 'in the space between the lines'], ['offered', 'a truce that did not hold'], ['burned', 'the first of the ships'], ['buried', 'a companion under a mound'],
  ['withdrew', 'from the field and sat down'], ['sent', 'an embassy with gifts'], ['stripped', 'the arms from a body'], ['dragged', 'a body three times round the wall'], ['gave back', 'a body for its weight in gold'],
  ['divided', 'the plunder by rank'], ['called', 'the assembly and named the cause'], ['read', 'the birds and counselled retreat'], ['drove', 'the chariot at the wall'], ['counted', 'the ships by contingent'],
];
const PLACES = ['before the Scaean gate', 'on the plain of Scamander', 'among the ships', 'at the tomb of Ilus', 'in the assembly', 'by the river', 'under the wall', 'at the fig tree', 'in Priam\'s hall', 'on the mound of Aesyetes'];
const pick = (arr, k) => arr[k % arr.length];
/* the Iliad is not evenly distributed: the acts of command are Agamemnon's, the acts of the field Achilles' and Hector's */
const WEIGHT = { agamemnon: 5, achilles: 3, hector: 3, priam: 2, odysseus: 2, paris: 2 };
const CAST = ACTORS.flatMap(a => Array(WEIGHT[a.id] || 1).fill(a));
mkdirSync('templates-act', { recursive: true }); mkdirSync('templates-vote', { recursive: true }); mkdirSync('templates-verdict', { recursive: true }); mkdirSync('templates-casus', { recursive: true });

const acts = [], votes = [], verdicts = []; const chokeCount = {}; const pairCount = {};
for (let i = 1; i <= 100; i++) {
  const ha = h32(SEED, i, 1), hb = h32(SEED, i, 2), hc = h32(SEED, i, 3), hd = h32(SEED, i, 4);
  const a = pick(CAST, ha); let b = null; if (hb % 3 === 0) { b = a.pair ? ACTORS.find(x => x.id === a.pair) : pick(CAST, hb); if (b.id === a.id) b = null; }
  const [verb, object] = pick(DEEDS, hc), place = pick(PLACES, hd), year = 1 + Math.floor((i - 1) / 10), day = (i - 1) * 36 + (ha % 30);
  const parties = b ? [a.id, b.id] : [a.id];
  const act = { id: `act-${String(i).padStart(3, '0')}`, order: i, year, day, parties, actor: a.name, with: b ? b.name : null, verb, object, place, side: a.side, text: `${a.name}${b ? ' and ' + b.name : ''} ${verb} ${object}, ${place}, in the ${['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'][year - 1]} year.` };
  acts.push(act);
  /* the judge's test */
  let finding, reason;
  if (b && a.pair === b.id) { finding = 'syndicate'; reason = `${a.name} and ${b.name} act together. Neither could have done it alone and together they did; that is a minimal cutting pair moving in step, and the routine that deletes one thing at a time would have called it clean.`; pairCount[[a.id, b.id].sort().join('+')] = (pairCount[[a.id, b.id].sort().join('+')] || 0) + 1; }
  else if (a.choke && !b) { finding = 'discretion'; reason = `${a.name} alone could have done otherwise, and nobody could route around him. A single party whose refusal stops the flow is a choke point, and a choke point is a discretion.`; chokeCount[a.id] = (chokeCount[a.id] || 0) + 1; }
  else if (b) { finding = 'thin', reason = `${a.name} and ${b.name} together; either could have been replaced. Thin redundancy, which is fine.`; }
  else { finding = 'stands'; reason = `${a.name} acted, and the act could have been refused by others on the path. It stands on its own.`; }
  const vote = { id: `vote-${String(i).padStart(3, '0')}`, order: i, act: act.id, judge: 'Antenor', finding, vote: finding === 'discretion' ? 'against' : finding === 'syndicate' ? 'against, and named' : 'for', reason };
  votes.push(vote);
  const against = vote.vote.startsWith('against');
  verdicts.push({ id: `verdict-${String(i).padStart(3, '0')}`, order: i, act: act.id, vote: vote.id, verdict: against ? (a.side === 'troy' ? 'Troy bears it' : 'the fleet bears it') : 'no fault', text: against ? `${finding === 'syndicate' ? 'Named as a pair' : 'A discretion'}: ${a.side === 'troy' ? 'Troy' : 'the fleet'} bears the act of ${act.actor}${b ? ' and ' + b.name : ''}. It passes to Priam's gate as one man through the pass.` : `No fault found in what ${act.actor} did. The act stands and the war goes on.` });
}
for (const a of acts) writeFileSync(`templates-act/${a.id}.json`, JSON.stringify(a, null, 1)); for (const v of votes) writeFileSync(`templates-vote/${v.id}.json`, JSON.stringify(v, null, 1)); for (const v of verdicts) writeFileSync(`templates-verdict/${v.id}.json`, JSON.stringify(v, null, 1));
const casus = { id: 'belli', name: 'The judgement on Ida', text: 'Three goddesses, one apple, and a shepherd prince asked to choose. He chose the one who offered a wife who was already married, and went to Sparta and brought her home. The oath of Tyndareus bound every suitor she had ever had to come and get her back. That is the one cause; every act after it is an act of the war and not of the cause.', party: 'paris', before: 'the war', finding: 'discretion, once', reason: 'Paris alone chose; nobody on Ida could route around him. One discretion, spent once, at the moment of choosing, and never again available to him: after it he is a prince among princes and never a king.' };
writeFileSync('templates-casus/belli.json', JSON.stringify(casus, null, 1));

/* the final verdict, computed */
const ranked = Object.entries(chokeCount).sort((x, y) => y[1] - x[1]).map(([id, n]) => ({ ...ACTORS.find(a => a.id === id), n }));
const king = ranked[0]; const troyKing = ranked.find(a => a.side === 'troy');
const passAgainstTroy = verdicts.filter(v => v.verdict === 'Troy bears it').length, passAgainstFleet = verdicts.filter(v => v.verdict === 'the fleet bears it').length;
const FINAL = {
  question: 'Is Paris king of kings, and is there a king before Paris?',
  kingOfKings: king.name, kingOfKingsWhy: `${king.name} (${king.rank}) is found a single choke point ${king.n} times in a hundred acts, more than anyone. King of kings is not a title here; it is the party whose refusal stops the most. ${king.id === 'agamemnon' ? 'That is what anax andron means, and the votes agree with the Iliad.' : 'The Iliad gives the title to Agamemnon; the hundred acts as drawn give it to ' + king.name + ', and the page reports the count, not the title.'}`,
  paris: `Paris is a prince of Troy. He is found a discretion exactly once, on Ida, in the cause, and never in the war: in the acts he is always half of a pair with Deiphobus, which is the syndicate shape, not the king's. He is not king of kings, and thus not king of anything; a pair is not a crown.`,
  before: `The king before Paris is Priam, king of Troy (a discretion ${chokeCount.priam || 0} times in the acts; Hector, who is not king, ${chokeCount.hector || 0}), and before Priam, Laomedon, who cheated Apollo and Poseidon of their wages for the wall, which is why the wall has a weak place at all. There was always a king before Paris; he was born under one.`,
  pass: { held: 300, against: passAgainstTroy, fleet: passAgainstFleet, text: `Thermopylae folded into Priam: he holds the pass with three hundred. ${passAgainstTroy} verdicts fall on Troy and come through it one at a time; three hundred hold a hundred. The pass does not fall to the verdicts. It falls, when it falls, to the letter, which is a herald and not a verdict.` },
  ranked: ranked.map(a => `${a.name} ${a.n}`), pairs: Object.entries(pairCount).map(([p, n]) => `${p.replace('+', ' and ')} ${n}`),
};

const acts2 = readdirSync('templates-act').length, votes2 = readdirSync('templates-vote').length, verd2 = readdirSync('templates-verdict').length;
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const html = `<title>The tribunal of Troy &middot; a hundred acts, a hundred votes, a hundred verdicts, one cause</title>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<!--
  THE TRIBUNAL — generated by tribunal.mjs from templates-act/ (${acts2}), templates-vote/ (${votes2}),
  templates-verdict/ (${verd2}) and templates-casus/ (1). The judge is Antenor and his test is the
  first lesson's: a single party who could stop it is a discretion, two moving together are a
  syndicate, anything else stands. The final verdict is computed from the counts, not written.
  Thermopylae is folded into Priam as the pass he holds. No script; the page is the record.
-->
<style>
  :root{--void:#0b0d12;--panel:#151922;--panel2:#1c2230;--edge:#2b3445;--ink:#efe9dc;--dim:#95a0b3;--gold:#f2c98a;--ok:#6fd4a8;--bad:#e06f5a;--sea:#3f8fbf}
  *{box-sizing:border-box}html,body{margin:0;background:var(--void);color:var(--ink);font:14px/1.5 ui-rounded,system-ui,-apple-system,sans-serif}
  header{padding:16px 18px 6px}header h1{margin:0;font-size:20px;color:var(--gold);font-weight:600}header p{margin:4px 0 0;color:var(--dim)}
  main{padding:10px 18px 40px;max-width:1100px;margin:0 auto;display:grid;gap:12px}
  section{background:var(--panel);border:1px solid var(--edge);border-radius:12px;padding:12px}
  section h2{margin:0 0 6px;font-size:12px;color:var(--dim);text-transform:uppercase;letter-spacing:.08em;font-weight:600}
  .final{border-color:var(--gold)}.final p{margin:6px 0}.final b{color:var(--gold)}
  .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:6px}
  .stat{background:var(--panel2);border:1px solid var(--edge);border-radius:10px;padding:8px 10px}.stat b{display:block;font-size:11px;color:var(--dim);font-weight:500;text-transform:uppercase;letter-spacing:.06em}.stat span{font-size:18px}
  table{width:100%;border-collapse:collapse;font-size:12.5px}th{text-align:left;color:var(--dim);font-weight:500;font-size:11px;text-transform:uppercase;letter-spacing:.05em;padding:5px 6px;border-bottom:1px solid var(--edge)}td{padding:5px 6px;border-bottom:1px solid #1d2532;vertical-align:top}
  .f-discretion{color:var(--bad)}.f-syndicate{color:#f0a83c}.f-thin{color:var(--dim)}.f-stands{color:var(--ok)}
  details summary{cursor:pointer;color:var(--sea);margin:4px 0}
  footer{padding:10px 18px 24px;color:var(--dim);font-size:12px;max-width:1100px;margin:0 auto}footer a{color:var(--sea);text-decoration:none}
</style>
<header><h1>The tribunal of Troy</h1><p>A hundred acts of war, a hundred votes by the judge, a hundred verdicts, one cause, and one question at the end. Every act, vote and verdict is a file in the yard; this page is only the reading of them.</p></header>
<main>
  <section class="final"><h2>The final verdict, computed</h2>
    <p><b>${esc(FINAL.question)}</b></p>
    <p><b>King of kings: ${esc(FINAL.kingOfKings)}.</b> ${esc(FINAL.kingOfKingsWhy)}</p>
    <p>${esc(FINAL.paris)}</p>
    <p>${esc(FINAL.before)}</p>
    <p style="color:var(--dim)">Single choke points across the hundred: ${FINAL.ranked.join(' · ')}. Pairs named: ${FINAL.pairs.join(' · ') || 'none'}.</p>
  </section>
  <div class="stats">
    <div class="stat"><b>acts</b><span>${acts.length}</span></div><div class="stat"><b>votes for</b><span>${votes.filter(v => v.vote === 'for').length}</span></div><div class="stat"><b>against, a discretion</b><span>${votes.filter(v => v.finding === 'discretion').length}</span></div><div class="stat"><b>against, a pair named</b><span>${votes.filter(v => v.finding === 'syndicate').length}</span></div><div class="stat"><b>Troy bears</b><span>${FINAL.pass.against}</span></div><div class="stat"><b>the fleet bears</b><span>${FINAL.pass.fleet}</span></div>
  </div>
  <section><h2>The pass · Thermopylae folded into Priam</h2><p style="margin:0">${esc(FINAL.pass.text)}</p></section>
  <section><h2>The one cause</h2><p style="margin:0"><b>${esc(casus.name)}.</b> ${esc(casus.text)}</p><p style="margin:6px 0 0;color:var(--dim)">The judge: ${esc(casus.finding)}. ${esc(casus.reason)}</p></section>
  <section><h2>The hundred, in the order they came</h2><table><thead><tr><th>#</th><th>year</th><th>the act</th><th>the judge finds</th><th>the verdict</th></tr></thead><tbody>
${acts.map((a, i) => `<tr><td>${a.order}</td><td>${a.year}</td><td>${esc(a.text)}</td><td class="f-${votes[i].finding}">${esc(votes[i].vote)}<details><summary>why</summary>${esc(votes[i].reason)}</details></td><td>${esc(verdicts[i].verdict)}</td></tr>`).join('\n')}
  </tbody></table></section>
</main>
<footer>The test is the first lesson's, in <a href="school.html">the school</a> and <a href="descent.html">the ground landing</a>; the same routine runs over the ledger in <a href="ledger/explorer.html">the explorer</a>. Priam's council sits in <a href="troy.html">Troy</a>; the princes hold the wall in <a href="siege.html">the siege</a>. <a href="arcade.html">← the arcade</a> · <a href="index.html">the yard</a></footer>
`;
writeFileSync('tribunal.html', html);
console.log(`wrote ${acts2} acts, ${votes2} votes, ${verd2} verdicts, 1 casus belli, tribunal.html (${html.length} bytes). King of kings: ${FINAL.kingOfKings}; ${FINAL.ranked.join(', ')}`);

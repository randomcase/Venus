#!/usr/bin/env node
/* tribunal.mjs — two benches, a hundred acts each, a hundred votes, a hundred
   verdicts, one cause each, and the question of who is king of kings.

   Writes the templates first, then the page from them. One routine, run twice:

     Troy's bench    templates-act/  templates-vote/  templates-verdict/  templates-casus/
                     judge Antenor; cause: the judgement on Ida
     the fleet's     templates-act-fleet/  templates-vote-fleet/  templates-verdict-fleet/  templates-casus-fleet/
                     judge Nestor; cause: the oath of Tyndareus

   The test on both benches is the first lesson's: a single party who could
   have stopped the act is a discretion; two who could only do it together and
   did are a syndicate, and are named; anything else stands. The final verdict
   on each bench is computed from the counts, not written.

   Thermopylae is folded into Priam: he holds the pass with three hundred and
   the verdicts against Troy come through it. The fleet's pass is the wall
   round the ships, built in the seventh year, and the verdicts against the
   fleet come over it.

       node tribunal.mjs
*/
import { writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';

const h32 = (a, b, c) => { let x = (Math.imul(a, 73856093) ^ Math.imul(b, 19349663) ^ Math.imul(c, 83492791)) | 0; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return x >>> 0; };
const pad = i => String(i).padStart(3, '0');
const ORD = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'];
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

const TROY = {
  key: 'troy', title: 'Troy\'s bench', seed: 1184, judge: 'Antenor', suffix: '',
  actors: [
    { id: 'agamemnon', name: 'Agamemnon', side: 'fleet', rank: 'anax andron, king of Mycenae', choke: true, w: 5 },
    { id: 'achilles', name: 'Achilles', side: 'fleet', rank: 'lord of the Myrmidons', choke: true, w: 3 },
    { id: 'hector', name: 'Hector', side: 'troy', rank: 'prince, eldest of Priam', choke: true, w: 3 },
    { id: 'paris', name: 'Paris', side: 'troy', rank: 'prince of Troy', choke: false, pair: 'deiphobus', w: 2 },
    { id: 'deiphobus', name: 'Deiphobus', side: 'troy', rank: 'prince of Troy', choke: false, pair: 'paris' },
    { id: 'odysseus', name: 'Odysseus', side: 'fleet', rank: 'king of Ithaca', choke: false, pair: 'diomedes', w: 2 },
    { id: 'diomedes', name: 'Diomedes', side: 'fleet', rank: 'king of Argos', choke: false, pair: 'odysseus' },
    { id: 'ajax', name: 'Ajax', side: 'fleet', rank: 'lord of Salamis', choke: false },
    { id: 'menelaus', name: 'Menelaus', side: 'fleet', rank: 'king of Sparta', choke: false },
    { id: 'patroclus', name: 'Patroclus', side: 'fleet', rank: 'companion', choke: false },
    { id: 'priam', name: 'Priam', side: 'troy', rank: 'king of Troy', choke: true, w: 2 },
    { id: 'nestor', name: 'Nestor', side: 'fleet', rank: 'king of Pylos', choke: false },
    { id: 'sarpedon', name: 'Sarpedon', side: 'troy', rank: 'king of Lycia, ally', choke: false },
    { id: 'aeneas', name: 'Aeneas', side: 'troy', rank: 'prince of Dardania, ally', choke: false },
    { id: 'helenus', name: 'Helenus', side: 'troy', rank: 'prince and seer', choke: false },
    { id: 'antenor', name: 'Antenor', side: 'troy', rank: 'the judge', choke: false },
  ],
  deeds: [['took', 'Briseis from the tent'], ['refused', 'the ransom for Chryseis'], ['returned', 'Chryseis to her father'], ['sacked', 'a city on the coast'], ['held', 'the gate against the fleet'], ['ransomed', 'a son from the ships'], ['duelled', 'in the space between the lines'], ['offered', 'a truce that did not hold'], ['burned', 'the first of the ships'], ['buried', 'a companion under a mound'], ['withdrew', 'from the field and sat down'], ['sent', 'an embassy with gifts'], ['stripped', 'the arms from a body'], ['dragged', 'a body three times round the wall'], ['gave back', 'a body for its weight in gold'], ['divided', 'the plunder by rank'], ['called', 'the assembly and named the cause'], ['read', 'the birds and counselled retreat'], ['drove', 'the chariot at the wall'], ['counted', 'the ships by contingent']],
  places: ['before the Scaean gate', 'on the plain of Scamander', 'among the ships', 'at the tomb of Ilus', 'in the assembly', 'by the river', 'under the wall', 'at the fig tree', 'in Priam\'s hall', 'on the mound of Aesyetes'],
  bears: side => side === 'troy' ? 'Troy bears it' : 'the fleet bears it', home: 'troy',
  casus: { id: 'belli', name: 'The judgement on Ida', party: 'paris', text: 'Three goddesses, one apple, and a shepherd prince asked to choose. He chose the one who offered a wife who was already married, and went to Sparta and brought her home. The oath of Tyndareus bound every suitor she had ever had to come and get her back. That is the one cause; every act after it is an act of the war and not of the cause.', finding: 'discretion, once', reason: 'Paris alone chose; nobody on Ida could route around him. One discretion, spent once, at the moment of choosing, and never again available to him: after it he is a prince among princes and never a king.' },
  question: 'Is Paris king of kings, and is there a king before Paris?',
  claimant: 'agamemnon', claimantTitle: 'anax andron',
  princeLine: c => `Paris is a prince of Troy. He is found a discretion exactly once, on Ida, in the cause, and never in the war: in the acts he is always half of a pair with Deiphobus (${c['deiphobus+paris'] || 0} times named), which is the syndicate shape, not the king's. He is not king of kings, and thus not king of anything; a pair is not a crown.`,
  beforeLine: c => `The king before Paris is Priam, king of Troy (a discretion ${c.priam || 0} times in the acts; Hector, who is not king, ${c.hector || 0}), and before Priam, Laomedon, who cheated Apollo and Poseidon of their wages for the wall, which is why the wall has a weak place at all. There was always a king before Paris; he was born under one.`,
  pass: n => ({ held: 300, against: n, text: `Thermopylae folded into Priam: he holds the pass with three hundred. ${n} verdicts fall on Troy and come through it one at a time; three hundred hold a hundred. The pass does not fall to the verdicts. It falls, when it falls, to the letter, which is a herald and not a verdict.` }),
};
const FLEET = {
  key: 'fleet', title: 'The fleet\'s bench', seed: 1186, judge: 'Nestor', suffix: '-fleet',
  actors: [
    { id: 'agamemnon', name: 'Agamemnon', side: 'fleet', rank: 'anax andron, king of Mycenae', choke: true, w: 5 },
    { id: 'achilles', name: 'Achilles', side: 'fleet', rank: 'lord of the Myrmidons', choke: true, w: 4 },
    { id: 'odysseus', name: 'Odysseus', side: 'fleet', rank: 'king of Ithaca', choke: false, pair: 'diomedes', w: 3 },
    { id: 'diomedes', name: 'Diomedes', side: 'fleet', rank: 'king of Argos', choke: false, pair: 'odysseus', w: 2 },
    { id: 'ajax', name: 'Ajax', side: 'fleet', rank: 'lord of Salamis', choke: false, w: 2 },
    { id: 'teucer', name: 'Teucer', side: 'fleet', rank: 'archer, Ajax\'s brother', choke: false, pair: 'ajax' },
    { id: 'menelaus', name: 'Menelaus', side: 'fleet', rank: 'king of Sparta', choke: false, w: 2 },
    { id: 'patroclus', name: 'Patroclus', side: 'fleet', rank: 'companion', choke: false },
    { id: 'nestor', name: 'Nestor', side: 'fleet', rank: 'king of Pylos, the judge', choke: false },
    { id: 'calchas', name: 'Calchas', side: 'fleet', rank: 'the seer', choke: true },
    { id: 'idomeneus', name: 'Idomeneus', side: 'fleet', rank: 'king of Crete', choke: false },
    { id: 'thersites', name: 'Thersites', side: 'fleet', rank: 'a common soldier who spoke', choke: false },
    { id: 'phoenix', name: 'Phoenix', side: 'fleet', rank: 'Achilles\' old tutor', choke: false },
    { id: 'neoptolemus', name: 'Neoptolemus', side: 'fleet', rank: 'Achilles\' son', choke: false },
    { id: 'hector', name: 'Hector', side: 'troy', rank: 'prince, eldest of Priam', choke: true, w: 2 },
    { id: 'priam', name: 'Priam', side: 'troy', rank: 'king of Troy', choke: true },
  ],
  deeds: [['called', 'the assembly and named the cause'], ['divided', 'the plunder by rank'], ['refused', 'the ransom for Chryseis'], ['beached', 'the ships and built the wall'], ['drew', 'lots for the duel with Hector'], ['counted', 'the ships by contingent'], ['quarrelled', 'over the arms of Achilles'], ['sent', 'the embassy with gifts'], ['sacrificed', 'at Aulis for a wind'], ['spoke', 'against the kings in the assembly'], ['struck', 'the one who spoke'], ['went out', 'in borrowed armour'], ['held', 'the ships against the fire'], ['tested', 'the army by ordering it home'], ['stole', 'the horses of Rhesus by night'], ['dragged', 'a body three times round the wall'], ['gave back', 'a body for its weight in gold'], ['read', 'the omen of the snake and the sparrows'], ['built', 'the Horse'], ['withdrew', 'from the field and sat down']],
  places: ['in the assembly by the ships', 'at Aulis', 'among the ships', 'at the wall round the camp', 'before Achilles\' tent', 'by the river', 'on the plain', 'at the pyre', 'in Agamemnon\'s hut', 'on the beach at dawn'],
  bears: side => side === 'fleet' ? 'the fleet bears it' : 'Troy bears it', home: 'fleet',
  casus: { id: 'belli', name: 'The oath of Tyndareus', party: 'odysseus', text: 'Every suitor of Helen swore, on the cut pieces of a horse, to defend the marriage whoever won her. Odysseus proposed the oath so that the losers would not fight the winner. When she was taken, the oath called them all. That is the fleet\'s one cause; the abduction is Troy\'s.', finding: 'a rule, written once', reason: 'Odysseus spent a discretion at writing time, before any case arrived: the oath decides each case afterwards without him. By the fourth lesson that is not a king\'s act but the opposite of one. It is why he is never the choke point in the hundred: he made the rule and gave the discretion away.' },
  question: 'Is Agamemnon king of kings by right, or by the choke; and is there a king before Agamemnon?',
  claimant: 'agamemnon', claimantTitle: 'anax andron',
  princeLine: c => `Agamemnon holds the title and the count. He is king of kings by the choke, which is the only sense this bench recognises: his refusal stops the most. By right he is king of Mycenae and nothing more; every other king on the beach came under an oath, not under him. Odysseus, who wrote the oath, is a choke point ${c.odysseus || 0} times: the pair with Diomedes is named ${c['diomedes+odysseus'] || 0} times, which is redundancy, not a crown.`,
  beforeLine: c => `The king before Agamemnon is Atreus, who served his brother's children to him at dinner, and before Atreus Pelops, who won a kingdom by a fixed race, and before Pelops Tantalus, who served his own son to the gods. There was always a king before Agamemnon, and each of them is the reason the next one is what he is. Achilles, a discretion ${c.achilles || 0} times, is not a king and does not want to be; Calchas, ${c.calchas || 0}, is the choke nobody elected.`,
  pass: n => ({ held: 1186, against: n, text: `The fleet's pass is the wall round the ships, built in the seventh year, with ${1186} hulls behind it. ${n} verdicts fall on the fleet and come over it. The wall was breached once, by Hector, with a stone; the verdicts do not breach it. What breaches it is the fire, and the fire is put out by one man who is not a king.` }),
};

function bench(B) {
  const dirs = ['act', 'vote', 'verdict', 'casus'].map(d => `templates-${d}${B.suffix}`); for (const d of dirs) { rmSync(d, { recursive: true, force: true }); mkdirSync(d, { recursive: true }); }
  const cast = B.actors.flatMap(a => Array(a.w || 1).fill(a)); const pick = (arr, k) => arr[k % arr.length];
  const acts = [], votes = [], verdicts = [], choke = {}, pairs = {};
  for (let i = 1; i <= 100; i++) {
    const ha = h32(B.seed, i, 1), hb = h32(B.seed, i, 2), hc = h32(B.seed, i, 3), hd = h32(B.seed, i, 4);
    const a = pick(cast, ha); let b = null; if (hb % 3 === 0) { b = a.pair ? B.actors.find(x => x.id === a.pair) : pick(cast, hb); if (b.id === a.id) b = null; }
    const [verb, object] = pick(B.deeds, hc), place = pick(B.places, hd), year = 1 + Math.floor((i - 1) / 10), day = (i - 1) * 36 + (ha % 30);
    const act = { id: `act-${pad(i)}`, bench: B.key, order: i, year, day, parties: b ? [a.id, b.id] : [a.id], actor: a.name, with: b ? b.name : null, verb, object, place, side: a.side, text: `${a.name}${b ? ' and ' + b.name : ''} ${verb} ${object}, ${place}, in the ${ORD[year - 1]} year.` };
    acts.push(act);
    let finding, reason;
    if (b && a.pair === b.id) { finding = 'syndicate'; reason = `${a.name} and ${b.name} act together. Neither could have done it alone and together they did; that is a minimal cutting pair moving in step, and the routine that deletes one thing at a time would have called it clean.`; const k = [a.id, b.id].sort().join('+'); pairs[k] = (pairs[k] || 0) + 1; }
    else if (a.choke && !b) { finding = 'discretion'; reason = `${a.name} alone could have done otherwise, and nobody could route around him. A single party whose refusal stops the flow is a choke point, and a choke point is a discretion.`; choke[a.id] = (choke[a.id] || 0) + 1; }
    else if (b) { finding = 'thin'; reason = `${a.name} and ${b.name} together; either could have been replaced. Thin redundancy, which is fine.`; }
    else { finding = 'stands'; reason = `${a.name} acted, and the act could have been refused by others on the path. It stands on its own.`; }
    const vote = { id: `vote-${pad(i)}`, bench: B.key, order: i, act: act.id, judge: B.judge, finding, vote: finding === 'discretion' ? 'against' : finding === 'syndicate' ? 'against, and named' : 'for', reason }; votes.push(vote);
    const against = vote.vote.startsWith('against');
    verdicts.push({ id: `verdict-${pad(i)}`, bench: B.key, order: i, act: act.id, vote: vote.id, verdict: against ? B.bears(a.side) : 'no fault', text: against ? `${finding === 'syndicate' ? 'Named as a pair' : 'A discretion'}: ${B.bears(a.side)}, for the act of ${act.actor}${b ? ' and ' + b.name : ''}.` : `No fault found in what ${act.actor} did. The act stands and the war goes on.` });
  }
  acts.forEach(a => writeFileSync(`${dirs[0]}/${a.id}.json`, JSON.stringify(a, null, 1))); votes.forEach(v => writeFileSync(`${dirs[1]}/${v.id}.json`, JSON.stringify(v, null, 1))); verdicts.forEach(v => writeFileSync(`${dirs[2]}/${v.id}.json`, JSON.stringify(v, null, 1)));
  writeFileSync(`${dirs[3]}/belli.json`, JSON.stringify({ ...B.casus, bench: B.key }, null, 1));
  const ranked = Object.entries(choke).sort((x, y) => y[1] - x[1]).map(([id, n]) => ({ ...B.actors.find(a => a.id === id), n })); const king = ranked[0];
  const counts = { ...choke, ...pairs }; const againstHome = verdicts.filter(v => v.verdict === B.bears(B.home)).length, againstOther = verdicts.filter(v => v.verdict !== 'no fault' && v.verdict !== B.bears(B.home)).length;
  return { B, acts, votes, verdicts, ranked, king, pass: B.pass(againstHome), againstHome, againstOther, counts, dirs,
    kingLine: `${king.name} (${king.rank}) is found a single choke point ${king.n} times in a hundred acts, more than anyone. King of kings is not a title here; it is the party whose refusal stops the most. ${king.id === B.claimant ? `That is what ${B.claimantTitle} means, and the votes agree with the Iliad.` : `The Iliad gives the title to ${B.actors.find(a => a.id === B.claimant).name}; this hundred as drawn gives it to ${king.name}, and the page reports the count, not the title.`}` };
}

const benches = [bench(TROY), bench(FLEET)];
const section = R => `
  <section class="bench">
    <h2>${esc(R.B.title)}<i>judge ${esc(R.B.judge)} · ${R.acts.length} acts · ${R.votes.filter(v => v.vote === 'for').length} for · ${R.votes.filter(v => v.finding === 'discretion').length} discretions · ${R.votes.filter(v => v.finding === 'syndicate').length} pairs named</i></h2>
    <div class="final"><p><b>${esc(R.B.question)}</b></p><p><b>King of kings: ${esc(R.king.name)}.</b> ${esc(R.kingLine)}</p><p>${esc(R.B.princeLine(R.counts))}</p><p>${esc(R.B.beforeLine(R.counts))}</p>
      <p class="dim">Single choke points: ${R.ranked.map(a => `${a.name} ${a.n}`).join(' · ')}. Pairs named: ${Object.entries(R.counts).filter(([k]) => k.includes('+')).map(([k, n]) => `${k.replace('+', ' and ')} ${n}`).join(' · ') || 'none'}.</p></div>
    <h3>The pass</h3><p class="dim">${esc(R.pass.text)}</p>
    <h3>The one cause</h3><p class="dim"><b>${esc(R.B.casus.name)}.</b> ${esc(R.B.casus.text)} <i>The judge: ${esc(R.B.casus.finding)}.</i> ${esc(R.B.casus.reason)}</p>
    <details><summary>The hundred, in the order they came</summary><table><thead><tr><th>#</th><th>year</th><th>the act</th><th>the judge finds</th><th>the verdict</th></tr></thead><tbody>
${R.acts.map((a, i) => `<tr><td>${a.order}</td><td>${a.year}</td><td>${esc(a.text)}</td><td class="f-${R.votes[i].finding}">${esc(R.votes[i].vote)}<details><summary>why</summary>${esc(R.votes[i].reason)}</details></td><td>${esc(R.verdicts[i].verdict)}</td></tr>`).join('\n')}
    </tbody></table></details>
  </section>`;
const html = `<title>The tribunal of Troy &middot; two benches, a hundred acts each, one cause each</title>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<!--
  THE TRIBUNAL — generated by tribunal.mjs. Two benches from one routine:
  Troy's (templates-act/, templates-vote/, templates-verdict/, templates-casus/; judge Antenor) and
  the fleet's (the same four with -fleet; judge Nestor). A hundred acts each, composed from the
  Iliad's parts by a seeded hash with the cast weighted as the poem is; a hundred votes on the
  first lesson's test; a hundred verdicts; one cause each. The final verdicts are computed from
  the counts, not written. No script; the page is the record.
-->
<style>
  :root{--void:#0b0d12;--panel:#151922;--panel2:#1c2230;--edge:#2b3445;--ink:#efe9dc;--dim:#95a0b3;--gold:#f2c98a;--ok:#6fd4a8;--bad:#e06f5a;--sea:#3f8fbf}
  *{box-sizing:border-box}html,body{margin:0;background:var(--void);color:var(--ink);font:14px/1.5 ui-rounded,system-ui,-apple-system,sans-serif}
  header{padding:16px 18px 6px}header h1{margin:0;font-size:20px;color:var(--gold);font-weight:600}header p{margin:4px 0 0;color:var(--dim)}
  main{padding:10px 18px 40px;max-width:1200px;margin:0 auto;display:grid;gap:12px;grid-template-columns:1fr 1fr}@media (max-width:900px){main{grid-template-columns:1fr}}
  section{background:var(--panel);border:1px solid var(--edge);border-radius:12px;padding:12px;min-width:0}
  section h2{margin:0 0 8px;font-size:12px;color:var(--dim);text-transform:uppercase;letter-spacing:.08em;font-weight:600}section h2 i{font-style:normal;text-transform:none;letter-spacing:0;font-weight:400;margin-left:6px}
  section h3{margin:10px 0 2px;font-size:12px;color:var(--dim);text-transform:uppercase;letter-spacing:.06em}
  .final{border:1px solid var(--gold);border-radius:10px;padding:8px 10px}.final p{margin:6px 0}.final b{color:var(--gold)}p.dim{color:var(--dim);margin:2px 0}
  table{width:100%;border-collapse:collapse;font-size:12px}th{text-align:left;color:var(--dim);font-weight:500;font-size:10.5px;text-transform:uppercase;letter-spacing:.05em;padding:4px 5px;border-bottom:1px solid var(--edge)}td{padding:4px 5px;border-bottom:1px solid #1d2532;vertical-align:top}
  .f-discretion{color:var(--bad)}.f-syndicate{color:#f0a83c}.f-thin{color:var(--dim)}.f-stands{color:var(--ok)}
  details summary{cursor:pointer;color:var(--sea);margin:6px 0}
  footer{padding:10px 18px 24px;color:var(--dim);font-size:12px;max-width:1200px;margin:0 auto}footer a{color:var(--sea);text-decoration:none}
</style>
<header><h1>The tribunal of Troy</h1><p>Two benches. Troy's judge is Antenor; the fleet's is Nestor. A hundred acts each, a hundred votes on the same test, a hundred verdicts, one cause each, and one question at the end of each. Every act, vote and verdict is a file in the yard; this page is only the reading of them.</p></header>
<main>${benches.map(section).join('\n')}</main>
<footer>The test is the first lesson's, in <a href="school.html">the school</a> and <a href="descent.html">the ground landing</a>; the same routine runs over the ledger in <a href="ledger/explorer.html">the explorer</a>. Priam's council sits in <a href="troy.html">Troy</a>; the princes hold the wall in <a href="siege.html">the siege</a>. <a href="arcade.html">← the arcade</a> · <a href="index.html">the yard</a></footer>
`;
writeFileSync('tribunal.html', html);
for (const R of benches) console.log(`${R.B.title}: ${R.dirs.map(d => readdirSync(d).length).join('/')} files · king of kings ${R.king.name} (${R.ranked.map(a => `${a.name} ${a.n}`).join(', ')}) · ${R.againstHome} on the home side, ${R.againstOther} on the other`);
console.log(`wrote tribunal.html (${html.length} bytes)`);

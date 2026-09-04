#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   quests.mjs — compiles templates-quest/*.json into quests.js.

   WHAT A QUEST IS, and the template is the definition rather than a note about
   one. Four required fields, and each answers a question a job has to answer
   before anybody can take it:

     giver     who wants it, and why they cannot do it themselves. A quest
               with no giver is a chore.
     object    the thing you do, one imperative sentence. If it needs two,
               it is two quests.
     done      how somebody ELSE knows it is finished. Not how you feel about
               it — an observable another person can check.
     produces  what exists afterwards that did not before — A LIST, because
               some quests genuinely yield two things and an earlier version
               smuggled both into one string with an "and" in it.

   THE YIELD IS A COUNT, NOT A RATING, and the distinction is the whole reason
   it is allowed at all. A quest that produces two artifacts is +1 +1, written
   +2, and doing it is EXACTLY equivalent to doing two quests that produce one
   each. There is no efficiency in it, no bonus, and nothing to optimise
   towards: you cannot rank a +2 above two +1s because they are equal by
   construction. Difficulty is a ranking and stays banned. A count of outputs
   is a fact about the work.

   AND THE THREE ANTI-RECURSION RULES, which are the reason this is a
   generator and not a list. A quest board that can grow by being read is a
   loop with a story on it, and the failure is quiet: the board fills with
   work about the board.

     1 `produces` MAY NEVER BE A QUEST, an entry, or a job. A quest whose
       output is more quests has no bottom. This check exists because the
       first draft of guild.html generated one job per knowledge-base entry
       and boasted that writing an entry would write a job — which is exactly
       the loop, shipped as a feature.

     2 `done` MUST NOT NAME ANOTHER QUEST. If verifying A requires finishing
       B, that is a dependency, and dependencies go in `requires` where they
       can be checked, not in the completion condition where they cannot.

     3 `requires` MUST BE ACYCLIC AND NO DEEPER THAN THREE. A chain has to
       terminate, and a newcomer standing at the top of one has to be able to
       see the bottom.

   Plus the +1 law, same as everywhere: no quest carries points, a score, a
   tier or a difficulty. A quest board with a difficulty rating is a ladder.

       node quests.mjs
   ═══════════════════════════════════════════════════════════════════════════ */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'templates-quest';
const BANNED = /\b(quest|entry|entries|job|jobs)\b/i;
const kb = existsSync('kb.json')
  ? new Set(JSON.parse(readFileSync('kb.json', 'utf8')).entries.map((e) => e.id))
  : null;

const files = readdirSync(DIR).filter((f) => f.endsWith('.json')).sort();
const all = files.map((f) => JSON.parse(readFileSync(join(DIR, f), 'utf8')));
const byId = new Map(all.map((q) => [q.id, q]));
const out = [];
let fatal = 0;

for (const q of all) {
  const errs = [];
  for (const k of ['giver', 'object', 'done', 'produces'])
    if (!q[k]) errs.push(`missing ${k}`);

  /* the yield: one or two artifacts, listed separately */
  if (!Array.isArray(q.produces))
    errs.push('`produces` must be a list — one entry per artifact');
  else {
    if (q.produces.length < 1 || q.produces.length > 2)
      errs.push(`yields ${q.produces.length} — a quest produces one artifact or two, never more`);
    q.produces.forEach((v, i) => {
      if (!v || !v.trim()) errs.push(`produces[${i}] is empty`);
      if (v.toLowerCase().split(/[^a-z]+/).includes('and'))
        errs.push(`produces[${i}] contains "and" — if it is two things, list them as two`);
    });
  }

  /* the +1 law */
  for (const k of ['points', 'score', 'tier', 'difficulty', 'xp', 'reward'])
    if (k in q) errs.push(`carries "${k}" — no quest may be worth more than another`);

  /* rule 1 — output may not be more work about the board */
  (Array.isArray(q.produces) ? q.produces : [q.produces]).forEach((v) => {
    if (v && BANNED.test(v))
      errs.push(`produces "${v}" — a quest may not produce quests, entries or jobs`);
  });

  /* rule 2 — completion may not depend on other work */
  if (q.done && /\bquest\b/i.test(q.done))
    errs.push('`done` names a quest — put dependencies in `requires`, not in the completion condition');

  /* rule 3 — acyclic, and shallow */
  const seen = [];
  const depth = (id, d = 0) => {
    if (d > 3) { errs.push(`requires chain deeper than 3 at "${id}"`); return d; }
    if (seen.includes(id)) { errs.push(`cycle: ${[...seen, id].join(' → ')}`); return d; }
    const r = byId.get(id);
    if (!r) { errs.push(`requires "${id}", which does not exist`); return d; }
    seen.push(id);
    const out = Math.max(d, ...(r.requires || []).map((n) => depth(n, d + 1)));
    seen.pop();
    return out;
  };
  const d = Math.max(0, ...(q.requires || []).map((n) => depth(n, 1)));

  if (q.entry && kb && !kb.has(q.entry))
    errs.push(`entry "${q.entry}" is not in kb.json`);

  const tag = errs.length ? 'REFUSED' : 'ok';
  /* a validator that crashes on bad input is not a validator — everything
     below tolerates `produces` being the wrong shape, because that is one of
     the shapes it exists to reject. */
  const made = Array.isArray(q.produces) ? q.produces
             : q.produces ? [String(q.produces)] : [];
  const yield_ = Array.isArray(q.produces) ? q.produces.length : 0;
  console.log(`${tag.padEnd(8)} ${q.id.padEnd(22)} ${(q.layer || '?').padEnd(17)} ` +
    `depth ${d} · ${yield_ ? '+1 '.repeat(yield_).trim() : '—'}` +
    (yield_ > 1 ? ` = +${yield_}` : '') + ` · ${made.join(' · ')}`);
  errs.forEach((e) => console.log(`         ✗ ${e}`));
  if (errs.length) { fatal++; continue; }
  q._depth = d; q._yield = q.produces.length;
  out.push(q);
}

if (fatal) {
  console.log(`\n${fatal} refused. quests.js not written — a board that can grow ` +
    `by being read fills up with work about the board.`);
  process.exit(1);
}

writeFileSync('quests.js',
`/* Generated by quests.mjs from ${DIR}/ — do not edit, edit the JSON.
   ${out.length} quests, yielding ${out.reduce((a, q) => a + q._yield, 0)}
   artifacts between them. None produces a quest, an entry or a job; no
   completion condition names another quest; the requires graph is acyclic and
   no deeper than three. Nothing carries points, a tier or a difficulty.

   A quest yields +1 or +1 +1, written +2 — a COUNT of artifacts, not a rating.
   Doing one +2 is exactly equivalent to doing two +1s, so there is nothing to
   optimise towards and nothing to rank. */
window.QUESTS = ${JSON.stringify(out)};
`);

const roots = out.filter((q) => !(q.requires || []).length).length;
const total = out.reduce((a, q) => a + q._yield, 0);
const twos = out.filter((q) => q._yield === 2).length;
console.log(`\nquests.js · ${out.length} quests · ${total} artifacts · ` +
  `${out.length - twos} at +1, ${twos} at +2`);
console.log(`  ${roots} need nothing first · max depth ${Math.max(0, ...out.map((q) => q._depth))}`);
console.log('  a +2 is two artifacts, not a harder quest — two +1s are the same thing');

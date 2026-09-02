#!/usr/bin/env node
/* attack.mjs — the syndicate's own tactics, run against itself, from templates.

   Every attack in ledger/templates-attack/ is data: a name, the tactic in plain
   language, an expected outcome, and two response templates (what to say
   when the defense holds, what to say when it doesn't). This file supplies
   the one thing a JSON file cannot — the actual mechanics of trying each
   attack against real code — and reports which template's response fires.

   A KNOWLEDGE TREE, not just a list. Each template may `requires` other
   template ids; runAll() only attempts an attack once everything it depends
   on has been run and has held. forged-root-syndication requires the three
   basic tamper-detection attacks: it is the one item in this set that is
   NOT caught by a ledger checking itself, and that fact only means
   something once you've established that a ledger DOES catch everything
   happening inside its own file. Skipping straight to it without that
   context is how "the auditor has to check by hand" gets mistaken for "the
   chain is broken," when the honest reading is the opposite: everything
   inside one file is provably safe, and only a claim about ANOTHER file
   needs a second party to check it.

   json-injectable, on purpose: `apply(id, params)` fills a template's own
   response text with the real values an attack produced — the ledger's
   name, the actual error message, the sequence number — so the report is
   built from what happened, not written in advance of it.

     node attack.mjs run                        run every template, report
     node attack.mjs list                       show the tree, nothing executed */
import { readFileSync, readdirSync, writeFileSync, mkdtempSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { Ledger, keygen, loadKey } from './ledger.mjs';
import { genkey, splitSecret, reshare, combineShares, seal, open } from './keyring.mjs';
import { verifyCrossing } from './syndicate.mjs';

/* resolved against this file, not the working directory — this module is imported by tests and run
   directly, from ledger/ and from the project root both, and templates-attack/ always sits beside it */
const DIR = join(dirname(fileURLToPath(import.meta.url)), 'templates-attack');
export const load = (dir = DIR) => readdirSync(dir).filter(f => f.endsWith('.json')).map(f => JSON.parse(readFileSync(join(dir, f), 'utf8'))).sort((a, b) => a.order - b.order);

function freshLedger(name = 'the sock ledger') {
  const dir = mkdtempSync(join(tmpdir(), 'atk-'));
  const authority = ['a', 'b', 'c'].map(n => { const k = keygen(dir, n); return { name: n, id: k.id, pub: k.pub }; });
  const writer = keygen(dir, 'writer');
  const l = Ledger.init(dir, { name, authority, quorum: 2, writers: [{ name: 'writer', id: writer.id, pub: writer.pub }], years: 200 });
  const owner = keygen(dir, 'owner');
  l.append('account', { id: 'sock-drawer', name: 'Sock Drawer', owner: { name: 'owner', id: owner.id, pub: owner.pub } }, [loadKey(dir, 'a')]);
  return { dir, l, key: n => loadKey(dir, n) };
}
const rewrite = (dir, lines) => writeFileSync(join(dir, 'ledger.jsonl'), lines.map(l => JSON.stringify(l)).join('\n') + '\n');
const readLines = dir => readFileSync(join(dir, 'ledger.jsonl'), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));

/* every function returns { ok, detail }: ok = true means the defense held exactly as the
   template's `expect` field declares — never "the attack worked" and never "nothing happened" */
export const ATTACKS = {
  'tampered-amount': () => {
    const env = freshLedger();
    env.l.append('issue', { tranche: 1, to: 'sock-drawer', amount: 1000 }, [env.key('a'), env.key('b')]);
    const lines = readLines(env.dir); const idx = lines.findIndex(e => e.type === 'issue');
    lines[idx].body.amount *= 5; // the hash is left exactly as it was — that's the whole attack
    rewrite(env.dir, lines);
    const v = new Ledger(env.dir).verify();
    return { ok: !v.ok, detail: v.errors[0] || '(no error reported — this would be the failure)' };
  },
  'dropped-line': () => {
    const env = freshLedger();
    env.l.append('note', { entry: 1 }, [env.key('writer')]);
    env.l.append('note', { entry: 2 }, [env.key('writer')]);
    const lines = readLines(env.dir); lines.splice(lines.length - 2, 1); // drop the middle note
    rewrite(env.dir, lines);
    const v = new Ledger(env.dir).verify();
    return { ok: !v.ok, detail: v.errors[0] || '(no error reported — this would be the failure)' };
  },
  'forged-signature': () => {
    const env = freshLedger();
    const e1 = env.l.append('note', { entry: 1 }, [env.key('writer')]);
    const e2 = env.l.append('note', { entry: 2 }, [env.key('writer')]);
    const lines = readLines(env.dir);
    const l1 = lines.find(e => e.seq === e1.seq), l2 = lines.find(e => e.seq === e2.seq);
    l2.sigs = l1.sigs; // a real signature, just not one made over this event
    rewrite(env.dir, lines);
    const v = new Ledger(env.dir).verify();
    return { ok: !v.ok, detail: v.errors.find(x => x.includes('signature')) || v.errors[0] || '(no error reported — this would be the failure)' };
  },
  'insufficient-quorum-amend': () => {
    const env = freshLedger();
    try { env.l.append('amend', { rules: { cap: 999999999 } }, [env.key('a')]); return { ok: false, detail: 'accepted with one signer — this would be the failure' }; }
    catch (e) { return { ok: true, detail: e.message }; }
  },
  'insufficient-quorum-syndication': () => {
    const env = freshLedger();
    try { env.l.append('syndication', { direction: 'in', counterpart: 'somewhere else', atSeq: 1, since: 0, count: 1, root: 'f'.repeat(64) }, [env.key('a')]); return { ok: false, detail: 'accepted with one signer — this would be the failure' }; }
    catch (e) { return { ok: true, detail: e.message }; }
  },
  'mismatched-epoch-shares': () => {
    const dek = genkey(), before = splitSecret(dek, { shares: 3, threshold: 2 });
    const after = reshare([before[0], before[1]], { shares: 3, threshold: 2 });
    try { combineShares([before[2], after[2]]); return { ok: false, detail: 'combined mismatched shares without error — this would be the failure' }; }
    catch (e) { return { ok: true, detail: e.message }; }
  },
  'wrong-key-open': () => {
    const key = genkey(), other = genkey(), sealed = seal(key, Buffer.from('the left sock, removed at 3:07am'));
    try { open(other, sealed); return { ok: false, detail: 'opened under the wrong key — this would be the failure' }; }
    catch (e) { return { ok: true, detail: e.message }; }
  },
  'forged-root-syndication': () => {
    const earth = freshLedger('the sock ledger'), moon = freshLedger('the lunar bank');
    earth.l.append('note', { sock: 'one, real, on earth' }, [earth.key('writer')]);
    const fakeRoot = 'f'.repeat(64); // invented, not copied — the point is that a target cannot tell the difference on its own
    moon.l.append('syndication', { direction: 'in', counterpart: earth.l.rules.name, atSeq: earth.l.events.length, since: 0, count: earth.l.events.length, root: fakeRoot }, [moon.key('a'), moon.key('b')]);
    const ledgerAlone = moon.l.verify().ok; // this SHOULD be true: the moon's own file is internally consistent
    const audit = verifyCrossing(earth.l, moon.l, earth.l.rules.name);
    const auditorCaught = !audit.ok;
    return { ok: ledgerAlone === true && auditorCaught === true, ledgerAlone, auditorCaught,
      detail: ledgerAlone
        ? (auditorCaught ? `verifyCrossing found: ${audit.results[0].reason}` : 'the auditor FAILED to catch a forged root — this would be the real failure')
        : 'the ledger unexpectedly rejected a root it has no way to check — this would also be wrong' };
  },
};

const fill = (tmpl, vars) => tmpl.replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] != null ? vars[k] : `{{${k}}}`));

/* the knowledge tree: a stable topological order so a template never runs before what it requires */
function ordered(templates) {
  const byId = Object.fromEntries(templates.map(t => [t.id, t])); const seen = new Set(); const out = [];
  const visit = (t, chain) => { if (seen.has(t.id)) return; if (chain.includes(t.id)) throw new Error('circular requires: ' + chain.concat(t.id).join(' -> '));
    for (const r of t.requires || []) { const dep = byId[r]; if (!dep) throw new Error(`${t.id} requires unknown template ${r}`); visit(dep, [...chain, t.id]); } seen.add(t.id); out.push(t); };
  for (const t of templates) visit(t, []); return out;
}

/* `templates` is injectable — real callers omit it and get load(dir); tests pass a synthetic
   list to exercise the knowledge-tree gating without touching the real files on disk */
export function runAll(dir = DIR, templates = null) {
  const learned = new Set(); const results = [];
  for (const t of ordered(templates || load(dir))) {
    const missing = (t.requires || []).filter(r => !learned.has(r));
    if (missing.length) { results.push({ id: t.id, name: t.name, skipped: true, reason: `requires ${missing.join(', ')} to hold first` }); continue; }
    let outcome; try { outcome = ATTACKS[t.id](); } catch (e) { outcome = { ok: false, detail: 'the attack itself threw before it could finish: ' + e.message }; }
    if (outcome.ok) learned.add(t.id);
    const text = fill(t.response[outcome.ok ? 'pass' : 'fail'], { ledger: t.wovenBy, seq: outcome.seq, detail: outcome.detail, auditor: 'the auditor' });
    results.push({ id: t.id, name: t.name, kind: t.kind, ok: outcome.ok, text, outcome });
  }
  return results;
}

/* --------------------------------------------------------------------------------------------------- cli */
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  const [, , cmd, arg] = process.argv;
  if (cmd === 'list') { for (const t of ordered(load())) console.log(`${t.id}${t.requires && t.requires.length ? '  (requires: ' + t.requires.join(', ') + ')' : ''} — ${t.name}`); }
  else if (cmd === 'run') { const r = runAll(); let bad = 0;
    for (const x of r) { console.log(`${x.skipped ? '…' : x.ok ? '✓' : '✗'} ${x.id}: ${x.skipped ? x.reason : x.text}`); if (!x.skipped && !x.ok) bad++; }
    console.log(`\n${r.filter(x => x.ok).length} held, ${r.filter(x => x.skipped).length} skipped, ${bad} failed, of ${r.length}.`);
    process.exit(bad ? 1 : 0); }
  else { console.error('commands: list | run'); process.exit(2); }
}

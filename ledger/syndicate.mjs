#!/usr/bin/env node
/* syndicate.mjs — carrying one ledger's history to another's, the way the docket
   describes it: "the chain is syndicated between worlds every six months... between
   syndications each side keeps its own events and reconciles at the next."

   TWO SOVEREIGN CHAINS, ONE CROSSING. The Earth sock ledger and a lunar one are not
   one ledger split across two places; they are two independent `Ledger` instances,
   each with its own custodians, its own quorum, its own history that the other side
   cannot see or verify past what crosses. A syndication carries a Merkle root and a
   count from one chain and records it, as a `syndication` event, on the other —
   never the events themselves. What crosses is proof that a span of history exists
   and is unbroken, not the history, which is the same shape as key-succession's
   "the hash, never the secret": a chain can vouch for the fact of the other chain
   without taking custody of its content.

   WHY NOT MERGE THE TWO FILES. Two chains merged into one lose the property that
   made each trustworthy on its own: a custodian on the Moon can no longer verify the
   Earth side's signatures without Earth's public keys and Earth's whole history, and
   a bug or compromise on one side would corrupt the shared file for both. Kept
   separate and cross-referenced by root, each side stays independently replayable
   and independently wrong-or-right; a syndication is a pointer, not a shared spine.

   SO BIG IT DOESN'T CARE. Run this against a lunar ledger that has been accumulating
   its own, unrelated history for the six months between syndications, and the
   arithmetic says the honest thing on its own: Earth's contribution is whatever
   share of the total it actually is, usually a rounding error, and the Moon's own
   count doesn't pause or acknowledge it beyond recording the root. That indifference
   is not a design flourish here — carry() computes and reports the real share of a
   real, independently-replayed ledger, not a synthetic number standing in for one.

     node syndicate.mjs carry <sourceDir> <targetDir> --signer <name...>
                         (signers are TARGET custodians; the target records what it received)
     node syndicate.mjs carry <sourceDir> <targetDir> --signer <n> --mirror --signer2 <n>
                         (also records an 'out' syndication on the source, signed by --signer2 there)
     node syndicate.mjs status <sourceDir> <targetDir>   what would cross, without crossing it */
import { Ledger } from './ledger.mjs';

/* what's new on `source` since the last syndication FROM it recorded on `target` */
function pending(source, target, counterpart) {
  const st = target.replay();
  const prior = (st.syndications || []).filter(s => s.direction === 'in' && s.counterpart === counterpart);
  const since = prior.length ? Math.max(...prior.map(s => s.atSeq)) : 0;
  return { since, atSeq: source.events.length, count: source.events.length - since, root: source.merkleRoot() };
}

/* the actual crossing: the target records what arrived (an 'in' event, quorum-signed there);
   if mirrorSigners is given, the source ALSO records that it sent (an 'out' event, signed there) */
export function carry(source, target, { sourceName, targetName, targetSigners, sourceSigners = null, note = '' }) {
  const p = pending(source, target, sourceName);
  if (p.count <= 0) return { crossed: false, reason: 'nothing new since the last syndication', ...p };
  const inEvent = target.append('syndication', { direction: 'in', counterpart: sourceName, atSeq: p.atSeq, since: p.since, count: p.count, root: p.root, note }, targetSigners);
  let outEvent = null;
  if (sourceSigners) outEvent = source.append('syndication', { direction: 'out', counterpart: targetName, atSeq: p.atSeq, since: p.since, count: p.count, root: p.root, note }, sourceSigners);
  const targetTotal = target.events.length;
  return { crossed: true, ...p, inSeq: inEvent.seq, outSeq: outEvent && outEvent.seq, targetTotalAfter: targetTotal, shareOfTarget: p.count / targetTotal };
}

export function status(source, target, counterpart) { return pending(source, target, counterpart); }

/* THE GAP A FORGED CROSSING LIVES IN. check() on a `syndication` event can only confirm the event's
   OWN shape — a counterpart name, a root, a count — because the target ledger has no access to the
   source and cannot ask it anything at replay time; that is the entire point of two sovereign chains.
   So a target's quorum can be talked into recording a root that was never actually on the source, and
   the target's own verify() will call that healthy forever — it is only checking that the target is
   consistent with what the target was told, not that what it was told is true. That is TRUST, not
   verification, and pretending otherwise is the actual vulnerability. The one way to close it is to
   go get the source and check: given both ledgers in hand, recompute the source's root at the exact
   sequence number the target claims and compare. This function is that check — an AUDITOR'S tool, run
   with both chains present, not something either chain can do to itself alone. */
export function verifyCrossing(source, target, counterpart) {
  const st = target.replay();
  const claims = (st.syndications || []).filter(s => s.direction === 'in' && s.counterpart === counterpart);
  const results = claims.map(c => {
    if (c.atSeq > source.events.length) return { ...c, ok: false, reason: `claims ${c.atSeq} events but the source only has ${source.events.length}` };
    const actual = source.merkleRoot(c.atSeq);
    return actual === c.root ? { ...c, ok: true } : { ...c, ok: false, reason: `recorded root does not match the source's actual root at #${c.atSeq}`, actual };
  });
  return { counterpart, claims: results.length, ok: results.every(r => r.ok), results };
}

/* --------------------------------------------------------------------------------------------------- cli */
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  const [, , cmd, sourceDir, targetDir, ...rest] = process.argv; const flags = {};
  for (let i = 0; i < rest.length; i++) { if (rest[i].startsWith('--')) { const k = rest[i].slice(2); (flags[k] = flags[k] || []).push(rest[i + 1]); i++; } }
  const { loadKey } = await import('./ledger.mjs');
  try {
    const source = new Ledger(sourceDir), target = new Ledger(targetDir);
    const sourceName = source.rules.name, targetName = target.rules.name;
    if (cmd === 'status') console.log(JSON.stringify({ from: sourceName, to: targetName, ...status(source, target, sourceName) }, null, 1));
    else if (cmd === 'verify-crossing') { const r = verifyCrossing(source, target, sourceName); console.log(JSON.stringify(r, null, 1)); if (!r.ok) process.exit(1); }
    else if (cmd === 'carry') {
      const targetSigners = (flags.signer || []).map(n => loadKey(targetDir, n));
      const sourceSigners = flags.mirror ? (flags.signer2 || []).map(n => loadKey(sourceDir, n)) : null;
      const r = carry(source, target, { sourceName, targetName, targetSigners, sourceSigners, note: (flags.note || [''])[0] });
      console.log(JSON.stringify({ from: sourceName, to: targetName, ...r }, null, 1));
    } else { console.error('commands: status <sourceDir> <targetDir> | carry <sourceDir> <targetDir> --signer <target-custodian>... [--mirror --signer2 <source-custodian>...] | verify-crossing <sourceDir> <targetDir>'); process.exit(2); }
  } catch (e) { console.error('no:', e.message); process.exit(1); }
}

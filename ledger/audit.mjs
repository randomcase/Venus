#!/usr/bin/env node
/* audit.mjs — the b2p2p2b test, run by the machine over the real ledger.

   The lesson's question: is there any single party whose removal disconnects
   the issuers from the redeemers? And the thing that question cannot see: a
   pair who individually cannot stop the flow and jointly can — a syndicate,
   if they move together. This file builds the flow graph from the ledger's
   own events, computes both, checks that the ends are plural, and then says
   the two uncomfortable things the other lessons demand: this ledger stores
   the tranche of every unit, so its units are distinguishable; and a
   transfer is valid only after a read, so by the third lesson it is not a
   decentralised coin. It also names what the quorum vote is in these terms.

     node audit.mjs <dir>                 the audit as JSON
     import { chokes, pairs, audit }      the routines, for the explorer and the tests

   Graph shape: {nodes: [...ids], edges: [[a, b], ...]} treated as undirected
   for reachability, because a refusal on a hop cuts both ways. */
import { Ledger } from './ledger.mjs';

export function reaches(graph, from, to, removed = []) {
  const gone = new Set(removed); if (gone.has(from) || gone.has(to)) return false; const adj = {};
  for (const n of graph.nodes) adj[n] = []; for (const [a, b] of graph.edges) { if (adj[a] && adj[b]) { adj[a].push(b); adj[b].push(a); } }
  const seen = new Set([from]), q = [from]; while (q.length) { const n = q.shift(); if (n === to) return true; for (const m of adj[n] || []) if (!seen.has(m) && !gone.has(m)) { seen.add(m); q.push(m); } } return false;
}
export function chokes(graph, from, to) { if (!reaches(graph, from, to)) return []; return graph.nodes.filter(n => n !== from && n !== to && !reaches(graph, from, to, [n])).sort(); }
export function pairs(graph, from, to) { if (!reaches(graph, from, to)) return []; const single = new Set(chokes(graph, from, to)); const cand = graph.nodes.filter(n => n !== from && n !== to && !single.has(n)).sort(); const out = [];
  for (let i = 0; i < cand.length; i++) for (let j = i + 1; j < cand.length; j++) if (!reaches(graph, from, to, [cand[i], cand[j]])) out.push([cand[i], cand[j]]); return out; }

/* the ledger as a graph: every issuer and redeemer account, every peer, and an
   edge for every transfer or redemption that actually happened; issuance edges
   join a super-source to the accounts that received issued units */
export function graphOf(l) { const st = l.replay(); const nodes = new Set(['ISSUANCE', 'REDEMPTION']); const edges = []; const seen = new Set();
  const add = (a, b) => { const k = a < b ? a + '|' + b : b + '|' + a; if (!seen.has(k)) { seen.add(k); edges.push([a, b]); } };
  for (const a of Object.values(st.accounts)) { nodes.add(a.id); if (a.role === 'issuer') add('ISSUANCE', a.id); if (a.role === 'redeemer') add(a.id, 'REDEMPTION'); }
  for (const e of l.events) { if (e.type === 'issue') add('ISSUANCE', e.body.to); if (e.type === 'transfer' || e.type === 'redeem') add(e.body.from, e.body.to); }
  return { nodes: [...nodes], edges, accounts: st.accounts }; }

/* do two parties move together? the share of the days on which either acted
   where both acted. 1 is lockstep, 0 is never. Thin redundancy is fine; a pair
   in step is the other thing, and no member of it has to know. */
export function inStep(l, a, b) { const days = {}; for (const e of l.events) { if (!['transfer', 'redeem'].includes(e.type)) continue; const d = e.time.slice(0, 10); days[d] = days[d] || new Set(); days[d].add(e.body.from); days[d].add(e.body.to); }
  const ds = Object.values(days).filter(s => s.has(a) || s.has(b)); if (!ds.length) return { days: 0, together: 0, ratio: 0 }; const together = ds.filter(s => s.has(a) && s.has(b)).length; return { days: ds.length, together, ratio: +(together / ds.length).toFixed(2) }; }

export function audit(l) {
  const g = graphOf(l), st = l.replay(), r = st.rules; const accounts = Object.values(st.accounts);
  const issuers = accounts.filter(a => a.role === 'issuer').map(a => a.id), redeemers = accounts.filter(a => a.role === 'redeemer').map(a => a.id), peers = accounts.filter(a => a.role === 'peer').map(a => a.id);
  const connected = reaches(g, 'ISSUANCE', 'REDEMPTION');
  const c = connected ? chokes(g, 'ISSUANCE', 'REDEMPTION') : [], p = connected ? pairs(g, 'ISSUANCE', 'REDEMPTION') : [];
  const pairsWithStep = p.map(([a, b]) => ({ pair: [a, b], ...inStep(l, a, b) }));
  const n = r.quorum.keys.length, m = r.quorum.m, blockers = n - m + 1;
  const intervalDays = (r.interval && r.interval.days) || 182.5, elapsedDays = (Date.now() - new Date(r.schedule.start)) / 86400000, due = Math.floor(elapsedDays / intervalDays), made = l.events.filter(e => e.type === 'checkpoint').length;
  const syndication = { intervalDays, due, made, onTime: made >= due, nextInDays: Math.ceil((due + 1) * intervalDays - elapsedDays), verdict: `A checkpoint is due every ${intervalDays} days: the block that crosses when the window opens. ${due} due so far, ${made} made${made >= due ? ': on time' : ': BEHIND by ' + (due - made)}. Between windows each side keeps its own file; at the window the roots are compared and the later one carries both.` };
  const combos = k => { const out = []; const names = r.quorum.keys.map(x => x.name); const rec = (start, acc) => { if (acc.length === k) return out.push(acc.slice()); for (let i = start; i < names.length; i++) { acc.push(names[i]); rec(i + 1, acc); acc.pop(); } }; rec(0, []); return out; };
  return {
    generated: new Date().toISOString(), events: l.events.length,
    model: { issuers, peers, redeemers, connected, note: connected ? 'issued units can reach a redeemer through the recorded hops' : 'no path from issuance to redemption yet: a token nobody will redeem stops moving' },
    ends: { issuersPlural: issuers.length >= 2, redeemersPlural: redeemers.length >= 2, verdict: issuers.length >= 2 && redeemers.length >= 2 ? 'both ends plural: the model is decentralised at the ends' : `the ${issuers.length < 2 ? 'first' : ''}${issuers.length < 2 && redeemers.length < 2 ? ' and last' : redeemers.length < 2 ? 'last' : ''} b is singular: the choke point has moved to the end where it is harder to see` },
    chokes: { nodes: c, verdict: c.length ? `${c.length} single part${c.length === 1 ? 'y' : 'ies'} can stop the flow alone: ${c.join(', ')}. A choke point is a discretion, and a discretion is where a syndicate attaches.` : connected ? 'no single party can stop the flow' : 'not applicable' },
    pairs: { list: pairsWithStep, verdict: p.length ? `${p.length} minimal cutting pair${p.length === 1 ? '' : 's'} that single deletion cannot see: ${p.map(x => x.join(' + ')).join('; ')}. ${pairsWithStep.some(x => x.ratio >= 0.5) ? 'At least one of them moves in step on the record: that is the syndicate shape.' : 'None of them moves in step on the record yet: thin redundancy, which is fine.'}` : connected ? 'no pair can cut the flow: three independent routes or more' : 'not applicable' },
    fungible: { distinguishable: true, stored: ['tranche'], verdict: `Units of the same denomination differ in something the ledger stores: the tranche. ${r.tranches} tranches are ${r.tranches} denominations, and a merchant can price the spread between them. To be fungible, drop the tranche from transfers and keep it only on issuance.` },
    reads: { count: 1, what: 'a transfer is valid only after replaying balances', verdict: 'By the third lesson this is a ledger coin, not a decentralised coin: validity needs a read, and the read is this file. What it buys is double-spend protection; what it costs is that whoever holds the file holds a discretion, which is why the file is signed, chained, and copied.' },
    syndication,
    voting: { quorum: `${m} of ${n}`, blockers, cuttingSets: combos(blockers), verdict: `Issuance needs ${m} of ${n} custodians, so any ${blockers} refusing together stop it. Every such set is a minimal cutting pair of the issuance hop by construction: the custodians' vote is syndicate-shaped, and the only question left is whether they move together. The rule that softens it is already in genesis: issuance follows the schedule, so a refusal has nothing to decide except timing. Make it fully automatic (issue on the schedule, no vote) and the discretion is spent once, at writing time, which is the fourth lesson.` },
  };
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) console.log(JSON.stringify(audit(new Ledger(process.argv[2] || 'bank')), null, 1));

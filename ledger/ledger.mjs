#!/usr/bin/env node
/* ledger.mjs — an append-only ledger meant to outlive its custodians.

   One event per line in ledger.jsonl. Every event carries the hash of the one
   before it, its own hash under two algorithms (SHA-256 and SHA3-256, because
   one of them will not make it to 2226), and Ed25519 signatures from the keys
   the rules require. Balances are never stored; they are replayed. A
   checkpoint carries the Merkle root of everything so far and a copy of the
   schema, so a text file and this description are enough to verify it.

   Rules live in the genesis event and can only change by an `amend` event
   signed by the quorum: tranches (21 of 21,000,000 by default), the issuance
   schedule (a straight line over 200 years), the quorum (m of n authority
   keys), and which keys may write notes.

     node ledger.mjs init <dir> --name "Heze bank" --authority alice,bob,carol --quorum 2
     node ledger.mjs keygen <dir> <name>
     node ledger.mjs account <dir> <id> "<name>" <ownerKey> --signer <authorityKey>
     node ledger.mjs issue <dir> <tranche> <accountId> <amount> --signer alice --signer bob
     node ledger.mjs transfer <dir> <from> <to> <tranche> <amount> --signer <ownerKey>
     node ledger.mjs note <dir> '<json>' --signer <anyKey>
     node ledger.mjs checkpoint <dir> --signer alice --signer bob
     node ledger.mjs verify <dir>
     node ledger.mjs balances <dir>

   Amounts are whole minor units (a token is divisible by 100 for accounting,
   never extended). Nothing here talks to a network. */
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash, generateKeyPairSync, sign as edSign, verify as edVerify, createPublicKey, createPrivateKey } from 'node:crypto';

export const SCHEMA = 'venus-ledger/1';
const canon = v => Array.isArray(v) ? '[' + v.map(canon).join(',') + ']' : v && typeof v === 'object' ? '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}' : JSON.stringify(v);
const sha256 = s => createHash('sha256').update(s).digest('hex');
const sha3 = s => createHash('sha3-256').update(s).digest('hex');
export const keyId = pubDerB64 => sha256(pubDerB64).slice(0, 16);
export const YEAR = 365.25 * 24 * 3600 * 1000;

/* ------------------------------------------------------------------ keys */
export function keygen(dir, name) {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const pub = publicKey.export({ type: 'spki', format: 'der' }).toString('base64');
  mkdirSync(join(dir, 'keys'), { recursive: true });
  writeFileSync(join(dir, 'keys', name + '.key'), privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600 });
  writeFileSync(join(dir, 'keys', name + '.pub'), pub + '\n');
  return { name, id: keyId(pub), pub };
}
export const loadKey = (dir, name) => ({ name, priv: createPrivateKey(readFileSync(join(dir, 'keys', name + '.key'))), pub: readFileSync(join(dir, 'keys', name + '.pub'), 'utf8').trim() });
export const listKeys = dir => existsSync(join(dir, 'keys')) ? readdirSync(join(dir, 'keys')).filter(f => f.endsWith('.pub')).map(f => { const pub = readFileSync(join(dir, 'keys', f), 'utf8').trim(); return { name: f.slice(0, -4), id: keyId(pub), pub }; }) : [];

/* ---------------------------------------------------------------- ledger */
export class Ledger {
  constructor(dir) { this.dir = dir; this.file = join(dir, 'ledger.jsonl'); this.events = existsSync(this.file) ? readFileSync(this.file, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)) : []; }

  static init(dir, { name = 'the bank', tranches = 21, cap = 21000000, divisible = 100, years = 200, authority = [], quorum = 2, writers = [], start = new Date().toISOString(), intervalDays = 182.5 } = {}) {
    mkdirSync(dir, { recursive: true }); if (existsSync(join(dir, 'ledger.jsonl'))) throw new Error('already initialised');
    if (authority.length < quorum) throw new Error('quorum larger than the number of authority keys');
    const l = new Ledger(dir);
    const rules = { schema: SCHEMA, name, tranches, cap: cap * divisible, divisible, schedule: { start, years, note: 'cumulative issuance per tranche may not exceed cap × (years elapsed + 1) / years' }, quorum: { m: quorum, keys: authority }, writers,
      interval: { days: intervalDays, note: 'a checkpoint is due every interval: the block that crosses between worlds when the window opens. Between windows the file is the truth on each side; at the window the roots are compared.' },
      note: 'Rules change only by an amend event signed by the quorum. Nothing in this file issues past the cap.' };
    l._append('genesis', rules, [], { skipRules: true }); return l;
  }
  get head() { return this.events.length ? this.events[this.events.length - 1] : null; }
  get rules() { let r = null; for (const e of this.events) { if (e.type === 'genesis') r = { ...e.body }; if (e.type === 'amend') r = { ...r, ...e.body.rules }; } return r; }

  /* replay everything into a state; the only way balances exist */
  replay(upto = this.events.length) {
    const st = { accounts: {}, issued: {}, keys: {}, notes: 0, checkpoints: 0, rules: null, errors: [] };
    for (const e of this.events.slice(0, upto)) {
      const b = e.body;
      if (e.type === 'genesis') { st.rules = { ...b }; for (const k of b.quorum.keys) st.keys[k.id] = { ...k, role: 'authority' }; for (const k of b.writers || []) st.keys[k.id] = { ...k, role: 'writer' }; }
      else if (e.type === 'amend') { st.rules = { ...st.rules, ...b.rules }; if (b.rules.quorum) for (const k of b.rules.quorum.keys) st.keys[k.id] = { ...k, role: 'authority' }; if (b.rules.writers) for (const k of b.rules.writers) st.keys[k.id] = { ...k, role: 'writer' }; }
      else if (e.type === 'account') { st.accounts[b.id] = { id: b.id, name: b.name, owner: b.owner, role: b.role || 'peer', balances: {}, redeemed: 0, opened: e.time }; st.keys[b.owner.id] = { ...b.owner, role: 'owner', account: b.id }; }
      else if (e.type === 'issue') { st.issued[b.tranche] = (st.issued[b.tranche] || 0) + b.amount; const a = st.accounts[b.to]; a.balances[b.tranche] = (a.balances[b.tranche] || 0) + b.amount; }
      else if (e.type === 'transfer') { const f = st.accounts[b.from], t = st.accounts[b.to]; f.balances[b.tranche] -= b.amount; t.balances[b.tranche] = (t.balances[b.tranche] || 0) + b.amount; }
      else if (e.type === 'redeem') { const f = st.accounts[b.from], t = st.accounts[b.to]; f.balances[b.tranche] -= b.amount; t.redeemed += b.amount; st.redeemed = (st.redeemed || 0) + b.amount; }
      else if (e.type === 'rotate-key') { const k = st.keys[b.old]; if (k) { delete st.keys[b.old]; st.keys[b.new.id] = { ...b.new, role: k.role, account: k.account }; if (k.account) st.accounts[k.account].owner = b.new; } }
      else if (e.type === 'key-succession') { st.keyEpochs = st.keyEpochs || []; st.keyEpochs.push({ epoch: st.keyEpochs.length + 1, at: e.time, ...b }); }
      else if (e.type === 'note') st.notes++;
      else if (e.type === 'checkpoint') st.checkpoints++;
    }
    return st;
  }
  allowedIssuance(at = Date.now()) { const r = this.rules; const elapsed = Math.max(0, (new Date(at) - new Date(r.schedule.start)) / YEAR); return Math.min(r.cap, Math.floor(r.cap * (Math.floor(elapsed) + 1) / r.schedule.years)); }

  /* the rule check: what an event needs before it may be appended */
  check(e, st) {
    const b = e.body, sigIds = e.sigs.map(s => s.key), r = st.rules;
    const hasQuorum = () => { const auth = r.quorum.keys.map(k => k.id); return sigIds.filter(id => auth.includes(id)).length >= r.quorum.m; };
    const int = (v, what) => { if (!Number.isInteger(v) || v <= 0) throw new Error(what + ' must be a positive whole number of minor units'); };
    switch (e.type) {
      case 'genesis': if (st.rules) throw new Error('genesis twice'); break;
      case 'amend': case 'checkpoint': if (!hasQuorum()) throw new Error(`${e.type} needs ${r.quorum.m} authority signatures`); break;
      case 'account': if (st.accounts[b.id]) throw new Error('account exists'); if (!hasQuorum() && !sigIds.some(id => st.keys[id]?.role === 'authority')) throw new Error('opening an account needs an authority signature'); break;
      case 'issue': { int(b.amount, 'amount'); if (!(b.tranche >= 1 && b.tranche <= r.tranches)) throw new Error('no such tranche'); if (!st.accounts[b.to]) throw new Error('no such account'); if (!hasQuorum()) throw new Error(`issue needs ${r.quorum.m} authority signatures`);
        const after = (st.issued[b.tranche] || 0) + b.amount, allowed = this.allowedIssuance(e.time); if (after > r.cap) throw new Error('past the cap'); if (after > allowed) throw new Error(`past the schedule: ${allowed} allowed for tranche ${b.tranche} by ${e.time.slice(0, 10)}`); break; }
      case 'transfer': { int(b.amount, 'amount'); const f = st.accounts[b.from], t = st.accounts[b.to]; if (!f || !t) throw new Error('no such account'); if (b.from === b.to) throw new Error('to itself');
        if (!sigIds.includes(f.owner.id)) throw new Error('transfer needs the owner\'s signature'); if ((f.balances[b.tranche] || 0) < b.amount) throw new Error('insufficient balance'); break; }
      case 'redeem': { int(b.amount, 'amount'); const f = st.accounts[b.from], t = st.accounts[b.to]; if (!f || !t) throw new Error('no such account'); if (t.role !== 'redeemer') throw new Error(`${b.to} is not a redeemer; only the last b takes units back`);
        if (!sigIds.includes(f.owner.id)) throw new Error('redeem needs the owner\'s signature'); if ((f.balances[b.tranche] || 0) < b.amount) throw new Error('insufficient balance'); break; }
      case 'rotate-key': { const k = st.keys[b.old]; if (!k) throw new Error('unknown key'); if (k.role === 'authority' ? !hasQuorum() : !sigIds.includes(b.old) && !hasQuorum()) throw new Error('rotation needs the old key or the quorum'); break; }
      /* a SIGNING key rotates one at a time (above) because losing one custodian's
         say-so is survivable. A CONFIDENTIALITY key's custody is a different shape:
         it is split m-of-n (see keyring.mjs) so no single holder, or minority of
         holders, ever sees the whole secret. This event records only the public
         shape of a reshare — the epoch, who holds a share now, the threshold, and a
         hash-commitment per share so a holder can later prove theirs is genuine —
         never the key or a share itself. It needs the full quorum because it is
         changing who could ever reconstruct that secret, which is as consequential
         as amending the rules. */
      case 'key-succession': if (!hasQuorum()) throw new Error('key succession needs the quorum'); if (!(b.threshold >= 1 && b.threshold <= (b.holders || []).length)) throw new Error('threshold must be between 1 and the number of holders'); break;
      case 'note': if (!sigIds.some(id => st.keys[id])) throw new Error('a note needs a signature from a registered key'); break;
      default: throw new Error('unknown event type ' + e.type);
    }
  }

  _append(type, body, signers, { skipRules = false, time = new Date().toISOString() } = {}) {
    const prev = this.head, seq = prev ? prev.seq + 1 : 0;
    const e = { seq, prev: prev ? prev.hash.sha256 : null, prev3: prev ? prev.hash.sha3 : null, time, type, body };
    const payload = canon(e); e.hash = { sha256: sha256(payload), sha3: sha3(payload) };
    e.sigs = signers.map(k => ({ key: keyId(k.pub), alg: 'ed25519', sig: edSign(null, Buffer.from(e.hash.sha256, 'hex'), k.priv).toString('base64') }));
    if (!skipRules) this.check(e, this.replay());
    appendFileSync(this.file, JSON.stringify(e) + '\n'); this.events.push(e); return e;
  }
  append(type, body, signers, opts) { return this._append(type, body, signers, opts); }
  merkleRoot(upto = this.events.length) { let layer = this.events.slice(0, upto).map(e => e.hash.sha256); if (!layer.length) return null; while (layer.length > 1) { const next = []; for (let i = 0; i < layer.length; i += 2) next.push(sha256(layer[i] + (layer[i + 1] || layer[i]))); layer = next; } return layer[0]; }
  checkpoint(signers, extra = {}) { return this._append('checkpoint', { schema: SCHEMA, upto: this.events.length, root: this.merkleRoot(), rootAlg: 'sha256 over sha256 event hashes, pairwise, last duplicated', events: this.events.length, ...extra }, signers); }

  /* verify from the file alone: chain, hashes, signatures, rules, checkpoints */
  verify() {
    const errors = []; let prev = null; const l = new Ledger(this.dir); l.events = [];
    const pubs = {};
    for (const e of this.events) {
      const { hash, sigs, ...rest } = e; const payload = canon(rest);
      if (hash.sha256 !== sha256(payload)) errors.push(`#${e.seq} sha256 mismatch`); if (hash.sha3 !== sha3(payload)) errors.push(`#${e.seq} sha3 mismatch`);
      if ((prev ? prev.hash.sha256 : null) !== e.prev) errors.push(`#${e.seq} chain broken`);
      const st = l.replay();
      if (e.type === 'genesis') { for (const k of [...e.body.quorum.keys, ...(e.body.writers || [])]) pubs[k.id] = k.pub; }
      if (e.type === 'account') pubs[e.body.owner.id] = e.body.owner.pub; if (e.type === 'rotate-key') pubs[e.body.new.id] = e.body.new.pub;
      if (e.type === 'amend') { for (const k of [...((e.body.rules.quorum || {}).keys || []), ...(e.body.rules.writers || [])]) pubs[k.id] = k.pub; }
      for (const s of sigs) { const pub = pubs[s.key]; if (!pub) { errors.push(`#${e.seq} signature from unknown key ${s.key}`); continue; }
        if (!edVerify(null, Buffer.from(hash.sha256, 'hex'), createPublicKey({ key: Buffer.from(pub, 'base64'), type: 'spki', format: 'der' }), Buffer.from(s.sig, 'base64'))) errors.push(`#${e.seq} bad signature from ${s.key}`); }
      try { if (e.type !== 'genesis') l.check(e, st); } catch (err) { errors.push(`#${e.seq} ${err.message}`); }
      if (e.type === 'checkpoint' && e.body.root !== l.merkleRoot(e.body.upto)) errors.push(`#${e.seq} checkpoint root mismatch`);
      l.events.push(e); prev = e;
    }
    return { ok: errors.length === 0, errors, events: this.events.length };
  }
}

/* ------------------------------------------------------------------- cli */
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  const [, , cmd, dir, ...rest] = process.argv; const flags = {}; const args = [];
  for (let i = 0; i < rest.length; i++) { if (rest[i].startsWith('--')) { const k = rest[i].slice(2); (flags[k] = flags[k] || []).push(rest[i + 1]); i++; } else args.push(rest[i]); }
  const signers = (flags.signer || []).map(n => loadKey(dir, n));
  const out = x => console.log(JSON.stringify(x, null, 1));
  try {
    if (cmd === 'keygen') out(keygen(dir, args[0]));
    else if (cmd === 'init') { const names = (flags.authority || [''])[0].split(',').filter(Boolean); const authority = names.map(n => { const k = existsSync(join(dir, 'keys', n + '.pub')) ? { name: n, pub: readFileSync(join(dir, 'keys', n + '.pub'), 'utf8').trim() } : keygen(dir, n); return { name: k.name, id: keyId(k.pub), pub: k.pub }; });
      const writers = (flags.writer || ['lights'])[0].split(',').filter(n => n && existsSync(join(dir, 'keys', n + '.pub'))).map(n => { const pub = readFileSync(join(dir, 'keys', n + '.pub'), 'utf8').trim(); return { name: n, id: keyId(pub), pub }; });
      const l = Ledger.init(dir, { name: (flags.name || ['the bank'])[0], authority, writers, quorum: +(flags.quorum || [2])[0], tranches: +(flags.tranches || [21])[0], cap: +(flags.cap || [21000000])[0], years: +(flags.years || [200])[0] }); out({ genesis: l.head.hash.sha256, authority: authority.map(a => a.name), writers: writers.map(w => w.name) }); }
    else { const l = new Ledger(dir);
      if (cmd === 'account') { const owner = listKeys(dir).find(k => k.name === args[2]) || (() => { throw new Error('no key named ' + args[2]); })(); out(l.append('account', { id: args[0], name: args[1], owner: { name: owner.name, id: owner.id, pub: owner.pub }, role: (flags.role || ['peer'])[0] }, signers)); }
      else if (cmd === 'redeem') out(l.append('redeem', { from: args[0], to: args[1], tranche: +args[2], amount: +args[3], memo: (flags.memo || [''])[0] }, signers));
      else if (cmd === 'issue') out(l.append('issue', { tranche: +args[0], to: args[1], amount: +args[2], memo: (flags.memo || [''])[0] }, signers));
      else if (cmd === 'transfer') out(l.append('transfer', { from: args[0], to: args[1], tranche: +args[2], amount: +args[3], memo: (flags.memo || [''])[0] }, signers));
      else if (cmd === 'note') out(l.append('note', JSON.parse(args[0]), signers));
      else if (cmd === 'key-succession') out(l.append('key-succession', JSON.parse(args[0]), signers));
      else if (cmd === 'checkpoint') out(l.checkpoint(signers));
      else if (cmd === 'verify') { const v = l.verify(); out(v); process.exit(v.ok ? 0 : 1); }
      else if (cmd === 'balances') { const st = l.replay(); out({ allowedPerTranche: l.allowedIssuance(), issued: st.issued, accounts: Object.values(st.accounts).map(a => ({ id: a.id, name: a.name, balances: a.balances })) }); }
      else { console.error('commands: init keygen account issue transfer note key-succession checkpoint verify balances'); process.exit(2); } }
  } catch (e) { console.error('no:', e.message); process.exit(1); }
}

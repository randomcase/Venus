import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Ledger, keygen, loadKey, keyId } from './ledger.mjs';
import { summary, statement, markdown } from './report.mjs';
import { Lights } from './lights.mjs';

function bank(years = 200, start = '2026-09-01T00:00:00.000Z') {
  const dir = mkdtempSync(join(tmpdir(), 'ledger-')); const names = ['alice', 'bob', 'carol'];
  const authority = names.map(n => { const k = keygen(dir, n); return { name: n, id: k.id, pub: k.pub }; }); const w = keygen(dir, 'lights');
  const l = Ledger.init(dir, { name: 'test bank', authority, quorum: 2, writers: [{ name: 'lights', id: w.id, pub: w.pub }], years, start });
  const owner = keygen(dir, 'owner-a'), owner2 = keygen(dir, 'owner-b');
  l.append('account', { id: 'a', name: 'Account A', owner: { name: 'owner-a', id: owner.id, pub: owner.pub } }, [loadKey(dir, 'alice')]);
  l.append('account', { id: 'b', name: 'Account B', owner: { name: 'owner-b', id: owner2.id, pub: owner2.pub } }, [loadKey(dir, 'alice')]);
  return { dir, l, k: n => loadKey(dir, n) };
}

test('genesis, accounts, issue within schedule, transfer, replay', () => {
  const { dir, l, k } = bank();
  assert.equal(l.rules.cap, 21000000 * 100); assert.equal(l.rules.tranches, 21);
  const allowed = l.allowedIssuance(); assert.equal(allowed, Math.floor(l.rules.cap / 200));
  l.append('issue', { tranche: 1, to: 'a', amount: 500000 }, [k('alice'), k('bob')]);
  l.append('transfer', { from: 'a', to: 'b', tranche: 1, amount: 120000 }, [k('owner-a')]);
  const st = l.replay(); assert.equal(st.accounts.a.balances[1], 380000); assert.equal(st.accounts.b.balances[1], 120000); assert.equal(st.issued[1], 500000);
  assert.deepEqual(l.verify(), { ok: true, errors: [], events: l.events.length });
  const s = summary(l); assert.equal(s.supply.totalIssued, 500000); assert.equal(s.accounts.length, 2); assert.match(markdown(s), /21 tranches of 21,000,000.00/);
  assert.equal(statement(l, 'a').lines.length, 2);
});

test('the rules refuse what they should', () => {
  const { l, k } = bank();
  assert.throws(() => l.append('issue', { tranche: 1, to: 'a', amount: 1000 }, [k('alice')]), /needs 2 authority/);
  assert.throws(() => l.append('issue', { tranche: 1, to: 'a', amount: l.allowedIssuance() + 1 }, [k('alice'), k('bob')]), /past the schedule/);
  assert.throws(() => l.append('issue', { tranche: 22, to: 'a', amount: 1 }, [k('alice'), k('bob')]), /no such tranche/);
  l.append('issue', { tranche: 2, to: 'a', amount: 1000 }, [k('bob'), k('carol')]);
  assert.throws(() => l.append('transfer', { from: 'a', to: 'b', tranche: 2, amount: 5000 }, [k('owner-a')]), /insufficient/);
  assert.throws(() => l.append('transfer', { from: 'a', to: 'b', tranche: 2, amount: 10 }, [k('owner-b')]), /owner/);
  assert.throws(() => l.append('transfer', { from: 'a', to: 'b', tranche: 2, amount: 1.5 }, [k('owner-a')]), /whole number/);
  assert.throws(() => l.append('note', { hello: 'world' }, [keyPair()]), /registered key/);
  assert.equal(l.verify().ok, true);
});
function keyPair() { const dir = mkdtempSync(join(tmpdir(), 'stray-')); keygen(dir, 'x'); return loadKey(dir, 'x'); }

test('the cap and the schedule over 200 years', () => {
  const { l } = bank(200, '1900-01-01T00:00:00.000Z');
  assert.equal(l.allowedIssuance('1900-06-01'), Math.floor(l.rules.cap / 200));
  assert.equal(l.allowedIssuance('1999-12-31'), Math.floor(l.rules.cap * 100 / 200));
  assert.equal(l.allowedIssuance('2200-01-01'), l.rules.cap);
  assert.equal(l.allowedIssuance('2500-01-01'), l.rules.cap, 'never past the cap');
});

test('tampering is caught: an edited amount, a dropped line, a forged signature', () => {
  const { dir, l, k } = bank();
  l.append('issue', { tranche: 1, to: 'a', amount: 700 }, [k('alice'), k('bob')]);
  l.checkpoint([k('alice'), k('carol')]);
  assert.equal(l.verify().ok, true);
  const file = join(dir, 'ledger.jsonl'); const lines = readFileSync(file, 'utf8').split('\n').filter(Boolean);
  const edited = lines.map(x => x.replace('"amount":700', '"amount":7000')); writeFileSync(file, edited.join('\n') + '\n');
  const v1 = new Ledger(dir).verify(); assert.equal(v1.ok, false); assert.match(v1.errors.join(' '), /sha256 mismatch/);
  writeFileSync(file, lines.filter((_, i) => i !== 2).join('\n') + '\n');
  const v2 = new Ledger(dir).verify(); assert.equal(v2.ok, false); assert.match(v2.errors.join(' '), /chain broken/);
  const forged = lines.map(x => x.includes('"type":"issue"') ? x.replace(/"sig":"[^"]+"/, '"sig":"' + Buffer.alloc(64).toString('base64') + '"') : x); writeFileSync(file, forged.join('\n') + '\n');
  const v3 = new Ledger(dir).verify(); assert.equal(v3.ok, false); assert.match(v3.errors.join(' '), /bad signature|sha256 mismatch/);
});

test('checkpoint carries a root that replay reproduces', () => {
  const { l, k } = bank(); l.append('issue', { tranche: 3, to: 'b', amount: 42 }, [k('alice'), k('bob')]);
  const cp = l.checkpoint([k('bob'), k('carol')]); assert.equal(cp.body.root, l.merkleRoot(cp.body.upto)); assert.equal(cp.body.upto, cp.seq); assert.equal(l.verify().ok, true);
});

test('key rotation keeps the account and retires the old key', () => {
  const { dir, l, k } = bank(); const nk = keygen(dir, 'owner-a2');
  l.append('issue', { tranche: 1, to: 'a', amount: 100 }, [k('alice'), k('bob')]);
  l.append('rotate-key', { old: keyId(k('owner-a').pub), new: { name: 'owner-a2', id: nk.id, pub: nk.pub } }, [k('owner-a')]);
  assert.throws(() => l.append('transfer', { from: 'a', to: 'b', tranche: 1, amount: 10 }, [k('owner-a')]), /owner/);
  l.append('transfer', { from: 'a', to: 'b', tranche: 1, amount: 10 }, [k('owner-a2')]); assert.equal(l.verify().ok, true);
});

test('the lights write every flick to the ledger, refuse the garage door, and rate-limit', async () => {
  const { dir } = bank(); const L = new Lights(dir);
  const r = await L.set('switch.porch', true, { by: 'test', reason: 'dusk' }); assert.equal(r.on, true); assert.equal(typeof r.ledgerSeq, 'number');
  await assert.rejects(() => L.set('switch.garage_door', true), /allow list/);
  const l = new Ledger(dir); const note = l.events.find(e => e.type === 'note'); assert.equal(note.body.switch, 'switch.porch'); assert.equal(l.verify().ok, true);
  assert.equal(new Lights(dir).list().find(s => s.id === 'switch.porch').on, true);
  L.reg.rateLimitPerMinute = 2; await L.set('switch.hall', true); await assert.rejects(() => L.set('switch.hall', false), /rate limit/);
});

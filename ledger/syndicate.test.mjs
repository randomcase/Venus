import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Ledger, keygen, loadKey } from './ledger.mjs';
import { splitSecret, seal } from './keyring.mjs';
import { carry, status } from './syndicate.mjs';

function newLedger(name, quorum = 2) {
  const dir = mkdtempSync(join(tmpdir(), 'syn-'));
  const authority = ['a', 'b', 'c'].map(n => { const k = keygen(dir, n); return { name: n, id: k.id, pub: k.pub }; });
  const writer = keygen(dir, 'writer');
  const l = Ledger.init(dir, { name, authority, quorum, writers: [{ name: 'writer', id: writer.id, pub: writer.pub }], years: 200 });
  return { dir, l, key: n => loadKey(dir, n) };
}

/* stand in for six months of independent lunar activity: a burst of ordinary notes,
   signed by the lunar writer key, unrelated to anything happening on Earth */
function grow(bank, n) { const w = bank.key('writer'); for (let i = 0; i < n; i++) bank.l.append('note', { lunar: true, i }, [w]); }

test('status reports nothing pending between two freshly initialised ledgers', () => {
  const earth = newLedger('the sock ledger'), moon = newLedger('the lunar bank');
  const p = status(earth.l, moon.l, earth.l.rules.name);
  assert.equal(p.count, 1, 'genesis itself is the one event so far'); // seq 0 exists on init
});

test('carrying records an in-event on the target with the right root and count, and nothing on the source unless asked', () => {
  const earth = newLedger('the sock ledger'), moon = newLedger('the lunar bank');
  earth.l.append('note', { sock: 'left, 3am' }, [earth.key('writer')]);
  const before = moon.l.events.length;
  const r = carry(earth.l, moon.l, { sourceName: earth.l.rules.name, targetName: moon.l.rules.name, targetSigners: [moon.key('a'), moon.key('b')] });
  assert.equal(r.crossed, true);
  assert.equal(r.root, earth.l.merkleRoot());
  assert.equal(moon.l.events.length, before + 1, 'exactly one syndication event landed on the moon');
  assert.equal(earth.l.events.length, 2 /* genesis + the one note */, 'nothing was appended on the source without --mirror');
  const st = moon.l.replay();
  assert.equal(st.syndications.length, 1);
  assert.equal(st.syndications[0].direction, 'in');
  assert.equal(st.syndications[0].counterpart, earth.l.rules.name);
  assert.equal(st.syndications[0].count, r.count);
});

test('a mirrored carry also records an out-event on the source, signed there', () => {
  const earth = newLedger('the sock ledger'), moon = newLedger('the lunar bank');
  earth.l.append('note', { sock: 'right, 3am' }, [earth.key('writer')]);
  carry(earth.l, moon.l, { sourceName: earth.l.rules.name, targetName: moon.l.rules.name, targetSigners: [moon.key('a'), moon.key('c')], sourceSigners: [earth.key('a'), earth.key('b')] });
  const est = earth.l.replay();
  assert.equal(est.syndications.length, 1);
  assert.equal(est.syndications[0].direction, 'out');
  assert.equal(est.syndications[0].counterpart, moon.l.rules.name);
});

test('carrying again with nothing new reports crossed:false rather than an empty syndication', () => {
  const earth = newLedger('the sock ledger'), moon = newLedger('the lunar bank');
  earth.l.append('note', { sock: 'one' }, [earth.key('writer')]);
  const targetSigners = [moon.key('a'), moon.key('b')];
  carry(earth.l, moon.l, { sourceName: earth.l.rules.name, targetName: moon.l.rules.name, targetSigners });
  const before = moon.l.events.length;
  const r2 = carry(earth.l, moon.l, { sourceName: earth.l.rules.name, targetName: moon.l.rules.name, targetSigners });
  assert.equal(r2.crossed, false);
  assert.equal(moon.l.events.length, before, 'a no-op carry appends nothing');
});

test('a second carry after new activity only counts what is new since the last one, not the whole history again', () => {
  const earth = newLedger('the sock ledger'), moon = newLedger('the lunar bank');
  const targetSigners = [moon.key('a'), moon.key('b')];
  earth.l.append('note', { sock: 'one' }, [earth.key('writer')]);
  const r1 = carry(earth.l, moon.l, { sourceName: earth.l.rules.name, targetName: moon.l.rules.name, targetSigners });
  earth.l.append('note', { sock: 'two' }, [earth.key('writer')]);
  earth.l.append('note', { sock: 'three' }, [earth.key('writer')]);
  const r2 = carry(earth.l, moon.l, { sourceName: earth.l.rules.name, targetName: moon.l.rules.name, targetSigners });
  assert.equal(r2.since, r1.atSeq, 'picks up exactly where the last syndication left off');
  assert.equal(r2.count, 2, 'only the two new notes, not the whole earth history again');
});

test('so big it does not care: a lunar ledger with its own real history dwarfs what earth sends, measurably', () => {
  const earth = newLedger('the sock ledger'), moon = newLedger('the lunar bank');
  grow(moon, 4000); // six months of unrelated lunar activity, actually appended and actually signed
  earth.l.append('note', { sock: 'the one that got syndicated' }, [earth.key('writer')]);
  const r = carry(earth.l, moon.l, { sourceName: earth.l.rules.name, targetName: moon.l.rules.name, targetSigners: [moon.key('a'), moon.key('b')] });
  assert.ok(r.shareOfTarget < 0.001, `expected a rounding error, got ${r.shareOfTarget}`);
  // and it is a REAL replay producing that number, not a stand-in — the moon's own history is independently checkable
  const mv = moon.l.verify();
  assert.equal(mv.ok, true, JSON.stringify(mv.errors));
});

test('content stays local: only a root and a count cross, never the sealed event or the key that could open it', () => {
  const earth = newLedger('the sock ledger'), moon = newLedger('the lunar bank');
  const dek = splitSecret(Buffer.alloc(32, 7), { shares: 3, threshold: 2 })[0]; // a real DEK share, standing in for the custody chain
  const sealed = seal(Buffer.alloc(32, 7), Buffer.from('the sock ledger\'s one unreadable entry'));
  // the sealed event is recorded as a NOTE on earth — this is local content, and it never leaves earth's own file
  earth.l.append('note', { sealed }, [earth.key('writer')]);
  carry(earth.l, moon.l, { sourceName: earth.l.rules.name, targetName: moon.l.rules.name, targetSigners: [moon.key('a'), moon.key('b')] });
  const moonRaw = readFileSync(join(moon.dir, 'ledger.jsonl'), 'utf8');
  assert.ok(!moonRaw.includes(sealed.ct), 'the ciphertext leaked into the lunar file');
  assert.ok(!moonRaw.includes(sealed.iv), 'the iv leaked into the lunar file');
  assert.ok(!moonRaw.includes(dek.y), 'a key share leaked into the lunar file');
  assert.ok(moonRaw.includes(earth.l.merkleRoot()), 'the root that DID cross should actually be there');
});

test('both chains replay and verify independently after a full round of syndication', () => {
  const earth = newLedger('the sock ledger'), moon = newLedger('the lunar bank');
  grow(moon, 50);
  earth.l.append('note', { sock: 'a' }, [earth.key('writer')]);
  earth.l.append('note', { sock: 'b' }, [earth.key('writer')]);
  carry(earth.l, moon.l, { sourceName: earth.l.rules.name, targetName: moon.l.rules.name, targetSigners: [moon.key('a'), moon.key('b')], sourceSigners: [earth.key('b'), earth.key('c')] });
  assert.equal(earth.l.verify().ok, true);
  assert.equal(moon.l.verify().ok, true);
});

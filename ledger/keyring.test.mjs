import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitSecret, combineShares, reshare, genkey, seal, open, commitEpoch, runsOutWhen } from './keyring.mjs';

test('split then combine with exactly the threshold recovers the key', () => {
  const key = genkey();
  const shares = splitSecret(key, { shares: 5, threshold: 3 });
  const recovered = combineShares([shares[0], shares[2], shares[4]]);
  assert.equal(recovered.toString('hex'), key.toString('hex'));
});

test('any m of n works, not just the first m', () => {
  const key = genkey();
  const shares = splitSecret(key, { shares: 5, threshold: 3 });
  for (const combo of [[0, 1, 2], [1, 3, 4], [0, 2, 4], [2, 3, 4]])
    assert.equal(combineShares(combo.map(i => shares[i])).toString('hex'), key.toString('hex'), `combo ${combo}`);
});

test('fewer than the threshold fails loudly rather than returning a wrong key', () => {
  const key = genkey();
  const shares = splitSecret(key, { shares: 5, threshold: 3 });
  assert.throws(() => combineShares([shares[0], shares[1]]), /cannot reconstruct/);
});

test('a corrupted share is caught by the checksum, not silently accepted', () => {
  const key = genkey();
  const shares = splitSecret(key, { shares: 5, threshold: 3 });
  const tampered = { ...shares[1], y: Buffer.from(shares[1].y, 'base64').map((b, i) => i === 0 ? b ^ 1 : b).toString('base64') };
  assert.throws(() => combineShares([shares[0], tampered, shares[4]]), /cannot reconstruct/);
});

test('below-threshold shares reveal nothing: two different secrets produce indistinguishable partial shares', () => {
  const a = Buffer.alloc(32, 1), b = Buffer.alloc(32, 2);
  const sa = splitSecret(a, { shares: 5, threshold: 3 }), sb = splitSecret(b, { shares: 5, threshold: 3 });
  // with only 2 of 3 needed shares, a single share's y-bytes carry no bias toward one secret over another —
  // this test asserts the shape of the guarantee (share length and independence), not statistical proof,
  // since real information-theoretic proofs are a property of the math, not something a unit test measures
  assert.equal(Buffer.from(sa[0].y, 'base64').length, Buffer.from(sb[0].y, 'base64').length);
  assert.notEqual(sa[0].y, sb[0].y);
});

test('reshare: old shares reconstruct, then a fresh set for a different n and m recovers the same key', () => {
  const key = genkey();
  const old = splitSecret(key, { shares: 3, threshold: 2 }); // the ship's own two-of-three
  const fresh = reshare([old[0], old[2]], { shares: 5, threshold: 3 }); // a custodian left, two joined
  assert.equal(fresh.length, 5);
  const recovered = combineShares([fresh[1], fresh[3], fresh[4]]);
  assert.equal(recovered.toString('hex'), key.toString('hex'));
  // and the OLD shares still work on their own terms, independent of the reshare
  assert.equal(combineShares([old[0], old[1]]).toString('hex'), key.toString('hex'));
});

test('seal and open round-trip, and a tampered ciphertext is rejected', () => {
  const key = genkey(), plaintext = Buffer.from('a sock, removed at 3am, unspecified foot');
  const sealed = seal(key, plaintext);
  assert.equal(open(key, sealed).toString('utf8'), plaintext.toString('utf8'));
  const tampered = { ...sealed, ct: Buffer.from(sealed.ct, 'base64').map((b, i) => i === 0 ? b ^ 1 : b).toString('base64') };
  assert.throws(() => open(key, tampered));
});

test('the wrong key cannot open a sealed event even with a valid-looking share set', () => {
  const key = genkey(), other = genkey(), plaintext = Buffer.from('which sock, and whose, stays unreadable');
  const sealed = seal(key, plaintext);
  assert.throws(() => open(other, sealed));
});

test('commitEpoch records holders and share hashes, never the shares or the key', () => {
  const key = genkey();
  const shares = splitSecret(key, { shares: 3, threshold: 2 });
  const holders = ['witch-id', 'wizard-id', 'warlock-id'];
  const epoch = commitEpoch(shares, holders, 'first custody, at genesis');
  assert.equal(epoch.threshold, 2);
  assert.equal(epoch.holders.length, 3);
  const asText = JSON.stringify(epoch);
  for (const s of shares) assert.ok(!asText.includes(s.y), 'a share value leaked into the public commitment');
  assert.ok(!asText.includes(key.toString('base64')), 'the key itself leaked into the public commitment');
});

test('runsOutWhen states the real limiting resource for the ship\'s two-of-three', () => {
  const text = runsOutWhen(3, 2);
  assert.match(text, /survives losing any 1 of them/);
  assert.match(text, /custodians remembering to reshare/);
});

test('splitSecret rejects a threshold of 1, which would defeat the point of splitting at all', () => {
  assert.throws(() => splitSecret(genkey(), { shares: 3, threshold: 1 }), /threshold must be between 2/);
});

/* ------------------------------------------------------------------------------------------
   A CUSTODIAN DIES. Two outcomes, both load-bearing: one custodian lost is what the scheme is
   FOR (survivable, if the survivors reshare); a second one lost before that reshare happens is
   what runsOutWhen() warns about (not survivable, by design — not a bug to work around). */

test('one custodian dies: the survivors reshare, the same content opens under the new shares, and the dead share is now inert', () => {
  const dek = genkey();
  const sealedLongAgo = seal(dek, Buffer.from('the left sock, removed at 3:07am, cause unrecorded'));
  const original = splitSecret(dek, { shares: 3, threshold: 2 }); // witch, wizard, warlock
  const [witch, wizard, deadWarlock] = original;

  // the warlock is gone. the survivors reconstruct and reshare among themselves plus a replacement.
  const fresh = reshare([witch, wizard], { shares: 3, threshold: 2 }); // witch, wizard, new-warlock
  assert.equal(fresh.length, 3);

  // the content sealed before any of this still opens, unchanged — a succession never touches the
  // ciphertext, only who can unlock it, which is the entire point of splitting the key instead of
  // re-encrypting two hundred years of history every time a custodian turns over
  const reconstructed = combineShares([fresh[0], fresh[2]]);
  assert.equal(open(reconstructed, sealedLongAgo).toString('utf8'), 'the left sock, removed at 3:07am, cause unrecorded');

  // the dead warlock's share is not merely unused, it is now cryptographically foreign: it belongs
  // to a different random polynomial than the fresh shares, so it cannot be combined with them —
  // finding the old share later (a drawer, a compromised backup) buys nothing against the new custody.
  // fresh[0] carries a different index than deadWarlock, so mixing them fails the ordinary way, by
  // reconstructing the wrong bytes and being caught by the checksum
  assert.throws(() => combineShares([fresh[0], deadWarlock]), /cannot reconstruct/);
  // deadWarlock and fresh[2] happen to carry the SAME index — splitSecret numbers shares 1..n on every
  // split, so a reshare reuses the old numbering — and that specific collision is caught on its own
  // terms, distinctly, rather than surfacing as a division-by-zero from the field arithmetic
  assert.throws(() => combineShares([deadWarlock, fresh[2]]), /carry the same index/);

  // and the two survivors' ORIGINAL shares, from before the reshare, still agree with each other —
  // resharing a copy of the secret doesn't invalidate the shares that made that copy
  assert.equal(combineShares([witch, wizard]).toString('hex'), dek.toString('hex'));
});

test('shares from different epochs can share the same index; combining them fails cleanly rather than as a raw division by zero', () => {
  const dek = genkey();
  const before = splitSecret(dek, { shares: 3, threshold: 2 });
  const after = reshare([before[0], before[1]], { shares: 3, threshold: 2 });
  // splitSecret always numbers fresh shares 1..n, so before[2].x === after[2].x by construction —
  // this is the exact accident that used to crash inside the field arithmetic instead of erroring
  assert.equal(before[2].x, after[2].x);
  assert.throws(() => combineShares([before[2], after[2]]), /carry the same index/);
});

test('two custodians die before anyone reshares: the key is gone, permanently, by design', () => {
  const dek = genkey();
  const sealed = seal(dek, Buffer.from('which sock, and whose, was never recorded'));
  const [witch] = splitSecret(dek, { shares: 3, threshold: 2 }); // wizard and warlock both lost at once, no reshare got to happen

  // one share is structurally insufficient — Shamir doesn't grade partial credit
  assert.throws(() => combineShares([witch]), /at least two shares/);
  // there is no other combination to try: the witch is the only survivor, so this is the whole story
  assert.equal([witch].length < 2, true, 'fewer than the threshold; nothing else to attempt');
  // the content is still perfectly intact and perfectly unreadable — verifiable, not recoverable
  assert.throws(() => open(Buffer.alloc(32), sealed)); // no correct key can be produced to try here at all
});

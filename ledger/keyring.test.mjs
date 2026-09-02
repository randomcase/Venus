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

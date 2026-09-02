#!/usr/bin/env node
/* keyring.mjs — key succession for an encrypted event, over a 200-year ledger.

   A SIGNING key (ledger.mjs's authority keys) and a CONFIDENTIALITY key are
   different problems with different failure modes, and this file is only
   about the second one. Losing a signer is survivable one at a time: the
   quorum still has its majority, and rotate-key replaces the missing voice.
   Losing a DECRYPTION key is not survivable at all — there is no fallback,
   no quorum override, no "ask two of the other three." The content is gone,
   provably intact and permanently unreadable, forever. So a confidentiality
   key cannot live in one custodian's hands, or even in all three at once
   the way a signature does; it has to live SPLIT, such that no custodian and
   no minority of custodians ever holds the whole thing, and a majority can
   always rebuild it.

   THE TOOL IS SHAMIR SECRET SHARING, not a stronger cipher. It splits a
   32-byte key into n shares such that any m of them reconstruct the exact
   key and any fewer than m reveal, provably, nothing at all — not a hint,
   not a probability, nothing. That "nothing at all" is why threshold
   schemes are used for custody and layered ciphers are not: two ciphers in
   series only ever need both broken once, in series, at leisure; m-of-n
   secret sharing needs m-1 holders to conspire or vanish AT THE SAME TIME,
   which is the actual shape of the risk over two centuries (an era, a fire,
   a single point of failure) rather than a cryptographic attack on a cipher.

   WHEN DOES THE KEY RUN OUT? Not by brute force. AES-256's keyspace is
   2^256, about 1.16 x 10^77 possibilities — more than the estimated number
   of atoms in the observable universe — and that number does not move
   however many centuries pass; a key does not "wear out" by existing. What
   runs out is CUSTODIANS: the key is gone, forever and without warning,
   the moment more than (n - m) of its holders are lost at once — dead,
   destroyed, or unreachable — before the group reshares. With this ship's
   own two-of-three (n=3, m=2), the key survives losing any ONE custodian,
   provided the survivors reshare before losing a second. That is a
   calendar problem, not a cryptography problem, and RULES.staleAfter in
   rules.mjs is exactly that calendar: an advisory reminder to reshare, not
   a cryptographic expiry — Shamir shares carry no clock of their own.

   WHY NOT A "258-BIT" ENGINE? There is no such standard, and that absence
   is the point, not an oversight. AES, SHA-2 and SHA-3's key and digest
   sizes come in 128/192/256/384/512 because those are the sizes their
   round structures, S-boxes and word widths were designed and reviewed
   around; a width off that grid is not a stronger version of the same
   algorithm, it is an unreviewed one. And there is nothing left to buy:
   2^256 is already so far past brute-force feasibility that 2^258 (four
   times larger) changes the odds of guessing it from "never, by any means
   available to physics" to "never, slightly more never." What it does cost
   is everything AES-256 earned by being battered at by cryptographers for
   over twenty years: hardware acceleration, formal proofs, every major
   library. A home-grown width is the single most common way real systems
   get broken, because the flaw is never in the arithmetic, it is in
   everything around it nobody thought to review. Fittingly, classic Shamir
   sharing works byte-by-byte over GF(2^8) — arithmetic on the 256 values a
   byte can hold — so 256 shows up here too, for a wholly different, purely
   structural reason: it is the size of a byte, not a security margin.

     node keyring.mjs genkey                         a fresh 32-byte DEK, to stdout (base64)
     node keyring.mjs split <n> <m> [keyB64]          split into n shares, threshold m
     node keyring.mjs combine <share.json...>         reconstruct the key from >= m shares
     node keyring.mjs reshare <newN> <newM> <share.json...>   reconstruct, then re-split
     node keyring.mjs seal <keyB64> <file>            AES-256-GCM the file, to stdout JSON
     node keyring.mjs open <keyB64> <sealed.json>     decrypt, to stdout
     node keyring.mjs runsOutWhen <n> <m>             the plain-English answer, for these numbers */
import { randomBytes, createCipheriv, createDecipheriv, createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

/* ---- GF(2^8) arithmetic, AES's field (reduction polynomial 0x11b), via log/exp tables.
   The table walks powers of a GENERATOR — an element whose powers visit all 255 nonzero
   field elements before repeating. 2 is the obvious first guess and the wrong one: in this
   field 2 has order 51, not 255, so building the table by repeated doubling silently visits
   only a fifth of the field and every discrete log past that point is wrong — no exception,
   no crash, just answers that are confidently incorrect, which is exactly the failure this
   file warns about elsewhere and very nearly shipped with. 3 is primitive for this field and
   polynomial (order 255), which is the standard choice for this exact construction. */
const EXP = new Uint8Array(512), LOG = new Uint8Array(256);
const xtime = x => ((x << 1) ^ ((x & 0x80) ? 0x11b : 0)) & 0xff; /* multiply by 2, AES's reduction step */
(function build() { let x = 1; for (let i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x = xtime(x) ^ x; /* x *= 3 */ } for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]; })();
const gfMul = (a, b) => (a === 0 || b === 0) ? 0 : EXP[LOG[a] + LOG[b]];
const gfDiv = (a, b) => { if (b === 0) throw new Error('division by zero in GF(256)'); if (a === 0) return 0; return EXP[(LOG[a] - LOG[b] + 255) % 255]; };

/* evaluate the random polynomial with the given coefficients (coeffs[0] is the secret byte) at x */
function evalPoly(coeffs, x) { let y = 0; for (let i = coeffs.length - 1; i >= 0; i--) y = gfMul(y, x) ^ coeffs[i]; return y; }
/* Lagrange-interpolate the polynomial's value at x=0 from the given (x, y) points */
function interpolateAtZero(points) {
  let result = 0;
  for (let i = 0; i < points.length; i++) {
    let num = 1, den = 1;
    for (let j = 0; j < points.length; j++) { if (i === j) continue; num = gfMul(num, points[j].x); den = gfMul(den, points[i].x ^ points[j].x); }
    result ^= gfMul(points[i].y, gfDiv(num, den));
  }
  return result;
}

const TAG_LEN = 8; /* a truncated hash prepended to the secret so a bad reconstruction FAILS LOUDLY rather than
  silently handing back 32 wrong bytes that look exactly like a key. Below the threshold, Lagrange interpolation
  still returns an answer — a field has no notion of "not enough points" — so without this the failure mode of
  too few shares is a confidently wrong key, not an error. This turns that into a checked assertion. */
const tagOf = payload => createHash('sha256').update(payload).digest().subarray(0, TAG_LEN);

/* ---- splitting and combining ---- */
export function splitSecret(secret, { shares: n, threshold: m }) {
  if (!(n >= 2 && n <= 255)) throw new Error('shares must be between 2 and 255');
  if (!(m >= 2 && m <= n)) throw new Error('threshold must be between 2 and the number of shares — 1 defeats the point of splitting at all');
  const tagged = Buffer.concat([tagOf(secret), secret]);
  const out = Array.from({ length: n }, (_, i) => ({ x: i + 1, y: Buffer.alloc(tagged.length) }));
  for (let byteIdx = 0; byteIdx < tagged.length; byteIdx++) {
    const coeffs = new Uint8Array(m); coeffs[0] = tagged[byteIdx];
    for (let c = 1; c < m; c++) coeffs[c] = randomBytes(1)[0] || 1; /* a zero leading coefficient would silently lower the degree; avoid it */
    for (const s of out) s.y[byteIdx] = evalPoly(coeffs, s.x);
  }
  return out.map(s => ({ x: s.x, y: s.y.toString('base64'), n, m, shareHash: createHash('sha256').update(s.y).digest('hex') }));
}

export function combineShares(shares) {
  if (shares.length < 2) throw new Error('need at least two shares to attempt a reconstruction');
  const len = Buffer.from(shares[0].y, 'base64').length;
  if (!shares.every(s => Buffer.from(s.y, 'base64').length === len)) throw new Error('shares are not from the same split');
  const recovered = Buffer.alloc(len);
  for (let byteIdx = 0; byteIdx < len; byteIdx++) recovered[byteIdx] = interpolateAtZero(shares.map(s => ({ x: s.x, y: Buffer.from(s.y, 'base64')[byteIdx] })));
  const tag = recovered.subarray(0, TAG_LEN), secret = recovered.subarray(TAG_LEN);
  if (!tag.equals(tagOf(secret))) throw new Error('cannot reconstruct: fewer than the threshold shares, or one of them is wrong. Below the threshold this is the ONLY signal you get — the shares themselves reveal nothing.');
  return Buffer.from(secret); /* a copy, so the caller can zero it deliberately when done */
}

/* the moment of succession: reconstruct with the OLD shares, then split fresh for the NEW holder set.
   This is the one moment the whole key exists assembled in memory, and there is no way to avoid that —
   any redistribution scheme needs the secret in hand to redistribute it. The discipline is to keep that
   moment short, offline, and to zero the buffer the instant the new shares are made. */
export function reshare(oldShares, { shares: newN, threshold: newM }) {
  const secret = combineShares(oldShares);
  const fresh = splitSecret(secret, { shares: newN, threshold: newM });
  secret.fill(0); /* best-effort erasure — a GC'd runtime gives no guarantee the old bytes are gone from memory, and this file says so rather than implying otherwise */
  return fresh;
}

export function genkey() { return randomBytes(32); }

/* AES-256-GCM: the cipher, unrelated to how the key is held. Sealing an event never touches the ledger's
   own hash chain — you hash the ciphertext exactly as you would any other bytes; encryption decides who
   may ever read the content, the chain decides only whether it has been altered since it was recorded. */
export function seal(key32, plaintext) {
  if (key32.length !== 32) throw new Error('the key must be exactly 32 bytes; genkey() or combineShares() both produce that');
  const iv = randomBytes(12), c = createCipheriv('aes-256-gcm', key32, iv);
  const ct = Buffer.concat([c.update(plaintext), c.final()]);
  return { iv: iv.toString('base64'), ct: ct.toString('base64'), tag: c.getAuthTag().toString('base64') };
}
export function open(key32, sealed) {
  const d = createDecipheriv('aes-256-gcm', key32, Buffer.from(sealed.iv, 'base64'));
  d.setAuthTag(Buffer.from(sealed.tag, 'base64'));
  return Buffer.concat([d.update(Buffer.from(sealed.ct, 'base64')), d.final()]);
}

/* the public record of a reshare, fit to append to the ledger as a key-succession event: holder identities
   and a per-share hash so a holder can later prove theirs is the genuine one, threshold, and nothing else —
   never a share, never the key. Pass `holders` as the signing-key ids from ledger.mjs (loadKey/keyId), so a
   custodian's confidentiality share and their signing identity are the same named person on the chain. */
export function commitEpoch(freshShares, holders, note = '') {
  if (freshShares.length !== holders.length) throw new Error('one share per holder, no more, no fewer');
  return { threshold: freshShares[0].m, holders: holders.map((h, i) => ({ holder: h, shareHash: freshShares[i].shareHash })), note };
}

/* the honest answer to "when does it run out", for a given n and m */
export function runsOutWhen(n, m) {
  const survivable = n - m; const secondsIn2000Years = 2000 * 365.25 * 86400;
  return `With ${n} holders and a threshold of ${m}: the key survives losing any ${survivable} of them at once, forever — Shamir sharing does not decay with time, and fewer than ${m} shares reveal nothing whatsoever about the key, not even a probability. It is gone permanently the moment a ${m + 0 <= n ? survivable + 1 : n}th holder is lost before a reshare. Brute force is not a clock here either: AES-256's keyspace is 2^256 (~1.16e77) against roughly ${secondsIn2000Years.toExponential(2)} seconds in two thousand years — the limiting resource is custodians remembering to reshare after a loss, not time or computation.`;
}

/* --------------------------------------------------------------------------------------------------- cli */
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  const [, , cmd, ...args] = process.argv;
  const readShare = p => JSON.parse(readFileSync(p, 'utf8'));
  try {
    if (cmd === 'genkey') console.log(genkey().toString('base64'));
    else if (cmd === 'split') { const [n, m, keyB64] = args; const key = keyB64 ? Buffer.from(keyB64, 'base64') : genkey();
      console.log(JSON.stringify({ key: keyB64 ? undefined : key.toString('base64'), shares: splitSecret(key, { shares: +n, threshold: +m }) }, null, 1)); }
    else if (cmd === 'combine') console.log(combineShares(args.map(readShare)).toString('base64'));
    else if (cmd === 'reshare') { const [n, m, ...files] = args; console.log(JSON.stringify(reshare(files.map(readShare), { shares: +n, threshold: +m }), null, 1)); }
    else if (cmd === 'seal') { const [keyB64, file] = args; console.log(JSON.stringify(seal(Buffer.from(keyB64, 'base64'), readFileSync(file)), null, 1)); }
    else if (cmd === 'open') { const [keyB64, file] = args; process.stdout.write(open(Buffer.from(keyB64, 'base64'), readShare(file))); }
    else if (cmd === 'runsOutWhen') console.log(runsOutWhen(+args[0], +args[1]));
    else { console.error('commands: genkey split combine reshare seal open runsOutWhen'); process.exit(2); }
  } catch (e) { console.error('no:', e.message); process.exit(1); }
}

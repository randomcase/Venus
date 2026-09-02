# The 200-year ledger

An append-only, hash-chained, quorum-signed record of accounts, meant to be
readable and checkable in 2226 by someone with the text file and this page.
On top of it: reports, a light-switch layer whose every flick is written down,
and a Claude assistant that is kept healthy by code rather than by hope.

Node 20+, one dependency (`@anthropic-ai/sdk`, for the assistant only). The
ledger itself uses nothing outside Node's standard library.

## The ledger

- `ledger.jsonl`: one event per line. Each carries `prev` (the SHA-256 of the
  event before), its own hash under SHA-256 **and** SHA3-256, and Ed25519
  signatures. Balances are never stored; `replay()` derives them.
- Genesis fixes the rules: 21 tranches of 21,000,000 (minor units ×100),
  issuance on a straight line over 200 years (a tranche may have issued at
  most cap × (years elapsed + 1) / years), a quorum of m-of-n authority keys,
  and writer keys that may append notes and nothing else.
- Event types: `genesis`, `account`, `issue` (quorum), `transfer` (owner's
  key), `rotate-key`, `key-succession` (quorum; records a confidentiality-key
  reshare — see below), `note` (any registered key), `checkpoint` (quorum;
  carries the Merkle root of everything so far), `amend` (quorum; changes
  rules).
- `verify()` recomputes every hash, checks the chain, checks every signature
  against the keys the ledger itself registered, replays every rule, and
  recomputes every checkpoint root. The tests edit an amount, drop a line, and
  forge a signature; all three are caught.

```bash
cd ledger
node ledger.mjs init bank --name "Heze bank" --authority alice,bob,carol --quorum 2
node ledger.mjs keygen bank lights           # the writer key for notes and the lights
node ledger.mjs keygen bank owner-treasury
node ledger.mjs account bank treasury "Treasury" owner-treasury --signer alice
node ledger.mjs issue bank 1 treasury 1000000 --signer alice --signer bob
node ledger.mjs checkpoint bank --signer alice --signer carol
node ledger.mjs verify bank
node report.mjs bank                          # Markdown; --html report.html; --json
```

(`init` registers the writer key only if it exists first; run `keygen bank
lights` before `init`, or add it later with an `amend`.)

## The explorer, and the b2p2p2b test run by the machine

```bash
node serve.mjs bank 7332      # then open http://127.0.0.1:7332
node audit.mjs bank           # the same audit as JSON
```

The explorer shows the overview, the tranches against their schedule, the
accounts and statements, every event with its hashes and signatures, the
checkpoints, the switches, and a place to ask. It verifies twice: the server
from the file, and the page itself by re-hashing every event with WebCrypto
and re-linking the chain, so the badge is earned in front of you.

The **b2p2p2b** view is the first lesson's test, automated over the real
ledger. Accounts carry a role (`issuer`, `peer`, `redeemer`; `redeem` events
burn units at a redeemer). The audit builds the flow graph from the recorded
hops and reports: whether issuance reaches redemption; whether both ends are
plural; the single parties whose removal cuts the flow (`chokes`); the
minimal pairs that single deletion cannot see (`pairs`), and for each pair how
often its members act on the same day, which is the only record-based hint
about moving together; the fungibility verdict (this ledger stores the
tranche of every unit, so units are distinguishable, and it says so); the
reads verdict (a transfer needs a replay, so by the third lesson it is a
ledger coin, not a decentralised one); and what the quorum vote is in these
terms: any n−m+1 custodians refusing together is a minimal cutting set of the
issuance hop by construction, softened only because issuance already follows
a schedule, and removed only by making issuance fully automatic.

## Keeping it for 200 years

The file is the product; the hosting is replaceable. Keep it in several
write-once places at once: an S3 bucket with Object Lock in compliance mode
and cross-region replication; a second provider's locked bucket; a git
repository; and publish each checkpoint's root to a public timestamping
service. Print the checkpointed file every few years. Encode custody
succession in genesis and change it only by `amend`. The cost is negligible;
the work is institutional.

### If an event's body itself must be confidential, `keyring.mjs`

A *signing* key and a *confidentiality* key fail differently, and only the
first is handled by `rotate-key`. Losing a signer is survivable one at a
time — the quorum still has its majority. Losing a decryption key is not
survivable at all: there is no fallback, and the content stays provably
intact and permanently unreadable. So a confidentiality key is never held
whole by anyone; it is split with Shamir secret sharing (`keyring.mjs`) into
n shares such that any m reconstruct it exactly and fewer than m reveal
nothing whatsoever — not a hint, not a probability.

```bash
node keyring.mjs split 3 2 > split.json        # n=3 holders, threshold m=2; the DEK is printed once, then never again
node keyring.mjs seal <base64 key> event.txt > sealed.json     # AES-256-GCM; hash the ciphertext into the chain as usual
node keyring.mjs combine share-a.json share-b.json             # any 2 of the 3 shares recover the exact key
node keyring.mjs reshare <newN> <newM> share-a.json share-b.json   # a custodian changed; old shares retire
```

Record a reshare on the chain with the `key-succession` event type (quorum
signed, like `amend`): it carries the new holders' identities, a threshold,
and a hash of each share so a holder can later prove theirs is genuine —
never a share, never the key.

**When does the key run out?** Not by brute force — AES-256's keyspace
(2^256) dwarfs any timescale this ledger is built for. It runs out the
moment more than `n - m` holders are lost *at once*, before the survivors
reshare. With this project's own two-of-three, the key survives losing any
one holder, forever, provided the other two reshare before losing a second.
That is a calendar discipline, not a cryptographic property — Shamir shares
carry no expiry of their own.

**Why not a wider, nonstandard cipher?** There's no such thing as a "258-bit"
AES or SHA — key and digest sizes come in 128/192/256/384/512 because those
are the widths their round structures were designed and reviewed around.
2^256 is already so far past brute-force feasibility that a few more bits
buy nothing; what a nonstandard width costs is everything AES-256 earned
from two decades of cryptanalysis and every hardware accelerator built for
it. (Shamir sharing itself works byte-by-byte over GF(2^8) — 256 values, one
per byte — which is a different, purely structural reason for that number to
turn up here too.)

## The lights

`lights.mjs` keeps a registry (`lights.json`) of switches with an allow list.
Adapter `sim` keeps state in a file; adapter `homeassistant` calls Home
Assistant's REST API with `HASS_TOKEN`. Every change appends a `note` to the
ledger signed by the `lights` key. The garage door is in the registry with
`allow:false` so nothing going through this module can open it.

## The assistant, and what healthy means

`assistant.mjs` uses `claude-opus-5` with adaptive thinking and server-side
refusal fallbacks (`fallbacks: "default"`), so a policy decline re-runs on a
fallback model inside the same call.

- `ask <dir> "question"`: read-only. The model gets the report and the last 40
  events as text and nothing else, and is told to cite event numbers and to
  say when the data does not answer. Every number in its answer is checked
  against the data; an answer with a stray number is marked ungrounded. The
  verdict is written to the ledger as a note.
- `lights <dir> "instruction"`: three tools (`list_switches`, `set_switch`,
  `ledger_summary`), strict schemas, the allow list, a rate limit, and the
  instruction to ask rather than guess.
- `health <dir>`: six fixed probes whose pass/fail is decided by code: porch
  on; kitchen off (both switches); garage door refused; ambiguous "the light"
  asked about, not guessed; a grounded ledger answer; an honest "the data does
  not say". The scorecard goes on the ledger, so the model's health over the
  years is a row you can read.

Credentials: `ANTHROPIC_API_KEY`, or `ant auth login`. Without either, the
ledger, the report and the lights work; the assistant does not.

## Syndication: carrying one ledger's history to another's

Two sovereign chains — say, an Earth ledger and a lunar one — are not one
ledger split in half. Each is its own `Ledger`, its own custodians, its own
quorum; neither can see or verify the other's history past what actually
crosses. `syndicate.mjs` carries a Merkle root and a count from one chain and
records it as a `syndication` event (quorum-signed, like `amend`) on the
other — never the events themselves. A chain vouches for the fact that a
span of the other's history exists and is unbroken, without ever taking
custody of what's in it — the same shape as `key-succession`'s "the hash,
never the secret."

```bash
node syndicate.mjs status earth-dir moon-dir                 # what would cross, without crossing it
node syndicate.mjs carry earth-dir moon-dir --signer selene --signer endymion
                                                              # moon records what it received, quorum-signed there
node syndicate.mjs carry earth-dir moon-dir --signer selene --signer endymion \
  --mirror --signer2 witch --signer2 warlock                 # earth also records what it sent
```

Run this against a lunar ledger that has been accruing its own six months of
unrelated activity and the arithmetic says the honest thing on its own:
Earth's contribution is whatever share it actually is, usually a rounding
error, and the Moon's own count doesn't pause for it — reconciled without
comment. That's not a flourish; a test grows a real 6,000-event lunar
history and checks the real percentage. A second `carry` only ever counts
what's new since the last one, never the whole history again, and content
sealed with `keyring.mjs` and merely *noted* on one side never appears in
the other side's file — a test checks the raw JSONL for exactly that.

## Tests

```bash
cd ledger && npm test
```

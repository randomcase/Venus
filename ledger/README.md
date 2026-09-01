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
  key), `rotate-key`, `note` (any registered key), `checkpoint` (quorum; carries
  the Merkle root of everything so far), `amend` (quorum; changes rules).
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

## Keeping it for 200 years

The file is the product; the hosting is replaceable. Keep it in several
write-once places at once: an S3 bucket with Object Lock in compliance mode
and cross-region replication; a second provider's locked bucket; a git
repository; and publish each checkpoint's root to a public timestamping
service. Print the checkpointed file every few years. Encode custody
succession in genesis and change it only by `amend`. The cost is negligible;
the work is institutional.

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

## Tests

```bash
cd ledger && npm test
```

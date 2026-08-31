# Venus Yard

Forty-one pages about a shipyard that does not exist, built to find out how
much a browser will do for you before you reach for JavaScript — plus one more
that a Scala program writes for itself.

**Thirty-nine of the forty-one have no script in them at all.** They still
add up, hold state, gate one control behind another, and hand documents to each
other. The arithmetic is CSS counters, the state is `:has()`, and the transport
is a plain `<form method="get">`.

Start at [`index.html`](index.html), or open
[`arcade.html`](arcade.html) to see every board running at once in live frames.

---

## The five techniques

Everything here is built out of these. [`bare.html`](bare.html) is all five in
105 lines; [`whale.html`](whale.html) explains each with a working example.

| | | |
|---|---|---|
| **Counters are arithmetic** | `counter-increment` on a checked option's label, `counter()` to print | the browser adds for you |
| **`:has()` is state** | an ancestor styled by what is inside it | a state machine with nothing to keep in sync |
| **Compound `:has()` is a lookup** | `:has(A):has(B)` keyed on a pair | how you get multiplication out of a language with none |
| **Cascade order is authority** | later rules win | put the stop rule last or it is a suggestion |
| **A GET form is transport** | the browser serialises and navigates | no fetch, no endpoint, no server |

### The one rule you cannot break

A counter can only be printed **after** the things that increment it. So inputs
come first in the DOM, totals come after, and the layout is put back with grid.
Every page here is arranged around that single constraint.

### What CSS will not do

It adds. It does not subtract, multiply, divide, or take a minimum. The honest
responses are the ones used throughout:

- **Need a product?** Write the products out. Three options by three states is
  nine rules and no shortcut — but the table is visible and every cell was
  written by somebody who can be asked about it.
- **Need a difference?** Declare it, or print both numbers and say why the
  difference is missing. [`bank.html`](bank.html) and
  [`new-paris.html`](new-paris.html) both refuse to show a figure they could not
  compute, and say so on the page.

---

## What is in here

**Start here** — [`bare.html`](bare.html) the whole idea in one screen ·
[`whale.html`](whale.html) six techniques with live examples ·
[`learn.html`](learn.html) nine mistakes that were really in these files ·
[`template.html`](template.html) copy this and fill it in

**Build** — [`ship-forge.html`](ship-forge.html) ten historical hulls, costed
from their own geometry · [`station.html`](station.html) the order desk ·
[`auxiliaries.html`](auxiliaries.html) twelve fleet auxiliaries

**Play** — [`defense.html`](defense.html) tower defence, placement phase only —
the part CSS can do honestly · [`DefenceSim.scala`](DefenceSim.scala) runs the
wave the page cannot and writes [`defense-run.html`](defense-run.html)

**Run it** — [`cruise-control.html`](cruise-control.html) one lane, one control,
one cut · [`convoy.html`](convoy.html) pairs released down a rank chain ·
[`personnel.html`](personnel.html) establishment against onboard ·
[`roster.html`](roster.html) six hands, six billets, no arrangement that works

**Forms** — [`gate.html`](gate.html) a document against itself ·
[`gate-2.html`](gate-2.html) against its provenance ·
[`gate-3.html`](gate-3.html) against its own arithmetic and authority ·
[`court.html`](court.html) the floating court ·
[`contract.html`](contract.html) form completion as gas against a budget

**Money and control** — [`slime.html`](slime.html) the wallet ·
[`bank.html`](bank.html) the ledger · [`vault.html`](vault.html) two keys of
three inside a time window · [`syndicate.html`](syndicate.html) six indicators
and the six controls that answer them

**Signals** — [`signals.html`](signals.html) sixteen lamp states ·
[`signals-3.html`](signals-3.html) what is lost when a lamp comes off ·
[`kill.html`](kill.html) a stop that is not a speed ·
[`chain.html`](chain.html) why only one leg can refuse

**Elsewhere** — [`new-paris.html`](new-paris.html) an aerostat in the Venus
cloud layer · [`supply.html`](supply.html) two transfer paths ·
[`heze.html`](heze.html) a unit of account · [`eros.html`](eros.html) a parable
with one switch · [`hydra.html`](hydra.html) three serpents, and why cutting a
head makes two · [`jakarta.html`](jakarta.html) the page facing the Scala side
of this repo

---

## The contract

The boards hand each other one JSON document,
[`manifest.example.json`](manifest.example.json) — `venus.yard/1`. Each board
authors its own section and reads the rest.

[`bridge.html`](bridge.html) is one of the two pages that run script — the
other is [`ship-forge.html`](ship-forge.html), which draws to a canvas — and
both are marked as such everywhere they appear. The bridge exists to be the one
place that recomputes: every derived block is redone from its inputs rather than
believed, and where the document disagrees with itself the difference is
reported and the recomputed value is what goes out. It refuses any clause whose
declared `powers` do not cover what that clause did.

It makes **no network request of any kind** — not even to load its own example,
which is inlined for that reason. "Inbound" and "outbound" mean into and out of
the page; you carry the document.

---

## Templates

[`template.html`](template.html) is a working board with all six patterns wired
and annotated, plus a checklist to run before shipping.

[`generate.mjs`](generate.mjs) writes boards from a spec:

```bash
node generate.mjs                 # the three authored boards in boards/
node generate.mjs --count 1000    # 1000 procedural boards, deterministic
```

Every authored page also has a template extracted from it:

```bash
node templatise.mjs               # writes templates/ — 33 of them
```

These are not husks. Each keeps its source page's entire stylesheet and every
input id, so it works the moment you open it — the counters count and the
`:has()` rules fire before you change anything. What was stripped is the prose.
Do not rename the ids: every rule points at them by name, and a renamed id fails
silently.

And the one piece that is not HTML at all:

```bash
scala-cli run --server=false DefenceSim.scala -- --list
scala-cli run --server=false DefenceSim.scala -- --seed 7 --mounts skin,drogue,shade --html defense-run.html
```

`defense.html` stops where CSS honestly stops — it can say what is covered,
never what happens over time. `DefenceSim.scala` is that missing half: a fold
over ticks, deterministic from its seed, with `sealed trait Hazard` so the
compiler refuses to build if any hazard goes unhandled. Same guarantee the CSS
version bought by writing out every rule by hand, except enforced instead of
remembered.

Generated boards stamp themselves *generated · figures not measured* in the
header, the HTML comment and the index, because a number nobody chose must
never be able to pass for evidence.

---

## Caveats, in order of how likely they are to bite you

1. **`:has()` is required.** Thirty-six of the pages depend on it. On a
   browser without support they render as static, wrong pages — there is no
   fallback and no graceful degradation. Chrome/Edge 105+, Safari 15.4+,
   Firefox 121+.
2. **`:target` navigation and the GET-form transport are unverified.** The
   decks ([`heze.html`](heze.html), [`eros.html`](eros.html)) and the
   board → bridge hand-off use standard, unremarkable mechanisms, but they were
   never watched running — the preview environment used during development
   serves files as `data:` URLs, which have neither a fragment nor a query.
3. **Only [`ship-forge.html`](ship-forge.html) persists anything**
   (`localStorage`). Every other page forgets when you close the tab, by design.
4. **Figures drift.** Where a page states a count taken from this repository,
   it says that it was counted and when. [`jakarta.html`](jakarta.html) is the
   one that will go stale first.

## What this is not

Nothing here mints, signs, transmits or settles anything, and there is no
network call anywhere in the set. HEZE and SLIME are denominations inside this
project; the ₿1 in the manifest is a stated franchise price. **None of them
implies an exchange rate to any currency, and nothing here is an offer or
financial advice.** The address fields are read locally to seed a drawing and
are never sent, because there is nothing to send them to.

## Licence

None yet — all rights reserved by default. If you want to reuse the patterns
rather than the ships, [`bare.html`](bare.html) and
[`template.html`](template.html) are the parts worth taking, and I would rather
you did.

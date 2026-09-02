# The Venusian continental farm — the roadmap

*Where the template count stands, what the base loop is, how the game re-weaves
itself, and what 100% automated means here.*

## The count

| layer | templates | on disk |
|---|---|---|
| the yard before this session (agencies, birds, fabrics, warlocks, houses, rites, forms, quests, lessons, spells, clans, …) | 353 | yes |
| the tribunal, two benches (acts, votes, verdicts, causes) | 602 | yes |
| the princes, the looms, the farm, the village, the town | 400 | yes |
| the clans' portfolio (works, bands, piles, turns), four sagas | 660 | yes |
| the market: four farms syndicated to the sixth degree, and the ten regimes | 21,854 | yes |
| Aphrodite Terra: 4,096 parcels and 6 regions, sown from the piles | 4,102 | yes |
| **total** | **27,954** | **yes** |

`node clans.mjs` and `node market.mjs` print the live total; the page
headers carry it. The templates now outweigh the program: about 9 MB of
JSON against about 7 MB of pages, generators and scripts, and the ratio
is printed by the yard so it cannot drift unnoticed. That is the rule
from here: the program should be more template than idle farm, and any
layer that can be written to disk as files is written to disk as files.

## The base loop: a Viking war of clans, as a portfolio

- Six clans from `templates-clan/`, each a house on Venus (fixing bed,
  cracking house, scriptorium, bed, relay mast, kiln), each with a resource
  (nitrogen, hydrogen, record, biomass, signal, silicate) and a period
  (2, 3, 5, 7, 11, 13 days). The periods are coprime, so no two clans ever
  fire together and the total cannot be maximised, only composed. That is the
  sixth lesson, and it is the reason a portfolio of individual assets beats
  one farm that pays a single enormous number.
- A jarl holds assets: **works** that yield on the clan's period, **bands**
  that raid on it or hold the ford against the other clans' raids, **piles**
  that keep what the night would take. Three **turns** of the four-day
  Venusian rotation scale works and raids.
- People groups gathering and stockpiling is the whole of the base layer;
  bronze is silicate and hydrogen cast together; sorcery is the warlock's six
  spells on a reserve of twenty.
- Absence is credited in full, and taken in full: every period fires and every
  raid comes while you are away.

## Re-creating the game from inside the game

The weave is one function, `weave(clans, seed)`, and it is inlined into
`clans.html`. Give the page another seed and it weaves another 165 templates
for this browser, and hands them back as one JSON bundle, one file per
template inside, ready to be written into `templates-asset/`. The same pattern
extends upward: `loom.mjs`, `village.mjs` and `town.mjs` are the next three
to inline, so the farm, the village and the town can be re-woven from their
own pages. Then a page is a loom for the page above it, all the way up.

## 100% automated

`node yard.mjs` already discovers every generator by what it reads and
writes and orders them without being told. Adding a layer is one generator
that reads the layer below and writes templates and a page; the planner
finds it. The digest (`digest.mjs`) reads every interface into the template
of enums and seals it onto the shelf; the shelf is the syndication.

## Sword and sorcery, bronze age Venus

- Bronze age: kilns and cracking houses, cairns and pits, longships on the
  lift band, no iron until the silicate and the hydrogen are both piled.
- Sword: the bands. Sorcery: the spells. Nothing with eyes; shields, masts,
  cairns, and the planet turning once in four days.

## Next, in order

1. Inline the looms into the farm, village and town pages (re-weave from inside).
2. The clans' raids on each other, not only on you: a real war of clans with
   the audit's choke test run over the raid graph every season.
3. Done: Aphrodite Terra (`continent.mjs`), the continental farm sown from
   the clans' piles, propagating on the periods, seven deep. Its provision goes
   up to the village as grain, and every ten grain in the village's store
   feeds a citizen of the town, so the chain runs clan → pile → parcel →
   village → town on one docket. The town's rent is paid back down to the
   clans, split by whose region grew the provision, and becomes stock in
   their piles at the docket price; the loop is closed. Next: the market's
   four farms priced from the loop's real throughput instead of a hash.

## The rules, pulled out

Every number the loop plays by is in `templates-rules/`: one rulebook per
deck (clans, market, continent, village, town), 54 rules with a note each,
embedded at build and read by the page. A rulebook kept in the browser
through the editor overrides it on the deck's next load, so prices, rates,
periods and the charter change without a rebuild. The docket's rulebook is
separate and not editable: it is what holds from door 1 to door 200, and
the ledger enforces it rather than any page.

## The look, pulled out

`templates-theme/` holds the ship's look: palette, type, sky, glows, the
fireflies' colours and layers, the glass, the standard. `_active.json` names
which theme is on, and `toonami.mjs` only turns it into CSS. Two themes ship:
Hesperus and Wine-dark. Change one word in `_active.json`, run
`node toonami-all.mjs`, and all 119 pages are repainted with no code edited.
The look is the one thing a browser-kept copy cannot change on its own,
because it is stamped CSS, which is what keeps the script-free pages free of
script.

## The coven, the glossary, and the symbiosis

`templates-coven/` is the starting layer of the syndication, procedurally
generated: 21 syndicates, one per tranche of a million, three custodians each
(a witch who keeps a door, a wizard who keeps the book, a warlock who carries
between), 63 practitioners over 200 doors. Two of three sign or nothing moves.
At every six-month interval the carry commits a SHA-256 checkpoint chained to
the one before, and the far side arrives with over a million events from
several worlds and reconciles without comment: the syndicate is multiplanetary
and so large it does not care, which is not contempt but scale, and is also
the safety in it, because a thing that cannot notice you cannot single you out.

`glossary.html` carries two layers. The chronicle is the idle text layer: it
watches every deck's saved state and writes a line whenever a quantity actually
moved, keeps what it wrote, and goes on writing while you are away. The
glossary is 216 terms gathered from the templates themselves at build, so a new
template is a new entry without anybody writing one.

The bridge carries the symbiosis: six links, each somebody's work feeding
somebody else's, each read off the decks' own state and marked flowing,
waiting or blocked, with one line at the top naming the earliest block. People
on the ship should know exactly what they are doing and what is going on, and
that panel is where it is said.

## Buildings and farms for the coven: crofts and holds

`templates-croft/` gives every syndicate a croft at its seat, growing sealing
wax on its own period — the (s+1)th prime, 2 through 73 for the 21 syndicates,
the war of clans' own coprime trick, so no two syndicates' crofts ever come
due together. `templates-hold/` is one catalog of four buildable structures
offered to all twenty-one, each favouring one of the three offices and one
favouring none: a watch-tower (the witch — better odds when custodians sign
on their own), an archive (the wizard — a proposal stays fresh twice as long
before it counts against the bank's health as stale), a waystation (the
warlock — carry a syndicate's own signed proposals early, without waiting the
six-month interval, never another's), and a granary (no office — more wax
storage). Effects are read from the hold's own template as the yard's usual
{type, target, x} mini language, never hard-coded in the page. Building costs
both wax and HEZE from the shared docket, so the coven's own economy still
depends on the rest of the ship: a syndicate with an empty docket cannot
build, no matter how much wax its croft has grown.

## The vocabulary and the shape, solidified

`digest-enums.json` was one big list of words for the digest layer alone.
`enums.mjs` does the same thing for every `templates-` family in the yard: it
samples what is already on disk, finds the fields that keep saying the same
small set of things rather than something new each time, and writes that
vocabulary next to the templates it came from, as `templates-<family>/_enum.json`.
A field that is a paragraph of prose, or a different value in nearly every
file, is left alone — it is data, not an enum. `enumerator.html` is the light
way to browse all of it at once: every family, color-coded, searchable by
field name, regenerated whenever `enums.mjs` runs again. 54 families, 645
enum fields, 2,747 distinct values, solidified without anybody transcribing
a word of it by hand.

`entities.mjs` goes one step further, since Scala is the production language
for Venus: for every family it infers the full shape, not just the closed
fields, down three levels deep, and writes one Scala source file under
`venus-core/src/main/scala/io/cityoflight/virgo/scala/templates/` — a real
`enum`, backed by the raw string, for every closed vocabulary field; a case
class for every nested object and every array of them; and one top case
class that is the whole template's body. `Template.fromMap` rebuilds an
instance exactly from its own decoded fields, so a family really can be
recreated from the one class its own file declares, nothing borrowed from
another family's generated code. 53 families, 109 case classes, 317 enums,
and all of it — checked, not assumed — compiles clean under `scala-cli
compile` on Scala 3.8.4. `venus-core/` did not exist before this; it is
created fresh at that path because that is where `CLAUDE.md` already says
Scala code in this repo lives.

The two scripts are auto-discovered by `yard.mjs` the same as every other
generator, by what they read and write, so rebuilding the whole yard keeps
both layers current without anyone adding a line to a list.

## The syndicates, alive: activity, and a reason to steal

`templates-activity/` gives every syndicate a light — quiet, planning, discovery or staged —
rerolled every activityEvery days, weighted, with its own line for what it is looking into,
so a glance at the syndicate list says something about what is happening there without
opening it. Quiet has nothing to take; planning is safe to try against and forgettable if
it fails; discovery is a syndicate already auditing something, worth the risk only because
what it is about to find is worth more than what is easy; staged is money already signed
and waiting on the six-month gate, the single best moment to move first. A successful steal
credits HEZE straight onto the shared docket — smuggled into Venus ahead of an honest carry
— through the same capped `credit()` every other deck uses. A failed attempt against
discovery or staged leaves the syndicate alert for stealCooldown days, locked against
another attempt and forced into discovery, because now it is looking for what almost went
missing. Effects live in the activity's own template, the same {chance, min, max} shape
throughout, read by coven.page.js and never hard-coded there.

## The terminal: the notebook before the automation

`terminal.html` is the text layer for the whole ship: `sow 31 44`, `take
<id>`, `sign <id> <office>`, `carry` all act on the same saved state the
buttons act on, immediately, and say what they changed. It is the notebook
half of "notebook, API calls, JSON, then automation": `json <path>` reads a
template as built, `api <path>` calls the ledger server on 7332, `set <path>
<key> <value>` changes a rule and keeps it in the browser the same way the
quarter's editor does. Only once a sequence of commands is right by hand can
it be `record`ed into a macro and `automate`d on an interval — nothing runs
unattended that was not first typed by a person. `look` reads the symbiosis
and says what to do next; `define` reads the glossary; `chronicle` reads what
the ship already wrote about itself.

## Venus M1

This build is the first mark of the ship: the loop closed, the bridge as the
front page, the quarter furnished, the counsel aboard (through the ledger
server, when it has a key), and the editor, which makes any template on the
ship customizable from inside it and hands the change back as a file. M2 is
the decks reading those customizations directly, so a change made in the
workshop shows on every deck without a rebuild; and the corn guilds run in
the town.

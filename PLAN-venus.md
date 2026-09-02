# The Venusian continental farm — the roadmap

*Where the template count stands, what the base loop is, how the game re-weaves
itself, and what 100% automated means here.*

## The count

| layer | templates | on disk |
|---|---|---|
| the yard before this session (agencies, birds, fabrics, warlocks, houses, rites, forms, quests, lessons, spells, clans, …) | 353 | yes |
| the tribunal, two benches (acts, votes, verdicts, causes) | 602 | yes |
| the princes, the looms, the farm, the village, the town | 400 | yes |
| the clans' portfolio (works, bands, piles, turns) | 165 | yes |
| **total** | **1,500** | **yes** |

`node clans.mjs` prints the live total; the page header carries it.

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
3. The continental farm: the clans' piles feed the farm's fields, the farm
   the village, the village the town; one docket, one chain, seven deep.

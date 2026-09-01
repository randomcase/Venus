# The transformation of things — a layer that does not end

*Built on 2026-09-01 as three blocks in the JSON (`becoming`, `forest`,
`mycelium`), in both editions. n0 stays as it was in `templates/n0.json`; the
live rules with the layer are `templates/n1.json`. What follows is the plan
it was built from; numbers in section 7 are the shipped ones.*

Zhuangzi ends his second chapter with the butterfly and one line: "this is
called the transformation of things." The blade of grass does not stay a blade.
It flowers. The flower becomes an acorn, which is the wrong seed for a grass
and exactly the point: things become other things, and the becoming never
closes. That is the layer. Nothing in it has eyes.

## 1. The loop

Your blade has a **form**. The first six are named:

| # | form    | what it does while it is this                    | becomes the next when |
|---|---------|--------------------------------------------------|-----------------------|
| 0 | blade   | nothing extra; it is the game you have           | 1,000 grass, all time |
| 1 | flower  | creatures ×1.2 arrive per rain (bees follow it)  | 20,000 grass and 30 te |
| 2 | acorn   | stillness returns ×1.5; growth ×0.8 (it waits)   | 200 days without acting |
| 3 | sapling | ground +500, meadow ×1.3                         | 1M grass, one grove let happen |
| 4 | oak     | holds: crew upkeep ×0.6, weather ×0.5            | 100M grass, 6 chapters reached |
| 5 | grove   | everything ×1.3; the oak's own acorns            | 1B grass, all chapters |

After the grove, the oak drops an acorn and the **ring** closes: form goes back
to 0, the ring count goes up by one, the meadow is *not* reset. That is the
difference from Return to the root: becoming keeps everything you let happen
and changes only what you are.

**Ring 2 onward is generated, not listed.** The named six are ring 1's script.
From ring 2 the forms are rolled from templates (section 3), so each ring is a
different path through different plants with different passives and higher
thresholds. There is no last form because there is no list to run out of.

Becoming costs nothing and asks nothing except the threshold. You may decline
it and stay a flower forever. The game does not mind.

## 2. Why it does not end

- **The generator, not a list.** Ring *r*, form *i* is a deterministic function
  of (r, i, seed) so both editions agree and a save is portable. Thresholds
  grow ×12 per form and ×3 per ring on top; passives are drawn from a pool
  whose members scale with ring number; names are composed from parts.
- **Compounding without a ceiling.** Each form completed is +5% to everything,
  permanent; each ring closed is +25% and one **acorn** kept. Acorns are a
  currency spent on nothing, deliberately: the count is the score, if you want
  a score, and the sayings that mention it are the only place it shows.
- **Diminishing but never zero.** Multipliers are additive per form
  (+5%, +5%, …) rather than multiplicative, so ring 40 is not absurd and ring 4
 is not already meaningless. The numbers get big; the Tao is fine with that.
- **The path changes.** Because passives are rolled, ring 7 might give you a
  fern that halves seed rot and a bramble that hoards ground, and ring 8 a
  lotus that only grows when water is capped. The rules you learned still
  hold; what you are doing with them shifts.

## 3. The data (additions to def.json)

```json
"becoming": {
  "note": "The transformation of things. Forms for ring 1; a generator after that.",
  "seed": 64,
  "perForm": 0.05, "perRing": 0.25,
  "forms": [
    { "id": "blade",   "name": "the blade",   "shape": "blade",   "when": { "total": { "grass": 1000 } } },
    { "id": "flower",  "name": "the flower",  "shape": "flower",  "when": { "total": { "grass": 20000 }, "res": { "science": 30 } },
      "effects": [ { "type": "mul", "target": "crewMass", "x": 0.83 } ] },
    { "id": "acorn",   "name": "the acorn",   "shape": "acorn",   "when": { "stillDays": 200 },
      "effects": [ { "type": "mul", "target": "stillness", "x": 1.5 }, { "type": "mul", "target": "all", "x": 0.8 } ] },
    { "id": "sapling", "name": "the sapling", "shape": "sapling", "when": { "total": { "grass": 1e6 }, "n": { "grove": 1 } },
      "effects": [ { "type": "add", "target": "liftBase", "x": 500 }, { "type": "mul", "target": "machine:meadow", "x": 1.3 } ] },
    { "id": "oak",     "name": "the oak",     "shape": "oak",     "when": { "total": { "grass": 1e8 }, "sectors": 6 },
      "effects": [ { "type": "mul", "target": "crewWater", "x": 0.6 }, { "type": "mul", "target": "storm", "x": 0.5 } ] },
    { "id": "grove",   "name": "the grove",   "shape": "grove",   "when": { "total": { "grass": 1e9 }, "sectors": "all" },
      "effects": [ { "type": "mul", "target": "all", "x": 1.3 } ] }
  ],
  "generator": {
    "names": { "first": ["the bent", "the wet", "the late", "the unlit", "the low", "the patient", "the unnamed", "the useless"],
               "plant": ["fern", "bramble", "lotus", "willow", "moss", "reed", "plum", "pine", "gourd", "thistle", "lichen", "sedge"] },
    "shapes": ["fern", "bramble", "lotus", "willow", "tuft", "reed", "blossom", "pine", "gourd", "thistle", "lichen", "sedge"],
    "passives": [
      { "effects": [ { "type": "mul", "target": "decay", "x": 0.5 } ],            "text": "nothing rots while it stands" },
      { "effects": [ { "type": "mul", "target": "lift", "x": 1.4 } ],             "text": "it takes ground and gives it back" },
      { "effects": [ { "type": "mul", "target": "cap", "x": 1.5 } ],              "text": "it holds water" },
      { "effects": [ { "type": "mul", "target": "science", "x": 1.5 } ],          "text": "sitting near it is enough" },
      { "effects": [ { "type": "mul", "target": "stillness", "x": 1.6 } ],        "text": "it does not move and you stop moving" },
      { "effects": [ { "type": "mul", "target": "crewNeed", "x": 0.6 } ],         "text": "the creatures do its work for it" },
      { "effects": [ { "type": "add", "target": "night", "x": 0.3 } ],            "text": "it is pale enough to see by" },
      { "effects": [ { "type": "mul", "target": "cargo", "x": 1.3 } ],            "text": "the rains find it" }
    ],
    "threshold": { "base": 1000, "perForm": 12, "perRing": 3, "formsPerRing": 6 },
    "twist": { "every": 3, "text": "one form in three also asks for a quiet stretch: stillDays = 100 × ring" }
  }
}
```

`when` is a small predicate language: `total`, `res`, `n`, `sectors` (number or
`"all"`), `stillDays` (days since the last act). All of it already exists in the
state except `stillDays`, which is one counter.

Two new effect targets: `liftBase` (additive ground) and, later, `formBonus`.

## 4. Engine changes (both editions, small)

- State: `form` (index within ring), `ring`, `acorns`, `sinceAct`, `formsDone`.
- `sinceAct` resets on tap; `stillDays` predicates read it.
- `T.formDef()` returns the current form: from `forms[]` if ring 1, else from
  `generate(ring, form)`, which hashes (seed, ring, form) into name parts, a
  shape, a passive, and a threshold. Same hash in JS and Scala (a 32-bit
  xorshift on the three ints; no floats).
- `T.canBecome()` evaluates the current form's `when`; `T.become()` advances,
  logs it, and if `form === formsPerRing` closes the ring: `ring++`, `form = 0`,
  `acorns++`. Never resets anything else.
- `recompute()` applies the current form's effects, then
  `all *= 1 + perForm × formsDone + perRing × (ring − 1)`.
- Save shape gains five fields; old saves load as ring 1, form 0.
- API: `GET /api/form`, `POST /api/become`. `Tick.form()`, `Tick.become()`.

## 5. The room

- The blade tab becomes **Your form**: what you are, what it does, what it takes
  to become the next, a "Become" button that lights when the predicate holds.
  The blade template still styles it (colours, lean, dew, root) whatever the
  shape is.
- The scene draws the shape at the bank: blade, flower head, an acorn on the
  ground, a sapling, an oak with a canopy that widens by ring, a grove of
  three. Generated shapes reuse the same twelve silhouettes. None of them have
  eyes, faces, or anything that looks back.
- A ring band around the stat strip: ring number and acorns, drawn as tree
  rings, one per ring closed.
- The log says the becoming in one line: "The flower became the acorn. It is
  waiting."

## 6. Ties to what exists

- Sayings: "The transformation of things" (unlock: becoming visible; without it
  the form is just the blade), "Wood that is useless lives" (oak ×1.2),
  "The butterfly's question" (ring bonus +5%).
- Milestones: first flower, first acorn, first ring, ten rings.
- Return to the root keeps `ring` and `acorns` but sets `form` to 0, so returns
  and rings compound instead of competing.
- Guests: the crane nests only in an oak or later (`needsForm: "oak"`); the
  butterfly's dream is ×2 while you are a flower.

## 7. Numbers, first guess

| ring | form thresholds (grass, all time)             | bonus at ring close |
|------|-----------------------------------------------|---------------------|
| 1    | 1k · 20k · (200 still days) · 1M · 100M · 1B  | +25% and 1 acorn    |
| 2    | 3k · 36k · 430k · 5M · 62M · 750M ×3          | +25%                |
| r    | base × 12^i × 3^(r−1)                          | +25% each           |

With n0's rates a first ring is about a long evening; ring 5 is weeks of idle.
That is the intended slope. If it is wrong the generator has two knobs.

## 8. Order of work

1. `sinceAct`, `when` predicates, `become()` with the six named forms. Ring 1
   only. JS and Scala together, saves round-trip.
2. The generator and the hash. Test that ring 2 form 3 is the same plant in
   both editions.
3. The room: form tab, ring band, shapes.
4. The sayings, milestones and guest ties.
5. Ship it as a block in `templates/n0.json`? No: as `templates/n0-becoming.json`
   on the maybe list first, then fold into n0 once ring 3 has been reached by
   a person.

## 9. Not in this

- No form ever costs a resource. Becoming is what happens when you have been
  something long enough.
- No form is worse than the last except the acorn, on purpose.
- No end state, no "final form", no leaderboard beyond the acorn count in the
  corner. The flower becomes the acorn, the acorn becomes the tree, the tree
  drops an acorn. That is the whole of it.

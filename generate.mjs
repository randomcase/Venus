#!/usr/bin/env node
/* generate.mjs — boards from a spec, out of template.html.
 *
 *   node generate.mjs                    # writes the boards in SPEC below
 *   node generate.mjs --count 1000       # writes 1000 procedural boards
 *   node generate.mjs --out boards       # somewhere other than ./boards
 *
 * Why a generator and not a thousand files in the repository: a thousand
 * near-identical boards is a thousand things to keep in step, and the moment
 * the template improves every one of them is stale. The spec is the artefact
 * worth keeping. The boards are output.
 *
 * What it does NOT do: invent numbers and present them as findings. Procedural
 * boards are stamped `procedural: true` in their own markup and their figures
 * are labelled as generated, because a number nobody chose is not evidence and
 * should never be able to pass for it.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const TEMPLATE = 'template.html';

/* ------------------------------------------------------------------ the spec
 * One object per board. Everything the template needs to become a real thing:
 * a name, a purpose, three choices, two states, three additions, and the
 * lookup table that the choice × state pair resolves to. */
const SPEC = [
  {
    slug: 'refit', title: 'Refit Yard',
    sub: 'What a hull costs to bring back into the line, by the state she came in at.',
    accent: '#e0b155',
    choice: { label: 'Damage', opts: [['light','Light',{units:1,mass:40}],
      ['heavy','Heavy',{units:2,mass:140}],['hulk','Hulk',{units:4,mass:320}]] },
    state:  { label: 'Dock', on: 'Graving dock', off: 'Alongside' },
    adds: [['Plating renewal',{mass:26,crew:12}],['Rewiring',{mass:14,crew:4}],
           ['Engine lift',{mass:31,crew:9}]],
    lookup: { on: [900, 3400, 9800], off: [400, 1200, 0] },
    lookupNote: 'A hulk cannot be worked alongside — that cell is zero because the work is impossible, not because it is free.'
  },
  {
    slug: 'watch', title: 'Watch Bill',
    sub: 'Who has the deck, and what the rest of the ship is doing while they do.',
    accent: '#6ec6ff',
    choice: { label: 'Watch system', opts: [['three','Three watch',{units:3,mass:0}],
      ['two','Two watch',{units:2,mass:0}],['ps','Port and starboard',{units:2,mass:0}]] },
    state:  { label: 'Condition', on: 'Cruising', off: 'Action' },
    adds: [['Bridge team',{mass:0,crew:6}],['Engine room',{mass:0,crew:11}],
           ['Damage control',{mass:0,crew:24}]],
    lookup: { on: [8, 12, 12], off: [4, 6, 6] },
    lookupNote: 'Hours on before relief. At action stations nobody is relieved on a schedule; the figure is how long before it starts to tell.'
  },
  {
    slug: 'assay', title: 'Cargo Assay',
    sub: 'What is in the hold, what it weighs, and what the stage will charge to touch it.',
    accent: '#65d6a8',
    choice: { label: 'Consignment', opts: [['bulk','Bulk',{units:1,mass:120}],
      ['break','Break bulk',{units:2,mass:80}],['bonded','Bonded',{units:1,mass:40}]] },
    state:  { label: 'Seal', on: 'Sealed', off: 'Open to inspection' },
    adds: [['Cold stowage',{mass:18,crew:2}],['Dunnage and lashing',{mass:9,crew:4}],
           ['Escort of the bonded lot',{mass:2,crew:6}]],
    lookup: { on: [140, 260, 620], off: [90, 180, 380] },
    lookupNote: 'Handling fee in HEZE. A sealed consignment costs more because nobody may open it to make it easier to move.'
  },
];

/* --------------------------------------------------------------- procedural
 * Deterministic from an index — same n, same board, every run. No clock, no
 * randomness that cannot be reproduced. */
const NOUNS = ['Ledger','Berth','Bunker','Manifest','Lighter','Bond','Tender',
  'Quay','Bailment','Charter','Draught','Lien','Salvage','Warrant','Consign'];
const KINDS = ['Board','Return','Assay','Schedule','Register','Survey'];
const A = ['light','standard','heavy'], B = ['open','closed'];
const rot = (n, m) => n % m;

function procedural(n) {
  const noun = NOUNS[rot(n, NOUNS.length)], kind = KINDS[rot(n * 7, KINDS.length)];
  const base = 20 + rot(n * 13, 60);
  return {
    slug: `p-${String(n).padStart(4, '0')}`,
    title: `${noun} ${kind}`,
    sub: `Generated board ${n}. The shape is real and the figures are not — they are arithmetic on an index, and the board says so on its face.`,
    accent: ['#e0b155','#6ec6ff','#65d6a8','#8a6ab8','#e58593'][rot(n, 5)],
    procedural: true,
    choice: { label: 'Grade', opts: A.map((a, i) =>
      [a, a[0].toUpperCase() + a.slice(1), { units: i + 1, mass: base * (i + 1) }]) },
    state: { label: 'Status', on: B[0][0].toUpperCase() + B[0].slice(1),
             off: B[1][0].toUpperCase() + B[1].slice(1) },
    adds: [['First line', { mass: base, crew: rot(n * 3, 20) }],
           ['Second line', { mass: Math.round(base / 2), crew: rot(n * 5, 12) }],
           ['Third line', { mass: Math.round(base / 3), crew: rot(n * 11, 8) }]],
    lookup: { on: [base * 2, base * 4, base * 8], off: [base, base * 2, base * 4] },
    lookupNote: 'Generated figures. Nothing here was measured or chosen; do not cite it.'
  };
}

/* ------------------------------------------------------------------- render */
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function build(tpl, b) {
  let s = tpl;
  const ids = b.choice.opts.map((o) => o[0]);

  /* counters — one line per option, exactly as the template documents */
  const counters = [
    ...b.choice.opts.map(([id, , n]) =>
      `  #o-${id}:checked+label{counter-increment:units ${n.units} mass ${n.mass}}`),
    ...b.adds.map(([, n], i) =>
      `  #k-${i + 1}:checked+label{counter-increment:mass ${n.mass} crew ${n.crew}}`),
  ].join('\n');
  /* the template's TODO comment is instruction to the author, not output */
  s = s.replace('  /* TODO: one line per option. The numbers here are the whole model. */\n', '');
  s = s.replace(/  #o-a:checked\+label\{[\s\S]*?#k-3:checked\+label\{[^}]*\}/, counters);

  /* the lookup table: choice × state, written out because CSS cannot multiply */
  const look = [
    ...ids.map((id, i) => `  .board:has(#o-${id}:checked):has(#s-on:checked)` +
      `  .look::after{content:"${b.lookup.on[i]}"}`),
    ...ids.map((id, i) => `  .board:has(#o-${id}:checked):has(#s-off:checked)` +
      ` .look::after{content:"${b.lookup.off[i]}"}`),
  ].join('\n');
  /* anchor on the last rule of the documented block, not the first "0" in it —
     a non-greedy stop left two stale template rules behind and they referenced
     option ids that no generated board has */
  s = s.replace(
    /  \.board:has\(#o-a:checked\):has\(#s-on:checked\)[\s\S]*?#o-c:checked\):has\(#s-off:checked\)[^}]*\}/,
    look);

  /* markup */
  const optsHtml = b.choice.opts.map(([id, label], i) =>
    `        <input type="radio" name="o" id="o-${id}" form="vy" value="${id}"` +
    `${i === 1 ? ' checked' : ''}><label for="o-${id}">${esc(label)}</label>`).join('\n');
  s = s.replace(/        <input type="radio" name="o"[\s\S]*?<\/label>\n(?=      <\/div>)/, optsHtml + '\n');

  const addsHtml = b.adds.map(([label, n], i) =>
    `        <input type="checkbox" id="k-${i + 1}" form="vy" name="k" value="${i + 1}"` +
    `${i === 0 ? ' checked' : ''}>\n        <label for="k-${i + 1}"><i class="tick"></i>` +
    `${esc(label)}<span class="amt">${n.mass}</span></label>`).join('\n');
  s = s.replace(/        <input type="checkbox" id="k-1"[\s\S]*?<\/label>\n(?=      <\/div>)/, addsHtml + '\n');

  s = s.replace('<title>TEMPLATE · a board</title>', `<title>${esc(b.title)}</title>`);
  s = s.replace('<h1>TEMPLATE</h1><!-- TODO: name the board -->', `<h1>${esc(b.title)}</h1>`);
  s = s.replace(/<span class="sub">TODO:[\s\S]*?<\/span>/, `<span class="sub">${esc(b.sub)}</span>`);
  s = s.replace('--gold:#e0b155;', `--gold:${b.accent};`);
  s = s.replace('>Choice <b>one of three</b>', `>${esc(b.choice.label)} <b>one of three</b>`);
  s = s.replace('>Switch <b>state</b>', `>${esc(b.state.label)} <b>two states</b>`);
  s = s.replace('<label for="s-on">On</label>', `<label for="s-on">${esc(b.state.on)}</label>`);
  s = s.replace('<label for="s-off">Off</label>', `<label for="s-off">${esc(b.state.off)}</label>`);
  s = s.replace(/§3 — six rules[\s\S]*?can read\./, esc(b.lookupNote));
  s = s.replace(/Switch is <b>on<\/b>\. TODO: what that means here\./,
    `${esc(b.state.label)}: <b>${esc(b.state.on)}</b>.`);
  s = s.replace(/Switch is <b>off<\/b>\. TODO: what that means here\./,
    `${esc(b.state.label)}: <b>${esc(b.state.off)}</b>.`);
  s = s.replace('value="TEMPLATE"', `value="${b.slug}"`);
  s = s.replace('"board": "TEMPLATE"', `"board": "${b.slug}"`);
  s = s.replace('"$note": "TODO: the document this board authors"',
    `"$note": "${b.procedural ? 'procedural board; figures are generated' : esc(b.sub)}"`);
  s = s.replace('bridge.html?board=TEMPLATE', `bridge.html?board=${b.slug}`);

  /* a generated board says so, in its own markup, where it cannot be missed */
  if (b.procedural) {
    s = s.replace('<span class="tag">no script</span>',
      '<span class="tag" style="color:var(--warn);border-color:var(--warn)">' +
      'generated · figures not measured</span>');
    s = s.replace('<!--\n  A BOARD.',
      '<!--\n  GENERATED by generate.mjs. The layout is the template\'s and the\n' +
      '  numbers are arithmetic on an index — nobody chose them and nothing\n' +
      '  measured them. Do not cite a figure from this file.\n\n  A BOARD.');
  }
  return s;
}

/* ---------------------------------------------------------------------- run */
const args = process.argv.slice(2);
const getArg = (k, d) => { const i = args.indexOf(k); return i < 0 ? d : args[i + 1]; };
const count = parseInt(getArg('--count', '0'), 10);
const out = getArg('--out', 'boards');

const tpl = readFileSync(TEMPLATE, 'utf8');
mkdirSync(out, { recursive: true });

const boards = count > 0 ? Array.from({ length: count }, (_, i) => procedural(i + 1)) : SPEC;
let bytes = 0;
for (const b of boards) {
  const html = build(tpl, b);
  writeFileSync(join(out, b.slug + '.html'), html);
  bytes += html.length;
}

/* an index of what was written, so the output is navigable rather than a heap */
const list = boards.map((b) =>
  `    <li><a href="${b.slug}.html">${esc(b.title)}</a>` +
  `<span>${b.procedural ? 'generated' : 'authored'}</span></li>`).join('\n');
writeFileSync(join(out, 'index.html'),
`<title>Boards · ${boards.length}</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
 body{margin:0;padding:22px 18px 40px;background:#080b0f;color:#e9f0f5;
   font:13.5px/1.6 ui-rounded,system-ui,sans-serif}
 .w{max-width:760px;margin:0 auto}
 h1{margin:0 0 4px;font-size:22px;letter-spacing:-.02em}
 p{color:#8a9aa8;font-size:11.5px;max-width:78ch}
 ul{list-style:none;margin:16px 0 0;padding:0;display:grid;gap:6px}
 li{display:flex;align-items:baseline;gap:10px;background:#111a22;
   border:1px solid #26333f;border-radius:9px;padding:10px 13px}
 a{color:#e0b155;text-decoration:none;font-size:14px}
 a:hover{text-decoration:underline}
 li span{margin-left:auto;font:8.5px/1 ui-monospace,monospace;letter-spacing:.14em;
   text-transform:uppercase;color:#8a9aa8}
</style>
<div class="w">
  <h1>Boards</h1>
  <p>${boards.length} written from <code>template.html</code> by
  <code>generate.mjs</code>. Boards marked <b>generated</b> carry figures that
  are arithmetic on an index — nobody chose them and nothing measured them, and
  each one says so on its own face. Nothing here should be cited.</p>
  <ul>
${list}
  </ul>
</div>
`);

console.log(`${boards.length} board(s) → ${out}/  (${Math.round(bytes / 1024)} KB)`);
console.log(`index: ${out}/index.html`);

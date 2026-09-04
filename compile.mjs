#!/usr/bin/env node
/* compile.mjs — compile the syndicated templates into the patterns they share.
 *
 *   node compile.mjs            # writes templates/patterns.html and .json
 *   node compile.mjs --out foo  # somewhere else
 *
 * THE PROBLEM THIS FIXES
 * templatise.mjs emits one template per page, and each one carries its source
 * page's entire stylesheet. That is forty-one copies of largely the same six
 * ideas wearing forty-one different palettes. It is syndication: the same thing
 * distributed, not the same thing factored. Change how a counter works and you
 * have forty-one files to revisit and no way to know you got them all.
 *
 * This compiles the other direction. It reads every authored page, finds each
 * technique by its selector shape, counts where it is used, and pulls out the
 * SHORTEST REAL INSTANCE of each from the corpus — not an example somebody
 * wrote for a documentation page, but the smallest line in this repository that
 * is actually doing that job in production. Those go into one file.
 *
 * WHAT IS AUTOMATED AND WHAT IS NOT
 * The census is computed: counts, pages, the winning instance and where it came
 * from are all derived, so they cannot drift from the corpus. The prose about
 * why each pattern works is written by hand, because a regex has no opinion
 * about why cascade order matters and should not pretend to.
 *
 * The output has no palette. A pattern is a selector shape and nothing else,
 * and a pattern library that ships a colour scheme has quietly become a
 * framework.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const GENERATED = new Set(['defense-run.html']);
const SKIP = new Set(['arcade.html', ...GENERATED]);

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* ------------------------------------------------------------- the patterns
   Each one is a predicate over a single parsed rule, plus the reason it works.
   Every instance in the corpus is collected and the SHORTEST wins, because the
   shortest real instance is the clearest statement of the shape. */
/* Parse a stylesheet into individual (selector, declarations) pairs, with
   comma-separated selector lists split apart.

   Doing this once and letting each pattern be a predicate over ONE selector is
   both more correct and less fragile than a regex per pattern. The first
   version of this file used the regex approach and reported :target in one page
   when three use it, because its selector pattern could not cross the newlines
   inside a comma-separated list. The number was wrong in the one direction that
   matters — under — and the whole claim of this file is that its numbers cannot
   drift. */
function rules(css) {
  const out = [];
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const decls = m[2].replace(/\s+/g, ' ').trim();
    if (!decls) continue;
    for (const sel of m[1].split(',')) {
      const s = sel.replace(/\s+/g, ' ').trim();
      if (s && !s.startsWith('@') && !s.includes('*/')) out.push({ sel: s, decls });
    }
  }
  return out;
}

const hasCount = (sel) => (sel.match(/:has\(/g) || []).length;

const PATTERNS = [
  {
    id: 'counter',
    name: 'Counters are arithmetic',
    job: 'The browser adds for you',
    match: (r) => /counter-increment:/.test(r.decls),
    why: `Declare the counters once on <code>body</code>, increment where the
      state changes, print with <code>content:counter()</code>. The total is not
      stored anywhere and cannot disagree with the inputs, because it is
      recomputed from them on every repaint. <b>A counter can only be printed
      after the things that increment it</b> — inputs first in the DOM, totals
      after, layout put back with grid. That single constraint is why every
      board in this repository is arranged the way it is.`,
  },
  {
    id: 'state',
    name: ':has() is state',
    job: 'An ancestor styled by what is inside it',
    match: (r) => hasCount(r.sel) === 1 && /:checked|:target/.test(r.sel),
    why: `A state machine with nothing to keep in sync. The most common way to
      get it wrong is scope: the rule must be anchored on an ancestor of
      <b>both</b> the switch and the thing it drives, and a rule scoped to the
      wrong ancestor fails silently — no error, nothing happens, and it looks
      like the property is unsupported.`,
  },
  {
    id: 'lookup',
    name: 'Compound :has() is a lookup',
    job: 'Two keys, one answer',
    match: (r) => hasCount(r.sel) >= 2 && !/:not\(/.test(r.sel),
    why: `How you get multiplication out of a language that has none: you write
      the products. Three options by two states is six rules and there is no
      shortcut — but every cell was typed by someone who can be asked about it,
      which is a better property than most computed tables have. <b>Adding an
      axis costs rules linearly and adds cells combinatorially</b>, and the
      moment you want to avoid that cost is the moment to re-read what it buys.`,
  },
  {
    id: 'store',
    name: ':target is the store',
    job: 'State that survives a reload',
    match: (r) => /:target/.test(r.sel),
    why: `The URL fragment is the only durable state a scriptless page has and
      <code>:target</code> is the only selector that reads it. A link writes it,
      the browser keeps it in history, and reload restores it. The price is
      exact: <b>one target per document</b>, so a stored value must name a whole
      combination and there is no partial update. Nothing in CSS can read the
      query string — that half of a URL is write-only from here.`,
  },
  {
    id: 'stop',
    name: 'Cascade order is authority',
    job: 'What is written last wins',
    match: (r) => /:not\(:has\(/.test(r.sel),
    why: `Later rules beat equally specific ones above them, so the rule that
      must not be overridden goes last. <b>Cascade order only settles ties.</b>
      A stop rule with fewer <code>:has()</code> in it than the rules it is
      trying to beat loses outright, silently, and typically works on exactly
      the cases you would test first — see the note at the foot of
      <code>ecosystem.html</code>, where that happened and is kept in place.`,
  },
  {
    id: 'transport',
    name: 'A GET form is transport',
    job: 'The browser serialises and navigates',
    html: (html) => [...html.matchAll(/(<form[^>]*method="get"[^>]*>)/g)].map((m) => m[1]),
    why: `No fetch, no endpoint, no server. <code>form="vy"</code> associates an
      input with a form anywhere in the document, so the markup does not have to
      be reorganised around the transport. On submit the browser encodes the
      checked inputs into the query string and opens the target.`,
  },
];

/* ------------------------------------------------------------------ compile */
const args = process.argv.slice(2);
const outDir = (() => { const i = args.indexOf('--out'); return i < 0 ? 'templates' : args[i + 1]; })();

const pages = readdirSync('.').filter((f) => f.endsWith('.html') && !SKIP.has(f)).sort();

const census = PATTERNS.map((p) => ({ ...p, uses: 0, pages: [], shortest: null, from: null }));

for (const file of pages) {
  const html = readFileSync(file, 'utf8');
  const css = (html.match(/<style>[\s\S]*?<\/style>/) || [''])[0];
  const parsed = rules(css);
  for (const p of census) {
    const found = p.html
      ? p.html(html)
      : parsed.filter(p.match).map((r) => `${r.sel}{${r.decls}}`);
    if (!found.length) continue;
    p.uses += found.length;
    p.pages.push(file);
    for (const inst of found) {
      const flat = inst.replace(/\s+/g, ' ').trim();
      if (!p.shortest || flat.length < p.shortest.length) { p.shortest = flat; p.from = file; }
    }
  }
}

const totalRules = census.reduce((a, p) => a + p.uses, 0);

/* the machine-readable half, so this is data and not only a page */
writeFileSync(join(outDir, 'patterns.json'), JSON.stringify({
  manifest: 'venus.yard/patterns/1',
  pages: pages.length,
  patterns: census.map(({ id, name, job, uses, pages, shortest, from }) =>
    ({ id, name, job, uses, pages: pages.length, shortest, from })),
  $note: 'compiled by compile.mjs from the corpus; do not hand-edit',
}, null, 2) + '\n');

const rows = census.map((p) => `
  <section id="${p.id}">
    <h2>${esc(p.name)} <b>${esc(p.job)}</b></h2>
    <p class="why">${p.why}</p>
    <div class="tape">
      <span><i>used</i>${p.uses} time${p.uses === 1 ? '' : 's'}</span>
      <span><i>across</i>${p.pages.length} page${p.pages.length === 1 ? '' : 's'}</span>
      <span><i>smallest real instance, from</i><a href="../${p.from}">${esc(p.from || '—')}</a></span>
    </div>
    <pre>${esc(p.shortest || 'no instance found in the corpus')}</pre>
  </section>`).join('\n');

writeFileSync(join(outDir, 'patterns.html'), `<title>Patterns · compiled from ${pages.length} pages</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<!--
  COMPILED, not written. compile.mjs reads every authored page, finds each
  technique by its selector shape, counts where it is used, and lifts out the
  SHORTEST REAL INSTANCE of each from the corpus — the smallest line in this
  repository actually doing that job, rather than an example invented for a
  documentation page.

  Re-run it and the numbers move with the repository. They cannot drift, because
  nobody types them.

  WHY THIS EXISTS
  templatise.mjs emits one template per page and each carries its source page's
  whole stylesheet: forty-odd copies of six ideas in forty-odd palettes. That is
  syndication — the same thing distributed rather than factored — and it means
  changing how a counter works is forty-one edits with no way to know you got
  them all. This is the other direction.

  There is no palette here on purpose. A pattern is a selector shape and nothing
  else; a pattern library that ships a colour scheme has become a framework.

  No script.
-->
<style>
  *{box-sizing:border-box}
  body{margin:0;padding:22px 18px 48px;background:#0a0c10;color:#e8edf3;
    font:13.5px/1.66 ui-rounded,system-ui,-apple-system,sans-serif}
  .w{max-width:900px;margin:0 auto}
  h1{margin:0 0 6px;font-size:23px;letter-spacing:-.02em}
  .lede{color:#8b96a6;font-size:11.5px;max-width:88ch;margin:0 0 6px}
  .lede b{color:#e8edf3}
  h2{font:9.5px/1 ui-monospace,Menlo,monospace;letter-spacing:.2em;
    text-transform:uppercase;color:#8b96a6;margin:30px 0 10px;font-weight:600}
  h2 b{color:#e0b155;font-family:inherit;letter-spacing:0;text-transform:none;
    font-size:10.5px;margin-left:10px}
  .why{color:#a9b4c2;font-size:12px;max-width:88ch;margin:0}
  .why b{color:#e8edf3} .why code,p code{font:11px ui-monospace,monospace;
    color:#e0b155;background:#0e131b;border:1px solid #232d3c;border-radius:4px;padding:1px 5px}
  .tape{display:flex;gap:18px;flex-wrap:wrap;margin:11px 0 0;
    font:9.5px/1.6 ui-monospace,monospace;color:#8b96a6}
  .tape i{font-style:normal;color:#5c6b7d;letter-spacing:.13em;
    text-transform:uppercase;margin-right:7px}
  .tape a{color:#e0b155}
  pre{margin:9px 0 0;padding:12px 13px;background:#080b11;border:1px solid #232d3c;
    border-radius:9px;overflow-x:auto;font:11.5px/1.6 ui-monospace,monospace;color:#cfd8e4}
  footer{margin-top:34px;border-top:1px solid #232d3c;padding-top:14px;
    color:#8b96a6;font-size:10.5px;max-width:92ch}
  a{color:#e0b155}
</style>
<div class="w">
  <h1>Patterns</h1>
  <p class="lede">Six shapes, compiled out of ${pages.length} authored pages and
    ${totalRules} matching rules. <b>Nothing on this page was typed by hand
    except the reasons.</b> The counts and the code are lifted from the corpus
    by <a href="../compile.mjs">compile.mjs</a>, and the sample shown for each
    pattern is the shortest real instance of it in the repository — not an
    example written for a documentation page, but the smallest line actually
    doing that job somewhere in the yard.</p>
  <p class="lede">There is no colour scheme here. A pattern is a selector shape;
    the moment a pattern library ships a palette it has become a framework, and
    the forty-one per-page templates in this folder already carry every palette
    anybody needs.</p>
${rows}

  <footer>
    <b>Syndication versus automation.</b> The templates beside this file are one
    per page, each carrying its source page's entire stylesheet — the same six
    ideas copied forty-odd times in forty-odd palettes. That is useful for
    starting a board and useless for changing one: alter how a counter works and
    it is forty-one edits with no way to know you found them all. This file is
    the other direction, and it is regenerated rather than maintained. If a
    number here is wrong, the fix is to run the compiler, not to edit the page.
    <br><br>
    Machine-readable copy: <a href="patterns.json">patterns.json</a> ·
    Per-page templates: <a href="index.html">index</a> ·
    <a href="../index.html">the yard</a>
  </footer>
</div>
`);

console.log(`compiled ${census.length} patterns from ${pages.length} pages`);
for (const p of census) {
  console.log(`  ${p.name.padEnd(30)} ${String(p.uses).padStart(4)} uses  ${String(p.pages.length).padStart(3)} pages  smallest: ${p.from}`);
}
console.log(`  → ${outDir}/patterns.html and ${outDir}/patterns.json`);

#!/usr/bin/env node
/* profiles.mjs — one page per requirement, generated from one file.
 *
 *   node profiles.mjs             # writes profiles/
 *   node profiles.mjs --out foo   # somewhere else
 *
 * WHY GENERATED
 * "We want automations not syndication." Fourteen hand-written profile pages
 * would be fourteen places for the same number to drift apart, and the first
 * time a figure changed there would be no way to know which pages still said
 * the old one. So profiles.json is the only source of truth and this writes
 * everything from it: the pages, the index, the dependency graph, the census.
 *
 * WHAT IS COMPUTED RATHER THAN TYPED
 *   · the census by status, and by class
 *   · what each profile is required BY — inverted from the depends_on lists,
 *     so a dependency stated once appears correctly at both ends
 *   · the blocking count: how many other requirements sit downstream of each
 *   · the honest headline — how many requirements are actually settled
 *
 * If a number on a generated page is wrong, the fix is profiles.json and a
 * re-run. Editing profiles/ is editing a build artefact.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const args = process.argv.slice(2);
const outDir = (() => { const i = args.indexOf('--out'); return i < 0 ? 'profiles' : args[i + 1]; })();

const doc = JSON.parse(readFileSync('profiles.json', 'utf8'));
const P = doc.profiles;
const byId = new Map(P.map((p) => [p.id, p]));

/* ---- invert the dependency graph, so it is stated once and read both ways */
for (const p of P) { p.required_by = []; }
for (const p of P) {
  for (const d of p.depends_on) {
    const t = byId.get(d);
    if (!t) { console.error(`  ! ${p.id} depends on unknown "${d}"`); continue; }
    t.required_by.push(p.id);
  }
}

/* ---- how much sits downstream of each: transitive closure of required_by */
function downstream(id, seen = new Set()) {
  for (const r of byId.get(id).required_by) {
    if (seen.has(r)) continue;
    seen.add(r);
    downstream(r, seen);
  }
  return seen;
}
for (const p of P) { p.blocking = downstream(p.id).size; }

const STATUS = ['solid', 'measured', 'derived', 'unvalidated', 'unknown'];
const COLOUR = { solid: '#65d6a8', measured: '#6ec6ff', derived: '#e0b155',
                 unvalidated: '#e0905a', unknown: '#e0705a' };
const census = Object.fromEntries(STATUS.map((s) => [s, P.filter((p) => p.status === s).length]));
const classes = [...new Set(P.map((p) => p.class))].sort();
const settled = P.filter((p) => p.status === 'solid').length;

const STYLE = `  *{box-sizing:border-box}
  body{margin:0;padding:22px 18px 48px;background:#08090c;color:#e9edf3;
    font:13.5px/1.66 ui-rounded,system-ui,-apple-system,sans-serif}
  .w{max-width:940px;margin:0 auto}
  a{color:#e0b155}
  h1{margin:0 0 6px;font-size:23px;letter-spacing:-.02em}
  .lede{color:#8b96a6;font-size:11.5px;max-width:92ch;margin:0 0 4px}
  .lede b{color:#e9edf3}
  h2{font:9.5px/1 ui-monospace,Menlo,monospace;letter-spacing:.2em;
    text-transform:uppercase;color:#8b96a6;margin:28px 0 10px;font-weight:600}
  h2 b{color:#e0b155;font-family:inherit;letter-spacing:0;text-transform:none;
    font-size:10.5px;margin-left:10px}
  .panel{background:linear-gradient(180deg,#111820,#161e28);border:1px solid #232d3c;
    border-radius:12px;padding:14px 15px}
  .grid{display:grid;gap:10px;grid-template-columns:repeat(2,1fr)}
  @media (max-width:760px){.grid{grid-template-columns:1fr}}
  a.card{display:block;text-decoration:none;color:inherit;background:#0d131b;
    border:1px solid #232d3c;border-radius:11px;padding:12px 13px}
  a.card:hover{border-color:#e0b155}
  a.card .top{display:flex;align-items:baseline;gap:9px;flex-wrap:wrap}
  a.card b{font-size:14px;color:#e9edf3}
  a.card .cls{font:8.5px/1 ui-monospace,monospace;letter-spacing:.13em;
    text-transform:uppercase;color:#5c6b7d}
  a.card p{margin:8px 0 0;font-size:11px;color:#8b96a6;line-height:1.55}
  .pill{font:8.5px/1 ui-monospace,monospace;letter-spacing:.12em;
    text-transform:uppercase;border-radius:4px;padding:4px 7px;margin-left:auto}
  .fig{display:grid;grid-template-columns:1fr;gap:0;margin-top:11px;
    border:1px solid #232d3c;border-radius:10px;overflow:hidden}
  .fig div{display:grid;grid-template-columns:1fr auto;gap:12px;padding:9px 12px;
    border-bottom:1px solid #232d3c;align-items:baseline}
  .fig div:last-child{border-bottom:0}
  .fig span{font-size:11.5px;color:#8b96a6}
  .fig b{font:12px/1.3 ui-monospace,Menlo,monospace;color:#e9edf3;text-align:right}
  .fig i{grid-column:1/-1;font-style:normal;font-size:10.5px;color:#5c6b7d;margin-top:3px}
  .tape{display:flex;gap:18px;flex-wrap:wrap;margin:11px 0 0;
    font:9.5px/1.6 ui-monospace,monospace;color:#8b96a6}
  .tape i{font-style:normal;color:#5c6b7d;letter-spacing:.13em;
    text-transform:uppercase;margin-right:7px}
  .q{border-left:3px solid #e0905a;padding:2px 0 2px 13px;margin-top:12px;
    color:#c2cad4;font-size:12.5px;max-width:86ch}
  .heads{display:grid;grid-template-columns:repeat(5,1fr);gap:9px;margin-top:12px}
  @media (max-width:700px){.heads{grid-template-columns:repeat(3,1fr)}}
  .head{background:#0d131b;border:1px solid #232d3c;border-radius:10px;padding:9px 10px}
  .head span{font:8.5px/1 ui-monospace,monospace;letter-spacing:.13em;
    text-transform:uppercase;color:#8b96a6;display:block}
  .head b{display:block;font:19px/1.2 ui-monospace,Menlo,monospace;margin-top:5px}
  footer{margin-top:32px;border-top:1px solid #232d3c;padding-top:14px;
    color:#8b96a6;font-size:10.5px;max-width:92ch}`;

const pill = (s) => `<span class="pill" style="color:${COLOUR[s]};border:1px solid ${COLOUR[s]}">${s}</span>`;

/* ------------------------------------------------------------- one per thing */
mkdirSync(outDir, { recursive: true });

for (const p of P) {
  const figs = p.figures.map(([k, v, n]) =>
    `      <div><span>${esc(k)}</span><b>${esc(v)}</b>${n ? `<i>${esc(n)}</i>` : ''}</div>`).join('\n');
  const dep = p.depends_on.length
    ? p.depends_on.map((d) => `<a href="${d}.html">${esc(byId.get(d).name)}</a>`).join(' &middot; ')
    : '<span style="color:#5c6b7d">nothing &mdash; this is a root</span>';
  const req = p.required_by.length
    ? p.required_by.map((d) => `<a href="${d}.html">${esc(byId.get(d).name)}</a>`).join(' &middot; ')
    : '<span style="color:#5c6b7d">nothing yet</span>';

  writeFileSync(join(outDir, `${p.id}.html`), `<title>${esc(p.name)} · profile</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<!-- GENERATED by profiles.mjs from profiles.json. Do not edit: edit the JSON
     and re-run. Everything below except the prose is computed, including what
     this requirement is required BY, which is inverted from the other profiles'
     dependency lists so a link stated once reads correctly at both ends. -->
<style>
${STYLE}
</style>
<div class="w">
  <p class="lede"><a href="index.html">&larr; all profiles</a></p>
  <h1>${esc(p.name)}</h1>
  <p class="lede"><span class="cls" style="font:9px/1 ui-monospace,monospace;
    letter-spacing:.14em;text-transform:uppercase;color:#5c6b7d">${esc(p.class)}</span>
    &nbsp; ${pill(p.status)}</p>
  <p class="lede" style="font-size:13px;color:#e9edf3;margin-top:10px">${esc(p.one_line)}</p>

  <h2>Figures <b>with their units and their provenance</b></h2>
  <div class="fig">
${figs}
  </div>

  <h2>In the graph <b>computed, both directions</b></h2>
  <div class="panel">
    <div class="tape">
      <span><i>depends on</i>${dep}</span>
    </div>
    <div class="tape">
      <span><i>required by</i>${req}</span>
    </div>
    <div class="tape">
      <span><i>downstream of this</i>${p.blocking} requirement${p.blocking === 1 ? '' : 's'}</span>
      <span><i>written up in</i>${p.pages.map((f) => `<a href="../${f}">${esc(f)}</a>`).join(' &middot; ')}</span>
    </div>
  </div>

  <h2>The open question</h2>
  <p class="q">${esc(p.open_question)}</p>

  <footer>Generated from <a href="../profiles.json">profiles.json</a> by
    <a href="../profiles.mjs">profiles.mjs</a>. If a figure here is wrong, the
    fix is the JSON and a re-run &mdash; editing this file edits a build
    artefact. &middot; <a href="../index.html">the yard</a></footer>
</div>
`);
}

/* -------------------------------------------------------------- the index */
const cards = classes.map((c) => `
  <h2>${esc(c)} <b>${P.filter((p) => p.class === c).length}</b></h2>
  <div class="grid">
${P.filter((p) => p.class === c).sort((a, b) => b.blocking - a.blocking).map((p) => `    <a class="card" href="${p.id}.html">
      <span class="top"><b>${esc(p.name)}</b>${pill(p.status)}</span>
      <p>${esc(p.one_line)}</p>
      <p style="color:#5c6b7d;margin-top:7px">${p.blocking} downstream &middot; ${p.depends_on.length} upstream</p>
    </a>`).join('\n')}
  </div>`).join('\n');

writeFileSync(join(outDir, 'index.html'), `<title>Profiles · ${P.length} things we need</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<!-- GENERATED by profiles.mjs from profiles.json. One page per requirement,
     written from one file, because fourteen hand-written pages would be
     fourteen places for the same number to drift apart. -->
<style>
${STYLE}
</style>
<div class="w">
  <h1>Profiles</h1>
  <p class="lede">${P.length} things this needs, one page each, <b>generated from
    a single file</b>. The figures, the dependency graph in both directions and
    every count on this page come out of
    <a href="../profiles.json">profiles.json</a> &mdash; nothing here was typed
    twice, which is the only way a set of specifications stays consistent with
    itself.</p>
  <p class="lede"><b>${settled} of ${P.length} are settled.</b> That is the
    honest headline and it is the reason the status field exists: solid means
    school-level and not in doubt, unvalidated means correct in kind and never
    demonstrated at this scale, and unknown means we do not have it and are not
    pretending to.</p>

  <div class="heads">
${STATUS.map((s) => `    <div class="head"><span>${s}</span><b style="color:${COLOUR[s]}">${census[s]}</b></div>`).join('\n')}
  </div>
${cards}

  <h2>What blocks the most <b>computed from the graph</b></h2>
  <div class="panel">
    <div class="fig" style="margin-top:0">
${[...P].sort((a, b) => b.blocking - a.blocking).slice(0, 5).map((p) =>
  `      <div><span><a href="${p.id}.html">${esc(p.name)}</a> &mdash; ${esc(p.status)}</span><b>${p.blocking} downstream</b></div>`).join('\n')}
    </div>
    <p class="lede" style="margin-top:11px">Nothing is ranked by importance here.
      This is purely how many other requirements sit downstream in the dependency
      graph, inverted from the <code>depends_on</code> lists, and it is worth
      reading against the status column: <b>the item with the most downstream of
      it should not be the item marked unknown.</b></p>
  </div>

  <footer>
    <b>Automation, not syndication.</b> One source file, ${P.length} generated
    pages, and a graph stated once and read from both ends. If a number here is
    wrong the fix is <a href="../profiles.json">the JSON</a> and a re-run.
    &middot; <a href="../templates/patterns.html">the compiled patterns</a>
    &middot; <a href="../index.html">the yard</a>
  </footer>
</div>
`);

console.log(`${P.length} profiles → ${outDir}/`);
console.log(`  settled ${settled}/${P.length} · ` +
  STATUS.map((s) => `${s} ${census[s]}`).join(' · '));
console.log('  most downstream: ' + [...P].sort((a, b) => b.blocking - a.blocking).slice(0, 3)
  .map((p) => `${p.name} (${p.blocking}, ${p.status})`).join(', '));

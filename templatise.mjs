#!/usr/bin/env node
/* templatise.mjs — pull a working template out of every page in the yard.
 *
 *   node templatise.mjs            # writes templates/ and templates/index.html
 *   node templatise.mjs --out foo  # somewhere else
 *
 * WHAT A TEMPLATE HERE IS
 * Not a husk. Each one keeps the source page's entire stylesheet — which is
 * where all the machinery lives — and keeps every input id, so the counters
 * still count and the :has() rules still fire the moment you open it. What is
 * stripped is the prose: the ships, the myths, the arguments. You are left with
 * the mechanism, running, with the content knocked out and marked TODO.
 *
 * That is the useful direction. A template you have to debug before it works is
 * worse than no template, and stripping the CSS would leave exactly that.
 *
 * WHAT IT READS OUT OF EACH PAGE
 *   · the palette and every rule            (kept verbatim)
 *   · radio groups, by name, with their ids (rebuilt as controls)
 *   · checkboxes, with their ids            (rebuilt as controls)
 *   · counters declared in counter-reset    (rebuilt as printed totals)
 *   · #id:target ids in the stylesheet      (rebuilt as a store and its links)
 *   · how many rules use :has()             (reported, not rebuilt)
 *
 * THE PERSISTENCE LAYER
 * A page that keeps state across a reload keeps it in the URL fragment and
 * reads it with :target, which means its state ids live in the STYLESHEET and
 * not in the markup — there is no input to find. So they are read out of the
 * CSS, and the template gets back both halves: the store strip of anchors,
 * placed first in the document because that is where a counter's source has to
 * be, and a link for each stored state. See persist.html for what that is and
 * what it costs. A page with no targets forgets everything on reload, which is
 * most of them and is usually the right call.
 *
 * Ids are preserved deliberately. Rename one and you break the rule that was
 * pointing at it, which is the single most common way these pages fail — see
 * mistake one in learn.html.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const GENERATED = new Set(['defense-run.html']);
const SKIP = new Set(['index.html', 'arcade.html', ...GENERATED]);

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* ------------------------------------------------------------------- read */
function dissect(html, file) {
  const style = (html.match(/<style>[\s\S]*?<\/style>/) || [''])[0];
  const title = (html.match(/<title>([^<]*)<\/title>/) || [, file])[1];

  // radio groups, in document order, keeping ids and any label text
  const groups = new Map();
  const radioRe = /<input[^>]*type="radio"[^>]*>/g;
  for (const tag of html.match(radioRe) || []) {
    const name = (tag.match(/name="([^"]+)"/) || [])[1];
    const id = (tag.match(/id="([^"]+)"/) || [])[1];
    if (!name || !id) continue;
    const checked = /\schecked/.test(tag);
    const label = labelFor(html, id);
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push({ id, checked, label });
  }

  const boxes = [];
  for (const tag of html.match(/<input[^>]*type="checkbox"[^>]*>/g) || []) {
    const id = (tag.match(/id="([^"]+)"/) || [])[1];
    if (!id) continue;
    boxes.push({ id, checked: /\schecked/.test(tag), label: labelFor(html, id) });
  }

  // counters: declared once on body, printed via ::after content:counter(x)
  const reset = (style.match(/counter-reset:([^};]*)/) || [, ''])[1];
  const counters = [...new Set(
    reset.trim().split(/\s+/).filter((t, i) => i % 2 === 0).filter(Boolean)
  )];
  const printers = new Map();
  for (const [, cls, ctr] of style.matchAll(/\.([\w-]+)::after\s*\{content:counter\((\w+)\)\}/g))
    printers.set(ctr, cls);

  /* the persistence layer, if the page has one. State that survives a reload
     lives in the URL fragment and is read with :target — so the ids are in the
     stylesheet, not in the markup, and that is where we go looking. */
  const targets = [...new Set(
    [...style.matchAll(/#([\w-]+):target/g)].map((m) => m[1])
  )].map((id) => ({ id, label: linkFor(html, id) }));
  const storeCls = (style.match(/\.([\w-]+)\s+i\s*\{[^}]*position:absolute/) || [, 'store'])[1];
  const tickCls = (style.match(/:target\)\s*\.([\w-]+)\s*\{counter-increment/) || [])[1];

  const hasRules = (style.match(/:has\(/g) || []).length;
  const compound = (style.match(/:has\([^)]*\)\s*:has\(/g) || []).length;
  const scripted = /<script(?![^>]*application\/json)/.test(html);

  return { title, style, groups, boxes, counters, printers, hasRules, compound,
           scripted, targets, storeCls, tickCls };
}

/** The visible text of the <a href="#id"> that writes this state, flattened. */
function linkFor(html, id) {
  const m = html.match(new RegExp(`<a[^>]*href="#${id}"[^>]*>([\\s\\S]*?)</a>`));
  if (!m) return id;
  return m[1].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 46) || id;
}

/** The visible text of the <label for="id">, flattened. */
function labelFor(html, id) {
  const m = html.match(new RegExp(`<label[^>]*for="${id}"[^>]*>([\\s\\S]*?)</label>`));
  if (!m) return id;
  return m[1].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 42) || id;
}

/* ------------------------------------------------------------------ write */
function build(d, file) {
  const groupBlocks = [...d.groups.entries()].map(([name, opts]) => `
    <h2>TODO group name <b>${opts.length} options</b></h2>
    <div class="opts seg row">
${opts.map((o) => `      <input type="radio" name="${name}" id="${o.id}"${o.checked ? ' checked' : ''}><label for="${o.id}">${esc(o.label)}</label>`).join('\n')}
    </div>`).join('\n');

  const boxBlock = d.boxes.length ? `
    <h2>TODO checkbox set <b>${d.boxes.length}</b></h2>
    <div class="opts stack row">
${d.boxes.map((b) => `      <input type="checkbox" id="${b.id}"${b.checked ? ' checked' : ''}><label for="${b.id}">${esc(b.label)}</label>`).join('\n')}
    </div>` : '';

  const totals = d.counters.length ? `
    <h2>Totals <b>counted, not declared</b></h2>
    <div class="heads meter">
${d.counters.map((c) => {
    const cls = d.printers.get(c);
    return `      <div class="head m"><span>${c}</span><b${cls ? ` class="${cls}"` : ''}>${cls ? '' : '&mdash; not printed by this page'}</b></div>`;
  }).join('\n')}
    </div>` : '';

  /* the store strip. It goes FIRST in the document, ahead of the header and
     ahead of everything that counts, for the same reason inputs do: a counter
     prints after what increments it, and here what increments it is the URL. */
  const storeBlock = d.targets.length ? `
  <div class="${d.storeCls}">
${d.targets.map((t) => `    <i id="${t.id}"></i>`).join('\n')}${d.tickCls ? `
    <i class="${d.tickCls}"></i>` : ''}
  </div>
` : '';

  const linkBlock = d.targets.length ? `
    <h2>Stored states <b>${d.targets.length} &middot; the URL is the state</b></h2>
    <div class="grid opts">
${d.targets.map((t) => `      <a href="#${t.id}"><b>${esc(t.label)}</b><s>#${t.id}</s></a>`).join('\n')}
    </div>
    <p class="note">TODO name these. Each link writes one whole state into the
      address bar; <code>:target</code> reads it back and the rules above act on
      it. A document has one target at a time, so every link names a complete
      combination and there is no partial update &mdash; add an axis and you
      write the products out, exactly as with compound <code>:has()</code>.</p>` : '';

  const notes = [
    `source            ${file}`,
    `radio groups      ${d.groups.size}${d.groups.size ? ` (${[...d.groups.keys()].join(', ')})` : ''}`,
    `checkboxes        ${d.boxes.length}`,
    `counters          ${d.counters.length ? d.counters.join(', ') : 'none'}`,
    `stored states     ${d.targets.length ? `${d.targets.length} — ${d.targets.map((t) => '#' + t.id).join(', ')}` : 'none — this page forgets everything on reload'}`,
    `:has() rules      ${d.hasRules}${d.compound ? `, ${d.compound} of them compound` : ''}`,
    `script            ${d.scripted ? 'YES — the source page runs script; this template does not carry it' : 'none'}`,
  ].join('\n     ');

  return `<title>TEMPLATE &middot; ${esc(d.title)}</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<!--
  TEMPLATE, extracted from ${file} by templatise.mjs.

     ${notes}

  WHAT IS STILL HERE
  The whole stylesheet, and every input id from the source. That means this
  file WORKS as it stands: the counters count, the :has() rules fire, the
  controls light. Open it and press things before you change anything.

  WHAT WAS TAKEN OUT
  The prose. Titles, arguments, the ships and the myths. Everywhere you see
  TODO, that is content the source page had and this one does not.

  WHAT NOT TO DO
  Do not rename the ids. Every rule in the stylesheet points at them by name,
  and a renamed id fails silently — no error, nothing happens, and it looks
  like the property is unsupported. That is mistake one in learn.html and it
  is the most common way these pages break.

  THE ONE RULE
  A counter can only be printed after the things that increment it. Inputs
  first in the DOM, totals after. Rearrange with grid, never with source order.
-->
${d.style}
${storeBlock}
<div class="wrap board desk deck app v h">
  <header>
    <h1>TODO title</h1>
    <span class="sub lede">TODO one sentence on what this board is for &mdash;
      say what it computes and where the numbers come from.</span>
    <span class="tag">no script</span>
  </header>
${groupBlocks}${boxBlock}${linkBlock}${totals}

  <div class="panel">
    <p class="note">TODO. The stylesheet above is the source page's, unchanged,
      so anything it could do this can do. Add markup that its rules already
      target &mdash; look for class names in the CSS that nothing here uses yet.</p>
  </div>
</div>
`;
}

/* -------------------------------------------------------------------- run */
const args = process.argv.slice(2);
const outDir = (() => { const i = args.indexOf('--out'); return i < 0 ? 'templates' : args[i + 1]; })();

const pages = readdirSync('.').filter((f) => f.endsWith('.html') && !SKIP.has(f)).sort();
mkdirSync(outDir, { recursive: true });

const rows = [];
for (const file of pages) {
  const html = readFileSync(file, 'utf8');
  const d = dissect(html, file);
  const name = file.replace(/\.html$/, '.template.html');
  writeFileSync(join(outDir, name), build(d, file));
  rows.push({ file, name, ...d });
}

/* an index, so the folder is navigable rather than a heap */
const index = `<title>Templates &middot; ${rows.length}</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
 body{margin:0;padding:22px 18px 44px;background:#080b0f;color:#e9f0f5;
   font:13.5px/1.6 ui-rounded,system-ui,sans-serif}
 .w{max-width:900px;margin:0 auto}
 h1{margin:0 0 4px;font-size:23px;letter-spacing:-.02em}
 p{color:#8a9aa8;font-size:11.5px;max-width:84ch}
 table{width:100%;border-collapse:collapse;font-size:12px;margin-top:16px;
   font-variant-numeric:tabular-nums}
 th{text-align:left;font:9px/1 ui-monospace,monospace;letter-spacing:.14em;
   text-transform:uppercase;color:#8a9aa8;padding:0 0 8px}
 td{padding:6px 0;border-top:1px solid #26333f}
 td:not(:first-child){text-align:right;color:#8a9aa8}
 a{color:#e0b155;text-decoration:none} a:hover{text-decoration:underline}
 .js{color:#e58593}
</style>
<div class="w">
  <h1>Templates</h1>
  <p>${rows.length} templates, one per authored page, extracted by
  <code>templatise.mjs</code>. Each keeps its source page's whole stylesheet and
  every input id, so it runs as it stands &mdash; the counters count and the
  <code>:has()</code> rules fire before you change a thing. What was removed is
  the prose. Do not rename the ids.</p>
  <p><b>Stored</b> counts the states a page keeps in the URL fragment and reads
  back with <code>:target</code>. A page with none forgets everything on reload,
  which is most of them and is usually the right call; a page with some is
  carrying a persistence layer, and the template carries it too.</p>
  <table>
    <tr><th>Template</th><th>Groups</th><th>Boxes</th><th>Stored</th><th>Counters</th><th>:has()</th></tr>
${rows.map((r) => `    <tr><td><a href="${r.name}">${r.file}</a>${r.scripted ? ' <span class="js">·js</span>' : ''}</td>
      <td>${r.groups.size}</td><td>${r.boxes.length}</td><td>${r.targets.length || ''}</td><td>${r.counters.length}</td><td>${r.hasRules}</td></tr>`).join('\n')}
  </table>
  <p style="margin-top:16px">Pages marked <span class="js">·js</span> run script
  in their source; the template carries the stylesheet only, so those two need
  their behaviour written back by hand.</p>
</div>
`;
writeFileSync(join(outDir, 'index.html'), index);

const tot = (k) => rows.reduce((a, r) => a + (typeof r[k] === 'number' ? r[k] : r[k].size ?? r[k].length ?? 0), 0);
console.log(`${rows.length} templates → ${outDir}/`);
console.log(`  radio groups ${tot('groups')} · checkboxes ${tot('boxes')} · counters ${tot('counters')} · :has() rules ${tot('hasRules')}`);
console.log(`  stored states ${tot('targets')} across ${rows.filter((r) => r.targets.length).length} page(s)`);
console.log(`  index: ${outDir}/index.html`);

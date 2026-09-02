#!/usr/bin/env node
/* enums.mjs — the vocabulary of every template family, mined and solidified.

   digest-enums.json was one big list of words for the digest layer alone.
   This does the same thing for every templates- folder in the yard: read
   what is already on disk, find the fields that repeat from a small, fixed
   set of values rather than saying something new every time, and write that
   set down next to the templates it came from, as templates-X/_enum.json.
   A field that never repeats (an id, a door number, a paragraph of prose)
   is not an enum and is left alone; a field that keeps saying the same
   dozen things (an office, a resource, an effect's type) is solidified.
   Nothing here is guessed at by a person — the mining is mechanical, so a
   new template family gets its enum file for free the next time this runs.

   Values are capped at 100 per field — big on purpose, same rule digest-enums.json
   already stated, kept here so no family's vocabulary silently overflows.

     node enums.mjs             mine every templates- family, write its _enum.json,
                                 and write enumerator.html to browse all of them at once */
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const CAP = 100;                 // "every template 100 enums": the ceiling on values kept per field
const SAMPLE = 800;               // families larger than this are sampled, not fully read — the mining stays light
const PROSE_LEN = 40;             // a value averaging longer than this is prose, not a category
const UNIQUE_RATIO = 0.8;         // a field this close to one-value-per-file is an identifier, not an enum

const root = process.cwd();
const families = readdirSync(root, { withFileTypes: true })
  .filter(e => e.isDirectory() && e.name.startsWith('templates-'))
  .map(e => e.name)
  .sort();

function flatten(obj, prefix, depth, out) {
  for (const key of Object.keys(obj)) {
    const val = obj[key], full = prefix ? `${prefix}.${key}` : key;
    const t = typeof val;
    if (val === null) continue;
    if (t === 'string' || t === 'number' || t === 'boolean') out.push([full, val]);
    else if (t === 'object' && !Array.isArray(val) && depth < 2) flatten(val, full, depth + 1, out);
  }
}

function mine(family) {
  const dir = join(root, family);
  const all = readdirSync(dir).filter(f => f.endsWith('.json') && !f.startsWith('_'));
  const step = all.length > SAMPLE ? Math.ceil(all.length / SAMPLE) : 1;
  const sample = all.filter((_, i) => i % step === 0);
  const fields = new Map(); // fullKey -> Map(value -> count)
  let read = 0;
  for (const f of sample) {
    let body; try { body = JSON.parse(readFileSync(join(dir, f), 'utf8')); } catch { continue; }
    read++;
    const flat = []; flatten(body, '', 0, flat);
    for (const [k, v] of flat) { if (!fields.has(k)) fields.set(k, new Map()); const m = fields.get(k); m.set(v, (m.get(v) || 0) + 1); }
  }
  const out = {};
  for (const [key, counts] of fields) {
    const values = [...counts.keys()];
    const distinct = values.length;
    if (distinct > CAP) continue;
    if (read >= 5 && distinct / read > UNIQUE_RATIO) continue;
    const strs = values.filter(v => typeof v === 'string');
    if (strs.length && strs.reduce((a, s) => a + s.length, 0) / strs.length > PROSE_LEN) continue;
    const sorted = values.slice().sort((a, b) => typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b)));
    out[key] = { type: typeof values[0], distinct, samples: read, values: sorted.slice(0, CAP) };
  }
  return { family, totalFiles: all.length, sampledFiles: read, fields: out };
}

const index = {};
for (const family of families) {
  const stat = statSync(join(root, family));
  if (!stat.isDirectory()) continue;
  const mined = mine(family);
  if (mined.sampledFiles === 0) continue;
  const short = family.replace(/^templates-/, '');
  const doc = { id: `enum-${short}`, kind: 'enum', family: short, path: `${family}/_enum.json`,
    note: `The fixed vocabulary of ${family}/, mined from ${mined.sampledFiles} of its ${mined.totalFiles} templates by enums.mjs. A field with more than ${CAP} distinct values, or one that is close to a different value in every file, is not here — it is data, not an enum. Edit the source templates and re-run enums.mjs to update this.`,
    totalFiles: mined.totalFiles, sampledFiles: mined.sampledFiles, fields: mined.fields, wovenBy: 'enums.mjs' };
  writeFileSync(join(root, family, '_enum.json'), JSON.stringify(doc, null, 1));
  index[short] = { totalFiles: mined.totalFiles, sampledFiles: mined.sampledFiles, fieldCount: Object.keys(mined.fields).length, fields: mined.fields };
}

const fieldTotal = Object.values(index).reduce((a, f) => a + f.fieldCount, 0);
const valueTotal = Object.values(index).reduce((a, f) => a + Object.values(f.fields).reduce((b, v) => b + v.distinct, 0), 0);

const PALETTE = ['#6fd4a8', '#3f8fbf', '#f2c98a', '#c98af2', '#e0716b', '#8ab6f2', '#d4c26f', '#7ee0c9', '#f29a6f', '#a8d46f'];
const colorFor = name => { let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0; return PALETTE[h % PALETTE.length]; };

const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>The enumerator · every template's vocabulary</title>
<!--toonami--><!--/toonami-->
<style>
body{font-family:system-ui,sans-serif;max-width:1100px;margin:0 auto;padding:24px}
h1{font-size:1.4em}
.top{color:var(--dim,#888);margin-bottom:18px}
#q{width:100%;box-sizing:border-box;padding:8px 10px;margin-bottom:18px;border-radius:6px;border:1px solid var(--edge,#446);background:transparent;color:inherit;font:inherit}
.fam{border-left:4px solid;border-radius:6px;padding:10px 14px;margin-bottom:12px;background:rgba(128,128,128,.06)}
.fam h2{margin:0 0 4px;font-size:1.05em}
.fam .meta{color:var(--dim,#888);font-size:.85em;margin-bottom:8px}
.field{margin:6px 0}
.field b{font-size:.9em}
.field .vals{color:var(--dim,#888);font-size:.85em;word-break:break-word}
[hidden]{display:none!important}
</style></head><body>
<h1>The enumerator</h1>
<p class="top">The fixed vocabulary mined from every <code>templates-*/</code> family: ${families.length} families read, ${fieldTotal} enum-worthy fields found, ${valueTotal} distinct values solidified across them. Each family also keeps its own copy at <code>templates-&lt;family&gt;/_enum.json</code>; this page is the light way to browse all of them at once, generated by <code>enums.mjs</code> — re-run it after adding or editing templates and this page updates with everything else.</p>
<input id="q" placeholder="Filter by family or field name…">
<div id="list"></div>
<script id="enum-data" type="application/json">${JSON.stringify(index)}</script>
<script>
const DATA = JSON.parse(document.getElementById('enum-data').textContent);
const COLOR = ${JSON.stringify(Object.fromEntries(Object.keys(index).map(k => [k, colorFor(k)])))};
function render(filter) {
  const q = (filter || '').toLowerCase();
  const list = document.getElementById('list'); list.innerHTML = '';
  for (const fam of Object.keys(DATA).sort()) {
    const f = DATA[fam];
    const fields = Object.entries(f.fields);
    const matchFam = fam.toLowerCase().includes(q);
    const shown = q && !matchFam ? fields.filter(([k]) => k.toLowerCase().includes(q)) : fields;
    if (q && !matchFam && !shown.length) continue;
    const div = document.createElement('div'); div.className = 'fam'; div.style.borderColor = COLOR[fam];
    div.innerHTML = '<h2>' + fam + '</h2><div class="meta">' + f.sampledFiles + ' of ' + f.totalFiles + ' templates read &middot; ' + fields.length + ' enum field' + (fields.length===1?'':'s') + '</div>' +
      shown.map(([k, v]) => '<div class="field"><b>' + k + '</b> <span class="vals">(' + v.distinct + ') ' + v.values.map(x => String(x)).join(', ') + '</span></div>').join('');
    list.appendChild(div);
  }
}
document.getElementById('q').oninput = e => render(e.target.value);
render('');
</script>
</body></html>`;
writeFileSync(join(root, 'enumerator.html'), html);

console.log(`${families.length} families mined, ${fieldTotal} enum fields, ${valueTotal} distinct values in all · enumerator.html written`);

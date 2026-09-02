#!/usr/bin/env node
/* enums.mjs — the vocabulary AND the shape of every template family, mined, solidified,
   and folded into one page that can re-mine itself.

   digest-enums.json was one big list of words for the digest layer alone. This mines the
   same thing for every templates- folder in the yard: read what is already on disk, find
   the fields that repeat from a small, fixed set of values rather than saying something
   new every time, and write that set down next to the templates it came from, as
   templates-X/_enum.json. A field that never repeats (an id, a door number, a paragraph
   of prose) is not an enum and is left alone.

   It also builds the full SHAPE of each family — the same recursive typing entities.mjs
   uses to write Scala, expressed here as plain data — and embeds it, together with three
   real, unmodified templates per family and the mining function itself, into ONE page:
   enumerator.html. Nothing in that page is fetched; open it with no server and no other
   file on disk, pick a family, and press "re-weave live" — it runs the very function that
   built the page, on real embedded data, in your own browser, and shows you what comes out.
   The same trick clans.html uses to reweave itself from inside the game: the generator
   travels with what it generated, so the page is not a report about the mining, it IS the
   mining, encapsulated.

     node enums.mjs             mine every templates- family, write its _enum.json,
                                 and write enumerator.html, fully self-contained */
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const CAP = 100;                 // "every template 100 enums": the ceiling on values kept in a family's _enum.json
const SAMPLE = 800;               // families larger than this are sampled, not fully read — the mining stays light
const PROSE_LEN = 40;             // a value averaging longer than this is prose, not a category
const UNIQUE_RATIO = 0.8;         // a field this close to one-value-per-file is an identifier, not an enum
const ENUM_CAP = 30;              // shape-level threshold: matches entities.mjs's promotion to a real Scala enum

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

/* buildShape is the whole of the mining, one function, no closures over anything outside
   itself — which is what lets it travel into the page whole, via buildShape.toString(),
   and run there exactly as it runs here. entities.mjs carries its own copy for the same
   reason: each generated artifact is complete on its own. */
/* A field seen as null in at least one sample and something real in at least one other is
   nullable, not just whatever the non-null samples happen to look like — entities.mjs turns
   this into Option[...] rather than a type that NPEs the day it meets the record that made
   the gap obvious (templates-activity's steal:null on quiet is exactly this shape). */
function buildShape(values, depth) {
  const nonNull = values.filter(v => v !== null && v !== undefined);
  const nullable = nonNull.length > 0 && nonNull.length < values.length;
  if (!nonNull.length) return { kind: 'unknown' };
  const kinds = new Set(nonNull.map(v => Array.isArray(v) ? 'array' : typeof v === 'object' ? 'object' : typeof v));
  if (kinds.size !== 1) return { kind: 'unknown', nullable };
  const [kind] = kinds;
  const ENUM_CAP = 30, PROSE_LEN = 40, UNIQUE_RATIO = 0.8;
  if (kind === 'object') {
    const names = new Set(); for (const o of nonNull) for (const k of Object.keys(o)) names.add(k);
    const fields = {};
    for (const k of names) fields[k] = depth < 3 ? buildShape(nonNull.map(o => o[k]).filter(v => v !== undefined), depth + 1) : { kind: 'unknown' };
    return { kind: 'object', fields, nullable };
  }
  if (kind === 'array') { const elems = []; for (const a of nonNull) for (const e of a) elems.push(e); return { kind: 'array', of: buildShape(elems, depth + 1), nullable }; }
  if (kind === 'string') {
    const counts = new Map(); for (const v of nonNull) counts.set(v, (counts.get(v) || 0) + 1);
    const distinct = counts.size, avgLen = nonNull.reduce((a, s) => a + s.length, 0) / nonNull.length;
    const tooUnique = nonNull.length >= 5 && distinct / nonNull.length > UNIQUE_RATIO;
    return distinct <= ENUM_CAP && avgLen <= PROSE_LEN && !tooUnique ? { kind: 'enum', values: [...counts.keys()].sort(), nullable } : { kind: 'string', nullable };
  }
  if (kind === 'number') return { kind: nonNull.every(Number.isInteger) ? 'int' : 'double', nullable };
  if (kind === 'boolean') return { kind: 'bool', nullable };
  return { kind: 'unknown', nullable };
}

function mine(family) {
  const dir = join(root, family);
  const all = readdirSync(dir).filter(f => f.endsWith('.json') && !f.startsWith('_'));
  const step = all.length > SAMPLE ? Math.ceil(all.length / SAMPLE) : 1;
  const sampleNames = all.filter((_, i) => i % step === 0);
  const fields = new Map(); // fullKey -> Map(value -> count)
  const bodies = [];
  for (const f of sampleNames) {
    let body; try { body = JSON.parse(readFileSync(join(dir, f), 'utf8')); } catch { continue; }
    bodies.push(body);
    const flat = []; flatten(body, '', 0, flat);
    for (const [k, v] of flat) { if (!fields.has(k)) fields.set(k, new Map()); const m = fields.get(k); m.set(v, (m.get(v) || 0) + 1); }
  }
  const out = {};
  for (const [key, counts] of fields) {
    const values = [...counts.keys()];
    const distinct = values.length;
    if (distinct > CAP) continue;
    if (bodies.length >= 5 && distinct / bodies.length > UNIQUE_RATIO) continue;
    const strs = values.filter(v => typeof v === 'string');
    if (strs.length && strs.reduce((a, s) => a + s.length, 0) / strs.length > PROSE_LEN) continue;
    const sorted = values.slice().sort((a, b) => typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b)));
    out[key] = { type: typeof values[0], distinct, samples: bodies.length, values: sorted.slice(0, CAP) };
  }
  const shape = buildShape(bodies, 0);
  return { family, totalFiles: all.length, sampledFiles: bodies.length, fields: out, shape, rawSample: bodies.slice(0, 3) };
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
  index[short] = { totalFiles: mined.totalFiles, sampledFiles: mined.sampledFiles, fieldCount: Object.keys(mined.fields).length,
    fields: mined.fields, shape: mined.shape, rawSample: mined.rawSample };
}

const fieldTotal = Object.values(index).reduce((a, f) => a + f.fieldCount, 0);
const valueTotal = Object.values(index).reduce((a, f) => a + Object.values(f.fields).reduce((b, v) => b + v.distinct, 0), 0);
const classCount = (() => { let n = 0; const walk = s => { if (s.kind === 'object') { n++; for (const v of Object.values(s.fields)) walk(v); } else if (s.kind === 'array') walk(s.of); }; for (const f of Object.values(index)) walk(f.shape); return n; })();
const enumCount = (() => { let n = 0; const walk = s => { if (s.kind === 'enum') n++; else if (s.kind === 'object') for (const v of Object.values(s.fields)) walk(v); else if (s.kind === 'array') walk(s.of); }; for (const f of Object.values(index)) walk(f.shape); return n; })();

const PALETTE = ['#6fd4a8', '#3f8fbf', '#f2c98a', '#c98af2', '#e0716b', '#8ab6f2', '#d4c26f', '#7ee0c9', '#f29a6f', '#a8d46f'];
const colorFor = name => { let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0; return PALETTE[h % PALETTE.length]; };

const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>The enumerator · every template's vocabulary and shape</title>
<!--toonami--><!--/toonami-->
<style>
body{font-family:system-ui,sans-serif;max-width:1200px;margin:0 auto;padding:24px}
h1{font-size:1.4em}
.top{color:var(--dim,#888);margin-bottom:18px}
#q{width:100%;box-sizing:border-box;padding:8px 10px;margin-bottom:18px;border-radius:6px;border:1px solid var(--edge,#446);background:transparent;color:inherit;font:inherit}
.fam{border-left:4px solid;border-radius:6px;padding:10px 14px;margin-bottom:12px;background:rgba(128,128,128,.06)}
.fam h2{margin:0 0 4px;font-size:1.05em;display:flex;align-items:center;gap:10px}
.fam .meta{color:var(--dim,#888);font-size:.85em;margin-bottom:8px}
.field{margin:6px 0}
.field b{font-size:.9em}
.field .vals{color:var(--dim,#888);font-size:.85em;word-break:break-word}
.tabs{display:flex;gap:6px;margin:8px 0}
.tabs button{font:inherit;font-size:.8em;padding:3px 10px;border-radius:12px;border:1px solid var(--edge,#557);background:transparent;color:inherit;cursor:pointer;opacity:.65}
.tabs button.on{opacity:1;font-weight:600}
.pane{display:none}
.pane.on{display:block}
pre{white-space:pre-wrap;word-break:break-word;font-size:.82em;background:rgba(128,128,128,.08);border-radius:6px;padding:8px 10px;max-height:340px;overflow:auto}
.shape-field{margin-left:14px}
.rw{font:inherit;font-size:.85em;padding:5px 12px;border-radius:6px;border:1px solid var(--ok,#6fd4a8);color:var(--ok,#6fd4a8);background:transparent;cursor:pointer}
.rw:hover{background:rgba(111,212,168,.12)}
.rwout{margin-top:8px}
[hidden]{display:none!important}
</style></head><body>
<h1>The enumerator</h1>
<p class="top">The vocabulary AND the shape of every <code>templates-*/</code> family, mined by one function that travels with its own output: ${families.length} families, ${fieldTotal} enum-worthy fields, ${valueTotal} distinct values, ${classCount} nested shapes, ${enumCount} closed vocabularies found down to three levels deep. This page is 100% self-contained — no fetches, no server, everything below (the vocabulary, the shape, three real templates per family, and the mining function itself) is embedded in this one file. Each family also keeps its own copy at <code>templates-&lt;family&gt;/_enum.json</code>; regenerate both with <code>node enums.mjs</code>.</p>
<input id="q" placeholder="Filter by family or field name…">
<div id="list"></div>
<script id="enum-data" type="application/json">${JSON.stringify(index)}</script>
<script id="build-shape-src" type="text/plain">${buildShape.toString()}</script>
<script>
const DATA = JSON.parse(document.getElementById('enum-data').textContent);
const COLOR = ${JSON.stringify(Object.fromEntries(Object.keys(index).map(k => [k, colorFor(k)])))};
const liveBuildShape = new Function('return ' + document.getElementById('build-shape-src').textContent)();

function describeShape(node, indent) {
  indent = indent || '';
  if (!node) return indent + '(nothing seen)';
  if (node.kind === 'object') return Object.entries(node.fields).map(([k, v]) => indent + k + ': ' + shortKind(v) + (v.kind === 'object' || (v.kind === 'array' && v.of.kind === 'object') ? '\\n' + describeShape(v.kind === 'array' ? v.of : v, indent + '  ') : '')).join('\\n');
  return indent + shortKind(node);
}
function shortKind(v) {
  const wrap = s => v.nullable ? 'optional ' + s : s;
  if (v.kind === 'enum') return wrap('enum(' + v.values.length + '): ' + v.values.slice(0, 8).join(', ') + (v.values.length > 8 ? ', …' : ''));
  if (v.kind === 'object') return wrap('object {');
  if (v.kind === 'array') return wrap('array of ' + shortKind(v.of));
  if (v.kind === 'int') return wrap('Int');
  if (v.kind === 'double') return wrap('Double');
  if (v.kind === 'bool') return wrap('Boolean');
  if (v.kind === 'string') return wrap('String');
  return wrap('unknown');
}

function render(filter) {
  const q = (filter || '').toLowerCase();
  const list = document.getElementById('list'); list.innerHTML = '';
  for (const fam of Object.keys(DATA).sort()) {
    const f = DATA[fam];
    const fields = Object.entries(f.fields);
    const matchFam = fam.toLowerCase().includes(q);
    const shownFields = q && !matchFam ? fields.filter(([k]) => k.toLowerCase().includes(q)) : fields;
    if (q && !matchFam && !shownFields.length) continue;
    const div = document.createElement('div'); div.className = 'fam'; div.style.borderColor = COLOR[fam];
    const uid = 'f_' + fam.replace(/[^a-z0-9]/gi, '_');
    div.innerHTML =
      '<h2>' + fam + '<span class="meta" style="margin:0">' + f.sampledFiles + ' of ' + f.totalFiles + ' templates &middot; ' + fields.length + ' enum field' + (fields.length===1?'':'s') + '</span></h2>' +
      '<div class="tabs">' +
        '<button data-t="voc" class="on">vocabulary</button>' +
        '<button data-t="shape">shape</button>' +
        '<button data-t="sample">3 real templates</button>' +
      '</div>' +
      '<div class="pane on" data-p="voc">' + (shownFields.length ? shownFields.map(([k, v]) => '<div class="field"><b>' + k + '</b> <span class="vals">(' + v.distinct + ') ' + v.values.map(x => String(x)).join(', ') + '</span></div>').join('') : '<i>no field matches the filter</i>') + '</div>' +
      '<div class="pane" data-p="shape"><pre>' + describeShape(f.shape).replace(/</g,'&lt;') + '</pre>' +
        '<button class="rw" data-fam="' + fam + '">re-weave live, from the 3 templates embedded below</button>' +
        '<div class="rwout" hidden></div></div>' +
      '<div class="pane" data-p="sample"><pre>' + JSON.stringify(f.rawSample, null, 1).replace(/</g,'&lt;') + '</pre></div>';
    div.querySelectorAll('.tabs button').forEach(b => b.onclick = () => {
      div.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('on', x === b));
      div.querySelectorAll('.pane').forEach(p => p.classList.toggle('on', p.dataset.p === b.dataset.t));
    });
    const rw = div.querySelector('.rw');
    rw.onclick = () => {
      const t0 = performance.now();
      const rewoven = liveBuildShape(DATA[fam].rawSample, 0);
      const ms = (performance.now() - t0).toFixed(2);
      const out = div.querySelector('.rwout');
      out.hidden = false;
      out.innerHTML = '<div class="meta">recomputed in this browser, on the 3 templates above, in ' + ms + 'ms — same function that built this page:</div><pre>' + describeShape(rewoven).replace(/</g,'&lt;') + '</pre>';
    };
    list.appendChild(div);
  }
}
document.getElementById('q').oninput = e => render(e.target.value);
render('');
</script>
</body></html>`;
writeFileSync(join(root, 'enumerator.html'), html);

console.log(`${families.length} families mined, ${fieldTotal} enum fields, ${valueTotal} distinct values, ${classCount} shapes, ${enumCount} closed vocabularies · enumerator.html written, self-contained`);

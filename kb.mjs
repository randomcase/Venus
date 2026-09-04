#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   kb.mjs — builds kb.html from kb.json.

   It does four things the JSON cannot do for itself:

     1 CHECKS EVERY CITATION. Each entry cites boards by filename. The generator
       opens the yard and reports any that do not exist, because a knowledge
       base whose links rot is worse than no knowledge base — it is a knowledge
       base that looks maintained.

     2 BUILDS THE GRAPH BOTH WAYS. Entries declare what they see; the generator
       computes what sees THEM, which is the half nobody writes by hand and the
       half that tells you which ideas are load-bearing.

     3 FINDS THE UNSUPPORTED. An entry with no evidence is a term the yard
       asserts and never demonstrates. Those are listed, by name, at the foot of
       the page. The base is required to name its own soft spots.

     4 COUNTS THE FAN-IN. The most-cited board and the most-linked entry, so the
       reader can see where the weight actually is rather than where the table
       of contents put it.

       node kb.mjs
   ═══════════════════════════════════════════════════════════════════════════ */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* light inline markup so kb.json stays readable: `code` and CAPS → emphasis */
const rich = (s) => esc(s)
  .replace(/`([^`]+)`/g, '<code>$1</code>')
  .replace(/\b([A-Z][A-Z ’']{3,}[A-Z])\b/g, '<em>$1</em>');

const doc = JSON.parse(readFileSync('kb.json', 'utf8'));
const E = doc.entries;
const byId = new Map(E.map((e) => [e.id, e]));

/* ── 1 · check every citation ──────────────────────────────────────────── */
const broken = [];
const cites = new Map();
for (const e of E) {
  for (const v of e.evidence || []) {
    if (!existsSync(v.page)) broken.push(`${e.id} → ${v.page}`);
    cites.set(v.page, (cites.get(v.page) || 0) + 1);
  }
}

/* ── 2 · the graph, both directions ────────────────────────────────────── */
const inbound = new Map(E.map((e) => [e.id, []]));
const danglingSee = [];
for (const e of E) {
  for (const s of e.see || []) {
    if (!byId.has(s)) { danglingSee.push(`${e.id} → ${s}`); continue; }
    inbound.get(s).push(e.id);
  }
}

/* ── 3 · unsupported, and 4 · the fan-in ───────────────────────────────── */
const unsupported = E.filter((e) => !(e.evidence || []).length);
const topPages = [...cites.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
const topEntry = [...inbound.entries()].sort((a, b) => b[1].length - a[1].length)[0];
const census = {};
for (const e of E) census[e.class] = (census[e.class] || 0) + 1;
const settledCensus = {};
for (const e of E) settledCensus[e.settled] = (settledCensus[e.settled] || 0) + 1;

const CLASSES = Object.keys(doc.classes);
const SETTLED = Object.keys(doc.settled);

/* ── the entry card ────────────────────────────────────────────────────── */
const card = (e) => `    <section class="e c-${e.class} s-${e.settled}" id="${esc(e.id)}">
      <h3><a href="#${esc(e.id)}">${esc(e.term)}</a>
        <i class="k">${esc(e.class)}</i><i class="d">${esc(e.settled)}</i></h3>
      <p class="short">${rich(e.short)}</p>
${(e.body || []).map((p) => `      <p class="b">${rich(p)}</p>`).join('\n')}
      <div class="test"><span>the test</span><p>${rich(e.test)}</p></div>
${(e.evidence || []).length ? `      <div class="ev"><span>demonstrated on</span>
${e.evidence.map((v) => `        <a href="${esc(v.page)}"><b>${esc(v.page)}</b>${rich(v.what)}</a>`).join('\n')}
      </div>` : `      <div class="ev none"><span>demonstrated on</span>
        <a class="no"><b>nothing yet</b>this entry is asserted and not shown. It is
          listed at the foot of the page for that reason.</a>
      </div>`}
      <div class="rel">
${(e.see || []).filter((s) => byId.has(s)).map((s) =>
  `        <a href="#${esc(s)}">${esc(byId.get(s).term)}</a>`).join('\n')}
${inbound.get(e.id).length ? `        <s>cited by</s>
${inbound.get(e.id).map((s) =>
  `        <a class="in" href="#${esc(s)}">${esc(byId.get(s).term)}</a>`).join('\n')}` : ''}
      </div>
    </section>`;

const SKY = readFileSync('.sky-block.txt', 'utf8').replace('#060a08', '#080b0c');

writeFileSync('kb.html', `<title>${esc(doc.title)}</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<!--
  THE VENUS KNOWLEDGE BASE — ${E.length} entries, generated from kb.json by kb.mjs.

  Every entry carries a TEST: the thing you could do that would show it false.
  An entry without one is an opinion with a heading on it, and this base does
  not accept them. Where an entry has been demonstrated on a board you can open,
  the board is cited by filename and the generator has checked that the file
  exists — ${cites.size} distinct pages cited, ${broken.length} broken.

  ${unsupported.length} of the ${E.length} entries are asserted and not
  demonstrated anywhere. They are named at the foot of the page. A base that
  hides its own soft spots is a brochure.

  THE FILTERS ARE THE LESSON. Two radio groups, class and confidence, and they
  compose without a lookup table — which is unusual here and worth the note.
  Filtering by hiding is an OR over hide-rules, and an OR over hide-rules is an
  AND over filters, for free. Compare pulse.html, which needed 24 enumerated
  rows for three axes, and see workbook.html chapter seven for why: enumerate
  when the outcome is a VALUE, hide when the outcome is a VISIBILITY.

  Entries are :target-addressable — kb.html#fungibility lands on the entry and
  lights it, so a link into this base can name what it means.

  No script decides anything on this page.
-->
<style>
  :root{
    --void:#080b0c; --card:#111a1b; --card2:#162122; --edge:#263434;
    --ink:#e8f0ef; --dim:#8a9d9b; --bone:#e4d9b8;
    --key:#6ec6ff; --go:#5fd6a4; --warn:#e0a05a; --bad:#e0705a;
    --gold:#e0b155; --vio:#9d8ae0;
  }
  *{box-sizing:border-box}
  body{margin:0;padding:20px 16px 56px;color:var(--ink);background:var(--void);
    font:13.5px/1.66 ui-rounded,system-ui,-apple-system,sans-serif;
    background-image:
      radial-gradient(circle at 12% -6%,rgba(110,198,255,.10),transparent 44%),
      radial-gradient(circle at 90% 100%,rgba(95,214,164,.07),transparent 42%)}
  .w{max-width:1000px;margin:0 auto}
  header{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;
    border-bottom:1px solid var(--edge);padding-bottom:12px;margin-bottom:14px}
  h1{margin:0;font-size:22px;letter-spacing:-.018em;color:var(--bone)}
  header .sub{color:var(--dim);font-size:11.5px;max-width:68ch}
  header .tag{margin-left:auto;font:9px/1 ui-monospace,monospace;letter-spacing:.2em;
    text-transform:uppercase;color:var(--key);border:1px solid var(--key);
    border-radius:4px;padding:4px 9px}
  h2{font:9.5px/1 ui-monospace,Menlo,monospace;letter-spacing:.2em;
    text-transform:uppercase;color:var(--dim);margin:26px 0 10px;font-weight:600;
    display:flex;justify-content:space-between;align-items:baseline;gap:12px}
  h2 b{color:var(--bone);font-family:inherit;letter-spacing:0;text-transform:none;
    font-size:10.5px;font-weight:600}
  p.n{color:var(--dim);font-size:11.5px;line-height:1.72;margin:10px 0 0;max-width:94ch}
  p.n b{color:var(--ink)} p.n em{font-style:normal;color:var(--gold)}
  a{color:var(--gold)}
  code{font:10.5px ui-monospace,monospace;color:var(--bone);background:#0b1112;
    border:1px solid var(--edge);border-radius:4px;padding:1px 5px}
  .panel{background:linear-gradient(180deg,var(--card),var(--card2));
    border:1px solid var(--edge);border-radius:13px;padding:15px 16px}

  /* ─────────────────────────────────────────────────────────── the filters */
  .filters{display:grid;gap:11px;grid-template-columns:1fr 1fr;margin-top:4px}
  @media (max-width:800px){.filters{grid-template-columns:1fr}}
  .fg{background:#0c1314;border:1px solid var(--edge);border-radius:11px;
    padding:11px 12px}
  .fg h4{margin:0 0 8px;font:8.5px/1 ui-monospace,monospace;letter-spacing:.17em;
    text-transform:uppercase;color:var(--dim)}
  .fg .row{display:flex;gap:5px;flex-wrap:wrap}
  .fg input{position:absolute;opacity:0;width:0;height:0}
  .fg label{cursor:pointer;font:10.5px/1 ui-monospace,monospace;padding:9px 11px;
    border-radius:7px;border:1px solid var(--edge);color:var(--dim);user-select:none}
  .fg label:hover{color:var(--ink)}
  .fg input:checked + label{border-color:var(--bone);color:var(--bone);
    background:rgba(228,217,184,.10);font-weight:700}
  .fg input:focus-visible + label{outline:2px solid var(--key);outline-offset:2px}

  /* ══ filtering by HIDING composes for free. Two independent groups, two
     independent hide-rules, and their union is the intersection of the
     filters — no product, no enumeration. Contrast pulse.html, which needed
     twenty-four written-out rows for three axes, and workbook.html ch.7 for
     the distinction: enumerate when the outcome is a VALUE, hide when the
     outcome is a VISIBILITY. */
${CLASSES.map((c) => `  .kb:has(#f-${c}:checked) .e:not(.c-${c}){display:none}`).join('\n')}
${SETTLED.map((s) => `  .kb:has(#g-${s}:checked) .e:not(.s-${s}){display:none}`).join('\n')}

  /* ─────────────────────────────────────────────────────────── the entries */
  .e{background:linear-gradient(180deg,var(--card),var(--card2));
    border:1px solid var(--edge);border-radius:13px;padding:15px 16px;
    margin-top:13px;scroll-margin-top:14px;counter-increment:shown 1}
  .e:target{border-color:var(--key);box-shadow:0 0 0 1px rgba(110,198,255,.35)}
  .e h3{margin:0;font-size:16px;color:var(--bone);letter-spacing:-.01em;
    display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}
  .e h3 a{color:inherit;text-decoration:none}
  .e h3 a:hover{color:var(--key)}
  .e h3 i{font-style:normal;font:8.5px/1 ui-monospace,monospace;letter-spacing:.14em;
    text-transform:uppercase;border:1px solid var(--edge);border-radius:5px;
    padding:5px 7px;color:var(--dim)}
  .e h3 .k{margin-left:auto}
  .e.s-settled h3 .d{color:var(--go);border-color:var(--go)}
  .e.s-working h3 .d{color:var(--warn);border-color:var(--warn)}
  .e.s-contested h3 .d{color:var(--bad);border-color:var(--bad)}
  .e.s-open h3 .d{color:var(--vio);border-color:var(--vio)}
  .short{margin:9px 0 0;font-size:13px;color:var(--ink);line-height:1.6;
    max-width:86ch}
  .b{margin:10px 0 0;font-size:12px;color:var(--dim);line-height:1.75;max-width:92ch}
  .b em,.short em{font-style:normal;color:var(--gold)}
  .test{margin-top:12px;padding:11px 13px;background:#0b1112;
    border-left:3px solid var(--key);border-radius:0 9px 9px 0}
  .test span{display:block;font:8.5px/1 ui-monospace,monospace;letter-spacing:.17em;
    text-transform:uppercase;color:var(--key);margin-bottom:5px}
  .test p{margin:0;font-size:12px;color:var(--ink);line-height:1.7;max-width:88ch}
  .ev{margin-top:12px}
  .ev > span{display:block;font:8.5px/1 ui-monospace,monospace;letter-spacing:.17em;
    text-transform:uppercase;color:var(--dim);margin-bottom:6px}
  .ev a{display:block;text-decoration:none;background:#0b1112;
    border:1px solid var(--edge);border-radius:9px;padding:8px 10px;
    margin-bottom:5px;color:var(--dim);font-size:11px;line-height:1.6}
  .ev a:hover{border-color:var(--go);color:var(--ink)}
  .ev a b{display:block;font:10px/1.5 ui-monospace,monospace;color:var(--gold);
    font-weight:400}
  .ev a.no{cursor:default} .ev a.no:hover{border-color:var(--edge);color:var(--dim)}
  .ev a.no b{color:var(--bad)}
  .rel{margin-top:11px;padding-top:10px;border-top:1px solid var(--edge);
    display:flex;gap:6px;flex-wrap:wrap;align-items:center}
  .rel a{font:10px/1 ui-monospace,monospace;text-decoration:none;color:var(--dim);
    border:1px solid var(--edge);border-radius:6px;padding:6px 8px}
  .rel a:hover{color:var(--ink);border-color:#3a4a4a}
  .rel a.in{color:var(--vio);border-color:rgba(157,138,224,.35)}
  .rel s{text-decoration:none;font:8.5px/1 ui-monospace,monospace;
    letter-spacing:.15em;text-transform:uppercase;color:#50625f;margin-left:6px}

  /* ═════════════════════════════════════════════════ the counter that filters
     A hidden element generates no box and increments no counter, so the
     shown counter counts exactly what survived the filters. Nobody had to write that; it is
     what display:none already means. workbook.html, chapter five. */
  body{counter-reset:shown 0}
  .count{margin-top:12px;padding:11px 13px;border:1px dashed var(--edge);
    border-radius:10px;color:var(--dim);font-size:11px;line-height:1.7}
  .count b{color:var(--bone)}
  .count::before{content:counter(shown);font:16px/1 ui-monospace,monospace;
    color:var(--go);margin-right:9px}

  .stats{display:grid;gap:8px;grid-template-columns:repeat(4,1fr);margin-top:12px}
  @media (max-width:700px){.stats{grid-template-columns:repeat(2,1fr)}}
  .st{background:#0c1314;border:1px solid var(--edge);border-radius:9px;
    padding:10px 12px;display:flex;align-items:baseline;gap:9px}
  .st span{font:8.5px/1 ui-monospace,monospace;letter-spacing:.13em;
    text-transform:uppercase;color:var(--dim)}
  .st b{margin-left:auto;font:16px/1 ui-monospace,monospace;color:var(--bone)}
  .st.ok b{color:var(--go)} .st.no b{color:var(--bad)}

  .soft{margin-top:14px}
  .soft a{display:inline-block;font:10.5px/1 ui-monospace,monospace;
    text-decoration:none;color:var(--vio);border:1px solid rgba(157,138,224,.35);
    border-radius:7px;padding:8px 10px;margin:0 5px 5px 0}

  footer{margin-top:34px;padding-top:14px;border-top:1px solid var(--edge);
    color:var(--dim);font-size:10.5px;line-height:1.75}
${SKY}</style>

<div class="kb w">
  <header>
    <h1>${esc(doc.title)}</h1>
    <span class="sub">${esc(doc.note)}</span>
    <span class="tag">no script</span>
  </header>

  <div class="panel">
    <div class="filters">
      <div class="fg">
        <h4>by kind</h4>
        <div class="row">
          <input type="radio" name="cls" id="f-all" checked><label for="f-all">all ${E.length}</label>
${CLASSES.map((c) => `          <input type="radio" name="cls" id="f-${c}"><label for="f-${c}" title="${esc(doc.classes[c])}">${c} ${census[c] || 0}</label>`).join('\n')}
        </div>
      </div>
      <div class="fg">
        <h4>by how sure</h4>
        <div class="row">
          <input type="radio" name="conf" id="g-all" checked><label for="g-all">all</label>
${SETTLED.map((s) => `          <input type="radio" name="conf" id="g-${s}"><label for="g-${s}" title="${esc(doc.settled[s])}">${s} ${settledCensus[s] || 0}</label>`).join('\n')}
        </div>
      </div>
    </div>
    <p class="n"><b>The two filters compose and there is no table behind them.</b>
      Filtering by hiding is an OR over hide-rules, and an OR over hide-rules is
      an AND over filters &mdash; so ${CLASSES.length} kinds by ${SETTLED.length}
      confidences costs ${CLASSES.length + SETTLED.length} rules rather than
      ${CLASSES.length * SETTLED.length}. Contrast <a href="pulse.html">pulse.html</a>,
      which needed twenty-four written-out rows for three axes. The distinction is
      in <a href="workbook.html#c7">the workbook, chapter seven</a>: <em>enumerate
      when the outcome is a value, hide when the outcome is a visibility.</em></p>
  </div>

  <h2>The entries <b>every one carries a test</b></h2>
${E.map(card).join('\n')}

  <div class="count">of ${E.length} entries showing. A hidden element generates
    no box and so increments no counter &mdash; this number is not maintained by
    anything, it is what <code>display:none</code> already means. <b>Nothing
    happens at ${E.length}.</b></div>

  <h2>What the base knows about itself <b>checked at build time, not claimed</b></h2>
  <div class="panel">
    <div class="stats">
      <div class="st"><span>entries</span><b>${E.length}</b></div>
      <div class="st"><span>boards cited</span><b>${cites.size}</b></div>
      <div class="st ${broken.length ? 'no' : 'ok'}"><span>broken citations</span><b>${broken.length}</b></div>
      <div class="st ${unsupported.length ? 'no' : 'ok'}"><span>undemonstrated</span><b>${unsupported.length}</b></div>
    </div>
    <p class="n"><b>Most cited:</b>
      ${topPages.map(([p, n]) => `<a href="${esc(p)}">${esc(p)}</a> &times;${n}`).join(' &middot; ')}.
      <b>Most depended-on idea:</b> ${esc(byId.get(topEntry[0]).term)}, cited by
      ${topEntry[1].length} other entries. The inbound half of that graph is
      computed here rather than written in the JSON, because it is the half
      nobody maintains by hand and the half that says which ideas are actually
      load-bearing.</p>
${unsupported.length ? `    <p class="n"><b>Asserted and not demonstrated.</b> These entries cite no board
      you can open. That is not a defect to be hidden &mdash; it is the list of
      things this yard says and has not yet shown, and it is printed here so it
      stays uncomfortable:</p>
    <div class="soft">
${unsupported.map((e) => `      <a href="#${esc(e.id)}">${esc(e.term)}</a>`).join('\n')}
    </div>` : `    <p class="n"><b>Every entry cites at least one board you can open.</b>
      That is the current state and it is not a permanent property &mdash; the
      next entry written before its demonstration will appear in this paragraph
      by name, automatically, which is the point of generating the page rather
      than writing it.</p>`}
${broken.length ? `    <p class="n"><b>Broken citations:</b> ${broken.map(esc).join(' &middot; ')}. A
      knowledge base whose links rot is worse than none, because it looks
      maintained.</p>` : ''}
${danglingSee.length ? `    <p class="n"><b>Dangling see-also:</b> ${danglingSee.map(esc).join(' &middot; ')}.</p>` : ''}
  </div>

  <h2>How to add to it <b>one object in kb.json, then re-run</b></h2>
  <div class="panel">
    <p class="n">An entry is <code>id</code>, <code>term</code>,
      <code>class</code>, <code>settled</code>, <code>short</code>,
      <code>body[]</code>, <code>test</code>, <code>evidence[]</code> and
      <code>see[]</code>. The generator checks the citations exist, computes the
      inbound links, recounts the filters, and rebuilds the census. Editing
      <code>kb.html</code> directly edits a build artefact and will be
      overwritten.</p>
    <p class="n"><b>The one non-negotiable field is <code>test</code>.</b> Not
      because the format demands it &mdash; nothing would break &mdash; but
      because an entry that cannot say what would show it false is not knowledge,
      it is a position, and a base full of positions is exactly the thing a
      syndicate builds when it wants agreement rather than fact. If you cannot
      write the test, write the entry as <code>open</code> and let it sit in the
      list at the foot of the page until you can.</p>
  </div>

  <footer>
    ${E.length} entries &middot; ${cites.size} boards cited &middot;
    ${broken.length} broken &middot; ${unsupported.length} undemonstrated.
    Generated by <a href="kb.mjs">kb.mjs</a> from <a href="kb.json">kb.json</a>.
    <br><a href="theory.md">theory.md</a>, the argument &middot;
    <a href="workbook.html">the workbook</a>, the technique &middot;
    <a href="automat.html">the automat</a>, the script layer &middot;
    <a href="index.html">the yard</a>
  </footer>
</div>
<script src="automat.js"></script>
<script src="devmode.js"></script>
`);

console.log(`kb.html · ${E.length} entries · ${cites.size} boards cited · ` +
            `${broken.length} broken · ${unsupported.length} undemonstrated`);
if (broken.length) console.log('  BROKEN: ' + broken.join(', '));
if (danglingSee.length) console.log('  DANGLING see: ' + danglingSee.join(', '));
console.log(`  most cited: ${topPages.map(([p, n]) => p + ' ×' + n).join(', ')}`);
console.log(`  most depended-on: ${byId.get(topEntry[0]).term} (${topEntry[1].length} inbound)`);

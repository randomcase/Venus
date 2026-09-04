#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   reading.mjs — builds reading.html: the knowledge base as a room to sit in.

   THE COLLECTION IS NOT IN THE BUILDING. kb.json holds the entries; this board
   holds nowhere to put them. Which turns out to be the useful constraint,
   because a library whose stacks are elsewhere stops being about storage and
   becomes about the one thing storage cannot do — giving somebody a lit place
   to sit with a single thing for as long as it takes.

   So this is not a list. It is thirty-odd alcoves, one entry to an alcove, and
   the interface is built to make you read ONE of them rather than skim all of
   them. Everything else here follows from that.

   ── the shelving is computed, not alphabetical ──────────────────────────
   Entries are ordered by how DEPENDED-ON they are: the count of other entries
   whose see-also points at them, which the base already carries and nobody has
   ever used. The most load-bearing ideas sit where you reach first, which is
   the same principle as an open shelf against a closed stack — put what gets
   asked for within arm's length — and it is a fact about the graph rather than
   about anybody's opinion of what matters.

   ── the desk ────────────────────────────────────────────────────────────
   Every entry carries a TEST: the thing you could do that would show it false.
   That is the most valuable field in the base and, until now, the least
   actionable — it sat there being true at you. Here it is a task with a place
   to write what happened, and what you write is saved to notes/ through the
   app, which means it survives and I read it. An entry you have tested is
   marked in the catalogue thereafter.

       node reading.mjs
   ═══════════════════════════════════════════════════════════════════════════ */
import { readFileSync, writeFileSync } from 'node:fs';

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const kb = JSON.parse(readFileSync('kb.json', 'utf8'));
const entries = kb.entries;

/* ── the shelving order: who is depended on ───────────────────────────── */
const inbound = {};
entries.forEach((e) => { inbound[e.id] = 0; });
for (const e of entries)
  for (const t of e.see || [])
    if (inbound[t] !== undefined) inbound[t]++;

/* and who points at each, so an entry can show what leans on it */
const leaners = {};
entries.forEach((e) => { leaners[e.id] = []; });
for (const e of entries)
  for (const t of e.see || [])
    if (leaners[t]) leaners[t].push(e.id);

const shelved = entries.slice().sort((a, b) =>
  (inbound[b.id] - inbound[a.id]) || a.term.localeCompare(b.term));

/* the classes the base uses, in the order it uses them */
const classes = [...new Set(entries.map((e) => e.class))];
const settle = [...new Set(entries.map((e) => e.settled))];

const stats = {
  entries: entries.length,
  tested: entries.filter((e) => e.test).length,
  cited: new Set(entries.flatMap((e) => (e.evidence || []).map((v) => v.page))).size,
  links: entries.reduce((a, e) => a + (e.see || []).length, 0),
  orphans: entries.filter((e) => inbound[e.id] === 0).length,
  deepest: shelved[0]
};

/* ── the page ─────────────────────────────────────────────────────────── */
const html = '<!doctype html>\n<html lang="en">\n<head>\n' +
'<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n' +
'<title>The reading room &middot; one entry, and somewhere to sit with it</title>\n' +
'<!-- No off-origin requests. Findings save through venus-app.mjs when it is running. -->\n' +
'<style>\n' +
`  :root{
    --dark:#14100a; --panel:#1c160e; --edge:#2e2617; --edge2:#413623;
    --page:#f4ecda; --pageink:#241f16;
    --ink:#e9dfc7; --dim:#a89678; --faint:#776b57;
    --amber:#d0a03f; --moss:#8aa46a; --rust:#c06a45; --cool:#6f97ac;
    --serif:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;
    --mono:ui-monospace,"Cascadia Mono",Consolas,"SF Mono",Menlo,monospace;
  }
  *{box-sizing:border-box}
  html,body{height:100%}
  body{margin:0;background:var(--dark);color:var(--ink);overflow:hidden;
    font:16px/1.7 var(--serif);
    display:grid;grid-template-rows:auto minmax(0,1fr);height:100vh}
  a{color:var(--amber);text-decoration:none}
  a:hover{text-decoration:underline}

  header{display:flex;align-items:baseline;gap:16px;padding:13px 20px;
    background:var(--panel);border-bottom:1px solid var(--edge);flex-wrap:wrap}
  header h1{margin:0;font:500 22px/1.15 var(--serif);letter-spacing:.03em}
  header h1 s{text-decoration:none;display:block;color:var(--amber);
    font:400 8px/1 var(--mono);letter-spacing:.26em;text-transform:uppercase;margin-top:4px}
  header .n{display:flex;gap:18px;margin-left:auto;flex-wrap:wrap;
    font:400 10px/1.5 var(--mono);color:var(--faint)}
  header .n b{color:var(--ink);font-weight:400}

  main{display:grid;grid-template-columns:290px minmax(0,1fr);min-height:0}
  @media (max-width:900px){ main{grid-template-columns:1fr} #shelf{max-height:34vh} }

  /* ── the shelf, ordered by what leans on what ───────────────────── */
  #shelf{overflow-y:auto;background:var(--panel);border-right:1px solid var(--edge);
    padding:10px 0 30px}
  #shelf .h{padding:14px 16px 6px;color:var(--amber);
    font:400 8px/1.4 var(--mono);letter-spacing:.18em;text-transform:uppercase}
  #shelf .h i{font-style:normal;color:var(--faint);float:right}
  #shelf a{display:block;padding:8px 16px;color:var(--ink);cursor:pointer;
    border-left:2px solid transparent}
  #shelf a:hover{background:#221b11;text-decoration:none}
  #shelf a.on{background:#261e12;border-left-color:var(--amber)}
  #shelf a b{display:block;font:500 14.5px/1.3 var(--serif)}
  #shelf a s{display:block;text-decoration:none;margin-top:2px;
    font:400 9.5px/1.4 var(--mono);color:var(--faint)}
  #shelf a s em{font-style:normal;color:var(--cool)}
  #shelf a s u{text-decoration:none;color:var(--moss)}
  #shelf a.read b:after{content:" \\2713";color:var(--moss);font-size:12px}

  /* ── the alcove: one entry, given room ──────────────────────────── */
  #alcove{overflow-y:auto;padding:0;min-height:0;
    background:
      linear-gradient(90deg,#0f0c07 0 26px,transparent 26px),
      linear-gradient(-90deg,#0f0c07 0 26px,transparent 26px),
      var(--dark)}
  .sheet{max-width:74ch;margin:0 auto;padding:38px 26px 90px}
  .cls{margin:0 0 8px;font:400 8.5px/1 var(--mono);letter-spacing:.2em;
    text-transform:uppercase;color:var(--amber);display:flex;gap:12px;align-items:baseline}
  .cls i{font-style:normal;color:var(--faint)}
  .cls i.settled{color:var(--moss)} .cls i.contested{color:var(--rust)}
  .cls i.working{color:var(--cool)}
  h2{margin:0 0 12px;font:500 38px/1.1 var(--serif);letter-spacing:-.01em}
  .short{margin:0 0 26px;padding:16px 18px;background:var(--panel);
    border-left:3px solid var(--amber);font:italic 400 19px/1.55 var(--serif);
    color:var(--ink)}
  .body p{margin:0 0 17px;font-size:17px;line-height:1.78;color:#d6cbb2}
  .body p:first-letter{}

  .test{margin:32px 0 0;border:1px solid var(--edge2);background:#191309}
  .test h3{margin:0;padding:12px 16px;border-bottom:1px solid var(--edge);
    font:400 8.5px/1 var(--mono);letter-spacing:.2em;text-transform:uppercase;
    color:var(--rust)}
  .test .q{padding:16px 18px;font:400 16px/1.7 var(--serif);color:#dcd0b6}
  .test .desk{padding:0 18px 16px}
  .test textarea{width:100%;height:120px;background:#0f0b06;border:1px solid var(--edge2);
    color:var(--ink);padding:11px 12px;font:400 14px/1.6 var(--serif);
    outline:none;resize:vertical}
  .test textarea:focus{border-color:var(--amber)}
  .test .go{display:flex;gap:10px;align-items:center;margin-top:10px}
  .test button{background:#241b10;border:1px solid var(--edge2);color:var(--ink);
    padding:9px 16px;cursor:pointer;font:400 10px/1 var(--mono);letter-spacing:.1em}
  .test button:hover{border-color:var(--amber);color:var(--amber)}
  .test .go span{font:400 10.5px/1.5 var(--mono);color:var(--faint)}
  .test .go span b{color:var(--moss);font-weight:400}
  .test .go span i{font-style:normal;color:var(--rust)}

  .meta{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr));
    gap:14px;margin:30px 0 0}
  .box{border:1px solid var(--edge);background:var(--panel);padding:14px 16px}
  .box h4{margin:0 0 9px;font:400 8px/1 var(--mono);letter-spacing:.18em;
    text-transform:uppercase;color:var(--faint)}
  .box ul{margin:0;padding:0;list-style:none}
  .box li{padding:5px 0;border-bottom:1px dotted #2a2216;font-size:14px;color:#c8bda3}
  .box li:last-child{border-bottom:none}
  .box li em{font-style:normal;color:var(--faint);font-size:12.5px;display:block;
    margin-top:2px}
  .box .none{color:var(--faint);font:italic 400 13.5px/1.6 var(--serif)}

  footer{margin-top:34px;padding-top:16px;border-top:1px solid var(--edge);
    color:var(--faint);font:400 10.5px/1.8 var(--mono)}
</style>\n</head>\n<body>\n` +

'<header>\n' +
'  <h1>The reading room<s>one entry, and somewhere to sit with it</s></h1>\n' +
'  <div class="n">\n' +
'    <span>entries <b>' + stats.entries + '</b></span>\n' +
'    <span>all carry a test <b>' + (stats.tested === stats.entries ? 'yes' : stats.tested) + '</b></span>\n' +
'    <span>boards cited <b>' + stats.cited + '</b></span>\n' +
'    <span>see-also links <b>' + stats.links + '</b></span>\n' +
'    <span>nothing leans on <b>' + stats.orphans + '</b></span>\n' +
'  </div>\n' +
'</header>\n' +
'<main>\n  <nav id="shelf"></nav>\n  <div id="alcove"></div>\n</main>\n\n' +

'<script>\n' +
'const ENTRIES = ' + JSON.stringify(entries) + ';\n' +
'const INBOUND = ' + JSON.stringify(inbound) + ';\n' +
'const LEANERS = ' + JSON.stringify(leaners) + ';\n' +
'const ORDER = ' + JSON.stringify(shelved.map((e) => e.id)) + ';\n' +
'const CLASSES = ' + JSON.stringify(classes) + ';\n' +
`
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const by = (id) => ENTRIES.find((e) => e.id === id);

const KEY = 'venus.reading.v1';
let read = {};
try { read = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) {}
const keep = () => { try { localStorage.setItem(KEY, JSON.stringify(read)); } catch (e) {} };

let cur = location.hash.slice(1) || ORDER[0];

/* ── the shelf. Ordered by how depended-on, not alphabetically: the base
   already carries a see-also graph and nobody had ever used it to decide
   what should be within reach. ─────────────────────────────────────── */
function shelf() {
  const out = [];
  let band = null;
  ORDER.forEach((id) => {
    const e = by(id), n = INBOUND[id];
    const b = n >= 5 ? 'load-bearing' : n >= 2 ? 'leaned on' : n === 1 ? 'referred to once'
      : 'nothing points here';
    if (b !== band) {
      band = b;
      out.push('<div class="h">' + esc(band) + '<i>' +
        ORDER.filter((x) => {
          const m = INBOUND[x];
          return (m >= 5 ? 'load-bearing' : m >= 2 ? 'leaned on' : m === 1 ?
            'referred to once' : 'nothing points here') === band;
        }).length + '</i></div>');
    }
    out.push('<a data-id="' + id + '" class="' + (id === cur ? 'on ' : '') +
      (read[id] ? 'read' : '') + '"><b>' + esc(e.term) + '</b><s>' +
      '<em>' + esc(e.class) + '</em> \\u00b7 <u>' + esc(e.settled) + '</u>' +
      (n ? ' \\u00b7 ' + n + ' lean on it' : '') + '</s></a>');
  });
  $('#shelf').innerHTML = out.join('');
  $('#shelf').onclick = (ev) => {
    const a = ev.target.closest('a[data-id]');
    if (a) { cur = a.dataset.id; location.hash = cur; paint(); }
  };
}

/* ── the alcove ────────────────────────────────────────────────────── */
function paint() {
  const e = by(cur);
  if (!e) return;
  const lean = LEANERS[e.id] || [];
  const body = Array.isArray(e.body) ? e.body : [e.body];

  $('#alcove').innerHTML = '<div class="sheet">' +
    '<p class="cls">' + esc(e.class) + '<i class="' + esc(e.settled) + '">' +
      esc(e.settled) + '</i>' +
      (INBOUND[e.id] ? '<i>' + INBOUND[e.id] + ' entries lean on this</i>' : '') + '</p>' +
    '<h2>' + esc(e.term) + '</h2>' +
    '<p class="short">' + esc(e.short) + '</p>' +
    '<div class="body">' + body.map((p) => '<p>' + esc(p) + '</p>').join('') + '</div>' +

    (e.test ? '<div class="test"><h3>the test \\u2014 what would show this false</h3>' +
      '<p class="q">' + esc(e.test) + '</p>' +
      '<div class="desk">' +
      '<textarea id="finding" placeholder="What happened when you put it to that? ' +
        'Write it here and it is saved to notes/ \\u2014 which means it survives, ' +
        'and it is read.">' + esc(read[e.id] || '') + '</textarea>' +
      '<div class="go"><button id="save">save the finding</button>' +
      '<span id="msg">' + (read[e.id] ? '<b>you have tested this one</b>' : '') +
      '</span></div></div></div>' : '') +

    '<div class="meta">' +
      '<div class="box"><h4>demonstrated on</h4>' +
        ((e.evidence || []).length
          ? '<ul>' + e.evidence.map((v) => '<li><a href="/' + esc(v.page) + '">' +
            esc(v.page) + '</a><em>' + esc(v.what) + '</em></li>').join('') + '</ul>'
          : '<p class="none">Nothing yet. An entry with no board behind it is a ' +
            'claim, not a finding.</p>') + '</div>' +
      '<div class="box"><h4>it points at</h4>' +
        ((e.see || []).length
          ? '<ul>' + e.see.map((t) => by(t)
              ? '<li><a data-go="' + esc(t) + '">' + esc(by(t).term) + '</a></li>'
              : '<li>' + esc(t) + '</li>').join('') + '</ul>'
          : '<p class="none">Nothing.</p>') + '</div>' +
      '<div class="box"><h4>what leans on it</h4>' +
        (lean.length
          ? '<ul>' + lean.map((t) => '<li><a data-go="' + esc(t) + '">' +
            esc(by(t).term) + '</a></li>').join('') + '</ul>'
          : '<p class="none">Nothing points here yet, which is worth knowing: it ' +
            'is either new, or it is not load-bearing.</p>') + '</div>' +
    '</div>' +

    '<footer>Read from kb.json by reading.mjs. The shelf is ordered by how many ' +
    'entries point at each one, which the base already recorded and nothing had ' +
    'used. Findings save to notes/ when the app is running.<br>' +
    '<a href="/kb.html">the base as a document</a> &middot; ' +
    '<a href="/hall.html">the hall</a> &middot; <a href="/dev.html">the hub</a></footer>' +
    '</div>';

  $('#alcove').scrollTop = 0;
  document.querySelectorAll('[data-go]').forEach((a) => {
    a.onclick = () => { cur = a.dataset.go; location.hash = cur; paint(); shelf(); };
  });
  const s = $('#save');
  if (s) s.onclick = saveFinding;
  shelf();
}

async function saveFinding() {
  const e = by(cur);
  const text = $('#finding').value.trim();
  const msg = $('#msg');
  if (!text) { msg.innerHTML = '<i>nothing written</i>'; return; }
  read[e.id] = text; keep(); shelf();
  msg.textContent = 'writing...';
  try {
    const r = await fetch('/api/note', { method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title: 'tested: ' + e.term,
        page: 'reading.html#' + e.id,
        pageTitle: 'The reading room',
        body: 'THE CLAIM\\n' + e.short + '\\n\\nTHE TEST ON FILE\\n' + e.test +
              '\\n\\nWHAT HAPPENED\\n' + text
      }) });
    const j = await r.json();
    msg.innerHTML = r.ok ? 'saved to <b>' + j.file + '</b>'
      : '<i>not saved: ' + j.error + '</i>';
  } catch (err) {
    msg.innerHTML = '<i>kept in this browser only \\u2014 run venus-app.mjs to ' +
      'write it to disk</i>';
  }
}

addEventListener('hashchange', () => {
  const h = location.hash.slice(1);
  if (h && by(h)) { cur = h; paint(); }
});
shelf(); paint();
<\/script>\n</body>\n</html>\n`;

writeFileSync('reading.html', html);

console.log('reading.html · ' + stats.entries + ' entries, one to an alcove');
console.log('  shelved by how depended-on, from the see-also graph the base already had');
console.log('  most leaned on: ' + shelved.slice(0, 4)
  .map((e) => e.term + ' (' + inbound[e.id] + ')').join(', '));
console.log('  ' + stats.orphans + ' entries nothing points at — new, or not load-bearing');
console.log('  ' + stats.links + ' see-also links, ' + stats.cited + ' boards cited');
console.log('  every test is now a task with somewhere to write the finding, saved to notes/');

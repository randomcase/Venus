#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   journal.mjs — builds journal.html, the writing desk.

   WHY THIS IS GENERATED AND NOT HAND-WRITTEN.

   A journal with nothing to write about is a text box. The yard already
   carries a writing layer — nine challenges in templates-challenge/, of which
   four are write or voice type, and thirty-two knowledge-base entries each of
   which carries a TEST it has not been put to. Those are prompts. They are
   already authored, already validated, and already cited from the boards.
   Inlining them means the desk knows what this place is about, and means a
   prompt added to the challenge layer shows up here without anybody editing
   two files.

   A page opened from disk cannot fetch its own JSON — file:// blocks it — so
   the prompts are baked in at build time rather than loaded at run time.
   That is the only reason this is a generator and not a static page.

   WHAT THE DESK REFUSES TO DO.

   It does not grade. It counts words, sentences, days and entries, and it
   will tell you the measure of your sentences, but there is no score, no
   target, no streak that breaks, and no state in which the desk is finished
   with you. That is the +1 law applied to prose: every session is +1 on the
   one before it, and nothing here can go down. A word count that can fall is
   a grade wearing a number.

   It does not send anything anywhere. Entries live in this browser, in
   localStorage, under one key. Export writes a markdown file you keep.

       node journal.mjs
   ═══════════════════════════════════════════════════════════════════════════ */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* ── the prompts, from the layers that already exist ───────────────────── */
const prompts = [];

/* the challenge layer: write and voice tasks, plus every standpoint in a
   voice challenge, because a standpoint IS a prompt and there are more of
   them than there are challenges. */
const CDIR = 'templates-challenge';
let challenges = 0;
if (existsSync(CDIR)) {
  for (const f of readdirSync(CDIR).filter((x) => x.endsWith('.json')).sort()) {
    const c = JSON.parse(readFileSync(join(CDIR, f), 'utf8'));
    if (c.type !== 'write' && c.type !== 'voice') continue;
    challenges++;
    if (c.task)
      prompts.push({ k: c.type, from: c.id, head: c.title, body: c.task,
                     ground: c.ground || '' });
    for (const s of c.standpoints || [])
      prompts.push({ k: 'voice', from: c.id + '/' + s.id, head: s.who,
                     body: s.brief, ground: c.ground || '' });
  }
}

/* the knowledge base: every entry carries a test it has not been put to.
   Writing the account of putting it to that test is the prompt. */
let kbn = 0;
if (existsSync('kb.json')) {
  const kb = JSON.parse(readFileSync('kb.json', 'utf8'));
  kbn = kb.entries.length;
  for (const e of kb.entries) {
    if (!e.test) continue;
    const ground = (Array.isArray(e.body) ? e.body.join(' ') : String(e.body || ''))
      .replace(/<[^>]*>/g, '');
    prompts.push({ k: 'settle', from: e.id, head: e.term || e.id,
                   body: 'Put it to the test and write what happened. The test on ' +
                         'file is: ' + e.test,
                   ground: (e.short ? e.short + ' — ' : '') + ground.slice(0, 420) });
  }
}

/* one that is not from anywhere. A desk should have a door in it. */
prompts.push({ k: 'open', from: 'the-desk', head: 'Nothing in particular',
  body: 'Write whatever you came here to write. This entry is counted the ' +
        'same as every other one.',
  ground: 'The prompts on this rail are here because a blank page is a worse ' +
          'invitation than a bad question. They are not an assignment.' });

const KINDS = { write: 'writing', voice: 'voice', settle: 'settle it', open: 'open' };

/* ── the page ──────────────────────────────────────────────────────────── */
const html = '<!doctype html>\n<html lang="en">\n<head>\n' +
'<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n' +
'<title>The journal &middot; Venus yard</title>\n' +
'<style>\n' +
`  :root{
    --ink:#e8e2d6; --dim:#8b8578; --faint:#5d5951;
    --page:#12140f; --desk:#0a0b08; --rail:#0e100c;
    --edge:#232619; --gold:#c9a227; --plum:#9a6b9e; --glow:#7fb3a3;
  }
  *{box-sizing:border-box}
  html,body{height:100%}
  body{margin:0;background:var(--desk);color:var(--ink);
    font:14px/1.6 ui-sans-serif,system-ui,"Segoe UI",sans-serif;
    display:grid;grid-template-columns:212px minmax(0,1fr) 300px;
    grid-template-rows:100vh;overflow:hidden}
  a{color:var(--gold)}

  /* ── the shelf: every entry you have written ───────────────────────── */
  #shelf{background:var(--rail);border-right:1px solid var(--edge);
    display:flex;flex-direction:column;min-height:0}
  #shelf header{padding:14px 14px 10px;border-bottom:1px solid var(--edge)}
  #shelf h1{margin:0;font:600 13px/1.3 ui-sans-serif,system-ui,sans-serif;
    letter-spacing:.09em;text-transform:uppercase;color:var(--ink)}
  #shelf h1 span{display:block;font:400 10px/1.5 ui-monospace,monospace;
    letter-spacing:.04em;text-transform:none;color:var(--faint);margin-top:4px}
  #new{margin:10px 14px;padding:8px;background:#171a12;color:var(--gold);
    border:1px solid var(--edge);border-radius:7px;cursor:pointer;
    font:600 11px/1 ui-sans-serif,system-ui,sans-serif;letter-spacing:.06em}
  #new:hover{background:#1d2117;border-color:var(--gold)}
  #list{flex:1;overflow-y:auto;padding:0 8px 12px}
  .ent{padding:9px 10px;border-radius:7px;cursor:pointer;margin-bottom:3px;
    border:1px solid transparent}
  .ent:hover{background:#151810}
  .ent.on{background:#1a1e14;border-color:var(--edge)}
  .ent b{display:block;font:500 12px/1.35 ui-sans-serif,system-ui,sans-serif;
    color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .ent i{font-style:normal;display:block;margin-top:3px;
    font:9.5px/1.4 ui-monospace,monospace;color:var(--faint)}
  #shelf footer{padding:10px 14px;border-top:1px solid var(--edge);
    font:9.5px/1.7 ui-monospace,monospace;color:var(--faint);
    display:flex;flex-direction:column;gap:2px}
  #shelf footer b{color:var(--glow);font-weight:600}

  /* ── the page: the only thing here that matters ────────────────────── */
  #desk{display:flex;flex-direction:column;min-width:0;background:var(--page)}
  #bar{display:flex;align-items:center;gap:14px;padding:11px 26px;
    border-bottom:1px solid var(--edge);flex:none}
  #title{flex:1;background:none;border:none;outline:none;color:var(--ink);
    font:600 17px/1.3 Georgia,"Iowan Old Style",serif;padding:2px 0;min-width:0}
  #title::placeholder{color:var(--faint)}
  #bar button{background:none;border:1px solid var(--edge);color:var(--dim);
    border-radius:6px;padding:5px 10px;cursor:pointer;
    font:10px/1 ui-monospace,monospace}
  #bar button:hover{color:var(--ink);border-color:var(--dim)}
  #bar button.warn:hover{color:#d98a7a;border-color:#5a2f28}
  #saved{font:9.5px/1 ui-monospace,monospace;color:var(--faint);
    min-width:66px;text-align:right}
  #sheet{flex:1;overflow-y:auto;padding:34px 0 60vh}
  #text{display:block;width:min(68ch,calc(100% - 52px));margin:0 auto;
    background:none;border:none;outline:none;resize:none;color:var(--ink);
    font:16.5px/1.85 Georgia,"Iowan Old Style",serif;min-height:40vh}
  #text::placeholder{color:var(--faint)}
  #tally{flex:none;display:flex;gap:0;border-top:1px solid var(--edge);
    background:var(--rail)}
  #tally div{flex:1;padding:9px 6px;text-align:center;
    border-right:1px solid var(--edge)}
  #tally div:last-child{border-right:none}
  #tally u{display:block;text-decoration:none;
    font:15px/1.2 ui-monospace,monospace;color:var(--ink);
    font-variant-numeric:tabular-nums}
  #tally s{display:block;text-decoration:none;margin-top:2px;
    font:8.5px/1 ui-sans-serif,system-ui,sans-serif;letter-spacing:.09em;
    text-transform:uppercase;color:var(--faint)}

  /* ── the rail: what there is to write about ────────────────────────── */
  #rail{background:var(--rail);border-left:1px solid var(--edge);
    overflow-y:auto;padding:14px 15px 30px}
  #rail h2{margin:0 0 4px;font:600 11px/1.3 ui-sans-serif,system-ui,sans-serif;
    letter-spacing:.09em;text-transform:uppercase;color:var(--dim)}
  #rail>p{margin:0 0 14px;font:10px/1.65 ui-sans-serif,system-ui,sans-serif;
    color:var(--faint)}
  #filter{display:flex;gap:4px;margin-bottom:12px;flex-wrap:wrap}
  #filter button{flex:1;background:#141710;border:1px solid var(--edge);
    color:var(--faint);border-radius:6px;padding:5px 4px;cursor:pointer;
    font:9px/1 ui-sans-serif,system-ui,sans-serif;letter-spacing:.05em;
    text-transform:uppercase}
  #filter button.on{color:var(--ink);border-color:var(--dim);background:#1b1f15}
  .p{border:1px solid var(--edge);border-left:2px solid var(--plum);
    border-radius:8px;padding:10px 11px;margin-bottom:7px;cursor:pointer;
    background:#101309}
  .p:hover{border-color:var(--dim);border-left-color:var(--gold)}
  .p[data-k="settle"]{border-left-color:var(--glow)}
  .p[data-k="open"]{border-left-color:var(--gold)}
  .p h3{margin:0 0 5px;font:600 11.5px/1.4 ui-sans-serif,system-ui,sans-serif;
    color:var(--ink)}
  .p p{margin:0;font:10px/1.6 ui-sans-serif,system-ui,sans-serif;color:var(--dim)}
  .p em{display:block;margin-top:7px;font-style:normal;
    font:8.5px/1.4 ui-monospace,monospace;color:var(--faint)}
  .p .g{display:none;margin-top:8px;padding-top:8px;
    border-top:1px solid var(--edge);font:9.5px/1.65 ui-sans-serif,sans-serif;
    color:var(--faint)}
  .p.open .g{display:block}

  @media (max-width:1080px){
    body{grid-template-columns:1fr;grid-template-rows:auto 1fr auto;
      overflow:auto;height:auto}
    #shelf,#rail{border:none;border-bottom:1px solid var(--edge);max-height:40vh}
    #sheet{padding-bottom:24px}
  }
</style>\n</head>\n<body>\n` +

'<aside id="shelf">\n' +
'  <header>\n    <h1>The journal<span>' +
   'nothing here is graded</span></h1>\n  </header>\n' +
'  <button id="new">+ new entry</button>\n' +
'  <div id="list"></div>\n' +
'  <footer>\n' +
'    <div>entries <b id="t-ent">0</b></div>\n' +
'    <div>words, all told <b id="t-word">0</b></div>\n' +
'    <div>days written <b id="t-day">0</b></div>\n' +
'  </footer>\n' +
'</aside>\n\n' +

'<main id="desk">\n' +
'  <div id="bar">\n' +
'    <input id="title" placeholder="Untitled" autocomplete="off" spellcheck="false">\n' +
'    <span id="saved"></span>\n' +
'    <button id="export">export all</button>\n' +
'    <button id="del" class="warn">delete</button>\n' +
'  </div>\n' +
'  <div id="sheet"><textarea id="text" spellcheck="true" ' +
     'placeholder="Start anywhere. It saves as you go."></textarea></div>\n' +
'  <div id="tally">\n' +
'    <div><u id="c-w">0</u><s>words</s></div>\n' +
'    <div><u id="c-c">0</u><s>characters</s></div>\n' +
'    <div><u id="c-s">0</u><s>sentences</s></div>\n' +
'    <div><u id="c-m">0</u><s>the measure</s></div>\n' +
'    <div><u id="c-r">0:00</u><s>read aloud</s></div>\n' +
'  </div>\n' +
'</main>\n\n' +

'<aside id="rail">\n' +
'  <h2>Something to write about</h2>\n' +
'  <p>' + prompts.length + ' of them, and none is an assignment. ' +
   challenges + ' come from the writing and voice challenges, ' + kbn +
   ' entries in the base each carry a test nobody has put them to, ' +
   'and the last one is a door. Click a card to open its ground; click the ' +
   'heading to start an entry from it.</p>\n' +
'  <div id="filter">\n' +
'    <button data-f="all" class="on">all</button>\n' +
'    <button data-f="voice">voice</button>\n' +
'    <button data-f="write">writing</button>\n' +
'    <button data-f="settle">settle it</button>\n' +
'  </div>\n' +
prompts.map((p, i) =>
'  <article class="p" data-k="' + p.k + '" data-i="' + i + '">\n' +
'    <h3>' + esc(p.head) + '</h3>\n' +
'    <p>' + esc(p.body) + '</p>\n' +
'    <em>' + esc(KINDS[p.k]) + ' &middot; ' + esc(p.from) + '</em>\n' +
   (p.ground ? '    <div class="g">' + esc(p.ground) + '</div>\n' : '') +
'  </article>').join('\n') + '\n' +
'</aside>\n\n' +

'<script>\n' +
'/* The desk. Everything is local: one localStorage key, no network, no\n' +
'   analytics, nothing leaves this browser. */\n' +
'const PROMPTS = ' + JSON.stringify(prompts) + ';\n' +
`
const KEY = 'venus.journal.v1';
const $ = (s) => document.querySelector(s);

let book = load();
let cur = book.entries[0] ? book.entries[0].id : null;
if (!cur) cur = fresh().id;

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const b = JSON.parse(raw);
      if (b && Array.isArray(b.entries)) return b;
    }
  } catch (e) { /* private window, cleared storage, blocked site data */ }
  return { entries: [] };
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(book)); return true; }
  catch (e) { return false; }
}

function fresh(seed) {
  const now = new Date();
  const e = {
    id: 'e' + now.getTime().toString(36) + Math.floor(Math.random() * 1e6).toString(36),
    title: seed ? seed.head : '',
    text: seed ? '' : '',
    from: seed ? seed.from : '',
    made: now.toISOString(),
    touched: now.toISOString()
  };
  book.entries.unshift(e);
  save();
  return e;
}

const get = (id) => book.entries.find((e) => e.id === id);

/* ── counting. Nothing here can be a score: every number is a count of what
   you wrote, and a count of what you wrote does not go down when you stop. */
function words(t) { return (t.trim().match(/[^\\s]+/g) || []).length; }
  /* multiline, so a line ending without a full stop still counts as one.
     People write a line and hit return; that is a sentence whether or not
     they punctuated it, and counting it as zero made the measure lie. */
function sentences(t) {
  return (t.match(/[^.!?\\n]+[.!?]+(\\s|$)|[^.!?\\n]+$/gm) || [])
    .filter((s) => s.trim().length).length;
}

function count() {
  const t = $('#text').value;
  const w = words(t), s = sentences(t);
  $('#c-w').textContent = w.toLocaleString();
  $('#c-c').textContent = t.length.toLocaleString();
  $('#c-s').textContent = s.toLocaleString();
  $('#c-m').textContent = s ? (w / s).toFixed(1) : '0';
  const sec = Math.round(w / 150 * 60);
  $('#c-r').textContent = Math.floor(sec / 60) + ':' +
    String(sec % 60).padStart(2, '0');
}

function totals() {
  const all = book.entries;
  $('#t-ent').textContent = all.length;
  $('#t-word').textContent = all.reduce((a, e) => a + words(e.text || ''), 0)
    .toLocaleString();
  const days = new Set(all.map((e) => (e.touched || e.made || '').slice(0, 10))
    .filter(Boolean));
  $('#t-day').textContent = days.size;
}

function shelf() {
  const L = $('#list');
  L.innerHTML = '';
  for (const e of book.entries) {
    const d = document.createElement('div');
    d.className = 'ent' + (e.id === cur ? ' on' : '');
    const b = document.createElement('b');
    b.textContent = e.title || firstLine(e.text) || 'Untitled';
    const i = document.createElement('i');
    i.textContent = (e.touched || e.made).slice(0, 10) + '  \\u00b7  ' +
      words(e.text || '') + 'w';
    d.append(b, i);
    d.onclick = () => { open(e.id); };
    L.appendChild(d);
  }
  totals();
}

function firstLine(t) {
  const l = (t || '').split('\\n').find((x) => x.trim());
  return l ? l.trim().slice(0, 40) : '';
}

function open(id) {
  cur = id;
  const e = get(id);
  $('#title').value = e.title || '';
  $('#text').value = e.text || '';
  count(); shelf();
  $('#text').focus();
}

let timer = null;
function touch() {
  const e = get(cur);
  if (!e) return;
  e.title = $('#title').value;
  e.text = $('#text').value;
  e.touched = new Date().toISOString();
  count();
  $('#saved').textContent = 'saving';
  clearTimeout(timer);
  timer = setTimeout(() => {
    const ok = save();
    $('#saved').textContent = ok ? 'saved' : 'NOT SAVED';
    shelf();
  }, 420);
}

$('#text').addEventListener('input', touch);
$('#title').addEventListener('input', touch);

$('#new').onclick = () => { open(fresh().id); $('#title').focus(); };

$('#del').onclick = () => {
  const e = get(cur);
  if (!e) return;
  const w = words(e.text || '');
  if (w > 0 && !confirm('Delete this entry? ' + w + ' words, and there is no undo.'))
    return;
  book.entries = book.entries.filter((x) => x.id !== cur);
  if (!book.entries.length) fresh();
  save();
  open(book.entries[0].id);
};

/* Export is a file you keep. It is the only way anything leaves the browser,
   and it goes to your disk rather than to anybody. */
$('#export').onclick = () => {
  const md = book.entries.slice().reverse().map((e) =>
    '# ' + (e.title || 'Untitled') + '\\n\\n' +
    '*' + (e.made || '').slice(0, 10) +
    (e.from ? ' \\u00b7 from ' + e.from : '') + '*\\n\\n' +
    (e.text || '') + '\\n').join('\\n---\\n\\n');
  const total = book.entries.reduce((a, e) => a + words(e.text || ''), 0);
  const head = '# The journal\\n\\n' + book.entries.length + ' entries, ' +
    total.toLocaleString() + ' words.\\n\\n---\\n\\n';
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([head + md], { type: 'text/markdown' }));
  a.download = 'journal-' + new Date().toISOString().slice(0, 10) + '.md';
  a.click();
  URL.revokeObjectURL(a.href);
};

/* ── the rail ─────────────────────────────────────────────────────────── */
document.querySelectorAll('.p').forEach((el) => {
  const i = +el.dataset.i;
  el.onclick = () => el.classList.toggle('open');
  el.querySelector('h3').onclick = (ev) => {
    ev.stopPropagation();
    const e = fresh(PROMPTS[i]);
    open(e.id);
    $('#text').focus();
  };
});

document.querySelectorAll('#filter button').forEach((b) => {
  b.onclick = () => {
    document.querySelectorAll('#filter button').forEach((x) => x.classList.remove('on'));
    b.classList.add('on');
    const f = b.dataset.f;
    document.querySelectorAll('.p').forEach((p) => {
      p.style.display = (f === 'all' || p.dataset.k === f || p.dataset.k === 'open')
        ? '' : 'none';
    });
  };
});

addEventListener('keydown', (ev) => {
  if ((ev.metaKey || ev.ctrlKey) && ev.key === 'Enter') {
    ev.preventDefault(); $('#new').click();
  }
});

open(cur);
<\/script>\n</body>\n</html>\n`;

writeFileSync('journal.html', html);

console.log('journal.html · ' + prompts.length + ' prompts');
console.log('  ' + challenges + ' write/voice challenges (tasks + standpoints)');
console.log('  ' + kbn + ' kb entries, each carrying a test');
const by = {};
prompts.forEach((p) => { by[p.k] = (by[p.k] || 0) + 1; });
console.log('  ' + Object.entries(by).map(([k, n]) => k + ' ' + n).join(' · '));
console.log('  storage: one localStorage key, no network, export writes markdown');

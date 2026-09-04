#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   explorer.mjs — builds explorer.html: the yard, edited from inside the yard.

   A tree on the left, an editor in the middle, and what the generator said on
   the right. Save with ctrl+S, run a .mjs with ctrl+R, and the loop the whole
   place is built on closes without leaving the window: edit the generator,
   run it, the board it emits changes, open the board.

   IT WRITES TO DISK, and that is worth stating rather than burying. The
   fencing is in venus-app.mjs and there is one copy of it: never outside this
   folder, never inside .git or node_modules, never a file type that is not
   text. The editor asks the server; the server decides. A second opinion
   about what is inside the yard would be a second way of being wrong.

   ── what it does not do ─────────────────────────────────────────────────
   No autosave. Nothing is written until you press save, because a file that
   changes under you while you are reading it is worse than a file you have to
   remember to save. The tab shows a dot when the buffer differs from disk and
   that is the whole of the ceremony.

       node explorer.mjs        (then open it through venus-app.mjs)
   ═══════════════════════════════════════════════════════════════════════════ */
import { writeFileSync } from 'node:fs';

const html = '<!doctype html>\n<html lang="en">\n<head>\n' +
'<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n' +
'<title>The explorer &middot; the yard, edited from inside it</title>\n' +
'<!-- Needs venus-app.mjs: a plain static server has no tree, read, save or run. -->\n' +
'<style>\n' +
`  :root{
    --bg:#0a0d11; --panel:#0f141a; --edge:#1c2530; --edge2:#2a3745;
    --ink:#dce3ea; --dim:#8792a0; --faint:#57616d;
    --gold:#c9a227; --moss:#7d9d6a; --rust:#c4674f; --cool:#5f92a8; --plum:#9a7bb0;
    --mono:ui-monospace,"Cascadia Mono",Consolas,"SF Mono",Menlo,monospace;
    --serif:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;
  }
  *{box-sizing:border-box}
  html,body{height:100%}
  body{margin:0;background:var(--bg);color:var(--ink);overflow:hidden;
    font:13px/1.5 var(--mono);
    display:grid;grid-template-rows:auto minmax(0,1fr) auto;height:100vh}

  header{display:flex;align-items:center;gap:14px;padding:9px 14px;
    background:var(--panel);border-bottom:1px solid var(--edge);flex-wrap:wrap}
  header h1{margin:0;font:500 15px/1.2 var(--serif);letter-spacing:.04em}
  header h1 s{text-decoration:none;color:var(--gold);font:400 8px/1 var(--mono);
    letter-spacing:.24em;text-transform:uppercase;display:block;margin-top:3px}
  header .p{color:var(--faint);font-size:11px}
  header .p b{color:var(--ink);font-weight:400}
  header .p i{font-style:normal;color:var(--gold)}
  header .sp{margin-left:auto;display:flex;gap:7px}
  header button{background:#161d25;border:1px solid var(--edge2);color:var(--ink);
    padding:7px 13px;cursor:pointer;font:400 10px/1 var(--mono);letter-spacing:.09em}
  header button:hover:not(:disabled){border-color:var(--gold);color:var(--gold)}
  header button:disabled{color:var(--faint);border-color:#1a222b;cursor:default}
  header button.run:hover:not(:disabled){border-color:var(--moss);color:var(--moss)}

  main{display:grid;grid-template-columns:250px minmax(0,1fr) 360px;min-height:0}
  @media (max-width:1100px){ main{grid-template-columns:210px minmax(0,1fr)} #say{display:none} }

  #tree{overflow-y:auto;background:var(--panel);border-right:1px solid var(--edge);
    padding:8px 0}
  #tree .d{padding:7px 12px 4px;color:var(--gold);font-size:9px;letter-spacing:.16em;
    text-transform:uppercase;margin-top:6px}
  #tree a{display:flex;gap:8px;padding:4px 12px;color:var(--dim);text-decoration:none;
    cursor:pointer;font-size:11.5px}
  #tree a:hover{background:#141b23;color:var(--ink)}
  #tree a.on{background:#18212b;color:var(--gold)}
  #tree a u{margin-left:auto;text-decoration:none;color:var(--faint);font-size:9px}
  #tree a.gen{color:var(--plum)} #tree a.gen.on{color:var(--gold)}

  #mid{display:flex;flex-direction:column;min-width:0;min-height:0}
  #tabs{display:flex;gap:0;background:var(--panel);border-bottom:1px solid var(--edge);
    overflow-x:auto;flex:none}
  #tabs div{padding:8px 14px;border-right:1px solid var(--edge);cursor:pointer;
    color:var(--faint);font-size:11px;white-space:nowrap;display:flex;gap:7px;
    align-items:center}
  #tabs div.on{color:var(--ink);background:var(--bg)}
  #tabs div i{font-style:normal;color:var(--rust);font-size:14px;line-height:0}
  #tabs div b{font-weight:400;color:var(--faint);font-size:13px}
  #tabs div b:hover{color:var(--rust)}

  #wrap{flex:1;overflow:auto;display:flex;min-height:0;background:var(--bg)}
  #gut{flex:none;width:52px;padding:12px 9px 0 0;text-align:right;color:#3c4652;
    font:400 12px/20px var(--mono);user-select:none;
    border-right:1px solid var(--edge);background:#0c1116}
  #stack{flex:1;position:relative;min-width:0}
  #hl,#ed{margin:0;padding:12px 16px 40vh 12px;border:0;
    font:400 12.5px/20px var(--mono);white-space:pre;tab-size:2;
    overflow-wrap:normal}
  #hl{position:absolute;inset:0;pointer-events:none;color:var(--ink);overflow:hidden}
  #ed{position:relative;width:100%;min-height:100%;display:block;resize:none;
    background:transparent;outline:none;color:transparent;caret-color:var(--gold)}
  #ed::selection{background:rgba(201,162,39,.25)}
  .k{color:#b083c9}.s{color:#8fae6b}.c{color:#5c6672;font-style:italic}
  .n{color:#d19a4e}.p{color:#7b8794}.t{color:#5fa8bd}.a{color:#c98a5e}

  #say{overflow-y:auto;background:var(--panel);border-left:1px solid var(--edge);
    padding:12px 14px}
  #say h4{margin:0 0 9px;font:400 8.5px/1 var(--mono);letter-spacing:.2em;
    text-transform:uppercase;color:var(--gold)}
  #say pre{margin:0;white-space:pre-wrap;word-break:break-word;
    font:400 10.5px/1.65 var(--mono);color:var(--dim)}
  #say pre.ok{color:var(--moss)} #say pre.bad{color:var(--rust)}
  #say .hint{margin:14px 0 0;padding-top:12px;border-top:1px solid var(--edge);
    font:400 11px/1.7 var(--serif);color:var(--faint)}
  #say .hint b{color:var(--dim)}

  footer{display:flex;align-items:center;gap:16px;padding:7px 14px;
    background:var(--panel);border-top:1px solid var(--edge);
    font-size:10px;color:var(--faint)}
  footer b{color:var(--dim);font-weight:400}
  footer .sp{margin-left:auto}
  footer a{color:var(--gold);text-decoration:none}
</style>\n</head>\n<body>\n` +

'<header>\n' +
'  <h1>The explorer<s>the yard, edited from inside it</s></h1>\n' +
'  <div class="p" id="where">nothing open</div>\n' +
'  <div class="sp">\n' +
'    <button id="save" disabled>save &nbsp;ctrl+S</button>\n' +
'    <button id="run" class="run" disabled>run &nbsp;ctrl+R</button>\n' +
'    <button id="open" disabled>open the board</button>\n' +
'  </div>\n' +
'</header>\n' +
'<main>\n' +
'  <nav id="tree"></nav>\n' +
'  <div id="mid">\n' +
'    <div id="tabs"></div>\n' +
'    <div id="wrap"><div id="gut"></div>' +
'<div id="stack"><pre id="hl" aria-hidden="true"></pre>' +
'<textarea id="ed" spellcheck="false" autocomplete="off" wrap="off"></textarea></div></div>\n' +
'  </div>\n' +
'  <aside id="say"><h4>what it said</h4><pre id="out">Nothing run yet.</pre>' +
'<p class="hint">Open a <b>.mjs</b> and press run. It executes here, in this ' +
'folder, and prints what the generator printed &mdash; which is the loop the ' +
'whole yard is built on. Edit, run, the board changes, open the board.<br><br>' +
'<b>Nothing autosaves.</b> A dot on the tab means the buffer differs from disk. ' +
'That is the entire ceremony.</p></aside>\n' +
'</main>\n' +
'<footer>\n' +
'  <span>files <b id="f-n">0</b></span>\n' +
'  <span>open <b id="f-open">0</b></span>\n' +
'  <span id="f-dirty"></span>\n' +
'  <span class="sp"><a href="/arcade.html">the arcade</a> &middot; ' +
'<a href="/dev.html">the hub</a> &middot; <a href="/writing.html">the notebook</a></span>\n' +
'</footer>\n\n' +

'<script>\n' +
`
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

let FILES = [];
const open = new Map();     /* path -> { body, disk } */
let cur = null;

/* ══ highlighting. Same approach the notebook uses: a painted layer under a
   transparent textarea, identical metrics or the ink slides off. ══════ */
const KW = /\\b(const|let|var|function|return|if|else|for|of|in|while|do|break|continue|new|class|extends|import|export|from|default|await|async|try|catch|finally|throw|typeof|instanceof|delete|void|yield|static|this|super|null|undefined|true|false)\\b/g;
function tok(text, ext) {
  const E = esc(text);
  if (ext === 'mjs' || ext === 'js' || ext === 'json')
    return E
      .replace(/(\\/\\*[\\s\\S]*?\\*\\/|\\/\\/[^\\n]*)/g, '<i class="c">$1</i>')
      .replace(/('(?:[^'\\n\\\\]|\\\\.)*'|&quot;(?:[^&\\n]|&(?!quot;))*&quot;|\`(?:[^\`\\\\]|\\\\.)*\`)/g, '<i class="s">$1</i>')
      .replace(/\\b(\\d[\\d_.eE+-]*)\\b/g, '<i class="n">$1</i>')
      .replace(KW, '<i class="k">$&</i>');
  if (ext === 'css')
    return E.replace(/(\\/\\*[\\s\\S]*?\\*\\/)/g, '<i class="c">$1</i>')
      .replace(/^(\\s*)([a-z-]+)(\\s*:)/gm, '$1<i class="a">$2</i><i class="p">$3</i>');
  if (ext === 'html')
    return E.replace(/(&lt;!--[\\s\\S]*?--&gt;)/g, '<i class="c">$1</i>')
      .replace(/(&lt;\\/?)([a-zA-Z][\\w-]*)/g, '<i class="p">$1</i><i class="t">$2</i>')
      .replace(/([a-zA-Z-]+)(=)(&quot;[^&]*&quot;)/g, '<i class="a">$1</i><i class="p">$2</i><i class="s">$3</i>');
  if (ext === 'md')
    return E.replace(/^(#+ .*)$/gm, '<i class="t">$1</i>')
      .replace(/^(- .*)$/gm, '<i class="a">$1</i>');
  return E;
}
const extOf = (p) => (p.split('.').pop() || '').toLowerCase();

function paintEditor() {
  const f = open.get(cur);
  if (!f) { $('#hl').innerHTML = ''; $('#gut').innerHTML = ''; $('#ed').value = ''; return; }
  $('#hl').innerHTML = tok(f.body, extOf(cur)) + ' ';
  const n = f.body.split('\\n').length;
  $('#gut').innerHTML = Array.from({ length: n }, (_, i) => i + 1).join('<br>');
}

/* ══ the tree ══════════════════════════════════════════════════════════ */
async function loadTree() {
  FILES = await (await fetch('/api/tree')).json();
  const byDir = new Map();
  for (const f of FILES) {
    if (f.dir) continue;
    const i = f.path.lastIndexOf('/');
    const d = i < 0 ? 'the yard' : f.path.slice(0, i);
    if (!byDir.has(d)) byDir.set(d, []);
    byDir.get(d).push(f);
  }
  const el = $('#tree');
  el.innerHTML = '';
  for (const [d, list] of byDir) {
    const h = document.createElement('div');
    h.className = 'd'; h.textContent = d + '  (' + list.length + ')';
    el.appendChild(h);
    for (const f of list) {
      const a = document.createElement('a');
      a.className = extOf(f.path) === 'mjs' ? 'gen' : '';
      a.dataset.p = f.path;
      a.innerHTML = '<span>' + esc(f.path.split('/').pop()) + '</span><u>' +
        (f.size > 9999 ? Math.round(f.size / 1024) + 'k' : f.size) + '</u>';
      a.onclick = () => openFile(f.path);
      el.appendChild(a);
    }
  }
  $('#f-n').textContent = FILES.filter((f) => !f.dir).length;
}

/* ══ open, save, run ═══════════════════════════════════════════════════ */
async function openFile(p) {
  if (!open.has(p)) {
    const r = await fetch('/api/read?f=' + encodeURIComponent(p));
    const j = await r.json();
    if (!r.ok) { say(j.error, 'bad'); return; }
    open.set(p, { body: j.body, disk: j.body });
  }
  cur = p;
  $('#ed').value = open.get(p).body;
  paintTabs(); paintEditor(); marks();
  $('#ed').focus();
}

function paintTabs() {
  const t = $('#tabs'); t.innerHTML = '';
  for (const [p, f] of open) {
    const d = document.createElement('div');
    d.className = p === cur ? 'on' : '';
    d.innerHTML = (f.body !== f.disk ? '<i>&bull;</i>' : '') +
      '<span>' + esc(p.split('/').pop()) + '</span><b>&times;</b>';
    d.onclick = (e) => {
      if (e.target.tagName === 'B') {
        open.delete(p);
        if (cur === p) { cur = open.keys().next().value || null;
          $('#ed').value = cur ? open.get(cur).body : ''; }
        paintTabs(); paintEditor(); marks();
      } else openFile(p);
    };
    t.appendChild(d);
  }
  document.querySelectorAll('#tree a').forEach((a) =>
    a.classList.toggle('on', a.dataset.p === cur));
}

function marks() {
  const f = cur && open.get(cur);
  const dirty = [...open.values()].filter((x) => x.body !== x.disk).length;
  $('#where').innerHTML = cur
    ? '<b>' + esc(cur) + '</b>' + (f.body !== f.disk ? ' <i>&bull; unsaved</i>' : '')
    : 'nothing open';
  $('#save').disabled = !f || f.body === f.disk;
  $('#run').disabled = !cur || extOf(cur) !== 'mjs';
  $('#open').disabled = !cur || !/\\.(html|mjs)$/.test(cur);
  $('#f-open').textContent = open.size;
  $('#f-dirty').innerHTML = dirty ? 'unsaved <b>' + dirty + '</b>' : '';
}

function say(text, cls) {
  const o = $('#out'); o.className = cls || ''; o.textContent = text;
}

async function save() {
  const f = cur && open.get(cur);
  if (!f || f.body === f.disk) return;
  const r = await fetch('/api/save', { method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ path: cur, body: f.body }) });
  const j = await r.json();
  if (!r.ok) return say('not saved: ' + j.error, 'bad');
  f.disk = f.body;
  paintTabs(); marks(); loadTree();
  say('saved ' + j.path + '  (' + j.bytes.toLocaleString() + ' bytes)', 'ok');
}

async function runIt() {
  if (!cur || extOf(cur) !== 'mjs') return;
  const f = open.get(cur);
  if (f && f.body !== f.disk) await save();
  say('running ' + cur + ' ...');
  const r = await fetch('/api/run', { method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ path: cur }) });
  const j = await r.json();
  say(j.out, j.ok ? 'ok' : 'bad');
  loadTree();
}

$('#save').onclick = save;
$('#run').onclick = runIt;
$('#open').onclick = () => {
  if (!cur) return;
  const board = cur.endsWith('.mjs') ? cur.replace(/\\.mjs$/, '.html') : cur;
  window.open('/' + board, '_blank');
};

$('#ed').addEventListener('input', (e) => {
  const f = open.get(cur);
  if (!f) return;
  f.body = e.target.value;
  paintEditor(); paintTabs(); marks();
});
$('#ed').addEventListener('scroll', () => {
  $('#hl').style.transform = 'translate(' + (-$('#ed').scrollLeft) + 'px,' +
    (-$('#ed').scrollTop) + 'px)';
}, { passive: true });
$('#wrap').addEventListener('scroll', () => {
  $('#hl').style.transform = 'translateY(' + (-$('#wrap').scrollTop) + 'px)';
}, { passive: true });
$('#ed').addEventListener('keydown', (e) => {
  if (e.key === 'Tab' && !e.ctrlKey && !e.metaKey) {
    e.preventDefault();
    const el = e.target, a = el.selectionStart, b = el.selectionEnd;
    el.value = el.value.slice(0, a) + '  ' + el.value.slice(b);
    el.selectionStart = el.selectionEnd = a + 2;
    el.dispatchEvent(new Event('input'));
  }
});
addEventListener('keydown', (e) => {
  if (!(e.ctrlKey || e.metaKey)) return;
  const k = e.key.toLowerCase();
  if (k === 's') { e.preventDefault(); save(); }
  if (k === 'r') { e.preventDefault(); runIt(); }
});

loadTree().then(() => {
  say('The tree is the yard. Open a generator and press run — it executes ' +
      'here, in this folder, and prints what it printed. Nothing is written ' +
      'until you save.');
}).catch(() => {
  say('No file API. This board needs venus-app.mjs — a plain static server ' +
      'has no tree, read, save or run.\\n\\nStart it with:  node venus-app.mjs', 'bad');
});
<\/script>\n</body>\n</html>\n`;

writeFileSync('explorer.html', html);
console.log('explorer.html · tree, editor, run');
console.log('  needs venus-app.mjs for /api/tree, /api/read, /api/save, /api/run');
console.log('  ctrl+S saves, ctrl+R runs a generator and prints what it said');
console.log('  nothing autosaves — a dot on the tab is the whole ceremony');

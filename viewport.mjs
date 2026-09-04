#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   viewport.mjs — builds viewport.html: a tab that goes anywhere, and is
   honest about which half of that is true.

   THE BOUNDARY, STATED FIRST, because it decides the whole design.

   A frame cannot be read across origins. That is the same-origin policy —
   the thing standing between any web page and your bank — and it is not
   something a page can engineer around. Most sites additionally refuse to be
   framed at all, through X-Frame-Options or a CSP frame-ancestors directive,
   and a viewport that does not say so just shows you a blank rectangle and
   lets you assume it is broken.

   So the capability is split in two and both halves are real:

     THE FRAME renders what consents to render. For this yard's own boards —
     same origin — that includes full two-way messaging: a board can post to
     the viewport and the viewport writes it to notes/signals.log, on disk,
     which is the direct line to the applet that was asked for.

     THE PROBE goes anywhere. The server fetches the URL and reports status,
     title, content type, size, and whether the page allows framing and which
     header refuses. No rendering, real data, any origin.

   Between them: render what will render, read what will not, and keep a
   written record of whatever either one said.

       node viewport.mjs        (needs venus-app.mjs — a static server has
                                 neither probe nor signal)
   ═══════════════════════════════════════════════════════════════════════════ */
import { writeFileSync, readdirSync } from 'node:fs';

/* the yard's own boards, which are the ones that can actually talk back */
const mine = readdirSync('.').filter((f) => f.endsWith('.html')).sort();

const html = '<!doctype html>\n<html lang="en">\n<head>\n' +
'<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n' +
'<title>The viewport &middot; a tab, and what it can honestly tell you</title>\n' +
'<!-- Needs venus-app.mjs. A static server has no probe and no signal log. -->\n' +
'<style>\n' +
`  :root{
    --bg:#0a0d11; --panel:#0f151b; --edge:#1c2530; --edge2:#2a3745;
    --ink:#dce3ea; --dim:#8792a0; --faint:#57616d;
    --gold:#c9a227; --moss:#7d9d6a; --rust:#c4674f; --cool:#5f92a8;
    --mono:ui-monospace,"Cascadia Mono",Consolas,"SF Mono",Menlo,monospace;
    --serif:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;
  }
  *{box-sizing:border-box}
  html,body{height:100%}
  body{margin:0;background:var(--bg);color:var(--ink);overflow:hidden;
    font:13px/1.5 var(--mono);display:grid;grid-template-rows:auto auto minmax(0,1fr);
    height:100vh}

  header{display:flex;align-items:center;gap:10px;padding:9px 13px;
    background:var(--panel);border-bottom:1px solid var(--edge);flex-wrap:wrap}
  header h1{margin:0;font:500 15px/1.2 var(--serif);letter-spacing:.03em;flex:none}
  header h1 s{text-decoration:none;display:block;color:var(--gold);
    font:400 7.5px/1 var(--mono);letter-spacing:.24em;text-transform:uppercase;margin-top:3px}
  #url{flex:1;min-width:220px;background:#080c10;border:1px solid var(--edge2);
    color:var(--ink);padding:9px 11px;font:400 12px/1.3 var(--mono);outline:none}
  #url:focus{border-color:var(--gold)}
  header button{background:#161d25;border:1px solid var(--edge2);color:var(--ink);
    padding:9px 14px;cursor:pointer;font:400 10px/1 var(--mono);letter-spacing:.09em}
  header button:hover{border-color:var(--gold);color:var(--gold)}
  header button.p:hover{border-color:var(--cool);color:var(--cool)}

  #quick{display:flex;gap:6px;padding:7px 13px;background:#0c1116;
    border-bottom:1px solid var(--edge);overflow-x:auto}
  #quick button{background:none;border:1px solid var(--edge);color:var(--faint);
    padding:5px 10px;cursor:pointer;font:400 10px/1 var(--mono);white-space:nowrap}
  #quick button:hover{color:var(--ink);border-color:var(--edge2)}

  main{display:grid;grid-template-columns:minmax(0,1fr) 340px;min-height:0}
  @media (max-width:980px){ main{grid-template-columns:1fr} #side{display:none} }
  #stage{position:relative;background:#05080b;min-height:0}
  iframe{width:100%;height:100%;border:0;display:block;background:#fff}
  #veil{position:absolute;inset:0;display:none;align-items:center;
    justify-content:center;padding:40px;background:#0a0d11}
  #veil.on{display:flex}
  #veil div{max-width:52ch}
  #veil h3{margin:0 0 10px;font:500 20px/1.3 var(--serif);color:var(--rust)}
  #veil p{margin:0 0 11px;font:400 12.5px/1.7 var(--serif);color:var(--dim)}
  #veil code{color:var(--gold);font:400 11px/1.5 var(--mono)}

  #side{background:var(--panel);border-left:1px solid var(--edge);
    display:flex;flex-direction:column;min-height:0}
  #side h4{margin:0;padding:11px 13px;border-bottom:1px solid var(--edge);
    font:400 8.5px/1 var(--mono);letter-spacing:.2em;text-transform:uppercase;
    color:var(--gold)}
  #probe{padding:12px 13px;border-bottom:1px solid var(--edge);
    font:400 11px/1.7 var(--mono);color:var(--dim)}
  #probe b{color:var(--ink);font-weight:400}
  #probe .yes{color:var(--moss)} #probe .no{color:var(--rust)}
  #log{flex:1;overflow-y:auto;padding:10px 13px;
    font:400 10.5px/1.6 var(--mono);color:var(--faint)}
  #log div{padding:5px 0;border-bottom:1px dotted #1a222b;word-break:break-word}
  #log b{color:var(--cool);font-weight:400}
  #log i{font-style:normal;color:var(--faint)}
  #log .w{color:var(--moss)}
  #side footer{padding:9px 13px;border-top:1px solid var(--edge);
    font:400 9.5px/1.6 var(--mono);color:var(--faint)}
  #side footer a{color:var(--gold);text-decoration:none}
</style>\n</head>\n<body>\n` +

'<header>\n' +
'  <h1>The viewport<s>a tab, honestly</s></h1>\n' +
'  <input id="url" value="/hall.html" spellcheck="false" autocomplete="off">\n' +
'  <button id="go">frame it</button>\n' +
'  <button id="pr" class="p">probe it</button>\n' +
'</header>\n' +
'<div id="quick"></div>\n' +
'<main>\n' +
'  <div id="stage">\n' +
'    <iframe id="f" src="/hall.html"></iframe>\n' +
'    <div id="veil"><div>\n' +
'      <h3>It will not be framed</h3>\n' +
'      <p id="why"></p>\n' +
'      <p>This is the page refusing, not the viewport failing. A site that ' +
'sends <code>X-Frame-Options</code> or a CSP <code>frame-ancestors</code> ' +
'directive is telling every browser not to embed it, and browsers obey.</p>\n' +
'      <p>The probe still works on it. The server can fetch anything and tell ' +
'you what came back &mdash; it just cannot draw it.</p>\n' +
'    </div></div>\n' +
'  </div>\n' +
'  <aside id="side">\n' +
'    <h4>what the probe found</h4>\n' +
'    <div id="probe">Nothing probed yet.</div>\n' +
'    <h4>signals</h4>\n' +
'    <div id="log"></div>\n' +
'    <footer>Same-origin frames can post to this page and every message is ' +
'appended to <a href="/notes/signals.log">notes/signals.log</a>. Cross-origin ' +
'frames cannot say anything at all &mdash; that is the same-origin policy and ' +
'not a setting.</footer>\n' +
'  </aside>\n' +
'</main>\n\n' +

'<script>\n' +
'const MINE = ' + JSON.stringify(mine.slice(0, 14)) + ';\n' +
`
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

$('#quick').innerHTML = MINE.map((f) =>
  '<button data-u="/' + f + '">' + esc(f.replace('.html', '')) + '</button>').join('') +
  '<button data-u="https://example.com">example.com</button>' +
  '<button data-u="https://en.wikipedia.org/wiki/Venus">wikipedia</button>';
$('#quick').onclick = (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  $('#url').value = b.dataset.u;
  frameIt();
};

function say(kind, text, cls) {
  const d = document.createElement('div');
  d.innerHTML = '<b>' + esc(kind) + '</b> <i>' +
    new Date().toLocaleTimeString() + '</i><br>' +
    '<span class="' + (cls || '') + '">' + esc(text) + '</span>';
  $('#log').prepend(d);
}

/* ── framing ─────────────────────────────────────────────────────────── */
function frameIt() {
  const u = $('#url').value.trim();
  if (!u) return;
  $('#veil').classList.remove('on');
  $('#f').src = u;
  say('frame', u);
  /* a cross-origin refusal is silent — the load event fires either way and
     you cannot inspect the document — so probe alongside and let the probe
     tell you what the frame cannot. */
  if (/^https?:/i.test(u)) probeIt(true);
}

/* ── probing, which can go anywhere ──────────────────────────────────── */
async function probeIt(quiet) {
  let u = $('#url').value.trim();
  if (!/^https?:/i.test(u)) u = location.origin + (u.startsWith('/') ? u : '/' + u);
  $('#probe').textContent = 'fetching ' + u + ' ...';
  try {
    const r = await fetch('/api/probe?u=' + encodeURIComponent(u));
    const j = await r.json();
    if (!j.ok) {
      $('#probe').innerHTML = '<span class="no">could not reach it</span><br>' + esc(j.error);
      if (!quiet) say('probe', j.error, 'no');
      return;
    }
    $('#probe').innerHTML =
      '<b>' + j.status + '</b> ' + esc(j.title || '(no title)') + '<br>' +
      esc(j.type.split(';')[0]) + ' &middot; ' + j.bytes.toLocaleString() + ' bytes<br>' +
      (j.framable
        ? '<span class="yes">it allows framing</span>'
        : '<span class="no">it refuses framing</span><br>' + esc(j.refusedBy || ''));
    if (!j.framable) {
      $('#why').textContent = j.refusedBy || 'the page sends a header forbidding it';
      $('#veil').classList.add('on');
    }
    say('probe', j.status + ' ' + (j.title || u), j.framable ? '' : 'no');
  } catch (e) {
    $('#probe').innerHTML = '<span class="no">no probe API</span><br>' +
      'This board needs venus-app.mjs running.';
  }
}

$('#go').onclick = frameIt;
$('#pr').onclick = () => probeIt(false);
$('#url').addEventListener('keydown', (e) => { if (e.key === 'Enter') frameIt(); });

/* ── the messaging, which only same-origin frames can do ────────────── */
addEventListener('message', async (e) => {
  if (e.origin !== location.origin) {
    say('rejected', 'a message from ' + e.origin + ' — not this origin, ignored', 'no');
    return;
  }
  const d = e.data || {};
  say(String(d.kind || 'message'), JSON.stringify(d.data).slice(0, 220), 'w');
  try {
    await fetch('/api/signal', { method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ from: $('#url').value, kind: d.kind, data: d.data }) });
  } catch (err) { say('not written', err.message, 'no'); }
});

say('ready', 'Frame what will be framed. Probe what will not. Same-origin ' +
    'boards can post to this page and everything they say is written to ' +
    'notes/signals.log.');
probeIt(true);
<\/script>\n</body>\n</html>\n`;

writeFileSync('viewport.html', html);
console.log('viewport.html');
console.log('  the frame renders what consents to render');
console.log('  the probe goes anywhere and reports what came back');
console.log('  same-origin frames can postMessage; every one is appended to notes/signals.log');
console.log('  cross-origin frames cannot speak at all — same-origin policy, not a setting');
console.log('  ' + mine.length + ' boards in the yard, ' + Math.min(14, mine.length) +
  ' on the quick bar');

#!/usr/bin/env node
/* dispatch.mjs — the syndication, sealed with your own words.

   A dispatch is one piece of the story: what was asked, what was built, what
   was left out, where it lives. Each is sealed with a key derived from the
   input that asked for it (lower-cased, spaces collapsed), so the reader
   opens only the pieces they choose to read by typing their own words back,
   and every piece is on the shelf whether or not it is opened. Nothing is
   hidden from you; it is filed.

   PBKDF2-SHA256, 200,000 rounds, AES-256-GCM, a salt and a nonce per
   dispatch. Sealed here with Node's crypto; opened in the page with
   WebCrypto, which speaks the same two algorithms.

     node dispatch.mjs seal "<your words>" "<title>" <file.md> [tag,tag]
     node dispatch.mjs open "<your words>"            prints every dispatch those words open
     node dispatch.mjs build                            writes dispatch.html with the shelf inlined
     node dispatch.mjs list                             the shelf, unsealed parts only */
import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
import { pbkdf2Sync, randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';

const FILE = 'dispatches.jsonl', ROUNDS = 200000;
const norm = s => String(s).toLowerCase().replace(/\s+/g, ' ').trim();
const key = (phrase, salt) => pbkdf2Sync(norm(phrase), salt, ROUNDS, 32, 'sha256');
const shelf = () => existsSync(FILE) ? readFileSync(FILE, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)) : [];
export function seal(phrase, title, text, tags = []) {
  const salt = randomBytes(16), iv = randomBytes(12), k = key(phrase, salt); const c = createCipheriv('aes-256-gcm', k, iv);
  const ct = Buffer.concat([c.update(text, 'utf8'), c.final(), c.getAuthTag()]);
  const words = norm(phrase).split(' '); const d = { id: 'd' + (shelf().length + 1).toString().padStart(2, '0'), t: new Date().toISOString(), title, tags, hint: words.slice(0, 2).join(' ') + (words.length > 2 ? ' …' : ''), words: words.length, chars: text.length, rounds: ROUNDS, salt: salt.toString('base64'), iv: iv.toString('base64'), ct: ct.toString('base64') };
  appendFileSync(FILE, JSON.stringify(d) + '\n'); return d;
}
export function open(phrase, d) {
  try { const k = key(phrase, Buffer.from(d.salt, 'base64')); const ct = Buffer.from(d.ct, 'base64'); const dc = createDecipheriv('aes-256-gcm', k, Buffer.from(d.iv, 'base64')); dc.setAuthTag(ct.subarray(ct.length - 16)); return Buffer.concat([dc.update(ct.subarray(0, ct.length - 16)), dc.final()]).toString('utf8'); } catch (e) { return null; }
}
export function build() {
  const entries = shelf();
  const html = `<title>Dispatches &middot; the story, sealed with your words</title>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<!--
  DISPATCHES — the syndication. ${entries.length} pieces of the story, each sealed with the words
  that asked for it. Type your words and whatever they open, opens; the rest stays on the
  shelf, titled and dated, so you can see the whole story's shape without reading all of it.
  Mark what you have read and what you have answered; those marks live in this browser only.
  Built by dispatch.mjs; opened with WebCrypto in this page. SCRIPT: yes, and marked.
-->
<style>
  :root{--void:#0b0d12;--panel:#151922;--panel2:#1c2230;--edge:#2b3445;--ink:#efe9dc;--dim:#95a0b3;--gold:#f2c98a;--ok:#6fd4a8;--bad:#e06f5a;--sea:#3f8fbf;--serif:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif}
  *{box-sizing:border-box}html,body{margin:0;background:var(--void);color:var(--ink);font:14px/1.6 ui-rounded,system-ui,-apple-system,sans-serif}
  header{padding:22px 24px 8px;max-width:920px;margin:0 auto}header h1{margin:0;font:500 30px/1.1 var(--serif);color:var(--gold)}header p{margin:6px 0 0;color:var(--dim)}
  main{padding:10px 24px 40px;max-width:920px;margin:0 auto;display:grid;gap:12px}
  .keys{background:var(--panel);border:1px solid var(--edge);border-radius:14px;padding:14px;display:grid;gap:8px}
  textarea{width:100%;min-height:70px;font:inherit;color:var(--ink);background:var(--panel2);border:1px solid var(--edge);border-radius:10px;padding:8px 10px;resize:vertical}textarea:focus{outline:none;border-color:var(--sea)}
  button{font:inherit;color:var(--ink);background:var(--panel2);border:1px solid var(--edge);border-radius:9px;padding:6px 12px;cursor:pointer}button:hover{border-color:var(--gold)}button.primary{background:#2a2036;border-color:var(--gold)}
  .row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.badge{display:inline-block;background:var(--panel);border:1px solid var(--edge);border-radius:999px;padding:2px 9px;font-size:11px;color:var(--dim)}.badge.ok{border-color:var(--ok);color:var(--ok)}.badge.hot{border-color:var(--gold);color:var(--gold)}
  article{background:var(--panel);border:1px solid var(--edge);border-radius:14px;padding:14px;transition:border-color .2s}article.open{border-color:var(--gold)}article.read{opacity:.85}
  article h2{margin:0;font:500 19px/1.25 var(--serif);display:flex;justify-content:space-between;gap:10px;align-items:baseline}article h2 small{font:400 11.5px ui-rounded,system-ui,sans-serif;color:var(--dim);white-space:nowrap}
  .meta{color:var(--dim);font-size:12px;margin:4px 0 0}
  .body{margin-top:10px;border-top:1px solid var(--edge);padding-top:10px}.body h3{margin:12px 0 4px;font:500 15px/1.3 var(--serif);color:var(--gold)}.body p{margin:6px 0}.body ul{margin:4px 0 8px 18px;padding:0}.body li{margin:2px 0}.body code{font-family:ui-monospace,Consolas,monospace;font-size:12.5px;color:var(--sea)}
  .marks{margin-top:10px}.marks button.on{border-color:var(--ok);color:var(--ok)}
  footer{padding:10px 24px 28px;color:var(--dim);font-size:12px;max-width:920px;margin:0 auto}footer a{color:var(--sea);text-decoration:none}
</style>
<header><h1>Dispatches</h1><p>The story of this yard, in ${entries.length} pieces, each sealed with the words that asked for it. Type any of your words below; what they open, opens. The rest stays on the shelf so the shape of the whole is always in view.</p></header>
<main>
  <div class="keys"><textarea id="words" placeholder="Your words, one request per line. The two-word hint on each dispatch is where to start."></textarea><div class="row"><button class="primary" id="try">Open what these words open</button><span class="badge" id="count"></span><span class="badge" id="marks"></span></div></div>
  <div id="shelf"></div>
</main>
<footer>Sealed by <code>dispatch.mjs</code> with PBKDF2-SHA256 (200,000 rounds) and AES-256-GCM, a salt and a nonce each; opened here with WebCrypto. Marks (read, answered) are kept in this browser only. <a href="index.html">the yard</a></footer>
<script id="shelf-json" type="application/json">${JSON.stringify(entries).replace(/<\//g, '<\\/')}</script>
<script>
(function () {
  const E = JSON.parse(document.getElementById('shelf-json').textContent); const $ = s => document.querySelector(s);
  const norm = s => String(s).toLowerCase().replace(/\\s+/g, ' ').trim(); const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const marks = (() => { try { return JSON.parse(localStorage.getItem('dispatch.marks') || '{}'); } catch (e) { return {}; } })(); const saveMarks = () => localStorage.setItem('dispatch.marks', JSON.stringify(marks));
  const opened = {};
  async function open(phrase, d) { try { const km = await crypto.subtle.importKey('raw', new TextEncoder().encode(norm(phrase)), 'PBKDF2', false, ['deriveKey']); const k = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: b64(d.salt), iterations: d.rounds, hash: 'SHA-256' }, km, { name: 'AES-GCM', length: 256 }, false, ['decrypt']); const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(d.iv) }, k, b64(d.ct)); return new TextDecoder().decode(pt); } catch (e) { return null; } }
  const md = t => t.replace(/\\r\\n?/g, '\\n').split(/\\n{2,}/).map(b => b.startsWith('## ') ? (() => { const i = b.indexOf('\\n'); const h = i < 0 ? b : b.slice(0, i), rest = i < 0 ? '' : b.slice(i + 1); return '<h3>' + esc(h.slice(3)) + '</h3>' + (rest ? (rest.startsWith('- ') ? '<ul>' + rest.split('\\n').map(l => '<li>' + inline(esc(l.replace(/^- /, ''))) + '</li>').join('') + '</ul>' : '<p>' + inline(esc(rest)) + '</p>') : ''); })() : b.startsWith('- ') ? '<ul>' + b.split('\\n').map(l => '<li>' + inline(esc(l.replace(/^- /, ''))) + '</li>').join('') + '</ul>' : '<p>' + inline(esc(b)) + '</p>').join('');
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;'); const inline = s => s.replace(/\`([^\`]+)\`/g, '<code>$1</code>').replace(/\\*\\*([^*]+)\\*\\*/g, '<b>$1</b>');
  function render() { const shelf = $('#shelf'); shelf.innerHTML = ''; let n = 0, r = 0, a = 0;
    for (const d of E) { const m = marks[d.id] || {}; if (opened[d.id]) n++; if (m.read) r++; if (m.answered) a++;
      const art = document.createElement('article'); art.className = (opened[d.id] ? 'open' : '') + (m.read ? ' read' : '');
      art.innerHTML = '<h2>' + esc(d.title) + '<small>' + d.t.slice(0, 10) + '</small></h2><p class="meta">sealed with your words: <b>' + esc(d.hint) + '</b> (' + d.words + ' words) · ' + d.chars.toLocaleString() + ' characters · ' + (d.tags || []).join(', ') + (opened[d.id] ? ' · <span class="badge ok">open</span>' : ' · <span class="badge">sealed</span>') + '</p>';
      if (opened[d.id]) { const body = document.createElement('div'); body.className = 'body'; body.innerHTML = md(opened[d.id]); art.append(body);
        const mk = document.createElement('div'); mk.className = 'marks row'; for (const [k, label] of [['read', 'I have read this'], ['answered', 'I have answered this']]) { const b = document.createElement('button'); b.textContent = label; b.className = m[k] ? 'on' : ''; b.onclick = () => { marks[d.id] = { ...(marks[d.id] || {}), [k]: !m[k] }; saveMarks(); render(); }; mk.append(b); } art.append(mk); }
      shelf.append(art); }
    $('#count').textContent = n + ' of ' + E.length + ' open'; $('#marks').textContent = r + ' read · ' + a + ' answered'; }
  $('#try').onclick = async () => { const phrases = $('#words').value.split('\\n').map(norm).filter(Boolean); $('#try').disabled = true; $('#try').textContent = 'opening…'; for (const d of E) { if (opened[d.id]) continue; for (const p of phrases) { const t = await open(p, d); if (t) { opened[d.id] = t; break; } } } $('#try').disabled = false; $('#try').textContent = 'Open what these words open'; render(); };
  render();
})();
</script>
`;
  writeFileSync('dispatch.html', html); return entries.length;
}
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  const [, , cmd, ...a] = process.argv;
  if (cmd === 'seal') { const d = seal(a[0], a[1], readFileSync(a[2], 'utf8'), (a[3] || '').split(',').filter(Boolean)); console.log(`sealed ${d.id} "${d.title}" with ${d.words} words · ${d.chars} chars`); }
  else if (cmd === 'open') { for (const d of shelf()) { const t = open(a[0], d); if (t) console.log(`\n=== ${d.id} ${d.title}\n${t}`); } }
  else if (cmd === 'build') console.log(`dispatch.html · ${build()} dispatches on the shelf`);
  else if (cmd === 'list') for (const d of shelf()) console.log(`${d.id}  ${d.t.slice(0, 10)}  ${d.title}  · hint "${d.hint}" · ${d.chars} chars`);
  else console.log('seal | open | build | list');
}

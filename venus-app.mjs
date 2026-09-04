#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   venus-app.mjs — the yard as a desktop app. No dependencies, no build step.

   Three things a static server does not do, which are the three things that
   were asked for:

     PLAY IT      serves every board, and injects one small script into every
                  HTML response so the dock below appears on all 151 without
                  a single page being edited
     SAVE NOTES   POST /api/note writes a real markdown file into notes/ —
                  on disk, not in localStorage, so it survives the browser
     FEEDBACK     POST /api/feedback writes into feedback/ with the board it
                  came from and when

   ── about taking me with you ────────────────────────────────────────────
   I cannot run inside this app and it would be a lie to build something that
   implied otherwise. What is true, and is the reason the two folders exist as
   FILES rather than as browser storage: notes/ and feedback/ are in the
   repository. Anything written there is something I read at the start of the
   next session, in full, without you having to retype it. That is a real
   channel and it is the only honest version of the request — asynchronous,
   one direction at a time, and it works.

   The dock says exactly that, on the page, rather than leaving you to assume
   something warmer.

       node venus-app.mjs            then open http://localhost:8777
       Venus.cmd                     does both, full screen, no browser chrome
   ═══════════════════════════════════════════════════════════════════════════ */
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { readFile, writeFile, appendFile, mkdir, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize, sep } from 'node:path';

const PORT = Number(process.env.PORT || 8777);
const ROOT = process.cwd();
const NOTES = join(ROOT, 'notes');
const FEEDBACK = join(ROOT, 'feedback');

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/plain; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.md': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8'
};

const stamp = () => new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const slug = (s) => (s || 'note').toLowerCase().replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '').slice(0, 48) || 'note';

/* ── the dock, injected into every page ───────────────────────────────── */
const DOCK = `
/* Venus dock — injected by venus-app.mjs into every HTML response, so all
   151 boards get it without any of them being edited. */
(function () {
  if (window.__venusDock) return;
  window.__venusDock = 1;

  const css = document.createElement('style');
  css.textContent = [
    '#vdock{position:fixed;right:14px;bottom:14px;z-index:2147483000;',
    '  font:400 11px/1.4 ui-monospace,Consolas,monospace;display:flex;gap:6px}',
    '#vdock button{background:#12171d;color:#c9a227;border:1px solid #2a3541;',
    '  padding:8px 12px;cursor:pointer;font:inherit;letter-spacing:.09em;',
    '  border-radius:2px;opacity:.55;transition:opacity .15s}',
    '#vdock button:hover{opacity:1;border-color:#c9a227}',
    '#vpad{position:fixed;right:14px;bottom:56px;z-index:2147483000;width:min(420px,92vw);',
    '  background:#0d1218;border:1px solid #2a3541;display:none;',
    '  box-shadow:0 20px 50px -12px rgba(0,0,0,.85)}',
    '#vpad.on{display:block}',
    '#vpad h4{margin:0;padding:11px 13px;border-bottom:1px solid #1e2731;',
    '  font:400 8.5px/1 ui-monospace,monospace;letter-spacing:.2em;',
    '  text-transform:uppercase;color:#c9a227}',
    '#vpad .why{margin:0;padding:10px 13px;font:400 10.5px/1.6 ui-monospace,monospace;',
    '  color:#6b7683;border-bottom:1px solid #1e2731}',
    '#vpad input,#vpad textarea{width:100%;background:#080c10;border:1px solid #1e2731;',
    '  color:#dfe4ea;padding:9px 10px;font:inherit;outline:none;display:block}',
    '#vpad input{border-width:0 0 1px 0}',
    '#vpad textarea{height:150px;resize:vertical;border-width:0}',
    '#vpad .go{display:flex;gap:8px;padding:10px 13px;border-top:1px solid #1e2731;',
    '  align-items:center}',
    '#vpad .go button{flex:none;background:#1a222b;color:#dfe4ea;border:1px solid #2a3541;',
    '  padding:8px 16px;cursor:pointer;font:inherit}',
    '#vpad .go button:hover{border-color:#c9a227;color:#c9a227}',
    '#vpad .go span{flex:1;color:#6b7683;font-size:10px}',
    '#vpad .go span b{color:#7d9d6a;font-weight:400}',
    '#vpad .go span i{color:#c4674f;font-style:normal}'
  ].join('');
  document.head.appendChild(css);

  const dock = document.createElement('div');
  dock.id = 'vdock';
  /* the notebook is already the IDE — code forms, line numbers, syntax
     highlighting and a console that evaluates what you write. It does not
     need building again, it needs reaching from wherever you are. */
  dock.innerHTML = '<button data-k="board">board</button>' +
                   '<button data-k="view">view</button>' +
                   '<button data-k="files">files</button>' +
                   '<button data-k="ide">ide</button>' +
                   '<button data-k="note">note</button>' +
                   '<button data-k="feedback">feedback</button>';
  const pad = document.createElement('div');
  pad.id = 'vpad';
  pad.innerHTML =
    '<h4 id="vh"></h4>' +
    '<p class="why" id="vwhy"></p>' +
    '<input id="vt" placeholder="a title, or leave it" autocomplete="off">' +
    '<textarea id="vb" placeholder="..."></textarea>' +
    '<div class="go"><button id="vs">save to disk</button>' +
    '<span id="vm"></span></div>';
  document.body.appendChild(dock);
  document.body.appendChild(pad);

  let kind = 'note';
  const WHY = {
    note: 'Writes a markdown file into notes/ in the repository. Not browser ' +
          'storage — a file, which survives everything and which Claude reads ' +
          'at the start of the next session without you retyping it.',
    feedback: 'Writes into feedback/ with the board you were on and the time. ' +
          'Same channel: it is a file in the repo, so it is read next session. ' +
          'Nothing here reaches anybody in real time.'
  };
  function open(k) {
    kind = k;
    document.getElementById('vh').textContent = k === 'note' ? 'a note' : 'feedback';
    document.getElementById('vwhy').textContent = WHY[k];
    document.getElementById('vm').textContent = '';
    pad.classList.add('on');
    document.getElementById('vb').focus();
  }
  dock.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.k === 'ide') { location.href = '/writing.html'; return; }
    if (b.dataset.k === 'files') { location.href = '/explorer.html'; return; }
    if (b.dataset.k === 'view') { location.href = '/viewport.html'; return; }
    if (b.dataset.k === 'board') { location.href = '/whiteboard.html'; return; }
    if (pad.classList.contains('on') && b.dataset.k === kind) pad.classList.remove('on');
    else open(b.dataset.k);
  });

  async function save() {
    const body = document.getElementById('vb').value.trim();
    const msg = document.getElementById('vm');
    if (!body) { msg.innerHTML = '<i>nothing to save</i>'; return; }
    msg.textContent = 'writing...';
    try {
      const r = await fetch('/api/' + kind, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: document.getElementById('vt').value,
          body: body,
          page: location.pathname.replace(/^\\//, '') || 'index',
          pageTitle: document.title
        })
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || r.status);
      msg.innerHTML = 'saved to <b>' + j.file + '</b>';
      document.getElementById('vb').value = '';
      document.getElementById('vt').value = '';
    } catch (err) {
      msg.innerHTML = '<i>not saved: ' + err.message + '</i>';
    }
  }
  document.getElementById('vs').addEventListener('click', save);
  document.getElementById('vb').addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') save();
  });
  addEventListener('keydown', (e) => {
    if (!(e.ctrlKey && e.shiftKey)) return;
    const k = e.key.toLowerCase();
    if (k === 'n') { e.preventDefault(); open('note'); }
    if (k === 'f') { e.preventDefault(); open('feedback'); }
    if (k === 'i') { e.preventDefault(); location.href = '/writing.html'; }
    if (k === 'e') { e.preventDefault(); location.href = '/explorer.html'; }
    if (k === 'v') { e.preventDefault(); location.href = '/viewport.html'; }
    if (k === 'b') { e.preventDefault(); location.href = '/whiteboard.html'; }
    if (e.key === 'Escape') pad.classList.remove('on');
  });
})();
`;

/* ── writing what comes in ────────────────────────────────────────────── */
async function collect(req) {
  const chunks = [];
  for await (const c of req) {
    chunks.push(c);
    if (chunks.reduce((a, b) => a + b.length, 0) > 512 * 1024)
      throw new Error('too long');
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

async function saveNote(kind, d) {
  const dir = kind === 'feedback' ? FEEDBACK : NOTES;
  await mkdir(dir, { recursive: true });
  const name = stamp() + '-' + slug(d.title || d.page) + '.md';
  const head = [
    '# ' + (d.title || (kind === 'feedback' ? 'Feedback' : 'Note')),
    '',
    '- when: ' + new Date().toISOString(),
    '- board: ' + (d.page || '?') + (d.pageTitle ? '  (' + d.pageTitle + ')' : ''),
    '- kind: ' + kind,
    '', '---', ''
  ].join('\n');
  await writeFile(join(dir, name), head + String(d.body || '').trim() + '\n', 'utf8');
  return (kind === 'feedback' ? 'feedback/' : 'notes/') + name;
}

/* ── what may be touched ──────────────────────────────────────────────
   One decision about what is inside the yard, used by every handler. A
   second way of answering that question is a second way of being wrong. */
const TEXTY = new Set(['.html', '.mjs', '.js', '.json', '.css', '.md', '.txt',
                       '.svg', '.cmd', '.py', '.scala', '.xml', '.yml', '.yaml']);
const HIDDEN = /(^|[\\/])(\.git|node_modules|\.worktrees)([\\/]|$)/;

function inside(rel) {
  const path = normalize(join(ROOT, rel));
  if (!path.startsWith(ROOT + sep) && path !== ROOT) return null;
  if (HIDDEN.test(path.slice(ROOT.length))) return null;
  return path;
}

/* the tree, one level of directories deep, text files only */
async function tree() {
  const out = [];
  async function walk(rel, depth) {
    const dir = inside(rel || '.');
    if (!dir) return;
    let names;
    try { names = await readdir(dir, { withFileTypes: true }); } catch (e) { return; }
    for (const d of names.sort((a, b) => a.name.localeCompare(b.name))) {
      const r = rel ? rel + '/' + d.name : d.name;
      if (HIDDEN.test(sep + r.split('/').join(sep))) continue;
      if (d.isDirectory()) {
        if (depth < 2) { out.push({ dir: true, path: r }); await walk(r, depth + 1); }
      } else if (TEXTY.has(extname(d.name).toLowerCase())) {
        let size = 0;
        try { size = (await stat(join(ROOT, r))).size; } catch (e) {}
        out.push({ dir: false, path: r, size });
      }
    }
  }
  await walk('', 0);
  return out;
}

/* run a generator and hand back everything it said */
function run(rel) {
  return new Promise((resolve) => {
    const path = inside(rel);
    if (!path || extname(path) !== '.mjs')
      return resolve({ ok: false, out: 'only a .mjs inside the yard can be run' });
    execFile(process.execPath, [path], { cwd: ROOT, timeout: 60000, maxBuffer: 4e6 },
      (err, stdout, stderr) => resolve({
        ok: !err,
        out: (stdout || '') + (stderr ? '\n' + stderr : '') ||
             (err ? String(err.message) : '(said nothing)')
      }));
  });
}

/* ── the server ───────────────────────────────────────────────────────── */
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const send = (code, type, body, extra) =>
    res.writeHead(code, Object.assign({ 'content-type': type }, extra || {})).end(body);

  try {
    if (url.pathname === '/_app.js')
      return send(200, TYPES['.js'], DOCK, { 'cache-control': 'no-cache' });

    if (req.method === 'POST' && /^\/api\/(note|feedback)$/.test(url.pathname)) {
      const kind = url.pathname.split('/').pop();
      const file = await saveNote(kind, await collect(req));
      console.log('  wrote ' + file);
      return send(200, TYPES['.json'], JSON.stringify({ ok: true, file }));
    }

    /* the server goes where a frame cannot. No rendering, but it can read
       any origin and, more usefully, say whether that origin will consent to
       being framed at all — which is the question the viewport actually
       needs answered. */
    if (url.pathname === '/api/probe') {
      const target = url.searchParams.get('u') || '';
      if (!/^https?:\/\//i.test(target))
        return send(400, TYPES['.json'], JSON.stringify({ error: 'needs http or https' }));
      try {
        const ctl = new AbortController();
        const timer = setTimeout(() => ctl.abort(), 12000);
        const r = await fetch(target, { redirect: 'follow', signal: ctl.signal,
          headers: { 'user-agent': 'venus-yard/1 (local viewport probe)' } });
        clearTimeout(timer);
        const body = await r.text();
        const h = (k) => r.headers.get(k) || '';
        const xfo = h('x-frame-options');
        const csp = h('content-security-policy');
        const anc = (csp.match(/frame-ancestors([^;]*)/i) || [])[1] || '';
        const framable = !xfo && !/frame-ancestors/i.test(csp);
        return send(200, TYPES['.json'], JSON.stringify({
          ok: true, status: r.status, url: r.url,
          title: ((body.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '')
            .replace(/\s+/g, ' ').trim().slice(0, 200),
          type: h('content-type'), bytes: body.length,
          framable,
          refusedBy: xfo ? 'X-Frame-Options: ' + xfo
            : anc ? 'CSP frame-ancestors:' + anc.trim() : null
        }));
      } catch (e) {
        return send(200, TYPES['.json'],
          JSON.stringify({ ok: false, error: e.name === 'AbortError'
            ? 'timed out after 12 s' : e.message }));
      }
    }

    /* what a framed board says to the applet, written down. Same-origin
       only, because that is the only case where a frame can speak at all. */
    if (req.method === 'POST' && url.pathname === '/api/signal') {
      const d = await collect(req);
      await mkdir(NOTES, { recursive: true });
      const file = join(NOTES, 'signals.log');
      const line = JSON.stringify({
        at: new Date().toISOString(),
        from: String(d.from || '?').slice(0, 300),
        kind: String(d.kind || 'message').slice(0, 60),
        data: d.data
      }) + '\n';
      await appendFile(file, line, 'utf8');
      console.log('  signal from ' + (d.from || '?') + ': ' + (d.kind || 'message'));
      return send(200, TYPES['.json'], JSON.stringify({ ok: true, file: 'notes/signals.log' }));
    }

    if (url.pathname === '/api/tree')
      return send(200, TYPES['.json'], JSON.stringify(await tree()));

    if (url.pathname === '/api/read') {
      const path = inside(url.searchParams.get('f') || '');
      if (!path || !existsSync(path)) return send(404, TYPES['.json'],
        JSON.stringify({ error: 'not in the yard' }));
      return send(200, TYPES['.json'], JSON.stringify({
        path: url.searchParams.get('f'),
        body: (await readFile(path)).toString('utf8')
      }));
    }

    if (req.method === 'POST' && url.pathname === '/api/save') {
      const d = await collect(req);
      const path = inside(d.path || '');
      if (!path) return send(403, TYPES['.json'],
        JSON.stringify({ error: 'outside the yard, or hidden' }));
      if (!TEXTY.has(extname(path).toLowerCase())) return send(403, TYPES['.json'],
        JSON.stringify({ error: 'not a text file this editor will write' }));
      await writeFile(path, String(d.body), 'utf8');
      console.log('  saved ' + d.path + '  (' + String(d.body).length + ' bytes)');
      return send(200, TYPES['.json'], JSON.stringify({ ok: true, path: d.path,
        bytes: String(d.body).length }));
    }

    if (req.method === 'POST' && url.pathname === '/api/run') {
      const d = await collect(req);
      console.log('  running ' + d.path);
      const r = await run(d.path || '');
      return send(200, TYPES['.json'], JSON.stringify(r));
    }

    if (url.pathname === '/api/notes') {
      const out = {};
      for (const [k, dir] of [['notes', NOTES], ['feedback', FEEDBACK]])
        out[k] = existsSync(dir) ? (await readdir(dir)).filter((f) => f.endsWith('.md')) : [];
      return send(200, TYPES['.json'], JSON.stringify(out));
    }

    /* static, and never above the yard */
    let rel = decodeURIComponent(url.pathname.replace(/^\//, '')) || 'arcade.html';
    const path = normalize(join(ROOT, rel));
    if (!path.startsWith(ROOT + sep) && path !== ROOT)
      return send(403, 'text/plain', 'no');
    if (!existsSync(path)) return send(404, 'text/plain', 'not here: ' + rel);

    const ext = extname(path).toLowerCase();
    let buf = await readFile(path);

    /* the injection: one line, before </body>, on every page in the yard */
    if (ext === '.html') {
      const s = buf.toString('utf8');
      buf = Buffer.from(s.includes('</body>')
        ? s.replace('</body>', '<script src="/_app.js"></script>\n</body>')
        : s + '<script src="/_app.js"></script>', 'utf8');
    }
    return send(200, TYPES[ext] || 'application/octet-stream', buf,
                { 'cache-control': 'no-cache' });
  } catch (e) {
    return send(500, TYPES['.json'], JSON.stringify({ error: e.message }));
  }
});

server.listen(PORT, '127.0.0.1', async () => {
  await mkdir(NOTES, { recursive: true });
  await mkdir(FEEDBACK, { recursive: true });
  const n = existsSync(NOTES) ? (await readdir(NOTES)).filter((f) => f.endsWith('.md')).length : 0;
  const f = existsSync(FEEDBACK) ? (await readdir(FEEDBACK)).filter((f) => f.endsWith('.md')).length : 0;
  console.log('');
  console.log('  the yard is up   http://localhost:' + PORT + '/arcade.html');
  console.log('');
  console.log('  the dock is injected into every board — no page was edited for it');
  console.log('    ctrl+shift+N   a note      -> notes/       (' + n + ' there now)');
  console.log('    ctrl+shift+F   feedback    -> feedback/    (' + f + ' there now)');
  console.log('    ctrl+shift+I   the notebook, which is the IDE');
  console.log('    ctrl+shift+E   the explorer: read, edit and run any file here');
  console.log('    ctrl+shift+V   the viewport: frame a page, and probe any URL');
  console.log('');
  console.log('  Both write real markdown files into this repository. That is the');
  console.log('  point: I cannot run inside the app, but I read those folders at');
  console.log('  the start of the next session without you retyping anything.');
  console.log('');
  console.log('  The explorer WRITES TO DISK. It is fenced to this folder, and');
  console.log('  refuses .git, node_modules and anything that is not text.');
  console.log('');
  console.log('  ctrl+C to stop.');
});

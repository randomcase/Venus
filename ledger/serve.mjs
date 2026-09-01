#!/usr/bin/env node
/* serve.mjs — the ledger's window: a small HTTP server for the explorer.

   Read-only over the ledger, with two doors that write and both of them go
   through the rules: a light switch (a signed note) and a question to the
   assistant (its grounding verdict is a signed note). Nothing here can issue
   or transfer; those need the custodians' keys, which the server never loads.

     node serve.mjs [dir=bank] [port=7332]
     GET  /                    the explorer
     GET  /api/summary         the report object
     GET  /api/events?type=&account=&tranche=&q=&from=&limit=
     GET  /api/event/:seq
     GET  /api/statement/:account
     GET  /api/verify          full verification from the file
     GET  /api/lights          the switch board
     POST /api/lights          {id, on, reason}  → signed note
     POST /api/lights/say      {instruction}      → the assistant drives the switches
     POST /api/ask             {question}         → grounded answer */
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Ledger } from './ledger.mjs';
import { summary, statement } from './report.mjs';
import { Lights } from './lights.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const dir = process.argv[2] || join(here, 'bank'), port = +(process.argv[3] || 7332);
const page = () => readFileSync(join(here, 'explorer.html'));
const json = (res, code, body) => { res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); res.end(JSON.stringify(body)); };
const body = req => new Promise(r => { let s = ''; req.on('data', c => s += c); req.on('end', () => { try { r(JSON.parse(s || '{}')); } catch (e) { r({}); } }); });
let assistant = null; const loadAssistant = async () => assistant || (assistant = await import('./assistant.mjs'));

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x'); const p = url.pathname; const q = Object.fromEntries(url.searchParams);
  try {
    if (p === '/' || p === '/explorer.html') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return res.end(page()); }
    const l = new Ledger(dir);
    if (p === '/api/summary') return json(res, 200, summary(l));
    if (p === '/api/verify') return json(res, 200, l.verify());
    if (p === '/api/audit') return json(res, 200, (await import('./audit.mjs')).audit(l));
    if (p === '/api/events') { let ev = l.events; if (q.type) ev = ev.filter(e => e.type === q.type); if (q.tranche) ev = ev.filter(e => e.body.tranche === +q.tranche);
      if (q.account) ev = ev.filter(e => e.body.to === q.account || e.body.from === q.account || e.body.id === q.account); if (q.q) { const t = q.q.toLowerCase(); ev = ev.filter(e => String(e.seq) === t || e.hash.sha256.startsWith(t) || JSON.stringify(e.body).toLowerCase().includes(t)); }
      const from = +(q.from || 0), limit = Math.min(500, +(q.limit || 100)); const slice = ev.slice().reverse().slice(from, from + limit); return json(res, 200, { total: ev.length, from, events: slice }); }
    if (p.startsWith('/api/event/')) { const e = l.events[+p.split('/')[3]]; return e ? json(res, 200, e) : json(res, 404, { error: 'no such event' }); }
    if (p.startsWith('/api/statement/')) return json(res, 200, statement(l, decodeURIComponent(p.split('/')[3]), 200));
    if (p === '/api/lights' && req.method === 'GET') return json(res, 200, new Lights(dir).list());
    if (p === '/api/lights' && req.method === 'POST') { const b = await body(req); return json(res, 200, await new Lights(dir).set(b.id, !!b.on, { by: 'explorer', reason: b.reason || '' })); }
    if (p === '/api/lights/say' && req.method === 'POST') { const b = await body(req); const a = await loadAssistant(); return json(res, 200, await a.lights(dir, String(b.instruction || ''))); }
    if (p === '/api/ask' && req.method === 'POST') { const b = await body(req); const a = await loadAssistant(); return json(res, 200, await a.ask(dir, String(b.question || ''))); }
    if (p === '/api/health' && req.method === 'POST') { const a = await loadAssistant(); return json(res, 200, await a.health(dir)); }
    json(res, 404, { error: 'no such door' });
  } catch (e) { json(res, 400, { error: e.message }); }
}).listen(port, '127.0.0.1', () => console.log(`the ledger at http://127.0.0.1:${port}  (${dir})`));

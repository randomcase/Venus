#!/usr/bin/env node
/* report.mjs — what the ledger says, as numbers a person or a model can read.

   Everything here is derived by replay; nothing is stored. The same object
   feeds the Markdown report, the HTML page and the assistant's context, so
   the three can never disagree.

     node report.mjs <dir>              Markdown to stdout
     node report.mjs <dir> --html x.html
     node report.mjs <dir> --json         */
import { writeFileSync } from 'node:fs';
import { Ledger } from './ledger.mjs';

export function summary(l, at = Date.now()) {
  const st = l.replay(), r = st.rules, v = l.verify();
  const money = n => (n / r.divisible).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const allowed = l.allowedIssuance(at);
  const tranches = Array.from({ length: r.tranches }, (_, i) => { const t = i + 1, issued = st.issued[t] || 0; return { tranche: t, issued, issuedText: money(issued), cap: r.cap, allowedNow: allowed, headroom: allowed - issued, pctOfCap: +(100 * issued / r.cap).toFixed(4) }; });
  const totalIssued = tranches.reduce((a, t) => a + t.issued, 0);
  const accounts = Object.values(st.accounts).map(a => ({ id: a.id, name: a.name, opened: a.opened, balances: Object.fromEntries(Object.entries(a.balances).filter(([, v]) => v).map(([k, v]) => [k, v])), total: Object.values(a.balances).reduce((x, y) => x + y, 0) }));
  for (const a of accounts) a.totalText = money(a.total);
  const byMonth = {}; for (const e of l.events) { const m = e.time.slice(0, 7); byMonth[m] = byMonth[m] || { events: 0, issued: 0, transferred: 0, notes: 0 }; byMonth[m].events++; if (e.type === 'issue') byMonth[m].issued += e.body.amount; if (e.type === 'transfer') byMonth[m].transferred += e.body.amount; if (e.type === 'note') byMonth[m].notes++; }
  const lastCheckpoint = [...l.events].reverse().find(e => e.type === 'checkpoint');
  const elapsedYears = (new Date(at) - new Date(r.schedule.start)) / (365.25 * 24 * 3600 * 1000);
  return { name: r.name, schema: r.schema, generated: new Date(at).toISOString(), verified: v.ok, verifyErrors: v.errors, events: l.events.length, head: l.head?.hash.sha256, lastCheckpoint: lastCheckpoint ? { seq: lastCheckpoint.seq, time: lastCheckpoint.time, root: lastCheckpoint.body.root } : null,
    schedule: { start: r.schedule.start, years: r.schedule.years, elapsedYears: +elapsedYears.toFixed(3), allowedPerTrancheNow: allowed, allowedText: money(allowed) },
    supply: { tranches: r.tranches, capPerTranche: r.cap, capText: money(r.cap), totalCap: r.cap * r.tranches, totalCapText: money(r.cap * r.tranches), totalIssued, totalIssuedText: money(totalIssued), inCirculation: accounts.reduce((a, x) => a + x.total, 0) },
    tranches, accounts, byMonth, quorum: { m: r.quorum.m, n: r.quorum.keys.length, keys: r.quorum.keys.map(k => k.name) }, writers: (r.writers || []).map(k => k.name), notes: st.notes, checkpoints: st.checkpoints };
}
export function statement(l, accountId, limit = 50) {
  const st = l.replay(); const a = st.accounts[accountId]; if (!a) throw new Error('no such account');
  const lines = l.events.filter(e => (e.type === 'issue' && e.body.to === accountId) || (e.type === 'transfer' && (e.body.from === accountId || e.body.to === accountId)))
    .map(e => ({ seq: e.seq, time: e.time, type: e.type, tranche: e.body.tranche, amount: e.type === 'transfer' && e.body.from === accountId ? -e.body.amount : e.body.amount, counterparty: e.type === 'issue' ? 'issuance' : e.body.from === accountId ? e.body.to : e.body.from, memo: e.body.memo || '' }));
  return { account: a.id, name: a.name, balances: a.balances, lines: lines.slice(-limit) };
}
export function markdown(s) {
  const rows = (h, r) => `| ${h.join(' | ')} |\n| ${h.map(() => '---').join(' | ')} |\n` + r.map(x => `| ${x.join(' | ')} |`).join('\n');
  return `# ${s.name}\n\n${s.verified ? 'Verified' : 'NOT VERIFIED: ' + s.verifyErrors.join('; ')} · ${s.events} events · head ${s.head?.slice(0, 12)} · ${s.lastCheckpoint ? `last checkpoint #${s.lastCheckpoint.seq} (${s.lastCheckpoint.time.slice(0, 10)})` : 'no checkpoint yet'} · generated ${s.generated.slice(0, 16)}Z\n\n` +
    `## Supply\n\n${s.supply.tranches} tranches of ${s.supply.capText} (${s.supply.totalCapText} in all). Issued ${s.supply.totalIssuedText}. Year ${Math.floor(s.schedule.elapsedYears) + 1} of ${s.schedule.years}; each tranche may have issued up to ${s.schedule.allowedText} by now.\n\n` +
    rows(['tranche', 'issued', 'headroom now', '% of cap'], s.tranches.filter(t => t.issued).map(t => [t.tranche, t.issuedText, (t.headroom / 100).toLocaleString('en-US'), t.pctOfCap])) + (s.tranches.some(t => t.issued) ? '' : '_(nothing issued yet)_') +
    `\n\n## Accounts\n\n` + rows(['account', 'name', 'balance', 'by tranche'], s.accounts.map(a => [a.id, a.name, a.totalText, Object.entries(a.balances).map(([t, v]) => `${t}: ${(v / 100).toLocaleString('en-US')}`).join(', ') || '—'])) +
    `\n\n## By month\n\n` + rows(['month', 'events', 'issued', 'transferred', 'notes'], Object.entries(s.byMonth).map(([m, x]) => [m, x.events, (x.issued / 100).toLocaleString('en-US'), (x.transferred / 100).toLocaleString('en-US'), x.notes])) +
    `\n\n## Custody\n\nQuorum ${s.quorum.m} of ${s.quorum.n} (${s.quorum.keys.join(', ')}); writers: ${s.writers.join(', ') || 'none'}; ${s.notes} notes; ${s.checkpoints} checkpoints.\n`;
}
export function html(s) { const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;'); const md = markdown(s);
  const body = md.split('\n').map(line => line.startsWith('# ') ? `<h1>${esc(line.slice(2))}</h1>` : line.startsWith('## ') ? `<h2>${esc(line.slice(3))}</h2>` : line.startsWith('| ---') ? '' : line.startsWith('| ') ? `<tr>${line.slice(2, -2).split(' | ').map(c => `<td>${esc(c)}</td>`).join('')}</tr>` : line ? `<p>${esc(line)}</p>` : '').join('\n').replace(/(<tr>.*<\/tr>\n?)+/g, m => `<table>${m}</table>`);
  return `<!doctype html><meta charset="utf-8"><title>${esc(s.name)} · report</title><style>body{font:14px/1.5 system-ui;max-width:900px;margin:30px auto;color:#efe9dc;background:#0b0d12;padding:0 16px}h1{color:#f2c98a}h2{color:#95a0b3;font-size:13px;text-transform:uppercase;letter-spacing:.08em;margin-top:28px}table{border-collapse:collapse;margin:8px 0}td{border:1px solid #2b3445;padding:4px 10px;font-variant-numeric:tabular-nums}tr:first-child td{color:#95a0b3}p{color:#c9c4b8}</style>${body}`; }

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  const dir = process.argv[2]; const s = summary(new Ledger(dir));
  if (process.argv.includes('--json')) console.log(JSON.stringify(s, null, 1));
  else if (process.argv.includes('--html')) { const out = process.argv[process.argv.indexOf('--html') + 1]; writeFileSync(out, html(s)); console.log('wrote', out); }
  else console.log(markdown(s));
}

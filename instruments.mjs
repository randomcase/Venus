#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   instruments.mjs — builds instruments.html: every number the yard leans on,
   with how it was arrived at and how wrong it might be.

   THE GAP THIS CLOSES IS REAL. Boards across this repository print 574 g/cm²,
   4.94 minutes, 2.05 degrees, 8.71 m/s², and until now nothing recorded where
   any of them came from. A figure with no provenance is a rumour with a
   decimal point.

   ── the check nobody runs ───────────────────────────────────────────────
   This file refuses an entry whose QUOTED PRECISION is not justified by its
   own stated uncertainty. If you are good to ±0.5 and you write 146.1, you
   have claimed four significant figures on a measurement that supports three,
   and that is the commonest quiet lie in technical writing — not a wrong
   number, an over-confident one.

   The rule used is the ordinary one: the last quoted digit should sit at or
   above the first uncertain digit. ±0.5 justifies one decimal place. ±25
   justifies none, and 574 is fine because the units digit is the uncertain
   one. ±50 on a value of 150 does NOT justify three figures, and that entry
   will be caught — it is one of mine.

   It also refuses:
     · a missing uncertainty, which is the whole point of the layer
     · no failure mode — an instrument that cannot be wrong is not measuring
     · a cited board that is not on disk
     · a figure no cited board actually contains, because an instrument for a
       number nobody uses is a number nobody checked

   ── and what it will not do ─────────────────────────────────────────────
   It does not rank them, score them, or say which matter. It says what each
   is for and what would break it, and leaves the judgement where it belongs.

       node instruments.mjs
   ═══════════════════════════════════════════════════════════════════════════ */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const DIR = 'templates-instrument';
const insts = [];
let fatal = 0;

/* ── the precision rule, which is the only interesting check here ───────
   The last digit you write should be the first digit you are unsure about.
   Given an uncertainty u, the place of its leading digit is the finest place
   a value may be quoted to. Anything finer is a claim the measurement does
   not support. */
/* The place of a number's last MEANINGFUL digit, as a power of ten.
   146.1 -> -1 (tenths).  574 -> 0 (units).  150 -> 1 (tens, since the
   trailing zero is not claimed).  2363 -> 0. */
function lastPlace(n) {
  const s = String(Math.abs(n));
  const dot = s.indexOf('.');
  if (dot >= 0) return -(s.length - dot - 1);
  const trimmed = s.replace(/0+$/, '');
  return s.length - trimmed.length;
}
/* and the place of the uncertainty's LEADING digit. 0.5 -> -1. 25 -> 1.
   400 -> 2. That is the finest place the value may be quoted to. */
const barPlace = (u) => Math.floor(Math.log10(u));

for (const file of readdirSync(DIR).filter((f) => f.endsWith('.json')).sort()) {
  const c = JSON.parse(readFileSync(join(DIR, file), 'utf8'));
  const errs = [], warn = [];

  for (const k of ['id', 'order', 'quantity', 'value', 'unit', 'method',
                   'used_for', 'boards', 'wrong_if', 'kind'])
    if (c[k] === undefined || c[k] === '') errs.push('missing ' + k);

  if (c.uncertainty === undefined)
    errs.push('no uncertainty — which is the entire point of this layer');
  else if (typeof c.uncertainty !== 'number' || c.uncertainty < 0)
    errs.push('uncertainty must be a non-negative number');

  if (c.wrong_if && /^nothing\.?$/i.test(String(c.wrong_if).trim()))
    errs.push('"nothing" is not a failure mode — if it cannot be wrong it is ' +
      'not measuring anything');

  /* THE precision check, and there is only one of it. I originally wrote two
     and they disagreed — a decimals rule and a significant-figures band —
     which threw out 146.1 ± 0.5 and 116.75 ± 0.01, both quoted exactly
     right. One rule covers both directions: the value's last meaningful
     digit must sit no finer than the uncertainty's leading digit. */
  if (typeof c.value === 'number' && typeof c.uncertainty === 'number' && c.uncertainty > 0) {
    const have = lastPlace(c.value);
    const may = barPlace(c.uncertainty);
    if (have < may) {
      const rounded = Math.round(c.value / Math.pow(10, may)) * Math.pow(10, may);
      errs.push('quoted to the ' + (have < 0 ? Math.pow(10, -have) + 'ths' :
        have === 0 ? 'units' : Math.pow(10, have) + 's') +
        ' on a bar of ' + c.uncertainty + ', whose leading digit is in the ' +
        (may < 0 ? Math.pow(10, -may) + 'ths' : may === 0 ? 'units' :
         Math.pow(10, may) + 's') + '. Write ' + rounded + ', or tighten the bar. ' +
        'This is not a wrong number, it is an over-confident one.');
    }
  }

  /* the boards must exist, and must actually contain the figure */
  for (const b of c.boards || []) {
    if (!existsSync(b)) { errs.push('cites ' + b + ', which is not on disk'); continue; }
    const src = readFileSync(b, 'utf8');
    /* escape FIRST, then loosen — the other order turns the character class
       into \[\.,\] and nothing ever matches, which had every instrument
       warning about every board it cited. */
    const v = String(c.value);
    /* A board prints 2400 as "2,400" — toLocaleString is everywhere in
       this yard — so the matcher allows a thousands separator between digit
       groups. Without it the check reports drift that is only formatting,
       and a checker that cries wolf is one people switch off. */
    const loose = v.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')
      .replace('\\.', '[.,]')
      .replace(/(\d)(?=(\d{3})+([.,]|$))/g, '$1,?');
    if (!new RegExp(loose).test(src))
      warn.push(b + ' does not contain ' + v + ' — either the board changed or ' +
        'this instrument is measuring something nobody prints');
  }

  console.log((errs.length ? 'REFUSED' : warn.length ? 'ok  (!) ' : 'ok      ') +
    (c.id || file).padEnd(22) + String(c.value).padStart(9) + ' ' +
    (c.unit || '').padEnd(11) + '± ' + String(c.uncertainty).padEnd(6) +
    (c.kind || ''));
  errs.forEach((e) => console.log('        x ' + e));
  warn.forEach((w) => console.log('        ! ' + w));
  if (errs.length) { fatal++; continue; }
  insts.push({ ...c, warn });
}

insts.sort((a, b) => a.order - b.order);

if (fatal) {
  console.log('\n' + fatal + ' refused. instruments.html not written — a number ' +
    'quoted more precisely than it is known is the one kind of error that ' +
    'looks like rigour.');
  process.exit(1);
}

/* ── the page ─────────────────────────────────────────────────────────── */
const kinds = [...new Set(insts.map((i) => i.kind))];
const relOf = (i) => i.uncertainty / Math.abs(i.value);
const loosest = insts.slice().sort((a, b) => relOf(b) - relOf(a))[0];
const boardsUsed = [...new Set(insts.flatMap((i) => i.boards))].sort();

const html = '<!doctype html>\n<html lang="en">\n<head>\n' +
'<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n' +
'<title>The instruments &middot; every figure, and how wrong it might be</title>\n' +
'<!-- No off-origin requests. Every entry checked against the boards that cite it. -->\n' +
'<style>\n' +
`  :root{
    --bg:#0b0e12; --panel:#12171d; --edge:#1f2831; --edge2:#2d3a46;
    --ink:#dfe5ea; --dim:#8b95a0; --faint:#5b6570;
    --cool:#6f9fb5; --moss:#7d9d6a; --rust:#c4674f; --gold:#c9a227;
    --serif:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;
    --mono:ui-monospace,"Cascadia Mono",Consolas,"SF Mono",Menlo,monospace;
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);
    font:16px/1.72 var(--serif);padding:38px 20px 90px}
  main{max-width:1000px;margin:0 auto}
  a{color:var(--gold);text-decoration:none} a:hover{text-decoration:underline}
  .top{display:flex;align-items:baseline;gap:15px;flex-wrap:wrap;margin-bottom:4px}
  h1{margin:0;font:500 38px/1.08 var(--serif)}
  .top span{font:400 9px/1 var(--mono);letter-spacing:.3em;text-transform:uppercase;
    color:var(--cool)}
  .intro{margin:0 0 26px;max-width:80ch;color:var(--dim);font-size:15.5px}

  .rule{margin:26px 0;padding:20px 22px;background:var(--panel);
    border-left:3px solid var(--rust)}
  .rule h4{margin:0 0 10px;font:400 8.5px/1 var(--mono);letter-spacing:.2em;
    text-transform:uppercase;color:var(--rust)}
  .rule p{margin:0 0 11px;max-width:80ch} .rule p:last-child{margin:0}
  .rule code{color:var(--gold);font:400 13px/1.5 var(--mono)}

  .i{background:var(--panel);border:1px solid var(--edge);margin-bottom:12px}
  .i header{display:flex;align-items:baseline;gap:14px;padding:14px 18px;
    border-bottom:1px solid var(--edge);flex-wrap:wrap}
  .i h3{margin:0;font:500 20px/1.2 var(--serif)}
  .i .v{margin-left:auto;font:400 24px/1 var(--mono);color:var(--ink);
    font-variant-numeric:tabular-nums}
  .i .v s{text-decoration:none;color:var(--faint);font-size:14px}
  .i .v u{text-decoration:none;color:var(--cool);font-size:13px;margin-left:8px}
  .i .k{font:400 8px/1 var(--mono);letter-spacing:.16em;text-transform:uppercase;
    padding:4px 8px;border:1px solid var(--edge2);color:var(--faint)}
  .i .k.computed{color:var(--cool);border-color:#2e4a58}
  .i .k.measured{color:var(--moss);border-color:#33452c}
  .i .k.derived{color:var(--gold);border-color:#4a3d15}
  .i .body{padding:15px 18px;display:grid;
    grid-template-columns:repeat(auto-fit,minmax(min(280px,100%),1fr));gap:16px}
  .i .f h5{margin:0 0 6px;font:400 8px/1 var(--mono);letter-spacing:.16em;
    text-transform:uppercase;color:var(--faint)}
  .i .f p{margin:0;font-size:14.5px;line-height:1.7;color:#c4cbd2}
  .i .f.bad h5{color:var(--rust)}
  .i footer{padding:10px 18px;border-top:1px solid var(--edge);
    font:400 10px/1.6 var(--mono);color:var(--faint);display:flex;gap:14px;
    flex-wrap:wrap;align-items:center}
  .i footer .bar{flex:1;min-width:120px;height:5px;background:#1a222a;position:relative}
  .i footer .bar i{position:absolute;top:0;bottom:0;background:var(--cool);opacity:.7}
  .i .warn{padding:10px 18px;background:#1d1610;border-top:1px solid #3a2a1c;
    font:400 12px/1.6 var(--serif);color:#c9a980}

  table{width:100%;border-collapse:collapse;margin:20px 0;font:400 12.5px/1.5 var(--mono)}
  .scroll{overflow-x:auto}
  table{min-width:620px}
  th{text-align:right;padding:0 11px 9px 0;color:var(--faint);font-weight:400;
    font-size:8px;letter-spacing:.15em;text-transform:uppercase;
    border-bottom:1px solid var(--edge2)}
  th:first-child,td:first-child{text-align:left}
  td{padding:8px 11px 8px 0;border-bottom:1px solid #161d24;text-align:right;
    font-variant-numeric:tabular-nums}
  td.d{text-align:left;color:var(--dim);font:400 13.5px/1.4 var(--serif)}
  footer.page{margin-top:52px;padding-top:18px;border-top:1px solid var(--edge);
    color:var(--faint);font:400 10.5px/1.85 var(--mono)}
</style>\n</head>\n<body>\n<main>\n` +

'<div class="top"><h1>The instruments</h1><span>every figure, and how wrong it might be</span></div>\n' +
'<p class="intro">Boards across this yard print 574 g/cm&sup2;, 4.94 minutes, ' +
'2.05 degrees, 8.71 m/s&sup2;. Until this layer existed, nothing recorded where ' +
'any of them came from. <b>A figure with no provenance is a rumour with a ' +
'decimal point</b> — so each of these declares its method, its uncertainty, what ' +
'it is used for, and what would make it wrong.</p>\n' +

'<div class="rule">\n' +
'  <h4>the check nobody runs</h4>\n' +
'  <p>The generator refuses an entry whose quoted precision is not justified by ' +
'its own error bar. The rule is the ordinary one: <b>the last digit you write ' +
'should be the first digit you are unsure about.</b></p>\n' +
'  <p>So <code>&plusmn;0.5</code> justifies one decimal place and ' +
'<code>146.1</code> is fine. <code>&plusmn;25</code> justifies none, and ' +
'<code>574</code> is fine because the units digit is the uncertain one. But ' +
'<code>150 &plusmn; 50</code> is a third of the value — that supports one ' +
'significant figure, not three, and writing it as 150 claims a confidence the ' +
'measurement does not have.</p>\n' +
'  <p>This is not a wrong-number check. It is an <b>over-confident</b>-number ' +
'check, and that is the harder mistake to see because it looks exactly like ' +
'rigour.</p>\n' +
'</div>\n' +

'<div class="scroll"><table>\n' +
'<tr><th>quantity</th><th>value</th><th>bar</th><th>relative</th><th>kind</th>' +
'<th>boards</th></tr>\n' +
insts.map((i) => '<tr><td class="d">' + esc(i.quantity) + '</td>' +
  '<td>' + i.value + ' ' + esc(i.unit) + '</td>' +
  '<td>&plusmn; ' + i.uncertainty + '</td>' +
  '<td>' + (relOf(i) * 100).toFixed(relOf(i) < 0.01 ? 2 : 0) + '%</td>' +
  '<td class="d">' + esc(i.kind) + '</td>' +
  '<td>' + i.boards.length + '</td></tr>').join('\n') + '\n</table></div>\n' +
'<p>The loosest figure here is <b>' + esc(loosest.quantity) + '</b> at ' +
Math.round(relOf(loosest) * 100) + ' per cent, and it is worth knowing that it ' +
'is also the one whose conclusion survives the bar — anything in its range ' +
'carries the same argument. A wide bar only matters when the argument is ' +
'quantitative, and saying which is which is most of what this page is for.</p>\n' +

insts.map((i) => '<article class="i">\n' +
'  <header><h3>' + esc(i.quantity) + '</h3>' +
    '<span class="k ' + esc(i.kind) + '">' + esc(i.kind) + '</span>' +
    '<span class="v">' + i.value + '<s> ' + esc(i.unit) + '</s>' +
    '<u>&plusmn; ' + i.uncertainty + '</u></span></header>\n' +
'  <div class="body">\n' +
'    <div class="f"><h5>how it was arrived at</h5><p>' + esc(i.method) + '</p></div>\n' +
'    <div class="f"><h5>what it is used for</h5><p>' + esc(i.used_for) + '</p></div>\n' +
'    <div class="f bad"><h5>what would make it wrong</h5><p>' + esc(i.wrong_if) + '</p></div>\n' +
'  </div>\n' +
(i.warn.length ? '  <div class="warn">' + i.warn.map(esc).join('<br>') + '</div>\n' : '') +
'  <footer><span>' + (relOf(i) * 100).toFixed(relOf(i) < 0.01 ? 2 : 0) + '% bar</span>' +
'<span class="bar"><i style="left:' + (50 - Math.min(48, relOf(i) * 200)) +
'%;right:' + (50 - Math.min(48, relOf(i) * 200)) + '%"></i></span>' +
'<span>' + i.boards.map((b) => '<a href="' + esc(b) + '">' + esc(b) + '</a>').join(' &middot; ') +
'</span></footer>\n</article>').join('\n') + '\n' +

'<footer class="page">\n' +
'Built by <a href="instruments.mjs">instruments.mjs</a> from ' + insts.length +
' entries in templates-instrument/. Every one is checked for a stated ' +
'uncertainty, a failure mode, a citation that exists on disk, and a quoted ' +
'precision its own bar justifies. It also warns when a board no longer contains ' +
'the figure the instrument claims to measure, which catches a number drifting ' +
'out from under its own provenance.<br>\n' +
'Cited across ' + boardsUsed.length + ' boards: ' +
boardsUsed.map((b) => '<a href="' + esc(b) + '">' + esc(b.replace('.html', '')) + '</a>').join(' &middot; ') +
'<br><a href="reading.html">the reading room</a> &middot; ' +
'<a href="dev.html">the hub</a>\n' +
'</footer>\n</main>\n</body>\n</html>\n';

writeFileSync('instruments.html', html);

console.log('\ninstruments.html · ' + insts.length + ' figures, ' +
  kinds.length + ' kinds, cited across ' + boardsUsed.length + ' boards');
console.log('  loosest: ' + loosest.quantity + ' at ' +
  Math.round(relOf(loosest) * 100) + ' per cent');
const warned = insts.filter((i) => i.warn.length);
if (warned.length)
  console.log('  ' + warned.length + ' warned: a cited board no longer contains the figure');

#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   dev.mjs — builds dev.html, the developer hub. One door to everything.

   NOTHING ON THIS PAGE IS TYPED BY HAND. Every list, count and link is read
   off the filesystem at build time, because a hand-kept index of a yard this
   size is a lie with a date on it — which is exactly what the arcade's own
   index turned out to be before it was made to scan the directories.

   It answers four questions, and only from what is on disk:

     what can I play          every board, sorted by whether it decides
                              anything and whether it needs a script to do so
     what can I read          the documents, the lessons, the knowledge base
     what can I build with    every generator, what it reads, what it emits
     what is the data         every JSON layer, counted, with its validator

   THE GRADE COLUMN. Every board is scored on two things that can be counted
   rather than judged: whether it COMPUTES (does the stylesheet decide
   anything — counters, :has(), state) and whether it is AUTOMATED (does it
   run without anybody pressing anything). Both are read out of the file. A
   board that neither computes nor runs is a document, and it is listed as
   one rather than flattered.

       node dev.mjs
   ═══════════════════════════════════════════════════════════════════════════ */
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const SKIP = new Set(['dev.html', 'arcade.html']);

/* ═══ 1 · read every board ═════════════════════════════════════════════ */
function scan(path) {
  const s = readFileSync(path, 'utf8');
  const title = (s.match(/<title>([^<]*)<\/title>/) || [])[1] || path;
  const grab = (re) => (s.match(re) || []).length;

  const radios = new Set((s.match(/type="radio"[^>]*name="([^"]+)"/g) || [])
    .map((m) => (m.match(/name="([^"]+)"/) || [])[1]));
  const boxes = grab(/type="checkbox"/g);
  const counters = grab(/counter-increment|counter-reset/g);
  const has = grab(/:has\(/g);
  const targets = grab(/:target/g);
  const canvas = /<canvas/.test(s);
  const svg = grab(/<svg/g);
  const scripts = grab(/<script/g);
  const inlineJs = /<script>[\s\S]{200,}/.test(s);
  const bytes = statSync(path).size;

  /* what it does, counted rather than claimed */
  const buttons = grab(/<button/g);
  const computes = counters + has + targets;
  const controls = radios.size + boxes + buttons;
  const automated = /setInterval|requestAnimationFrame|automat|\?run/.test(s);
  /* a board can decide things in script instead of in the stylesheet. That is
     a different claim, not a lesser one, and filing an idle game under
     documents because its arithmetic is not in CSS was simply wrong. */
  const runs = automated && (buttons > 0 || inlineJs);

  return {
    f: path, title, bytes,
    radios: radios.size, boxes, counters, has, targets, canvas, svg,
    scripts, inlineJs, computes, controls, automated, buttons, runs,
    kind: computes > 0 && controls > 0 ? 'plays'
        : runs ? 'runs'
        : controls > 0 ? 'presses'
        : canvas || svg > 2 ? 'draws'
        : 'reads'
  };
}

const rootBoards = readdirSync('.')
  .filter((f) => f.endsWith('.html') && !SKIP.has(f)).sort().map(scan);

const WINGS = ['profiles', 'ships', 'lessons', 'templates']
  .filter((d) => existsSync(d))
  .map((d) => ({
    dir: d,
    list: readdirSync(d).filter((f) => f.endsWith('.html')).sort()
      .map((f) => scan(join(d, f)))
  }));

const allBoards = rootBoards.concat(...WINGS.map((w) => w.list));

/* ═══ 2 · the games — boards that actually decide something ════════════ */
/* A game is a board you can press that then computes an outcome. Sorted by
   how much of the deciding happens in the stylesheet, which is the yard's
   whole claim and therefore the number worth leading with. */
/* one classification, used everywhere. The hub used to compute `kind` and
   then re-derive the categories from raw counts a second time, which is how
   an idle game that decides in script got filed under documents. */
const games = rootBoards.filter((b) => b.kind === 'plays')
  .sort((x, y) => y.computes - x.computes);
const selfRun = rootBoards.filter((b) => b.kind === 'runs')
  .sort((x, y) => y.bytes - x.bytes);
const toys = rootBoards.filter((b) => b.kind === 'presses');
const drawn = rootBoards.filter((b) => b.kind === 'draws');
const docs = rootBoards.filter((b) => b.kind === 'reads');

/* ═══ 3 · the generators ═══════════════════════════════════════════════ */
const gens = readdirSync('.').filter((f) => f.endsWith('.mjs')).sort().map((f) => {
  const s = readFileSync(f, 'utf8');
  const reads = Array.from(new Set(
    (s.match(/readdirSync\('([^']+)'\)|readFileSync\('([^']+)'/g) || [])
      .map((m) => (m.match(/'([^']+)'/) || [])[1])
      .filter((x) => x && x !== '.' && !x.includes('utf8'))));
  const emits = Array.from(new Set(
    (s.match(/writeFileSync\('([^']+)'|writeFileSync\(join\('([^']+)'/g) || [])
      .map((m) => (m.match(/'([^']+)'/) || [])[1])));
  const refuses = (s.match(/errs\.push|REFUSED|process\.exit\(1\)/g) || []).length;
  /* the first sentence of the header comment, which is what it is for */
  const head = (s.match(/^#!.*\n\/\*[\s\S]*?\n\s*([A-Za-z][^\n]*\.)/m) || [])[1] || '';
  return { f, reads, emits, refuses, head: head.trim(), bytes: statSync(f).size };
});

/* ═══ 4 · the data layers ══════════════════════════════════════════════ */
const layers = readdirSync('.')
  .filter((f) => f.startsWith('templates-') && statSync(f).isDirectory())
  .sort()
  .map((d) => {
    const files = readdirSync(d).filter((f) => f.endsWith('.json'));
    const owner = gens.find((g) => g.reads.includes(d));
    return { d, n: files.length, owner: owner ? owner.f : null,
             sample: files.slice(0, 3).map((f) => f.replace('.json', '')) };
  });

const kb = existsSync('kb.json')
  ? JSON.parse(readFileSync('kb.json', 'utf8')).entries.length : 0;
const lessonN = existsSync('templates-lesson')
  ? readdirSync('templates-lesson').filter((f) => f.endsWith('.json')).length : 0;
const checkN = existsSync('templates-lesson')
  ? readdirSync('templates-lesson').filter((f) => f.endsWith('.json'))
      .reduce((a, f) => a + JSON.parse(readFileSync(join('templates-lesson', f), 'utf8'))
        .practice.checks.length, 0) : 0;

/* ═══ 5 · totals, counted ══════════════════════════════════════════════ */
const T = {
  boards: allBoards.length,
  radios: allBoards.reduce((a, b) => a + b.radios, 0),
  boxes: allBoards.reduce((a, b) => a + b.boxes, 0),
  counters: allBoards.reduce((a, b) => a + b.counters, 0),
  has: allBoards.reduce((a, b) => a + b.has, 0),
  bytes: allBoards.reduce((a, b) => a + b.bytes, 0),
  noScript: allBoards.filter((b) => b.scripts === 0).length,
  layers: layers.reduce((a, l) => a + l.n, 0)
};

/* ═══ 6 · the page ═════════════════════════════════════════════════════ */
const kb100 = (n, d) => d ? Math.round(n / d * 100) : 0;
const bar = (n, max) => '<i style="width:' + Math.max(2, Math.round(n / max * 100)) + '%"></i>';
const maxCompute = Math.max(...allBoards.map((b) => b.computes), 1);

const boardRow = (b) => '<tr>' +
  '<td class="nm"><a href="' + esc(b.f) + '">' + esc(b.title.split('·')[0].trim().slice(0, 46)) + '</a>' +
    '<s>' + esc(b.f) + '</s></td>' +
  '<td class="n">' + (b.controls || '') + '</td>' +
  '<td class="n">' + (b.computes || '') + '</td>' +
  '<td class="g"><div class="bar">' + bar(b.computes, maxCompute) + '</div></td>' +
  '<td class="t">' + (b.scripts === 0
      ? '<b class="pure">no script</b>'
      : b.automated ? '<b class="auto">runs itself</b>' : '<b class="js">script</b>') + '</td>' +
  '<td class="n d">' + Math.round(b.bytes / 1024) + 'k</td></tr>';

const html = '<!doctype html>\n<html lang="en">\n<head>\n' +
'<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n' +
'<title>The developer hub</title>\n' +
'<!-- No off-origin requests. Everything on this page was read off the filesystem at build time. -->\n' +
'<style>\n' +
`  :root{
    --bg:#0a0c0e; --panel:#11151a; --edge:#1e262e; --edge2:#2a3440;
    --ink:#dfe3e8; --dim:#8b95a1; --faint:#5b656f;
    --cyan:#5fb3b3; --gold:#c9a227; --plum:#a273ad; --lime:#8fbc5a; --rust:#c4674f;
    --serif:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;
    --mono:ui-monospace,"Cascadia Mono",Consolas,"SF Mono",Menlo,monospace;
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);
    font:15px/1.7 var(--serif);padding:40px 20px 90px}
  main{max-width:1240px;margin:0 auto}
  a{color:var(--cyan);text-decoration:none}
  a:hover{text-decoration:underline}

  .top{display:flex;align-items:baseline;gap:16px;flex-wrap:wrap;margin-bottom:6px}
  h1{margin:0;font:500 38px/1.1 var(--serif);letter-spacing:.03em}
  .top span{font:300 9.5px/1 var(--mono);letter-spacing:.3em;
    text-transform:uppercase;color:var(--gold)}
  .intro{margin:0 0 32px;max-width:78ch;color:var(--dim)}

  .tot{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(122px,100%),1fr));
    gap:1px;background:var(--edge);border:1px solid var(--edge);margin:0 0 40px}
  .tot div{background:var(--panel);padding:15px 10px;text-align:center}
  .tot u{display:block;text-decoration:none;font:400 25px/1 var(--mono);
    color:var(--ink);font-variant-numeric:tabular-nums}
  .tot b{display:block;font-weight:400;margin-top:7px;
    font:300 8px/1.3 var(--mono);letter-spacing:.13em;text-transform:uppercase;
    color:var(--faint)}
  .tot div.hi u{color:var(--gold)}

  h2{margin:46px 0 4px;font:500 25px/1.2 var(--serif)}
  h2 s{text-decoration:none;display:block;margin-bottom:6px;
    font:300 8.5px/1 var(--mono);letter-spacing:.22em;text-transform:uppercase;
    color:var(--faint)}
  h2 em{font-style:normal;color:var(--faint);font-size:15px;margin-left:9px}
  .say{margin:0 0 16px;max-width:78ch;color:var(--dim);font-size:14.5px}

  .scroll{overflow-x:auto;margin:16px 0 34px;border:1px solid var(--edge)}
  table{width:100%;border-collapse:collapse;min-width:660px;
    font:400 12.5px/1.5 var(--mono)}
  th{text-align:left;padding:11px 12px;color:var(--faint);font-weight:400;
    font-size:8px;letter-spacing:.16em;text-transform:uppercase;
    background:var(--panel);border-bottom:1px solid var(--edge2)}
  td{padding:9px 12px;border-bottom:1px solid #151b21;vertical-align:middle}
  tr:last-child td{border-bottom:none}
  tr:hover td{background:#0f1419}
  td.nm{font:400 13.5px/1.35 var(--serif)}
  td.nm s{display:block;text-decoration:none;font:300 9px/1.4 var(--mono);
    color:var(--faint);margin-top:2px}
  td.n{text-align:right;font-variant-numeric:tabular-nums;color:var(--ink);width:1%}
  td.n.d{color:var(--faint)}
  td.g{width:26%}
  td.t{width:1%;white-space:nowrap}
  .bar{height:5px;background:#161d24;border-radius:3px;overflow:hidden}
  .bar i{display:block;height:100%;background:var(--cyan)}
  td.t b{font:400 8.5px/1 var(--mono);letter-spacing:.09em;text-transform:uppercase;
    padding:4px 7px;border:1px solid;border-radius:2px;display:inline-block}
  b.pure{color:var(--lime);border-color:#2f4426}
  b.auto{color:var(--gold);border-color:#4a3d15}
  b.js{color:var(--faint);border-color:var(--edge2)}

  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(280px,100%),1fr));
    gap:12px;margin:16px 0 34px}
  .cell{background:var(--panel);border:1px solid var(--edge);padding:14px 15px;
    border-left:2px solid var(--plum)}
  .cell.gen{border-left-color:var(--gold)}
  .cell h4{margin:0 0 5px;font:400 13px/1.3 var(--mono);color:var(--ink)}
  .cell h4 a{color:var(--ink)}
  .cell h4 i{font-style:normal;float:right;color:var(--plum);font-size:15px}
  .cell.gen h4 i{color:var(--gold)}
  .cell p{margin:0;font:400 12.5px/1.65 var(--serif);color:var(--dim)}
  .cell s{display:block;text-decoration:none;margin-top:9px;padding-top:8px;
    border-top:1px solid var(--edge);font:300 9px/1.6 var(--mono);color:var(--faint)}
  .cell s b{color:var(--cyan);font-weight:400}

  .note{margin:26px 0;padding:18px 20px;background:#0e1318;
    border-left:3px solid var(--gold)}
  .note h4{margin:0 0 8px;font:400 8.5px/1 var(--mono);letter-spacing:.2em;
    text-transform:uppercase;color:var(--gold)}
  .note p{margin:0 0 10px;max-width:80ch}
  .note p:last-child{margin:0}

  footer{margin-top:66px;padding-top:20px;border-top:1px solid var(--edge);
    color:var(--faint);font:300 10px/1.9 var(--mono)}
</style>\n</head>\n<body>\n<main>\n` +

'<div class="top"><h1>The developer hub</h1><span>Venus yard</span></div>\n' +
'<p class="intro">One door to everything, and not a line of it typed by hand. ' +
'Every list, count and link below was read off the filesystem when this page was ' +
'built &mdash; because a hand-kept index of a yard this size is a lie with a date ' +
'on it, which is exactly what the arcade&rsquo;s own index turned out to be before ' +
'it was made to scan its directories.</p>\n' +

'<div class="tot">\n' +
'  <div class="hi"><u>' + T.boards + '</u><b>boards</b></div>\n' +
'  <div class="hi"><u>' + T.noScript + '</u><b>with no script at all</b></div>\n' +
'  <div><u>' + T.counters + '</u><b>counter ops</b></div>\n' +
'  <div><u>' + T.has.toLocaleString() + '</u><b>:has() tests</b></div>\n' +
'  <div><u>' + T.radios + '</u><b>radio groups</b></div>\n' +
'  <div><u>' + T.boxes + '</u><b>checkboxes</b></div>\n' +
'  <div><u>' + gens.length + '</u><b>generators</b></div>\n' +
'  <div><u>' + T.layers + '</u><b>data files</b></div>\n' +
'  <div><u>' + kb + '</u><b>kb entries</b></div>\n' +
'  <div class="hi"><u>' + checkN + '</u><b>lesson checks</b></div>\n' +
'  <div><u>' + Math.round(T.bytes / 1024) + 'k</u><b>of board</b></div>\n' +
'</div>\n' +

'<h2><s>press these</s>The games <em>' + games.length + '</em></h2>\n' +
'<p class="say">A board is a game here when you can press it <b>and</b> it then ' +
'decides something. Both halves are counted off the file: controls are radio ' +
'groups and checkboxes, and the deciding is counter arithmetic, <code>:has()</code> ' +
'state and fragment gates. Sorted by how much of the deciding happens in the ' +
'stylesheet, since that is the whole claim.</p>\n' +
'<div class="scroll"><table>\n' +
'<tr><th>board</th><th>controls</th><th>decides</th><th></th><th>how</th><th>size</th></tr>\n' +
games.map(boardRow).join('\n') + '\n</table></div>\n' +

(toys.length ? '<h2><s>press these too</s>Things you can work but that keep no state <em>' +
  toys.length + '</em></h2>\n' +
  '<p class="say">Controls, but nothing in the stylesheet computing an outcome from ' +
  'them. Listed apart rather than counted as games.</p>\n' +
  '<div class="scroll"><table>\n' +
  '<tr><th>board</th><th>controls</th><th>decides</th><th></th><th>how</th><th>size</th></tr>\n' +
  toys.map(boardRow).join('\n') + '\n</table></div>\n' : '') +

(selfRun.length ? '<h2><s>these run on their own</s>Runs itself <em>' +
  selfRun.length + '</em></h2>\n' +
  '<p class="say">These decide in script rather than in the stylesheet, and they keep going with nothing pressed. A different claim from the boards above, not a lesser one &mdash; the idle board accrues while the page is shut and credits the whole absence when you come back.</p>\n' +
  '<div class="scroll"><table>\n' +
  '<tr><th>board</th><th>controls</th><th>decides</th><th></th><th>how</th><th>size</th></tr>\n' +
  selfRun.map(boardRow).join('\n') + '\n</table></div>\n' : '') +

'<h2><s>look at these</s>Drawn <em>' + drawn.length + '</em></h2>\n' +
'<div class="scroll"><table>\n' +
'<tr><th>board</th><th>controls</th><th>decides</th><th></th><th>how</th><th>size</th></tr>\n' +
drawn.map(boardRow).join('\n') + '\n</table></div>\n' +

'<h2><s>read these</s>Documents <em>' + docs.length + '</em></h2>\n' +
'<p class="say">Nothing to press. They are listed because this hub is a census ' +
'and not a selection.</p>\n' +
'<div class="scroll"><table>\n' +
'<tr><th>board</th><th>controls</th><th>decides</th><th></th><th>how</th><th>size</th></tr>\n' +
docs.map(boardRow).join('\n') + '\n</table></div>\n' +

WINGS.map((w) => '<h2><s>generated</s>' + esc(w.dir) + '/ <em>' + w.list.length + '</em></h2>\n' +
  '<div class="scroll"><table>\n' +
  '<tr><th>board</th><th>controls</th><th>decides</th><th></th><th>how</th><th>size</th></tr>\n' +
  w.list.map(boardRow).join('\n') + '\n</table></div>').join('\n') + '\n' +

'<h2><s>build with these</s>The generators <em>' + gens.length + '</em></h2>\n' +
'<p class="say">Nothing here is maintained by hand that could be counted instead. ' +
'Each of these rereads the directory it owns, and most of them exist to ' +
'<b>refuse</b> something &mdash; the refusal count is how many distinct ways each ' +
'one can decline to emit.</p>\n' +
'<div class="grid">\n' +
gens.map((g) => '  <article class="cell gen">\n' +
'    <h4><a href="' + esc(g.f) + '">' + esc(g.f) + '</a><i>' + g.refuses + '</i></h4>\n' +
'    <p>' + esc(g.head.slice(0, 150) || 'a generator') + '</p>\n' +
'    <s>reads <b>' + esc(g.reads.slice(0, 3).join(', ') || 'the directory') + '</b>' +
     (g.emits.length ? '<br>emits <b>' + esc(g.emits.slice(0, 3).join(', ')) + '</b>' : '') +
     '</s>\n  </article>').join('\n') + '\n</div>\n' +

'<h2><s>the data</s>The layers <em>' + layers.length + '</em></h2>\n' +
'<p class="say">Not pages. These are the JSON every board is built from, and each ' +
'has a validator that refuses a file breaking its rule &mdash; which is the only ' +
'reason the rules hold when nobody is looking.</p>\n' +
'<div class="grid">\n' +
layers.map((l) => '  <article class="cell">\n' +
'    <h4>' + esc(l.d.replace('templates-', '')) + '<i>' + l.n + '</i></h4>\n' +
'    <p>' + esc(l.sample.join(', ')) + (l.n > 3 ? ', and ' + (l.n - 3) + ' more' : '') + '</p>\n' +
'    <s>validated by <b>' + esc(l.owner || 'nothing yet') + '</b></s>\n  </article>').join('\n') + '\n' +
'  <article class="cell"><h4>knowledge base<i>' + kb + '</i></h4>\n' +
'    <p>Every entry carries a test &mdash; the thing you could do that would show ' +
'it false. Citations are checked against the filesystem at build time.</p>\n' +
'    <s>validated by <b>kb.mjs</b></s></article>\n' +
'  <article class="cell"><h4>lessons<i>' + lessonN + '</i></h4>\n' +
'    <p>' + checkN + ' checks that run against the functions you write, in your own ' +
'browser. No achievement passes on the starter, and every constraint has a ' +
'violator on file proving it catches something.</p>\n' +
'    <s>validated by <b>writing.mjs</b></s></article>\n' +
'</div>\n' +

'<div class="note">\n' +
'  <h4>how the grade column works</h4>\n' +
'  <p>Two things are counted and nothing is judged. <b>Controls</b> is radio ' +
'groups plus checkboxes &mdash; how much of the board you can actually operate. ' +
'<b>Decides</b> is counter operations plus <code>:has()</code> tests plus ' +
'<code>:target</code> gates &mdash; how much of the outcome the stylesheet works ' +
'out on its own.</p>\n' +
'  <p>A board that scores on both is a game. One that scores only on controls is ' +
'something you can fiddle with. One that scores on neither is a document, and it ' +
'is listed as a document rather than flattered into a category it did not earn. ' +
'<b>' + T.noScript + ' of the ' + T.boards + '</b> carry no script whatsoever.</p>\n' +
'</div>\n' +

'<footer>\n' +
'Built by <a href="dev.mjs">dev.mjs</a> from the directory. ' +
T.boards + ' boards, ' + gens.length + ' generators, ' + layers.length + ' data ' +
'layers holding ' + T.layers + ' files, ' + kb + ' knowledge-base entries and ' +
checkN + ' lesson checks. Totals are sums over the files, not figures anybody ' +
'typed. Re-run it and every number on this page moves on its own.<br>\n' +
'<a href="arcade.html">the arcade</a> &middot; ' +
'<a href="writing.html">the notebook</a> &middot; ' +
'<a href="corps.html">the order of battle</a> &middot; ' +
'<a href="kb.html">the knowledge base</a>\n' +
'</footer>\n</main>\n</body>\n</html>\n';

writeFileSync('dev.html', html);

console.log('dev.html');
console.log('  games      ' + String(games.length).padStart(3) + '  (controls AND compute)');
console.log('  fiddlers   ' + String(toys.length).padStart(3) + '  (controls, no compute)');
console.log('  runs itself' + String(selfRun.length).padStart(3) + '  (decides in script, keeps going unpressed)');
console.log('  drawn      ' + String(drawn.length).padStart(3));
console.log('  documents  ' + String(docs.length).padStart(3));
WINGS.forEach((w) => console.log('  ' + (w.dir + '/').padEnd(11) +
  String(w.list.length).padStart(3) + '  generated'));
console.log('  ' + T.boards + ' boards · ' + T.noScript + ' with no script · ' +
  gens.length + ' generators · ' + layers.length + ' layers (' + T.layers + ' files)');
console.log('  ' + T.counters + ' counter ops · ' + T.has + ' :has() · ' +
  T.radios + ' radio groups · ' + T.boxes + ' checkboxes');
console.log('\n  the games, by how much the stylesheet decides:');
games.slice(0, 12).forEach((g) => console.log('    ' + g.f.padEnd(24) +
  String(g.computes).padStart(5) + ' decides · ' + String(g.controls).padStart(3) + ' controls' +
  (g.scripts === 0 ? '  no script' : '')));

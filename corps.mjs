#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   corps.mjs — builds corps.html, the order of battle, computed.

   THREE ARRANGEMENTS WERE PROPOSED AND ONE OF THEM WAS CALLED EXCESSIVE. This
   file works out whether that was right, because it is a question with a
   number attached rather than a matter of taste.

     A · four sergeants, two corporals each
     B · two front, two rear, two wings
     C · wings, and one in one

   A core is NINE, auxiliary included, and communications is inside auxiliary
   rather than beside it — one sergeant, two corporals, six auxiliary. That
   last placement is the whole design: a core that carries its own signaller
   can report without asking anybody's leave, and a core that has to borrow one
   is a core with a choke point in it.

   The mobile rear guard is one man. He is the only position on the table with
   nobody under him, which is exactly why he can move: a formation travels at
   the speed of the slowest thing its commander must keep track of, and he
   must keep track of nothing. He is also the only man carrying rank whose
   removal severs nothing — the auxiliary are harmless too, being leaves, but
   every other officer is load-bearing.

   ── the finding this file exists for ────────────────────────────────────
   It runs the b2p2p2b lesson's own choke-point routine over the command graph
   of each arrangement. A command tree turns out to be the MAXIMALLY choked
   graph: every officer is a cut vertex, without exception, because a tree has
   no second path by construction. That is not a criticism of hierarchy — it is
   what hierarchy is for, and it is why the relay is given one start button and
   one shutdown and no discretion in between. A structure in which every node
   is a choke point cannot be handed live judgement calls.

   ── no dead men in war ──────────────────────────────────────────────────
   The roster has no casualty column. It records cores that stopped reporting
   and the corporal whose watch it was. That is a performance attribution and
   not a euphemism: the number that matters operationally is how long a core
   held, and a count of the dead does not tell you that.

       node corps.mjs
   ═══════════════════════════════════════════════════════════════════════════ */
import { writeFileSync } from 'node:fs';

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* ═══ 1 · the core ═════════════════════════════════════════════════════ */
const CORE = { sergeant: 1, corporals: 2, auxiliary: 6 };
const CORE_N = CORE.sergeant + CORE.corporals + CORE.auxiliary;   /* nine */

/* ═══ 2 · the arrangements ═════════════════════════════════════════════ */
const ARR = [
  { id: 'four', name: 'Four sergeants',
    said: 'the first proposal',
    cores: [
      { id: 'A', role: 'first' }, { id: 'B', role: 'second' },
      { id: 'C', role: 'third' }, { id: 'D', role: 'fourth' }
    ] },
  { id: 'six', name: 'Two front, two rear, two wings',
    said: 'the second proposal',
    cores: [
      { id: 'F1', role: 'front' }, { id: 'F2', role: 'front' },
      { id: 'R1', role: 'rear' },  { id: 'R2', role: 'rear' },
      { id: 'W1', role: 'wing' },  { id: 'W2', role: 'wing' }
    ] },
  { id: 'wings', name: 'Wings, and one in one',
    said: 'the one that was kept',
    cores: [ { id: 'W1', role: 'wing' }, { id: 'W2', role: 'wing' } ] }
];

/* build the command graph. General at the top; the brigadier hangs off him
   alone; each core is a sergeant with two corporals, and each corporal holds
   three of the six auxiliary. */
function graphOf(a) {
  const g = {};
  const link = (x, y) => {
    (g[x] = g[x] || []).push(y);
    (g[y] = g[y] || []).push(x);
  };
  g['general'] = [];
  link('general', 'brigadier');           /* the mobile rear guard, alone */
  for (const c of a.cores) {
    const sgt = 'sgt-' + c.id;
    link('general', sgt);
    for (let k = 1; k <= CORE.corporals; k++) {
      const cpl = 'cpl-' + c.id + k;
      link(sgt, cpl);
      const each = CORE.auxiliary / CORE.corporals;
      for (let m = 1; m <= each; m++) link(cpl, 'aux-' + c.id + k + m);
    }
  }
  return g;
}

/* the b2p2p2b routine, unchanged, run over a command tree instead of a market */
function reaches(graph, from, to, without) {
  if (from === without || to === without) return false;
  const seen = new Set([from]), q = [from];
  while (q.length) {
    const n = q.shift();
    if (n === to) return true;
    for (const m of graph[n] || [])
      if (m !== without && !seen.has(m)) { seen.add(m); q.push(m); }
  }
  return false;
}
function chokes(graph, from, to) {
  return Object.keys(graph)
    .filter((n) => n !== from && n !== to)
    .filter((n) => !reaches(graph, from, to, n))
    .sort();
}

function depthFrom(graph, root) {
  const d = { [root]: 0 }, q = [root];
  while (q.length) {
    const n = q.shift();
    for (const m of graph[n] || []) if (d[m] === undefined) { d[m] = d[n] + 1; q.push(m); }
  }
  return d;
}

const rows = ARR.map((a) => {
  const g = graphOf(a);
  const souls = Object.keys(g).length;
  const edges = Object.values(g).reduce((s, v) => s + v.length, 0) / 2;
  const d = depthFrom(g, 'general');
  const deepest = Math.max(...Object.values(d));
  const leaves = Object.keys(g).filter((n) => (g[n] || []).length === 1 && n !== 'general');

  /* every officer between the general and the furthest private */
  const far = Object.keys(d).reduce((b, n) => (d[n] > d[b] ? n : b), 'general');
  const cut = chokes(g, 'general', far);

  /* and the general question: over the whole graph, how many nodes are a cut
     vertex for SOME pair. In a tree that is every node with more than one
     neighbour, which the count below confirms rather than assumes. */
  const internal = Object.keys(g).filter((n) => (g[n] || []).length > 1);
  const allCut = internal.filter((n) => {
    const nb = g[n];
    for (let i = 1; i < nb.length; i++)
      if (!reaches(g, nb[0], nb[i], n)) return true;
    return false;
  });

  const led = souls - 1 - a.cores.length - 1;         /* not general, not sgts, not brigadier */
  /* who is load-bearing. A leaf disconnects nobody, so all the auxiliary are
     harmless and so is the brigadier. The honest statement is that he is the
     only man CARRYING RANK who is not load-bearing, and that is worth
     computing, because asserting it is what got it wrong the first time. */
  const harmless = Object.keys(g).filter((n) => (g[n] || []).length <= 1);
  const rankedHarmless = harmless.filter((n) => !n.startsWith('aux-'));
  return {
    ...a, g, souls, edges, deepest, cut, allCut, internal, harmless, rankedHarmless,
    cores: a.cores, coreN: a.cores.length,
    officers: 1 + 1 + a.cores.length + a.cores.length * CORE.corporals,
    aux: a.cores.length * CORE.auxiliary,
    leaves: leaves.length,
    span: a.cores.length + 1,                          /* sergeants plus the brigadier */
    ratio: (led / (1 + a.cores.length)).toFixed(1),
    far
  };
});

const kept = rows.find((r) => r.id === 'wings');
const biggest = rows.reduce((a, b) => (b.souls > a.souls ? b : a));

/* ═══ 3 · the relay window ═════════════════════════════════════════════ */
/* What a core has to withstand between one instruction and the next. These
   are the yard's standing figures: the arrival light delay, the passage, and
   the synodic period that sets how often a window opens at all. */
const LIGHT_MIN = 4.94;                  /* one way, at arrival */
const ROUND = LIGHT_MIN * 2;
const PASSAGE_D = 146;
const SYNODIC_D = 583.92;
const SOL_D = 116.75;                    /* a Venus solar day */
/* a core that must wait a round trip before acting has that long of nobody
   deciding for it. Over a solar day that is how many uninstructed intervals: */
const INTERVALS = Math.floor(SOL_D * 24 * 60 / ROUND);

/* ═══ 4 · the drawing ══════════════════════════════════════════════════ */
function diagram(r) {
  const W = 560, rowY = [38, 96, 158, 218];
  const nodes = [];
  const put = (x, y, label, cls, sub) => nodes.push({ x, y, label, cls, sub });

  put(W / 2, rowY[0], 'GENERAL', 'gen');
  put(W - 54, rowY[1], 'BRIG', 'brig', 'alone');

  const n = r.coreN;
  const sx = (i) => 54 + (i + 0.5) * ((W - 150) / n);
  r.cores.forEach((c, i) => {
    put(sx(i), rowY[1], 'SGT', 'sgt', c.role);
    put(sx(i) - 15, rowY[2], String(CORE.corporals), 'cpl', 'cpl');
    put(sx(i) + 15, rowY[3], String(CORE.auxiliary), 'aux', 'aux');
  });

  const lines = [
    ['M' + (W / 2) + ' ' + (rowY[0] + 13) + ' L' + (W - 54) + ' ' + (rowY[1] - 13), 'brig']
  ];
  r.cores.forEach((c, i) => {
    lines.push(['M' + (W / 2) + ' ' + (rowY[0] + 13) + ' L' + sx(i) + ' ' + (rowY[1] - 13), '']);
    lines.push(['M' + sx(i) + ' ' + (rowY[1] + 13) + ' L' + (sx(i) - 15) + ' ' + (rowY[2] - 11), '']);
    lines.push(['M' + (sx(i) - 15) + ' ' + (rowY[2] + 11) + ' L' + (sx(i) + 15) + ' ' + (rowY[3] - 11), '']);
  });

  return '<svg viewBox="0 0 ' + W + ' 250" class="dia">' +
    lines.map((l) => '<path class="ln ' + l[1] + '" d="' + l[0] + '"/>').join('') +
    nodes.map((nd) =>
      '<g class="nd ' + nd.cls + '" transform="translate(' + nd.x.toFixed(1) + ',' + nd.y + ')">' +
      '<circle r="13"/><text y="4">' + esc(nd.label) + '</text>' +
      (nd.sub ? '<text class="sb" y="26">' + esc(nd.sub) + '</text>' : '') + '</g>').join('') +
    '</svg>';
}

/* ═══ 5 · the page ═════════════════════════════════════════════════════ */
const html = '<!doctype html>\n<html lang="en">\n<head>\n' +
'<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n' +
'<title>The order of battle</title>\n' +
'<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
'<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
'<link rel="stylesheet" href="https://fonts.googleapis.com/css2?' +
  'family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400&' +
  'family=JetBrains+Mono:wght@300;400;600&display=swap">\n' +
'<style>\n' +
`  :root{
    --ground:#0d0f0c; --panel:#141712; --edge:#242a1f;
    --ink:#ddd8c8; --dim:#8b8878; --faint:#5f5d54;
    --brass:#c2a04a; --olive:#8fa06b; --rust:#b86046; --steel:#6f8698;
    --serif:"EB Garamond",Georgia,serif;
    --mono:"JetBrains Mono",ui-monospace,Consolas,monospace;
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--ground);color:var(--ink);
    font:16px/1.7 var(--serif);padding:44px 22px 90px}
  main{max-width:1180px;margin:0 auto}
  h1{margin:0 0 4px;font:500 40px/1.1 var(--serif);letter-spacing:.05em}
  .lede{margin:0 0 6px;color:var(--brass);font:300 10px/1 var(--mono);
    letter-spacing:.34em;text-transform:uppercase}
  .intro{margin:0 0 40px;max-width:74ch;color:var(--dim);font-size:17px}
  h2{margin:52px 0 6px;font:500 25px/1.2 var(--serif)}
  h2 s{text-decoration:none;color:var(--faint);font:300 9px/1 var(--mono);
    letter-spacing:.22em;text-transform:uppercase;display:block;margin-bottom:7px}
  p{max-width:74ch}
  b{color:var(--brass);font-weight:500}

  .core{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(148px,100%),1fr));
    gap:1px;background:var(--edge);border:1px solid var(--edge);margin:22px 0}
  .core div{background:var(--panel);padding:17px 14px;text-align:center}
  .core u{display:block;text-decoration:none;font:400 30px/1 var(--mono);
    color:var(--ink);font-variant-numeric:tabular-nums}
  .core b{display:block;font-weight:400;margin-top:8px;
    font:300 8.5px/1.3 var(--mono);letter-spacing:.15em;text-transform:uppercase;
    color:var(--faint)}
  .core div.tot u{color:var(--brass)}

  .arr{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(330px,100%),1fr));
    gap:16px;margin:26px 0}
  .card{background:var(--panel);border:1px solid var(--edge);padding:18px}
  .card.kept{border-color:var(--brass)}
  .card h3{margin:0 0 2px;font:500 20px/1.2 var(--serif)}
  .card .said{margin:0 0 14px;font:300 8.5px/1 var(--mono);letter-spacing:.18em;
    text-transform:uppercase;color:var(--faint)}
  .card.kept .said{color:var(--brass)}
  .dia{width:100%;height:auto;display:block;margin-bottom:14px}
  .ln{stroke:#39412f;stroke-width:1;fill:none}
  .ln.brig{stroke:var(--rust);stroke-dasharray:4 4}
  .nd circle{fill:#1c211a;stroke:#454f39}
  .nd text{fill:var(--dim);font:600 8px/1 var(--mono);text-anchor:middle}
  .nd text.sb{fill:var(--faint);font:300 7px/1 var(--mono);letter-spacing:.1em}
  .nd.gen circle{fill:#2a2b1c;stroke:var(--brass)} .nd.gen text{fill:var(--brass)}
  .nd.brig circle{stroke:var(--rust)} .nd.brig text{fill:var(--rust)}
  .nd.sgt circle{stroke:var(--olive)} .nd.sgt text{fill:var(--olive)}
  .nd.aux circle{stroke:var(--steel)} .nd.aux text{fill:var(--steel)}

  .scroll{overflow-x:auto;margin:22px 0}
  table{width:100%;border-collapse:collapse;margin:0;min-width:660px;
    font:400 13px/1.5 var(--mono)}
  th{text-align:left;padding:0 10px 9px 0;color:var(--faint);font-weight:400;
    font-size:8.5px;letter-spacing:.16em;text-transform:uppercase;
    border-bottom:1px solid var(--edge)}
  td{padding:10px 10px 10px 0;border-bottom:1px solid #1c211a;
    font-variant-numeric:tabular-nums}
  td.n{color:var(--ink)} td.d{color:var(--faint)}
  tr.kept td{background:#181c14}
  tr.kept td:first-child{box-shadow:inset 2px 0 0 var(--brass);padding-left:10px}

  .find{margin:30px 0;padding:22px 24px;background:#151a13;
    border-left:3px solid var(--brass)}
  .find h4{margin:0 0 10px;font:400 8.5px/1 var(--mono);letter-spacing:.22em;
    text-transform:uppercase;color:var(--brass)}
  .find p{margin:0 0 12px;font-size:16px}
  .find p:last-child{margin:0}

  .bodies{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr));
    gap:14px;margin:24px 0}
  .body{background:var(--panel);border:1px solid var(--edge);padding:16px 17px;
    border-top:2px solid var(--olive)}
  .body h4{margin:0 0 7px;font:500 17px/1.2 var(--serif)}
  .body p{margin:0;font-size:14px;color:var(--dim);line-height:1.65}
  .body s{display:block;text-decoration:none;margin-top:11px;padding-top:9px;
    border-top:1px solid var(--edge);font:300 9px/1.5 var(--mono);color:var(--faint)}

  .rule{margin:34px 0;padding:20px 22px;border:1px dashed var(--edge)}
  .rule h4{margin:0 0 9px;font:400 8.5px/1 var(--mono);letter-spacing:.22em;
    text-transform:uppercase;color:var(--rust)}
  .rule p{margin:0;font:italic 400 17px/1.7 var(--serif)}

  footer{margin-top:70px;padding-top:20px;border-top:1px solid var(--edge);
    color:var(--faint);font:300 10px/1.85 var(--mono)}
  footer a{color:var(--brass)}
</style>\n</head>\n<body>\n<main>\n` +

'<p class="lede">Venus &middot; the relay</p>\n' +
'<h1>The order of battle</h1>\n' +
'<p class="intro">Three arrangements were put forward and one of them was called ' +
'excessive. That is a claim with a number attached, so this page works it out ' +
'rather than settling it by preference. Everything below is computed from one ' +
'definition of a core and one command graph per arrangement.</p>\n' +

'<h2><s>the unit</s>Nine a core, auxiliary included</h2>\n' +
'<p>One sergeant, two corporals, six auxiliary. Communications sits <b>inside</b> ' +
'the auxiliary rather than beside it, and that placement is the whole design: a ' +
'core carrying its own signaller can report without asking anybody&rsquo;s leave, ' +
'and a core that has to borrow one has a choke point inside it before it has ' +
'left the ground.</p>\n' +
'<div class="core">\n' +
'  <div><u>' + CORE.sergeant + '</u><b>sergeant</b></div>\n' +
'  <div><u>' + CORE.corporals + '</u><b>corporals</b></div>\n' +
'  <div><u>' + CORE.auxiliary + '</u><b>auxiliary, comms among them</b></div>\n' +
'  <div class="tot"><u>' + CORE_N + '</u><b>a core</b></div>\n' +
'</div>\n' +

'<h2><s>the three</s>What each arrangement costs</h2>\n' +
'<div class="arr">\n' +
rows.map((r) =>
'  <article class="card' + (r.id === 'wings' ? ' kept' : '') + '">\n' +
'    <h3>' + esc(r.name) + '</h3>\n' +
'    <p class="said">' + esc(r.said) + ' &middot; ' + r.souls + ' souls</p>\n' +
'    ' + diagram(r) + '\n' +
'  </article>').join('\n') + '\n</div>\n' +

'<div class="scroll"><table>\n<tr><th>arrangement</th><th>cores</th><th>souls</th><th>officers</th>' +
'<th>auxiliary</th><th>the general&rsquo;s span</th><th>led per leader</th>' +
'<th>links</th><th>depth</th></tr>\n' +
rows.map((r) => '<tr' + (r.id === 'wings' ? ' class="kept"' : '') + '>' +
  '<td class="d">' + esc(r.name) + '</td>' +
  '<td class="n">' + r.coreN + '</td>' +
  '<td class="n">' + r.souls + '</td>' +
  '<td class="n">' + r.officers + '</td>' +
  '<td class="n">' + r.aux + '</td>' +
  '<td class="n">' + r.span + '</td>' +
  '<td class="n">' + r.ratio + '</td>' +
  '<td class="n">' + r.edges + '</td>' +
  '<td class="n">' + r.deepest + '</td></tr>').join('\n') + '\n</table></div>\n' +

'<p>The depth column is the one that settles it. Every arrangement is <b>' +
rows[0].deepest + ' deep</b> &mdash; general, sergeant, corporal, auxiliary &mdash; ' +
'because the core is the same shape in all three. So the extra cores in the ' +
'first two buy no reach at all. They buy width: the general&rsquo;s span goes from ' +
'<b>' + kept.span + '</b> to <b>' + biggest.span + '</b>, and <b>' +
(biggest.souls - kept.souls) + '</b> more people are carried to arrive at exactly ' +
'the same number of links between the top and the bottom. Excessive was the right ' +
'word, and it was a matter of arithmetic rather than taste.</p>\n' +

'<div class="find">\n' +
'  <h4>the finding</h4>\n' +
'  <p>The choke-point routine from the b2p2p2b lesson runs over these command ' +
'graphs without a line changed. It looks for any single party whose removal ' +
'disconnects two others.</p>\n' +
'  <p>In the kept arrangement it names <b>' + kept.allCut.length + ' of ' +
kept.souls + '</b> &mdash; which is every node that has more than one neighbour, ' +
'without exception. A command tree is the <b>maximally choked</b> graph. There is ' +
'no second path anywhere in it, by construction, so every officer is a cut vertex ' +
'and removing any one of them severs what hangs below.</p>\n' +
'  <p>That is not an argument against hierarchy. It is what a hierarchy is for, ' +
'and it is the reason the relay is given one start and one shutdown and nothing ' +
'in between. A structure in which every node is a choke point cannot be trusted ' +
'with live judgement calls, because each of those calls is a discretion sitting ' +
'on a cut vertex. You spend the discretion once, in the order, and then it is ' +
'gone.</p>\n' +
'</div>\n' +

'<h2><s>the exception</s>One man, alone, at the back</h2>\n' +
'<p>The brigadier is the only position on the table with nobody under him. That ' +
'is not a demotion and it is not sentiment &mdash; it is the reason he can move. ' +
'A formation travels at the speed of the slowest thing its commander must keep ' +
'track of, and he must keep track of nothing. He is his own auxiliary and his own ' +
'signaller, a core of one, and the dashed line on every diagram above is his: he ' +
'answers to the general and to no one else, and no one answers to him.</p>\n' +
'<p>The choke-point routine also finds him <b>harmless</b>: removing him ' +
'disconnects nobody from anybody, because nothing routes through him. That ' +
'is true of the ' + (kept.harmless.length - kept.rankedHarmless.length) + ' ' +
'auxiliary as well &mdash; a leaf never severs anything &mdash; but of the ' +
'<b>' + kept.harmless.length + '</b> harmless positions he is the only one ' +
'carrying rank. Every other officer is load-bearing, all <b>' + kept.allCut.length + '</b> of them.</p>\n' +

'<h2><s>what has to be withstood</s>The relay window</h2>\n' +
'<p>Daily survival is the core&rsquo;s own. What the table above has to be sized ' +
'against is how long a core goes between one instruction and the next, and that ' +
'is set by physics rather than by preference.</p>\n' +
'<div class="scroll"><table>\n<tr><th>quantity</th><th>value</th><th>what it means for a core</th></tr>\n' +
'<tr><td class="d">light delay at arrival, one way</td><td class="n">' + LIGHT_MIN.toFixed(2) +
  ' min</td><td class="d">the soonest anybody could know</td></tr>\n' +
'<tr><td class="d">a question and its answer</td><td class="n">' + ROUND.toFixed(2) +
  ' min</td><td class="d">the minimum time acting alone</td></tr>\n' +
'<tr><td class="d">uninstructed intervals in one Venus solar day</td><td class="n">' +
  INTERVALS.toLocaleString() + '</td><td class="d">how often that happens over ' +
  SOL_D + ' Earth days</td></tr>\n' +
'<tr><td class="d">the passage out</td><td class="n">' + PASSAGE_D +
  ' d</td><td class="d">before any of it applies</td></tr>\n' +
'<tr><td class="d">between windows home</td><td class="n">' + SYNODIC_D +
  ' d</td><td class="d">how long a decision stands</td></tr>\n</table></div>\n' +
'<p>Ten minutes is the floor and it is the number the core is built around. A ' +
'nine-man core carrying its own communications can hold a decision for ' +
'<b>' + ROUND.toFixed(2) + ' minutes</b> without anybody senior existing, ' +
'<b>' + INTERVALS.toLocaleString() + '</b> times in a single Venus day. It is ' +
'going to be unpleasant. It is not going to be ambiguous.</p>\n' +

'<h2><s>the standing bodies</s>Who is where</h2>\n' +
'<div class="bodies">\n' +
'  <div class="body"><h4>The habitations</h4><p>The fixed points. They do not ' +
'move, which means every calculation about what can be withstood is a calculation ' +
'about the distance back to one of them.</p><s>fixed &middot; the denominator of ' +
'every survival figure</s></div>\n' +
'  <div class="body"><h4>The ground crew</h4><p>On Venus, in the cores. Their ' +
'day is their own: what they eat, when they sleep, what they repair first. The ' +
'order of the land binds them and nothing else does.</p><s>' + kept.souls +
' in the kept arrangement</s></div>\n' +
'  <div class="body"><h4>The ship mothers</h4><p>They hold the passage. A ship ' +
'mother is not a rank in the table above &mdash; she is not in the command graph ' +
'at all, which is why removing her breaks nothing and losing her ends ' +
'everything.</p><s>outside the tree, on purpose</s></div>\n' +
'</div>\n' +

'<div class="rule">\n' +
'  <h4>the standing rule</h4>\n' +
'  <p>No dead men in war. Just bad corporals.</p>\n' +
'</div>\n' +
'<p>The roster has no casualty column and this is not a euphemism. It records ' +
'cores that stopped reporting and the corporal whose watch it was, because that ' +
'is the number with something in it: how long a core held, and under whom. A ' +
'count of the dead does not tell you that, and it cannot be acted on. The ledger ' +
'only goes up &mdash; hours held, cores brought back &mdash; which is the same ' +
'law every other board in this yard runs on.</p>\n' +
'<p>And the other half of it, which is not a metric. A man needs a friend or a ' +
'reason. The nine-man core exists because at that size everybody has both: it is ' +
'small enough that nobody is anonymous in it and large enough that it can lose ' +
'somebody to a shift and still function. Below nine you have friends and no ' +
'redundancy. Above nine you have a roster.</p>\n' +

'<footer>\n' +
'Computed by <a href="corps.mjs">corps.mjs</a>. A core is ' + CORE_N + ' by ' +
'definition; everything else on this page &mdash; souls, links, depth, spans, ' +
'and every choke point &mdash; is derived from that and from the three command ' +
'graphs. The choke-point routine is the one from ' +
'<a href="writing.html">the notebook</a>&rsquo;s b2p2p2b lesson, unmodified.<br>' +
'Light delay ' + LIGHT_MIN + ' min, passage ' + PASSAGE_D + ' d, synodic ' +
SYNODIC_D + ' d, Venus solar day ' + SOL_D + ' d.\n' +
'</footer>\n</main>\n</body>\n</html>\n';

writeFileSync('corps.html', html);

console.log('corps.html');
console.log('  a core is ' + CORE_N + ': ' + CORE.sergeant + ' sergeant, ' +
  CORE.corporals + ' corporals, ' + CORE.auxiliary + ' auxiliary (comms among them)');
rows.forEach((r) => console.log('  ' + r.name.padEnd(30) +
  String(r.coreN).padStart(2) + ' cores · ' + String(r.souls).padStart(3) + ' souls · ' +
  'span ' + r.span + ' · depth ' + r.deepest + ' · ' + r.edges + ' links · ' +
  r.allCut.length + '/' + r.souls + ' are choke points'));
console.log('  every arrangement is the same depth, so the extra cores buy width and no reach');
console.log('  kept: ' + kept.name + ' — ' + kept.souls + ' souls against ' +
  biggest.souls + ', ' + (biggest.souls - kept.souls) + ' fewer for the same reach');
console.log('  harmless: ' + kept.harmless.length + ' of ' + kept.souls + ' (the ' +
  (kept.harmless.length - kept.rankedHarmless.length) + ' auxiliary, plus ' +
  kept.rankedHarmless.join(' and ') + ') \u2014 only one of them carries rank');
console.log('  relay floor ' + ROUND.toFixed(2) + ' min · ' + INTERVALS.toLocaleString() +
  ' uninstructed intervals per Venus solar day');

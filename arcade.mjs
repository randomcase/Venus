#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   arcade.mjs — builds arcade.html by reading the yard, not a list.

   The arcade was hand-written and had thirty-three cabinets in it for a yard
   that now has sixty-odd pages. That is the failure mode of every hand-kept
   index: it is correct on the day it is written and wrong from then on, and
   nothing tells you. So it is generated now, the same way automat.html and
   kb.html are, and it cannot go stale — add a page and a cabinet appears.

   IT NEEDS NO BACKEND. The staleness was never a server problem; it was a
   maintenance problem, and a generator fixes it with no service to run, no
   port to hold open and nothing to deploy. Every cabinet is still a live
   <iframe> of the real file, so what you are looking at is the yard actually
   executing rather than a screenshot of it.

   THE CABINETS ARE 3D NOW, which is what the 2.5D reading asks for: depth in
   the object rather than in the room. Each one is a real cabinet built from
   five surfaces in preserve-3d — a marquee canted forward over the top, a
   screen raked back the way a CRT sits in a bezel, a control deck angled up
   at the player, and two side panels giving it thickness. The floor stays a
   plane. The furniture has volume.

   Every figure on a cabinet is counted from the file itself: radio groups,
   checkboxes, counters, and whether the page carries anything that runs.

       node arcade.mjs
   ═══════════════════════════════════════════════════════════════════════════ */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* pages that are not exhibits: the arcade itself, and the frames-only shells */
const SKIP = new Set(['arcade.html']);

function scan(f) {
  const s = readFileSync(f, 'utf8');
  const title = (s.match(/<title>([\s\S]*?)<\/title>/) || [, f])[1]
    .replace(/\s+/g, ' ').trim();
  const name = title.split(/\s+[··]\s+/)[0].trim();
  const blurb = title.slice(name.length).replace(/^\s*[··]\s*/, '').trim();

  const radios = new Set();
  for (const m of s.matchAll(/<input[^>]*type="radio"[^>]*name="([^"]+)"/g)) radios.add(m[1]);
  const boxes = (s.match(/type="checkbox"/g) || []).length;
  const counters = (s.match(/counter-increment/g) || []).length;
  const rules = (s.match(/:has\(/g) || []).length;

  /* does anything on this page actually run? automat.js and devmode.js are
     inert without a query string and do not count. */
  const scripts = [...s.matchAll(/<script(?![^>]*type="application\/json")[^>]*>/g)]
    .filter((m) => !/automat\.js|devmode\.js|bases\.js|hub\.js|builds\.js/.test(m[0]));
  const live = scripts.length > 0;

  return { f, name, blurb, radios: radios.size, boxes, counters, rules, live,
           controls: radios.size + boxes };
}

const files = readdirSync('.')
  .filter((f) => f.endsWith('.html') && !SKIP.has(f))
  .sort();
const cabs = files.map(scan);

/* the generated wings. Four directories the arcade did not know existed,
   which is the same staleness the root list had and worth fixing once. */
const WINGS = [
  { dir: 'profiles',  name: 'The profiles',
    note: 'Fourteen things that have to work before anybody lands, generated from profiles.json. Each one carries what it depends on and what depends on it, inverted so a link stated once reads correctly at both ends.' },
  { dir: 'ships',     name: 'The fleet',
    note: 'Seven logs, 23 entries, a 146-day passage. Every diary is generated from ships.json, and the commandants keep their own days.' },
  { dir: 'lessons',   name: 'The lessons',
    note: 'The firefly swarm, four lessons deep. These carry scripts of their own and say so.' },
  { dir: 'templates', name: 'The templates',
    note: 'One per authored board, extracted by templatise.mjs. Each keeps its source stylesheet and every input id, so it runs as it stands — the prose is what was removed.' }
].filter((w) => existsSync(w.dir));
WINGS.forEach((w) => {
  w.list = readdirSync(w.dir).filter((f) => f.endsWith('.html')).sort()
    .map((f) => ({ ...scan(join(w.dir, f)), f: `${w.dir}/${f}` }));
});

/* the data layers. Not pages — the JSON every generator reads, counted so the
   arcade is a census of the whole yard rather than only the half that renders. */
const LAYERS = [
  ['templates-base',      'Base rosters',   'bases.mjs',      'bases.js',      'a plate you can build on'],
  ['templates-build',     'Buildings',      'builds.mjs',     'builds.js',     'thirteen kinds, four tiers, +1 monotone'],
  ['templates-quest',     'Quests',         'quests.mjs',     'quests.js',     'giver, object, done, produces — no recursion'],
  ['templates-faction',   'Factions',       'factions.mjs',   'factions.js',   'patrons, all unconditional'],
  ['templates-challenge', 'Challenges',     'challenges.mjs', 'challenges.js', 'coding, assessment, writing, voice'],
  ['templates-form',      'Forms',          'writing.mjs',    'writing.html',  'eleven, and every shape closes'],
].filter(([d]) => existsSync(d)).map(([dir, name, gen, out, note]) => ({
  dir, name, gen, out, note,
  n: readdirSync(dir).filter((f) => f.endsWith('.json')).length
}));

const KB = existsSync('kb.json')
  ? JSON.parse(readFileSync('kb.json', 'utf8')).entries.length : 0;

/* the workshop: every generator, and what it makes */
const SHOP = [
  ['arcade.mjs',     'this page, from the directory'],
  ['kb.mjs',         `kb.html — ${KB} entries, citations checked at build time`],
  ['guild.mjs',      'guild.html — the ladder, the rename, the quest board'],
  ['automat.mjs',    'automat.html — the script layer and its orbits'],
  ['quests.mjs',     'quests.js — refuses anything that recurses'],
  ['factions.mjs',   'factions.js — refuses anything with a gate in it'],
  ['builds.mjs',     'builds.js — refuses a building that shrinks on promotion'],
  ['bases.mjs',      'bases.js — refuses a roster with a cycle in it'],
  ['challenges.mjs', 'challenges.js — refuses a rubric band carrying a number'],
  ['hub.mjs',        'hub.js — the knowledge hub, from kb.json'],
  ['journal.mjs',    'journal.html — the desk, and the prompts it reads'],
  ['writing.mjs',    'writing.html — the notebook, and the forms it holds you to'],
  ['profiles.mjs',   'profiles/ — fourteen requirement pages'],
  ['ships.mjs',      'ships/ — seven logs and their charts'],
  ['templatise.mjs', 'templates/ — one per authored board'],
  ['compile.mjs',    'the pattern census across every page'],
].filter(([f]) => existsSync(f));

/* the halls. Derived from what a page IS rather than from a hand list:
   anything with controls is playable, anything that runs is a machine, the
   rest are exhibits. */
const halls = [
  { id: 'machines', name: 'The machines',
    note: 'These run. Scripts of their own, and they say so.',
    of: (c) => c.live },
  { id: 'playable', name: 'The playable floor',
    note: 'No script anywhere. Every one of them decides in the stylesheet, and every control is a checkbox or a link.',
    of: (c) => !c.live && c.controls > 0 },
  { id: 'exhibits', name: 'The exhibits',
    note: 'Documents. Nothing to press, and they are here because the arcade is a census and not a selection.',
    of: (c) => !c.live && c.controls === 0 }
];
halls.forEach((h) => { h.list = cabs.filter(h.of); });

const tot = (k) => cabs.reduce((a, c) => a + c[k], 0);
const SKY = existsSync('.sky-block.txt')
  ? readFileSync('.sky-block.txt', 'utf8').replace('#060a08', '#07090e') : '';

const cabinet = (c, i) => `      <article class="cab${c.live ? ' live' : ''}">
        <div class="body">
          <div class="marq"><span class="n">${String(i + 1).padStart(2, '0')}</span>
            <h3>${esc(c.name)}</h3></div>
          <div class="screen">
            <iframe src="${esc(c.f)}" title="${esc(c.name)}" loading="lazy"
              tabindex="-1"></iframe>
            <div class="glass"></div>
          </div>
          <div class="deck">
            <span class="slot"></span>
            <span class="stat">${c.radios}R &middot; ${c.boxes}B &middot; ${c.counters}C</span>
            <a href="${esc(c.f)}">play</a>
          </div>
          <div class="side l"></div><div class="side r"></div>
        </div>
        <p class="plate">${esc(c.blurb || c.f)}</p>
      </article>`;

writeFileSync('arcade.html', `<title>The Arcade &middot; ${cabs.length} boards, all of them running</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<!--
  THE ARCADE — every board in the yard, live, in a cabinet.

  Generated by arcade.mjs from the directory rather than from a list, because
  the hand-written version had 33 cabinets in it for a yard with ${cabs.length}
  pages and nothing said so. A hand-kept index is correct on the day it is
  written and wrong from then on.

  Every cabinet is a real iframe of the real file. The animations run, the
  counters count, and the boards are executing rather than being pictured.

  THE CABINETS HAVE VOLUME. Five surfaces each in preserve-3d: a marquee canted
  forward over the top, a screen raked back the way a tube sits in a bezel, a
  control deck angled up at the player, and two side panels for thickness. The
  floor stays a plane and the furniture stands on it, which is what 2.5D means.

  WHAT THE HUB CAN HONESTLY DO is unchanged and worth restating. It does not
  reach inside a cabinet and it cannot: without script one document cannot set
  state in another. So it drives what is genuinely its own — the lights, the
  attract drift, and its own cut — and every board keeps its own controls,
  which is the right answer anyway.

  Counted from the files: ${tot('radios')} radio groups, ${tot('boxes')}
  checkboxes, ${tot('counters')} counter declarations, ${tot('rules')} uses of
  :has(). ${cabs.filter((c) => c.live).length} of the ${cabs.length} pages carry
  anything that runs.
-->
<style>
  :root{
    --void:#07090e; --card:#141a24; --card2:#0d121a; --edge:#243040;
    --ink:#e8eef6; --dim:#8b9aad; --bone:#e4d9b8;
    --gold:#e0b155; --plum:#9d8ae0; --green:#5fd6a4; --red:#e0705a;
    --glow:#6ec6ff;
  }
  *{box-sizing:border-box}
  /* the cabinets lean toward the viewer and their side panels rotate out, so
     the furniture is wider than its grid cell by design. Clip rather than
     scroll: overflow-x on the body does not sit between the perspective
     element and its preserve-3d children, so the depth survives it. */
  html{overflow-x:hidden}
  body{margin:0;padding:20px 16px 60px;color:var(--ink);background:var(--void);
    overflow-x:hidden;
    font:13.5px/1.66 ui-rounded,system-ui,-apple-system,sans-serif;
    background-image:
      radial-gradient(circle at 50% -8%,rgba(110,198,255,.10),transparent 46%),
      radial-gradient(circle at 88% 100%,rgba(157,138,224,.08),transparent 42%)}
  .w{max-width:1500px;margin:0 auto}
  header{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;
    border-bottom:1px solid var(--edge);padding-bottom:12px;margin-bottom:6px}
  h1{margin:0;font-size:22px;letter-spacing:-.018em;color:var(--bone)}
  header .sub{color:var(--dim);font-size:11.5px;max-width:70ch}
  header .tag{margin-left:auto;font:9px/1 ui-monospace,monospace;letter-spacing:.2em;
    text-transform:uppercase;color:var(--glow);border:1px solid var(--glow);
    border-radius:4px;padding:4px 9px}
  h2{font:9.5px/1 ui-monospace,Menlo,monospace;letter-spacing:.2em;
    text-transform:uppercase;color:var(--dim);margin:34px 0 4px;font-weight:600;
    display:flex;justify-content:space-between;align-items:baseline;gap:12px}
  h2 b{color:var(--bone);font-family:inherit;letter-spacing:0;text-transform:none;
    font-size:10.5px;font-weight:600}
  p.n{color:var(--dim);font-size:11.5px;line-height:1.7;margin:8px 0 0;max-width:94ch}
  p.n b{color:var(--ink)}
  a{color:var(--gold)}

  .stats{display:grid;gap:8px;grid-template-columns:repeat(5,1fr);margin:14px 0 4px}
  @media (max-width:760px){.stats{grid-template-columns:repeat(2,1fr)}}
  .st{background:#0b1017;border:1px solid var(--edge);border-radius:9px;
    padding:10px 12px}
  .st span{display:block;font:8px/1.3 ui-monospace,monospace;letter-spacing:.14em;
    text-transform:uppercase;color:#5f6f82;margin-bottom:5px}
  .st b{font:17px/1 ui-monospace,monospace;color:var(--glow)}

  /* ══════════════════════════════════════════ THE FLOOR AND THE FURNITURE
     The floor is a plane. Each cabinet is five surfaces in preserve-3d, so
     the depth is in the object — which is the whole of what 2.5D means and
     the reason this reads as a room rather than as a wall of cards. */
  .floor{display:grid;gap:34px 18px;margin-top:20px;
    grid-template-columns:repeat(auto-fill,minmax(272px,1fr));
    perspective:1600px;perspective-origin:50% 22%}
  .cab{transform-style:preserve-3d}
  .cab .body{position:relative;transform-style:preserve-3d;
    transform:rotateX(7deg);transition:transform .45s cubic-bezier(.2,.8,.3,1)}
  .cab:hover .body{transform:rotateX(2deg) translateZ(26px)}

  /* the marquee, canted forward over the top of the machine */
  .marq{display:flex;align-items:baseline;gap:8px;padding:9px 11px;
    background:linear-gradient(180deg,#22303f,#16202c);
    border:1px solid var(--edge);border-bottom:0;border-radius:10px 10px 0 0;
    transform-origin:bottom center;transform:rotateX(-16deg) translateZ(4px);
    box-shadow:0 -6px 22px rgba(110,198,255,.10)}
  .marq .n{font:9px/1 ui-monospace,monospace;letter-spacing:.16em;color:var(--plum)}
  .marq h3{margin:0;font-size:13px;letter-spacing:-.01em;color:var(--bone)}
  .live .marq{box-shadow:0 -6px 22px rgba(224,112,90,.14)}

  /* the screen, raked back the way a tube sits in a bezel */
  .screen{position:relative;height:200px;overflow:hidden;background:#04070b;
    border:1px solid var(--edge);border-top:0;border-bottom:0;
    transform-origin:top center;transform:rotateX(3deg)}
  .screen iframe{position:absolute;top:0;left:0;width:1400px;height:1000px;
    border:0;transform:scale(.28);transform-origin:0 0;pointer-events:none}
  .glass{position:absolute;inset:0;pointer-events:none;
    background:
      radial-gradient(ellipse at 28% 10%,rgba(255,255,255,.09),transparent 56%),
      repeating-linear-gradient(0deg,rgba(0,0,0,.20) 0 1px,transparent 1px 3px)}

  /* the control deck, angled up at whoever is standing there */
  .deck{display:flex;align-items:center;gap:9px;padding:9px 11px;
    background:linear-gradient(180deg,#1b2531,#111823);
    border:1px solid var(--edge);border-radius:0 0 11px 11px;
    transform-origin:top center;transform:rotateX(34deg);
    box-shadow:0 14px 26px rgba(0,0,0,.5)}
  .deck .slot{width:26px;height:5px;border-radius:3px;background:#0a0f16;
    border:1px solid #2b3849;flex:none}
  .deck .stat{font:8.5px/1 ui-monospace,monospace;letter-spacing:.1em;
    color:#6b7c90}
  .deck a{margin-left:auto;font:8.5px/1 ui-monospace,monospace;letter-spacing:.16em;
    text-transform:uppercase;color:var(--gold);text-decoration:none;
    border:1px solid var(--edge);border-radius:5px;padding:5px 9px}
  .deck a:hover{border-color:var(--gold);background:rgba(224,177,85,.12)}
  .deck a:focus-visible{outline:2px solid var(--glow);outline-offset:2px}

  /* the sides, which is where the thickness comes from */
  .side{position:absolute;top:34px;bottom:26px;width:16px;
    background:linear-gradient(180deg,#1a2431,#0c1119);border:1px solid #1d2836}
  .side.l{left:0;transform-origin:left center;transform:rotateY(74deg)}
  .side.r{right:0;transform-origin:right center;transform:rotateY(-74deg)}

  .plate{margin:14px 4px 0;font:9.5px/1.6 ui-monospace,monospace;color:#5f6f82;
    max-width:34ch}
  .live .plate::after{content:" · runs";color:var(--red)}
  .cab:not(.live) .plate::after{content:" · no script";color:var(--green)}

  /* attract mode, and the cut. Both are this document's own animations, which
     is the only reason it is honest to offer them. */
  .a:has(#h-attract:checked) .cab .body{animation:breathe 22s ease-in-out infinite}
${cabs.map((_, i) => `  .a:has(#h-attract:checked) .cab:nth-child(${i + 1}) .body{animation-delay:-${(i * 0.62).toFixed(2)}s}`).join('\n')}
  @keyframes breathe{
    0%,92%,100%{transform:rotateX(7deg)}
    96%{transform:rotateX(2deg) translateZ(30px)}}
  .a:has(#h-cut:checked) .cab .body{animation:none}
  @media (prefers-reduced-motion:reduce){.cab .body{animation:none !important}}

  .hub{position:sticky;top:10px;z-index:5;display:flex;align-items:center;gap:12px;
    flex-wrap:wrap;background:rgba(11,16,23,.94);border:1px solid var(--edge);
    border-radius:12px;padding:11px 13px;margin-top:14px;
    backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px)}
  .hub .name{font:9px/1 ui-monospace,monospace;letter-spacing:.18em;
    text-transform:uppercase;color:#5f6f82}
  .hub .name b{display:block;color:var(--bone);font-size:12px;letter-spacing:0;
    text-transform:none;font-family:inherit;margin-top:4px}
  .hub .btns{display:flex;gap:6px;margin-left:auto;flex-wrap:wrap}
  .hub input{position:absolute;opacity:0;width:1px;height:1px}
  .hub label{cursor:pointer;font:9px/1 ui-monospace,monospace;letter-spacing:.14em;
    text-transform:uppercase;padding:9px 13px;border-radius:7px;
    border:1px solid var(--edge);color:var(--dim);user-select:none}
  .hub label:hover{color:var(--ink)}
  .hub input:checked + label{border-color:var(--glow);color:var(--glow);
    background:rgba(110,198,255,.12);font-weight:700}
  .hub input#h-cut:checked + label{border-color:var(--red);color:var(--red);
    background:rgba(224,112,90,.12)}
  .hub input:focus-visible + label{outline:2px solid var(--glow);outline-offset:2px}

  /* the stockroom — the data layers, drawn as tins on a shelf rather than as
     cabinets, because they are not pages and pretending otherwise would be the
     same lie the old hand-kept list told. */
  .shelf{display:grid;gap:10px;margin-top:14px;
    grid-template-columns:repeat(auto-fill,minmax(232px,1fr))}
  .tin{background:linear-gradient(180deg,#151d28,#0d131b);
    border:1px solid var(--edge);border-radius:10px;padding:12px 13px;
    border-left:3px solid var(--plum)}
  .tin.kb{border-left-color:var(--glow)}
  .tin h4{margin:0 0 6px;font-size:13px;color:var(--bone);display:flex;
    align-items:baseline;gap:8px}
  .tin h4 i{font-style:normal;margin-left:auto;font:15px/1 ui-monospace,monospace;
    color:var(--plum)}
  .tin.kb h4 i{color:var(--glow)}
  .tin p{margin:0;font-size:10.5px;color:var(--dim);line-height:1.6}
  .tin s{display:block;text-decoration:none;font:9px/1.6 ui-monospace,monospace;
    color:#5f6f82;margin-top:8px;padding-top:7px;border-top:1px solid #1b2430}

  .shop{display:grid;gap:7px;margin-top:14px;
    grid-template-columns:repeat(auto-fill,minmax(300px,1fr))}
  .tool{display:flex;align-items:baseline;gap:10px;background:#0b1017;
    border:1px solid var(--edge);border-radius:8px;padding:9px 11px;
    font:9.5px/1.5 ui-monospace,monospace}
  .tool a{color:var(--gold);text-decoration:none;flex:none}
  .tool a:hover{text-decoration:underline}
  .tool span{color:#5f6f82}

  footer{margin-top:40px;padding-top:14px;border-top:1px solid var(--edge);
    color:var(--dim);font-size:10.5px;line-height:1.75}
${SKY}</style>

<div class="a w">
  <header>
    <h1>The Arcade</h1>
    <span class="sub">Every board in the yard, in a cabinet, running. Not
      screenshots &mdash; ${cabs.length} live frames of the real files, counted
      from the directory so this page cannot go stale.</span>
    <span class="tag">${cabs.length + WINGS.reduce((a, w) => a + w.list.length, 0)} cabinets</span>
  </header>

  <div class="hub">
    <span class="name">hub<b>Arcade console</b></span>
    <div class="btns">
      <input type="radio" name="hb" id="h-idle" checked><label for="h-idle">idle</label>
      <input type="radio" name="hb" id="h-attract"><label for="h-attract">attract</label>
      <input type="radio" name="hb" id="h-cut"><label for="h-cut">cut</label>
    </div>
  </div>

  <div class="stats">
    <div class="st"><span>cabinets</span><b>${cabs.length}</b></div>
    <div class="st"><span>radio groups</span><b>${tot('radios')}</b></div>
    <div class="st"><span>checkboxes</span><b>${tot('boxes')}</b></div>
    <div class="st"><span>counters</span><b>${tot('counters')}</b></div>
    <div class="st"><span>pages that run</span><b>${cabs.filter((c) => c.live).length}</b></div>
  </div>
  <p class="n"><b>The hub drives the arcade, not the cabinets.</b> Without
    script one document cannot set state in another, so the console moves what
    is genuinely its own &mdash; the attract drift and its own cut &mdash; and
    every board keeps its own controls. That is the right answer anyway: a hub
    that could silently drive ${cabs.length} boards is a worse design than
    ${cabs.length} boards that each answer for themselves.</p>

${halls.map((h) => `  <h2>${esc(h.name)} <b>${h.list.length} of ${cabs.length}</b></h2>
  <p class="n">${esc(h.note)}</p>
  <div class="floor">
${h.list.map(cabinet).join('\n')}
  </div>`).join('\n\n')}

${WINGS.map((w) => `  <h2>${esc(w.name)} <b>${w.list.length} generated</b></h2>
  <p class="n">${esc(w.note)}</p>
  <div class="floor">
${w.list.map(cabinet).join('\n')}
  </div>`).join('\n\n')}

  <h2>The stockroom <b>what the generators read</b></h2>
  <p class="n">Not pages. These are the JSON layers every board is built from,
    and they are here because the arcade is a census of the yard and not only of
    the half that renders. Each one has a generator that <b>refuses</b> a file
    breaking its rule, which is the only reason any of the rules hold when
    nobody is looking.</p>
  <div class="shelf">
${LAYERS.map((L) => `    <article class="tin">
      <h4>${esc(L.name)}<i>${L.n}</i></h4>
      <p>${esc(L.note)}</p>
      <s><a href="${esc(L.gen)}">${esc(L.gen)}</a> &rarr; ${esc(L.out)}</s>
    </article>`).join('\n')}
    <article class="tin kb">
      <h4>Knowledge base<i>${KB}</i></h4>
      <p>Every entry carries a test — the thing you could do that would show it
        false. Citations are checked against the filesystem at build time.</p>
      <s><a href="kb.mjs">kb.mjs</a> &rarr; <a href="kb.html">kb.html</a></s>
    </article>
  </div>

  <h2>The workshop <b>${SHOP.length} generators</b></h2>
  <p class="n">Nothing in this yard is maintained by hand that could be counted
    instead. Run any of these and it rereads the directory it owns.</p>
  <div class="shop">
${SHOP.map(([f, what]) => `    <div class="tool"><a href="${esc(f)}">${esc(f)}</a><span>${esc(what)}</span></div>`).join('\n')}
  </div>

  <footer>
    Generated by <a href="arcade.mjs">arcade.mjs</a> from the directory
    &mdash; ${cabs.length} pages read, every figure counted from the file
    rather than declared. ${tot('radios')} radio groups, ${tot('boxes')}
    checkboxes, ${tot('counters')} counter declarations, ${tot('rules')} uses
    of <code>:has()</code>. automat.js and devmode.js do not count toward
    &ldquo;runs&rdquo;, because they are inert without a query string.
    <br><a href="index.html">the yard</a> &middot;
    <a href="kb.html">the knowledge base</a> &middot;
    <a href="guild.html">the guild</a> &middot;
    <a href="automat.html">the automat</a>
  </footer>
</div>
`);

const wingTotal = WINGS.reduce((a, w) => a + w.list.length, 0);
console.log(`arcade.html · ${cabs.length + wingTotal} cabinets`);
halls.forEach((h) => console.log(`  ${h.name.padEnd(20)} ${h.list.length}`));
WINGS.forEach((w) => console.log(`  ${w.name.padEnd(20)} ${w.list.length}`));
console.log(`  ${LAYERS.length} data layers · ${LAYERS.reduce((a, L) => a + L.n, 0)} files · ` +
  `${KB} kb entries · ${SHOP.length} generators`);
console.log(`  ${tot('radios')} radio groups · ${tot('boxes')} checkboxes · ` +
  `${tot('counters')} counters · ${tot('rules')} :has()`);

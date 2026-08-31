#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   cistern.mjs — builds cistern.html: the command centre round the water, and
   the number that decides whether it is ready.

   "THE TWIN THAT EARTH COULD HAVE BECOME" is the right framing and it has an
   arithmetic behind it that almost nobody states, because it is the opposite
   of what everyone assumes.

   Venus is closer to the Sun and gets 1.91 times the flux. Everyone stops
   there. But Venus is also the most reflective body in the inner system —
   Bond albedo 0.77 against Earth's 0.306 — and when you put those two facts
   together and work out what each planet actually ABSORBS, Venus absorbs
   LESS. About 150 W/m² against Earth's 236.

   So the 737 K surface is not a sunlight story at all. Every kelvin of it is
   greenhouse, and the file computes both greenhouse terms to show the size of
   the difference: Earth's is about 34 K and Venus's about 510 K. That is the
   divergence, in one pair of numbers.

   ── which decides the water question ────────────────────────────────────
   The deuterium-to-hydrogen ratio in Venus's atmosphere is roughly 150 times
   Earth's. Hydrogen escapes and deuterium is twice as heavy and escapes more
   slowly, so an enrichment like that is the fingerprint of a large amount of
   water having been photodissociated and the light half having left. Venus
   had an ocean and lost it, which is precisely why "could have become" is the
   correct tense.

   THEREFORE: water on Venus is not a supply problem, because there is no
   supply. It is a CLOSURE problem, and this file works out the only number
   that matters.

   ── the lever ───────────────────────────────────────────────────────────
   Make-up mass scales with (1 − r), where r is the recovery ratio. That is a
   reciprocal, so the leverage is enormous at the top end and the file prints
   it rather than describing it: the step from 98% to 99.9% recovery cuts the
   shipment by a factor of twenty. Nothing available in propulsion comes near
   that, and it is engineering you can do on a bench on Earth.

       node cistern.mjs
   ═══════════════════════════════════════════════════════════════════════════ */
import { writeFileSync } from 'node:fs';

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const n0 = (x) => Math.round(x).toLocaleString();
const n1 = (x) => x.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const n2 = (x) => x.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ═══ 1 · the divergence, computed ═════════════════════════════════════ */
const SIGMA = 5.670374419e-8;          /* Stefan–Boltzmann */
const S0 = 1361;                       /* solar constant at 1 AU, W/m² */

const BODY = [
  { id: 'venus', name: 'Venus', au: 0.7233, albedo: 0.77,  surface: 737, mass: 0.815, radius: 0.9499 },
  { id: 'earth', name: 'Earth', au: 1.0000, albedo: 0.306, surface: 288, mass: 1.000, radius: 1.0000 }
];

const worlds = BODY.map((b) => {
  const flux = S0 / (b.au * b.au);                 /* what arrives, W/m² */
  const absorbed = flux / 4 * (1 - b.albedo);      /* averaged over the sphere */
  const teff = Math.pow(absorbed / SIGMA, 0.25);   /* with no atmosphere */
  const greenhouse = b.surface - teff;
  return { ...b, flux, absorbed, teff, greenhouse };
});
const V = worlds[0], E = worlds[1];
const fluxRatio = V.flux / E.flux;
const absorbedRatio = V.absorbed / E.absorbed;
const ghRatio = V.greenhouse / E.greenhouse;

/* the fingerprint of the lost ocean */
const DH_RATIO = 150;                  /* Venus D/H against Earth's, approximate */
const WATER_PPM = 20;                  /* present atmospheric water, by volume */
const EARTH_OCEAN_KG = 1.35e21;

/* ═══ 2 · closure: the only number that matters ════════════════════════ */
const CREW = 20;                       /* the two wings and the two officers */
const PER_HEAD_KG = 25;                /* drinking, food prep, hygiene, laundry */
const DAILY = CREW * PER_HEAD_KG;      /* kg a day, through the loop */
const SYNODIC_D = 583.92;              /* between resupply windows */
const PASSAGE_D = 146;                 /* and how long a shipment is in transit */

const LADDER = [0.80, 0.90, 0.95, 0.98, 0.99, 0.995, 0.999, 0.9995];
const rungs = LADDER.map((r) => {
  const perDay = DAILY * (1 - r);                  /* make-up, kg/day */
  const perWindow = perDay * SYNODIC_D;            /* kg per resupply cycle */
  const perYear = perDay * 365.25;
  return { r, perDay, perWindow, perYear };
});
const base = rungs.find((x) => x.r === 0.98);
const top = rungs.find((x) => x.r === 0.999);
const lever = base.perWindow / top.perWindow;

/* the reserve: with a tank of a given size, how long does the site last if a
   window is missed entirely? */
const TANKS = [5000, 12000, 30000];
const holdout = (tank, r) => tank / (DAILY * (1 - r));   /* days */

/* what a missed window actually costs you in days you must survive */
const MISSED = SYNODIC_D + PASSAGE_D;

/* ═══ 3 · the command centre ═══════════════════════════════════════════ */
/* What has to sit inside the ring, and why. Ordered by how fast its failure
   kills you, because that is the only ordering that means anything. */
const RING = [
  ['The loop', 'reclaim, distil, polish', 'hours',
   'The whole site is downstream of it. Everything else on this list exists to keep it running.'],
  ['The tank', 'the reserve, and the only true buffer', 'days to months',
   'It is not storage, it is TIME. Its size is measured in how long it lets you fix something.'],
  ['Power', 'the loop is a pump and a still', 'hours',
   'A closed water loop is an energy device wearing a plumbing costume. Lose power and the loop is a tank with a lid.'],
  ['The assay', 'what is actually in the water', 'weeks',
   'Recovery ratio is meaningless without knowing what is being recovered. An unmeasured loop is an open loop with extra steps.'],
  ['Spares', 'membranes, seals, the parts that wear', 'one window',
   'The only items on the manifest whose absence is unrecoverable, because you cannot make a membrane on the deck.'],
  ['The register', 'every litre in and out, signed', 'a career',
   'A loop nobody audits drifts, and drift in a closed system is invisible until it is a cliff.']
];

/* ═══ 4 · the page ═════════════════════════════════════════════════════ */
const html = '<!doctype html>\n<html lang="en">\n<head>\n' +
'<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n' +
'<title>The cistern &middot; the command centre round the water</title>\n' +
'<!-- No off-origin requests. Every figure computed in cistern.mjs. -->\n' +
'<style>\n' +
`  :root{
    --deep:#080c10; --panel:#0f151b; --edge:#1c262f; --edge2:#2a3743;
    --ink:#dfe6ea; --dim:#8a949c; --faint:#5a646c;
    --water:#4d94ad; --hot:#c2603c; --cool:#6f9fb5; --gold:#c9a227; --good:#6f9d63;
    --serif:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;
    --mono:ui-monospace,"Cascadia Mono",Consolas,"SF Mono",Menlo,monospace;
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--deep);color:var(--ink);
    font:17px/1.72 var(--serif);padding:46px 22px 100px}
  main{max-width:920px;margin:0 auto}
  a{color:var(--water)}
  .kick{margin:0 0 9px;font:400 9px/1 var(--mono);letter-spacing:.34em;
    text-transform:uppercase;color:var(--water)}
  h1{margin:0 0 8px;font:500 42px/1.06 var(--serif)}
  .sub{margin:0 0 30px;font:italic 400 19px/1.5 var(--serif);color:var(--dim);max-width:64ch}
  h2{margin:52px 0 12px;font:500 27px/1.2 var(--serif);
    padding-bottom:8px;border-bottom:1px solid var(--edge)}
  h2 s{text-decoration:none;display:block;margin-bottom:5px;
    font:400 8.5px/1 var(--mono);letter-spacing:.22em;text-transform:uppercase;color:var(--water)}
  p{margin:0 0 15px;max-width:74ch} b{font-weight:600}

  .vs{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr));
    gap:14px;margin:24px 0}
  .w{background:var(--panel);border:1px solid var(--edge);padding:18px 20px}
  .w.v{border-top:2px solid var(--hot)} .w.e{border-top:2px solid var(--cool)}
  .w h3{margin:0 0 12px;font:600 22px/1.2 var(--serif)}
  .w dl{margin:0;display:grid;grid-template-columns:1fr auto;gap:7px 12px;
    font:400 12px/1.4 var(--mono)}
  .w dt{color:var(--faint)} .w dd{margin:0;text-align:right;font-variant-numeric:tabular-nums}
  .w dd.hi{color:var(--gold);font-weight:600}
  .w .gh{margin-top:14px;padding-top:12px;border-top:1px solid var(--edge)}
  .w .gh u{display:block;text-decoration:none;font:400 8px/1.3 var(--mono);
    letter-spacing:.14em;text-transform:uppercase;color:var(--faint);margin-bottom:5px}
  .w .gh b{font:400 30px/1 var(--mono);font-weight:400}
  .w.v .gh b{color:var(--hot)} .w.e .gh b{color:var(--cool)}

  .flip{margin:26px 0;padding:22px 24px;background:#101a20;border-left:3px solid var(--hot)}
  .flip h4{margin:0 0 10px;font:400 8.5px/1 var(--mono);letter-spacing:.22em;
    text-transform:uppercase;color:var(--hot)}
  .flip p:last-child{margin:0}

  .scroll{overflow-x:auto;margin:22px 0}
  table{width:100%;border-collapse:collapse;min-width:640px;font:400 12.5px/1.5 var(--mono)}
  th{text-align:right;padding:0 11px 9px 0;color:var(--faint);font-weight:400;
    font-size:8px;letter-spacing:.14em;text-transform:uppercase;
    border-bottom:1px solid var(--edge2)}
  th:first-child,td:first-child{text-align:left}
  td{padding:9px 11px 9px 0;border-bottom:1px solid #151d24;text-align:right;
    font-variant-numeric:tabular-nums}
  td.d{text-align:left;color:var(--dim);font:400 13px/1.4 var(--serif)}
  tr.here td{background:#141f26}
  tr.best td{background:#132019;color:var(--good)}
  .bar{display:block;height:6px;background:#18242c;margin-top:4px}
  .bar i{display:block;height:100%;background:var(--water)}

  .lever{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(200px,100%),1fr));
    gap:1px;background:var(--edge);border:1px solid var(--edge);margin:24px 0}
  .lever div{background:var(--panel);padding:17px 16px}
  .lever u{display:block;text-decoration:none;font:400 8px/1.3 var(--mono);
    letter-spacing:.14em;text-transform:uppercase;color:var(--faint);margin-bottom:7px}
  .lever b{font:400 28px/1.1 var(--mono);color:var(--ink);font-weight:400;
    font-variant-numeric:tabular-nums}
  .lever b.big{color:var(--gold)}
  .lever s{display:block;text-decoration:none;margin-top:7px;
    font:400 11px/1.55 var(--serif);color:var(--dim)}

  .ring{margin:22px 0}
  .r{display:grid;grid-template-columns:150px 1fr;gap:0;background:var(--panel);
    border:1px solid var(--edge);margin-bottom:8px}
  .r .h{padding:14px 16px;border-right:1px solid var(--edge)}
  .r .h b{display:block;font:600 16px/1.25 var(--serif)}
  .r .h span{display:block;margin-top:4px;font:400 9px/1.4 var(--mono);color:var(--faint)}
  .r .t{padding:14px 16px}
  .r .t em{font-style:normal;display:inline-block;margin-bottom:6px;
    font:400 8px/1 var(--mono);letter-spacing:.14em;text-transform:uppercase;
    color:var(--hot);border:1px solid #3d2a22;padding:4px 7px}
  .r .t p{margin:0;font-size:14px;color:var(--dim)}

  footer{margin-top:66px;padding-top:20px;border-top:1px solid var(--edge);
    color:var(--faint);font:400 11.5px/1.85 var(--mono)}
</style>\n</head>\n<body>\n<main>\n` +

'<p class="kick">Venus &middot; the command centre</p>\n' +
'<h1>The cistern</h1>\n' +
'<p class="sub">Water readiness is not a supply question, because there is no ' +
'supply. It is one number, and this works out how much that number is worth.</p>\n' +

'<h2><s>the twin</s>Venus absorbs less sunlight than Earth</h2>\n' +
'<p>The framing is right and the usual arithmetic behind it is wrong. Venus is ' +
'nearer the Sun and receives <b>' + n2(fluxRatio) + '&times;</b> the flux, and ' +
'almost everyone stops there. But Venus is also the most reflective body in the ' +
'inner system &mdash; a Bond albedo of <b>' + V.albedo + '</b> against ' +
'Earth&rsquo;s <b>' + E.albedo + '</b> &mdash; and what decides a temperature is ' +
'not what arrives, it is what is <em>absorbed</em>.</p>\n' +
'<div class="vs">\n' +
worlds.map((w) => '  <div class="w ' + (w.id === 'venus' ? 'v' : 'e') + '">\n' +
'    <h3>' + esc(w.name) + '</h3>\n' +
'    <dl><dt>distance</dt><dd>' + n1(w.au * 100) / 100 + ' AU</dd>' +
'<dt>flux arriving</dt><dd>' + n0(w.flux) + ' W/m&sup2;</dd>' +
'<dt>Bond albedo</dt><dd>' + w.albedo + '</dd>' +
'<dt>absorbed</dt><dd class="hi">' + n0(w.absorbed) + ' W/m&sup2;</dd>' +
'<dt>without air</dt><dd>' + n0(w.teff) + ' K</dd>' +
'<dt>surface</dt><dd>' + n0(w.surface) + ' K</dd></dl>\n' +
'    <div class="gh"><u>greenhouse</u><b>+' + n0(w.greenhouse) + ' K</b></div>\n' +
'  </div>').join('\n') + '\n</div>\n' +

'<div class="flip">\n' +
'  <h4>the inversion</h4>\n' +
'  <p>Venus absorbs <b>' + n0(V.absorbed) + ' W/m&sup2;</b>. Earth absorbs ' +
'<b>' + n0(E.absorbed) + '</b>. Venus takes in <b>' + Math.round(absorbedRatio * 100) +
'%</b> of what Earth does &mdash; less, despite being closer, because the clouds ' +
'send most of it straight back.</p>\n' +
'  <p>Which means <b>not one kelvin</b> of that 737 K surface is a sunlight ' +
'story. Bare, Venus would sit at ' + n0(V.teff) + ' K and Earth at ' + n0(E.teff) +
' &mdash; Venus <em>colder</em>. The entire difference is greenhouse: +' +
n0(E.greenhouse) + ' K on Earth against +' + n0(V.greenhouse) + ' K on Venus, a ' +
'factor of <b>' + n0(ghRatio) + '</b>.</p>\n' +
'  <p>That is the twin story stated properly. The two planets did not diverge ' +
'because one is nearer the fire. They diverged because one of them lost control ' +
'of its own atmosphere, and the run to 737 K was the consequence rather than the ' +
'cause.</p>\n' +
'</div>\n' +

'<h2><s>the fingerprint</s>It had an ocean and it left</h2>\n' +
'<p>Hydrogen escapes a planet. Deuterium is twice the mass and escapes more ' +
'slowly, so anything that loses a lot of hydrogen ends up enriched in the heavy ' +
'kind. Venus&rsquo;s deuterium-to-hydrogen ratio is roughly <b>' + DH_RATIO +
'&times;</b> Earth&rsquo;s.</p>\n' +
'<p>That is not an inference about climate, it is a measurement of what left. ' +
'Water was split by ultraviolet, the hydrogen went to space, the oxygen went ' +
'into the rock, and what remains in the air today is about <b>' + WATER_PPM +
' parts per million</b>. Earth holds ' + (EARTH_OCEAN_KG / 1e21).toFixed(2) +
' &times; 10<sup>21</sup> kg of ocean. Venus holds a haze.</p>\n' +
'<p>So there is nothing to drill for and nothing to melt, and the white ' +
'paper already priced the alternative: freeing one per cent of an ocean by ' +
'heating the atmosphere costs <b>6,618 K</b>, which is self-defeating on energy ' +
'before any engineering question is reached. <b>Water on the deck is a closure ' +
'problem.</b></p>\n' +

'<h2><s>the only number</s>Recovery ratio, and what it is worth</h2>\n' +
'<p>A crew of <b>' + CREW + '</b> &mdash; the two wings and the two officers ' +
'&mdash; moves about <b>' + PER_HEAD_KG + ' kg a head each day</b> through the ' +
'loop: drinking, food preparation, hygiene, laundry. That is <b>' + n0(DAILY) +
' kg a day</b> in circulation, and circulation is free. What is not free is the ' +
'fraction the loop fails to give back.</p>\n' +
'<p>Make-up mass goes as <b>(1 &minus; r)</b>. That is a reciprocal, so the ' +
'leverage all lives at the top end where it is least obvious:</p>\n' +
'<div class="scroll"><table>\n' +
'<tr><th>recovery</th><th>make-up per day</th><th>per year</th>' +
'<th>per ' + n0(SYNODIC_D) + '-day window</th><th></th></tr>\n' +
rungs.map((x) => {
  const cls = x.r === 0.98 ? 'here' : x.r === 0.999 ? 'best' : '';
  const w = Math.round(x.perWindow / rungs[0].perWindow * 100);
  return '<tr class="' + cls + '"><td class="d"><b>' + (x.r * 100).toFixed(2).replace(/\.?0+$/, '') +
    '%</b>' + (x.r === 0.98 ? ' <span style="color:var(--faint)">&larr; the station standard</span>' : '') +
    '</td><td>' + n1(x.perDay) + ' kg</td><td>' + n0(x.perYear) + ' kg</td>' +
    '<td><b>' + n0(x.perWindow) + ' kg</b><span class="bar"><i style="width:' + w + '%"></i></span></td>' +
    '<td class="d">' + (x.r === 0.98 ? 'what flies today' : x.r === 0.999 ? 'the target' : '') +
    '</td></tr>';
}).join('\n') + '\n</table></div>\n' +

'<div class="lever">\n' +
'  <div><u>at 98%</u><b>' + n0(base.perWindow) + ' kg</b><s>shipped every window, ' +
   'for twenty people</s></div>\n' +
'  <div><u>at 99.9%</u><b>' + n0(top.perWindow) + ' kg</b><s>same people, same ' +
   'window</s></div>\n' +
'  <div><u>the lever</u><b class="big">' + n0(lever) + '&times;</b><s>from 1.9 ' +
   'percentage points of recovery</s></div>\n' +
'  <div><u>where the work is</u><b>on a bench</b><s>on Earth, before anything ' +
   'launches</s></div>\n' +
'</div>\n' +
'<p>Twenty times less mass, from a change of under two percentage points. ' +
'Nothing available in propulsion comes close to that, and unlike propulsion it ' +
'is bench work that can be done here, now, and finished before a vehicle is ' +
'chosen. <b>If one number in this programme deserves a dedicated team, it is ' +
'this one.</b></p>\n' +

'<h2><s>the buffer</s>What the tank actually buys</h2>\n' +
'<p>A tank is not storage. It is <b>time</b> &mdash; how long the site keeps ' +
'going while somebody fixes the thing that broke, or while a missed window ' +
'comes round again. A missed window costs <b>' + n0(MISSED) + ' days</b>: ' +
n0(SYNODIC_D) + ' until the next alignment plus ' + n0(PASSAGE_D) + ' in transit.</p>\n' +
'<div class="scroll"><table>\n' +
'<tr><th>reserve</th>' + LADDER.filter((r) => r >= 0.95)
  .map((r) => '<th>at ' + (r * 100).toFixed(1).replace(/\.0$/, '') + '%</th>').join('') +
'</tr>\n' +
TANKS.map((t) => '<tr><td class="d"><b>' + n0(t) + ' kg</b></td>' +
  LADDER.filter((r) => r >= 0.95).map((r) => {
    const d = holdout(t, r);
    const ok = d >= MISSED;
    return '<td' + (ok ? ' style="color:var(--good)"' : '') + '>' +
      (d >= 3650 ? n1(d / 365.25) + ' yr' : n0(d) + ' d') + '</td>';
  }).join('') + '</tr>').join('\n') + '\n</table></div>\n' +
'<p>Green is a reserve that survives a completely missed window. Read the ' +
'table the other way and it says something sharper: at 95% recovery a ' +
n0(TANKS[2]) + ' kg tank &mdash; thirty tonnes, an entire shipment &mdash; buys ' +
'you ' + n0(holdout(TANKS[2], 0.95)) + ' days. At 99.9% a tank of ' + n0(TANKS[0]) +
' kg buys ' + n1(holdout(TANKS[0], 0.999) / 365.25) + ' years. <b>Recovery ratio ' +
'is worth more than tankage, and it is worth more per kilogram than anything ' +
'else on the manifest.</b></p>\n' +

'<h2><s>the command centre</s>What sits inside the ring</h2>\n' +
'<p>Ordered by how fast its failure kills you, because no other ordering means ' +
'anything. The castle plans put the keep on the motte and everything else ' +
'around it; here the loop is the keep.</p>\n' +
'<div class="ring">\n' +
RING.map(([n, w, t, why]) => '  <div class="r">\n' +
'    <div class="h"><b>' + esc(n) + '</b><span>' + esc(w) + '</span></div>\n' +
'    <div class="t"><em>fails in ' + esc(t) + '</em><p>' + esc(why) + '</p></div>\n' +
'  </div>').join('\n') + '\n</div>\n' +
'<p>The ordering is the design. A curtain wall goes round the thing that cannot ' +
'be lost, and on this deck that is not the people and not the seed &mdash; it is ' +
'the loop, because everybody and everything else is downstream of it within ' +
'hours. Build the command centre round the cistern and the rest of the plan ' +
'arranges itself, which is exactly what a motte does.</p>\n' +

'<footer>\n' +
'Computed by <a href="cistern.mjs">cistern.mjs</a>. Absorbed flux from ' +
'S&#8320;/(4a&sup2;)&middot;(1&minus;A) with S&#8320; = ' + S0 + ' W/m&sup2;; ' +
'effective temperature from Stefan&ndash;Boltzmann. Albedos and surface ' +
'temperatures are published values; the D/H ratio is approximate and the ' +
'literature range is wide. Closure figures are per a crew of ' + CREW + ' at ' +
PER_HEAD_KG + ' kg a head a day.<br>\n' +
'<a href="paper.html">the white paper</a> &middot; ' +
'<a href="corps.html">the order of battle</a> &middot; ' +
'<a href="castle.html">the plans</a> &middot; <a href="dev.html">the hub</a>\n' +
'</footer>\n</main>\n</body>\n</html>\n';

writeFileSync('cistern.html', html);

console.log('cistern.html');
console.log('  flux at Venus ' + n0(V.flux) + ' W/m2 = ' + n2(fluxRatio) + 'x Earth');
console.log('  BUT absorbed: Venus ' + n0(V.absorbed) + ' vs Earth ' + n0(E.absorbed) +
  ' W/m2 — Venus takes ' + Math.round(absorbedRatio * 100) + '% of what Earth does');
console.log('  bare: Venus ' + n0(V.teff) + ' K, Earth ' + n0(E.teff) +
  ' K — Venus is the COLDER of the two without an atmosphere');
console.log('  greenhouse: Earth +' + n0(E.greenhouse) + ' K, Venus +' +
  n0(V.greenhouse) + ' K — a factor of ' + n0(ghRatio));
console.log('\n  closure, crew of ' + CREW + ' at ' + n0(DAILY) + ' kg/day through the loop:');
rungs.forEach((x) => console.log('    ' + (x.r * 100).toFixed(2).padStart(6) + '%  ' +
  n1(x.perDay).padStart(6) + ' kg/day  ' + n0(x.perWindow).padStart(7) + ' kg per window'));
console.log('  the lever: 98% -> 99.9% cuts the shipment ' + n0(lever) + 'x');
console.log('  a missed window is ' + n0(MISSED) + ' days to survive');

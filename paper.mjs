#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   paper.mjs — builds paper.html: the white paper on the biome.

   A prospectus that leads with what fails. Every number below is computed in
   this file from published constants, and the calculation is shown next to
   the claim, because a prospectus whose figures cannot be checked is a
   brochure.

   THE ONE THING TO BE CLEAR ABOUT UP FRONT: this is a design study written
   out of a working repository. It is not a company, nothing has been raised,
   and neither of the two people it is addressed to has any involvement in it,
   has been approached about it, or has said anything about it. They are
   addressed because of what they have publicly built, and the page says so
   plainly rather than implying otherwise.

       node paper.mjs
   ═══════════════════════════════════════════════════════════════════════════ */
import { writeFileSync } from 'node:fs';

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const f = (n, d = 2) => Number(n).toLocaleString('en-US',
  { minimumFractionDigits: d, maximumFractionDigits: d });

/* ═══ constants ════════════════════════════════════════════════════════ */
const AU = 1.495978707e11;              /* m */
const MU = 1.32712440018e20;            /* m^3/s^2, the Sun */
const R_E = 1.0 * AU, R_V = 0.7233 * AU;
const DAY = 86400;

/* ═══ 1 · transit: how much does going faster cost? ════════════════════
   The Hohmann transfer is the cheapest and the slowest. Drop the transfer
   orbit's perihelion below Venus and you arrive earlier and faster, and you
   pay for both. This computes the whole curve rather than quoting one point,
   because "way shorter than six months" is a budget question and the budget
   is the thing that has a number. */
function transfer(qAU) {
  const q = qAU * AU;
  const a = (R_E + q) / 2;
  const e = (R_E - q) / (R_E + q);
  const n = Math.sqrt(MU / (a * a * a));

  /* true anomaly where the transfer orbit crosses Venus's radius */
  const cosNu = (a * (1 - e * e) / R_V - 1) / e;
  if (cosNu < -1 || cosNu > 1) return null;      /* never reaches it */
  const nu = Math.acos(Math.max(-1, Math.min(1, cosNu)));

  /* aphelion is departure. Travel inward: nu runs from pi down to nu. */
  const E = Math.acos(Math.max(-1, Math.min(1, (e + Math.cos(nu)) / (1 + e * Math.cos(nu)))));
  const M = E - e * Math.sin(E);
  const days = (Math.PI - M) / n / DAY;

  /* what you burn at Earth. Speed at the transfer orbit's aphelion against
     Earth's own circular speed; coplanar and tangential, so the difference
     IS the hyperbolic excess. */
  const vAp = Math.sqrt(MU * (2 / R_E - 1 / a));
  const vE = Math.sqrt(MU / R_E);
  const vInf = Math.abs(vE - vAp);
  const c3 = (vInf / 1000) ** 2;                 /* km^2/s^2 */

  /* and what you arrive with, relative to Venus, which an atmosphere that
     thick can take out of you for free */
  const vPer = Math.sqrt(MU * (2 / R_V - 1 / a));
  const vTan = Math.sqrt(MU * a * (1 - e * e)) / R_V;
  const vRad = Math.sqrt(Math.max(0, vPer * vPer - vTan * vTan));
  const vVen = Math.sqrt(MU / R_V);
  const vArr = Math.sqrt((vTan - vVen) ** 2 + vRad * vRad);

  return { q: qAU, days, c3, vInf: vInf / 1000, vArr: vArr / 1000, e };
}

const hohmann = transfer(R_V / AU);
const curve = [0.7233, 0.62, 0.52, 0.42, 0.34, 0.28, 0.22]
  .map(transfer).filter(Boolean);
const under100 = curve.find((t) => t.days < 100);
const fastest = curve[curve.length - 1];

/* ═══ 2 · the deck ═════════════════════════════════════════════════════ */
const DECK_KM = 55;
const G_VENUS = 8.87, G_EARTH = 9.80665;        /* m/s^2 at the surface */
const G_DECK = 8.71;                             /* at 55 km */
const WEIGHT = G_DECK / G_EARTH;
const SHIELD = 574;                              /* g/cm^2 above 55 km */
const SHIELD_EARTH = 1033;                       /* g/cm^2 at sea level */
const LAPSE = 9.5;                               /* K/km */
const SOL_D = 116.75, SIDEREAL_D = 243.02, SYNODIC_D = 583.92;
const LIGHT_MIN = 4.94;

/* settling: Stokes velocity goes as g, and inertia does not change at all.
   So a grain falls 11.2 per cent slower and is carried that much further by
   the same current. */
const SETTLE = 1 - WEIGHT;
const CARRY = (1 / WEIGHT - 1);

/* ═══ 3 · what fails, in numbers ═══════════════════════════════════════ */
/* a forest, from hydrogen you would have to bring */
const FOREST_MT_H = 2888;                        /* megatonnes */
const SHIP_T_PER_YR = 7.2;                       /* generous: tonnes/yr sustained */
const SHIP_YEARS = FOREST_MT_H * 1e6 / SHIP_T_PER_YR / 1e6;   /* million years */

/* water by heating: every kelvin of atmospheric heating liberates this much */
const KG_PER_K = 2.04e15;
const OCEAN_KG = 1.35e21;
const ONE_PC_K = (OCEAN_KG * 0.01) / KG_PER_K;

/* a river is a different order of thing entirely */
const RIVER_KG = 4.5e10;
const RIVER_K = RIVER_KG / KG_PER_K;

/* Rossby: below this scale rotation does not organise a storm */
const ROSSBY_KM = 2363;
const VORTEX_KM = 2000;

/* residence time: how much of the site's phosphorus is available at once */
const P_AVAILABLE = 1.2;                          /* per cent */

/* nitrogen: Venus has more of it than Earth does, and it is the one thing a
   sealed deck cannot make */
const N_RATIO = 4.3;

/* ═══ 4 · the page ═════════════════════════════════════════════════════ */
const html = '<!doctype html>\n<html lang="en">\n<head>\n' +
'<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n' +
'<title>The deck at fifty-five kilometres</title>\n' +
'<!-- No off-origin requests. Every figure is computed in paper.mjs. -->\n' +
'<style>\n' +
`  :root{
    --paper:#faf7f0; --paper2:#f2ede1; --ink:#1e1c18; --dim:#5f5a50;
    --faint:#8d8678; --rule:#ddd5c4; --edge:#cabfa8;
    --acid:#9a6b1f; --deep:#2e4a52; --red:#9d4032; --green:#4d6b3f;
    --serif:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;
    --mono:ui-monospace,"Cascadia Mono",Consolas,"SF Mono",Menlo,monospace;
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--paper);color:var(--ink);
    font:17px/1.72 var(--serif);padding:52px 22px 100px}
  main{max-width:820px;margin:0 auto}
  a{color:var(--deep)}

  .mast{border-bottom:2px solid var(--ink);padding-bottom:20px;margin-bottom:30px}
  .kicker{margin:0 0 10px;font:400 9px/1 var(--mono);letter-spacing:.36em;
    text-transform:uppercase;color:var(--acid)}
  h1{margin:0 0 8px;font:500 44px/1.06 var(--serif);letter-spacing:-.01em}
  .sub{margin:0;font:italic 400 19px/1.5 var(--serif);color:var(--dim);max-width:60ch}
  .to{margin:22px 0 0;padding:15px 17px;background:var(--paper2);
    border-left:2px solid var(--edge);font:400 13.5px/1.7 var(--serif);color:var(--dim)}
  .to b{color:var(--ink);font-weight:600}
  .to em{display:block;margin-top:9px;font-style:normal;
    font:400 11.5px/1.65 var(--mono);color:var(--faint)}

  h2{margin:52px 0 14px;font:500 27px/1.2 var(--serif);
    padding-bottom:8px;border-bottom:1px solid var(--rule)}
  h2 s{text-decoration:none;display:block;margin-bottom:5px;
    font:400 8.5px/1 var(--mono);letter-spacing:.22em;text-transform:uppercase;
    color:var(--acid)}
  h3{margin:32px 0 8px;font:600 18px/1.3 var(--serif)}
  p{margin:0 0 15px}
  b{font-weight:600}
  .lead{font-size:19px;line-height:1.68}

  .fig{margin:24px 0;padding:18px 20px;background:var(--paper2);
    border-left:3px solid var(--acid)}
  .fig.bad{border-left-color:var(--red)}
  .fig.good{border-left-color:var(--green)}
  .fig h4{margin:0 0 9px;font:400 8.5px/1 var(--mono);letter-spacing:.2em;
    text-transform:uppercase;color:var(--acid)}
  .fig.bad h4{color:var(--red)} .fig.good h4{color:var(--green)}
  .fig .big{font:400 33px/1.1 var(--mono);color:var(--ink);margin:0 0 8px;
    font-variant-numeric:tabular-nums}
  .fig p{margin:0 0 9px;font-size:15.5px;line-height:1.68;color:var(--dim)}
  .fig p:last-child{margin:0}
  .fig .calc{font:400 11.5px/1.75 var(--mono);color:var(--faint);
    margin-top:11px;padding-top:10px;border-top:1px solid var(--edge)}

  .scroll{overflow-x:auto;margin:24px 0}
  table{width:100%;border-collapse:collapse;min-width:560px;
    font:400 13px/1.5 var(--mono)}
  th{text-align:right;padding:0 12px 9px 0;color:var(--faint);font-weight:400;
    font-size:8.5px;letter-spacing:.15em;text-transform:uppercase;
    border-bottom:1px solid var(--edge)}
  th:first-child,td:first-child{text-align:left}
  td{padding:9px 12px 9px 0;border-bottom:1px solid var(--rule);text-align:right;
    font-variant-numeric:tabular-nums}
  tr.now td{background:#efe8d6;font-weight:600}
  td.d{color:var(--faint);text-align:left}

  .split{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr));
    gap:16px;margin:24px 0}
  .col{background:var(--paper2);border:1px solid var(--rule);padding:17px 19px}
  .col h4{margin:0 0 8px;font:600 16px/1.3 var(--serif)}
  .col p{margin:0;font-size:14.5px;line-height:1.7;color:var(--dim)}
  .col.no{border-top:2px solid var(--red)}
  .col.yes{border-top:2px solid var(--green)}

  blockquote{margin:26px 0;padding:0 0 0 22px;border-left:2px solid var(--acid);
    font:italic 400 19px/1.6 var(--serif);color:var(--dim)}

  .ask{margin:34px 0;padding:24px 26px;border:1px solid var(--ink)}
  .ask h4{margin:0 0 12px;font:400 9px/1 var(--mono);letter-spacing:.22em;
    text-transform:uppercase;color:var(--acid)}
  ol{padding-left:22px} li{margin-bottom:9px}

  footer{margin-top:70px;padding-top:20px;border-top:1px solid var(--rule);
    color:var(--faint);font:400 12px/1.85 var(--mono)}
  footer a{color:var(--acid)}
</style>\n</head>\n<body>\n<main>\n` +

/* ── masthead ────────────────────────────────────────────────────────── */
'<div class="mast">\n' +
'  <p class="kicker">White paper &middot; Venus Inc &middot; the biome programme</p>\n' +
'  <h1>The deck at fifty-five kilometres</h1>\n' +
'  <p class="sub">Why the interesting object on Venus is a sealed biome in the ' +
'cloud layer, what it costs, and the four ways it fails.</p>\n' +
'  <div class="to">\n' +
'    Addressed to <b>Jed McCaleb</b> and <b>Mark Zuckerberg</b>, for reasons ' +
'given in the last section &mdash; briefly, one of you builds habitats and ' +
'settlement rails, and the other funds science with a payback measured in ' +
'decades. This document argues something that needs both.\n' +
'    <em>Neither has been approached about this, has any involvement in it, ' +
'or has said anything about it. This is a design study written out of a ' +
'working repository, not a company. Nothing has been raised and nothing is ' +
'being offered. Every figure below is computed in <a href="paper.mjs">' +
'paper.mjs</a> and the calculation is printed beside the claim, so that ' +
'disagreeing with it is a matter of checking arithmetic.</em>\n' +
'  </div>\n' +
'</div>\n' +

/* ── the thesis ──────────────────────────────────────────────────────── */
'<h2><s>the thesis</s>Stop looking at the ground</h2>\n' +
'<p class="lead">The surface of Venus is 737 K and 92 bar and it is the reason ' +
'nobody works on Venus. It is also irrelevant. At <b>' + DECK_KM + ' kilometres</b> ' +
'the pressure is one bar, the temperature is about that of a warm afternoon, and ' +
'the column of atmosphere overhead is the best radiation shield in the inner ' +
'solar system that you do not have to carry.</p>\n' +
'<p>The proposition of this paper is narrow and it is not terraforming. It is ' +
'that a <b>sealed biome</b> &mdash; a closed ecology, some hundreds of metres ' +
'across, held at that altitude &mdash; is the most interesting biological ' +
'instrument available this century, and that most of what makes it hard is not ' +
'what people assume.</p>\n' +

'<div class="split">\n' +
'  <div class="col yes"><h4>Shielding, free</h4><p>Above ' + DECK_KM + ' km there ' +
'are <b>' + SHIELD + ' g/cm&sup2;</b> of atmosphere. Earth at sea level gives you ' +
SHIELD_EARTH + '. That is <b>' + Math.round(SHIELD / SHIELD_EARTH * 100) + '%</b> ' +
'of the protection you have right now, at no mass cost, on a body with no ' +
'magnetosphere. Radiation is not the problem. The founder bottleneck is.</p></div>\n' +
'  <div class="col yes"><h4>Gravity you can stand in</h4><p><b>' + G_DECK +
' m/s&sup2;</b>, which is <b>' + f(WEIGHT * 100, 1) + '%</b> of Earth. Not a third, ' +
'not a sixth. Every closed-ecology unknown about partial gravity is a question ' +
'about a few per cent here, not about a different regime.</p></div>\n' +
'  <div class="col yes"><h4>Nitrogen, already there</h4><p>Venus&rsquo;s atmosphere ' +
'holds about <b>' + N_RATIO + '&times;</b> the nitrogen of Earth&rsquo;s. Nitrogen ' +
'is the one bulk element a sealed deck cannot manufacture and would otherwise have ' +
'to ship. It is the single largest thing the site gives you for nothing.</p></div>\n' +
'  <div class="col no"><h4>And the day is wrong</h4><p>A solar day is <b>' +
SOL_D + ' Earth days</b> against a sidereal ' + SIDEREAL_D + '. Nothing that ' +
'photosynthesises has ever evolved under a 58-day night. This is a real problem ' +
'and it is an engineering one: you light the deck, and the power budget is the ' +
'honest cost of the whole programme.</p></div>\n' +
'</div>\n' +

/* ── what fails ──────────────────────────────────────────────────────── */
'<h2><s>lead with these</s>Four things that do not work</h2>\n' +
'<p>A prospectus that opens with the upside is selling. These are the four ' +
'places the obvious plan dies, each with the arithmetic that kills it.</p>\n' +

'<div class="fig bad">\n' +
'  <h4>one &middot; you cannot ship a forest</h4>\n' +
'  <p class="big">' + f(SHIP_YEARS, 0) + ' million years</p>\n' +
'  <p>A forest of any consequence needs on the order of <b>' + f(FOREST_MT_H, 0) +
' megatonnes of hydrogen</b> &mdash; hydrogen because Venus has carbon and ' +
'nitrogen in abundance and essentially no water. At a sustained and generous ' +
'<b>' + SHIP_T_PER_YR + ' tonnes a year</b> of delivered mass, that is the figure ' +
'above.</p>\n' +
'  <p>The conclusion is not that it is impossible. It is that <b>you never ship ' +
'the harvest, you ship the thing that harvests.</b> Only the living fraction has ' +
'to arrive, and the living fraction is measured in kilograms. Everything ' +
'downstream in this paper follows from that one sentence.</p>\n' +
'  <p class="calc">' + f(FOREST_MT_H, 0) + ' Mt &times; 10&#8310; t/Mt &divide; ' +
SHIP_T_PER_YR + ' t/yr = ' + f(SHIP_YEARS * 1e6, 0) + ' yr</p>\n' +
'</div>\n' +

'<div class="fig bad">\n' +
'  <h4>two &middot; you cannot bombard an ocean into existence</h4>\n' +
'  <p class="big">' + f(ONE_PC_K, 0) + ' K</p>\n' +
'  <p>Water on Venus is chemically present and thermodynamically locked. Heating ' +
'the atmosphere liberates it at roughly <b>' + KG_PER_K.toExponential(2) +
' kg per kelvin</b>. To free one per cent of an Earth ocean you would have to ' +
'raise the whole atmosphere by the figure above.</p>\n' +
'  <p>Note carefully what defeats this. It is not mass and it is not delivery ' +
'&mdash; it is <b>energy</b>, and the plan is self-defeating on energy before any ' +
'engineering question is reached. Every impact-and-volatiles scheme fails at this ' +
'line.</p>\n' +
'  <p class="calc">' + (OCEAN_KG * 0.01).toExponential(2) + ' kg &divide; ' +
KG_PER_K.toExponential(2) + ' kg/K = ' + f(ONE_PC_K, 0) + ' K</p>\n' +
'</div>\n' +

'<div class="fig good">\n' +
'  <h4>&hellip; but a river is not an ocean</h4>\n' +
'  <p class="big">' + RIVER_K.toExponential(1) + ' K</p>\n' +
'  <p>The same arithmetic run on a river rather than an ocean gives the number ' +
'above. A river carrying <b>' + RIVER_KG.toExponential(1) + ' kg</b> is twenty-two millionths of a ' +
'kelvin. This is the difference between a fantasy and a work ' +
'order, and it is why the programme is about a <b>deck</b> and not a planet: ' +
'everything changes by ten orders of magnitude when you stop trying to move the ' +
'whole atmosphere.</p>\n' +
'  <p class="calc">' + RIVER_KG.toExponential(1) + ' kg &divide; ' +
KG_PER_K.toExponential(2) + ' kg/K = ' + f(RIVER_K, 4) + ' K</p>\n' +
'</div>\n' +

'<div class="fig bad">\n' +
'  <h4>three &middot; you cannot dig a hurricane</h4>\n' +
'  <p class="big">' + f(ROSSBY_KM, 0) + ' km</p>\n' +
'  <p>Below the Rossby deformation radius, rotation does not organise a storm ' +
'&mdash; pressure gradients simply relax and nothing spins up. On Venus that ' +
'radius is the figure above, because the planet turns so slowly.</p>\n' +
'  <p>The confirmation was not arranged and is the reason to believe it: the only ' +
'rotating structures Venus actually has are the polar vortices, and they are ' +
'about <b>' + f(VORTEX_KM, 0) + ' km</b> across. The planet agrees with the ' +
'calculation. <b>You can dig a dust bowl. You cannot dig a hurricane.</b> Anything ' +
'in the programme that wanted a self-organising storm system is deleted.</p>\n' +
'</div>\n' +

'<div class="fig bad">\n' +
'  <h4>four &middot; the nutrients are there and not available</h4>\n' +
'  <p class="big">' + f(100 - P_AVAILABLE, 1) + '% locked</p>\n' +
'  <p>Residence time, not inventory, is what a closed system runs on. At any ' +
'instant roughly <b>' + P_AVAILABLE + '%</b> of a site&rsquo;s phosphorus is in a ' +
'form anything can take up; the rest is in transit through mineral and biological ' +
'pools. A sealed deck that sizes its nutrient budget on total inventory is ' +
'over-provisioned on paper and starving in fact.</p>\n' +
'  <p>This is the failure mode that has ended every closed-ecology experiment on ' +
'record, and it is invisible for the first two years, which is exactly how long ' +
'the stored fraction lasts.</p>\n' +
'</div>\n' +

/* ── the one advantage nobody counts ─────────────────────────────────── */
'<h2><s>the finding</s>Weight falls, inertia does not</h2>\n' +
'<p>Here is the thing about ' + f(WEIGHT * 100, 1) + '% gravity that is not in the ' +
'brochures, and it is the most useful single fact in this document.</p>\n' +
'<p><b>Weight scales. Mass does not.</b> A grain of silt on the deck weighs ' +
f(WEIGHT * 100, 1) + '% of what it weighs here, and has exactly <b>100%</b> of ' +
'the inertia. Settling velocity goes with weight; resistance to being moved goes ' +
'with mass. So the same current carries the same grain <b>' + f(CARRY * 100, 1) +
'% further</b> before it drops, and it falls <b>' + f(SETTLE * 100, 1) + '% ' +
'slower</b> when it does.</p>\n' +
'<blockquote>Sediment sorting, delta formation, soil development and every ' +
'nutrient-transport process in a water column are all functions of exactly that ' +
'ratio. The deck is not a slightly weaker Earth. It is a place where fluids ' +
'build landscape measurably better, and it is the only environment we can reach ' +
'where that is true.</blockquote>\n' +
'<p>That is the scientific case in one paragraph, and it does not depend on ' +
'anybody settling anywhere. It is a soil-physics experiment that cannot be run on ' +
'Earth, cannot be run in orbit, and cannot be run on Mars &mdash; Mars is 38% and ' +
'that is a different regime, not a control.</p>\n' +

/* ── the transit table ───────────────────────────────────────────────── */
'<h2><s>getting there</s>Six months is a choice, not a constraint</h2>\n' +
'<p>The <b>' + f(hohmann.days, 0) + '-day</b> figure everybody quotes is the ' +
'minimum-energy Hohmann transfer. It is the cheapest trajectory and therefore the ' +
'slowest one, and treating it as the transit time is a category error &mdash; it ' +
'is the transit time <em>if you are optimising for propellant and nothing ' +
'else</em>.</p>\n' +
'<p>Drop the transfer orbit&rsquo;s perihelion below Venus and you arrive sooner. ' +
'The whole curve, computed from the vis-viva equation and Kepler&rsquo;s ' +
'equation:</p>\n' +
'<div class="scroll"><table>\n' +
'<tr><th>perihelion</th><th>transit</th><th>departure C3</th><th>v&infin; at Earth</th>' +
'<th>arrival v&infin;</th><th></th></tr>\n' +
curve.map((t) => '<tr' + (t.days === hohmann.days ? ' class="now"' : '') + '>' +
  '<td>' + f(t.q, 3) + ' AU</td>' +
  '<td>' + f(t.days, 0) + ' d</td>' +
  '<td>' + f(t.c3, 1) + ' km&sup2;/s&sup2;</td>' +
  '<td>' + f(t.vInf, 2) + ' km/s</td>' +
  '<td>' + f(t.vArr, 2) + ' km/s</td>' +
  '<td class="d">' + (t.days === hohmann.days ? 'Hohmann, the quoted number'
    : t.days > 100 ? 'cheap' : t.days > 70 ? 'the useful band' : 'expensive') +
  '</td></tr>').join('\n') + '\n</table></div>\n' +
'<p>The shape of that table is the argument. Going from ' + f(hohmann.days, 0) +
' days to <b>' + f(under100.days, 0) + '</b> costs a departure C3 of ' +
f(under100.c3, 1) + ' against ' + f(hohmann.c3, 1) + ' &mdash; real, and ordinary. ' +
'Going to <b>' + f(fastest.days, 0) + ' days</b> costs ' + f(fastest.c3, 1) +
', which is a different vehicle.</p>\n' +
'<p>And the arrival column is where Venus quietly wins. You arrive faster on ' +
'every fast trajectory, and Venus has an atmosphere thick enough to take that ' +
'velocity out of you <b>for free</b>. On Mars a fast transfer is punished twice, ' +
'because the arrival burn scales too and there is not enough air to help. Here it ' +
'is punished once. <b>The relay wants short crossings, and this is the one ' +
'destination where short crossings are affordable.</b></p>\n' +
'<p>Light delay at arrival is <b>' + LIGHT_MIN + ' minutes</b> one way, so a ' +
'question and its answer is under ten. Nothing on the deck can be run by anybody ' +
'on Earth in real time, and nothing needs to be.</p>\n' +

/* ── organisation ────────────────────────────────────────────────────── */
'<h2><s>who does it</s>Nine, and one button</h2>\n' +
'<p>The unit is a <b>core of nine</b>: one sergeant, two corporals, six auxiliary ' +
'with communications among them rather than beside them. A core that carries its ' +
'own signaller reports without asking anybody&rsquo;s leave; a core that borrows ' +
'one has a choke point inside it before it leaves the ground.</p>\n' +
'<p>Two cores, a general, and a mobile rear guard who commands nobody: <b>twenty ' +
'people</b>. Three earlier arrangements were costed at 38 and 56 and rejected, ' +
'because all three are the same depth from the top to the furthest hand &mdash; ' +
'the extra people bought width and no reach.</p>\n' +
'<p>The command graph was then run through a cut-vertex routine, and the result ' +
'is the reason for the operating rule: <b>every officer is a choke point</b>, ' +
'without exception, because a tree has no second path by construction. A ' +
'structure in which every node is a choke point cannot be handed live judgement ' +
'calls. So the relay gets <b>one start and one shutdown</b> and nothing in ' +
'between. Discretion is spent once, when the order is written, and after that it ' +
'is gone. That is not a convenience. It is the whole safety argument.</p>\n' +

/* ── economics ───────────────────────────────────────────────────────── */
'<h2><s>how it settles</s>Three claims about the ledger</h2>\n' +
'<p>A programme with a hundred-year payback and no product needs a settlement ' +
'layer that does not depend on anybody&rsquo;s continued goodwill. Three ' +
'positions, each of which is a technical statement rather than a preference.</p>\n' +
'<h3>Decentralisation is about reads, not copies</h3>\n' +
'<p>A system is decentralised exactly to the extent that no component&rsquo;s ' +
'behaviour is a function of another component&rsquo;s state. A thousand mirrors of ' +
'one authoritative list is a centralised system with good uptime. The useful ' +
'question about any instrument is not how many copies exist but <b>how many reads ' +
'it performs and who can write to each one</b>.</p>\n' +
'<h3>Fungibility is destroyed by memory and nothing else</h3>\n' +
'<p>Two units are interchangeable exactly as long as nothing anybody can look up ' +
'distinguishes them. A ledger storing only balances is fungible; one storing ' +
'provenance has made them different objects wearing the same denomination, and ' +
'somebody will price the difference. This is why an openly auditable chain is ' +
'<em>less</em> fungible than a banknote, not more.</p>\n' +
'<h3>The middle hop is the only one that matters</h3>\n' +
'<p>Business to peer, peer to peer, peer to business. The middle hop is the ' +
'entire difference from every other arrangement, and whether it is real is a ' +
'graph question with a computable answer: is there any single party whose removal ' +
'disconnects issuer from redeemer? If yes, that party holds a discretion, and a ' +
'discretion is where extraction attaches. It has to be plural at <b>both</b> ends ' +
'or the choke point has only moved somewhere harder to see.</p>\n' +
'<p>The working implementation issues <b>one non-transferable token per ' +
'notebook</b>, minted client-side, never leaving the browser. It is deliberately ' +
'the least fungible object in the system because it carries provenance &mdash; ' +
'which is the point. It is not money and would be poor money. It signs authorship ' +
'so that when the best version of something is copied, the copy still says whose ' +
'it was.</p>\n' +

/* ── why these two ───────────────────────────────────────────────────── */
'<h2><s>the address</s>Why this document has two names on it</h2>\n' +
'<p>Because the programme needs two things that almost never sit in the same ' +
'balance sheet, and each of you has publicly built one of them.</p>\n' +
'<p><b>Jed McCaleb.</b> Vast is a company whose actual product is people living ' +
'in a sealed volume for a long time, which is the same engineering problem as the ' +
'deck with a different sky outside it. Separately, Stellar and Ripple are ' +
'settlement systems built on the position that the middle hop should not require ' +
'permission. This paper argues that a century-long biological programme needs ' +
'both a habitat that works and a ledger nobody can switch off, and those are ' +
'unusually the same person&rsquo;s two careers.</p>\n' +
'<p><b>Mark Zuckerberg.</b> The Chan Zuckerberg Initiative funds basic biology on ' +
'timescales where the return arrives after the funder is finished caring, and ' +
'Meta has run infrastructure at a scale where the interesting failures are ' +
'emergent rather than component-level. A sealed biome is exactly that: a systems ' +
'problem in which every individual part is understood and the assembly is not, ' +
'and where the honest deliverable for the first decade is <b>measurements that ' +
'mean nothing yet</b>.</p>\n' +
'<p>Neither of you has been contacted about this and neither has said anything ' +
'about it. The names are here because the argument genuinely needs both halves, ' +
'and naming who builds each half is more useful than addressing nobody.</p>\n' +

/* ── the ask ─────────────────────────────────────────────────────────── */
'<div class="ask">\n' +
'  <h4>what is actually being asked for</h4>\n' +
'  <p>Not a rocket. The programme&rsquo;s first decade needs four things and none ' +
'of them leaves the ground:</p>\n' +
'  <ol>\n' +
'    <li><b>A ' + f(WEIGHT * 100, 1) + '% gravity sediment column.</b> Centrifuge, ' +
'on Earth, running for years. Settling and transport at this exact fraction, ' +
'measured rather than modelled. This is the cheapest experiment in the document ' +
'and the one the whole soil case rests on.</li>\n' +
'    <li><b>A residence-time study in a genuinely sealed system.</b> Not inventory ' +
'&mdash; availability, tracked continuously, for longer than the two years it ' +
'takes the stored fraction to run out and the failure to become visible.</li>\n' +
'    <li><b>A mycorrhizal assembly trial under a 58-day night.</b> Whether a soil ' +
'network establishes from a culture collection under that light cycle at that ' +
'gravity, and if it does not, which of the two is the reason.</li>\n' +
'    <li><b>An unconditional line for the people doing it.</b> No milestones, no ' +
'deliverables, no review. The moment the stream is conditional it is leverage, ' +
'and leverage is a discretion, and every extractive relationship traces back to ' +
'somebody having a choice about somebody else&rsquo;s income. The output <em>is</em> ' +
'the expense. That is what patronage means and it is the only funding shape this ' +
'work can take.</li>\n' +
'  </ol>\n' +
'  <p>Every one of those is falsifiable inside ten years, on Earth, for less than ' +
'the cost of a single launch.</p>\n' +
'</div>\n' +

'<h2><s>the honest close</s>What would show this wrong</h2>\n' +
'<p>The centrifuge column returns null &mdash; sorting at ' + f(WEIGHT * 100, 1) +
'% is indistinguishable from sorting at 100% within measurement error. That kills ' +
'the soil-physics argument outright and most of the scientific case with it, and ' +
'it is a cheap experiment specifically so that it can kill the expensive ones ' +
'early.</p>\n' +
'<p>Or the lighting budget for a ' + SOL_D + '-day cycle turns out to dominate ' +
'everything else so completely that the deck is a power station with a garden ' +
'attached, at which point the honest thing is to say so and go and do something ' +
'else.</p>\n' +
'<p>Both of those are findable before anybody buys a rocket, which is the ' +
'strongest thing this paper can claim for itself.</p>\n' +

'<footer>\n' +
'Computed by <a href="paper.mjs">paper.mjs</a>. Transit figures from the vis-viva ' +
'equation and Kepler&rsquo;s equation over transfer ellipses with aphelion at 1 AU; ' +
'&mu;<sub>&#9737;</sub> = ' + MU.toExponential(5) + ' m&sup3;/s&sup2;, Venus at ' +
'0.7233 AU. Hohmann case reproduces ' + f(hohmann.days, 1) + ' d.<br>\n' +
'Deck figures: ' + DECK_KM + ' km, ' + G_DECK + ' m/s&sup2;, ' + SHIELD +
' g/cm&sup2;, lapse ' + LAPSE + ' K/km, solar day ' + SOL_D + ' d, sidereal ' +
SIDEREAL_D + ' d, synodic ' + SYNODIC_D + ' d, arrival light delay ' + LIGHT_MIN +
' min.<br>\n' +
'Working repository: <a href="dev.html">the developer hub</a> &middot; ' +
'<a href="kb.html">the knowledge base</a> &middot; ' +
'<a href="corps.html">the order of battle</a> &middot; ' +
'<a href="writing.html">the notebook</a>\n' +
'</footer>\n</main>\n</body>\n</html>\n';

writeFileSync('paper.html', html);

console.log('paper.html');
console.log('  transit, computed from vis-viva and Kepler:');
curve.forEach((t) => console.log('    perihelion ' + f(t.q, 3) + ' AU  ' +
  String(Math.round(t.days)).padStart(3) + ' d   C3 ' + f(t.c3, 1).padStart(5) +
  '   arrive at ' + f(t.vArr, 2) + ' km/s'));
console.log('  Hohmann reproduces ' + f(hohmann.days, 1) + ' d (published: 146)');
console.log('  under 100 days: ' + f(under100.days, 0) + ' d for C3 ' + f(under100.c3, 1));
console.log('  deck: ' + f(WEIGHT * 100, 1) + '% weight, 100% inertia — ' +
  f(CARRY * 100, 1) + '% further carried, ' + f(SETTLE * 100, 1) + '% slower settling');
console.log('  the four failures: ' + f(SHIP_YEARS, 0) + ' My to ship a forest · ' +
  f(ONE_PC_K, 0) + ' K for 1% of an ocean · Rossby ' + ROSSBY_KM + ' km · ' +
  f(100 - P_AVAILABLE, 1) + '% of phosphorus locked');
console.log('  a river, by contrast: ' + RIVER_K.toExponential(1) + ' K');

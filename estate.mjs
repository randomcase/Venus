#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   estate.mjs — builds estate.html: what a castle costs to keep, computed from
   its fabric rather than from a rule of thumb.

   THE RULE OF THUMB IS "one to three per cent of value, annually". That is a
   number you cannot check, because it is derived from another number nobody
   can establish — what is Malbork worth? So this file goes the other way and
   computes the physical quantities the plans already declare: metres of wall,
   square metres of face, roof area, heated volume. Those have prices with
   trades attached to them, and the prices can be argued with.

   THEN IT CHECKS THE TWO AGAINST EACH OTHER. If the fabric-derived upkeep is
   x, the rule of thumb implies a value of x/0.02. Where that implied value is
   absurd, one of the two methods is wrong, and the page says which and why.

   ── the four models ─────────────────────────────────────────────────────
   Hospitality, events, film, tickets. Each is costed the same way: what does
   one unit earn, and how many units a year does the fabric and the location
   actually permit. The ceiling matters more than the rate, and it is the part
   that gets left out of every prospectus — a castle that can charge $10,000 a
   night and fill nine nights a year has a smaller business than one charging
   $900 and filling two hundred.

   ── the finding, which is not the one I expected ────────────────────────
   I wrote the conclusion first and the arithmetic refused it. I had assumed
   the break would be at SIZE — that above some footprint no private model
   closes. It is not. Neuschwanstein at 0.5 hectares and Malbork at 12.5,
   twenty-five times the area, both close and both close on the same model.
   The only plan that fails on every single model is Krak, which is
   mid-sized.

   The variable is the ROAD. Every plan that closes, closes on ticketing,
   because the other three have hard ceilings in units — there are only so
   many Saturdays, and a bigger hall does not make more of them — so their
   maximum take is fixed whatever you charge. Ticketing is the only model
   whose ceiling scales, and what it scales with is how many people can get
   there.

   EVERY RATE BELOW IS AN ASSUMPTION AND IS LABELLED AS ONE. They are
   order-of-magnitude figures from commonly quoted ranges, not appraisals, and
   the page prints them where you can change them. The conclusions are only as
   good as the inputs and the file says so rather than implying otherwise.

       node estate.mjs
   ═══════════════════════════════════════════════════════════════════════════ */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const money = (n) => n >= 1e6 ? '$' + (n / 1e6).toFixed(1) + 'M'
  : '$' + Math.round(n / 1000) + 'k';
const num = (n) => Math.round(n).toLocaleString();

/* ═══ 1 · the assumptions, in one place, all arguable ══════════════════ */
const RATE = {
  repoint_m2: 300,        /* lime mortar, specialist rate, per m² of wall face */
  repoint_years: 90,      /* the cycle it comes round on */
  roof_m2: 420,           /* lead or slate, per m² */
  roof_years: 80,
  heat_m2_yr: 26,         /* per m² of heated floor, thick stone, poor envelope */
  reinstate_m2: 4200,     /* like-for-like heritage rebuild, per m² of floor */
  insure_pc: 0.0035,      /* premium as a share of reinstatement cost */
  warden_yr: 62000,       /* one full-time custodian, all-in */
  wardens_per_ha: 0.9     /* how many the acreage needs */
};

const MODEL = {
  hire:   { name: 'Exclusive hire', unit: 'night',  rate: 3000,
            ceiling: 'nights a year the calendar and the staffing actually allow',
            cap: 120,
            cost: 'bathrooms, kitchens and fire systems retrofitted into stone',
            note: 'The rate is the easy part. Occupancy is the whole business.' },
  events: { name: 'Weddings and galas', unit: 'event', rate: 12000,
            ceiling: 'events a year, weather and turnaround limited',
            cap: 45,
            cost: 'public liability, fire routes, and wear on floors that cannot be replaced',
            note: 'Highest margin per unit, hard ceiling on units.' },
  film:   { name: 'Film and television', unit: 'day', rate: 15000,
            ceiling: 'shooting days a year, if you are on anybody’s list at all',
            cap: 22,
            cost: 'total disruption, and contracts written to protect the fabric',
            note: 'Windfall, not income. Cannot be planned around.' },
  gate:   { name: 'Ticketed visiting', unit: 'ticket', rate: 19,
            ceiling: 'visitors a year, and this is where being rural bites',
            cap: 0,       /* computed per plan from access */
            cost: 'guides, ticketing, cleaners, car park, lavatories',
            note: 'Only model whose ceiling scales with the building.' }
};

/* ═══ 2 · the plans, and their fabric ══════════════════════════════════ */
const DIR = 'templates-castle';
const plans = readdirSync(DIR).filter((f) => f.endsWith('.json')).sort()
  .map((f) => JSON.parse(readFileSync(join(DIR, f), 'utf8')))
  .sort((a, b) => a.order - b.order);

/* how remote it is, which sets the visiting ceiling. Stated per plan rather
   than derived, because it is a fact about roads and not about walls. */
const ACCESS = {
  windsor: { visitors: 1500000, why: 'forty minutes from a capital city of nine million' },
  versailles: { visitors: 8100000, why: 'on the Paris RER, and the single most visited palace on earth' },
  krak: { visitors: 12000, why: 'a conflict zone; the number is what it is for reasons that are not about the building' },
  himeji: { visitors: 1800000, why: 'on the Sanyo Shinkansen, a station away from the gate' },
  malbork: { visitors: 550000, why: 'rural northern Poland, and the number reflects it' },
  neuschwanstein: { visitors: 1400000, why: 'an Alpine village with a shuttle bus, and still the most visited castle on earth' },
  'deck-keep': { visitors: 0, why: 'fifty-five kilometres above Venus. There is no gate and no bus.' }
};

const rows = plans.map((p) => {
  /* fabric, from what the plan declares */
  const wards = p.wards || [];
  const footprint = wards.reduce((a, w) => a + w.w * w.d, 0);            /* m² */
  const walled = wards.filter((w) => w.wall > 0);
  const wallRun = walled.reduce((a, w) => a + 2 * (w.w + w.d), 0);       /* m */
  const wallFace = walled.reduce((a, w) => a + 2 * (w.w + w.d) * w.wall * 2, 0);
  /* ×2 because a wall has two faces and both are pointed */

  /* roofed floor: the ranges of building, not the open ward. A rough share of
     the enclosed area, plus the keep. */
  const keepH = p.keep ? p.keep.height : 0;
  const keepFloor = p.keep && p.keep.diameter
    ? Math.PI * (p.keep.diameter / 2) ** 2 * Math.max(1, Math.round(keepH / 4))
    : (p.keep ? 900 * Math.max(1, Math.round(keepH / 4)) : 0);
  const rangeFloor = footprint * 0.34;
  const floor = rangeFloor + keepFloor;
  const roofArea = floor * 0.42;

  /* annual outflow */
  const repoint = wallFace / RATE.repoint_years * RATE.repoint_m2;
  const roof = roofArea / RATE.roof_years * RATE.roof_m2;
  const heat = floor * 0.55 * RATE.heat_m2_yr;      /* not all of it is heated */
  const reinstate = floor * RATE.reinstate_m2;
  const insure = reinstate * RATE.insure_pc;
  const ha = footprint / 10000;
  const staff = Math.ceil(ha * RATE.wardens_per_ha) * RATE.warden_yr;
  const outflow = repoint + roof + heat + insure + staff;

  /* what the rule of thumb implies about value, at 2% */
  const impliedValue = outflow / 0.02;

  /* the four models: units needed, against units possible */
  const access = ACCESS[p.id] || { visitors: 0, why: 'unknown' };
  const models = Object.entries(MODEL).map(([k, m]) => {
    const cap = k === 'gate' ? access.visitors : m.cap;
    const need = outflow / m.rate;
    return { k, ...m, cap, need, closes: cap > 0 && need <= cap,
             share: cap > 0 ? Math.min(1, cap * m.rate / outflow) : 0 };
  });
  const anyCloses = models.some((m) => m.closes);
  /* what all four could raise at full stretch — capacity, not the part
     of it you would need */
  const allTogether = models.reduce((a, m) => a + m.cap * m.rate, 0);

  return { p, footprint, ha, wallRun, wallFace, floor, roofArea,
           repoint, roof, heat, insure, staff, outflow, reinstate, impliedValue,
           models, anyCloses, allTogether, access,
           covered: allTogether / outflow };
});

/* ═══ 3 · the finding, computed rather than assumed ════════════════════ */
const closers = rows.filter((r) => r.anyCloses);
const nonClosers = rows.filter((r) => !r.anyCloses && r.p.id !== 'deck-keep');
const bySize = rows.slice().sort((a, b) => a.ha - b.ha);
const smallestNonCloser = nonClosers.length
  ? nonClosers.reduce((a, b) => (a.ha < b.ha ? a : b)) : null;
const biggestCloser = closers.length
  ? closers.reduce((a, b) => (a.ha > b.ha ? a : b)) : null;
const smallestCloser = closers.length
  ? closers.reduce((a, b) => (a.ha < b.ha ? a : b)) : null;
/* which model does the closing, everywhere it closes */
const closingModels = new Set();
closers.forEach((r) => r.models.filter((m) => m.closes).forEach((m) => closingModels.add(m.k)));
const onlyTheGate = closingModels.size === 1 && closingModels.has('gate');
/* and does size predict it at all? */
const sizePredicts = biggestCloser && smallestNonCloser
  && biggestCloser.ha < smallestNonCloser.ha;

/* ═══ 4 · the page ═════════════════════════════════════════════════════ */
const html = '<!doctype html>\n<html lang="en">\n<head>\n' +
'<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n' +
'<title>The upkeep &middot; what a castle costs to keep</title>\n' +
'<!-- No off-origin requests. Every figure computed in estate.mjs from the plans. -->\n' +
'<style>\n' +
`  :root{
    --paper:#f7f4ec; --paper2:#efe9db; --ink:#23211c; --dim:#605b51;
    --faint:#8f887b; --rule:#ddd6c6; --edge:#c9bfa9;
    --ink2:#7a3f2e; --good:#42663a; --gold:#8a6a1c; --cool:#2f5560;
    --serif:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;
    --mono:ui-monospace,"Cascadia Mono",Consolas,"SF Mono",Menlo,monospace;
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--paper);color:var(--ink);
    font:17px/1.72 var(--serif);padding:48px 22px 100px}
  main{max-width:880px;margin:0 auto}
  a{color:var(--cool)}
  .kick{margin:0 0 9px;font:400 9px/1 var(--mono);letter-spacing:.34em;
    text-transform:uppercase;color:var(--ink2)}
  h1{margin:0 0 8px;font:500 43px/1.06 var(--serif);letter-spacing:-.01em}
  .sub{margin:0 0 8px;font:italic 400 19px/1.5 var(--serif);color:var(--dim);max-width:62ch}
  .warn{margin:20px 0 34px;padding:14px 16px;background:var(--paper2);
    border-left:2px solid var(--ink2);font:400 13px/1.7 var(--serif);color:var(--dim)}
  .warn b{color:var(--ink)}
  h2{margin:50px 0 12px;font:500 27px/1.2 var(--serif);
    padding-bottom:8px;border-bottom:1px solid var(--rule)}
  h2 s{text-decoration:none;display:block;margin-bottom:5px;
    font:400 8.5px/1 var(--mono);letter-spacing:.22em;text-transform:uppercase;
    color:var(--ink2)}
  p{margin:0 0 15px;max-width:74ch} b{font-weight:600}
  .scroll{overflow-x:auto;margin:22px 0}
  table{width:100%;border-collapse:collapse;min-width:640px;font:400 12.5px/1.5 var(--mono)}
  th{text-align:right;padding:0 11px 9px 0;color:var(--faint);font-weight:400;
    font-size:8.5px;letter-spacing:.15em;text-transform:uppercase;
    border-bottom:1px solid var(--edge)}
  th:first-child,td:first-child{text-align:left}
  td{padding:9px 11px 9px 0;border-bottom:1px solid var(--rule);text-align:right;
    font-variant-numeric:tabular-nums}
  td.d{text-align:left;color:var(--dim);font:400 13.5px/1.4 var(--serif)}
  tr.no td{background:#f6ece8} tr.yes td{background:#eef2ea}
  .plan{margin:26px 0;border:1px solid var(--edge);background:var(--paper2)}
  .plan header{padding:15px 18px;border-bottom:1px solid var(--edge);
    display:flex;align-items:baseline;gap:12px;flex-wrap:wrap}
  .plan h3{margin:0;font:600 21px/1.2 var(--serif)}
  .plan header span{font:400 9px/1 var(--mono);letter-spacing:.16em;
    text-transform:uppercase;color:var(--faint)}
  .plan header u{margin-left:auto;text-decoration:none;font:400 20px/1 var(--mono);
    color:var(--ink2);font-variant-numeric:tabular-nums}
  .plan .body{padding:16px 18px}
  .bars{margin:0 0 14px}
  .b{display:flex;align-items:center;gap:10px;margin-bottom:7px;
    font:400 11px/1.3 var(--mono)}
  .b span{width:118px;color:var(--dim);flex:none}
  .b .t{flex:1;height:15px;background:#e3dbc9;position:relative;overflow:hidden}
  .b .t i{display:block;height:100%;background:var(--cool)}
  .b .t i.ok{background:var(--good)}
  .b .t i.no{background:var(--ink2)}
  .b u{width:150px;text-align:right;text-decoration:none;color:var(--faint);
    font-size:10px;flex:none}
  .verdict{margin:0;padding:12px 14px;background:var(--paper);
    border-left:2px solid var(--edge);font:400 14px/1.7 var(--serif);color:var(--dim)}
  .verdict.no{border-left-color:var(--ink2)}
  .verdict.yes{border-left-color:var(--good)}
  .find{margin:30px 0;padding:22px 24px;background:#f1ece0;border-left:3px solid var(--ink2)}
  .find h4{margin:0 0 10px;font:400 8.5px/1 var(--mono);letter-spacing:.22em;
    text-transform:uppercase;color:var(--ink2)}
  .assume{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(200px,100%),1fr));
    gap:1px;background:var(--edge);border:1px solid var(--edge);margin:20px 0}
  .assume div{background:var(--paper);padding:12px 14px}
  .assume u{display:block;text-decoration:none;font:400 8px/1.3 var(--mono);
    letter-spacing:.13em;text-transform:uppercase;color:var(--faint);margin-bottom:5px}
  .assume b{font:400 16px/1.3 var(--mono);color:var(--ink);font-weight:400}
  footer{margin-top:66px;padding-top:20px;border-top:1px solid var(--rule);
    color:var(--faint);font:400 11.5px/1.85 var(--mono)}
</style>\n</head>\n<body>\n<main>\n` +

'<p class="kick">Venus yard &middot; the estate</p>\n' +
'<h1>The upkeep</h1>\n' +
'<p class="sub">Buying the castle is the cheap part. This works out the other ' +
'part from the fabric rather than from a rule of thumb, and then checks the two ' +
'against each other.</p>\n' +

'<div class="warn"><b>Read this first.</b> Every rate below is an assumption ' +
'and is printed where you can see it. They are order-of-magnitude figures from ' +
'commonly quoted ranges &mdash; not appraisals, not quotations, and not advice. ' +
'What the page is actually for is the <b>shape</b> of the answer: which costs ' +
'dominate, how the ceilings on each revenue model compare to the rates, and at ' +
'what size the arithmetic stops closing. Those conclusions survive quite large ' +
'errors in the inputs. The dollar totals do not.</div>\n' +

'<h2><s>the method</s>From the fabric, not from the value</h2>\n' +
'<p>The usual figure is <b>one to three per cent of value, annually</b>. It is ' +
'unfalsifiable, because it rests on a number nobody can establish &mdash; what ' +
'is Malbork worth? There is no comparable and no buyer.</p>\n' +
'<p>So this goes the other way. The plans already declare metres of wall, wall ' +
'height, ward dimensions and keep height. Those give square metres of pointing, ' +
'square metres of roof and cubic metres to heat, and those have trades and ' +
'prices attached. Then, at the end, the fabric-derived total is divided by two ' +
'per cent to see what value the rule of thumb would have implied &mdash; and ' +
'where that implied value is absurd, one of the two methods is wrong.</p>\n' +
'<div class="assume">\n' +
'  <div><u>lime repointing</u><b>$' + RATE.repoint_m2 + '/m&sup2;</b>, every ' +
   RATE.repoint_years + ' yrs</div>\n' +
'  <div><u>roof covering</u><b>$' + RATE.roof_m2 + '/m&sup2;</b>, every ' +
   RATE.roof_years + ' yrs</div>\n' +
'  <div><u>heating</u><b>$' + RATE.heat_m2_yr + '/m&sup2;</b> a year</div>\n' +
'  <div><u>like-for-like rebuild</u><b>$' + RATE.reinstate_m2 + '/m&sup2;</b></div>\n' +
'  <div><u>insurance</u><b>' + (RATE.insure_pc * 100).toFixed(2) + '%</b> of rebuild</div>\n' +
'  <div><u>custodian</u><b>$' + num(RATE.warden_yr) + '</b>, ' + RATE.wardens_per_ha +
   ' per hectare</div>\n' +
'</div>\n' +

'<h2><s>the outflow</s>What each one costs a year</h2>\n' +
'<div class="scroll"><table>\n' +
'<tr><th>plan</th><th>hectares</th><th>wall face</th><th>floor</th><th>pointing</th>' +
'<th>roof</th><th>heat</th><th>insurance</th><th>staff</th><th>total</th></tr>\n' +
rows.map((r) => '<tr><td class="d">' + esc(r.p.name) + '</td>' +
  '<td>' + r.ha.toFixed(1) + '</td>' +
  '<td>' + num(r.wallFace) + ' m&sup2;</td>' +
  '<td>' + num(r.floor) + ' m&sup2;</td>' +
  '<td>' + money(r.repoint) + '</td>' +
  '<td>' + money(r.roof) + '</td>' +
  '<td>' + money(r.heat) + '</td>' +
  '<td>' + money(r.insure) + '</td>' +
  '<td>' + money(r.staff) + '</td>' +
  '<td><b>' + money(r.outflow) + '</b></td></tr>').join('\n') + '\n</table></div>\n' +
'<p>Two things fall out immediately. <b>Insurance and staff dominate</b> &mdash; ' +
'not stonework, which is what everyone pictures. And the pointing bill is ' +
'genuinely small per year <em>because it is spread over ninety</em>; the danger ' +
'with a masonry cycle is not the annual figure but that skipping it for thirty ' +
'years converts a maintenance line into a reconstruction line.</p>\n' +

'<h2><s>the four models</s>The ceiling matters more than the rate</h2>\n' +
'<p>Each model is costed the same way: what one unit earns, and how many units ' +
'a year the fabric and the location actually permit. A castle charging ' +
'$10,000 a night that fills nine nights has a smaller business than one ' +
'charging $900 that fills two hundred, and prospectuses quote the rate.</p>\n' +
rows.filter((r) => r.p.id !== 'deck-keep').map((r) =>
'<article class="plan">\n' +
'  <header><h3>' + esc(r.p.name) + '</h3><span>' + r.ha.toFixed(1) + ' ha &middot; ' +
   esc(r.p.kind) + '</span><u>' + money(r.outflow) + '/yr</u></header>\n' +
'  <div class="body">\n    <div class="bars">\n' +
r.models.map((m) => {
  const pc = Math.round(m.share * 100);
  return '      <div class="b"><span>' + esc(m.name) + '</span>' +
    '<div class="t"><i class="' + (m.closes ? 'ok' : pc > 0 ? '' : 'no') +
    '" style="width:' + pc + '%"></i></div>' +
    '<u>' + (m.cap > 0
      ? num(Math.min(m.cap, m.need)) + ' of ' + num(m.cap) + ' ' + m.unit + 's'
      : 'no ' + m.unit + 's possible') + '</u></div>';
}).join('\n') + '\n    </div>\n' +
'    <p class="verdict ' + (r.anyCloses ? 'yes' : 'no') + '">' +
  (r.anyCloses
    ? 'Closes on <b>' + esc(r.models.filter((m) => m.closes).map((m) => m.name.toLowerCase()).join(' or ')) +
      '</b> alone. ' + esc(r.access.why) + '.'
    : 'No single model closes it. All four at full stretch would raise <b>' +
      Math.round(r.covered * 100) + '%</b> of the outflow' +
      (r.covered >= 1
        ? ' — so it can be done, by running four businesses at once and ' +
          'filling every one of them to the ceiling. That is a different ' +
          'proposition from owning a castle.'
        : ', which is not enough.') + ' ' + esc(r.access.why) + '.') +
  '</p>\n  </div>\n</article>').join('\n') + '\n' +

'<div class="find">\n' +
'  <h4>the finding</h4>\n' +
(onlyTheGate
  ? '  <p>I expected the break to be at <b>size</b> and the arithmetic refuses ' +
    'it. ' + esc(smallestCloser.p.name) + ' at ' + smallestCloser.ha.toFixed(1) +
    ' hectares and ' + esc(biggestCloser.p.name) + ' at ' + biggestCloser.ha.toFixed(1) +
    ' \u2014 ' + (biggestCloser.ha / smallestCloser.ha).toFixed(0) + ' times the area ' +
    '\u2014 both close, and they close on the same model. The one that fails on ' +
    'every model is ' + esc(smallestNonCloser.p.name) + ' at ' +
    smallestNonCloser.ha.toFixed(1) + ' ha, which is in the middle of the range.</p>\n' +
    '  <p><b>Every plan that closes, closes on the gate.</b> Not on hospitality, ' +
    'not on weddings, not on film. Those three have hard ceilings in units \u2014 ' +
    'there are only so many Saturdays, and a bigger hall does not create more of ' +
    'them \u2014 so their maximum take is fixed no matter what you charge. ' +
    'Ticketing is the only model whose ceiling scales with anything at all.</p>\n' +
    '  <p>And what it scales with is not the building. It is <b>the road</b>. ' +
    esc(smallestNonCloser.p.name) + ' fails because ' +
    num(smallestNonCloser.access.visitors) + ' people a year can reach it. ' +
    esc(biggestCloser.p.name) + ' is ' + (biggestCloser.ha / smallestNonCloser.ha).toFixed(1) +
    ' times larger, costs ' + (biggestCloser.outflow / smallestNonCloser.outflow).toFixed(1) +
    ' times as much to keep, and closes comfortably because ' +
    num(biggestCloser.access.visitors) + ' people come. The constraint was never ' +
    'the rate and it was never the acreage.</p>\n'
  : '  <p>On these inputs no single model dominates, which would mean the ' +
    'ceilings and the footprint are trading off against each other rather than ' +
    'one deciding.</p>\n') +
'  <p>Two corollaries, and they are the useful part if you are actually ' +
'looking. <b>Buy for the road before you buy for the building</b> &mdash; the ' +
'access figure is the only input in this whole model that sets a ceiling ' +
'rather than a rate, and it is the one you cannot change afterwards. And ' +
'<b>buy the smallest thing that does the job</b>, because every additional ' +
'hectare adds outflow the day you sign and adds revenue only if it adds ' +
'units, which it almost never does.</p>\n' +
'  <p>The reason the largest castles are publicly held turns out not to be ' +
'about size either. It is that the ones worth keeping are frequently the ones ' +
'nobody can conveniently reach, and a state can hold a building whose ' +
'ceiling is zero. A private owner cannot, whatever the rate card says.</p>\n' +
'</div>\n' +

'<h2><s>the check</s>What the rule of thumb would have implied</h2>\n' +
'<div class="scroll"><table>\n' +
'<tr><th>plan</th><th>fabric outflow</th><th>value implied at 2%</th>' +
'<th>rebuild cost</th><th>does that make sense?</th></tr>\n' +
rows.filter((r) => r.p.id !== 'deck-keep').map((r) => {
  const ratio = r.impliedValue / r.reinstate;
  const ok = ratio > 0.25 && ratio < 2.5;
  return '<tr class="' + (ok ? 'yes' : 'no') + '"><td class="d">' + esc(r.p.name) + '</td>' +
    '<td>' + money(r.outflow) + '</td>' +
    '<td>' + money(r.impliedValue) + '</td>' +
    '<td>' + money(r.reinstate) + '</td>' +
    '<td class="d">' + (ok
      ? 'yes — within a factor of the rebuild cost'
      : ratio >= 2.5 ? 'no — implies a value ' + ratio.toFixed(1) +
        '× the cost of rebuilding it'
      : 'no — implies a value well under rebuild') + '</td></tr>';
}).join('\n') + '\n</table></div>\n' +
'<p>Where the implied value exceeds what it would cost to build the thing from ' +
'nothing, the rule of thumb has broken &mdash; nobody pays more than replacement ' +
'for a building they must then maintain. Where it comes in far under, the ' +
'fabric method is probably over-charging somewhere. The two methods agreeing ' +
'within a factor is the most either of them earns.</p>\n' +

'<h2><s>and the one that is not on Earth</s>The Deck Keep</h2>\n' +
'<p>Its outflow computes to <b>' + money(rows.find((r) => r.p.id === 'deck-keep').outflow +
0) + ' a year</b> on the same rates, and every one of those rates is wrong for ' +
'it. There is no lime mortar at fifty-five kilometres, no roofer, no insurer ' +
'writing like-for-like on a pressure vessel above Venus, and <b>no visitors at ' +
'all</b> &mdash; the only model with a ceiling that scales is the one model that ' +
'is unavailable.</p>\n' +
'<p>Which is the honest end of this document. Every private model here converts ' +
'a building into a venue, and a venue needs people who can get there. The deck ' +
'cannot be a venue, so it cannot be paid for this way, and that is not a gap in ' +
'the analysis — it is the analysis. It has to be held the way the largest ' +
'castles on Earth are held: by somebody who has decided the thing should exist ' +
'and is not asking it to pay.</p>\n' +

'<footer>\n' +
'Computed by <a href="estate.mjs">estate.mjs</a> from the ' + plans.length +
' plans in templates-castle/. Fabric quantities are derived from the ward ' +
'dimensions, wall heights and keep heights each plan declares; every unit rate ' +
'is an assumption printed above. Not appraisals, not advice.<br>\n' +
'<a href="castle.html">the castle</a> &middot; <a href="dev.html">the hub</a> ' +
'&middot; <a href="paper.html">the white paper</a>\n' +
'</footer>\n</main>\n</body>\n</html>\n';

writeFileSync('estate.html', html);

console.log('estate.html · ' + plans.length + ' plans costed from their fabric');
rows.forEach((r) => console.log('  ' + r.p.name.padEnd(20) +
  r.ha.toFixed(1).padStart(5) + ' ha · ' + money(r.outflow).padStart(7) + '/yr · ' +
  (r.p.id === 'deck-keep' ? 'no model available'
   : r.anyCloses ? 'closes on ' + r.models.filter((m) => m.closes).map((m) => m.k).join('+')
   : 'no single model closes; all four cover ' + Math.round(r.covered * 100) + '%')));
console.log('\n  dominant costs, every plan: insurance and staff — not stonework');
if (onlyTheGate)
  console.log('  every plan that closes, closes on the GATE — the other three ' +
    'have hard unit ceilings');
if (biggestCloser && smallestCloser && smallestNonCloser)
  console.log('  and it is not size: ' + smallestCloser.p.name + ' (' +
    smallestCloser.ha.toFixed(1) + ' ha) and ' + biggestCloser.p.name + ' (' +
    biggestCloser.ha.toFixed(1) + ' ha) both close; ' + smallestNonCloser.p.name +
    ' (' + smallestNonCloser.ha.toFixed(1) + ' ha) does not, on ' +
    smallestNonCloser.access.visitors.toLocaleString() + ' visitors a year');

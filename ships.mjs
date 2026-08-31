#!/usr/bin/env node
/* ships.mjs — one log per ship, generated from ships.json.
 *
 *   node ships.mjs            # writes ships/
 *   node ships.mjs --out foo  # somewhere else
 *
 * THE TWO MODES, WHICH ARE NOT THE SAME JOB
 * A captain does two different things and only one of them is daily.
 *
 *   THE CHART is made months before departure — nine to sixteen, per ship —
 *   and it is not revised. It cannot be: the launch window is set by orbital
 *   mechanics, the next one is 584 days later, and a transfer that is already
 *   the minimum-energy path has nothing to trade. So the thinking is all done
 *   up front and spent in one morning.
 *
 *   READINESS is every day, against that chart. Six lines, the same six lines,
 *   for the whole crossing — because a form that changes cannot be compared,
 *   and the entire value of a daily log is that any two days sit beside each
 *   other and a drift shows up as a difference rather than as a feeling.
 *
 * THE CHAIN
 * Each entry passes through three hands before breakfast: the commandant
 * writes it, the bridge countersigns it, and it goes forward to the operator.
 * That is not ceremony. A log signed by one person is a claim; a log
 * countersigned the same morning by somebody who was also there is evidence,
 * and the difference is the whole reason anybody is paid at the far end.
 *
 * WHAT IS COMPUTED
 * Day counts, days remaining, percentage of passage, the light time on the day
 * of the entry, entries kept against days elapsed, and the census across the
 * fleet. Nothing countable is typed.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const args = process.argv.slice(2);
const outDir = (() => { const i = args.indexOf('--out'); return i < 0 ? 'ships' : args[i + 1]; })();

const doc = JSON.parse(readFileSync('ships.json', 'utf8'));
const T = doc.passage.transit_days;
const [LMIN, LMAX] = doc.passage.light_minutes;

/* light time across the passage: shortest at the ends, longest in the middle,
   because the ship is going the long way round the sun while the planets move */
const lightAt = (day) => (LMIN + (LMAX - LMIN) * Math.sin(Math.PI * day / T)).toFixed(1);

let profiles = { profiles: [] };
try { profiles = JSON.parse(readFileSync('profiles.json', 'utf8')); } catch { /* optional */ }
const profName = new Map(profiles.profiles.map((p) => [p.id, p.name]));
const profStatus = new Map(profiles.profiles.map((p) => [p.id, p.status]));

const STYLE = `  *{box-sizing:border-box}
  body{margin:0;padding:22px 18px 48px;background:#070a0d;color:#e8eef4;
    font:13.5px/1.68 ui-serif,Georgia,'Times New Roman',serif}
  .w{max-width:880px;margin:0 auto}
  a{color:#d8b46a}
  h1{margin:0 0 5px;font-size:25px;letter-spacing:-.015em;color:#f0e4c6;font-weight:500}
  .ep{color:#8f9bab;font-size:12.5px;font-style:italic;margin:0 0 4px}
  .lede{color:#8f9bab;font-size:11.5px;max-width:92ch;margin:0;
    font-family:ui-rounded,system-ui,sans-serif}
  .lede b{color:#e8eef4}
  h2{font:9.5px/1 ui-monospace,Menlo,monospace;letter-spacing:.2em;
    text-transform:uppercase;color:#8f9bab;margin:28px 0 10px;font-weight:600}
  h2 b{color:#d8b46a;font-family:inherit;letter-spacing:0;text-transform:none;
    font-size:10.5px;margin-left:10px}
  .panel{background:linear-gradient(180deg,#121722,#171d2a);border:1px solid #28303f;
    border-radius:12px;padding:15px 16px}
  .chart{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin-top:12px}
  @media (max-width:700px){.chart{grid-template-columns:repeat(2,1fr)}}
  .chart div{background:#0d1119;border:1px solid #28303f;border-radius:10px;padding:9px 10px}
  .chart span{font:8.5px/1 ui-monospace,monospace;letter-spacing:.13em;
    text-transform:uppercase;color:#8f9bab;display:block;
    font-family:ui-monospace,monospace}
  .chart b{display:block;font:15px/1.3 ui-monospace,Menlo,monospace;color:#f0e4c6;margin-top:6px}
  .form{counter-reset:ln 0;margin-top:11px;border:1px solid #28303f;border-radius:10px;
    overflow:hidden}
  .form div{display:grid;grid-template-columns:30px 1fr;gap:11px;padding:9px 12px;
    border-bottom:1px solid #28303f;font-size:12px;color:#c4ccd8}
  .form div:last-child{border-bottom:0}
  .form div::before{counter-increment:ln 1;content:counter(ln);
    font:10px/1.7 ui-monospace,monospace;color:#5b6675}
  .entry{margin-top:12px;border:1px solid #28303f;border-radius:12px;overflow:hidden}
  .entry .hd{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;
    background:#0d1119;padding:10px 14px;border-bottom:1px solid #28303f;
    font:9.5px/1.5 ui-monospace,monospace;color:#8f9bab}
  .entry .hd b{color:#f0e4c6;font-size:12px}
  .entry .hd .r{margin-left:auto}
  .entry ol{margin:0;padding:12px 14px 12px 34px}
  .entry li{margin-bottom:7px;font-size:12.5px}
  .entry li:last-child{margin-bottom:0}
  .entry .chain{display:flex;gap:14px;flex-wrap:wrap;padding:9px 14px;
    border-top:1px solid #28303f;background:#0b0f16;
    font:9px/1.6 ui-monospace,monospace;color:#5b6675;letter-spacing:.1em;
    text-transform:uppercase}
  .entry .chain i{font-style:normal;color:#8f9bab}
  .grid{display:grid;gap:10px;grid-template-columns:repeat(2,1fr)}
  @media (max-width:760px){.grid{grid-template-columns:1fr}}
  a.card{display:block;text-decoration:none;color:inherit;background:#0d1119;
    border:1px solid #28303f;border-radius:11px;padding:13px 14px}
  a.card:hover{border-color:#d8b46a}
  a.card b{font-size:15px;color:#f0e4c6;display:block}
  a.card .ep{font-size:11px;margin:4px 0 0}
  a.card p{margin:9px 0 0;font-size:11px;color:#8f9bab;line-height:1.55;
    font-family:ui-rounded,system-ui,sans-serif}
  .none{color:#e0705a}
  footer{margin-top:32px;border-top:1px solid #28303f;padding-top:14px;
    color:#8f9bab;font-size:10.5px;max-width:92ch;
    font-family:ui-rounded,system-ui,sans-serif}`;

mkdirSync(outDir, { recursive: true });

/* ------------------------------------------------------------- one per ship */
for (const s of doc.ships) {
  const kept = s.entries.length;
  const last = kept ? Math.max(...s.entries.map((e) => e.day)) : 0;

  const form = s.stanza_form.map((l) => `      <div>${esc(l)}</div>`).join('\n');

  /* A ship with legs is a cycler: its entries carry a leg number and the
     elapsed day keeps running across the encounter, because the ship does not
     stop at one. Everything else has a single passage and day 1 means day 1. */
  const legs = s.legs || null;
  const legOf = (e) => legs ? (e.leg || 1) : 1;
  const elapsed = (e) => legs
    ? legs.slice(0, legOf(e) - 1).reduce((a, l) => a + l.days, 0) + e.day
    : e.day;
  const legDays = (e) => legs ? legs[legOf(e) - 1].days : T;

  const one = (e) => `
  <div class="entry">
    <div class="hd">
      <b>Day ${e.day}</b>
      <span>${legDays(e) - e.day} remaining</span>
      <span>${Math.round(100 * e.day / legDays(e))}% of leg</span>
      ${legs ? `<span>day ${elapsed(e)} aboard</span>` : ''}
      <span class="r">light ${lightAt(e.day)} min each way</span>
    </div>
    <ol>
${e.lines.map((l) => `      <li>${esc(l)}</li>`).join('\n')}
    </ol>
    <div class="chain">
      <span><i>written</i> ${esc(s.commandant)}</span>
      <span><i>countersigned</i> bridge, same morning</span>
      <span><i>forwarded</i> operator</span>
    </div>
  </div>`;

  const sorted = [...s.entries].sort((a, b) => elapsed(a) - elapsed(b));
  const entries = legs
    ? legs.map((l) => `
  <h2 style="margin-top:26px">Leg ${l.n} <b>${esc(l.from)} to ${esc(l.to)} &middot; ${l.days} days</b></h2>
  <p class="lede">${esc(l.note)}</p>
${sorted.filter((e) => legOf(e) === l.n).map(one).join('\n')}`).join('\n')
    : sorted.map(one).join('\n');

  const carries = profName.get(s.carries)
    ? `<a href="../profiles/${s.carries}.html">${esc(profName.get(s.carries))}</a> &mdash; ${esc(profStatus.get(s.carries))}`
    : esc(s.carries);

  writeFileSync(join(outDir, `${s.id}.html`), `<title>${esc(s.name)} · log</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<!-- GENERATED by ships.mjs from ships.json. Day counts, days remaining,
     percentage of passage and the light time on the day of each entry are all
     computed. Edit the JSON. -->
<style>
${STYLE}
</style>
<div class="w">
  <p class="lede"><a href="index.html">&larr; the fleet</a></p>
  <h1>${esc(s.name)}</h1>
  <p class="ep">${esc(s.epithet)}</p>
  <p class="lede" style="margin-top:9px">Carrying ${carries}. Commandant: ${esc(s.commandant)}.</p>
  <p class="lede" style="margin-top:9px;max-width:88ch">${esc(s.why)}</p>

  <h2>The chart <b>set ${esc(s.chart_set)}, and not revised</b></h2>
  <div class="chart">
    <div><span>passage</span><b>${s.chart_note ? 'hours' : T + ' d'}</b></div>
    <div><span>next window</span><b>${s.chart_note ? 'daily' : doc.passage.window_days + ' d'}</b></div>
    <div><span>entries kept</span><b>${kept}</b></div>
    <div><span>${s.legs ? 'legs' : 'last entry'}</span><b>${s.legs
      ? s.legs.length + ' \u00d7 ' + s.legs[0].days + ' d'
      : (last ? 'day ' + last : '&mdash;')}</b></div>
  </div>
  <p class="lede" style="margin-top:11px">${s.chart_note
    ? esc(s.chart_note)
    : esc(doc.passage.$transit) + ' ' + esc(doc.passage.$window)}</p>

  <h2>The stanza <b>six lines, set by the captain, unchanged all crossing</b></h2>
  <div class="form">
${form}
  </div>
  <p class="lede" style="margin-top:11px">${esc(doc.stanza_note)}</p>

  <h2>The log <b>${kept} ${kept === 1 ? 'entry' : 'entries'}${s.legs
    ? ' across ' + s.legs.length + ' legs, and no arrival in any of them' : ''}</b></h2>
${entries || `  <div class="panel"><p style="margin:0;font-size:12.5px" class="none">
    No entries. This ship has no commandant, no chart and no departure &mdash;
    and the reason is on her profile: the requirement she carries is the one
    marked unknown.</p></div>`}

  <footer>Generated from <a href="../ships.json">ships.json</a> by
    <a href="../ships.mjs">ships.mjs</a>. The chain on every entry &mdash;
    written, countersigned the same morning by somebody who was also there,
    forwarded &mdash; is why a log is evidence rather than a claim, and it is
    what the settlement at the far end is paid against.
    &middot; <a href="../profiles/index.html">profiles</a>
    &middot; <a href="../index.html">the yard</a></footer>
</div>
`);
}

/* -------------------------------------------------------------- the fleet */
const totalEntries = doc.ships.reduce((a, s) => a + s.entries.length, 0);
const sailing = doc.ships.filter((s) => s.entries.length).length;

writeFileSync(join(outDir, 'index.html'), `<title>The Fleet · ${doc.ships.length} logs</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<!-- GENERATED by ships.mjs from ships.json. -->
<style>
${STYLE}
</style>
<div class="w">
  <h1>The Fleet</h1>
  <p class="lede" style="max-width:88ch">${doc.ships.length} ships, ${sailing}
    sailing, ${totalEntries} entries kept. Each one carries one requirement from
    <a href="../profiles/index.html">the profiles</a> and each commandant keeps
    the same six-line stanza every morning of a ${T}-day crossing.</p>
  <p class="lede" style="max-width:88ch;margin-top:9px"><b>The chart is made
    months before departure and never revised.</b> The window is set by orbital
    mechanics, the next one is ${doc.passage.window_days} days later, and the
    transfer is already the minimum-energy path — so there is nothing to trade
    and all the thinking is spent up front. <b>Readiness is the daily half</b>,
    six lines against that chart, in a form that does not change, so that any
    two days can be laid beside each other.</p>
  <p class="lede" style="max-width:88ch;margin-top:9px"><b>Captain, bridge,
    operator</b> — three hands before breakfast. A log signed by one person is
    a claim. A log countersigned the same morning by somebody who was also there
    is evidence, and that difference is what the settlement at the far end is
    actually paid against. The cargo is not what earns it. The record that the
    cargo was kept is.</p>

  <h2>The ships <b>named for what they do, not for grandeur</b></h2>
  <div class="grid">
${doc.ships.map((s) => `    <a class="card" href="${s.id}.html">
      <b>${esc(s.name)}</b>
      <p class="ep">${esc(s.epithet)}</p>
      <p>${esc(s.why.split('. ').slice(0, 2).join('. '))}.</p>
      <p style="color:#5b6675;margin-top:8px">${s.entries.length
        ? `${s.entries.length} ${s.entries.length === 1 ? 'entry' : 'entries'} · chart set ${esc(s.chart_set)}`
        : '<span class="none">no entries · no chart · no commandant</span>'}</p>
    </a>`).join('\n')}
  </div>

  <footer>Generated from <a href="../ships.json">ships.json</a>. Six ships chart
    once, a year out, because the window is orbital and there is nothing to
    trade. <a href="charon.html">Charon</a> charts every morning, because his
    passage is hours rather than months and what varies is not the trajectory
    but how hot the cable already is from yesterday.
    &middot; <a href="../index.html">the yard</a></footer>
</div>
`);

console.log(`${doc.ships.length} logs → ${outDir}/`);
console.log(`  ${sailing} sailing · ${totalEntries} entries · ${T}-day passage · window ${doc.passage.window_days} d`);
for (const s of doc.ships) {
  console.log(`  ${s.name.padEnd(12)} ${String(s.entries.length).padStart(2)} entries  carries ${s.carries}`);
}

#!/usr/bin/env node
/* session-index.mjs — one page per peer session, linked from an index.
 *
 * The data below is a hand-copied snapshot from a single `ListAgents` call
 * (name, short id, mode, status) — that tool has no file to read from, so
 * there is nothing to regenerate this FROM automatically. Re-run this by
 * asking Claude to refresh the list below from a fresh ListAgents call.
 *     node session-index.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';

const SESSIONS = [
  ['Full voting system', '48743f', 'Remote Control', 'offline'],
  ['Move now', '5d4940', 'Remote Control', 'offline'],
  ['Random case GitHub usernames', '65094e', 'cloud', 'offline'],
  ['zakeem-witty-origami', '2f16d8', 'Remote Control', 'offline'],
  ['Musical arrangement with beat and claps', 'c0c33d', 'Remote Control', 'offline'],
  ['Build X258 Byte Hound binary ingestion kernel', '69a76a', 'Remote Control', 'offline'],
  ['Hello', 'cd03ab', 'Remote Control', 'offline'],
  ['Verify coding capabilities', 'f34809', 'Remote Control', 'offline'],
  ['Design on-chain transaction orchestration architecture', 'f5a98c', 'Remote Control', 'offline'],
  ["Remus's mathematical claim for the throne", '0d641a', 'Remote Control', 'offline'],
  ['Multi-cloud edge-blockchain topology implementation', 'dda977', 'Remote Control', 'offline'],
  ['Composer setup and configuration', 'dc2e3e', 'Remote Control', 'offline'],
  ['Compose the Anatolian League epic', 'f23f3b', 'Remote Control', 'offline'],
  ['Create 3 shared repositories for 2 users', '085ea6', 'Remote Control', 'offline'],
  ['Build node art program and judge game', 'db289f', 'Remote Control', 'offline'],
  ['Dispatch background conversation', '3a3433', 'Remote Control', 'offline'],
  ['Ready to work on coding session', '1522fb', 'Remote Control', 'offline'],
  ['Review Claude platform documentation', '7453d4', 'Remote Control', 'offline'],
  ['Open GitHub repo Venus', '4b4e05', 'Remote Control', 'offline'],
  ['Islam preconceptualization', '67e7bb', 'Remote Control', 'offline'],
  ['Build multilingual translation tool with payment system', 'f80977', 'Remote Control', 'offline'],
  ['Add light switch and create automation agent', '5bcf90', 'Remote Control', 'offline'],
  ['Use hellenistic map or artifact repository', 'e15853', 'Remote Control', 'offline'],
  ['Explore Hellenistic society from male perspective', '4710ca', 'Remote Control', 'offline'],
  ['Female perspective on Hellenistic society and age transfer', '646458', 'Remote Control', 'offline'],
  ['Gentry assemble Scala class with Hellenic counterpart', '2122b0', 'Remote Control', 'offline'],
  ['Set up email service agent playgrounds', 'd62937', 'Remote Control', 'offline'],
  ['Explore Java agentic automation repositories', '8109e6', 'Remote Control', 'offline'],
  ['Configure cloud environment on GitHub', '102bd9', 'Remote Control', 'offline'],
  ['Java agent workflow', 'e8d165', 'cloud', 'offline'],
  ['Git Bash introductory guide', 'b83025', 'cloud', 'offline'],
];

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const STYLE = `<style>
  :root{--void:#0b0d12;--panel:#151922;--edge:#2b3445;--ink:#efe9dc;--dim:#95a0b3;--gold:#f2c98a;--ok:#6fd4a8;--bad:#e06f5a;--sea:#3f8fbf;--serif:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif}
  *{box-sizing:border-box}html,body{margin:0;background:var(--void);color:var(--ink);font:13.5px/1.5 ui-rounded,system-ui,-apple-system,sans-serif}
  header{padding:22px 24px 10px;max-width:900px;margin:0 auto}
  header h1{margin:0;font:500 28px/1.1 var(--serif);color:var(--gold)}
  header p{margin:6px 0 0;color:var(--dim)}
  a{color:var(--sea)}
  .wrap{max-width:900px;margin:0 auto;padding:0 24px 40px}
  table{width:100%;border-collapse:collapse;background:var(--panel);border:1px solid var(--edge);border-radius:12px;overflow:hidden}
  th,td{text-align:left;padding:8px 12px;border-top:1px solid var(--edge);font-size:12.5px}
  th{color:var(--dim);text-transform:uppercase;letter-spacing:.06em;font-size:11px;border-top:none}
  td.status-idle{color:var(--gold);font-weight:600}
  td.status-offline{color:var(--dim)}
  .tally{margin-top:14px;color:var(--dim);font-size:12.5px}
  .tally b{color:var(--ink)}
  .stat{display:flex;justify-content:space-between;border-top:1px solid var(--edge);padding:8px 0;font-size:13px}
  .stat span{color:var(--dim)}.stat b{font-weight:500}
  .back{display:inline-block;margin-top:18px}
</style>`;

import { readdirSync, readFileSync } from 'node:fs';
const rd = f => JSON.parse(readFileSync(f, 'utf8'));
const dir = d => readdirSync(d).filter(f => f.endsWith('.json')).map(f => rd(`${d}/${f}`)).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

// Each session, and each written project, gets: a repo (github.com/randomcase/<slug>),
// a page, one template under templates/ (in directory order), and an idle game
// under idle/ (generated below, a tiny self-contained clicker).
const TEMPLATES = readdirSync('templates').filter(f => f.endsWith('.template.html')).map(f => f.replace('.template.html', ''));
const RESOURCE_NAMES = ['sparks','ink','bricks','coins','seeds','ore','signal','threads','light','stone','merit','crates','banners','links','echoes','water','kin','proofs','clauses','wagons','ranks','verdicts','miles','walls','commits','credit','spores','letters','acres','pieces','maps','tokens','candles','checkpoints','iron','cartoons','advisers','forms','placards','dominoes','helicopters','resolutions','tapes','rings','stars','anchors','wings','globes','helmets','bars','eagles','oak-leaves','anchors','wings','globes','flags','days','files','pages'];
const RESOURCES = i => RESOURCE_NAMES[i] ?? `units-${i + 1}`;
const repoOf = name => `https://github.com/randomcase/${slug(name)}`;
const gameOf = name => `idle/${slug(name)}.html`;

// The running death toll: US deaths by year (DCAS), and the Vietnamese estimate.
// Rendered on every Vietnam page as the toll "as you lead up to the fall".
const US_DEATHS = { 1956: 1, 1957: 1, 1959: 2, 1960: 5, 1961: 16, 1962: 53, 1963: 122, 1964: 216, 1965: 1928, 1966: 6350, 1967: 11363, 1968: 16899, 1969: 11780, 1970: 6173, 1971: 2414, 1972: 759, 1973: 68, 1974: 1, 1975: 62 };
const tollTo = y => Object.entries(US_DEATHS).reduce((s, [yy, d]) => s + (+yy <= y ? d : 0), 0);
const TOLL_FINAL = { us: 58220, vn: '1,400,000 – 3,800,000' };
const tollBox = (y, label) => `<div class="card toll"><span class="k">the death toll, ${esc(label)}</span><div class="tw"><table>
<tr><th>US dead through ${y}</th><th>US dead at the fall</th><th>All dead at the fall, every nation</th></tr>
<tr><td class="num">${tollTo(y).toLocaleString('en-US')}</td><td class="num">${TOLL_FINAL.us.toLocaleString('en-US')}</td><td>${TOLL_FINAL.vn}</td></tr>
</table></div><p class="k" style="margin:6px 0 0">US figures are the Defense Casualty Analysis System by year of death; the last column is the range in <a href="55-nations.html">project 55</a>. Every Vietnam page carries this box.</p></div>`;

const WARS = dir('templates-war');
const PRESIDENTS = dir('templates-president');
const JCS = dir('templates-jcs').filter(j => j.kind === 'jcs-seat');
const ROSTER = rd('templates-jcs/roster.json');
const DEMO = dir('templates-demographics');

// Projects 32+ are not sessions: pages under projects/, given the same
// repo / template / idle-game treatment as the 31 sessions. Order matters:
// the number is the position.
const PROJECTS = [
  [32, 'Crypto currency in games', 'projects/32-crypto-in-games.html', 'a report'],
  [33, 'Warlock and witch dossier', 'projects/33-warlock-witch-dossier.html', 'a dossier, generated from templates-warlock/'],
  [34, 'Syndication, redux', 'projects/34-syndication-redux.html', 'a second pass at lesson four, and the hidden syndicate'],
  [35, 'Masculinity', 'projects/35-masculinity.html', 'a project'],
  [36, 'Caricatures and the wars they started', 'projects/36-caricatures-and-wars.html', 'a satire, with a table'],
  [37, 'Vietnam war room', 'projects/37-vietnam-war-room.html', 'the war room; ends at the Fall of Saigon; the computer predicts the date from the numbers'],
  [38, 'War room standard', 'projects/38-war-room-standard.html', 'the standard every war room follows, and the American standard of four presidents'],
  [39, 'Responses to the Vietnam War', 'projects/39-vietnam-responses.html', 'a war room of responses to the war room'],
  [40, 'Dwight D. Eisenhower', 'projects/40-eisenhower.html', 'presidential suite: every adviser, the Chiefs, the toll'],
  [41, 'John F. Kennedy', 'projects/41-kennedy.html', 'presidential suite: every adviser, every nation that leaned on him, the Chiefs, his last days'],
  [42, 'Lyndon B. Johnson', 'projects/42-johnson.html', 'presidential suite: every adviser, the Chiefs, the racial demographics folder'],
  [43, 'Richard Nixon', 'projects/43-nixon.html', 'presidential suite: every adviser, the Chiefs, the impeachment, the break to the fall'],
  [44, 'Gerald Ford', 'projects/44-ford.html', 'presided over the Fall of Saigon: the lead-up a day at a time, then the lives after'],
  ...JCS.map((j, i) => [45 + i, j.who, `projects/${45 + i}-jcs-${j.id}.html`, `Joint Chiefs, ${j.seat}, at the ${j.seatAt} (${j.date})`]),
  [56, 'Cuba, a separate nation', 'projects/56-cuba.html', 'the Bay of Pigs, the fifty-one days one line each, the Cuban response'],
  [55, 'Vietnam during the spread of communism', 'projects/55-nations.html', 'communism as an idea, every nation involved, who funded it, the death toll, three lenses'],
  [57, 'Racial demographics of the force', 'projects/57-demographics.html', 'a folder, templates-demographics/, one file per group as the record kept them'],
  [58, 'Communism, after Saigon', 'projects/58-communism-after.html', 'full stop on Saigon; what happened after we left, every nation that withdrew, and where communism went next'],
  [59, 'Bomb warfare', 'projects/59-bomb-warfare.html', 'the air war as a war room: three roles, the campaigns, tonnage by year, the stations and bases, the fitted lever'],
  [60, 'Bomb warfare, a workbook', 'projects/60-bomb-warfare-workbook.html', 'ten pages, each a lesson, exercises and folded answers, until we understand bomb warfare'],
  [61, 'The legacy: Agent Orange, the ordnance, the homecoming', 'projects/61-legacy.html', 'three post-war lifespans, the perception timeline, the tap code, a corrected bibliography'],
  [62, 'USS Constellation', 'projects/62-constellation.html', 'Connie: first strikes, first loss, first prisoner, first aces; the idle game where you are the ship'],
  [63, 'You are Australia, building ships', 'projects/63-australia-shipyard.html', 'a shipyard idle game with the Omaha / Missouri / Constellation table and the destroyer Australia sent'],
  [64, 'October Revolution', 'projects/64-october-revolution.html', 'the room every other room descends from: the night by the hour, to the standard'],
].sort((a, b) => a[0] - b[0]);
const pfile = n => PROJECTS.find(p => p[0] === n)[2].replace('projects/', '');

mkdirSync('sessions', { recursive: true });
mkdirSync('idle', { recursive: true });
mkdirSync('projects', { recursive: true });
writeFileSync('projects/style.css', STYLE.replace(/^<style>\n|<\/style>$/g, '') + `
  main{max-width:900px;margin:0 auto;padding:0 24px 40px}
  h2{font:500 20px/1.2 var(--serif);color:var(--gold);margin:28px 0 8px}
  h3{font:600 13px/1.4 system-ui;color:var(--dim);text-transform:uppercase;letter-spacing:.06em;margin:18px 0 6px}
  p,li{max-width:70ch}
  .card{background:var(--panel);border:1px solid var(--edge);border-radius:12px;padding:16px 18px;margin:12px 0}
  .card b{color:var(--gold)}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px}
  .k{color:var(--dim);font-size:12px;text-transform:uppercase;letter-spacing:.06em}
  .tw{overflow-x:auto}
  blockquote{border-left:3px solid var(--edge);margin:12px 0;padding:4px 14px;color:var(--dim)}
  .num{text-align:right;font-variant-numeric:tabular-nums}
  .warn{border-color:var(--gold)}
  .toll{border-color:var(--bad)}
  .ok{color:var(--ok)}.bad{color:var(--bad)}
  .gauge{width:100%;height:auto;display:block;margin:8px 0}
  .day td:first-child{white-space:nowrap;color:var(--dim)}
  .side-Washington{color:var(--sea)}.side-Moscow{color:var(--bad)}.side-Havana{color:var(--ok)}
  .line{display:grid;grid-template-columns:110px 1fr;gap:12px;border-top:1px solid var(--edge);padding:8px 0}
  .line span:first-child{color:var(--dim);font-variant-numeric:tabular-nums}
`);

const page = (title, n, sub, body, comment) => `<title>${esc(title)} &middot; project ${n}</title>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<!-- Project ${n}. ${comment} Generated by session-index.mjs. -->
<link rel="stylesheet" href="style.css">
<header>
  <h1>${esc(title)}</h1>
  <p>Project ${n} &middot; ${sub} &middot; <a href="../session-index.html">index</a> &middot; repo <a href="${repoOf(title)}">randomcase/${slug(title)}</a></p>
</header>
<main>
${body}
<a class="back" href="../session-index.html">&larr; back to the index</a>
</main>
`;
const table = (heads, rows, cls = '') => `<div class="tw"><table${cls ? ` class="${cls}"` : ''}><tr>${heads.map(h => `<th>${h}</th>`).join('')}</tr>\n${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('\n')}\n</table></div>`;
const lines = xs => xs.map(([d, t]) => `<div class="line"><span>${esc(d)}</span><span>${esc(t)}</span></div>`).join('\n');

// A bar gauge as inline SVG: no faces, nothing that looks back.
const gauge = (g) => {
  const s = g.series; const max = Math.max(...s.map(x => x[1])); const W = 860, H = 30 + s.length * 22;
  return `<svg class="gauge" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(g.unit)}"><text x="0" y="14" fill="#95a0b3" font-size="12">${esc(g.unit)}</text>
${s.map(([x, v], i) => { const y = 26 + i * 22; const w = max ? Math.round(560 * v / max) : 0; return `<text x="0" y="${y + 14}" fill="#95a0b3" font-size="12" font-family="ui-monospace,monospace">${esc(String(x))}</text><rect x="80" y="${y}" width="${w}" height="16" fill="#3f8fbf" rx="3"/><text x="${88 + w}" y="${y + 13}" fill="#efe9dc" font-size="12" font-family="ui-monospace,monospace">${v.toLocaleString('en-US')}</text>`; }).join('\n')}
</svg>`;
};

// The prediction: least squares through the counts from fitFrom on, extended to zero.
// The computer complies with the numbers; the note says what the numbers cannot see.
const DAY = 86400000;
const predict = (p) => {
  const t0 = Date.parse(p.fitFrom);
  const pts = p.series.filter(([d]) => Date.parse(d) >= t0).map(([d, v]) => [(Date.parse(d) - t0) / DAY, v]);
  const n = pts.length, sx = pts.reduce((a, [x]) => a + x, 0), sy = pts.reduce((a, [, y]) => a + y, 0);
  const sxx = pts.reduce((a, [x]) => a + x * x, 0), sxy = pts.reduce((a, [x, y]) => a + x * y, 0);
  const m = (n * sxy - sx * sy) / (n * sxx - sx * sx), b = (sy - m * sx) / n;
  const zeroDay = -b / m; const when = new Date(t0 + zeroDay * DAY);
  const timed = /T/.test(p.series[0][0]);
  const ending = timed && p.marks ? (p.marks.find(([d]) => d.startsWith(p.ending)) || [p.ending])[0] : p.ending;
  const actual = Date.parse(ending); const unit = timed ? DAY / 24 : DAY; const err = Math.round((actual - when.getTime()) / unit);
  const iso = timed ? when.toISOString().slice(0, 16).replace("T", " ") : when.toISOString().slice(0, 10);
  return { m, b, iso, err, n, unitName: timed ? "hours" : "days" };
};
const predictionBox = (p) => {
  const r = predict(p);
  return `<h2>The prediction, from the numbers</h2>
<div class="card warn"><span class="k">${esc(p.unit)}</span>
${table(['Date', 'Count'], p.series.map(([d, v]) => [d, `<span class="num">${v}</span>`]))}
<p><b>Fit:</b> ${r.n} points from ${p.fitFrom}, least squares, slope ${r.m.toFixed(2)} per day, intercept ${r.b.toFixed(1)}.</p>
<p><b>The computer says zero on ${r.iso}.</b> The ending, ${esc(p.endingName)}, was ${p.ending}. Error: ${r.err > 0 ? `${r.err} ${r.unitName} early` : r.err < 0 ? `${-r.err} ${r.unitName} late` : 'exact'}.</p>
<p>${esc(p.note)}</p></div>
<h3>Marks</h3>
${lines(p.marks)}`;
};

const warRoom = (w, n) => {
  const endYear = +w.to.slice(0, 4);
  const body = `<div class="card"><span class="k">${esc(w.also)}</span><p><b>Theatre.</b> ${esc(w.theatre)} &middot; <b>From</b> ${w.from} <b>to</b> ${w.to}${w.respondsTo ? ` &middot; responds to <a href="${pfile(37)}">the ${esc(w.respondsTo)} room</a>` : ''}</p></div>
${tollBox(Math.min(endYear, 1975), `${w.name}, to ${w.to}`)}
<h2>Sides</h2>
${table(['Side', 'Who', 'Backed by'], w.sides.map(s => [esc(s.side), esc(s.who), esc(s.backed)]))}
<h2>Chain of command, one line item each</h2>
${table(['Who', 'Role', 'From', 'To', 'What they did'], w.chain.map(c => [`<b>${esc(c.who)}</b>`, esc(c.role), c.from, c.to, esc(c.did)]))}
<h2>Phases</h2>
<div class="grid">${w.phases.map(p => `<div class="card"><span class="k">${p.from}–${p.to}</span><br><b>${esc(p.name)}</b><p>${esc(p.text)}</p></div>`).join('')}</div>
<h2>Gauge</h2>
${gauge(w.gauge)}
${w.stations ? `<h2>Where the ships and the aircraft were</h2>${table(['Where', 'What', 'Who', 'What it did'], w.stations.map(x => [`<b>${esc(x.where)}</b>`, esc(x.what), esc(x.who), esc(x.did)]))}` : ''}
${w.prediction ? predictionBox(w.prediction) : ''}
${w.days ? `<h2>The spread, one line per day</h2>
<div class="tw"><table>${w.days.map(([d, side, t]) => `<tr class="day"><td>${d}</td><td class="side-${esc(side)}">${esc(side)}</td><td>${esc(t)}</td></tr>`).join('\n')}</table></div>` : ''}
<h2>Cost</h2>
${table(['', ''], w.cost.map(c => [esc(c.k), esc(c.v)]))}
<h2>Outcome</h2>
<p>${esc(w.outcome)}</p>
<h2>Open questions</h2>
<ul>${w.open.map(o => `<li>${esc(o)}</li>`).join('')}</ul>
<h2>Sources</h2>
<ul>${w.sources.map(s => `<li>${esc(s)}</li>`).join('')}</ul>`;
  return page(w.name, n, `a war room, kind <code>${w.kind}</code>, from <code>templates-war/${w.id}.json</code>, after the <a href="${pfile(38)}">standard</a>`, body, w.text);
};

const STANDARD = [
  ['id, kind, order', 'string, "war-room", number', 'the file’s name, its kind, and its place'],
  ['name, also, theatre', 'strings', 'what it is called, what else it is called, where it was'],
  ['from, to', 'ISO dates', 'the opening and the ending; the ending is fixed — for Vietnam it is the Fall of Saigon, 1975-04-30, and nothing after it belongs in the room'],
  ['respondsTo', 'id, optional', 'a room that answers another room'],
  ['sides[]', 'side, who, backed', 'two or more'],
  ['chain[]', 'who, role, from, to, did', 'the chain of command, one line item per person; presidents get one each'],
  ['phases[]', 'from, to, name, text', 'three to five'],
  ['gauge', 'unit, series[[x, v]]', 'one number that rises and falls, by year or by date'],
  ['prediction', 'ending, endingName, unit, series, fitFrom, marks, note', 'optional; the computer fits a line to the series from fitFrom and reports the zero date and its error against the ending. The note says what the numbers cannot see. The computer complies with the numbers; the note is the only place a person may disagree with it'],
  ['days[]', '[date, side, text]', 'optional; a spread, one line per day, back and forth between the sides; fifty days where fifty can be had, and lives where they cannot'],
  ['cost[]', 'k, v', 'what it cost, each side'],
  ['outcome', 'string', 'one paragraph'],
  ['open[]', 'strings', 'what is still argued'],
  ['sources[]', 'strings', 'where the numbers come from'],
  ['text, wovenBy', 'strings', 'the ship’s own fields, as every template has'],
];

const president = (p, n) => {
  const [a, z] = p.term;
  const chiefs = ROSTER.seats.filter(s => s.from <= z && s.to > a);
  const prev = PRESIDENTS.find(q => q.term[1] === a);
  const body = `<div class="card warn"><span class="k">${p.party} · ${a}–${z} · the American standard: ${p.order <= 4 ? `president ${p.order} of the four who managed the war` : 'the president who presided over its ending'}</span><p><b>Role.</b> ${esc(p.role)}</p></div>
${tollBox(Math.min(z, 1975), `end of the ${esc(p.name)} term`)}
<h2>Numbers</h2>
${table(['', ''], p.numbers.map(x => [esc(x.k), esc(x.v)]))}
<h2>Decisions, one line item each</h2>
${lines(p.decisions)}
${p.days ? `<h2>The lead-up, a day at a time</h2>${lines(p.days)}` : ''}
<h2>Every adviser</h2>
${table(['Who', 'Post', 'From', 'To', 'Note'], p.advisers.map(x => [`<b>${esc(x.who)}</b>`, esc(x.post), x.from, x.to, esc(x.note)]))}
<h2>The Joint Chiefs, with their president</h2>
<p>Chiefs in office during the term. A chief carried over from the previous president is listed once, with the earlier president, and given nothing more here — only the duty he owed this one, and, where it applies, his last days with him. ${esc(ROSTER.office)}</p>
${table(['Seat', 'Who', 'From', 'To', 'With this president'], chiefs.map(s => [esc(s.seat), `<b>${esc(s.who)}</b>`, s.from, s.to,
    s.from < a ? `carried over from ${prev ? esc(prev.name) : 'the previous president'}${p.id === 'kennedy' && s.kennedy ? ` — ${esc(s.kennedy)}` : ''}${p.id === 'kennedy' && s.lastDays ? ` <b>Last days:</b> ${esc(s.lastDays)}` : ''}`
      : `${esc(s.note)}${p.id === 'kennedy' && s.kennedy ? ` ${esc(s.kennedy)}` : ''}${p.id === 'kennedy' && s.lastDays ? ` <b>Last days:</b> ${esc(s.lastDays)}` : ''}`]))}
${p.leanedOn ? `<h2>Every nation that leaned on him</h2>${table(['Nation', 'Who', 'When', 'What'], p.leanedOn.map(x => [`<b>${esc(x.nation)}</b>`, esc(x.who), esc(x.when), esc(x.what)]))}` : ''}
${p.id === 'johnson' ? `<h2>Racial demographics, a folder</h2><p>One file per group under <code>templates-demographics/</code>, as the record kept them; the full page is <a href="${pfile(57)}">project 57</a>.</p>${table(['Group', 'Record term', 'Population 1970', 'Deaths', 'Share of deaths', 'In the Johnson years'], DEMO.map(d => [`<b>${esc(d.name)}</b>`, esc(d.recordTerm), d.popShare1970 == null ? '' : `${d.popShare1970}%`, `<span class="num">${d.deaths.toLocaleString('en-US')}</span>`, `${d.deathShare}%`, esc(d.johnson || '')]))}` : ''}
${p.impeachment ? `<h2>The impeachment</h2><p>${esc(p.impeachment.where)}, ${esc(p.impeachment.when)}.</p>${table(['Article', 'Charge', 'Vote'], p.impeachment.articles.map(x => x.map(esc)))}<p>${esc(p.impeachment.note)}</p>` : ''}
${p.break ? `<h2>The break, to the Fall of Saigon</h2><div class="card toll"><span class="k">${p.break.from} → ${p.break.to} · ${p.break.days} days</span><p>${esc(p.break.what)}</p></div>` : ''}
${p.lives ? `<h2>Lives, after</h2><p>Where fifty days after the fall cannot be had one line at a time, the lives can: the books, the art, the films, and the diagnoses. It was a lifelong conflict for a lot of men, and this is the record of that.</p>${table(['Kind', 'Title', 'Year', 'Who', 'Note'], p.lives.map(x => [esc(x.kind), `<b>${esc(x.title)}</b>`, x.year, esc(x.who), esc(x.note)]))}` : ''}`;
  return page(p.name, n, `presidential suite · from <code>templates-president/${p.id}.json</code>`, body, p.text);
};

const jcsSeat = (j, n) => {
  const pres = PRESIDENTS.filter(p => p.term[0] < j.to && p.term[1] > j.from);
  const body = `<div class="card warn"><span class="k">${esc(j.seat)} · ${j.from}–${j.to} · at the ${j.seatAt}, ${j.date}</span><p>${esc(j.note)}</p></div>
${tollBox(+j.date.slice(0, 4), `${esc(j.who)}, ${j.date}`)}
<h2>With their presidents</h2>
${table(['President', 'Project'], pres.map(p => [esc(p.name), `<a href="${pfile(PROJECTS.find(x => x[2].endsWith(`-${p.id}.html`))[0])}">project ${PROJECTS.find(x => x[2].endsWith(`-${p.id}.html`))[0]}</a>`]))}
<h2>The office</h2>
<p>${esc(ROSTER.office)}</p>
<h2>The seat, over the whole war</h2>
${table(['Who', 'From', 'To', 'Note'], ROSTER.seats.filter(s => s.seat === (j.seat.startsWith('Chairman') ? 'Chairman' : j.seat.includes('Army') ? 'Army' : j.seat.includes('Naval') ? 'Navy' : j.seat.includes('Air') ? 'Air Force' : 'Marine Corps')).map(s => [s.who === j.who ? `<b>${esc(s.who)}</b>` : esc(s.who), s.from, s.to, esc(s.note)]))}`;
  return page(j.who, n, `Joint Chiefs of Staff, ${esc(j.seat)}, from <code>templates-jcs/${j.id}.json</code>`, body, `${j.seat} at the ${j.seatAt} of the war.`);
};

const nationsPage = (na, n) => {
  const body = `<div class="card warn"><p>${esc(na.premise)}</p></div>
${tollBox(1975, 'the Fall of Saigon, every nation')}
<h2>Communism, as an idea</h2>
${lines(na.idea.map(x => [String(x.when), x.what]))}
<h2>${esc(na.funding.question)}</h2>
${table(['', ''], na.funding.rows.map(r => [`<b>${esc(r[0])}</b>`, esc(r[1])]))}
<div class="card"><b>Incognito.</b> ${esc(na.funding.hiddenSyndicate)} See <a href="${pfile(34)}">project 34</a>.</div>
<h2>Every nation involved</h2>
${table(['Nation', 'Side', 'Role', 'Peak', 'Deaths', 'Note'], na.nations.map(x => [`<b>${esc(x.nation)}</b>`, esc(x.side), esc(x.role), esc(x.peak), esc(x.deaths), esc(x.note)]))}
<h2>The death toll</h2>
<p><b>${esc(na.deaths.total)}.</b></p>
${table(['', ''], na.deaths.rows.map(r => [esc(r[0]), `<span class="num">${esc(r[1])}</span>`]))}
<p class="k">${esc(na.deaths.note)}</p>
<h2>Three lenses</h2>
<div class="grid">${na.lenses.map(l => `<div class="card"><b>${esc(l.lens)}</b><p>${esc(l.text)}</p></div>`).join('')}</div>
<h2>${esc(na.comparison.question)}</h2>
${table(['', ''], na.comparison.rows.map(r => [`<b>${esc(r[0])}</b>`, esc(r[1])]))}
<h2>Sources</h2>
<ul>${na.sources.map(s => `<li>${esc(s)}</li>`).join('')}</ul>`;
  return page(na.name, n, `from <code>templates-war/nations.json</code>`, body, na.text);
};

const demoPage = (n) => page('Racial demographics of the force', n, 'a folder, <code>templates-demographics/</code>, one file per group',
  `<div class="card warn"><p>The record — the Defense Casualty Analysis System — kept race in five categories under the terms of its day, and did not keep a Hispanic category at all. The folder keeps one file per category under the record’s own term, with the population share for comparison, and says where an estimate is an estimate. Requested for the Johnson page (<a href="${pfile(42)}">project 42</a>), whose years are the years the disproportion was largest.</p></div>
${tollBox(1975, 'all groups, at the fall')}
${gauge({ unit: 'US deaths by group, as recorded (DCAS)', series: DEMO.map(d => [d.name, d.deaths]) })}
${table(['Group', 'Record term', 'Population 1970', 'Deaths', 'Share of deaths', 'Note'], DEMO.map(d => [`<b>${esc(d.name)}</b>`, esc(d.recordTerm), d.popShare1970 == null ? '' : `${d.popShare1970}%`, `<span class="num">${d.deaths.toLocaleString('en-US')}</span>`, `${d.deathShare}%`, esc(d.note)]))}
<h2>Files</h2>
<ul>${DEMO.map(d => `<li><code>templates-demographics/${d.id}.json</code></li>`).join('')}</ul>
<p class="k">${esc(DEMO[0].source)}</p>`, 'The racial demographics folder.');

const standardPage = (n) => page('War room standard', n, 'the standard every war room in this repository follows',
  `<div class="card warn"><p><b>A war room is a template.</b> One JSON file under <code>templates-war/</code>, one page under <code>projects/</code>, rendered by <code>session-index.mjs</code>; the fields below are the standard. The ending is the fixed point: the room is built backward from it, and the computer’s job is to reach the ending from the numbers and say by how much it missed.</p></div>
${table(['Field', 'Shape', 'Rule'], STANDARD.map(r => r.map(esc)))}
<h2>The American standard</h2>
<p>Four U.S. presidents primarily managed American involvement in the Vietnam War, and each gets one line item and one repository in this index. A fifth presided over the ending and is listed as such.</p>
${table(['#', 'President', 'Term', 'Line item'], PRESIDENTS.map(p => [p.order <= 4 ? `<span class="num">${p.order}</span>` : 'ending', `<a href="${pfile(39 + p.order)}">${esc(p.name)}</a>`, `${p.term[0]}–${p.term[1]}`, esc(p.role)]))}
<h2>Rooms built to this standard</h2>
${table(['Room', 'Kind', 'From', 'To', 'Ending'], WARS.filter(w => w.kind === 'war-room').map(w => [`<a href="${pfile(w.id === 'vietnam' ? 37 : w.id === 'vietnam-responses' ? 39 : w.id === 'air' ? 59 : w.id === 'october' ? 64 : 56)}">${esc(w.name)}</a>`, w.kind, w.from, w.to, w.prediction ? esc(w.prediction.endingName) : '']))}
<h2>The Joint Chiefs</h2>
<p>The chiefs are listed with their presidents. A chief who served two presidents appears once, with the first, and is given nothing more with the second except the duty he owed him. The five chiefs seated at the opening (1955-11-01) and the five at the fall (1975-04-30) each get a repository, projects 45–54.</p>
${table(['Seat', 'Who', 'From', 'To', 'Note'], ROSTER.seats.map(s => [esc(s.seat), esc(s.who), s.from, s.to, esc(s.note)]))}`,
  'The standard.');

const GAME_OVERRIDES = { 'USS Constellation': { res: 'sorties', worker: 'aircraft', verb: 'launch', note: 'You are Connie. Each tap launches a sortie; each aircraft spotted on deck launches on its own, on the ninety-minute cycle, forever. The game does not count losses, which is the one thing the ship counted.' } };
const writeGame = (name, n, total, tpl, res0, project) => {
  const ov = GAME_OVERRIDES[name] || {}; const res = ov.res || res0; const worker = ov.worker || 'worker'; const verb = ov.verb || 'gather';
  const key = `idle:${slug(name)}`;
  writeFileSync(gameOf(name), `<title>${esc(name)} &middot; idle</title>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<!-- Idle game ${n}/${total}, generated by session-index.mjs. Self-contained; progress lives in localStorage under "${key}". -->
${STYLE}
<style>
  .game{background:var(--panel);border:1px solid var(--edge);border-radius:12px;padding:20px}
  .big{font:500 40px/1.1 var(--serif);color:var(--gold);margin:0 0 4px}
  .rate{color:var(--dim);margin:0 0 16px}
  button{background:var(--sea);color:var(--void);border:0;border-radius:8px;padding:10px 16px;font:600 14px/1 system-ui;cursor:pointer;margin:4px 6px 4px 0}
  button:disabled{opacity:.4;cursor:default}
  .shop button{background:var(--edge);color:var(--ink)}
</style>
<header>
  <h1>${esc(name)}</h1>
  <p>Idle game ${n} of ${total} &middot; project <a href="../${project}">${esc(name)}</a> &middot; template <a href="../templates/${tpl}.template.html">${tpl}</a> &middot; repo <a href="${repoOf(name)}">randomcase/${slug(name)}</a></p>
</header>
<div class="wrap">
  <div class="game">
    <p class="big"><span id="n">0</span> ${res}</p>
    <p class="rate"><span id="r">0</span> ${res}/s &middot; <span id="w">0</span> ${worker}s</p>
    <button id="tap">${verb} ${res}</button>
    <span class="shop"><button id="buy">add ${worker} (<span id="c">10</span>)</button><button id="reset">reset</button></span>
    ${ov.note ? `<p class="rate" style="margin:12px 0 0">${esc(ov.note)}</p>` : ''}
  </div>
  <a class="back" href="../session-index.html">&larr; back to the index</a>
</div>
<script>
(()=>{const K=${JSON.stringify(key)};let s={n:0,w:0,t:Date.now()};
try{const j=JSON.parse(localStorage.getItem(K)||'null');if(j)s=j}catch(e){}
const $=i=>document.getElementById(i),cost=()=>Math.floor(10*Math.pow(1.15,s.w));
const draw=()=>{$('n').textContent=Math.floor(s.n);$('r').textContent=s.w;$('w').textContent=s.w;$('c').textContent=cost();$('buy').disabled=s.n<cost()};
const save=()=>{try{localStorage.setItem(K,JSON.stringify(s))}catch(e){}};
const off=(Date.now()-s.t)/1000;if(off>0)s.n+=Math.min(off,8*3600)*s.w;
$('tap').onclick=()=>{s.n++;draw()};
$('buy').onclick=()=>{if(s.n>=cost()){s.n-=cost();s.w++;draw();save()}};
$('reset').onclick=()=>{s={n:0,w:0,t:Date.now()};draw();save()};
setInterval(()=>{s.n+=s.w/10;s.t=Date.now();draw();if(Math.random()<.1)save()},100);draw()})();
</script>
`);
};

const TOTAL = SESSIONS.length + PROJECTS.length;
SESSIONS.forEach(([name, id, mode, status], i) => {
  const file = `sessions/${slug(name)}-${id}.html`;
  const tpl = TEMPLATES[i];
  writeFileSync(file, `<title>${esc(name)} &middot; session ${id}</title>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<!-- One page per peer session, generated from a single ListAgents snapshot by session-index.mjs. No script, no live data. -->
${STYLE}
<header>
  <h1>${esc(name)}</h1>
  <p>Session <code>${id}</code> &middot; a read-only snapshot, not a live view</p>
</header>
<div class="wrap">
  <div class="stat"><span>mode</span><b>${esc(mode)}</b></div>
  <div class="stat"><span>status</span><b class="status-${status}">${esc(status)}</b></div>
  <div class="stat"><span>repo</span><b><a href="${repoOf(name)}">randomcase/${slug(name)}</a></b></div>
  <div class="stat"><span>template</span><b><a href="../templates/${tpl}.template.html">${tpl}</a></b></div>
  <div class="stat"><span>idle game</span><b><a href="../${gameOf(name)}">${esc(name)} (idle)</a></b></div>
  <div class="stat"><span>seen via</span><b>ListAgents, one call, this conversation</b></div>
  <p style="color:var(--dim);margin-top:14px">This session's actual conversation content isn't visible from here — this page only has what <code>ListAgents</code> reports: its name, id, mode, and status at the moment the index was built. There is no link into the session itself; opening it happens in the Claude Code UI, not from a URL.</p>
  <a class="back" href="../session-index.html">&larr; back to the index</a>
</div>
`);
  writeGame(name, i + 1, TOTAL, tpl, RESOURCES(i), file);
});
PROJECTS.forEach(([n, name, file]) => { if (n !== 63) writeGame(name, n, TOTAL, TEMPLATES[n - 1], RESOURCES(n - 1), file); });

// Generated project pages.
for (const w of WARS) {
  if (w.kind !== 'war-room') continue;
  const n = w.id === 'vietnam' ? 37 : w.id === 'vietnam-responses' ? 39 : w.id === 'air' ? 59 : w.id === 'october' ? 64 : 56;
  writeFileSync(`projects/${pfile(n)}`, warRoom(w, n));
}
writeFileSync(`projects/${pfile(38)}`, standardPage(38));
for (const p of PRESIDENTS) writeFileSync(`projects/${pfile(39 + p.order)}`, president(p, 39 + p.order));
JCS.forEach((j, i) => writeFileSync(`projects/${pfile(45 + i)}`, jcsSeat(j, 45 + i)));
writeFileSync(`projects/${pfile(55)}`, nationsPage(WARS.find(w => w.id === 'nations'), 55));
writeFileSync(`projects/${pfile(57)}`, demoPage(57));
{
  const c = WARS.find(w => w.id === 'communism');
  writeFileSync(`projects/${pfile(58)}`, page(c.name, 58, `after the rooms, from <code>templates-war/communism.json</code>`,
    `<div class="card warn"><span class="k">${esc(c.also)}</span><p>${esc(c.premise)}</p></div>
${tollBox(1975, 'the Fall of Saigon, where the rooms stop and this page starts')}
<h2>Vietnam, after</h2>
${lines(c.vietnam)}
<h2>Every nation that defended Saigon, and withdrew</h2>
${table(['Nation', 'Withdrew', 'After'], c.contributors.map(x => [`<b>${esc(x.nation)}</b>`, esc(x.withdrew), esc(x.after)]))}
<h2>The spread, and the retreat</h2>
${gauge(c.spread)}
<h2>Where communism went next</h2>
${lines(c.next)}
<h2>Neighbours are not harbours, unless</h2>
<div class="card"><p>${esc(c.neighbours)}</p></div>
<h2>Sources</h2>
<ul>${c.sources.map(s => `<li>${esc(s)}</li>`).join('')}</ul>`, c.text));
}

{
  const wb = WARS.find(w => w.id === 'air-workbook');
  writeFileSync(`projects/${pfile(60)}`, page(wb.name, 60, `a workbook, kind <code>workbook</code>, on the <a href="${pfile(59)}">bomb warfare room</a>`,
    `<div class="card warn"><span class="k">${esc(wb.also)}</span><p>${esc(wb.premise)}</p></div>
<p class="k">Pages: ${wb.pages.map(p => `<a href="#p${p.n}">${p.n}</a>`).join(' · ')}</p>
${wb.pages.map(p => `<h2 id="p${p.n}">Page ${p.n} of ${wb.pages.length} — ${esc(p.title)}</h2>
<div class="card"><p>${esc(p.lesson)}</p></div>
<h3>Exercises</h3>
<ol>${p.exercises.map((e, i) => `<li>${esc(e)}<details><summary class="k">answer</summary><p>${esc(p.answers[i])}</p></details></li>`).join('')}</ol>`).join('\n')}
<h2>Sources</h2>
<ul>${wb.sources.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`, wb.text));

  const lg = WARS.find(w => w.id === 'legacy');
  writeFileSync(`projects/${pfile(61)}`, page(lg.name, 61, `after the <a href="${pfile(59)}">air war</a> and after the rooms`,
    `<div class="card warn"><span class="k">${esc(lg.also)}</span></div>
${tollBox(1975, 'where the rooms stop; the legacy is what the toll does not count')}
<h2>Three ways to say the thesis</h2>
${table(['Tone', 'Thesis'], Object.entries(lg.thesis).map(([k, v]) => [esc(k), esc(v)]))}
${lg.sections.map(sec => `<h2>${esc(sec.title)}</h2>${lines(sec.lines)}`).join('\n')}
<h2>Bibliography, three styles</h2>
${table(['Style', 'Entry'], lg.bibliography.map(b => [esc(b[0]), esc(b[1])]))}`, lg.text));

  const cv = WARS.find(w => w.id === 'constellation');
  writeFileSync(`projects/${pfile(62)}`, page(cv.name, 62, `a ship, kind <code>ship</code>, at <a href="${pfile(59)}">Yankee Station</a> · <a href="../${gameOf(cv.name)}">you are Connie: the idle game</a>`,
    `<div class="card warn"><span class="k">${esc(cv.also)}</span><p><b>Station.</b> ${esc(cv.station)}</p></div>
${tollBox(1973, 'the last sortie, 1973')}
<h2>The ship, one line item each</h2>
${lines(cv.lines)}
<h2>Numbers</h2>
${table(['', ''], cv.numbers.map(x => [esc(x.k), esc(x.v)]))}
<h2>The game</h2>
<div class="card"><p>${esc(cv.game.note)}</p><p><a href="../${gameOf(cv.name)}">Launch</a> — resource: ${esc(cv.game.resource)}; unit: ${esc(cv.game.worker)}.</p></div>
<h2>Sources</h2>
<ul>${cv.sources.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`, cv.text));
}

{
  const au = WARS.find(w => w.id === 'australia');
  const key = 'idle:you-are-australia-building-ships';
  writeFileSync(gameOf(au.name), `<title>${esc(au.name)} &middot; idle</title>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<!-- Idle game 63/${TOTAL}, a shipyard, generated by session-index.mjs from templates-war/australia.json. Progress in localStorage under "${key}". -->
${STYLE}
<style>
  .game{background:var(--panel);border:1px solid var(--edge);border-radius:12px;padding:20px}
  .big{font:500 40px/1.1 var(--serif);color:var(--gold);margin:0 0 4px}
  .rate{color:var(--dim);margin:0 0 16px}
  button{background:var(--sea);color:var(--void);border:0;border-radius:8px;padding:10px 16px;font:600 14px/1 system-ui;cursor:pointer;margin:4px 6px 4px 0}
  button:disabled{opacity:.4;cursor:default}
  .yard{display:grid;grid-template-columns:1fr auto;gap:6px 12px;align-items:center;margin-top:12px}
  .yard .n{color:var(--ink)}.yard .c{color:var(--dim);font-size:12px}
  .yard button{background:var(--edge);color:var(--ink)}
  .fleet{color:var(--dim);font-size:12.5px;margin-top:12px}
</style>
<header>
  <h1>${esc(au.name)}</h1>
  <p>Idle game 63 of ${TOTAL} &middot; project <a href="../projects/${pfile(63)}">${esc(au.name)}</a> &middot; template <a href="../templates/${TEMPLATES[62]}.template.html">${TEMPLATES[62]}</a> &middot; repo <a href="${repoOf(au.name)}">randomcase/${slug(au.name)}</a></p>
</header>
<div class="wrap">
  <div class="game">
    <p class="big"><span id="n">0</span> steel</p>
    <p class="rate"><span id="r">0</span> steel/s &middot; <span id="t">0</span> tons afloat</p>
    <button id="tap">cut steel</button><button id="reset">reset</button>
    <div class="yard" id="yard"></div>
    <p class="fleet" id="fleet"></p>
    <p class="rate" style="margin:12px 0 0">${esc(au.game.note)}</p>
  </div>
  <a class="back" href="../session-index.html">&larr; back to the index</a>
</div>
<script>
(()=>{const K=${JSON.stringify(key)};const Y=${JSON.stringify(au.yard)};
let s={n:0,f:{},t:Date.now()};try{const j=JSON.parse(localStorage.getItem(K)||'null');if(j)s=j}catch(e){}
const $=i=>document.getElementById(i);
const cnt=id=>s.f[id]||0,cost=y=>Math.floor(y.cost*Math.pow(1.25,cnt(y.id))),rate=()=>Y.reduce((a,y)=>a+y.rate*cnt(y.id),0),tons=()=>Y.reduce((a,y)=>a+y.tons*cnt(y.id),0);
const save=()=>{try{localStorage.setItem(K,JSON.stringify(s))}catch(e){}};
const yard=$('yard');Y.forEach(y=>{yard.insertAdjacentHTML('beforeend',\`<div><span class="n">\${y.name}</span> <span class="c">\${y.tons.toLocaleString()} t · +\${y.rate}/s · \${y.note}</span></div><button data-id="\${y.id}">lay down (<span data-c="\${y.id}">\${cost(y)}</span>) · <span data-n="\${y.id}">0</span></button>\`)});
yard.onclick=e=>{const b=e.target.closest('button');if(!b)return;const y=Y.find(y=>y.id===b.dataset.id);if(s.n>=cost(y)){s.n-=cost(y);s.f[y.id]=cnt(y.id)+1;draw();save()}};
const draw=()=>{$('n').textContent=Math.floor(s.n).toLocaleString();$('r').textContent=rate();$('t').textContent=tons().toLocaleString();
Y.forEach(y=>{yard.querySelector('[data-c="'+y.id+'"]').textContent=cost(y).toLocaleString();yard.querySelector('[data-n="'+y.id+'"]').textContent=cnt(y.id);yard.querySelector('button[data-id="'+y.id+'"]').disabled=s.n<cost(y)});
$('fleet').textContent=Y.filter(y=>cnt(y.id)).map(y=>cnt(y.id)+' × '+y.name).join(' · ')||'no hulls yet'};
const off=(Date.now()-s.t)/1000;if(off>0)s.n+=Math.min(off,8*3600)*rate();
$('tap').onclick=()=>{s.n++;draw()};$('reset').onclick=()=>{s={n:0,f:{},t:Date.now()};draw();save()};
setInterval(()=>{s.n+=rate()/10;s.t=Date.now();draw();if(Math.random()<.1)save()},100);draw()})();
</script>
`);
  writeFileSync(`projects/${pfile(63)}`, page(au.name, 63, `a shipyard, kind <code>shipyard</code> · <a href="../${gameOf(au.name)}">play: you are Australia</a>`,
    `<div class="card warn"><span class="k">${esc(au.also)}</span><p>${esc(au.premise)}</p></div>
<h2>The table</h2>
${table(['Ship', 'Type', 'Length', 'Crew', 'Primary weapon', 'Reach', 'Verdict'], au.compare.map(x => [`<b>${esc(x.ship)}</b>`, esc(x.type), esc(x.length), esc(x.crew), esc(x.weapon), esc(x.reach), esc(x.verdict)]))}
<h2>The yard</h2>
${table(['Hull', 'Tons', 'Cost in steel', 'Steel/s', 'Note'], au.yard.map(y => [`<b>${esc(y.name)}</b>`, y.tons.toLocaleString('en-US'), y.cost.toLocaleString('en-US'), y.rate, esc(y.note)]))}
<div class="card"><p>${esc(au.game.note)}</p><p><a href="../${gameOf(au.name)}">Open the yard.</a></p></div>
<h2>Sources</h2>
<ul>${au.sources.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`, au.text));
}

// Project 33: the dossier is generated from the warlock archive plus a witch
// side kept here (there is no templates-witch/ yet; when one exists, read it).
const WARLOCKS = dir('templates-warlock');
const WITCHES = [
  { order: 1, name: 'Alice Kyteler', klass: 'tried', where: 'Kilkenny', when: 1324, fate: 'fled; her servant Petronilla was burned in her place', was: 'A four-times-widowed moneylender.', why: 'The first recorded witchcraft trial in Ireland was about an inheritance. The heresy charge arrived after the stepchildren’s complaint, not before it.' },
  { order: 2, name: 'Joan of Arc', klass: 'tried', where: 'Rouen', when: 1431, fate: 'burned; verdict annulled 1456; canonised 1920', was: 'A peasant who led an army at seventeen.', why: 'Convicted for heresy and for wearing men’s clothes, not for sorcery as such. The dossier keeps her because every later witch trial borrowed the shape of hers.' },
  { order: 3, name: 'Agnes Sampson', klass: 'tried', where: 'North Berwick', when: 1591, fate: 'strangled and burned', was: 'A midwife and healer, the “wise wife of Keith”.', why: 'Examined by James VI in person. The same trial as John Fian on the warlock side — one storm, two archives.' },
  { order: 4, name: 'Merga Bien', klass: 'tried', where: 'Fulda', when: 1603, fate: 'burned, pregnant', was: 'A wealthy heiress.', why: 'Her pregnancy after fourteen childless years was entered as evidence. Fulda’s prince-abbot ran roughly two hundred and fifty such cases in three years.' },
  { order: 5, name: 'Katharina Kepler', klass: 'tried', where: 'Leonberg', when: 1620, fate: 'released after fourteen months; died six months later', was: 'The astronomer’s mother.', why: 'Johannes Kepler dropped his work and argued the defence himself, for six years. She was shown the instruments of torture and still did not confess. Acquitted — the rare entry that ends that way.' },
  { order: 6, name: 'Isobel Gowdie', klass: 'tried', where: 'Auldearn', when: 1662, fate: 'unrecorded', was: 'A cottar’s wife.', why: 'Four confessions, apparently unforced, full of verse — the fullest first-person account of what a witch was supposed to do. No record says what became of her.' },
  { order: 7, name: 'Malin Matsdotter', klass: 'tried', where: 'Stockholm', when: 1676, fate: 'burned alive', was: 'A Finnish-born widow.', why: 'Denounced by her own daughters. Sweden burned the confessed after strangling them; she refused to confess and so was burned alive, the only one in that panic who was.' },
  { order: 8, name: 'Tituba', klass: 'tried', where: 'Salem Village', when: 1692, fate: 'jailed thirteen months; sold to pay her jail fees', was: 'An enslaved woman in the Parris household.', why: 'The first to confess, and her confession supplied the script the rest of Salem then followed. She outlived the panic because confessors were not hanged.' },
  { order: 9, name: 'Bridget Bishop', klass: 'tried', where: 'Salem', when: 1692, fate: 'hanged, the first', was: 'A tavern-keeper who wore a red bodice.', why: 'The evidence included the bodice, poppets in a cellar wall, and being disliked. Same year and same court as Burroughs and Corey on the other side.' },
  { order: 10, name: 'Rebecca Nurse', klass: 'tried', where: 'Salem', when: 1692, fate: 'hanged, after a not-guilty verdict was reversed', was: 'A seventy-one-year-old church member.', why: 'The jury acquitted her. The judge sent them back. That is the whole entry.' },
  { order: 11, name: 'Anna Göldi', klass: 'tried', where: 'Glarus', when: 1782, fate: 'beheaded; exonerated 2008', was: 'A maidservant.', why: 'The last person executed for witchcraft in Europe, by a Protestant canton, in the decade of the American Revolution. The exoneration came two hundred and twenty-six years later.' },
];
const drow = p => `  <tr><td class="num">${p.order}</td><td>${esc(p.name)}</td><td>${esc(p.klass)}</td><td>${esc(p.where)}</td><td class="num">${p.when}</td><td>${esc(p.fate)}</td></tr>`;
const dcard = p => `<div class="card"><span class="k">${p.klass} · ${esc(p.where)} · ${p.when}</span><br><b>${esc(p.name)}</b> — ${esc(p.was)}<p style="margin:6px 0 0">${esc(p.why)}</p><p class="k" style="margin:6px 0 0">fate: ${esc(p.fate)}</p></div>`;
const dtally = xs => Object.entries(xs.reduce((m, p) => (m[p.klass] = (m[p.klass] || 0) + 1, m), {})).map(([k, v]) => `${v} ${k}`).join(', ');
writeFileSync('projects/33-warlock-witch-dossier.html', `<title>Warlock and witch dossier &middot; project 33</title>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<!-- Project 33. Generated by session-index.mjs: the warlock half reads templates-warlock/*.json; the witch half is data in the same script. -->
<link rel="stylesheet" href="style.css">
<header>
  <h1>Warlock and witch dossier</h1>
  <p>Project 33 &middot; ${WARLOCKS.length} warlocks from the archive (${dtally(WARLOCKS)}) and ${WITCHES.length} witches (${dtally(WITCHES)}) &middot; <a href="../session-index.html">index</a> &middot; repo <a href="${repoOf('Warlock and witch dossier')}">randomcase/warlock-and-witch-dossier</a></p>
</header>
<main>
<h2>What the two halves have in common</h2>
<p>The warlock archive files three kinds of person under one word: the <b>tried</b>, who were killed for it; the <b>scholars</b>, who did chemistry and medicine before those had names and were called sorcerers for it afterwards; and the <b>teachers</b>, whose traditions remember them as more than human. The witch half has no scholars and no teachers. Every entry is <b>tried</b>. That asymmetry is the finding: the same century that called a man with a laboratory a magus called a woman with a garden a witch, and only one of those words came with a bishop’s mitre at the end.</p>
<p>Three trials appear on both sides — North Berwick 1591 (Fian, Sampson), Salem 1692 (Burroughs, Corey; Bishop, Nurse, Tituba) — which is the second finding: a panic does not sort by sex, it sorts by who is nearest.</p>
<h2>Warlocks, from <code>templates-warlock/</code></h2>
<div class="tw"><table><tr><th>#</th><th>Name</th><th>Class</th><th>Where</th><th>When</th><th>Fate</th></tr>
${WARLOCKS.map(drow).join('\n')}
</table></div>
<h2>Witches</h2>
<div class="tw"><table><tr><th>#</th><th>Name</th><th>Class</th><th>Where</th><th>When</th><th>Fate</th></tr>
${WITCHES.map(drow).join('\n')}
</table></div>
<h2>Entries</h2>
<h3>Warlocks</h3>
${WARLOCKS.map(dcard).join('\n')}
<h3>Witches</h3>
${WITCHES.map(dcard).join('\n')}
<h2>Method</h2>
<p>Warlock entries are read verbatim from the JSON files; the witch entries live in <code>session-index.mjs</code> until a <code>templates-witch/</code> directory exists, at which point the script should read that instead. Dates are the year of trial or death. “Fate” is the record’s last word, not a judgement.</p>
<a class="back" href="../session-index.html">&larr; back to the index</a>
</main>
`);

const rows = SESSIONS.map(([name, id, mode, status], i) =>
  `  <tr><td class="num">${i + 1}</td><td><a href="sessions/${slug(name)}-${id}.html">${esc(name)}</a></td><td>${id}</td><td>${esc(mode)}</td><td class="status-${status}">${esc(status)}</td><td><a href="${repoOf(name)}">${slug(name)}</a></td><td><a href="templates/${TEMPLATES[i]}.template.html">${TEMPLATES[i]}</a></td><td><a href="${gameOf(name)}">${RESOURCES(i)}</a></td></tr>`
).join('\n');
const prows = PROJECTS.map(([n, name, file, what]) =>
  `  <tr><td class="num">${n}</td><td><a href="${file}">${esc(name)}</a></td><td colspan="2">${esc(what)}</td><td class="status-offline">offline</td><td><a href="${repoOf(name)}">${slug(name)}</a></td><td><a href="templates/${TEMPLATES[n - 1]}.template.html">${TEMPLATES[n - 1]}</a></td><td><a href="${gameOf(name)}">${RESOURCES(n - 1)}</a></td></tr>`
).join('\n');
const idleCount = SESSIONS.filter(s => s[3] === 'idle').length;
writeFileSync('session-index.html', `<title>Session index &middot; a snapshot, not a live view</title>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<!-- SESSION INDEX — a plain snapshot of ListAgents output from one moment in this conversation, plus the written projects. Regenerated by session-index.mjs; the data lives in that file and under templates-*/, not here. No script. -->
${STYLE}
<style>.num{text-align:right;font-variant-numeric:tabular-nums;color:var(--dim)}</style>
<header>
  <h1>Session Index</h1>
  <p>Every peer session visible to this one via <code>ListAgents</code>, at the moment this page was written. Read-only: nothing here can start, stop, or message another session. Each row links to its page (the project), its repo under <code>randomcase/</code>, one template, and one idle game. Projects ${PROJECTS[0][0]}–${PROJECTS.at(-1)[0]} are not sessions; they are written pages, given the same treatment, every one with a repository. This index is appended to <a href="https://github.com/randomcase/vietnam-war-legacy-project">randomcase/vietnam-war-legacy-project</a> under <code>index/</code>.</p>
</header>
<div class="wrap">
<table>
  <tr><th>#</th><th>Project</th><th>ID</th><th>Mode</th><th>Status</th><th>Repo</th><th>Template</th><th>Idle game</th></tr>
${rows}
  <tr><th>#</th><th>Project</th><th colspan="2">What</th><th>Status</th><th>Repo</th><th>Template</th><th>Idle game</th></tr>
${prows}
</table>
<p class="tally"><b>${SESSIONS.length}</b> sessions &middot; <b>${PROJECTS.length}</b> written projects &middot; <b>${TOTAL}</b> repos &middot; <b>${TOTAL}</b> templates &middot; <b>${TOTAL}</b> idle games &middot; <b>${SESSIONS.length - idleCount}</b> offline &middot; <b>${idleCount}</b> idle &middot; this session (venus-d0) not listed, since a session cannot list itself</p>
</div>
`);
console.log(`session-index: ${SESSIONS.length} session pages, ${PROJECTS.length} projects, ${TOTAL} idle games, index relinked`);

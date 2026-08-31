#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   writing.mjs — builds writing.html: a notebook, a console under it, and a
   teacher in the right-hand leaf.

   IT LIES ON ITS SIDE. Venus on her back, Virgo reclining, a book open flat in
   landscape with a stitched spine. The cover is not decoration: Virgo is
   plotted from her real stars, right ascension against declination, which is
   already a long low figure lying east to west — she is on her side because
   that is how she lies. The ecliptic is computed from the obliquity, Venus
   sits on it inside Virgo because Virgo is a zodiac constellation and Venus
   crosses her, and Spica's ecliptic latitude is computed and given as the
   reason the two keep meeting.

   ── the drawer ───────────────────────────────────────────────────────────
   A console that operates the notebook rather than decorating it. ls, open,
   new, form, template, count, syl, spiral, rhyme, run, learn, lesson,
   practice, check, export. Anything it does not recognise it evaluates as
   JavaScript. That is the difference between a text box and a place to work.

   ── full teacher mode ────────────────────────────────────────────────────
   templates-lesson/*.json carries five lessons, and A LESSON THAT CANNOT TELL
   YOU WHETHER YOU GOT IT IS A LECTURE. Every one ends in a practice with
   CHECKS: expressions run against the functions the student writes, in the
   drawer, in their own browser. Type check and the notebook marks it.

   Two of the checks read the student's own source rather than its output —
   one proving a coin validator never touches the registry sitting beside it,
   one proving a rule never consults a clock. Those are the only honest way to
   test the absence of a dependency, and they are the point of their lessons.

   This file REFUSES a lesson that:
     · names a prerequisite that does not exist, or forms a cycle with one
     · has a practice with no checks — that is a lecture wearing a exercise
     · has a practice whose form is not a runnable one
     · duplicates an order, or leaves a hole in 1..n

   ── the forms ────────────────────────────────────────────────────────────
   templates-form/*.json declares a shape completely enough that a machine can
   hold you to it. Fifteen: eleven verse and prose, four code. Refused if the
   stanzas do not sum to the lines, the rhyme scheme is the wrong length, a
   refrain points forward or at itself, a sestina permutation is not one or
   does not follow from the spiral, or the order is missing, duplicated or
   holed.

   THE VERSE TEMPLATES ARE DERIVED, NOT TYPED. A form's starter is built here
   from its own declared shape, so it cannot drift from the rule it is a
   template for, because nobody wrote it down twice. Code forms carry an
   authored template, since code has no shape to derive one from.

   The sestina check is the interesting one. Applied to 1..6 the spiral
   returns after exactly six passes, which is why the form has six stanzas:
   the stanza count is the ORDER of the permutation, not a number anybody
   chose. It does not hold for every count — four end-words close after three
   — and the counts where it does are computed here rather than remembered,
   because I asserted the wrong ones once already.

   ── what the room does not do ────────────────────────────────────────────
   It does not grade writing, score it, or colour a line red. Syllables are a
   heuristic over English spelling and the page says so where you can see it.
   Every draft is kept. One localStorage key, no network.

       node writing.mjs
   ═══════════════════════════════════════════════════════════════════════════ */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* ═══ 1 · the forms ════════════════════════════════════════════════════ */
const DIR = 'templates-form';
const forms = [];
const taken = new Map();
let fatal = 0;

/* the sestina spiral: last, first, second-to-last, second, inward */
function spiral(order) {
  const out = [];
  for (let i = 0; i < order.length; i++)
    out.push(i % 2 === 0 ? order[order.length - 1 - i / 2] : order[(i - 1) / 2]);
  return out;
}

for (const file of readdirSync(DIR).filter((f) => f.endsWith('.json')).sort()) {
  const c = JSON.parse(readFileSync(join(DIR, file), 'utf8'));
  const errs = [];

  for (const k of ['id', 'name', 'kind', 'note', 'ground', 'ask', 'order'])
    if (!c[k]) errs.push('missing ' + k);
  if (c.kind && !['verse', 'prose', 'code'].includes(c.kind))
    errs.push('kind must be verse, prose or code');

  if (c.order != null) {
    if (!Number.isInteger(c.order) || c.order < 1)
      errs.push('order must be a positive integer');
    if (taken.has(c.order))
      errs.push('order ' + c.order + ' is already ' + taken.get(c.order));
    taken.set(c.order, c.id);
  }

  if (c.kind === 'code') {
    if (!c.language) errs.push('a code form must name its language');
    if (!c.template) errs.push('a code form must carry a template — code has ' +
      'no declared shape to derive one from');
    if (c.runnable && c.language !== 'js')
      errs.push('only js runs in the drawer; ' + c.language + ' cannot');
    if (c.lines || c.rhyme || c.stanzas)
      errs.push('a code form declaring lines, rhyme or stanzas is a verse form ' +
        'wearing the wrong kind');
  }

  if (c.stanzas) {
    const sum = c.stanzas.reduce((a, b) => a + b, 0);
    if (sum !== c.lines) errs.push('stanzas sum to ' + sum + ' but lines is ' + c.lines);
  }
  if (c.rhyme && c.rhyme.length !== c.lines)
    errs.push('rhyme scheme is ' + c.rhyme.length + ' long, lines is ' + c.lines);

  for (const r of c.repeats || []) {
    if (r.line < 1 || r.line > c.lines) errs.push('refrain at line ' + r.line + ' is off the page');
    if (r.same_as < 1 || r.same_as > c.lines) errs.push('refrain points at line ' + r.same_as + ', off the page');
    if (r.same_as === r.line) errs.push('line ' + r.line + ' repeats itself');
    if (r.same_as > r.line) errs.push('line ' + r.line + ' repeats line ' + r.same_as + ', which has not happened yet');
  }

  if (c.permutation) {
    const k = c.end_words, seen = new Set();
    c.permutation.forEach((row, i) => {
      if (row.length !== k) errs.push('permutation row ' + (i + 1) + ' has ' + row.length + ' of ' + k);
      if (new Set(row).size !== row.length) errs.push('permutation row ' + (i + 1) + ' repeats a word');
      for (const n of row) if (n < 1 || n > k) errs.push('permutation row ' + (i + 1) + ' names word ' + n);
      seen.add(row.join(','));
      if (i > 0) {
        const want = spiral(c.permutation[i - 1]);
        if (row.join(',') !== want.join(','))
          errs.push('row ' + (i + 1) + ' is ' + row.join('') + ' but the spiral gives ' + want.join(''));
      }
    });
    if (seen.size !== c.permutation.length)
      errs.push('the permutation repeats an order before the poem ends');
    const close = spiral(c.permutation[c.permutation.length - 1]);
    if (close.join(',') !== c.permutation[0].join(','))
      errs.push('the spiral does not return to the first order after ' +
                c.permutation.length + ' stanzas, so this length is arbitrary');
  }

  console.log((errs.length ? 'REFUSED' : 'ok     ') + ' ' + (c.id || file).padEnd(16) +
    (c.kind || '?').padEnd(6) +
    (c.lines ? String(c.lines).padStart(2) + ' lines' : (c.language || '').padStart(8)) +
    (c.rhyme ? ' · rhyme' : '') + (c.repeats ? ' · ' + c.repeats.length + ' refrains' : '') +
    (c.permutation ? ' · spiral closes' : ''));
  errs.forEach((e) => console.log('        x ' + e));
  if (errs.length) { fatal++; continue; }
  forms.push(c);
}

forms.sort((a, b) => a.order - b.order);
if (fatal) {
  console.log('\n' + fatal + ' form(s) refused. writing.html not written — a form ' +
    'whose shape does not close cannot hold anybody to anything.');
  process.exit(1);
}
const holes = forms.filter((f, n) => f.order !== n + 1).map((f) => f.id);
if (holes.length) {
  console.log('\nthe form order is not 1..' + forms.length + ' — it breaks at ' +
    holes.join(', ') + '. A list a writer scrolls should have no hole in it.');
  process.exit(1);
}

/* ── templates DERIVED from the declared shape ────────────────────────── */
/* A verse template written by hand is the same rule stated twice, and the
   second statement is the one that goes stale. Build it from the form. */
for (const f of forms) {
  if (f.template) continue;                 /* code forms carry their own */
  if (f.kind === 'prose' && f.beats) {
    f.template = f.beats.map((b) => '## ' + b.name + '\n\n' + b.ask + '\n').join('\n');
    continue;
  }
  if (!f.lines) { f.template = ''; continue; }

  const rep = {}; (f.repeats || []).forEach((r) => { rep[r.line] = r.same_as; });
  const brk = new Set(); let acc = 0;
  (f.stanzas || []).forEach((n) => { acc += n; brk.add(acc); });

  const out = [];
  for (let i = 1; i <= f.lines; i++) {
    const bits = [];
    if (f.rhyme) bits.push('rhyme ' + f.rhyme[i - 1]);
    if (rep[i]) bits.push('REFRAIN — repeat line ' + rep[i]);
    if (f.meter) {
      const s = Array.isArray(f.meter.syllables)
        ? f.meter.syllables[(i - 1) % f.meter.syllables.length] : f.meter.syllables;
      bits.push(s + ' syllables');
    }
    /* the envoi runs past the six stanzas of six, so it has no row in the
       permutation — it takes two end words a line instead of one. */
    if (f.permutation && i <= f.permutation.length * f.end_words)
      bits.push('end word ' + f.permutation[Math.floor((i - 1) / f.end_words)][(i - 1) % f.end_words]);
    else if (f.permutation && f.envoi)
      bits.push('end words ' + f.envoi[i - 1 - f.permutation.length * f.end_words].join(' and '));
    out.push(bits.length ? '                    /* ' + i + ': ' + bits.join(', ') + ' */' : '');
    if (brk.has(i) && i !== f.lines) out.push('');
  }
  f.template = out.join('\n') + '\n';
}

/* Which end-word counts give a form whose stanza count equals its number of
   end words. The spiral is a permutation; its ORDER is how many applications
   return the identity, and only when that equals k does the form close on its
   own terms. Computed, because I asserted the wrong ones from memory once. */
const QUENEAU = [];
for (let k = 2; k <= 20; k++) {
  const id = Array.from({ length: k }, (_, i) => i + 1).join(',');
  let o = id.split(',').map(Number), n = 0;
  do { o = spiral(o); n++; } while (o.join(',') !== id && n <= k);
  if (n === k) QUENEAU.push(k);
}

/* ═══ 2 · the lessons ══════════════════════════════════════════════════ */
const LDIR = 'templates-lesson';
const lessons = [];
const lTaken = new Map();
let lFatal = 0;
const runnable = new Set(forms.filter((f) => f.runnable).map((f) => f.id));

if (existsSync(LDIR)) {
  for (const file of readdirSync(LDIR).filter((f) => f.endsWith('.json')).sort()) {
    const c = JSON.parse(readFileSync(join(LDIR, file), 'utf8'));
    const errs = [];

    for (const k of ['id', 'title', 'order', 'subject', 'one_line', 'sections', 'practice', 'ask'])
      if (!c[k]) errs.push('missing ' + k);

    if (c.order != null) {
      if (!Number.isInteger(c.order) || c.order < 1) errs.push('order must be a positive integer');
      if (lTaken.has(c.order)) errs.push('order ' + c.order + ' is already ' + lTaken.get(c.order));
      lTaken.set(c.order, c.id);
    }

    for (const s of c.sections || []) {
      if (!s.heading) errs.push('a section with no heading');
      if (!Array.isArray(s.body) || !s.body.length) errs.push('section "' + s.heading + '" has no body');
      if (s.show && !s.show.code) errs.push('section "' + s.heading + '" shows nothing');
    }

    const p = c.practice || {};
    /* the whole difference between a lesson and a lecture */
    if (!Array.isArray(p.checks) || !p.checks.length)
      errs.push('the practice has no checks — a lesson that cannot tell you ' +
        'whether you got it is a lecture');
    for (const ck of p.checks || []) {
      if (!ck.name) errs.push('a check with no name');
      if (!ck.test) errs.push('check "' + ck.name + '" tests nothing');
    }
    /* a constraint nobody can break is a sentence, not a check. If a lesson
       declares one it has to ship something that violates it. */
    const cons = (p.checks || []).filter((c) => c.constraint);
    if (cons.length && !(Array.isArray(p.violators) && p.violators.length))
      errs.push(cons.length + ' constraint check(s) with no violator on file — ' +
        'a constraint nothing can break has not been shown to check anything');
    if (!p.starter) errs.push('the practice has no starter');
    if (!p.brief) errs.push('the practice has no brief');
    if (p.form && !runnable.has(p.form))
      errs.push('practice form "' + p.form + '" cannot run in the drawer, so ' +
        'its checks could never be run');

    console.log((errs.length ? 'REFUSED' : 'ok     ') + ' ' + (c.id || file).padEnd(22) +
      String(c.order || '?').padStart(2) + ' · ' +
      String((c.sections || []).length).padStart(2) + ' sections · ' +
      String((p.checks || []).length).padStart(2) + ' checks · needs ' +
      ((c.needs || []).join(', ') || 'nothing'));
    errs.forEach((e) => console.log('        x ' + e));
    if (errs.length) { lFatal++; continue; }
    lessons.push(c);
  }
}

lessons.sort((a, b) => a.order - b.order);

/* prerequisites must exist and must not close a loop — a syllabus you cannot
   start is the same failure as a quest that recurses */
const have = new Set(lessons.map((l) => l.id));
for (const l of lessons)
  for (const n of l.needs || [])
    if (!have.has(n)) { console.log('        x ' + l.id + ' needs "' + n + '", which is not here'); lFatal++; }

const state = new Map();
function walk(id, trail) {
  if (state.get(id) === 'done') return;
  if (state.get(id) === 'open') {
    console.log('        x prerequisite cycle: ' + trail.concat(id).join(' -> '));
    lFatal++; return;
  }
  state.set(id, 'open');
  for (const n of (lessons.find((l) => l.id === id) || {}).needs || [])
    if (have.has(n)) walk(n, trail.concat(id));
  state.set(id, 'done');
}
lessons.forEach((l) => walk(l.id, []));

if (lFatal) {
  console.log('\n' + lFatal + ' lesson problem(s). writing.html not written.');
  process.exit(1);
}
const lHoles = lessons.filter((l, n) => l.order !== n + 1).map((l) => l.id);
if (lHoles.length) {
  console.log('\nthe lesson order is not 1..' + lessons.length + ' — it breaks at ' +
    lHoles.join(', ') + '.');
  process.exit(1);
}

/* a lesson may only be reached after what it needs, so the order must not put
   a lesson before its own prerequisite */
const pos = new Map(lessons.map((l, i) => [l.id, i]));
for (const l of lessons)
  for (const n of l.needs || [])
    if (pos.get(n) > pos.get(l.id)) {
      console.log('\n' + l.id + ' is ordered before ' + n + ', which it needs.');
      process.exit(1);
    }

const checkCount = lessons.reduce((a, l) => a + l.practice.checks.length, 0);

/* ═══ 3 · Virgo, on her side, with the ecliptic through her ════════════ */
/* Right ascension in hours, declination in degrees, magnitude. J2000. */
const VIRGO = [
  ['Spica',            13.4199, -11.1614, 0.98],
  ['Zavijava',         11.8450,   1.7647, 3.60],
  ['Zaniah',           12.3319,  -0.6668, 3.89],
  ['Porrima',          12.6944,  -1.4494, 2.74],
  ['Auva',             12.9267,   3.3975, 3.38],
  ['Vindemiatrix',     13.0362,  10.9592, 2.83],
  ['Heze',             13.5783,  -0.5961, 3.38],
  ['Syrma',            14.2669,  -6.0006, 4.08],
  ['Rijl al Awwa',     14.7178,  -5.6583, 3.87],
  ['109 Virginis',     14.7708,   1.8928, 3.72],
  ['Tau Virginis',     14.0275,   1.5444, 4.23],
  ['Theta Virginis',   13.1658,  -5.5389, 4.38],
  ['Kappa Virginis',   14.2150, -10.2736, 4.18],
  ['Nu Virginis',      11.7864,   6.5297, 4.04],
  ['Omicron Virginis', 12.0906,   8.7325, 4.12]
];
const LINKS = [
  ['Zavijava', 'Zaniah'], ['Zaniah', 'Porrima'], ['Porrima', 'Auva'],
  ['Auva', 'Vindemiatrix'], ['Porrima', 'Spica'], ['Spica', 'Heze'],
  ['Heze', 'Auva'], ['Heze', 'Syrma'], ['Syrma', 'Rijl al Awwa'],
  ['Rijl al Awwa', '109 Virginis'], ['109 Virginis', 'Tau Virginis'],
  ['Tau Virginis', 'Heze'], ['Spica', 'Kappa Virginis'],
  ['Zavijava', 'Nu Virginis'], ['Nu Virginis', 'Omicron Virginis']
];

/* the ecliptic, computed: dec = asin(sin e sin L), ra = atan2(cos e sin L, cos L) */
const OB = 23.4393 * Math.PI / 180;
const ecliptic = [];
for (let L = 170; L <= 226; L += 1) {
  const l = L * Math.PI / 180;
  const dec = Math.asin(Math.sin(OB) * Math.sin(l)) * 180 / Math.PI;
  let ra = Math.atan2(Math.cos(OB) * Math.sin(l), Math.cos(l)) * 12 / Math.PI;
  if (ra < 0) ra += 24;
  ecliptic.push([ra, dec, L]);
}

const RA0 = 11.6, RA1 = 15.0, D0 = -13.0, D1 = 12.5;
const W = 1200, H = 400, PAD = 42;
const px = (ra) => PAD + (RA1 - ra) / (RA1 - RA0) * (W - 2 * PAD);
const py = (dec) => PAD + (D1 - dec) / (D1 - D0) * (H - 2 * PAD);
const star = (n) => VIRGO.find((s) => s[0] === n);
const rad = (m) => Math.max(1.1, 4.5 - m * 0.7);

/* Spica's ecliptic latitude: beta = asin(sin d cos e - cos d sin e sin a).
   A property of Spica, rather than of wherever I happened to sample the line. */
const SP = star('Spica');
const spA = SP[1] * 15 * Math.PI / 180, spD = SP[2] * Math.PI / 180;
const spicaGap = Math.abs(Math.asin(Math.sin(spD) * Math.cos(OB) -
  Math.cos(spD) * Math.sin(OB) * Math.sin(spA)) * 180 / Math.PI).toFixed(2);

const VEN = ecliptic.reduce((b, p) =>
  Math.abs(p[0] - 13.30) < Math.abs(b[0] - 13.30) ? p : b);

/* field stars, so she is in a sky and not on a diagram. Placed by a fixed
   hash rather than at random, so the picture is identical every build and a
   diff means somebody changed something. */
const field = [];
for (let i = 0, h = 20260831; i < 200; i++) {
  h = (h * 1103515245 + 12345) & 0x7fffffff; const x = (h / 0x7fffffff) * W;
  h = (h * 1103515245 + 12345) & 0x7fffffff; const y = (h / 0x7fffffff) * H;
  h = (h * 1103515245 + 12345) & 0x7fffffff;
  field.push([x, y, 0.28 + (h / 0x7fffffff) * 0.8]);
}

const sky =
  '<svg viewBox="0 0 ' + W + ' ' + H + '" class="sky" aria-label="Virgo lying on her side, the ecliptic through her, Venus on it">\n' +
  '  <defs>\n' +
  '    <radialGradient id="vg"><stop offset="0" stop-color="#fffbef"/>' +
  '<stop offset=".36" stop-color="#f4d98f"/><stop offset="1" stop-color="#c9962a" stop-opacity="0"/></radialGradient>\n' +
  '    <radialGradient id="wash" cx="50%" cy="46%"><stop offset="0" stop-color="#191b2d" stop-opacity=".92"/>' +
  '<stop offset="1" stop-color="#0a0910" stop-opacity="0"/></radialGradient>\n' +
  '  </defs>\n' +
  '  <rect width="' + W + '" height="' + H + '" fill="url(#wash)"/>\n' +
  field.map((s) => '  <circle class="fs" cx="' + s[0].toFixed(1) + '" cy="' +
    s[1].toFixed(1) + '" r="' + s[2].toFixed(2) + '"/>').join('\n') + '\n' +
  '  <path class="ecl" d="' + ecliptic.map((p, i) =>
      (i ? 'L' : 'M') + px(p[0]).toFixed(1) + ' ' + py(p[1]).toFixed(1)).join(' ') + '"/>\n' +
  LINKS.map(([a, b]) => {
    const A = star(a), B = star(b);
    return '  <line class="lk" x1="' + px(A[1]).toFixed(1) + '" y1="' + py(A[2]).toFixed(1) +
           '" x2="' + px(B[1]).toFixed(1) + '" y2="' + py(B[2]).toFixed(1) + '"/>';
  }).join('\n') + '\n' +
  VIRGO.map((s) =>
    '  <circle class="st" cx="' + px(s[1]).toFixed(1) + '" cy="' + py(s[2]).toFixed(1) +
    '" r="' + rad(s[3]).toFixed(2) + '"><title>' + esc(s[0]) + ', magnitude ' + s[3] +
    '</title></circle>').join('\n') + '\n' +
  '  <circle cx="' + px(VEN[0]).toFixed(1) + '" cy="' + py(VEN[1]).toFixed(1) + '" r="30" fill="url(#vg)"/>\n' +
  '  <circle class="ven" cx="' + px(VEN[0]).toFixed(1) + '" cy="' + py(VEN[1]).toFixed(1) + '" r="4.8">' +
  '<title>Venus, on the ecliptic</title></circle>\n' +
  '  <text class="lb" x="' + (px(SP[1]) + 10).toFixed(1) + '" y="' + (py(SP[2]) + 15).toFixed(1) + '">SPICA</text>\n' +
  '  <text class="lb vn" x="' + (px(VEN[0]) + 14).toFixed(1) + '" y="' + (py(VEN[1]) - 14).toFixed(1) + '">VENUS</text>\n' +
  '  <text class="lb dim" x="' + (px(star('Vindemiatrix')[1]) + 10).toFixed(1) + '" y="' +
     (py(star('Vindemiatrix')[2]) + 4).toFixed(1) + '">Vindemiatrix</text>\n' +
  '  <text class="lb dim" x="' + px(14.82).toFixed(1) + '" y="' + py(-2.6).toFixed(1) + '">the ecliptic</text>\n' +
  '</svg>';

/* ═══ 4 · the page ════════════════════════════════════════════════════ */
const html = '<!doctype html>\n<html lang="en">\n<head>\n' +
'<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n' +
'<title>The notebook &middot; Virgo on her side</title>\n' +
'<!-- No webfont and no other off-origin request. The notebook makes none at all, which is what 100 per cent privacy has to mean if the mint is worth anything. -->\n' +
'<style>\n' +
`  :root{
    --room:#08070a;
    --paper:#f2ead7; --paper2:#e6dbc0; --edgepg:#d9cdb0;
    --rule:#cec1a4; --margin:#a8443a;
    --ink:#22201b; --pale:#7a6f5d; --faint:#a2957c;
    --gold:#a8791a; --foil:#d9b455;
    --term:#0c0b0a; --term2:#141210;
    --amber:#d8b46b; --moss:#82a98d; --rust:#c4674f;
    --serif:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,"Times New Roman",serif;
    --mono:ui-monospace,"Cascadia Mono","Cascadia Code",Consolas,"SF Mono",Menlo,monospace;
  }
  *{box-sizing:border-box}
  html,body{height:100%}
  body{margin:0;background:var(--room);color:var(--ink);overflow:hidden;
    font:15px/1.6 var(--serif);
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    padding:14px 14px 0}

  /* ══ the cover ══════════════════════════════════════════════════════ */
  #cover{position:fixed;inset:0;z-index:80;
    background:radial-gradient(150% 105% at 50% 56%,#141223 0%,#0a0910 55%,#050409 100%);
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    cursor:pointer;transition:opacity .7s ease,visibility .7s}
  #cover.gone{opacity:0;visibility:hidden}
  .sky{width:min(1180px,95vw);height:auto;display:block}
  .ecl{fill:none;stroke:#46597a;stroke-width:1;stroke-dasharray:5 7;opacity:.8}
  .lk{stroke:#5a688a;stroke-width:.85;opacity:.55}
  .st{fill:#eef1fa}
  .fs{fill:#8f9ab5;opacity:.4}
  .ven{fill:#ffe9ae}
  .lb{fill:#96a2ba;font:600 9.5px/1 var(--mono);letter-spacing:.22em}
  .lb.dim{fill:#5b667c;font-weight:300;font-size:8.5px;letter-spacing:.1em}
  .lb.vn{fill:var(--foil);font-size:10.5px}
  #cover h1{margin:12px 0 3px;color:#efe6d2;
    font:500 33px/1.1 var(--serif);letter-spacing:.3em;text-indent:.3em}
  #cover .sub{color:var(--foil);font:300 8.5px/1 var(--mono);
    letter-spacing:.4em;text-indent:.4em;margin:0 0 16px}
  #cover p{margin:0;color:#6c7488;max-width:66ch;text-align:center;
    font:300 10.5px/1.95 var(--mono)}
  #cover p b{color:#9aa7bf;font-weight:400}
  #open{margin-top:22px;background:none;border:1px solid #2f3648;color:#8d95aa;
    padding:9px 26px;cursor:pointer;font:400 9.5px/1 var(--mono);letter-spacing:.3em}
  #open:hover{border-color:var(--foil);color:var(--foil)}

  /* ══ the book ═══════════════════════════════════════════════════════ */
  #book{display:grid;grid-template-columns:1fr 16px 1fr;
    width:min(1600px,100%);flex:1;min-height:0;
    box-shadow:0 0 0 1px #191510, 0 2px 0 #cfc3a6, 0 4px 0 #b9ad91,
      0 6px 0 #a2977d, 0 32px 66px -16px rgba(0,0,0,.85)}
  .leaf{background:linear-gradient(175deg,var(--paper) 0%,var(--paper2) 88%,var(--edgepg) 100%);
    display:flex;flex-direction:column;min-width:0;min-height:0;position:relative}
  .leaf::after{content:"";position:absolute;inset:0;pointer-events:none;
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)' opacity='.05'/%3E%3C/svg%3E")}
  .leaf.l{box-shadow:inset -26px 0 30px -26px rgba(62,44,18,.6)}
  .leaf.r{box-shadow:inset 26px 0 30px -26px rgba(62,44,18,.6)}
  #spine{background:linear-gradient(90deg,#8a7a58 0%,#3d3427 34%,#241d15 50%,#3d3427 66%,#8a7a58 100%);
    box-shadow:inset 0 0 12px rgba(0,0,0,.75);position:relative}
  #spine::before{content:"";position:absolute;left:50%;top:6%;bottom:6%;width:1px;
    transform:translateX(-.5px);
    background:repeating-linear-gradient(180deg,var(--foil) 0 9px,transparent 9px 22px);
    opacity:.5}

  #head{display:flex;align-items:center;gap:9px;padding:11px 20px 10px 60px;
    border-bottom:1px solid var(--rule);flex:none}
  #ttl{flex:1;min-width:0;background:none;border:none;outline:none;color:var(--ink);
    font:italic 500 21px/1.25 var(--serif)}
  #ttl::placeholder{color:var(--faint)}
  #head select,#head button{background:#e5d9bf;border:1px solid var(--rule);
    color:var(--ink);padding:5px 8px;cursor:pointer;font:400 10px/1.25 var(--mono)}
  #head select{max-width:160px}
  #head button{background:none;color:var(--pale)}
  #head button:hover{color:var(--gold);border-color:var(--gold)}

  #wrap{flex:1;overflow:auto;position:relative;display:flex;min-height:0}
  #gut{flex:none;width:48px;padding:14px 8px 0 0;text-align:right;
    font:400 12px/30px var(--mono);color:#bfb298;user-select:none;
    border-right:1px solid transparent}
  body.code #gut{border-right-color:var(--rule);font-size:11.5px;
    line-height:24px;padding-top:12px;color:#b3a68c}
  #stack{flex:1;position:relative;min-width:0}
  /* the highlight layer sits directly under a transparent textarea. Identical
     font, size, line-height, padding and wrapping, or the ink slides off the
     letters — which is why both are set from one rule and never separately. */
  #hl,#pen{margin:0;padding:14px 24px 40vh 14px;border:0;
    font:16px/30px var(--serif);white-space:pre-wrap;word-break:break-word;
    overflow-wrap:break-word;tab-size:2}
  body.code #hl,body.code #pen{font:13.5px/24px var(--mono);padding-top:12px}
  #hl{position:absolute;inset:0;pointer-events:none;color:var(--ink);overflow:hidden}
  #pen{position:relative;width:100%;min-height:100%;display:block;resize:none;
    background:transparent;outline:none;color:var(--ink);
    background-image:repeating-linear-gradient(180deg,
      transparent 0 29px,var(--rule) 29px 30px);
    background-position:0 14px;background-attachment:local}
  body.code #pen{color:transparent;caret-color:var(--ink);background-image:none}
  #pen::placeholder{color:var(--faint)}
  #pen::selection{background:rgba(168,68,58,.22)}
  .leaf.l::before{content:"";position:absolute;left:48px;top:0;bottom:0;width:1px;
    background:var(--margin);opacity:.34;pointer-events:none;z-index:3}
  body.code .leaf.l::before{opacity:0}

  /* syntax, in ink and iron rather than in neon */
  .k{color:#7a4a86;font-weight:600}
  .s{color:#5f7248}
  .c{color:#9c9280;font-style:italic}
  .n{color:#96661f}
  .p{color:#6a6255}
  .t{color:#2f5f6e;font-weight:600}
  .a{color:#8a5a3a}

  /* ══ the right leaf ═════════════════════════════════════════════════ */
  #tabs{display:flex;border-bottom:1px solid var(--rule);flex:none}
  #tabs button{flex:1;background:none;border:none;border-right:1px solid var(--rule);
    padding:12px 2px;cursor:pointer;color:var(--faint);
    font:400 8px/1 var(--mono);letter-spacing:.13em;text-transform:uppercase}
  #tabs button:last-child{border-right:none}
  #tabs button:hover{color:var(--pale)}
  #tabs button.on{color:var(--ink);background:#e5d9bf;box-shadow:inset 0 -2px 0 var(--gold)}
  #tabs button.teach.on{box-shadow:inset 0 -2px 0 var(--margin)}
  .pane{display:none;flex:1;overflow-y:auto;padding:20px 24px 34px;min-height:0}
  .pane.on{display:block}

  h3{margin:0 0 2px;font:600 20px/1.22 var(--serif);color:var(--ink)}
  .sub{margin:0 0 15px;font:300 9.5px/1.5 var(--mono);color:var(--faint);
    letter-spacing:.1em;text-transform:uppercase}
  .note{margin:0 0 13px;font:400 14px/1.72 var(--serif);color:#3f382e}
  .ground{margin:0 0 13px;padding:13px 15px;background:#e9dfc6;
    border-left:2px solid var(--gold);font:400 13px/1.75 var(--serif);color:#4d4436}
  .ask{margin:0;padding:13px 15px;border:1px dashed var(--rule);
    font:italic 400 14px/1.65 var(--serif);color:#544a3c}
  .ask b{display:block;font:400 8px/1 var(--mono);font-style:normal;
    letter-spacing:.2em;text-transform:uppercase;color:var(--faint);margin-bottom:7px}

  .shape{margin:0;padding:0;list-style:none;font:400 11px/1 var(--mono)}
  .shape li{display:flex;align-items:center;gap:8px;padding:5px 0;
    border-bottom:1px dotted #dbcfb6}
  .shape .no{width:20px;text-align:right;color:var(--faint);font-variant-numeric:tabular-nums}
  .shape .rh{width:14px;text-align:center;color:var(--gold);font-weight:600}
  .shape .rf{color:var(--margin);font-size:8.5px}
  .shape .tx{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;
    white-space:nowrap;color:#544a3c;font:400 13px/1.3 var(--serif)}
  .shape .tx.e{color:#c2b599;font-style:italic}
  .shape .sy{width:36px;text-align:right;color:var(--faint);font-size:9.5px;
    font-variant-numeric:tabular-nums}
  .shape .sy.off{color:var(--gold);font-weight:600}
  .shape li.done{background:#ebe1ca}
  .shape li.brk{border-bottom:1px solid var(--pale);padding-bottom:10px;margin-bottom:6px}

  #ends{display:grid;grid-template-columns:repeat(6,1fr);gap:5px;margin-bottom:13px}
  #ends input{background:#e9dfc6;border:1px solid var(--rule);padding:7px 5px;
    font:400 11px/1 var(--mono);color:var(--ink);text-align:center;min-width:0;outline:none}
  #ends input:focus{border-color:var(--gold);background:#f0e7d2}
  #spiral{width:100%;border-collapse:collapse;font:400 10.5px/1 var(--mono)}
  #spiral th{color:var(--faint);font-weight:400;font-size:8px;letter-spacing:.14em;
    text-transform:uppercase;padding:0 0 7px}
  #spiral td{padding:6px 4px;border-top:1px dotted #dbcfb6;color:#544a3c;
    text-align:center;overflow:hidden;text-overflow:ellipsis;max-width:0}
  #spiral td.now{background:#ebe1ca;color:var(--ink);font-weight:600}
  #spiral tr.now th{color:var(--gold)}

  .met{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--rule);
    border:1px solid var(--rule);margin-bottom:15px}
  .met div{background:var(--paper);padding:11px 5px;text-align:center}
  .met u{display:block;text-decoration:none;font:400 19px/1.1 var(--mono);
    color:var(--ink);font-variant-numeric:tabular-nums}
  .met s{display:block;text-decoration:none;margin-top:4px;
    font:300 7.5px/1.25 var(--mono);letter-spacing:.12em;
    text-transform:uppercase;color:var(--faint)}
  #bars{display:flex;align-items:flex-end;gap:2px;height:70px;margin-bottom:7px;
    border-bottom:1px solid var(--rule)}
  #bars i{flex:1;min-width:2px;background:#c6b898}
  #bars i.long{background:var(--gold)}
  .cap{margin:0 0 17px;font:300 9.5px/1.7 var(--mono);color:var(--faint)}
  .cap b{color:var(--gold);font-weight:400}
  .lex{margin:0 0 15px;font:400 13px/1.8 var(--serif);color:#4d4436}
  .lex b{color:var(--ink)}
  .rep{display:flex;flex-wrap:wrap;gap:4px;margin-top:8px}
  .rep span{background:#e5d9bf;border:1px solid var(--rule);padding:3px 8px;
    font:400 10px/1 var(--mono);color:#544a3c}
  .rep span u{text-decoration:none;color:var(--gold);margin-left:6px}

  .dr{padding:10px 12px;border:1px solid var(--rule);margin-bottom:5px;
    cursor:pointer;background:#ece2cb}
  .dr:hover{border-color:var(--pale)}
  .dr.on{background:#e5d9bf;border-color:var(--gold);box-shadow:inset 2px 0 0 var(--gold)}
  .dr b{display:block;font:600 14px/1.3 var(--serif);color:var(--ink);
    overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .dr i{font-style:normal;display:block;margin-top:3px;
    font:300 9px/1.4 var(--mono);color:var(--faint)}
  #newd{width:100%;margin-bottom:10px;padding:9px;background:#e5d9bf;
    border:1px solid var(--rule);cursor:pointer;color:var(--ink);
    font:400 10px/1 var(--mono);letter-spacing:.14em}
  #newd:hover{border-color:var(--gold);color:var(--gold)}

  /* ══ the lesson ═════════════════════════════════════════════════════ */
  #lsel{width:100%;margin-bottom:16px;background:#e9dfc6;border:1px solid var(--rule);
    padding:8px;font:400 10.5px/1.2 var(--mono);color:var(--ink);cursor:pointer}
  .sec{margin:0 0 20px}
  .sec h4{margin:0 0 7px;font:600 9px/1.3 var(--mono);letter-spacing:.18em;
    text-transform:uppercase;color:var(--margin)}
  .sec p{margin:0 0 11px;font:400 14px/1.74 var(--serif);color:#3b342b}
  .sec pre{margin:0 0 11px;padding:12px 14px;background:#1a1713;color:#cdc4b2;
    font:400 11px/1.62 var(--mono);overflow-x:auto;
    border-left:2px solid var(--gold)}
  .sec pre i{font-style:normal}
  .prac{margin:20px 0 0;padding:15px;border:1px solid var(--margin);
    background:#ece1c8}
  .prac h4{margin:0 0 8px;font:600 9px/1 var(--mono);letter-spacing:.2em;
    text-transform:uppercase;color:var(--margin)}
  .prac p{margin:0 0 12px;font:400 13.5px/1.7 var(--serif);color:#3b342b}
  .prac button{background:var(--margin);border:none;color:#f4ece0;
    padding:9px 16px;cursor:pointer;font:400 10px/1 var(--mono);letter-spacing:.14em}
  .prac button:hover{background:#8e392f}
  .prac button.g{background:none;color:var(--pale);border:1px solid var(--rule)}
  .prac button.g:hover{color:var(--ink);border-color:var(--pale)}
  .cks{margin:13px 0 0;padding:0;list-style:none}
  .cks li{display:flex;gap:9px;padding:6px 0;border-top:1px dotted #d3c6ac;
    font:400 12.5px/1.5 var(--serif);color:#544a3c}
  .cks li b{flex:none;width:15px;text-align:center;font:400 12px/1.5 var(--mono)}
  .cks li.p b{color:#4f7a5e}
  .cks li.f b{color:var(--rust)}
  .cks li.u b{color:#bcae94}
  .cks li.p{color:#3b342b}
  .needs{margin:0 0 15px;font:300 9.5px/1.6 var(--mono);color:var(--faint)}
  .needs b{color:var(--gold);font-weight:400}

  /* ══ the drawer ═════════════════════════════════════════════════════ */
  #drawer{width:min(1600px,100%);flex:none;height:236px;display:flex;
    flex-direction:column;background:var(--term);border-top:1px solid #2a241c;
    box-shadow:0 -18px 40px -20px rgba(0,0,0,.9);transition:height .22s ease}
  body.shut #drawer{height:31px}
  #dbar{flex:none;display:flex;align-items:center;gap:11px;height:31px;
    padding:0 12px;background:var(--term2);border-bottom:1px solid #241e18;
    font:400 9px/1 var(--mono);letter-spacing:.15em;color:#5f594f;
    text-transform:uppercase;cursor:pointer;user-select:none}
  #dbar b{color:var(--amber);font-weight:400}
  #dbar .sp{margin-left:auto;text-transform:none;letter-spacing:.04em;color:#4b463e}
  #dbar .sp em{font-style:normal;color:#7a746a}
  #out{flex:1;overflow-y:auto;padding:11px 14px;
    font:400 11.5px/1.62 var(--mono);color:#a49c8c;white-space:pre-wrap;
    word-break:break-word}
  #out .cmd{color:#6f6a60}
  #out .cmd b{color:var(--amber);font-weight:400}
  #out .ok{color:var(--moss)}
  #out .err{color:var(--rust)}
  #out .dim{color:#5f594f}
  #out .hd{color:var(--amber)}
  #out section{padding:2px 0 8px}
  #inrow{flex:none;display:flex;align-items:center;gap:9px;padding:9px 14px;
    border-top:1px solid #241e18;background:var(--term2)}
  #ps{color:var(--amber);font:400 11.5px/1 var(--mono);flex:none}
  #cli{flex:1;background:none;border:none;outline:none;color:#d6cfbf;
    font:400 11.5px/1.4 var(--mono);min-width:0}
  #cli::placeholder{color:#4b463e}

  #say{position:fixed;left:16px;bottom:6px;z-index:90;
    font:300 8.5px/1 var(--mono);color:#4a453d;letter-spacing:.07em}
  #back{position:fixed;right:16px;bottom:6px;z-index:90;background:none;
    border:none;cursor:pointer;color:#4a453d;font:300 8.5px/1 var(--mono);
    letter-spacing:.11em}
  #back:hover{color:var(--foil)}

  @media (max-width:1040px){
    body{overflow:auto;display:block;padding:0;height:auto}
    #book{grid-template-columns:1fr;width:100%;box-shadow:none}
    #spine{height:10px;background:linear-gradient(180deg,#8a7a58,#241d15,#8a7a58)}
    #spine::before{left:0;right:0;top:50%;bottom:auto;width:auto;height:1px;
      transform:none;background:repeating-linear-gradient(90deg,
        var(--foil) 0 9px,transparent 9px 22px)}
    #wrap{min-height:54vh}
    #drawer{width:100%;height:280px}
  }
</style>\n</head>\n<body>\n\n` +

/* ── the cover ───────────────────────────────────────────────────────── */
'<div id="cover">\n' + sky + '\n' +
'  <h1>THE NOTEBOOK</h1>\n' +
'  <p class="sub">WRITE &middot; CODE &middot; LEARN</p>\n' +
'  <p>Virgo, from her real stars, right ascension against declination &mdash; ' +
   'she is on her side because that is how she lies. The dashed line is the ' +
   'ecliptic, computed, and <b>Venus</b> is on it, because Virgo is a zodiac ' +
   'constellation and Venus crosses her. Spica lies <b>' + spicaGap +
   '&deg;</b> off the ecliptic, barely away from it, which is why the two keep ' +
   'meeting. Inside: <b>' + forms.length + '</b> forms, <b>' + lessons.length +
   '</b> lessons, <b>' + checkCount + '</b> checks that mark your own work.</p>\n' +
'  <button id="open">OPEN IT</button>\n' +
'</div>\n\n' +

/* ── the book ────────────────────────────────────────────────────────── */
'<div id="book">\n' +
'  <section class="leaf l">\n' +
'    <div id="head">\n' +
'      <input id="ttl" placeholder="Untitled" autocomplete="off" spellcheck="false">\n' +
'      <select id="form">\n' +
forms.map((f) => '        <option value="' + esc(f.id) + '">' + esc(f.name) + '</option>').join('\n') + '\n' +
'      </select>\n' +
'      <button id="tpl" title="drop this form&rsquo;s template in">template</button>\n' +
'      <button id="exp">export</button>\n' +
'    </div>\n' +
'    <div id="wrap">\n' +
'      <div id="gut"></div>\n' +
'      <div id="stack"><pre id="hl" aria-hidden="true"></pre><textarea id="pen" ' +
         'spellcheck="true" autocomplete="off" ' +
         'placeholder="The rules are thirty pixels apart and so is the line. Write on them."></textarea></div>\n' +
'    </div>\n' +
'  </section>\n' +
'  <div id="spine"></div>\n' +
'  <section class="leaf r">\n' +
'    <div id="tabs">\n' +
'      <button data-p="lesson" class="teach on">learn</button>\n' +
'      <button data-p="shape">the shape</button>\n' +
'      <button data-p="form">the form</button>\n' +
'      <button data-p="read">the reader</button>\n' +
'      <button data-p="drafts">drafts</button>\n' +
'    </div>\n' +
'    <div class="pane on" id="p-lesson"></div>\n' +
'    <div class="pane" id="p-shape"></div>\n' +
'    <div class="pane" id="p-form"></div>\n' +
'    <div class="pane" id="p-read"></div>\n' +
'    <div class="pane" id="p-drafts"><button id="newd">+ new draft</button><div id="dlist"></div></div>\n' +
'  </section>\n' +
'</div>\n\n' +

/* ── the drawer ──────────────────────────────────────────────────────── */
'<div id="drawer">\n' +
'  <div id="dbar"><b>venus</b> <span>console</span>' +
     '<span class="sp"><em>help</em> for the commands &middot; <em>check</em> to be ' +
     'marked &middot; <em>ctrl+`</em> to fold it away</span></div>\n' +
'  <div id="out"></div>\n' +
'  <div id="inrow"><span id="ps">&rsaquo;</span>' +
     '<input id="cli" autocomplete="off" spellcheck="false" ' +
     'placeholder="a command, or JavaScript"></div>\n' +
'</div>\n' +
'<div id="say"></div>\n<button id="back">the cover</button>\n\n' +

/* ── the script ──────────────────────────────────────────────────────── */
'<script>\n' +
'const FORMS = ' + JSON.stringify(forms) + ';\n' +
'const LESSONS = ' + JSON.stringify(lessons) + ';\n' +
'const QUENEAU = ' + JSON.stringify(QUENEAU) + ';\n' +
`
const KEY = 'venus.notebook.v1';
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const byId = (id) => FORMS.find((f) => f.id === id) || FORMS[0];
const lessonById = (id) => LESSONS.find((l) => l.id === id) || LESSONS[0];

/* ══ storage. Local, one key, nothing leaves. ═══════════════════════════ */
function load() {
  try {
    const b = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (b && Array.isArray(b.drafts) && b.drafts.length) return b;
  } catch (e) { /* private window, cleared data, storage blocked */ }
  return null;
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(book)); $('#say').textContent = 'saved'; return true; }
  catch (e) { $('#say').textContent = 'NOT SAVED \\u2014 storage unavailable'; return false; }
}
function blank(formId) {
  const now = new Date();
  return { id: 'd' + now.getTime().toString(36) + Math.floor(Math.random() * 1e6).toString(36),
           title: '', text: '', form: formId || FORMS[0].id, ends: ['','','','','',''],
           made: now.toISOString(), touched: now.toISOString() };
}
let book = load() || { drafts: [blank()] };
if (!book.lesson) book.lesson = LESSONS.length ? LESSONS[0].id : null;
/* passed checks only accumulate — a check that has ever passed stays passed
   in the record, while the live column shows where you are right now. The +1
   law, applied to marking. */
if (!book.passed) book.passed = {};
let cur = book.drafts[0].id;
const D = () => book.drafts.find((d) => d.id === cur) || book.drafts[0];

/* ══ syllables. A heuristic over English spelling. ══════════════════════ */
function syl(w) {
  w = w.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  if (w.length <= 3) return 1;
  /* a consonant plus -le is its own syllable and needs its e; every other
     final e is silent. Counting the e twice made "table" three. */
  const le = /[^aeiouy]le$/.test(w);
  /* -ed is a syllable after t or d and silent elsewhere: forested is three,
     closed is one. */
  if (/[^td]ed$/.test(w)) w = w.replace(/ed$/, '');
  else if (/[^laeiouy]es$/.test(w)) w = w.replace(/es$/, '');
  else if (!le) w = w.replace(/e$/, '');
  const g = w.match(/[aeiouy]+/g);   /* runs, not pairs: eau is one nucleus */
  return Math.max(1, g ? g.length : 1);
}
const lineSyl = (l) => (l.match(/[A-Za-z']+/g) || []).reduce((a, w) => a + syl(w), 0);
const linesOf = (t) => t.split('\\n');
const words = (t) => (t.match(/[A-Za-z'-]+/g) || []);

/* ══ the highlighter ═══════════════════════════════════════════════════ */
const KW = {
  js: /\\b(const|let|var|function|return|if|else|for|of|in|while|do|break|continue|new|class|extends|import|export|from|default|await|async|try|catch|finally|throw|typeof|instanceof|delete|void|yield|static|this|super|null|undefined|true|false)\\b/g,
  scala: /\\b(package|import|object|class|trait|case|final|def|val|var|if|else|match|for|yield|while|new|extends|with|override|private|protected|sealed|implicit|given|using|type|lazy|return|throw|try|catch|finally|this|super|null|true|false|Either|Left|Right|Option|Some|None|Vector|List|Map)\\b/g
};
function tok(text, lang) {
  const E = esc(text);
  if (lang === 'js' || lang === 'scala') {
    return E
      .replace(/(\\/\\*[\\s\\S]*?\\*\\/|\\/\\/[^\\n]*)/g, '<i class="c">$1</i>')
      .replace(/('(?:[^'\\n\\\\]|\\\\.)*'|&quot;(?:[^&\\n]|&(?!quot;))*&quot;)/g, '<i class="s">$1</i>')
      .replace(/\\b(\\d[\\d_.]*)\\b/g, '<i class="n">$1</i>')
      .replace(KW[lang], '<i class="k">$&</i>');
  }
  if (lang === 'css') {
    return E
      .replace(/(\\/\\*[\\s\\S]*?\\*\\/)/g, '<i class="c">$1</i>')
      .replace(/^(@[a-z-]+)/gm, '<i class="k">$1</i>')
      .replace(/^([^{}\\n\\/][^{}\\n]*?)(\\s*\\{)/gm, '<i class="t">$1</i><i class="p">$2</i>')
      .replace(/^(\\s*)([a-z-]+)(\\s*:)/gm, '$1<i class="a">$2</i><i class="p">$3</i>');
  }
  if (lang === 'html') {
    return E
      .replace(/(&lt;!--[\\s\\S]*?--&gt;)/g, '<i class="c">$1</i>')
      .replace(/(&lt;\\/?)([a-zA-Z][\\w-]*)/g, '<i class="p">$1</i><i class="t">$2</i>')
      .replace(/([a-zA-Z-]+)(=)(&quot;[^&]*&quot;)/g,
               '<i class="a">$1</i><i class="p">$2</i><i class="s">$3</i>');
  }
  return E;
}
function paintCode() {
  const d = D(), f = byId(d.form), isCode = f.kind === 'code';
  document.body.classList.toggle('code', isCode);
  const hl = $('#hl'), gut = $('#gut');
  if (isCode) {
    /* the trailing space keeps a final newline from collapsing, so the last
       line of the overlay stays under the last line of the textarea */
    hl.innerHTML = tok(d.text, f.language) + ' ';
    gut.innerHTML = linesOf(d.text).map((_, i) => i + 1).join('<br>');
  } else { hl.innerHTML = ''; gut.innerHTML = ''; }
}

/* ══ THE LESSON PANE ═══════════════════════════════════════════════════ */
let liveChecks = null;   /* the last run, so the pane can show it */

function paintLesson() {
  const box = $('#p-lesson');
  if (!LESSONS.length) { box.innerHTML = '<p class="note">No lessons are built in.</p>'; return; }
  const L = lessonById(book.lesson);
  const done = book.passed[L.id] || [];

  const opts = LESSONS.map((l) => '<option value="' + esc(l.id) + '"' +
    (l.id === L.id ? ' selected' : '') + '>' + l.order + '. ' + esc(l.title) +
    '  \u2014 ' + ((book.passed[l.id] || []).filter((n) => l.practice.checks.some((c) => c.name === n && !c.constraint)).length) + '/' + l.practice.checks.filter((c) => !c.constraint).length +
    '</option>').join('');

  const secs = L.sections.map((s) =>
    '<div class="sec"><h4>' + esc(s.heading) + '</h4>' +
    s.body.map((p) => '<p>' + esc(p) + '</p>').join('') +
    (s.show ? '<pre>' + tok(s.show.code, s.show.lang || 'js') + '</pre>' : '') +
    '</div>').join('');

  /* achievements and constraints are counted apart. A constraint is a thing
     a wrong answer breaks, not a thing a right answer earns — every stub
     satisfies all of them — so counting them as progress would credit the
     student for the starter. Each is still shown, and each has a violator on
     file proving it checks something. */
  const rowsOf = (isCon) => L.practice.checks
    .map((c, i) => [c, i])
    .filter((e) => !!e[0].constraint === isCon)
    .map((e) => {
      const c = e[0], i = e[1];
      const live = liveChecks && liveChecks.id === L.id ? liveChecks.results[i] : null;
      const ever = done.includes(c.name);
      const cls = live === true ? 'p' : live === false ? 'f' : ever ? 'p' : 'u';
        const mark = live === true ? '\\u2713' : live === false ? '\\u00d7' : ever ? '\\u2713' : '\\u00b7';
        return '<li class="' + cls + '"><b>' + mark + '</b>' + esc(c.name) + '</li>';
    }).join('');
  const rows = rowsOf(false), consRows = rowsOf(true);
  const earn = L.practice.checks.filter((c) => !c.constraint);
  const earned = done.filter((n) => earn.some((c) => c.name === n)).length;

  box.innerHTML =
    '<select id="lsel">' + opts + '</select>' +
    '<h3>' + esc(L.title) + '</h3>' +
    '<p class="sub">' + esc(L.subject) + ' \\u00b7 lesson ' + L.order + ' of ' + LESSONS.length + '</p>' +
    '<p class="note" style="font-style:italic">' + esc(L.one_line) + '</p>' +
    ((L.needs || []).length
      ? '<p class="needs">after <b>' + L.needs.map((n) => esc(lessonById(n).title)).join('</b> and <b>') + '</b></p>'
      : '') +
    secs +
    '<div class="prac"><h4>the practice</h4>' +
      '<p>' + esc(L.practice.brief) + '</p>' +
      '<button id="startp">start it</button> ' +
      '<button class="g" id="runck">check</button>' +
      '<ul class="cks">' + rows + '</ul>' +
      (consRows
        ? '<p class="cap" style="margin:14px 0 0">and these it must not break: a ' +
          'stub satisfies every one, so they are not progress \u2014 but each has a ' +
          'violator on file proving it catches something.</p>' +
          '<ul class="cks">' + consRows + '</ul>'
        : '') +
      '<p class="cap" style="margin:12px 0 0">' + earned + ' of ' + earn.length +
        ' earned at least once. A check that has passed stays passed in the ' +
        'record; the column shows where you are now.</p>' +
    '</div>' +
    '<p class="ask" style="margin-top:18px"><b>the question this lesson leaves you</b>' +
      esc(L.ask) + '</p>';

  $('#lsel').onchange = (e) => { book.lesson = e.target.value; liveChecks = null; save(); paintLesson(); };
  $('#startp').onclick = () => startPractice();
  $('#runck').onclick = () => { runChecks(); };
}

function startPractice() {
  const L = lessonById(book.lesson);
  const d = blank(L.practice.form || 'code-js');
  d.title = L.title + ' \\u2014 practice';
  d.text = L.practice.starter;
  d.lesson = L.id;
  book.drafts.unshift(d); cur = d.id; save(); show();
  say('practice started: ' + L.title + '. Write it, then type check.', 'ok');
  return d;
}

/* the marking. The draft is evaluated in global scope, so its declarations
   become reachable, and then every check expression is evaluated against
   them. Two of the checks in this syllabus read the student's own source
   rather than its output, because the absence of a dependency cannot be
   tested any other way. */
function runChecks(quiet) {
  const L = lessonById(book.lesson), d = D();
  const f = byId(d.form);
  if (f.kind !== 'code') {
    say('this draft is a ' + f.name + '. Open the practice first \\u2014 start it, ' +
        'in the lesson pane, or type practice.', 'err');
    return null;
  }
  let threw = null;
  try { (0, eval)(d.text); } catch (e) { threw = e; }
  if (threw) {
    say('the draft did not run: ' + threw.name + ': ' + threw.message, 'err');
    return null;
  }
  const results = L.practice.checks.map((c) => {
    try { return (0, eval)(c.test) === true; } catch (e) { return false; }
  });
  liveChecks = { id: L.id, results };
  const passed = L.practice.checks.filter((c, i) => results[i]).map((c) => c.name);
  const was = book.passed[L.id] || [];
  book.passed[L.id] = Array.from(new Set(was.concat(passed)));
  save(); paintLesson();

  const n = results.filter(Boolean).length;
  if (!quiet) {
    sayHTML(L.practice.checks.map((c, i) =>
      '  <span class="' + (results[i] ? 'ok' : 'err') + '">' +
      (results[i] ? '\\u2713' : '\\u00d7') + '</span>  <span class="' +
      (results[i] ? '' : 'dim') + '">' + esc(c.name) + '</span>').join('\\n') +
      '\\n\\n<span class="' + (n === results.length ? 'ok' : 'hd') + '">' + n + ' of ' +
      results.length + '</span>' +
      (n === results.length
        ? ' <span class="dim">\\u2014 all of them. ' + esc(L.ask) + '</span>'
        : ' <span class="dim">\\u2014 nothing here is timed and nothing is lost.</span>'));
  }
  return n;
}

/* ══ the shape pane ════════════════════════════════════════════════════ */
function paintShape() {
  const d = D(), f = byId(d.form), L = linesOf(d.text);
  const box = $('#p-shape');

  if (f.kind === 'code') {
    const n = L.length, empty = L.filter((x) => !x.trim()).length;
    const comment = L.filter((x) => /^\\s*(\\/\\/|\\/\\*|\\*|#)/.test(x)).length;
    const deep = Math.max(0, ...L.map((x) => x.match(/^ */)[0].length));
    box.innerHTML = '<h3>' + esc(f.name) + '</h3>' +
      '<p class="sub">' + esc(f.language) +
        (f.runnable ? ' \\u00b7 runs in the drawer' : ' \\u00b7 written here, run elsewhere') + '</p>' +
      '<div class="met">' +
        '<div><u>' + n + '</u><s>lines</s></div>' +
        '<div><u>' + (n - empty) + '</u><s>not blank</s></div>' +
        '<div><u>' + comment + '</u><s>comment lines</s></div>' +
        '<div><u>' + Math.max(0, ...L.map((x) => x.length)) + '</u><s>widest</s></div>' +
        '<div><u>' + deep + '</u><s>deepest indent</s></div>' +
        '<div><u>' + (n ? Math.round(comment / n * 100) : 0) + '%</u><s>commented</s></div>' +
      '</div>' +
      (f.runnable
        ? '<p class="cap">Type <b>run</b> in the drawer and this is evaluated where it ' +
          'stands. What it logs is captured; what it returns is printed.</p>'
        : '<p class="cap">There is no ' + esc(f.language) + ' runtime in the drawer, and ' +
          'it will say so rather than pretend.</p>') +
      '<p class="ask"><b>the question this form asks</b>' + esc(f.ask) + '</p>';
    return;
  }

  if (!f.lines) {
    const beats = f.beats || [];
    box.innerHTML = '<h3>' + esc(f.name) + '</h3><p class="sub">no fixed length</p>' +
      (beats.length
        ? '<ul class="shape">' + beats.map((b, i) =>
            '<li><span class="no">' + (i + 1) + '</span><span class="tx">' +
            esc(b.name) + ' \\u2014 ' + esc(b.ask) + '</span></li>').join('') + '</ul>'
        : '<p class="note">Nothing is held against a shape here. ' +
          L.filter((x) => x.trim()).length + ' lines so far.</p>') +
      '<p class="ask" style="margin-top:15px"><b>the question this form asks</b>' +
      esc(f.ask) + '</p>';
    return;
  }

  const rep = {}; (f.repeats || []).forEach((r) => { rep[r.line] = r.same_as; });
  const brk = new Set(); let acc = 0;
  (f.stanzas || []).forEach((n) => { acc += n; brk.add(acc); });

  let rows = '';
  for (let i = 1; i <= f.lines; i++) {
    const raw = L[i - 1] === undefined ? '' : L[i - 1];
    const has = raw.trim().length > 0;
    const s = has ? lineSyl(raw) : 0;
    const want = f.meter
      ? (Array.isArray(f.meter.syllables)
          ? f.meter.syllables[(i - 1) % f.meter.syllables.length] : f.meter.syllables)
      : null;
    const off = has && want && s !== want;
    rows += '<li class="' + (has ? 'done ' : '') + (brk.has(i) ? 'brk' : '') + '">' +
      '<span class="no">' + i + '</span>' +
      (f.rhyme ? '<span class="rh">' + f.rhyme[i - 1] + '</span>' : '') +
      '<span class="tx' + (has ? '' : ' e') + '">' +
        (has ? esc(raw.trim()).slice(0, 60) : (rep[i] ? 'refrain, line ' + rep[i] : '\\u00b7')) +
      '</span>' +
      (rep[i] ? '<span class="rf">R' + rep[i] + '</span>' : '') +
      (want ? '<span class="sy' + (off ? ' off' : '') + '">' +
        (has ? s + '/' + want : String(want)) + '</span>' : '') + '</li>';
  }
  const written = L.filter((x) => x.trim()).length;
  box.innerHTML = '<h3>' + esc(f.name) + '</h3>' +
    '<p class="sub">' + written + ' of ' + f.lines + ' lines' +
      (f.rhyme ? ' \\u00b7 ' + f.rhyme : '') +
      (f.meter ? ' \\u00b7 ' + esc(f.meter.name) : '') + '</p>' +
    (f.permutation ? sestina(d, f) : '') +
    '<ul class="shape">' + rows + '</ul>' +
    (f.meter ? '<p class="cap" style="margin-top:11px">Syllables are estimated from ' +
      'spelling. The estimate is wrong on names, on some borrowings, and wherever ' +
      'English elides. A number in gold is a difference, not a mistake.</p>' : '');
}

function sestina(d, f) {
  const E = d.ends || ['','','','','',''];
  const written = linesOf(d.text).filter((x) => x.trim()).length;
  const stanza = Math.min(5, Math.floor(written / 6));
  let t = '<div id="ends">' + E.map((v, i) =>
    '<input data-e="' + i + '" value="' + esc(v) + '" placeholder="' + (i + 1) + '">').join('') + '</div>';
  t += '<table id="spiral"><tr><th></th>' +
    [1,2,3,4,5,6].map((n) => '<th>' + n + '</th>').join('') + '</tr>';
  f.permutation.forEach((row, i) => {
    t += '<tr class="' + (i === stanza ? 'now' : '') + '"><th>' + (i + 1) + '</th>' +
      row.map((n) => '<td class="' + (i === stanza ? 'now' : '') + '">' +
        (E[n - 1] ? esc(E[n - 1]) : n) + '</td>').join('') + '</tr>';
  });
  t += '<tr><th>env</th><td colspan="6">' + f.envoi.map((p) =>
    esc(E[p[0] - 1] || p[0]) + '/' + esc(E[p[1] - 1] || p[1])).join('  \\u00b7  ') + '</td></tr>';
  return t + '</table><p class="cap">One rule, applied six times: last, first, ' +
    'second-to-last, second, inward. After six passes it is back where it started, ' +
    'and that is why the form has six stanzas \\u2014 the stanza count is the order ' +
    'of the permutation, not a number anybody picked. It does not work for every ' +
    'count: four end-words come back after three. The counts that do are ' +
    QUENEAU.join(', ') + ' and up.</p>';
}

/* ══ the form pane ═════════════════════════════════════════════════════ */
function paintForm() {
  const f = byId(D().form);
  $('#p-form').innerHTML = '<h3>' + esc(f.name) + '</h3>' +
    '<p class="sub">' + esc(f.kind) +
      (f.lines ? ' \\u00b7 ' + f.lines + ' lines' : '') +
      (f.language ? ' \\u00b7 ' + esc(f.language) : '') + '</p>' +
    '<p class="note">' + esc(f.note) + '</p>' +
    '<div class="ground">' + esc(f.ground) + '</div>' +
    '<p class="ask"><b>the question this form asks</b>' + esc(f.ask) + '</p>';
}

/* ══ the reader. Counts. Never a score. ════════════════════════════════ */
function paintRead() {
  const d = D(), f = byId(d.form), t = d.text;
  const L = linesOf(t).filter((x) => x.trim()), W = words(t);
  const S = W.reduce((a, w) => a + syl(w), 0);
  const sent = (t.match(/[^.!?\\n]+[.!?]+(\\s|$)|[^.!?\\n]+$/gm) || [])
    .filter((x) => x.trim()).length;

  const lens = L.map((l) => f.kind === 'code' ? l.length : lineSyl(l));
  const max = Math.max(6, ...lens);
  const bars = lens.slice(-70).map((n) =>
    '<i style="height:' + Math.round(n / max * 100) + '%" class="' +
    (n > max * 0.85 ? 'long' : '') + '"></i>').join('');

  const stop = new Set(('the a an and or but of to in on at it is was be for with as by '
    + 'from that this i you he she they we not no so if all my her his const let var '
    + 'return function').split(' '));
  const freq = {};
  W.forEach((w) => { const k = w.toLowerCase();
    if (!stop.has(k) && k.length > 2) freq[k] = (freq[k] || 0) + 1; });
  const rep = Object.entries(freq).filter(([, n]) => n > 1)
    .sort((a, b) => b[1] - a[1]).slice(0, 16);

  const pc = W.length ? Math.round(W.filter((w) => w.length <= 4).length / W.length * 100) : 0;

  $('#p-read').innerHTML =
    '<div class="met">' +
      '<div><u>' + L.length + '</u><s>lines</s></div>' +
      '<div><u>' + W.length + '</u><s>words</s></div>' +
      '<div><u>' + S + '</u><s>syllables</s></div>' +
      '<div><u>' + sent + '</u><s>sentences</s></div>' +
      '<div><u>' + (L.length ? (S / L.length).toFixed(1) : '0') + '</u><s>syl / line</s></div>' +
      '<div><u>' + pc + '%</u><s>four letters or less</s></div>' +
    '</div>' +
    '<div id="bars">' + bars + '</div>' +
    '<p class="cap">The last ' + Math.min(70, lens.length) + ' lines by ' +
      (f.kind === 'code' ? 'width' : 'syllable') + '. Gold is a line in the longest ' +
      'sixth. A flat run is a wall; whether you want a wall is your business.</p>' +
    '<p class="lex">Short words \\u2014 four letters or fewer \\u2014 are <b>' + pc +
      '%</b> of this. English keeps its oldest and plainest vocabulary in its short ' +
      'words and its borrowed, abstract vocabulary in its long ones, so this number ' +
      'moves when the register does. It is a measurement, not a target.</p>' +
    (rep.length
      ? '<p class="lex">Used more than once:<span class="rep">' +
        rep.map(([w, n]) => '<span>' + esc(w) + '<u>' + n + '</u></span>').join('') +
        '</span></p><p class="cap">Three of the ' + FORMS.length + ' forms here are ' +
        'built on repetition and one is built on six words you must return to. This ' +
        'is a list, not a complaint.</p>'
      : '');
}

/* ══ drafts. They only accumulate. ═════════════════════════════════════ */
function paintDrafts() {
  const L = $('#dlist'); L.innerHTML = '';
  book.drafts.forEach((d, i) => {
    const el = document.createElement('div');
    el.className = 'dr' + (d.id === cur ? ' on' : '');
    const b = document.createElement('b');
    b.textContent = d.title || (d.text.split('\\n').find((x) => x.trim()) || 'Untitled').trim().slice(0, 40);
    const s = document.createElement('i');
    s.textContent = (i + 1) + '  \\u00b7  ' + byId(d.form).name + '  \\u00b7  ' +
      linesOf(d.text).filter((x) => x.trim()).length + ' lines  \\u00b7  ' + d.touched.slice(0, 10) +
      (d.lesson ? '  \\u00b7  practice' : '');
    el.append(b, s);
    el.onclick = () => { cur = d.id; show(); };
    L.appendChild(el);
  });
}

function paint() {
  paintCode(); paintLesson(); paintShape(); paintForm(); paintRead(); paintDrafts(); wireEnds();
}
function show() {
  const d = D();
  $('#ttl').value = d.title; $('#pen').value = d.text; $('#form').value = d.form;
  if (d.lesson) { book.lesson = d.lesson; liveChecks = null; }
  paint(); $('#pen').focus();
}
function wireEnds() {
  document.querySelectorAll('#ends input').forEach((inp) => {
    inp.oninput = () => {
      const d = D();
      d.ends = d.ends || ['','','','','',''];
      d.ends[+inp.dataset.e] = inp.value;
      save(); paintShape(); wireEnds();
    };
  });
}

let timer = null;
function touch() {
  const d = D();
  d.title = $('#ttl').value; d.text = $('#pen').value;
  d.touched = new Date().toISOString();
  paintCode();
  $('#say').textContent = 'writing';
  clearTimeout(timer);
  timer = setTimeout(() => { save(); paintShape(); paintRead(); paintDrafts(); wireEnds(); }, 340);
}
$('#pen').addEventListener('input', touch);
$('#ttl').addEventListener('input', touch);
$('#wrap').addEventListener('scroll', () => {
  $('#hl').style.transform = 'translateY(' + (-$('#wrap').scrollTop) + 'px)';
}, { passive: true });
/* tab indents instead of leaving the field, which is the difference between
   a textarea and somewhere you would write code */
$('#pen').addEventListener('keydown', (ev) => {
  if (ev.key !== 'Tab' || ev.ctrlKey || ev.metaKey) return;
  ev.preventDefault();
  const el = ev.target, a = el.selectionStart, b = el.selectionEnd;
  el.value = el.value.slice(0, a) + '  ' + el.value.slice(b);
  el.selectionStart = el.selectionEnd = a + 2;
  touch();
});

$('#form').onchange = () => { D().form = $('#form').value; save(); paint(); };
$('#newd').onclick = () => {
  const d = blank($('#form').value); book.drafts.unshift(d); cur = d.id; save(); show();
};
$('#tpl').onclick = () => dropTemplate();

function dropTemplate() {
  const d = D(), f = byId(d.form);
  if (!f.template)
    return say('the ' + f.name + ' form has no template \\u2014 no shape to derive one from.', 'dim');
  if (d.text.trim() && !confirm('Replace this draft with the ' + f.name + ' template?')) return;
  d.text = f.template; $('#pen').value = d.text;
  touch(); save(); paint();
  say(f.name + ' template dropped in: ' + linesOf(f.template).length + ' lines.', 'ok');
}

document.querySelectorAll('#tabs button').forEach((b) => {
  b.onclick = () => {
    document.querySelectorAll('#tabs button').forEach((x) => x.classList.remove('on'));
    document.querySelectorAll('.pane').forEach((x) => x.classList.remove('on'));
    b.classList.add('on'); $('#p-' + b.dataset.p).classList.add('on');
  };
});
function openTab(name) {
  const b = document.querySelector('#tabs button[data-p="' + name + '"]');
  if (b) b.click();
}

function exportAll() {
  const md = book.drafts.slice().reverse().map((d) => {
    const f = byId(d.form);
    const fence = '\\u0060\\u0060\\u0060';
    const body = f.kind === 'code' ? fence + f.language + '\\n' + d.text + '\\n' + fence : d.text;
    return '# ' + (d.title || 'Untitled') + '\\n\\n*' + f.name + ' \\u00b7 ' +
      d.made.slice(0, 10) + '*\\n\\n' + body + '\\n';
  }).join('\\n---\\n\\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([md], { type: 'text/markdown' }));
  a.download = 'notebook-' + new Date().toISOString().slice(0, 10) + '.md';
  a.click(); URL.revokeObjectURL(a.href);
  return book.drafts.length + ' drafts written to a markdown file.';
}
$('#exp').onclick = exportAll;

/* ══ THE DRAWER ════════════════════════════════════════════════════════ */
function say(text, cls) {
  const out = $('#out'), s = document.createElement('section');
  s.innerHTML = '<span class="' + (cls || '') + '">' + esc(text) + '</span>';
  out.appendChild(s); out.scrollTop = out.scrollHeight;
}
function sayHTML(html) {
  const out = $('#out'), s = document.createElement('section');
  s.innerHTML = html; out.appendChild(s); out.scrollTop = out.scrollHeight;
}


/* ══ THE MINT ══════════════════════════════════════════════════════════
   One token each notebook. A real ECDSA P-256 keypair from WebCrypto — that
   curve because it is the one every browser actually has — minted here, kept
   here, and never sent anywhere. The private half is never printed and no
   command on this page will export it.

   The supply rule is the whole design: ONE, and the mint refuses a second.
   There is nothing to accumulate and nothing to trade, so this is not a
   currency and would be a bad one. What it buys is that when the commander
   has the perfect stanza and everybody copies it, the copy still says whose
   it was. Authorship survives copying.

   It is deliberately the least fungible object here. It carries provenance,
   so no two are interchangeable — which is exactly what lesson three says
   destroys fungibility, and exactly what is wanted in a signature. */

const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function sha(text) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function mintable() {
  return !!(window.crypto && crypto.subtle && crypto.subtle.generateKey);
}

async function mint() {
  if (!mintable())
    return say('this browser has no WebCrypto here. A page served over file:// ' +
      'or plain http on some browsers has no subtle crypto at all, and the mint ' +
      'will not fake one.', 'err');
  if (book.token)
    return say('this notebook already holds token ' + book.token.id.slice(0, 16) +
      '. One each. The mint refuses a second, which is the only supply rule ' +
      'there is.', 'err');

  const kp = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const pub = await crypto.subtle.exportKey('spki', kp.publicKey);
  const priv = await crypto.subtle.exportKey('jwk', kp.privateKey);
  const id = await sha(b64(pub));

  book.token = { id, pub: b64(pub), made: new Date().toISOString() };
  book.key = priv;                    /* stays here. Never printed, never sent. */
  save();
  paintLesson();
  return sayHTML('<span class="hd">minted.</span>\\n' +
    '  <span class="dim">token   </span><span class="ok">' + esc(id) + '</span>\\n' +
    '  <span class="dim">curve   </span>ECDSA P-256\\n' +
    '  <span class="dim">supply  </span><span class="ok">1</span>' +
    '<span class="dim">, and the mint refuses a second</span>\\n' +
    '<span class="dim">The private half is in this browser and nowhere else. No ' +
    'command here prints it, and nothing on this page makes a network request.</span>');
}

async function loadKey() {
  if (!book.key) return null;
  return crypto.subtle.importKey('jwk', book.key,
    { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
}

/* a stanza: the text you are publishing, its hash, whose token signed it, and
   the signature. Copy the whole block. Anybody can check it; nobody can
   produce another one that says your token. */
async function stanza() {
  if (!book.token) return say('nothing to sign with. mint first.', 'err');
  const d = D();
  if (!d.text.trim()) return say('this draft is empty.', 'dim');
  const key = await loadKey();
  if (!key) return say('the private half is gone from this browser. The token ' +
    'is still yours to show and no longer yours to sign with.', 'err');

  const digest = await sha(d.text);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key,
    new TextEncoder().encode(digest));

  const block = [
    '--- venus stanza ---',
    'title  ' + (d.title || 'Untitled'),
    'form   ' + byId(d.form).id,
    'sha256 ' + digest,
    'token  ' + book.token.id,
    'pub    ' + book.token.pub,
    'sig    ' + b64(sig),
    '--- end ---'
  ].join('\\n');

  d.stanza = block; save();
  return sayHTML('<span class="hd">signed.</span> <span class="dim">Copy the whole ' +
    'block. Anyone can check it; nobody can make another that names your ' +
    'token.</span>\\n<span class="ok">' + esc(block) + '</span>');
}

/* checking somebody else's. Paste their block after the command. */
async function checkStanza(block) {
  /* tolerant of newlines being collapsed: the console input is one line, so a pasted block arrives flat */
  const get = (k) => (block.match(new RegExp(k + '\\\\s+([A-Za-z0-9+/=]+)')) || [])[1];
  const digest = get('sha256'), pub = get('pub'), sig = get('sig'), tok = get('token');
  if (!(digest && pub && sig))
    return say('that is not a stanza block. Paste all of it, sha256 and pub and ' +
      'sig included.', 'err');

  let ok = false, why = '';
  try {
    const key = await crypto.subtle.importKey('spki', unb64(pub),
      { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    ok = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key,
      unb64(sig), new TextEncoder().encode(digest));
    /* and the token id must really be the hash of that public key, or the
       signature is valid for a key nobody claimed */
    const claimed = await sha(pub);
    if (ok && tok && claimed !== tok) { ok = false; why = 'the signature is good ' +
      'but the token id is not the hash of that public key — somebody relabelled it'; }
  } catch (e) { why = e.message; }

  const mine = tok && book.token && tok === book.token.id;
  return sayHTML(ok
    ? '<span class="ok">\u2713 the signature holds.</span> <span class="dim">This ' +
      'text was signed by token ' + esc(String(tok).slice(0, 16)) + '\u2026' +
      (mine ? ', which is yours.' : ', which is not yours.') + ' It says nothing ' +
      'about whether the text is any good.</span>'
    : '<span class="err">\u00d7 it does not hold.</span> <span class="dim">' +
      esc(why || 'the signature does not match that public key and that hash') +
      '</span>');
}

/* whether the text in front of you is the one that was signed */
async function against(block) {
  const want = (block.match(/sha256\\s+([a-f0-9]{64})/) || [])[1];
  if (!want) return say('no sha256 line in that block.', 'err');
  const got = await sha(D().text);
  return say(got === want
    ? 'this draft is byte for byte the text that block signed.'
    : 'this draft is NOT that text. Signed ' + want.slice(0, 16) +
      ', this is ' + got.slice(0, 16) + '.', got === want ? 'ok' : 'err');
}

const HELP = [
  ['help', 'this'],
  ['learn', 'the lessons, and how far you are into each'],
  ['lesson <n>', 'open lesson n'],
  ['practice', 'start this lesson\\u2019s practice in a new draft'],
  ['check', 'run this lesson\\u2019s checks against your draft'],
  ['run', 'evaluate this draft (JavaScript only)'],
  ['ls', 'the drafts, numbered'],
  ['open <n>', 'switch to draft n'],
  ['new [form]', 'a new draft, optionally in a form'],
  ['form [id]', 'show the current form, or change it'],
  ['forms', 'every form, in the order you meet them'],
  ['template', 'drop the current form\\u2019s starter in'],
  ['count', 'the reader\\u2019s numbers for this draft'],
  ['syl <words>', 'the syllable heuristic, word by word'],
  ['spiral [a b c d e f]', 'the sestina table, with your words in it'],
  ['rhyme', 'the scheme against the words your lines end on'],
  ['mint', 'mint this notebook\u2019s one token \u2014 it refuses a second'],
  ['token', 'show it, and what it is not'],
  ['stanza', 'sign this draft; copy the block'],
  ['verify <block>', 'check somebody else\u2019s stanza block'],
  ['against <block>', 'is this draft the text that block signed?'],
  ['export', 'write every draft to a markdown file'],
  ['clear', 'empty the console'],
  ['', 'anything else is evaluated as JavaScript']
];

function cmd(raw) {
  const line = raw.trim();
  if (!line) return;
  sayHTML('<span class="cmd">\\u203a <b>' + esc(line) + '</b></span>');
  const [verb, ...rest] = line.split(/\\s+/);
  const arg = rest.join(' ');
  const d = D(), f = byId(d.form);

  switch (verb) {
    case 'help':
      return sayHTML('<span class="hd">the console operates the notebook.</span>\\n' +
        HELP.map(([c, w]) => '  <span class="ok">' + esc(c.padEnd(22)) + '</span>' +
          '<span class="dim">' + esc(w) + '</span>').join('\\n'));

    case 'clear': return ($('#out').innerHTML = '');

    case 'learn':
      if (!LESSONS.length) return say('no lessons are built in.', 'dim');
      return sayHTML('<span class="hd">' + LESSONS.length + ' lessons.</span>\\n' +
        LESSONS.map((l) => {
          const p = (book.passed[l.id] || []).length, t = l.practice.checks.length;
          return '  <span class="dim">' + l.order + '  </span>' +
            '<span class="' + (l.id === book.lesson ? 'ok' : '') + '">' +
            esc(l.title.padEnd(28)) + '</span>' +
            '<span class="' + (p === t ? 'ok' : 'dim') + '">' + p + '/' + t + '</span>' +
            '<span class="dim">  ' + esc(l.one_line.slice(0, 54)) + '</span>';
        }).join('\\n') +
        '\\n<span class="dim">lesson &lt;n&gt; to open one, practice to start it, check to be marked.</span>');

    case 'lesson': {
      const n = parseInt(arg, 10);
      const L = isNaN(n) ? LESSONS.find((x) => x.id === arg) : LESSONS[n - 1];
      if (!L) return say('there is no lesson ' + arg + '. learn to see them.', 'err');
      book.lesson = L.id; liveChecks = null; save(); paintLesson(); openTab('lesson');
      return sayHTML('<span class="hd">' + esc(L.title) + '</span>\\n' +
        '<span class="dim">' + esc(L.one_line) + '</span>\\n' +
        L.sections.map((s) => '  <span class="ok">\\u00b7</span> ' + esc(s.heading)).join('\\n') +
        '\\n<span class="dim">it is open on the right. practice to start the exercise.</span>');
    }

    case 'practice': { startPractice(); return; }

    case 'check': { runChecks(); return; }

    case 'ls':
      return sayHTML(book.drafts.map((x, i) =>
        '  <span class="' + (x.id === cur ? 'ok' : 'dim') + '">' +
        String(i + 1).padStart(3) + (x.id === cur ? ' * ' : '   ') +
        esc((x.title || linesOf(x.text).find((l) => l.trim()) || 'Untitled').trim().slice(0, 38).padEnd(40)) +
        '</span><span class="dim">' + esc(byId(x.form).name) + '</span>').join('\\n'));

    case 'open': {
      const n = parseInt(arg, 10);
      if (!(n >= 1 && n <= book.drafts.length))
        return say('there is no draft ' + arg + '. ls to see them.', 'err');
      cur = book.drafts[n - 1].id; show();
      return say('draft ' + n + ' \\u2014 ' + byId(D().form).name, 'ok');
    }

    case 'new': {
      const nf = arg ? FORMS.find((x) => x.id === arg || x.name.toLowerCase() === arg.toLowerCase()) : null;
      if (arg && !nf) return say('no form called ' + arg + '. forms to list them.', 'err');
      const x = blank(nf ? nf.id : d.form);
      book.drafts.unshift(x); cur = x.id; save(); show();
      return say('a new draft in ' + byId(x.form).name + '.', 'ok');
    }

    case 'forms':
      return sayHTML(FORMS.map((x) =>
        '  <span class="dim">' + String(x.order).padStart(3) + '  </span>' +
        '<span class="' + (x.id === f.id ? 'ok' : '') + '">' + esc(x.id.padEnd(16)) + '</span>' +
        '<span class="dim">' + esc(x.kind.padEnd(6)) +
        esc(x.lines ? x.lines + ' lines' : (x.language || '')) + '</span>').join('\\n'));

    case 'form': {
      if (!arg) return sayHTML('<span class="ok">' + esc(f.id) + '</span> <span class="dim">' +
        esc(f.kind) + (f.lines ? ' \\u00b7 ' + f.lines + ' lines' : '') +
        (f.language ? ' \\u00b7 ' + esc(f.language) : '') + '</span>\\n' + esc(f.ask));
      const nf = FORMS.find((x) => x.id === arg || x.name.toLowerCase() === arg.toLowerCase());
      if (!nf) return say('no form called ' + arg + '. forms to list them.', 'err');
      d.form = nf.id; $('#form').value = nf.id; save(); paint();
      return say('now ' + nf.name + '. ' + nf.ask, 'ok');
    }

    case 'template': dropTemplate(); return;

    case 'count': {
      const L = linesOf(d.text).filter((x) => x.trim()), W = words(d.text);
      const S = W.reduce((a, w) => a + syl(w), 0);
      return sayHTML(
        '  <span class="dim">lines     </span><span class="ok">' + L.length + '</span>\\n' +
        '  <span class="dim">words     </span><span class="ok">' + W.length + '</span>\\n' +
        '  <span class="dim">syllables </span><span class="ok">' + S + '</span>\\n' +
        '  <span class="dim">per line  </span><span class="ok">' +
          (L.length ? (S / L.length).toFixed(2) : '0') + '</span>' +
        (f.lines ? '\\n  <span class="dim">of the ' + f.lines + ' this form wants: </span>' +
          '<span class="ok">' + L.length + '</span>' : ''));
    }

    case 'syl': {
      if (!arg) return say('syl <word> \\u2014 the heuristic, word by word.', 'dim');
      return sayHTML(words(arg).map((w) =>
        '  <span class="ok">' + String(syl(w)).padStart(2) + '</span>  ' +
        '<span class="dim">' + esc(w) + '</span>').join('\\n') +
        '\\n  <span class="dim">total </span><span class="ok">' + lineSyl(arg) + '</span>' +
        '\\n<span class="dim">a heuristic over spelling, wrong on names and elisions.</span>');
    }

    case 'spiral': {
      const sf = FORMS.find((x) => x.permutation);
      if (!sf) return say('no form here declares a permutation.', 'err');
      const given = rest.length === 6 ? rest : (d.ends || []).filter(Boolean);
      const E = given.length === 6 ? given : ['1','2','3','4','5','6'];
      if (rest.length === 6) { d.ends = rest.slice(); save(); paintShape(); wireEnds(); }
      const w = Math.max(...E.map((x) => x.length)) + 2;
      return sayHTML('<span class="hd">the sestina spiral</span>\\n' +
        sf.permutation.map((row, i) => '  <span class="dim">' + (i + 1) + '  </span>' +
          row.map((n) => '<span class="ok">' + esc(String(E[n - 1]).padEnd(w)) + '</span>').join('')).join('\\n') +
        '\\n  <span class="dim">env</span> ' + sf.envoi.map((p) =>
          esc(E[p[0] - 1]) + '/' + esc(E[p[1] - 1])).join('  ') +
        '\\n<span class="dim">stanza count is the order of the permutation. It equals the ' +
        'end-word count only at ' + QUENEAU.join(', ') + '.</span>');
    }

    case 'rhyme': {
      if (!f.rhyme) return say(f.name + ' declares no rhyme scheme.', 'dim');
      const L = linesOf(d.text);
      return sayHTML(f.rhyme.split('').map((ch, i) => {
        const last = (L[i] || '').trim().split(/\\s+/).pop() || '';
        return '  <span class="dim">' + String(i + 1).padStart(2) + '</span> ' +
          '<span class="hd">' + ch + '</span>  ' +
          '<span class="' + (last ? 'ok' : 'dim') + '">' + esc(last || '\\u00b7') + '</span>';
      }).join('\\n'));
    }

    case 'mint': mint(); return;

    case 'token': {
      if (!book.token) return say('no token yet. mint to make one.', 'dim');
      return sayHTML('<span class="hd">one token, this notebook.</span>\\n' +
        '  <span class="dim">id     </span><span class="ok">' + esc(book.token.id) + '</span>\\n' +
        '  <span class="dim">minted </span>' + esc(book.token.made.slice(0, 10)) + '\\n' +
        '  <span class="dim">supply </span><span class="ok">1</span>' +
        '<span class="dim">, permanently. There is no second and no transfer.</span>\\n' +
        '<span class="dim">It is not money. It signs a stanza so that when the ' +
        'best one gets copied, the copy still says whose it was. It is also the ' +
        'least fungible thing here, on purpose \u2014 it carries provenance, which ' +
        'is exactly what lesson three says destroys fungibility and exactly what ' +
        'a signature is for.</span>');
    }

    case 'stanza': stanza(); return;
    case 'verify': checkStanza(arg); return;
    case 'against': against(arg); return;

    case 'export': return say(exportAll(), 'ok');

    case 'run': {
      if (f.kind !== 'code')
        return say('this draft is a ' + f.name + '. Only a code draft runs.', 'err');
      if (f.language !== 'js')
        return say('there is no ' + f.language + ' runtime in this drawer, and it will ' +
          'not pretend there is. Write it here, run it where it belongs.', 'err');
      return evaluate(d.text, true);
    }

    default: return evaluate(line, false);
  }
}

/* evaluating. console is captured so what a draft logs lands here rather than
   in a devtools panel nobody has open. */
function evaluate(src, isDraft) {
  const real = console.log;
  const lines = [];
  console.log = (...a) => { lines.push(a.map(fmt).join(' ')); real(...a); };
  let value, threw = null;
  try { value = (0, eval)(src); } catch (e) { threw = e; }
  console.log = real;
  if (lines.length) sayHTML(lines.map((l) => '<span class="dim">' + esc(l) + '</span>').join('\\n'));
  if (threw) return say(threw.name + ': ' + threw.message, 'err');
  if (value !== undefined) say(fmt(value), 'ok');
  else if (isDraft && !lines.length) say('ran, logged nothing, returned nothing.', 'dim');
}
function fmt(v) {
  if (typeof v === 'string') return v;
  if (v instanceof Error) return v.name + ': ' + v.message;
  try { return JSON.stringify(v, null, 1); } catch (e) { return String(v); }
}

const hist = []; let hp = 0;
$('#cli').addEventListener('keydown', (ev) => {
  const el = ev.target;
  if (ev.key === 'Enter') {
    const v = el.value;
    if (v.trim()) { hist.push(v); hp = hist.length; }
    el.value = '';
    try { cmd(v); } catch (e) { say(e.name + ': ' + e.message, 'err'); }
    return;
  }
  if (ev.key === 'ArrowUp' && hp > 0) { ev.preventDefault(); el.value = hist[--hp]; }
  if (ev.key === 'ArrowDown') {
    ev.preventDefault();
    if (hp < hist.length - 1) el.value = hist[++hp];
    else { hp = hist.length; el.value = ''; }
  }
});
$('#dbar').onclick = () => document.body.classList.toggle('shut');
addEventListener('keydown', (ev) => {
  if ((ev.ctrlKey || ev.metaKey) && ev.key === '\\u0060') {
    ev.preventDefault();
    document.body.classList.remove('shut');
    $('#cli').focus();
  }
});

$('#open').onclick = (e) => { e.stopPropagation(); $('#cover').classList.add('gone'); $('#pen').focus(); };
$('#cover').onclick = () => { $('#cover').classList.add('gone'); $('#pen').focus(); };
$('#back').onclick = () => $('#cover').classList.remove('gone');

show();
sayHTML('<span class="hd">the notebook console.</span> <span class="dim">' +
  FORMS.length + ' forms, ' + FORMS.filter((f) => f.kind === 'code').length +
  ' of them code. ' + LESSONS.length + ' lessons carrying ' +
  LESSONS.reduce((a, l) => a + l.practice.checks.length, 0) +
  ' checks that mark your own work. ' + book.drafts.length + ' draft' +
  (book.drafts.length === 1 ? '' : 's') + ' in this browser.</span>\\n' +
  '<span class="dim">Type </span><span class="ok">learn</span><span class="dim"> to be ' +
  'taught, </span><span class="ok">help</span><span class="dim"> for everything else, ' +
  'or just start writing on the left.</span>');
<\/script>\n</body>\n</html>\n`;

writeFileSync('writing.html', html);

const derived = forms.filter((f) => f.kind !== 'code' && f.template.trim()).length;
console.log('\nwriting.html · ' + forms.length + ' forms · ' +
  forms.filter((f) => f.kind === 'verse').length + ' verse, ' +
  forms.filter((f) => f.kind === 'prose').length + ' prose, ' +
  forms.filter((f) => f.kind === 'code').length + ' code');
console.log('  templates: ' + derived + ' derived from the declared shape, ' +
  forms.filter((f) => f.kind === 'code').length + ' authored');
console.log('  lessons: ' + lessons.length + ' · ' +
  lessons.reduce((a, l) => a + l.sections.length, 0) + ' sections · ' +
  checkCount + ' checks · prerequisite graph acyclic');
console.log('  the drawer: ' + (HELPLEN()) + ' commands, then JavaScript');
console.log('  sestina: stanzas equal end words at ' + QUENEAU.join(', ') +
  ' (four closes in three, so four is not among them)');
console.log('  cover: Virgo, ' + VIRGO.length + ' catalogue stars, ' + field.length +
  ' field stars, ecliptic over ' + ecliptic.length + ' degrees of longitude');
console.log('  Venus at RA ' + VEN[0].toFixed(2) + 'h dec ' + VEN[1].toFixed(2) +
  ' · Spica ' + spicaGap + ' degrees off the ecliptic');

function HELPLEN() {
  const m = html.match(/const HELP = \[([\s\S]*?)\n\];/);
  return m ? m[1].split('\n').filter((l) => l.trim().startsWith('[')).length - 1 : '?';
}

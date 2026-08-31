#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   writing.mjs — builds writing.html, the notebook.

   IT LIES ON ITS SIDE. Venus on her back, Virgo reclining, and a book open
   flat in landscape with a spine down the middle. The cover is not decoration:
   Virgo is plotted from her real stars, right ascension against declination,
   which is already a long low figure lying east to west — the constellation is
   on her side because that is how she is in the sky, not because it looked
   better. The ecliptic is computed and drawn through her, and Venus is placed
   on it, because Virgo is a zodiac constellation and Venus genuinely crosses
   her. Spica sits about two degrees south of the ecliptic and the drawing
   shows that, since it is true.

   ── the forms ────────────────────────────────────────────────────────────
   templates-form/*.json declares a shape completely enough that a machine can
   hold you to it. This file REFUSES a form whose shape does not close:

     · stanza lengths that do not sum to the line count
     · a rhyme scheme of the wrong length
     · a refrain pointing outside the poem, at itself, or forward
     · a sestina permutation that is not a permutation, or that does not
       follow from the spiral rule, or whose seventh pass fails to return to
       the first order — which is the reason the form is six stanzas long and
       not a number somebody picked

   The sestina check is the interesting one. The rule is: take the last end
   word, then the first, then the second-to-last, then the second, inward.
   Applied to 1..6 it returns to 1..6 after exactly six passes, which is why
   a sestina has six stanzas: the stanza count is the ORDER of the
   permutation, not a number anybody chose.

   That does not hold for every count. Four end-words return after three
   passes, so a four-word version would be three stanzas of four and its
   name would be a lie. The counts for which the order equals the count are
   the Queneau numbers, and this file computes the small ones rather than
   taking my word for it — I first wrote here that five words do not close,
   and five words close in five. The computation is in the log.

   ── what the room does and does not do ───────────────────────────────────
   It reports the shape you are making against the shape declared. Lines,
   syllables per line, where a refrain is due, which end word this stanza
   owes. It does not grade, does not score, does not tell you a line is
   good, and never colours anything red. A form is a decision made in advance
   so you can stop making it — not an examiner.

   Syllable counts are a heuristic over English orthography and the page says
   so where you can see it. Every draft is kept; nothing overwrites.

       node writing.mjs
   ═══════════════════════════════════════════════════════════════════════════ */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* ═══ 1 · the forms, and the refusals ══════════════════════════════════ */
const DIR = 'templates-form';
const forms = [];
let fatal = 0;

/* the sestina spiral: last, first, second-to-last, second, ... */
function spiral(order) {
  const out = [];
  for (let i = 0; i < order.length; i++)
    out.push(i % 2 === 0 ? order[order.length - 1 - i / 2] : order[(i - 1) / 2]);
  return out;
}

for (const file of readdirSync(DIR).filter((f) => f.endsWith('.json')).sort()) {
  const c = JSON.parse(readFileSync(join(DIR, file), 'utf8'));
  const errs = [];

  for (const k of ['id', 'name', 'kind', 'note', 'ground', 'ask'])
    if (!c[k]) errs.push('missing ' + k);
  if (c.kind && c.kind !== 'verse' && c.kind !== 'prose')
    errs.push('kind must be verse or prose');

  if (c.stanzas) {
    const sum = c.stanzas.reduce((a, b) => a + b, 0);
    if (sum !== c.lines)
      errs.push('stanzas sum to ' + sum + ' but lines is ' + c.lines);
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
    const k = c.end_words;
    const seen = new Set();
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
    /* and the reason the form is this long: pass k+1 must close the ring */
    const close = spiral(c.permutation[c.permutation.length - 1]);
    if (close.join(',') !== c.permutation[0].join(','))
      errs.push('the spiral does not return to the first order after ' +
                c.permutation.length + ' stanzas, so this length is arbitrary');
  }

  console.log((errs.length ? 'REFUSED' : 'ok     ') + ' ' + (c.id || file).padEnd(16) +
    (c.lines ? String(c.lines).padStart(2) + ' lines' : ' no length') +
    (c.rhyme ? ' · rhyme' : '') + (c.repeats ? ' · ' + c.repeats.length + ' refrains' : '') +
    (c.permutation ? ' · spiral closes' : ''));
  errs.forEach((e) => console.log('        x ' + e));
  if (errs.length) { fatal++; continue; }
  forms.push(c);
}

if (fatal) {
  console.log('\n' + fatal + ' refused. writing.html not written — a form whose ' +
    'shape does not close cannot hold anybody to anything.');
  process.exit(1);
}

/* Which end-word counts actually give a form whose stanza count equals its
   number of end words. The spiral is a permutation; its ORDER is how many
   applications return the identity. Only when that order equals k does the
   form close on its own terms. These are the Queneau numbers, computed here
   because I asserted the wrong thing about them from memory once already. */
const QUENEAU = [];
for (let k = 2; k <= 20; k++) {
  const id = Array.from({ length: k }, (_, i) => i + 1).join(',');
  let o = id.split(',').map(Number), n = 0;
  do { o = spiral(o); n++; } while (o.join(',') !== id && n <= k);
  if (n === k) QUENEAU.push(k);
}

/* ═══ 2 · Virgo, on her side, with the ecliptic through her ════════════ */
/* Right ascension in hours, declination in degrees, visual magnitude.
   Catalogue positions, J2000. */
const VIRGO = [
  ['Spica',        13.4199, -11.1614, 0.98],
  ['Zavijava',     11.8450,   1.7647, 3.60],
  ['Zaniah',       12.3319,  -0.6668, 3.89],
  ['Porrima',      12.6944,  -1.4494, 2.74],
  ['Auva',         12.9267,   3.3975, 3.38],
  ['Vindemiatrix', 13.0362,  10.9592, 2.83],
  ['Heze',         13.5783,  -0.5961, 3.38],
  ['Syrma',        14.2669,  -6.0006, 4.08],
  ['Rijl al Awwa', 14.7178,  -5.6583, 3.87],
  ['109 Virginis', 14.7708,   1.8928, 3.72],
  ['Tau Virginis', 14.0275,   1.5444, 4.23],
  ['Theta Virginis', 13.1658, -5.5389, 4.38],
  ['Kappa Virginis', 14.2150, -10.2736, 4.18],
  ['Nu Virginis',  11.7864,   6.5297, 4.04],
  ['Omicron Virginis', 12.0906, 8.7325, 4.12]
];
/* the figure, as the lines are conventionally drawn */
const LINKS = [
  ['Zavijava', 'Zaniah'], ['Zaniah', 'Porrima'], ['Porrima', 'Auva'],
  ['Auva', 'Vindemiatrix'], ['Porrima', 'Spica'], ['Spica', 'Heze'],
  ['Heze', 'Auva'], ['Heze', 'Syrma'], ['Syrma', 'Rijl al Awwa'],
  ['Rijl al Awwa', '109 Virginis'], ['109 Virginis', 'Tau Virginis'],
  ['Tau Virginis', 'Heze'], ['Spica', 'Kappa Virginis'],
  ['Zavijava', 'Nu Virginis'], ['Nu Virginis', 'Omicron Virginis']
];

/* the ecliptic, computed rather than drawn by hand.
   dec = asin(sin e sin L),  ra = atan2(cos e sin L, cos L) */
const OB = 23.4393 * Math.PI / 180;
const ecliptic = [];
for (let L = 170; L <= 226; L += 1) {
  const l = L * Math.PI / 180;
  const dec = Math.asin(Math.sin(OB) * Math.sin(l)) * 180 / Math.PI;
  let ra = Math.atan2(Math.cos(OB) * Math.sin(l), Math.cos(l)) * 12 / Math.PI;
  if (ra < 0) ra += 24;
  ecliptic.push([ra, dec, L]);
}

/* the projection. RA grows eastward, which is leftward on a sky chart, so x
   is reversed. The figure comes out long and low: she is already on her side. */
const RA0 = 11.6, RA1 = 15.0, D0 = -13.0, D1 = 12.5;
const W = 1200, H = 420, PAD = 46;
const px = (ra) => PAD + (RA1 - ra) / (RA1 - RA0) * (W - 2 * PAD);
const py = (dec) => PAD + (D1 - dec) / (D1 - D0) * (H - 2 * PAD);
const star = (n) => VIRGO.find((s) => s[0] === n);
const rad = (m) => Math.max(1.15, 4.6 - m * 0.72);

/* Venus, placed on the ecliptic where she actually crosses Virgo. Spica sits
   about two degrees south of the ecliptic; this puts Venus just past her, so
   the two are close on the page because they are close in the sky. */
const VEN = ecliptic.reduce((best, p) =>
  Math.abs(p[0] - 13.30) < Math.abs(best[0] - 13.30) ? p : best);
/* Spica's ecliptic latitude: how far off the ecliptic she actually sits.
   beta = asin(sin d cos e - cos d sin e sin a). This is the real number, and
   the reason Venus passes so close to her. A declination difference measured
   at whatever point I happened to sample the line would have been a fact
   about my sampling. */
const SP = star('Spica');
const spA = SP[1] * 15 * Math.PI / 180, spD = SP[2] * Math.PI / 180;
const spicaLat = Math.asin(Math.sin(spD) * Math.cos(OB) -
  Math.cos(spD) * Math.sin(OB) * Math.sin(spA)) * 180 / Math.PI;
const spicaGap = Math.abs(spicaLat).toFixed(2);

const sky =
  '<svg viewBox="0 0 ' + W + ' ' + H + '" class="sky" aria-label="Virgo, lying on her side, with the ecliptic through her and Venus on it">\n' +
  '  <defs><radialGradient id="vg"><stop offset="0" stop-color="#fff8e0"/>' +
  '<stop offset=".45" stop-color="#f2d489"/><stop offset="1" stop-color="#c9962a" stop-opacity="0"/></radialGradient></defs>\n' +
  '  <path class="ecl" d="' + ecliptic.map((p, i) =>
      (i ? 'L' : 'M') + px(p[0]).toFixed(1) + ' ' + py(p[1]).toFixed(1)).join(' ') + '"/>\n' +
  LINKS.map(([a, b]) => {
    const A = star(a), B = star(b);
    return '  <line class="lk" x1="' + px(A[1]).toFixed(1) + '" y1="' + py(A[2]).toFixed(1) +
           '" x2="' + px(B[1]).toFixed(1) + '" y2="' + py(B[2]).toFixed(1) + '"/>';
  }).join('\n') + '\n' +
  VIRGO.map((s) =>
    '  <circle class="st" cx="' + px(s[1]).toFixed(1) + '" cy="' + py(s[2]).toFixed(1) +
    '" r="' + rad(s[3]).toFixed(2) + '"><title>' + esc(s[0]) + ', magnitude ' + s[3] + '</title></circle>').join('\n') + '\n' +
  '  <circle cx="' + px(VEN[0]).toFixed(1) + '" cy="' + py(VEN[1]).toFixed(1) + '" r="26" fill="url(#vg)"/>\n' +
  '  <circle class="ven" cx="' + px(VEN[0]).toFixed(1) + '" cy="' + py(VEN[1]).toFixed(1) + '" r="5.2">' +
  '<title>Venus, on the ecliptic</title></circle>\n' +
  '  <text class="lb" x="' + (px(star('Spica')[1]) + 11).toFixed(1) + '" y="' +
     (py(star('Spica')[2]) + 15).toFixed(1) + '">Spica</text>\n' +
  '  <text class="lb vn" x="' + (px(VEN[0]) + 13).toFixed(1) + '" y="' +
     (py(VEN[1]) - 12).toFixed(1) + '">Venus</text>\n' +
  '  <text class="lb dim" x="' + (px(star('Vindemiatrix')[1]) + 11).toFixed(1) + '" y="' +
     (py(star('Vindemiatrix')[2]) + 4).toFixed(1) + '">Vindemiatrix</text>\n' +
  '  <text class="lb dim ecl-l" x="' + px(14.72).toFixed(1) + '" y="' + (py(-2.2)).toFixed(1) + '">the ecliptic</text>\n' +
  '</svg>';

/* ═══ 3 · the page ════════════════════════════════════════════════════ */
const html = '<!doctype html>\n<html lang="en">\n<head>\n' +
'<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n' +
'<title>The notebook &middot; Virgo on her side</title>\n<style>\n' +
`  :root{
    --room:#0b0a0d;              /* the dark the book lies in */
    --paper:#efe7d6; --paper2:#e7dcc6; --rule:#cbbfa6;
    --ink:#2b2620; --pale:#7d7263; --faint:#a2957f;
    --gold:#b8860b; --venus:#f0cf72; --red:#9b4a3c;
    --edge:#241f1a;
  }
  *{box-sizing:border-box}
  html,body{height:100%}
  body{margin:0;background:var(--room);color:var(--ink);overflow:hidden;
    font:14px/1.6 ui-sans-serif,system-ui,"Segoe UI",sans-serif;
    display:flex;align-items:center;justify-content:center}

  /* ── the cover. She is lying down. ─────────────────────────────────── */
  #cover{position:fixed;inset:0;z-index:60;background:
    radial-gradient(160% 100% at 50% 62%,#151320 0%,#0b0a0d 58%,#050406 100%);
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    gap:6px;cursor:pointer;transition:opacity .6s ease,visibility .6s}
  #cover.gone{opacity:0;visibility:hidden}
  .sky{width:min(1140px,94vw);height:auto;display:block}
  .ecl{fill:none;stroke:#4a5f7a;stroke-width:1;stroke-dasharray:5 6;opacity:.85}
  .lk{stroke:#5d6b86;stroke-width:.9;opacity:.62}
  .st{fill:#e9edf7}
  .ven{fill:var(--venus)}
  .lb{fill:#9aa6bd;font:10.5px/1 ui-monospace,monospace;letter-spacing:.06em}
  .lb.dim{fill:#5f6a80;font-size:9px}
  .lb.vn{fill:var(--venus);font-size:11.5px;letter-spacing:.12em}
  .ecl-l{fill:#4a5f7a}
  #cover h1{margin:4px 0 0;color:#e8e0cf;
    font:400 27px/1.2 Georgia,"Iowan Old Style",serif;letter-spacing:.13em}
  #cover p{margin:0;color:#6d7488;max-width:60ch;text-align:center;
    font:10.5px/1.8 ui-monospace,monospace}
  #cover p b{color:#93a0b8;font-weight:400}
  #open{margin-top:14px;background:none;border:1px solid #333a4a;color:#8b93a8;
    padding:8px 22px;border-radius:2px;cursor:pointer;
    font:10px/1 ui-monospace,monospace;letter-spacing:.22em}
  #open:hover{border-color:var(--venus);color:var(--venus)}

  /* ── the book, open flat, landscape ───────────────────────────────── */
  #book{display:grid;grid-template-columns:1fr 10px 1fr;
    width:min(1560px,97vw);height:min(880px,94vh);
    box-shadow:0 40px 90px -20px #000,0 0 0 1px #1c1811;border-radius:3px}
  .leaf{background:linear-gradient(180deg,var(--paper),var(--paper2));
    display:flex;flex-direction:column;min-width:0;min-height:0;position:relative}
  .leaf.l{border-radius:3px 0 0 3px;
    box-shadow:inset -22px 0 26px -22px rgba(60,44,20,.55)}
  .leaf.r{border-radius:0 3px 3px 0;
    box-shadow:inset 22px 0 26px -22px rgba(60,44,20,.55)}
  /* the spine: a real gutter, because a notebook has one */
  #spine{background:linear-gradient(90deg,#7a6a4c,#3a3125 42%,#2d251b 50%,#3a3125 58%,#7a6a4c);
    box-shadow:inset 0 0 8px rgba(0,0,0,.6)}

  /* the left leaf: where you write */
  #head{display:flex;align-items:center;gap:12px;padding:13px 26px 10px;
    border-bottom:1px solid var(--rule)}
  #ttl{flex:1;min-width:0;background:none;border:none;outline:none;color:var(--ink);
    font:italic 600 19px/1.3 Georgia,"Iowan Old Style",serif}
  #ttl::placeholder{color:var(--faint)}
  #head select{background:#e2d7bf;border:1px solid var(--rule);color:var(--ink);
    border-radius:2px;padding:5px 7px;font:11px/1 ui-monospace,monospace;cursor:pointer}
  #head button{background:none;border:1px solid var(--rule);color:var(--pale);
    border-radius:2px;padding:5px 9px;cursor:pointer;font:10px/1 ui-monospace,monospace}
  #head button:hover{color:var(--ink);border-color:var(--pale)}
  #head button.warn:hover{color:var(--red);border-color:var(--red)}
  /* ruled paper. The rules are the writing surface, not a background image
     laid behind an unrelated line-height: the gradient period IS 30px and so
     is the line-height, which is why the text sits on them. */
  #wrap{flex:1;overflow-y:auto;position:relative}
  #pen{display:block;width:100%;min-height:100%;background:transparent;
    border:none;outline:none;resize:none;color:var(--ink);
    padding:14px 30px 42vh 62px;
    font:16px/30px Georgia,"Iowan Old Style",serif;
    background-image:repeating-linear-gradient(180deg,
      transparent 0,transparent 29px,var(--rule) 29px,var(--rule) 30px);
    background-position:0 14px;background-attachment:local}
  #pen::placeholder{color:var(--faint)}
  /* the margin rule, the red one down the left of every school notebook */
  .leaf.l::before{content:"";position:absolute;left:48px;top:0;bottom:0;width:1px;
    background:var(--red);opacity:.35;pointer-events:none;z-index:2}

  /* the right leaf: the form, and what you are actually making */
  .leaf.r{padding:0}
  #tabs{display:flex;border-bottom:1px solid var(--rule);flex:none}
  #tabs button{flex:1;background:none;border:none;border-right:1px solid var(--rule);
    padding:11px 4px;cursor:pointer;color:var(--faint);
    font:9.5px/1 ui-sans-serif,system-ui,sans-serif;letter-spacing:.13em;
    text-transform:uppercase}
  #tabs button:last-child{border-right:none}
  #tabs button.on{color:var(--ink);background:#e3d8c0;font-weight:600}
  .pane{display:none;flex:1;overflow-y:auto;padding:18px 26px 30px;min-height:0}
  .pane.on{display:block}

  h3{margin:0 0 3px;font:600 15px/1.3 Georgia,serif;color:var(--ink)}
  .sub{margin:0 0 13px;font:10px/1.5 ui-monospace,monospace;color:var(--faint);
    letter-spacing:.05em}
  .note{margin:0 0 12px;font:12.5px/1.75 Georgia,serif;color:#4a4238}
  .ground{margin:0 0 12px;padding:11px 13px;background:#e6dbc3;
    border-left:2px solid var(--gold);font:11.5px/1.7 Georgia,serif;color:#544b3e}
  .ask{margin:0;padding:11px 13px;border:1px dashed var(--rule);
    font:italic 12.5px/1.65 Georgia,serif;color:#5d5346}
  .ask b{display:block;font:600 8.5px/1 ui-sans-serif,sans-serif;font-style:normal;
    letter-spacing:.16em;text-transform:uppercase;color:var(--faint);margin-bottom:6px}

  /* the shape: one row per line of the form, filled as you write */
  .shape{margin:0;padding:0;list-style:none;
    font:11px/1 ui-monospace,monospace}
  .shape li{display:flex;align-items:center;gap:8px;padding:4px 0;
    border-bottom:1px dotted #d8ccb4}
  .shape .no{width:20px;text-align:right;color:var(--faint);
    font-variant-numeric:tabular-nums}
  .shape .rh{width:15px;text-align:center;color:var(--gold);font-weight:700}
  .shape .rf{width:auto;color:var(--red);font-size:9px;letter-spacing:.04em}
  .shape .tx{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;
    white-space:nowrap;color:#5a5044;font-family:Georgia,serif;font-size:12px}
  .shape .tx.e{color:#c3b69c;font-style:italic}
  .shape .sy{width:34px;text-align:right;color:var(--faint);font-size:9.5px;
    font-variant-numeric:tabular-nums}
  .shape .sy.off{color:var(--gold)}
  .shape li.done{background:#e9dfc8}
  .shape li.brk{border-bottom:1px solid var(--pale);padding-bottom:9px;margin-bottom:5px}

  /* the sestina table, with your own six words in it */
  #ends{display:grid;grid-template-columns:repeat(6,1fr);gap:5px;margin-bottom:12px}
  #ends input{background:#e6dbc3;border:1px solid var(--rule);border-radius:2px;
    padding:6px 5px;font:11px/1 ui-monospace,monospace;color:var(--ink);
    text-align:center;min-width:0;outline:none}
  #ends input:focus{border-color:var(--gold)}
  #spiral{width:100%;border-collapse:collapse;font:10.5px/1 ui-monospace,monospace}
  #spiral th{color:var(--faint);font-weight:400;font-size:8.5px;letter-spacing:.1em;
    text-transform:uppercase;padding:0 0 6px}
  #spiral td{padding:5px 4px;border-top:1px dotted #d8ccb4;color:#5a5044;
    text-align:center;overflow:hidden;text-overflow:ellipsis;max-width:0}
  #spiral td.now{background:#e9dfc8;color:var(--ink);font-weight:700}
  #spiral tr.now th{color:var(--gold)}

  /* the reader: counts, never scores */
  .met{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--rule);
    border:1px solid var(--rule);margin-bottom:14px}
  .met div{background:var(--paper);padding:9px 5px;text-align:center}
  .met u{display:block;text-decoration:none;font:17px/1.15 ui-monospace,monospace;
    color:var(--ink);font-variant-numeric:tabular-nums}
  .met s{display:block;text-decoration:none;margin-top:3px;
    font:8px/1.25 ui-sans-serif,system-ui,sans-serif;letter-spacing:.09em;
    text-transform:uppercase;color:var(--faint)}
  #bars{display:flex;align-items:flex-end;gap:2px;height:66px;margin-bottom:6px;
    padding:0 1px;border-bottom:1px solid var(--rule)}
  #bars i{flex:1;min-width:2px;background:#c0b294;border-radius:1px 1px 0 0}
  #bars i.long{background:var(--gold)}
  .cap{margin:0 0 16px;font:9.5px/1.6 ui-monospace,monospace;color:var(--faint)}
  .lex{margin:0 0 14px;font:11.5px/1.8 Georgia,serif;color:#544b3f}
  .lex b{color:var(--ink)}
  .rep{display:flex;flex-wrap:wrap;gap:4px;margin-top:7px}
  .rep span{background:#e3d8c0;border:1px solid var(--rule);border-radius:2px;
    padding:3px 7px;font:10px/1 ui-monospace,monospace;color:#5a5044}
  .rep span u{text-decoration:none;color:var(--gold);margin-left:5px}

  /* the drafts, which only accumulate */
  .dr{padding:9px 11px;border:1px solid var(--rule);border-radius:2px;
    margin-bottom:5px;cursor:pointer;background:#eae0ca}
  .dr:hover{border-color:var(--pale)}
  .dr.on{background:#e3d8c0;border-color:var(--gold)}
  .dr b{display:block;font:600 12px/1.35 Georgia,serif;color:var(--ink);
    overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .dr i{font-style:normal;display:block;margin-top:2px;
    font:9px/1.4 ui-monospace,monospace;color:var(--faint)}
  #newd{width:100%;margin-bottom:9px;padding:8px;background:#e3d8c0;
    border:1px solid var(--rule);border-radius:2px;cursor:pointer;color:var(--ink);
    font:600 10.5px/1 ui-monospace,monospace;letter-spacing:.1em}
  #newd:hover{border-color:var(--gold);color:var(--gold)}

  #say{position:fixed;left:14px;bottom:12px;z-index:70;
    font:9px/1 ui-monospace,monospace;color:#3d3a44}
  #back{position:fixed;right:14px;bottom:12px;z-index:70;background:none;
    border:none;cursor:pointer;color:#3d3a44;font:9px/1 ui-monospace,monospace;
    letter-spacing:.1em}
  #back:hover{color:var(--venus)}

  @media (max-width:1000px){
    body{overflow:auto;display:block}
    #book{grid-template-columns:1fr;grid-template-rows:auto auto;height:auto;
      width:100%;border-radius:0}
    #spine{height:8px;background:linear-gradient(180deg,#7a6a4c,#2d251b,#7a6a4c)}
    .leaf.l,.leaf.r{border-radius:0;box-shadow:none}
    #wrap{min-height:60vh}
    .pane{max-height:none}
  }
</style>\n</head>\n<body>\n\n` +

/* ── the cover ───────────────────────────────────────────────────────── */
'<div id="cover">\n' + sky + '\n' +
'  <h1>The notebook</h1>\n' +
'  <p>Virgo, from her real stars, right ascension against declination &mdash; ' +
   'she is on her side because that is how she lies. The dashed line is the ' +
   'ecliptic, computed, and <b>Venus</b> is on it, because Virgo is a zodiac ' +
   'constellation and Venus crosses her. Spica lies <b>' + spicaGap +
   '&deg;</b> south of the ecliptic, barely off it, which is why the two keep meeting.</p>\n' +
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
'      <button id="exp">export</button>\n' +
'    </div>\n' +
'    <div id="wrap"><textarea id="pen" spellcheck="true" ' +
       'placeholder="The rules are 30px apart and so is the line. Write on them."></textarea></div>\n' +
'  </section>\n' +
'  <div id="spine"></div>\n' +
'  <section class="leaf r">\n' +
'    <div id="tabs">\n' +
'      <button data-p="shape" class="on">the shape</button>\n' +
'      <button data-p="form">the form</button>\n' +
'      <button data-p="read">the reader</button>\n' +
'      <button data-p="drafts">drafts</button>\n' +
'    </div>\n' +
'    <div class="pane on" id="p-shape"></div>\n' +
'    <div class="pane" id="p-form"></div>\n' +
'    <div class="pane" id="p-read"></div>\n' +
'    <div class="pane" id="p-drafts"><button id="newd">+ new draft</button><div id="dlist"></div></div>\n' +
'  </section>\n' +
'</div>\n' +
'<div id="say"></div>\n<button id="back">show the cover</button>\n\n' +

/* ── the script ──────────────────────────────────────────────────────── */
'<script>\n' +
'const FORMS = ' + JSON.stringify(forms) + ';\n' +
'const QUENEAU = ' + JSON.stringify(QUENEAU) + ';\n' +
`
const KEY = 'venus.notebook.v1';
const $ = (s) => document.querySelector(s);
const byId = (id) => FORMS.find((f) => f.id === id) || FORMS[0];

/* ── storage. Local, one key, nothing leaves. ───────────────────────── */
function load() {
  try {
    const b = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (b && Array.isArray(b.drafts) && b.drafts.length) return b;
  } catch (e) { /* private window, cleared data, storage blocked */ }
  return null;
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(book)); $('#say').textContent = 'saved'; }
  catch (e) { $('#say').textContent = 'NOT SAVED — storage unavailable'; }
}
function blank(formId) {
  return { id: 'd' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36),
           title: '', text: '', form: formId || FORMS[0].id, ends: ['','','','','',''],
           made: new Date().toISOString(), touched: new Date().toISOString() };
}
let book = load() || { drafts: [blank()] };
let cur = book.drafts[0].id;
const D = () => book.drafts.find((d) => d.id === cur);

/* ── syllables. A heuristic over English spelling, and the page says so
   where you can see it rather than in a comment nobody reads. ───────── */
function syl(w) {
  w = w.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  if (w.length <= 3) return 1;
  /* a consonant plus -le is its own syllable and needs its e; every other
     final e is silent. Getting this wrong counted the e twice and made
     "table" three. */
  const le = /[^aeiouy]le$/.test(w);
  /* -ed is a syllable after t or d and silent everywhere else: forested is
     three, closed is one. Stripping it unconditionally lost the difference. */
  if (/[^td]ed$/.test(w)) w = w.replace(/ed$/, '');
  else if (/[^laeiouy]es$/.test(w)) w = w.replace(/es$/, '');
  else if (!le) w = w.replace(/e$/, '');
  /* runs, not pairs: the "eau" of beautiful is one nucleus, not two */
  const g = w.match(/[aeiouy]+/g);
  return Math.max(1, g ? g.length : 1);
}
const lineSyl = (l) => (l.match(/[A-Za-z']+/g) || []).reduce((a, w) => a + syl(w), 0);
const linesOf = (t) => t.split('\\n');
const words = (t) => (t.match(/[A-Za-z'-]+/g) || []);

/* ── the shape pane: the form's slots, filled as you write ──────────── */
function paintShape() {
  const d = D(), f = byId(d.form), L = linesOf(d.text);
  const box = $('#p-shape');
  if (!f.lines) {
    const beats = f.beats || [];
    box.innerHTML = '<h3>' + f.name + '</h3><p class="sub">no fixed length</p>' +
      (beats.length
        ? '<ul class="shape">' + beats.map((b, i) => {
            const hit = L.filter((x) => x.trim()).length > i * 2;
            return '<li class="' + (hit ? 'done' : '') + '"><span class="no">' +
              (i + 1) + '</span><span class="tx">' + b.name + ' &mdash; ' + b.ask + '</span></li>';
          }).join('') + '</ul>'
        : '<p class="note">Nothing is being held against a shape. ' +
          linesOf(d.text).filter((x) => x.trim()).length + ' lines so far.</p>') +
      '<p class="ask" style="margin-top:14px"><b>the question</b>' + f.ask + '</p>';
    return;
  }

  const rep = {}; (f.repeats || []).forEach((r) => { rep[r.line] = r.same_as; });
  const brk = new Set(); let acc = 0;
  (f.stanzas || []).forEach((n) => { acc += n; brk.add(acc); });
  const target = Array.isArray(f.meter && f.meter.syllables) ? null
    : (f.meter ? f.meter.syllables : null);

  let rows = '';
  for (let i = 1; i <= f.lines; i++) {
    const raw = L[i - 1] === undefined ? '' : L[i - 1];
    const has = raw.trim().length > 0;
    const s = has ? lineSyl(raw) : 0;
    const want = Array.isArray(f.meter && f.meter.syllables)
      ? f.meter.syllables[(i - 1) % f.meter.syllables.length] : target;
    const off = has && want && s !== want;
    rows += '<li class="' + (has ? 'done ' : '') + (brk.has(i) ? 'brk' : '') + '">' +
      '<span class="no">' + i + '</span>' +
      (f.rhyme ? '<span class="rh">' + f.rhyme[i - 1] + '</span>' : '') +
      '<span class="tx' + (has ? '' : ' e') + '">' +
        (has ? esc(raw.trim()).slice(0, 52)
             : (rep[i] ? 'refrain, line ' + rep[i] : '\\u00b7')) + '</span>' +
      (rep[i] ? '<span class="rf">R' + rep[i] + '</span>' : '') +
      (want ? '<span class="sy' + (off ? ' off' : '') + '">' +
        (has ? s + '/' + want : want) + '</span>' : '') +
      '</li>';
  }
  const written = L.filter((x) => x.trim()).length;
  box.innerHTML = '<h3>' + f.name + '</h3>' +
    '<p class="sub">' + written + ' of ' + f.lines + ' lines' +
      (f.rhyme ? ' \\u00b7 ' + f.rhyme : '') +
      (f.meter ? ' \\u00b7 ' + f.meter.name : '') + '</p>' +
    (f.permutation ? sestina(d, f) : '') +
    '<ul class="shape">' + rows + '</ul>' +
    (target ? '<p class="cap" style="margin-top:10px">Syllables are estimated ' +
      'from spelling. The estimate is wrong on names, on some -ed endings, and ' +
      'on anything borrowed. A number in gold is a difference, not a mistake.</p>' : '');
}

/* the sestina table, driven by the six words you actually chose */
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
      row.map((n, j) => '<td class="' + (i === stanza ? 'now' : '') + '">' +
        (E[n - 1] ? esc(E[n - 1]) : n) + '</td>').join('') + '</tr>';
  });
  t += '<tr><th>env</th><td colspan="6">' + f.envoi.map((p) =>
    (E[p[0] - 1] || p[0]) + '/' + (E[p[1] - 1] || p[1])).join('  \\u00b7  ') + '</td></tr>';
  return t + '</table><p class="cap">One rule, applied six times: last, first, ' +
    'second-to-last, second, inward. After six passes it is back where it ' +
    'started, and that is why the form has six stanzas \u2014 the stanza count ' +
    'is the order of the permutation, not a number anybody picked. It does not ' +
    'work for every count: four end-words come back after three passes. The ' +
    'counts that do are ' + QUENEAU.join(', ') + ' and up.</p>';
}

/* ── the form pane ──────────────────────────────────────────────────── */
function paintForm() {
  const f = byId(D().form);
  $('#p-form').innerHTML = '<h3>' + f.name + '</h3>' +
    '<p class="sub">' + f.kind + (f.lines ? ' \\u00b7 ' + f.lines + ' lines' : '') + '</p>' +
    '<p class="note">' + f.note + '</p>' +
    '<div class="ground">' + f.ground + '</div>' +
    '<p class="ask"><b>the question this form asks</b>' + f.ask + '</p>';
}

/* ── the reader. Counts. Never a score. ─────────────────────────────── */
function paintRead() {
  const t = D().text, L = linesOf(t).filter((x) => x.trim()), W = words(t);
  const S = W.reduce((a, w) => a + syl(w), 0);
  const sent = (t.match(/[^.!?\\n]+[.!?]+(\\s|$)|[^.!?\\n]+$/gm) || [])
    .filter((x) => x.trim()).length;

  /* the shape of the lines, as a run of bars. This is the one picture worth
     having: a poem whose lines are all the same length looks like a wall. */
  const lens = L.map((l) => lineSyl(l));
  const max = Math.max(6, ...lens);
  const bars = lens.slice(-70).map((n) =>
    '<i style="height:' + Math.round(n / max * 100) + '%" class="' +
    (n > max * 0.85 ? 'long' : '') + '"></i>').join('');

  /* repeated words, which is the only thing here that reads like advice and
     is not: a repeat may be the whole point, in six of these eleven forms. */
  const stop = new Set(('the a an and or but of to in on at it is was be for '
    + 'with as by from that this i you he she they we not no so if all my her his'
    ).split(' '));
  const freq = {};
  W.forEach((w) => { const k = w.toLowerCase(); if (!stop.has(k) && k.length > 2) freq[k] = (freq[k] || 0) + 1; });
  const rep = Object.entries(freq).filter(([, n]) => n > 1)
    .sort((a, b) => b[1] - a[1]).slice(0, 14);

  /* short words carry the Germanic core of English; long ones the Latinate
     borrowings. The ratio is a real fact about a passage, not a verdict. */
  const shortW = W.filter((w) => w.length <= 4).length;
  const pc = W.length ? Math.round(shortW / W.length * 100) : 0;

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
    '<p class="cap">The shape of the last ' + Math.min(70, lens.length) +
      ' lines by syllable. Gold is a line in the longest sixth. A flat run is ' +
      'a wall; whether you want a wall is your business.</p>' +
    '<p class="lex">Short words \\u2014 four letters or fewer \\u2014 are ' +
      '<b>' + pc + '%</b> of this. English keeps its oldest and plainest ' +
      'vocabulary in its short words and its borrowed, abstract vocabulary in ' +
      'its long ones, so this number moves when the register does. It is a ' +
      'measurement, not a target.</p>' +
    (rep.length
      ? '<p class="lex">Words you used more than once:<span class="rep">' +
        rep.map(([w, n]) => '<span>' + esc(w) + '<u>' + n + '</u></span>').join('') +
        '</span></p><p class="cap">Six of the eleven forms here are built on ' +
        'repetition. This is a list, not a complaint.</p>'
      : '');
}

/* ── drafts. They only accumulate. ──────────────────────────────────── */
function paintDrafts() {
  const L = $('#dlist'); L.innerHTML = '';
  book.drafts.forEach((d) => {
    const el = document.createElement('div');
    el.className = 'dr' + (d.id === cur ? ' on' : '');
    const b = document.createElement('b');
    b.textContent = d.title || (d.text.split('\\n').find((x) => x.trim()) || 'Untitled').slice(0, 38);
    const i = document.createElement('i');
    i.textContent = byId(d.form).name + '  \\u00b7  ' +
      linesOf(d.text).filter((x) => x.trim()).length + ' lines  \\u00b7  ' +
      d.touched.slice(0, 10);
    el.append(b, i);
    el.onclick = () => { cur = d.id; show(); };
    L.appendChild(el);
  });
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function paint() { paintShape(); paintForm(); paintRead(); paintDrafts(); wire(); }
function show() {
  const d = D();
  $('#ttl').value = d.title; $('#pen').value = d.text; $('#form').value = d.form;
  paint(); $('#pen').focus();
}

/* the end-word inputs are rebuilt on every paint, so they are wired after */
function wire() {
  document.querySelectorAll('#ends input').forEach((inp) => {
    inp.oninput = () => {
      const d = D();
      d.ends = d.ends || ['','','','','',''];
      d.ends[+inp.dataset.e] = inp.value;
      save(); paintShape(); wire();
    };
  });
}

let t = null;
function touch() {
  const d = D();
  d.title = $('#ttl').value; d.text = $('#pen').value;
  d.touched = new Date().toISOString();
  $('#say').textContent = 'writing';
  clearTimeout(t);
  t = setTimeout(() => { save(); paint(); }, 380);
}
$('#pen').addEventListener('input', touch);
$('#ttl').addEventListener('input', touch);
$('#form').onchange = () => { D().form = $('#form').value; save(); paint(); };
$('#newd').onclick = () => { const d = blank($('#form').value); book.drafts.unshift(d); cur = d.id; save(); show(); };

document.querySelectorAll('#tabs button').forEach((b) => {
  b.onclick = () => {
    document.querySelectorAll('#tabs button').forEach((x) => x.classList.remove('on'));
    document.querySelectorAll('.pane').forEach((x) => x.classList.remove('on'));
    b.classList.add('on');
    $('#p-' + b.dataset.p).classList.add('on');
  };
});

$('#exp').onclick = () => {
  const md = book.drafts.slice().reverse().map((d) =>
    '# ' + (d.title || 'Untitled') + '\\n\\n*' + byId(d.form).name + ' \\u00b7 ' +
    d.made.slice(0, 10) + '*\\n\\n' + d.text + '\\n').join('\\n---\\n\\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([md], { type: 'text/markdown' }));
  a.download = 'notebook-' + new Date().toISOString().slice(0, 10) + '.md';
  a.click(); URL.revokeObjectURL(a.href);
};

$('#open').onclick = (e) => { e.stopPropagation(); $('#cover').classList.add('gone'); $('#pen').focus(); };
$('#cover').onclick = () => $('#cover').classList.add('gone');
$('#back').onclick = () => $('#cover').classList.remove('gone');

show();
<\/script>\n</body>\n</html>\n`;

writeFileSync('writing.html', html);

console.log('\nwriting.html · ' + forms.length + ' forms · ' +
  forms.filter((f) => f.kind === 'verse').length + ' verse, ' +
  forms.filter((f) => f.kind === 'prose').length + ' prose');
console.log('  ' + forms.filter((f) => f.repeats).length + ' built on refrain · ' +
  forms.filter((f) => f.rhyme).length + ' rhymed · ' +
  forms.filter((f) => f.meter).length + ' metrical');
console.log('  sestina spiral: six end words close in six passes; the counts ' +
  'for which stanzas equal end words are ' + QUENEAU.join(', ') + ' (four does not: ' +
  'it closes in three)');
console.log('  cover: Virgo, ' + VIRGO.length + ' stars from catalogue, ' +
  LINKS.length + ' links, ecliptic over ' + ecliptic.length + ' degrees of longitude');
console.log('  Venus placed at RA ' + VEN[0].toFixed(2) + 'h, dec ' + VEN[1].toFixed(2) +
  ' — Spica sits ' + spicaGap + ' degrees off the ecliptic (its latitude)');

/* toonami.mjs — the look of the whole ship, built from a template rather than from code.

   The look used to be this file. Now it is templates-theme/: a theme is a
   JSON file with the palette, the type, the sky, the glows, the fireflies
   (their colours, their layers, their drift and blink), the glass and the
   ship's standard; templates-theme/_active.json says which one is on. This
   file only turns that into CSS. Edit the theme and run toonami-all.mjs and
   every page in the yard is repainted; change one word in _active.json and
   the ship wears a different look. No code is edited to do either.

   The fireflies are still pure CSS — layers of radial gradients, each on its
   own drift and its own blink — so a page that carries no script stays a page
   that carries no script. No body::before or body::after is used, because
   sixty-nine pages already use theirs. Nothing here has a face.

   A generator drops ${FIREFLIES} in ONE place. The markers wrap the block and
   nothing else: toonami-all.mjs refreshes whatever lies between them, so a
   generator that split the style from the standard would have its whole body
   replaced on the next stamp. That happened twice; hence one block, one place,
   and ${TOONAMI} is empty for the generators that still name it. */
import { readFileSync, readdirSync, existsSync } from 'node:fs';

const h32 = (a, b, c) => { let x = (Math.imul(a, 73856093) ^ Math.imul(b, 19349663) ^ Math.imul(c, 83492791)) | 0; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return x >>> 0; };
const u = (a, b, c) => (h32(a, b, c) % 10000) / 10000;

const DIR = 'templates-theme';
const read = f => JSON.parse(readFileSync(`${DIR}/${f}.json`, 'utf8'));
function active() {
  if (!existsSync(DIR)) throw new Error('templates-theme/ is missing: the look is a template now, and this is it');
  const want = existsSync(`${DIR}/_active.json`) ? read('_active').theme : null;
  const have = readdirSync(DIR).filter(f => f.endsWith('.json') && !f.startsWith('_')).map(f => f.slice(0, -5));
  const id = have.includes(want) ? want : have[0];
  if (!id) throw new Error('no theme in templates-theme/');
  return read(id);
}
export const THEME = active();

/* one layer of fireflies: `count` points at hashed positions, in the theme's colours */
const layer = (T, seed, n) => Array.from({ length: n }, (_, i) => {
  const [rgb, hex] = T.fireflies.hues[h32(seed, i, 1) % T.fireflies.hues.length];
  const x = (u(seed, i, 2) * 100).toFixed(1), y = (u(seed, i, 3) * 100).toFixed(1);
  const r = (T.fireflies.sizeMin + u(seed, i, 4) * T.fireflies.sizeSpan).toFixed(1);
  return `radial-gradient(${(+r * T.fireflies.halo).toFixed(0)}px circle at ${x}% ${y}%, #fff 0, ${hex} ${r}px, rgba(${rgb},${T.fireflies.coreAlpha}) ${(+r * T.fireflies.core).toFixed(1)}px, transparent ${(+r * T.fireflies.halo).toFixed(0)}px)`;
}).join(',');

export function styleFor(T) {
  const p = T.palette, y = T.type, s = T.sky, g = T.glow, f = T.fireflies, gl = T.glass, st = T.standard;
  const vars = Object.entries(p).map(([k, v]) => `--${k}:${v}`).join(';');
  const layers = f.layers.map((L, i) => `  #toonami i:nth-child(${i + 1}){background-image:${layer(T, L.seed, L.count)}${i === 0 ? '' : `;animation:${L.drift} ease-in-out infinite,${L.blink} ease-in-out infinite ${L.delay}`}}`).join('\n');
  return `<!--toonami--><style>
  :root{${vars};--serif:${y.serif}}
  html{background:${p.void}}body{background:radial-gradient(${s.width} ${s.height} at 50% -20%,${s.top} 0%,${p.void} ${s.stop}) fixed;color:var(--ink)}
  header h1,h1{text-transform:${y.titleTransform};letter-spacing:${y.titleSpacing};font-weight:${y.titleWeight};color:${y.titleColor};text-shadow:0 0 10px var(--sea),0 0 34px ${g.title}}
  header small,footer{color:var(--dim)}
  section,.stat,.board,.map,.clan,.pile,.region,.card{border-color:var(--edge);box-shadow:0 0 0 1px ${g.edge},inset 0 0 28px ${g.inner}}
  section h2{text-transform:uppercase;letter-spacing:${y.headingSpacing};font-size:${y.headingSize}}section h2 i,.clan h3 small,.stat i{text-transform:none;letter-spacing:0}
  .stat span,.pile b{font-size:${y.labelSize};letter-spacing:${y.labelSpacing};text-transform:uppercase;color:var(--sea)}
  button{border-color:var(--edge);text-transform:uppercase;letter-spacing:.07em;font-size:11px;background:var(--panel2);color:var(--ink)}button:hover:not(:disabled){border-color:var(--sea);box-shadow:0 0 12px ${g.button}}
  button.primary{background:var(--panel2);border-color:var(--magenta);box-shadow:0 0 12px ${g.primary}}
  .bar{background:var(--void)}.bar div,.bar{box-shadow:0 0 8px ${g.button}}
  canvas#scene,canvas#board,canvas#map,canvas#sky,canvas#lane,canvas#street{box-shadow:0 0 0 1px var(--edge),0 0 30px ${g.canvas}}
  #toonami,#toonami i,#toonami b{position:fixed;pointer-events:none;display:block;margin:0;padding:0}#toonami{inset:0;z-index:0}
  #toonami i{inset:${f.spread};background-repeat:no-repeat;will-change:transform,opacity;animation:${f.layers[0].drift} ease-in-out infinite,${f.layers[0].blink} ease-in-out infinite ${f.layers[0].delay}}
${layers}
  #toonami b{inset:0;z-index:3;background:radial-gradient(ellipse at center,transparent ${gl.vignetteStart},${gl.vignetteColor} 100%),repeating-linear-gradient(0deg,${gl.scanlineColor} 0 ${gl.scanlineOn},transparent ${gl.scanlineOn} ${gl.scanlineOff})}
  @keyframes tn-drift-a{0%{transform:translate3d(0,0,0)}50%{transform:translate3d(2.5%,-3%,0)}100%{transform:translate3d(0,0,0)}}
  @keyframes tn-drift-b{0%{transform:translate3d(0,0,0)}50%{transform:translate3d(-3%,2%,0)}100%{transform:translate3d(0,0,0)}}
  @keyframes tn-drift-c{0%{transform:translate3d(0,0,0)}33%{transform:translate3d(2%,2.5%,0)}66%{transform:translate3d(-1.5%,-2%,0)}100%{transform:translate3d(0,0,0)}}
  @keyframes tn-blink-a{${f.blinkA}}
  @keyframes tn-blink-b{${f.blinkB}}
  #toonami em{position:fixed;${st.corner};z-index:4;pointer-events:none;font:700 13px/1 var(--serif);letter-spacing:${st.spacing};color:${st.color};text-shadow:0 0 10px ${st.glow};border:3px double ${st.border};padding:7px 6px 6px 12px;background:${p.void}b8;font-style:normal}
  #toonami em small{display:block;font:400 9px/1.3 system-ui,sans-serif;letter-spacing:.14em;color:var(--dim);margin-top:5px;text-transform:uppercase}
  @media (prefers-reduced-motion:reduce){#toonami i{animation:none;opacity:${f.reducedOpacity}}}
</style>`;
}

export const standardFor = T => `<div id="toonami" aria-hidden="true">${T.fireflies.layers.map(() => '<i></i>').join('')}<b></b><em>${T.standard.text}<small>${T.standard.sub}</small></em></div><!--/toonami-->`;

export const BLOCK = styleFor(THEME) + '\n' + standardFor(THEME);
export const TOONAMI = '';
export const FIREFLIES = BLOCK;

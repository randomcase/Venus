/* toonami.mjs — the look for the whole yard: a late-night broadcast block with fireflies.

   Black-indigo space, neon cyan and magenta on the edges, scanlines over
   everything, uppercase display type with a glow. And fireflies: warm
   yellow-green points that drift and blink. They are pure CSS — four fixed
   layers of radial gradients, each on its own drift and its own blink — so
   a page that carries no script stays a page that carries no script, and
   the yard's accounting of what runs is untouched. No body::before or
   body::after is used, because sixty-nine pages already use theirs.

   Nothing here has a face. A generator drops ${TOONAMI} after its own
   <style> and ${FIREFLIES} before its script; toonami-all.mjs stamps the
   same block, between markers, onto every page that has neither. */

const h32 = (a, b, c) => { let x = (Math.imul(a, 73856093) ^ Math.imul(b, 19349663) ^ Math.imul(c, 83492791)) | 0; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return x >>> 0; };
const u = (a, b, c) => (h32(a, b, c) % 10000) / 10000;
const HUES = [['217,255,90', '#d9ff5a'], ['255,230,107', '#ffe66b'], ['182,255,122', '#b6ff7a'], ['255,243,160', '#fff3a0'], ['200,255,74', '#c8ff4a']];
const layer = (k, n) => Array.from({ length: n }, (_, i) => { const [rgb, hex] = HUES[h32(k, i, 1) % HUES.length], x = (u(k, i, 2) * 100).toFixed(1), y = (u(k, i, 3) * 100).toFixed(1), r = (1.2 + u(k, i, 4) * 1.4).toFixed(1); return `radial-gradient(${(+r * 7).toFixed(0)}px circle at ${x}% ${y}%, #fff 0, ${hex} ${r}px, rgba(${rgb},.28) ${(+r * 2.6).toFixed(1)}px, transparent ${(+r * 7).toFixed(0)}px)`; }).join(',');

export const TOONAMI = `<!--toonami--><style>
  :root{--void:#04050b;--panel:#0a0d1c;--panel2:#0f1430;--edge:#22307a;--ink:#e9f1ff;--dim:#8291c9;--gold:#ffd23f;--venus:#ff7a1a;--ok:#7dff9a;--bad:#ff4f6d;--sea:#3fd4ff;--magenta:#ff4fd8;--serif:"Bahnschrift","Eurostile","Rajdhani","Segoe UI",system-ui,sans-serif}
  html{background:#04050b}body{background:radial-gradient(1400px 700px at 50% -20%,#151b45 0%,#04050b 62%) fixed;color:var(--ink)}
  header h1,h1{text-transform:uppercase;letter-spacing:.1em;font-weight:700;color:#fff;text-shadow:0 0 10px var(--sea),0 0 34px rgba(63,212,255,.45)}
  header small,footer{color:var(--dim)}
  section,.stat,.board,.map,.clan,.pile,.region,.card{border-color:var(--edge);box-shadow:0 0 0 1px rgba(63,212,255,.07),inset 0 0 28px rgba(63,212,255,.05)}
  section h2{text-transform:uppercase;letter-spacing:.08em;font-size:14px}section h2 i,.clan h3 small,.stat i{text-transform:none;letter-spacing:0}
  .stat span,.pile b{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--sea)}
  button{border-color:#2a3a90;text-transform:uppercase;letter-spacing:.07em;font-size:11px;background:#0d1230;color:var(--ink)}button:hover:not(:disabled){border-color:var(--sea);box-shadow:0 0 12px rgba(63,212,255,.35)}
  button.primary{background:#2a1238;border-color:var(--magenta);box-shadow:0 0 12px rgba(255,79,216,.35)}
  .bar{background:#070a1a}.bar div,.bar{box-shadow:0 0 8px rgba(63,212,255,.35)}
  canvas#scene,canvas#board,canvas#map,canvas#sky,canvas#lane,canvas#street{box-shadow:0 0 0 1px #22307a,0 0 30px rgba(63,212,255,.12)}
  #toonami,#toonami i,#toonami b{position:fixed;pointer-events:none;display:block;margin:0;padding:0}#toonami{inset:0;z-index:0}
  #toonami i{inset:-8%;background-repeat:no-repeat;will-change:transform,opacity;animation:tn-drift-a 41s ease-in-out infinite,tn-blink-a 5.3s ease-in-out infinite}
  #toonami i:nth-child(1){background-image:${layer(11, 14)}}
  #toonami i:nth-child(2){background-image:${layer(23, 14)};animation:tn-drift-b 47s ease-in-out infinite,tn-blink-b 6.7s ease-in-out infinite 1.3s}
  #toonami i:nth-child(3){background-image:${layer(37, 12)};animation:tn-drift-c 53s ease-in-out infinite,tn-blink-a 4.3s ease-in-out infinite 2.1s}
  #toonami i:nth-child(4){background-image:${layer(41, 12)};animation:tn-drift-b 37s ease-in-out infinite reverse,tn-blink-b 7.9s ease-in-out infinite .7s}
  #toonami b{inset:0;z-index:3;background:radial-gradient(ellipse at center,transparent 55%,rgba(0,0,0,.5) 100%),repeating-linear-gradient(0deg,rgba(0,0,0,.2) 0 2px,transparent 2px 4px)}
  @keyframes tn-drift-a{0%{transform:translate3d(0,0,0)}50%{transform:translate3d(2.5%,-3%,0)}100%{transform:translate3d(0,0,0)}}
  @keyframes tn-drift-b{0%{transform:translate3d(0,0,0)}50%{transform:translate3d(-3%,2%,0)}100%{transform:translate3d(0,0,0)}}
  @keyframes tn-drift-c{0%{transform:translate3d(0,0,0)}33%{transform:translate3d(2%,2.5%,0)}66%{transform:translate3d(-1.5%,-2%,0)}100%{transform:translate3d(0,0,0)}}
  @keyframes tn-blink-a{0%,35%,100%{opacity:.22}45%{opacity:.95}55%{opacity:.3}}
  @keyframes tn-blink-b{0%,50%,100%{opacity:.25}62%{opacity:1}70%{opacity:.28}}
  #toonami em{position:fixed;left:14px;bottom:12px;z-index:4;pointer-events:none;font:700 13px/1 var(--serif);letter-spacing:.38em;color:var(--gold);text-shadow:0 0 10px rgba(255,210,63,.55);border:3px double #7a5a1e;padding:7px 6px 6px 12px;background:rgba(4,5,11,.72);font-style:normal}
  #toonami em small{display:block;font:400 9px/1.3 system-ui,sans-serif;letter-spacing:.14em;color:var(--dim);margin-top:5px;text-transform:uppercase}
  @media (prefers-reduced-motion:reduce){#toonami i{animation:none;opacity:.5}}
</style>`;

/* the fireflies, the scanlines and the ship's standard: four layers of light, one of glass, and SPQR in the corner of every deck. The yard is a ship now, the Hesperus, which is the evening star's name for Venus. No script, no faces */
export const FIREFLIES = `<div id="toonami" aria-hidden="true"><i></i><i></i><i></i><i></i><b></b><em>SPQR<small>the ship Hesperus &middot; the senate and the people of it</small></em></div><!--/toonami-->`;
export const BLOCK = TOONAMI + '\n' + FIREFLIES;

/* toonami.mjs — the look for the loop: a late-night broadcast block with fireflies.

   Black-indigo space, neon cyan and magenta on the edges, scanlines over
   everything, uppercase display type with a glow. And fireflies: slow warm
   yellow-green points that drift over the page and blink, drawn on a canvas
   behind the content. Nothing here has a face. A generator imports TOONAMI
   (a <style>) and FIREFLIES (a <script>) and drops them into its page. */

export const TOONAMI = `<style>
  :root{--void:#04050b;--panel:#0a0d1c;--panel2:#0f1430;--edge:#22307a;--ink:#e9f1ff;--dim:#8291c9;--gold:#ffd23f;--venus:#ff7a1a;--ok:#7dff9a;--bad:#ff4f6d;--sea:#3fd4ff;--magenta:#ff4fd8;--serif:"Bahnschrift","Eurostile","Rajdhani","Segoe UI",system-ui,sans-serif}
  html,body{background:var(--void)}body{background:radial-gradient(1400px 700px at 50% -20%,#151b45 0%,#04050b 62%) fixed}
  header h1{text-transform:uppercase;letter-spacing:.1em;font-weight:700;color:#fff;text-shadow:0 0 10px var(--sea),0 0 34px rgba(63,212,255,.45)}
  header small,footer{color:var(--dim)}header small b{color:var(--sea)}
  section,.stat,.board,.map,.clan,.pile,.region,.card{border-color:var(--edge);box-shadow:0 0 0 1px rgba(63,212,255,.07),inset 0 0 28px rgba(63,212,255,.05)}
  section h2,.stat span,.clan h3,.pile b,.stat b{color:var(--ink)}section h2{text-transform:uppercase;letter-spacing:.08em;font-size:14px}section h2 i,.clan h3 small,.stat i{text-transform:none;letter-spacing:0}
  .stat span,.pile b{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--sea)}
  button{border-color:#2a3a90;text-transform:uppercase;letter-spacing:.07em;font-size:11px;background:#0d1230}button:hover:not(:disabled){border-color:var(--sea);box-shadow:0 0 12px rgba(63,212,255,.35)}
  button.primary{background:#2a1238;border-color:var(--magenta);box-shadow:0 0 12px rgba(255,79,216,.35)}
  .bar div,.bar{box-shadow:0 0 8px rgba(63,212,255,.35)}.bar{background:#070a1a}.badge{border-color:#2a3a90}
  body::after{content:"";position:fixed;inset:0;pointer-events:none;z-index:3;background:repeating-linear-gradient(0deg,rgba(0,0,0,.22) 0 2px,transparent 2px 4px)}
  body::before{content:"";position:fixed;inset:0;pointer-events:none;z-index:3;background:radial-gradient(ellipse at center,transparent 55%,rgba(0,0,0,.55) 100%)}
  #fireflies{position:fixed;inset:0;z-index:0;pointer-events:none}header,main,footer,.tape,canvas#scene{position:relative;z-index:1}
  canvas#scene,canvas#board,canvas#map,canvas#sky,canvas#lane,canvas#street{box-shadow:0 0 0 1px #22307a,0 0 30px rgba(63,212,255,.12)}
</style>`;

export const FIREFLIES = `<canvas id="fireflies"></canvas>
<script>
(function () {
  const cv = document.getElementById('fireflies'), g = cv.getContext('2d'); let W = 0, H = 0;
  const HUES = ['#d9ff5a', '#ffe66b', '#b6ff7a', '#fff3a0', '#c8ff4a'];
  const N = 70, F = [];
  const spawn = f => { f.x = Math.random() * W; f.y = Math.random() * H; f.vx = (Math.random() - .5) * .25; f.vy = (Math.random() - .5) * .2; f.r = 1 + Math.random() * 1.6; f.c = HUES[Math.floor(Math.random() * HUES.length)]; f.ph = Math.random() * 7; f.sp = .4 + Math.random() * 1.2; f.t = Math.random() * 6; return f; };
  const size = () => { W = cv.width = innerWidth; H = cv.height = innerHeight; }; size(); addEventListener('resize', size);
  for (let i = 0; i < N; i++) F.push(spawn({}));
  let last = performance.now();
  function frame(now) { const dt = Math.min(50, now - last) / 16; last = now; g.clearRect(0, 0, W, H); g.globalCompositeOperation = 'lighter';
    for (const f of F) { f.t += dt * .01; f.vx += Math.sin(f.t * 3.1 + f.ph) * .01 * dt; f.vy += Math.cos(f.t * 2.3 + f.ph) * .008 * dt; f.vx *= .995; f.vy *= .995; f.x += f.vx * dt; f.y += f.vy * dt;
      if (f.x < -20 || f.x > W + 20 || f.y < -20 || f.y > H + 20) spawn(f);
      /* fireflies blink: a slow pulse with a sharp bright phase, never fully dark */
      const p = Math.sin(now / 1000 * f.sp + f.ph); const a = .08 + Math.max(0, p) ** 3 * .85;
      const glow = g.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * 9); glow.addColorStop(0, f.c); glow.addColorStop(.25, f.c + 'aa'); glow.addColorStop(1, 'rgba(0,0,0,0)');
      g.globalAlpha = a * .55; g.fillStyle = glow; g.beginPath(); g.arc(f.x, f.y, f.r * 9, 0, 7); g.fill();
      g.globalAlpha = a; g.fillStyle = '#ffffff'; g.beginPath(); g.arc(f.x, f.y, f.r * .7, 0, 7); g.fill(); }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; requestAnimationFrame(frame); }
  requestAnimationFrame(frame);
})();
</script>`;

/* ═══════════════════════════════════════════════════════════════════════════
   iso.js — an isometric painter that knows nothing about buildings.

   It executes PARTS. What a building is lives in templates-build/*.json and is
   compiled by builds.mjs into window.BUILDS; this file draws whatever it is
   handed, sorted back to front, with one sun from the upper left and three
   tones a surface.

   Which is the point: adding a building is writing JSON. There is no case
   statement here with twelve arms in it, and there is nowhere to put one.
   ═══════════════════════════════════════════════════════════════════════════ */

const TW = 26, TH = 13, TZ = 15;
const TOP = 1.18, LEFT = .70, RIGHT = .45;
const P = (x, y, z) => [(x - y) * TW, (x + y) * TH - z * TZ];

function tone(c, k, a) {
  const [r, g, b] = c.match(/\d+/g).map(Number);
  const f = v => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgba(${f(r)},${f(g)},${f(b)},${a === undefined ? 1 : a})`;
}
function poly(g, pts, fill, stroke) {
  g.beginPath();
  pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y));
  g.closePath();
  g.fillStyle = fill; g.fill();
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = 1; g.stroke(); }
}

/* ── the shapes. one function per `s` value, and that is the whole vocabulary */
const S = {
  box(g, p, c) {
    const [x, y, z] = p.at, [dx, dy, dz] = p.size, e = tone(c, .26, .5);
    const A = P(x, y, z + dz), B = P(x + dx, y, z + dz),
          C = P(x + dx, y + dy, z + dz), D = P(x, y + dy, z + dz),
          a = P(x, y + dy, z), b = P(x + dx, y + dy, z), q = P(x + dx, y, z);
    poly(g, [D, C, b, a], tone(c, LEFT), e);
    poly(g, [C, B, q, b], tone(c, RIGHT), e);
    poly(g, [A, B, C, D], tone(c, p.lid || TOP), e);
    for (let i = 0; i < (p.win || 0); i++) {
      const w = P(x, y + dy * ((i + 1) / (p.win + 1)), z + dz * .55);
      g.fillStyle = 'rgba(255,214,150,.78)';
      g.fillRect(w[0] - 1.6, w[1] - 3.4, 3.2, 4.6);
    }
    if (p.glow) {
      const m = P(x + dx / 2, y + dy / 2, z + dz), [r, gg, b2] = p.glow;
      const gr = g.createRadialGradient(m[0], m[1], 0, m[0], m[1], 26);
      gr.addColorStop(0, `rgba(${r},${gg},${b2},.42)`);
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(m[0], m[1], 26, 0, 7); g.fill();
    }
    if (p.smoke) {
      const m = P(x + dx / 2, y + dy / 2, z + dz);
      const gr = g.createRadialGradient(m[0], m[1] - 12, 0, m[0], m[1] - 12, 17);
      gr.addColorStop(0, 'rgba(222,214,204,.22)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(m[0], m[1] - 12, 17, 0, 7); g.fill();
    }
  },
  roof(g, p, c) {
    const [x, y, z] = p.at, [dx, dy, dz] = p.size, e = tone(c, .24, .55);
    const mx = x + dx / 2, r0 = P(mx, y, z + dz), r1 = P(mx, y + dy, z + dz);
    const A = P(x, y, z), B = P(x + dx, y, z),
          C = P(x + dx, y + dy, z), D = P(x, y + dy, z);
    poly(g, [D, r1, r0, A], tone(c, LEFT + .16), e);
    poly(g, [r1, C, B, r0], tone(c, RIGHT + .04), e);
    poly(g, [A, r0, B], tone(c, .30), e);
    if (p.ridge) {
      g.strokeStyle = tone(c, 1.5, .8); g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(r0[0], r0[1] - 2); g.lineTo(r1[0], r1[1] - 2); g.stroke();
      g.beginPath();
      g.moveTo(r0[0], r0[1]); g.lineTo(r0[0] - 5, r0[1] - 7);
      g.moveTo(r1[0], r1[1]); g.lineTo(r1[0] + 5, r1[1] - 7);
      g.stroke();
    }
  },
  cyl(g, p, c) {
    const [x, y, z] = p.at, rx = p.r * TW, ry = p.r * TH;
    const c0 = P(x, y, z), c1 = P(x, y, z + p.h), e = tone(c, .26, .5);
    g.beginPath();
    g.moveTo(c0[0] - rx, c0[1]); g.lineTo(c1[0] - rx, c1[1]);
    g.ellipse(c1[0], c1[1], rx, ry, 0, Math.PI, 0, true);
    g.lineTo(c0[0] + rx, c0[1]);
    g.ellipse(c0[0], c0[1], rx, ry, 0, 0, Math.PI, false);
    g.closePath();
    const lg = g.createLinearGradient(c0[0] - rx, 0, c0[0] + rx, 0);
    lg.addColorStop(0, tone(c, LEFT + .08));
    lg.addColorStop(.42, tone(c, TOP - .12));
    lg.addColorStop(1, tone(c, RIGHT));
    g.fillStyle = lg; g.fill(); g.strokeStyle = e; g.stroke();
    g.beginPath(); g.ellipse(c1[0], c1[1], rx, ry, 0, 0, 7);
    g.fillStyle = tone(c, p.lid || TOP); g.fill(); g.stroke();
  },
  cone(g, p, c) {
    const [x, y, z] = p.at, rx = p.r * TW, ry = p.r * TH;
    const b = P(x, y, z), t = P(x, y, z + p.h);
    g.beginPath();
    g.moveTo(b[0] - rx, b[1]); g.lineTo(t[0], t[1]); g.lineTo(b[0] + rx, b[1]);
    g.ellipse(b[0], b[1], rx, ry, 0, 0, Math.PI, false);
    g.closePath();
    const lg = g.createLinearGradient(b[0] - rx, 0, b[0] + rx, 0);
    lg.addColorStop(0, tone(c, LEFT + .14));
    lg.addColorStop(.45, tone(c, TOP));
    lg.addColorStop(1, tone(c, RIGHT));
    g.fillStyle = lg; g.fill(); g.strokeStyle = tone(c, .26, .5); g.stroke();
  },
  row(g, p, c) {                     /* a colonnade along y */
    const [x, y, z] = p.at;
    for (let i = 0; i < p.n; i++)
      S.cyl(g, { at: [x, y + (i * p.span) / (p.n - 1 || 1), z], r: .11, h: p.h }, c);
  },
  merlons(g, p, c) {
    const [x, y, z] = p.at, s = p.r, step = (s * 2) / p.n;
    const put = (bx, by, bdx, bdy) =>
      S.box(g, { at: [bx, by, z], size: [bdx, bdy, .24], lid: TOP + .1 }, c);
    for (let i = 0; i < p.n; i++) {
      put(x - s + i * step, y - s, step * .55, .22);
      put(x - s + i * step, y + s - .22, step * .55, .22);
    }
    for (let i = 1; i < p.n - 1; i++) {
      put(x - s, y - s + i * step, .22, step * .55);
      put(x + s - .22, y - s + i * step, .22, step * .55);
    }
  },
  flag(g, p, c) {
    const [x, y, z] = p.at, a = P(x, y, z), b = P(x, y, z + p.h);
    g.strokeStyle = tone(c, .45); g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
    g.beginPath();
    g.moveTo(b[0], b[1] + 1); g.lineTo(b[0] + 10, b[1] + 4);
    g.lineTo(b[0] + 10, b[1] + 18); g.lineTo(b[0] + 5, b[1] + 14);
    g.lineTo(b[0], b[1] + 15);
    g.closePath();
    g.fillStyle = tone(c, 1.12, .95); g.fill();
    g.strokeStyle = tone(c, .5); g.lineWidth = 1; g.stroke();
  },
  grove(g, p, c) {                   /* phyllotaxis: adding one moves none */
    const [ox, oy, oz] = p.at;
    for (let i = 0; i < p.n; i++) {
      const a = i * 2.399, r = .18 + .78 * Math.sqrt(i / p.n);
      const x = ox + Math.cos(a) * r, y = oy + Math.sin(a) * r;
      const h = .34 + .5 * ((i * 37 % 11) / 11);
      S.cyl(g, { at: [x, y, oz], r: .07, h: h * .55 }, tone(c, .55).replace(/rgba|,1\)/g, m => m === 'rgba' ? 'rgb' : ')'));
      S.cone(g, { at: [x, y, oz + h * .55], r: .3 + h * .22, h: h * 1.05 }, c);
    }
  },
  flock(g, p, c) {                   /* birds. small, many, and not identical */
    const [ox, oy, oz] = p.at;
    const pink = p.kind === 'flamingo';
    const body = pink ? 'rgb(232,148,168)' : 'rgb(64,142,150)';
    for (let i = 0; i < p.n; i++) {
      const a = i * 2.399 + (pink ? 0 : 1.2), r = .2 + .72 * Math.sqrt(i / p.n);
      const x = ox + Math.cos(a) * r, y = oy + Math.sin(a) * r;
      const q = P(x, y, oz);
      g.fillStyle = body;
      g.beginPath(); g.ellipse(q[0], q[1] - 5, 3.2, 2.2, 0, 0, 7); g.fill();
      g.strokeStyle = body; g.lineWidth = 1.3;
      g.beginPath(); g.moveTo(q[0], q[1] - 3); g.lineTo(q[0] + .6, q[1]); g.stroke();
      g.beginPath();                       /* neck */
      g.moveTo(q[0] + 1, q[1] - 6);
      g.quadraticCurveTo(q[0] + 4, q[1] - 11, q[0] + 2, q[1] - 13);
      g.stroke();
      if (!pink) {                         /* a tail, which is the whole bird */
        g.fillStyle = 'rgba(64,142,150,.5)';
        g.beginPath(); g.ellipse(q[0] - 4, q[1] - 6, 4.5, 3, -.4, 0, 7); g.fill();
      }
    }
  },
  fence(g, p, c) {
    const [ox, oy, oz] = p.at, s = p.r;
    for (let i = 0; i <= p.n; i++) {
      const t = -s + (2 * s * i) / p.n;
      [[t, -s], [t, s], [-s, t], [s, t]].forEach(([x, y]) =>
        S.cyl(g, { at: [ox + x, oy + y, oz], r: .045, h: .3 }, c));
    }
  },
  dog(g, p, c) {
    const [x, y, z] = p.at, q = P(x, y, z);
    g.fillStyle = 'rgb(78,66,54)';
    g.beginPath(); g.ellipse(q[0], q[1] - 5, 4.4, 2.6, 0, 0, 7); g.fill();
    g.beginPath(); g.ellipse(q[0] + 4, q[1] - 8, 2.4, 2.0, 0, 0, 7); g.fill();
    g.strokeStyle = 'rgb(78,66,54)'; g.lineWidth = 1.4;
    g.beginPath(); g.moveTo(q[0] - 4, q[1] - 5); g.lineTo(q[0] - 8, q[1] - 9); g.stroke();
  },
  seal(g, p, c) {
    const m = P(...p.at);
    g.strokeStyle = tone(c, 1.55, .9); g.lineWidth = 2.6;
    g.beginPath(); g.ellipse(m[0] + 6, m[1] - 3, p.r, p.r + 1, 0, 0, 7); g.stroke();
  }
};

/* ── depth key. back to front, and parts inside a building keep their order. */
function draw(g, parts, col, tier) {
  const live = parts.filter(p => (p.from || 1) <= tier && (p.upto || 4) >= tier);
  live.map((p, i) => ({ p, k: p.at[0] + p.at[1] + p.at[2] * .5 + i * 1e-4 }))
      .sort((a, b) => a.k - b.k)
      .forEach(({ p }) => (S[p.s] || S.box)(g, p, col));
}

function deck(g, x0, y0, x1, y1, ground) {
  const A = P(x0, y0, 0), B = P(x1, y0, 0), C = P(x1, y1, 0), D = P(x0, y1, 0);
  poly(g, [D, C, [C[0], C[1] + 10], [D[0], D[1] + 10]], ground.lipL);
  poly(g, [C, B, [B[0], B[1] + 10], [C[0], C[1] + 10]], ground.lipR);
  const gr = g.createLinearGradient(A[0], A[1], C[0], C[1]);
  gr.addColorStop(0, ground.deckA); gr.addColorStop(1, ground.deckB);
  poly(g, [A, B, C, D], gr, ground.edge);
}

function fit(cv) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = cv.clientWidth, H = cv.clientHeight;
  cv.width = W * dpr; cv.height = H * dpr;
  const g = cv.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, W, H);
  return { g, W, H };
}

/* one building, alone, for the progression strip */
function drawOne(cv, kind, col, tier, ground) {
  const { g, W, H } = fit(cv);
  const B = (window.BUILDS || {})[kind];
  g.save(); g.translate(W / 2, H * .76);
  deck(g, -2.2, -2.2, 2.2, 2.2, ground);
  const c = P(0, 0, 0);
  const sh = g.createRadialGradient(c[0], c[1], 0, c[0], c[1], 1.5 * TW);
  sh.addColorStop(0, 'rgba(0,0,0,.4)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = sh;
  g.beginPath(); g.ellipse(c[0], c[1], 1.5 * TW, 1.5 * TH * 1.4, 0, 0, 7); g.fill();
  if (B) { const k = B.grow[tier - 1]; g.scale(.92 * k, .92 * k); draw(g, B.parts, col, tier); }
  g.restore();
}

/* a whole plate */
function drawPlate(cv, tpl, ground, tierOf) {
  const { g, W, H } = fit(cv);
  const cols = tpl.cols, rows = Math.ceil(tpl.sectors.length / cols);
  g.save(); g.translate(W / 2, H / 2 + (rows * TH) / 2 - 30);
  const pad = 1.2;
  deck(g, -(cols - 1) / 2 - pad, -(rows - 1) / 2 - pad,
          (cols - 1) / 2 + pad, (rows - 1) / 2 + pad, ground);

  const cells = tpl.sectors.map((s, i) => ({
    s, gx: (i % cols) - (cols - 1) / 2, gy: Math.floor(i / cols) - (rows - 1) / 2,
    t: tierOf ? tierOf(s, i) : 2
  }));
  cells.sort((a, b) => (a.gx + a.gy) - (b.gx + b.gy)).forEach(({ s, gx, gy, t }) => {
    const B = (window.BUILDS || {})[s.k];
    g.save(); g.translate(...P(gx, gy, 0));
    const c = P(0, 0, 0);
    const sh = g.createRadialGradient(c[0], c[1], 0, c[0], c[1], 1.05 * TW);
    sh.addColorStop(0, 'rgba(0,0,0,.38)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = sh;
    g.beginPath(); g.ellipse(c[0], c[1], 1.05 * TW, 1.05 * TH * 1.4, 0, 0, 7); g.fill();
    if (B) { const k = .58 * B.grow[t - 1]; g.scale(k, k); draw(g, B.parts, s.col, t); }
    g.restore();
  });
  g.restore();
}

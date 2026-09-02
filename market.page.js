/* market.page.js — the script for market.html. Inlined by market.mjs after the syndicate function. */
(function () {
  const D = JSON.parse(document.getElementById('def-json').textContent); const F = D.farms;
  const $ = s => document.querySelector(s); const fmt = n => Math.round(n).toLocaleString('en-US'); const money = n => (n >= 100 ? fmt(n) : n.toFixed(2)) + ' HEZE';
  const CAP = 21000000, DKEY = 'descent.v1', KEY = 'market.v1';
  const read = (k, d) => { try { return Object.assign(d, JSON.parse(localStorage.getItem(k) || 'null') || {}); } catch (e) { return d; } };
  let Dk = read(DKEY, { heze: 0, issued: 0, ledger: [] });
  const saveD = () => { Dk.saved = Date.now(); localStorage.setItem(DKEY, JSON.stringify(Dk)); };
  const credit = (amt, line) => { const a = Math.min(amt, Math.max(0, CAP - Dk.issued)); if (a <= 0) return 0; Dk.heze += a; Dk.issued += a; Dk.ledger.unshift({ t: Date.now(), line: 'Market: ' + line, amt: a }); Dk.ledger.length = Math.min(Dk.ledger.length, 300); return a; };
  const debit = (amt, line) => { if (Dk.heze < amt) return false; Dk.heze -= amt; Dk.ledger.unshift({ t: Date.now(), line: 'Market: ' + line, amt: -amt }); return true; };
  let S = read(KEY, { day: 0, degree: 3, seed: D.seed, held: [], grant: false, log: [], paid: 0, saved: Date.now() });
  const note = m => { S.log.unshift({ t: Math.floor(S.day), m }); S.log.length = Math.min(S.log.length, 40); };
  const save = () => { S.saved = Date.now(); localStorage.setItem(KEY, JSON.stringify(S)); saveD(); };
  if (!S.grant) { S.grant = true; credit(50000, 'a seat on the market, against the cap'); note('Four farms, syndicated. Slide the degree and watch the board stop being tickers and start being weather.'); }
  const away = Math.min((Date.now() - S.saved) / 1000, 8 * 3600); if (away > 5) S.day += away;

  /* ---- the syndication as arithmetic: any ticker at any degree, in O(degree) ---- */
  const h32 = (a, b, c) => { let x = (Math.imul(a, 73856093) ^ Math.imul(b, 19349663) ^ Math.imul(c, 83492791)) | 0; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return x >>> 0; };
  const u = (a, b, c) => (h32(a, b, c) % 100000) / 100000;
  const smooth = t => t * t * (3 - 2 * t);
  const keyOf = (fi, path) => path.reduce((a, c) => a * 4 + c + 1, fi + 1);
  function weight(fi, path) { let w = 1, k = fi + 1; for (let d = 1; d <= path.length; d++) { k = k * 4 + path[d - 1] + 1; w *= 0.7 + 0.6 * (h32(S.seed, k, d) % 1000) / 1000; } return w; }
  function drift(fi, path, day) { const f = F[fi], key = keyOf(fi, path), d = path.length, P = f.period * 2, t = day / P, i = Math.floor(t), a = u(S.seed + 7, key, i) - 0.5, b = u(S.seed + 7, key, i + 1) - 0.5; return Math.exp((a + (b - a) * smooth(t - i)) * 0.35 * (1 + d * 0.35)); }
  const price = (fi, path, day) => F[fi].price * weight(fi, path) / 4 ** path.length * drift(fi, path, day);
  const pathOf = (x, y, d) => { const p = []; for (let k = d - 1; k >= 0; k--) p.push(((x >> k) & 1) | (((y >> k) & 1) << 1)); return p; };
  const idOf = (fi, path) => F[fi].ticker + (path.length ? '.' + path.join('') : '');

  /* ---- the board: a quadtree of four farms, drawn as pixels, one ticker per cell ---- */
  const cv = $('#board'), g = cv.getContext('2d'); let W = new Float32Array(0), wDeg = -1, wSeed = -1;
  const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  function weights(d) { if (wDeg === d && wSeed === S.seed) return; const n = 1 << d; W = new Float32Array(4 * n * n); for (let fi = 0; fi < 4; fi++) for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) W[fi * n * n + y * n + x] = weight(fi, pathOf(x, y, d)); wDeg = d; wSeed = S.seed; }
  function draw() { const d = S.degree, n = 1 << d, side = 2 * n; weights(d); const img = g.createImageData(side, side), px = img.data, day = S.day, prev = day - 1;
    for (let fi = 0; fi < 4; fi++) { const [r0, g0, b0] = hex(F[fi].hue), ox = (fi & 1) * n, oy = (fi >> 1) * n; for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const p = pathOf(x, y, d), now = drift(fi, p, day), was = drift(fi, p, prev), ch = (now - was) / was, w = W[fi * n * n + y * n + x]; const l = 0.35 + 0.5 * (w - 0.7) / 0.6 + Math.max(-0.3, Math.min(0.3, ch * 12)); const i = 4 * ((oy + y) * side + ox + x); px[i] = r0 * l; px[i + 1] = g0 * l; px[i + 2] = b0 * l; px[i + 3] = 255; } }
    const out = d <= 3 ? 1024 : side; cv.width = out; cv.height = out; g.imageSmoothingEnabled = false;
    if (out === side) g.putImageData(img, 0, 0); else { const tmp = document.createElement('canvas'); tmp.width = side; tmp.height = side; tmp.getContext('2d').putImageData(img, 0, 0); g.drawImage(tmp, 0, 0, out, out); }
    if (d <= 3) { const cell = out / side; g.font = `${Math.max(8, Math.min(16, cell / 4))}px system-ui`; g.fillStyle = 'rgba(10,12,16,.85)'; g.textAlign = 'center'; for (let fi = 0; fi < 4; fi++) for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) g.fillText(idOf(fi, pathOf(x, y, d)), ((fi & 1) * n + x + 0.5) * cell, ((fi >> 1) * n + y + 0.5) * cell + 4);
      g.strokeStyle = 'rgba(0,0,0,.35)'; for (let k = 0; k <= side; k++) { g.beginPath(); g.moveTo(k * cell, 0); g.lineTo(k * cell, out); g.moveTo(0, k * cell); g.lineTo(out, k * cell); g.stroke(); } } }
  const REGIMES = ['<b>Degree 0, four tickers.</b> Four farms, four cells, four names. A list would do.', '<b>Degree 1, sixteen.</b> Each farm in four tranches. Still a table.', '<b>Degree 2, sixty-four.</b> The board is a board now; every cell keeps its name.', '<b>Degree 3, 256.</b> The last degree where a ticker carries a name. Read it while you can.', '<b>Degree 4, 1,024.</b> The names are gone; the cells remain. You can still point at one and mean it.', '<b>Degree 5, 4,096. This is where complexity becomes visual.</b> No cell is a thing any more; the board is a texture, and the eye stops reading tickers and starts reading weather. Everything after this is more of the same, smaller.', '<b>Degree 6, 16,384.</b> Texture with grain. Farms are the only shapes left.', '<b>Degree 7, 65,536.</b> Grain. Motion reads as shimmer.', '<b>Degree 8, 262,144.</b> Four pixels a ticker. The syndication has out-run the screen.', '<b>Degree 9, 1,048,576.</b> One ticker per pixel on a 1024-pixel board. This is the ninth degree: the board is exactly as complex as the display can be, and no more complex than it was at the fifth.'];
  function regime() { const d = S.degree, n = 1 << d; $('#degN').textContent = d; $('#degCount').textContent = `${fmt(4 * n * n)} tickers · ${fmt(n * n)} a farm · ${(1024 / (2 * n)).toFixed(1)} px a cell`; $('#regime').innerHTML = REGIMES[d]; }

  /* ---- picking, holding, dividends ---- */
  let pick = null;
  cv.onclick = e => { const r = cv.getBoundingClientRect(), d = S.degree, n = 1 << d, X = Math.floor((e.clientX - r.left) / r.width * 2 * n), Y = Math.floor((e.clientY - r.top) / r.height * 2 * n); const fi = (X >= n ? 1 : 0) + (Y >= n ? 2 : 0); pick = { fi, path: pathOf(X % n, Y % n, d) }; render(); };
  const have = id => S.held.find(h => h.id === id);
  function buy(qty) { if (!pick) return; const p = price(pick.fi, pick.path, S.day), cost = p * qty, id = idOf(pick.fi, pick.path); if (!debit(cost, `bought ${qty} × ${id}`)) { note(`Not enough on the docket for ${qty} × ${id}.`); render(); return; } let h = have(id); if (!h) { h = { id, fi: pick.fi, path: pick.path, qty: 0, paid: 0 }; S.held.push(h); } h.qty += qty; h.paid += cost; note(`Bought ${qty} × ${id} at ${money(p)}.`); save(); render(); }
  function sell(h) { const p = price(h.fi, h.path, S.day); credit(p * h.qty, `sold ${h.qty} × ${h.id}`); note(`Sold ${h.qty} × ${h.id} at ${money(p)}.`); S.held = S.held.filter(x => x !== h); save(); render(); }
  function step(dt) { const d0 = Math.floor(S.day); S.day += dt; const d1 = Math.floor(S.day); if (d1 === d0) return; for (const h of S.held) { const f = F[h.fi]; if (d1 % f.period === 0) { const div = h.qty * f.price * 0.02 / 4 ** h.path.length; credit(div, `dividend, ${h.id}`); S.paid += div; } } }

  function render() { const val = S.held.reduce((a, h) => a + h.qty * price(h.fi, h.path, S.day), 0), paid = S.held.reduce((a, h) => a + h.paid, 0);
    $('#docket').innerHTML = [['HEZE on the docket', fmt(Dk.heze)], ['holdings, at the price', money(val)], ['holdings, at cost', money(paid)], ['dividends paid', money(S.paid)], ['day', Math.floor(S.day)]].map(([k, v]) => `<div class="stat"><span>${k}</span><b>${v}</b></div>`).join('');
    if (pick) { const id = idOf(pick.fi, pick.path), p = price(pick.fi, pick.path, S.day), was = price(pick.fi, pick.path, S.day - 1), ch = (p - was) / was * 100, f = F[pick.fi]; $('#pick').innerHTML = `<div class="stat"><span>ticker</span><b>${id}</b></div><div class="stat"><span>farm</span><b>${f.name}</b></div><div class="stat"><span>degree</span><b>${pick.path.length}</b></div><div class="stat"><span>price</span><b>${money(p)} <span class="${ch >= 0 ? 'up' : 'dn'}">${ch >= 0 ? '+' : ''}${ch.toFixed(2)}%</span></b></div><div class="stat"><span>weight</span><b>${weight(pick.fi, pick.path).toFixed(3)}</b></div><div class="row" style="margin-top:6px"><button id="b1">Buy 1</button><button id="b10">Buy 10</button><button id="b100">Buy 100</button></div>`; $('#b1').onclick = () => buy(1); $('#b10').onclick = () => buy(10); $('#b100').onclick = () => buy(100); } else $('#pick').innerHTML = '<p style="color:var(--dim);margin:0">Nothing picked. Click a cell.</p>';
    $('#holdings').innerHTML = S.held.length ? S.held.map((h, i) => { const p = price(h.fi, h.path, S.day), gain = h.qty * p - h.paid; return `<div class="hold"><b>${h.id}</b><span class="v">${h.qty} × ${money(p)}</span><button data-i="${i}">Sell</button><small>${money(h.qty * p)} · cost ${money(h.paid)} · <span class="${gain >= 0 ? 'up' : 'dn'}">${(gain >= 0 ? '+' : '') + fmt(gain)}</span></small></div>`; }).join('') : '<p style="color:var(--dim);margin:0">No holdings. A portfolio of individual tranches, not one farm.</p>';
    $('#holdings').querySelectorAll('button').forEach(b => b.onclick = () => sell(S.held[+b.dataset.i]));
    $('#log').innerHTML = S.log.map(l => `<div><b>d${l.t}</b> ${l.m}</div>`).join(''); $('#clock').textContent = `day ${Math.floor(S.day)} · seed ${S.seed}`;
    const d = Math.min(S.degree, 4), n = 1 << d; $('#tape').innerHTML = Array.from({ length: 14 }, (_, i) => { const k = h32(Math.floor(S.day / 5), i, 3), fi = k % 4, x = (k >> 2) % n, y = (k >> 12) % n, p = pathOf(x, y, d), now = price(fi, p, S.day), was = price(fi, p, S.day - 1), ch = (now - was) / was * 100; return `<span><b>${idOf(fi, p)}</b> ${money(now)} <i class="${ch >= 0 ? 'up' : 'dn'}">${ch >= 0 ? '+' : ''}${ch.toFixed(2)}%</i></span>`; }).join(''); }
  $('#degree').value = S.degree; $('#degree').oninput = e => { S.degree = +e.target.value; pick = null; regime(); draw(); render(); save(); };
  $('#reweave').onclick = () => { S.seed = +$('#seed').value || D.seed; wDeg = -1; note(`Re-syndicated with seed ${S.seed}.`); regime(); draw(); render(); save(); };
  $('#download').onclick = () => { const all = syndicate(F, 4, S.seed); const bundle = { seed: S.seed, wovenBy: 'market.html', count: all.length, files: Object.fromEntries(all.map(t => ['templates-ticker/' + t.id + '.json', t])) }; const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(bundle, null, 1)], { type: 'application/json' })); a.download = `templates-ticker-seed-${S.seed}.json`; document.body.append(a); a.click(); a.remove(); };
  regime(); draw(); render(); setInterval(() => { step(1); if (S.degree < 8 || Math.floor(S.day) % 4 === 0) draw(); render(); }, 1000); setInterval(save, 5000); addEventListener('beforeunload', save);
})();

/* continent.page.js — the script for continent.html. Inlined by continent.mjs after the weave function. */
(function () {
  const D = JSON.parse(document.getElementById('def-json').textContent), N = D.N;
  /* the rules: embedded from templates-rules/continent.json at build, and overridden by a rulebook kept in this browser through the editor in the quarter */
  const RULES = (() => { let o = {}; try { o = (JSON.parse(localStorage.getItem('custom.v1') || 'null') || {})['templates-rules/continent.json'] || {}; } catch (e) {} return Object.assign({}, D.rules, o.rules || o); })();
  const $ = s => document.querySelector(s); const fmt = n => Math.round(n).toLocaleString('en-US');
  const CAP = RULES.cap, DKEY = 'descent.v1', CKEY = 'clans.v1', KEY = 'continent.v1';
  const read = (k, d) => { try { return Object.assign(d, JSON.parse(localStorage.getItem(k) || 'null') || {}); } catch (e) { return d; } };
  let Dk = read(DKEY, { heze: 0, issued: 0, ledger: [] });
  const credit = (amt, line) => { const a = Math.min(amt, Math.max(0, CAP - Dk.issued)); if (a <= 0) return 0; Dk.heze += a; Dk.issued += a; Dk.ledger.unshift({ t: Date.now(), line: 'Continent: ' + line, amt: a }); Dk.ledger.length = Math.min(Dk.ledger.length, 300); return a; };
  /* the clans' piles: read, drawn down, written back; never invented here */
  /* re-read before every draw so an open clans tab is never clobbered; write back only when something was actually drawn */
  let C = null, dirty = false; const reload = () => { if (dirty) savePiles(); const raw = localStorage.getItem(CKEY); C = raw ? JSON.parse(raw) : null; return (C && C.piles) || {}; };
  const piles = () => (C && C.piles) || {};
  const savePiles = () => { if (C && dirty) { localStorage.setItem(CKEY, JSON.stringify(C)); dirty = false; } }; reload();
  let S = read(KEY, { day: 0, seed: D.seed, cells: null, produced: 0, sown: 0, spread: 0, log: [], saved: Date.now() });
  let W = weave(D.clans, D.piles, S.seed, N); let P = W.parcels; const idx = (x, y) => y * N + x;
  if (!S.cells || S.cells.length !== N * N) S.cells = new Array(N * N).fill(0); /* 0 bare · 1 sown (grows on the period) · 2 grown */
  const note = m => { S.log.unshift({ t: Math.floor(S.day), m }); S.log.length = Math.min(S.log.length, 50); };
  const save = () => { S.saved = Date.now(); localStorage.setItem(KEY, JSON.stringify(S)); localStorage.setItem(DKEY, JSON.stringify(Dk)); savePiles(); };
  if (!S.log.length) note('Aphrodite Terra, bare. Six regions, one clan each. Sow a parcel and the piles do the rest, on the periods.');

  function step(dt, quiet) { const d0 = Math.floor(S.day); S.day += dt; const d1 = Math.floor(S.day); if (d1 === d0) return; const pl = reload();
    for (const c of D.clans) { if (d1 % c.period !== 0) continue; let grew = 0, spread = 0, yielded = 0, dry = false; const next = [];
      for (let i = 0; i < P.length; i++) { const p = P[i]; if (p.clan !== c.id) continue;
        if (S.cells[i] === 1) { S.cells[i] = 2; grew++; }
        else if (S.cells[i] === 2) { yielded += p.yield;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = p.x + dx, y = p.y + dy; if (x < 0 || y < 0 || x >= N || y >= N) continue; const j = idx(x, y), q = P[j]; if (S.cells[j] === 0 && q.clan === c.id && q.fertility > 0) next.push(j); } } }
      for (const j of next) { if (S.cells[j] !== 0) continue; if ((pl[c.resource] || 0) < RULES.spreadCost) { dry = true; break; } pl[c.resource] -= RULES.spreadCost; dirty = true; S.cells[j] = 1; spread++; }
      S.produced += yielded; S.producedBy = S.producedBy || {}; S.producedBy[c.id] = (S.producedBy[c.id] || 0) + yielded; S.spread += spread; if (!quiet && (grew || spread || dry)) note(`${c.name}, day ${d1}: ${grew ? grew + ' grew, ' : ''}${spread ? spread + ' spread, ' : ''}${yielded ? fmt(yielded) + ' provision' : ''}${dry ? ' — the ' + c.resource + ' pile is dry; the spread stopped' : ''}.`); }
  }
  /* provision goes up to the village as grain; the village records what it has drawn, and the continent reads that back rather than writing anything of the village's */
  const drawnUp = () => { try { return (JSON.parse(localStorage.getItem('village.v1') || 'null') || {}).drawnContinent || 0; } catch (e) { return 0; } };
  const away = Math.min((Date.now() - S.saved) / 1000, RULES.awayHours * 3600); if (away > 5) { let left = away; while (left > 0) { const d = Math.min(1, left); step(d, true); left -= d; } note(`Away ${Math.round(away / 60)} min: the periods fired, the continent spread as far as the piles allowed.`); }

  const cv = $('#map'), g = cv.getContext('2d');
  const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  function draw() { const img = g.createImageData(N, N), px = img.data; for (let i = 0; i < P.length; i++) { const p = P[i], s = S.cells[i]; let r, gg, b; if (p.terrain === 'lava') [r, gg, b] = [40, 22, 18]; else { const [hr, hg, hb] = hex(D.hues[p.clan] || '#888'); const l = s === 2 ? 1 : s === 1 ? 0.55 : 0.16 + 0.1 * p.fertility; [r, gg, b] = [hr * l, hg * l, hb * l]; if (p.terrain === 'tessera' && s === 0) { r += 18; gg += 14; b += 10; } } const k = 4 * i; px[k] = r; px[k + 1] = gg; px[k + 2] = b; px[k + 3] = 255; } g.putImageData(img, 0, 0); }
  let pick = null;
  cv.onclick = e => { const r = cv.getBoundingClientRect(); const x = Math.floor((e.clientX - r.left) / r.width * N), y = Math.floor((e.clientY - r.top) / r.height * N); pick = idx(x, y); render(); };
  function sow(i) { const p = P[i], pl = reload(); if (S.cells[i] !== 0 || p.fertility === 0) return; if (!C) { note('No piles to sow from. Gather in the war of clans first.'); render(); return; } if ((pl[p.resource] || 0) < RULES.sowCost) { note(`The ${p.resource} pile has less than ${RULES.sowCost}; nothing to sow ${p.id} with.`); render(); return; } pl[p.resource] -= RULES.sowCost; dirty = true; S.cells[i] = 1; S.sown++; note(`Sowed ${p.id} in ${p.region} from the ${p.resource} pile. It grows on day ${Math.ceil((Math.floor(S.day) + 1) / p.period) * p.period}.`); save(); render(); }
  function render() { draw(); const grown = S.cells.filter(s => s === 2).length, sown = S.cells.filter(s => s === 1).length, arable = P.filter(p => p.fertility > 0).length;
    $('#stats').innerHTML = [['grown', `${fmt(grown)} / ${fmt(arable)} arable`], ['sown, not yet grown', fmt(sown)], ['coverage', (100 * grown / arable).toFixed(1) + '%'], ['provision produced', fmt(S.produced)], ['drawn up by the village', fmt(Math.min(S.produced, drawnUp()))], ['provision in hand', fmt(Math.max(0, S.produced - drawnUp()))], ['spread by propagation', fmt(S.spread)], ['sown by hand', fmt(S.sown)], ['day', Math.floor(S.day)]].map(([k, v]) => `<div class="stat"><span>${k}</span><b>${v}</b></div>`).join('');
    $('#warn').hidden = !!C; const pl = reload(); $('#piles').innerHTML = D.clans.map(c => `<div class="stat"><span>${c.resource} <small>(${c.name}, every ${c.period})</small></span><b>${fmt(pl[c.resource] || 0)}</b></div>`).join('');
    $('#regions').innerHTML = W.regions.map(r => { const ps = P.filter(p => p.clan === r.clan), ar = ps.filter(p => p.fertility > 0).length, gr = ps.filter(p => S.cells[idx(p.x, p.y)] === 2).length; return `<div class="region"><b>${r.name}</b> · ${r.clanName}<small>${fmt(gr)} of ${fmt(ar)} arable grown · ${r.resource} every ${r.period} days</small><div class="bar"><div style="width:${100 * gr / Math.max(1, ar)}%;background:${D.hues[r.clan]}"></div></div></div>`; }).join('');
    if (pick != null) { const p = P[pick], s = S.cells[pick]; $('#pick').innerHTML = `<div class="stat"><span>parcel</span><b>${p.id}</b></div><div class="stat"><span>region</span><b>${p.region}</b></div><div class="stat"><span>terrain</span><b>${p.terrain} · fertility ${p.fertility}</b></div><div class="stat"><span>yield on the period</span><b>${p.yield}</b></div><div class="stat"><span>state</span><b>${['bare', 'sown', 'grown'][s]}</b></div><div class="stat"><span>woven from</span><b>${p.wovenBy}</b></div><p style="color:var(--dim);font-size:12px;margin:6px 0">${p.text}</p><div class="row"><button id="sow" ${s !== 0 || p.fertility === 0 ? 'disabled' : ''}>Sow from the ${p.resource} pile (${RULES.sowCost})</button></div>`; const b = $('#sow'); if (b) b.onclick = () => sow(pick); }
    $('#log').innerHTML = S.log.map(l => `<div><b>d${l.t}</b> ${l.m}</div>`).join(''); $('#clock').textContent = `day ${Math.floor(S.day)} · seed ${S.seed}`;
    $('#legend').innerHTML = W.regions.map(r => `<span><i style="background:${D.hues[r.clan]}"></i>${r.name}</span>`).join('') + '<span><i style="background:#281612"></i>lava</span>'; }
  $('#reweave').onclick = () => { S.seed = +$('#seed').value || D.seed; W = weave(D.clans, D.piles, S.seed, N); P = W.parcels; S.cells = new Array(N * N).fill(0); pick = null; note(`Re-woven with seed ${S.seed}: another continent, bare.`); save(); render(); };
  $('#download').onclick = () => { const bundle = { seed: S.seed, wovenBy: 'continent.html', count: W.regions.length + P.length, files: Object.fromEntries([...W.regions, ...P].map(t => ['templates-continent/' + t.id + '.json', t])) }; const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(bundle)], { type: 'application/json' })); a.download = `templates-continent-seed-${S.seed}.json`; document.body.append(a); a.click(); a.remove(); };
  $('#wipe').onclick = () => { if (confirm('Bare the continent? The piles and the docket stay.')) { S.cells = new Array(N * N).fill(0); note('The continent bared; what it produced stays produced.'); save(); render(); } };
  render(); setInterval(() => { step(1); render(); }, RULES.secondsPerDay * 1000); setInterval(save, 5000); addEventListener('beforeunload', save);
})();

/* village.page.js — the script for village.html. Inlined by village.mjs at build; not loaded on its own. */
(function () {
  const D = JSON.parse(document.getElementById('def-json').textContent);
  const $ = s => document.querySelector(s), el = (t, a = {}, ...k) => { const e = document.createElement(t); for (const [n, v] of Object.entries(a)) { if (v == null) continue; n === 'html' ? e.innerHTML = v : n.startsWith('on') ? e[n] = v : e.setAttribute(n, v); } k.forEach(x => e.append(x)); return e; };
  const fmt = n => Math.round(n).toLocaleString('en-US');
  const CAP = 21000000, DKEY = 'descent.v1', FKEY = 'farm.v1', KEY = 'village.v1';
  const read = (k, d) => { try { return Object.assign(d, JSON.parse(localStorage.getItem(k) || 'null') || {}); } catch (e) { return d; } };
  let Dk = read(DKEY, { heze: 0, issued: 0, ledger: [] });
  const saveD = () => { Dk.saved = Date.now(); localStorage.setItem(DKEY, JSON.stringify(Dk)); };
  const credit = (amt, line) => { const a = Math.min(amt, Math.max(0, CAP - Dk.issued)); if (a <= 0) return 0; Dk.heze += a; Dk.issued += a; Dk.ledger.unshift({ t: Date.now(), line: 'Village: ' + line, amt: a }); Dk.ledger.length = Math.min(Dk.ledger.length, 300); return a; };
  const debit = (amt, line) => { if (Dk.heze < amt) return false; Dk.heze -= amt; Dk.ledger.unshift({ t: Date.now(), line: 'Village: ' + line, amt: -amt }); return true; };
  const farm = () => read(FKEY, { harvested: 0, season: 0 }); const continent = () => read('continent.v1', { produced: 0 });
  const fresh = () => ({ day: 0, built: [], grain: 0, drawn: 0, drawnContinent: 0, households: 0, fed: 0, prosperity: 1, festival: null, lastSeason: -1, sayingAt: 0, log: [], saved: Date.now() });
  let S = read(KEY, fresh());
  const note = m => { S.log.unshift({ t: Math.floor(S.day), m }); S.log.length = Math.min(S.log.length, 50); };
  const save = () => { S.saved = Date.now(); localStorage.setItem(KEY, JSON.stringify(S)); saveD(); };
  const all = [...D.trades, ...D.halls, ...D.squares, ...D.workshops, ...D.byres, ...D.wells, ...D.lanes, ...D.holdings];
  const have = id => S.built.includes(id), built = kind => D[kind].filter(t => have(t.id));

  function step(dt, quiet) { S.day += dt; const F = farm();
    /* the harvest comes down the lane: whatever the farm has harvested and the village has not yet drawn */
    const fresh = Math.max(0, (F.harvested || 0) - S.drawn); if (fresh > 0) { S.grain += fresh; S.drawn += fresh; if (!quiet && fresh > 5) note(`${fmt(fresh)} came down from the farm.`); }
    /* and the continent's provision comes up the road: whatever Aphrodite Terra has produced and the village has not yet drawn */
    const Cn = continent(); const up = Math.max(0, (Cn.produced || 0) - (S.drawnContinent || 0)); if (up > 0) { S.grain += up; S.drawnContinent = (S.drawnContinent || 0) + up; if (!quiet && up > 5) note(`${fmt(up)} provision came up from the continent.`); }
    S.grain += built('holdings').reduce((a, h) => a + h.grows, 0) * dt;
    const housed = built('halls').reduce((a, h) => a + h.houses, 0), watered = built('wells').reduce((a, w) => a + w.waters, 0), fedBy = built('trades').length * 2 + built('byres').reduce((a, b) => a + b.feeds, 0);
    S.households = Math.min(housed, watered || 0, fedBy || 0); S.fed = Math.min(S.households, fedBy);
    const wmul = built('workshops').reduce((a, w) => a * w.mul, 1), keep = built('lanes').length ? Math.max(...built('lanes').map(l => l.keep)) : 0.8;
    if ((F.season || 0) !== S.lastSeason) { S.lastSeason = F.season || 0; const turn = D.seasons[S.lastSeason % D.seasons.length]; const f = D.festivals.find(x => x.name.endsWith(turn)); S.festival = f ? { id: f.id, mul: f.mul, name: f.name } : null; if (!quiet && f) note(`${f.name}: prosperity ×${f.mul} while ${turn} lasts.`); }
    S.prosperity = +((S.households ? 0.6 + 0.4 * (S.fed / Math.max(1, S.households)) : 0.5) * (S.festival ? S.festival.mul : 1) * (1 + 0.05 * built('squares').length)).toFixed(2);
    let paid = 0; for (const t of built('trades')) { const need = t.eats * dt; if (S.grain >= need) { S.grain -= need; paid += t.pays * dt * wmul * keep * S.prosperity; } }
    for (const sq of built('squares')) if (Math.floor(S.day / sq.every) > Math.floor((S.day - dt) / sq.every)) { paid *= sq.mul; if (!quiet) note(`Market day at ${sq.name.replace('the square at ', '')}: the trades sell at ×${sq.mul}.`); }
    if (paid > 0) credit(paid, 'the trades'); S.earned = (S.earned || 0) + paid; }
  const away = Math.min((Date.now() - S.saved) / 1000, 8 * 3600); if (away > 5) { let left = away; while (left > 0) { const d = Math.min(5, left); step(d, true); left -= d; } note(`Away ${Math.round(away / 60)} min: the village kept its hours.`); }

  const stats = [['heze', 'HEZE'], ['grain', 'harvest in the village'], ['households', 'households'], ['prosperity', 'prosperity'], ['day', 'the village']];
  $('#stats').append(...stats.map(([id, label]) => el('div', { class: 'stat', id: 'st-' + id }, el('b', {}, label), el('span'), el('i'))));
  const setStat = (id, v, i) => { const s = $('#st-' + id); s.children[1].textContent = v; s.children[2].textContent = i || ''; };
  const chain = t => `<code>${t.id}</code> ← ` + t.chain.map(c => `<code>${c}</code>`).join(' ← ');
  function cards(box, list, label) { box.innerHTML = ''; for (const t of list) { const got = have(t.id);
      box.append(el('div', { class: 'card' + (got ? ' done' : ''), onclick: () => { $('#chain').innerHTML = chain(t); } }, el('b', {}, t.name), el('span', { class: 'n' }, got ? label(t) : `${fmt(t.cost)} HEZE`), el('p', {}, t.text),
        got ? '' : el('button', { disabled: Dk.heze < t.cost ? 'true' : null, onclick: ev => { ev.stopPropagation(); if (debit(t.cost, t.name)) { S.built.push(t.id); note(`Built ${t.name}.`); save(); render(); } } }, 'Build'))); } }
  function render() { const F = farm();
    setStat('heze', fmt(Dk.heze), 'the shared docket'); setStat('grain', fmt(S.grain), `${fmt(F.harvested || 0)} from the farm · ${fmt(S.drawnContinent || 0)} from the continent`); setStat('households', S.households, `${S.fed} fed · ${built('halls').reduce((a, h) => a + h.houses, 0)} housed · ${built('wells').reduce((a, w) => a + w.waters, 0)} watered`);
    setStat('prosperity', `×${S.prosperity}`, S.festival ? S.festival.name : 'no festival'); setStat('day', `day ${Math.floor(S.day)}`, `${fmt(S.earned || 0)} HEZE from the trades`);
    cards($('#trades'), D.trades, t => `eats ${t.eats}/day · pays ${t.pays}`); cards($('#civic'), [...D.halls, ...D.wells, ...D.lanes], t => t.houses ? `${t.houses} households` : t.waters ? `${t.waters} watered` : `keeps ×${t.keep}`); cards($('#more'), [...D.squares, ...D.workshops, ...D.byres, ...D.holdings], t => t.mul ? `×${t.mul}` : t.feeds ? 'feeds 1' : `+${t.grows}/day`);
    const say = D.sayings[Math.floor(S.day / 120) % D.sayings.length]; $('#saying').textContent = say.text; $('#saying-from').textContent = `${say.name}, woven from ${say.wovenBy}`;
    $('#log').innerHTML = S.log.map(l => `<div><b>d${l.t}</b>${l.m}</div>`).join('') || '<div>Nothing yet. A trade first; it needs the farm\'s harvest, or the continent\'s provision.</div>'; $('#clock').textContent = `${S.built.length} buildings · ${built('trades').length} trades`; }
  $('#wipe').onclick = () => { if (confirm('Unbuild the village? The buildings go; the docket and the farm stay.')) { S = fresh(); save(); render(); } };

  /* the scene: hills, a lane, roofs with chimneys and no windows, smoke while the trades work */
  const cv = $('#scene'), g = cv.getContext('2d');
  function draw(t) { const W = cv.width = cv.clientWidth, H = cv.height; const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#0d1a26'); sky.addColorStop(.7, '#2a3a3a'); sky.addColorStop(1, '#4a4a2a'); g.fillStyle = sky; g.fillRect(0, 0, W, H);
    for (const [y, c, s] of [[.55, '#16301f', 1.0], [.66, '#1e3a26', .7], [.78, '#274a2e', .4]]) { g.fillStyle = c; g.beginPath(); g.moveTo(0, H); g.lineTo(0, H * y + 10); for (let x = 0; x <= W; x += 20) g.lineTo(x, H * y + Math.sin(x / (120 * s) + y * 10) * 12 * s + Math.sin(x / 47) * 4); g.lineTo(W, H); g.fill(); }
    g.strokeStyle = '#6b5a3a'; g.lineWidth = 10; g.beginPath(); g.moveTo(0, H * .92); g.quadraticCurveTo(W * .5, H * .78, W, H * .9); g.stroke();
    const list = S.built.map(id => all.find(x => x.id === id)).filter(Boolean); list.forEach((b, i) => { const x = 40 + (i * 89 % Math.max(1, W - 80)), y = H * .8 - (i * 37 % 60) - 6, w = 30 + (b.kind === 'hall' ? 24 : b.kind === 'square' ? 40 : 0), h = 22 + (b.kind === 'hall' ? 10 : 0);
      g.fillStyle = b.kind === 'well' ? '#4a5a6a' : b.kind === 'lane' ? '#6b5a3a' : '#5a4a34'; g.fillRect(x, y - h, w, h); g.fillStyle = b.kind === 'square' ? '#8a7a5a' : b.kind === 'trade' ? '#b0603a' : b.kind === 'byre' ? '#7a6a3a' : '#8a3a2a'; g.beginPath(); g.moveTo(x - 4, y - h); g.lineTo(x + w / 2, y - h - 14 - (b.kind === 'hall' ? 8 : 0)); g.lineTo(x + w + 4, y - h); g.closePath(); g.fill();
      g.fillStyle = '#2a2018'; g.fillRect(x + w / 2 - 4, y - 12, 8, 12); if (b.kind === 'trade' && S.grain > 0) { g.fillStyle = 'rgba(220,220,230,.25)'; for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(x + w - 8 + Math.sin(t / 500 + k) * 4, y - h - 18 - k * 9 - (t / 40 + k * 7) % 9, 3 + k, 0, 7); g.fill(); } } });
    g.fillStyle = 'rgba(239,233,220,.75)'; g.font = '11px system-ui'; g.textAlign = 'left'; g.fillText(`${list.length} buildings · ${S.households} households · prosperity ×${S.prosperity}${S.festival ? ' · ' + S.festival.name : ''}`, 10, 16); requestAnimationFrame(draw); }
  render(); requestAnimationFrame(draw); setInterval(() => { step(1); render(); }, 1000); setInterval(save, 5000); addEventListener('beforeunload', save);
})();

/* town.page.js — the script for town.html. Inlined by town.mjs at build; not loaded on its own. */
(function () {
  const D = JSON.parse(document.getElementById('def-json').textContent);
  /* the rules: embedded from templates-rules/town.json at build, and overridden by a rulebook kept in this browser through the editor in the quarter */
  const RULES = (() => { let o = {}; try { o = (JSON.parse(localStorage.getItem('custom.v1') || 'null') || {})['templates-rules/town.json'] || {}; } catch (e) {} return Object.assign({}, D.rules, o.rules || o); })();
  const $ = s => document.querySelector(s), el = (t, a = {}, ...k) => { const e = document.createElement(t); for (const [n, v] of Object.entries(a)) { if (v == null) continue; n === 'html' ? e.innerHTML = v : n.startsWith('on') ? e[n] = v : e.setAttribute(n, v); } k.forEach(x => e.append(x)); return e; };
  const fmt = n => Math.round(n).toLocaleString('en-US');
  const CAP = RULES.cap, DKEY = 'descent.v1', VKEY = 'village.v1', KEY = 'town.v1';
  const read = (k, d) => { try { return Object.assign(d, JSON.parse(localStorage.getItem(k) || 'null') || {}); } catch (e) { return d; } };
  let Dk = read(DKEY, { heze: 0, issued: 0, ledger: [] });
  const saveD = () => { Dk.saved = Date.now(); localStorage.setItem(DKEY, JSON.stringify(Dk)); };
  const credit = (amt, line) => { const a = Math.min(amt, Math.max(0, CAP - Dk.issued)); if (a <= 0) return 0; Dk.heze += a; Dk.issued += a; Dk.ledger.unshift({ t: Date.now(), line: 'Town: ' + line, amt: a }); Dk.ledger.length = Math.min(Dk.ledger.length, 300); return a; };
  const debit = (amt, line) => { if (Dk.heze < amt) return false; Dk.heze -= amt; Dk.ledger.unshift({ t: Date.now(), line: 'Town: ' + line, amt: -amt }); return true; };
  const village = () => read(VKEY, { households: 0, prosperity: 1, festival: null, grain: 0 });
  const fresh = () => ({ day: 0, built: [], citizens: 0, prosperity: 1, chartered: false, earned: 0, rentSent: 0, log: [], saved: Date.now() });
  let S = read(KEY, fresh());
  const note = m => { S.log.unshift({ t: Math.floor(S.day), m }); S.log.length = Math.min(S.log.length, 50); };
  const save = () => { S.saved = Date.now(); localStorage.setItem(KEY, JSON.stringify(S)); saveD(); };
  const all = [...D.guilds, ...D.wards, ...D.exchanges, ...D.manufactories, ...D.stalls, ...D.aqueducts, ...D.roads, ...D.tenements];
  const have = id => S.built.includes(id), built = k => D[k].filter(t => have(t.id));
  function step(dt, quiet) { S.day += dt; const V = village();
    const housed = built('wards').reduce((a, w) => a + w.houses, 0), watered = built('aqueducts').reduce((a, w) => a + w.waters, 0), fed = built('stalls').reduce((a, s) => a + s.feeds, 0) + built('guilds').length * RULES.guildFeeds + Math.floor((V.grain || 0) / RULES.grainPerCitizen); /* every ten grain in the village's store feeds a citizen; that grain is the continent's provision, milled */
    S.citizens = Math.min(V.households + housed, watered, fed); const needed = built('guilds').length * RULES.guildStaff; const staffed = needed ? Math.min(1, S.citizens / needed) : 0;
    const fair = V.festival ? (D.fairs.find(f => f.name.endsWith(V.festival.name.replace('the festival of ', ''))) || {}).mul || 1 : 1;
    S.prosperity = +((V.prosperity || 1) * fair * (1 + RULES.exchangeBonus * built('exchanges').length)).toFixed(2);
    const mul = built('manufactories').reduce((a, m) => a * m.mul, 1), keep = built('roads').length ? Math.max(...built('roads').map(r => r.keep)) : RULES.keepDefault;
    let paid = built('guilds').reduce((a, g) => a + g.dues, 0) * staffed * mul * keep * S.prosperity * dt; const rent = built('tenements').reduce((a, t) => a + t.rent, 0) * dt;
    for (const ex of built('exchanges')) if (Math.floor(S.day / ex.every) > Math.floor((S.day - dt) / ex.every)) { paid *= ex.mul; if (!quiet) note(`Exchange day at ${ex.name.replace('the exchange at ', '')}: dues at ×${ex.mul}.`); }
    if (paid > 0) { credit(paid, 'dues'); S.earned += paid; }
    /* the rent does not stay in the town: it goes back down to the clans whose regions grew the provision, and the clans page draws it */
    if (rent > 0) S.rentSent = (S.rentSent || 0) + rent;
    if (!S.chartered && built('guilds').length >= RULES.charterGuilds && S.citizens >= RULES.charterCitizens) { S.chartered = true; note(`${RULES.charterGuilds} guilds and ${RULES.charterCitizens} citizens: the town takes its charter. Nobody asked the village.`); } }
  const away = Math.min((Date.now() - S.saved) / 1000, RULES.awayHours * 3600); if (away > 5) { let left = away; while (left > 0) { const d = Math.min(5, left); step(d, true); left -= d; } note(`Away ${Math.round(away / 60)} min: the town kept its hours.`); }
  const stats = [['heze', 'HEZE'], ['citizens', 'citizens'], ['prosperity', 'prosperity'], ['charter', 'the charter'], ['day', 'the town']];
  $('#stats').append(...stats.map(([id, label]) => el('div', { class: 'stat', id: 'st-' + id }, el('b', {}, label), el('span'), el('i'))));
  const setStat = (id, v, i) => { const s = $('#st-' + id); s.children[1].textContent = v; s.children[2].textContent = i || ''; };
  const chain = t => `<code>${t.id}</code> ← ` + t.chain.map(c => `<code>${c}</code>`).join(' ← ');
  function cards(box, list, label) { box.innerHTML = ''; for (const t of list) { const got = have(t.id);
      box.append(el('div', { class: 'card' + (got ? ' done' : ''), onclick: () => { $('#chain').innerHTML = chain(t); } }, el('b', {}, t.name), el('span', { class: 'n' }, got ? label(t) : `${fmt(t.cost)} HEZE`), el('p', {}, t.text),
        got ? '' : el('button', { disabled: Dk.heze < t.cost ? 'true' : null, onclick: ev => { ev.stopPropagation(); if (debit(t.cost, t.name)) { S.built.push(t.id); note(`Built ${t.name}.`); save(); render(); } } }, 'Build'))); } }
  function render() { const V = village();
    setStat('heze', fmt(Dk.heze), 'the shared docket'); setStat('citizens', S.citizens, `${V.households} from the village · ${built('wards').reduce((a, w) => a + w.houses, 0)} housed here · ${built('aqueducts').reduce((a, w) => a + w.waters, 0)} watered · ${Math.floor((V.grain || 0) / RULES.grainPerCitizen)} fed by the village's grain`); setStat('prosperity', `×${S.prosperity}`, V.festival ? V.festival.name.replace('festival', 'fair') : 'no fair');
    setStat('charter', S.chartered ? 'chartered' : `${built('guilds').length}/5 guilds`, S.chartered ? 'the town is its own' : 'five guilds and fifteen citizens'); setStat('day', `day ${Math.floor(S.day)}`, `${fmt(S.earned)} HEZE in dues · ${fmt(S.rentSent || 0)} rent sent down to the clans`);
    cards($('#guilds'), D.guilds, g => `dues ${g.dues}/day`); cards($('#civic'), [...D.wards, ...D.aqueducts, ...D.roads], t => t.houses ? `${t.houses} households` : t.waters ? `${t.waters} watered` : `keeps ×${t.keep}`); cards($('#more'), [...D.exchanges, ...D.manufactories, ...D.stalls, ...D.tenements], t => t.mul ? `×${t.mul}` : t.feeds ? 'feeds 3' : `rent ${t.rent}/day`);
    const say = D.inscriptions[Math.floor(S.day / 120) % D.inscriptions.length]; $('#saying').textContent = say.text; $('#saying-from').textContent = `${say.name}, woven from ${say.wovenBy}`;
    $('#log').innerHTML = S.log.map(l => `<div><b>d${l.t}</b>${l.m}</div>`).join('') || '<div>Nothing yet. A guild first; it needs citizens, and citizens come from the village, fed on the continent\'s provision.</div>'; $('#clock').textContent = `${S.built.length} buildings · ${built('guilds').length} guilds`; }
  $('#wipe').onclick = () => { if (confirm('Unbuild the town? The buildings go; the docket and the village stay.')) { S = fresh(); save(); render(); } };
  const cv = $('#scene'), g = cv.getContext('2d');
  function draw(t) { const W = cv.width = cv.clientWidth, H = cv.height; const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#0d1626'); sky.addColorStop(.75, '#2a2a3a'); sky.addColorStop(1, '#4a3a2a'); g.fillStyle = sky; g.fillRect(0, 0, W, H);
    g.fillStyle = '#16221f'; g.beginPath(); g.moveTo(0, H); g.lineTo(0, H * .62); for (let x = 0; x <= W; x += 20) g.lineTo(x, H * .62 + Math.sin(x / 90) * 8); g.lineTo(W, H); g.fill();
    g.fillStyle = '#3a3040'; g.fillRect(W * .5 - 14, H * .18, 28, H * .5); g.beginPath(); g.moveTo(W * .5 - 18, H * .18); g.lineTo(W * .5, H * .08); g.lineTo(W * .5 + 18, H * .18); g.closePath(); g.fill();
    const list = S.built.map(id => all.find(x => x.id === id)).filter(Boolean); list.forEach((b, i) => { const x = 30 + (i * 71 % Math.max(1, W - 60)), y = H * .8 - (i * 23 % 40), w = 26 + (b.kind === 'ward' ? 30 : b.kind === 'exchange' ? 44 : 0), h = 26 + (b.kind === 'ward' ? 22 : b.kind === 'manufactory' ? 12 : 0);
      g.fillStyle = b.kind === 'aqueduct' ? '#4a5a6a' : b.kind === 'road' ? '#5a4a34' : '#4a3a30'; g.fillRect(x, y - h, w, h); g.fillStyle = b.kind === 'guild' ? '#b0603a' : b.kind === 'exchange' ? '#8a7a5a' : b.kind === 'tenement' ? '#6a4a3a' : '#7a3a2a'; g.beginPath(); g.moveTo(x - 4, y - h); g.lineTo(x + w / 2, y - h - 12); g.lineTo(x + w + 4, y - h); g.closePath(); g.fill(); g.fillStyle = '#2a2018'; g.fillRect(x + w / 2 - 4, y - 12, 8, 12);
      if ((b.kind === 'guild' || b.kind === 'manufactory') && S.citizens > 0) { g.fillStyle = 'rgba(220,220,230,.22)'; for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(x + w - 6 + Math.sin(t / 500 + k) * 3, y - h - 16 - k * 8 - (t / 40 + k * 5) % 8, 3 + k, 0, 7); g.fill(); } } });
    g.strokeStyle = '#6b5a3a'; g.lineWidth = 8; g.beginPath(); g.moveTo(0, H * .93); g.lineTo(W, H * .9); g.stroke();
    g.fillStyle = 'rgba(239,233,220,.75)'; g.font = '11px system-ui'; g.textAlign = 'left'; g.fillText(`${list.length} buildings · ${S.citizens} citizens · prosperity ×${S.prosperity}${S.chartered ? ' · chartered' : ''}`, 10, 16); requestAnimationFrame(draw); }
  render(); requestAnimationFrame(draw); setInterval(() => { step(1); render(); }, 1000); setInterval(save, 5000); addEventListener('beforeunload', save);
})();

/* clans.page.js — the script for clans.html. Inlined by clans.mjs after the weave function; not loaded on its own. */
(function () {
  const D = JSON.parse(document.getElementById('def-json').textContent); let A = D.assets;
  const $ = s => document.querySelector(s), el = (t, a = {}, ...k) => { const e = document.createElement(t); for (const [n, v] of Object.entries(a)) { if (v == null) continue; n === 'html' ? e.innerHTML = v : n.startsWith('on') ? e[n] = v : e.setAttribute(n, v); } k.forEach(x => e.append(x)); return e; };
  const fmt = n => Math.round(n).toLocaleString('en-US');
  const CAP = 21000000, DKEY = 'descent.v1', KEY = 'clans.v1';
  const read = (k, d) => { try { return Object.assign(d, JSON.parse(localStorage.getItem(k) || 'null') || {}); } catch (e) { return d; } };
  let Dk = read(DKEY, { heze: 0, issued: 0, ledger: [] });
  const saveD = () => { Dk.saved = Date.now(); localStorage.setItem(DKEY, JSON.stringify(Dk)); };
  const credit = (amt, line) => { const a = Math.min(amt, Math.max(0, CAP - Dk.issued)); if (a <= 0) return 0; Dk.heze += a; Dk.issued += a; Dk.ledger.unshift({ t: Date.now(), line: 'Clans: ' + line, amt: a }); Dk.ledger.length = Math.min(Dk.ledger.length, 300); return a; };
  const debit = (amt, line) => { if (Dk.heze < amt) return false; Dk.heze -= amt; Dk.ledger.unshift({ t: Date.now(), line: 'Clans: ' + line, amt: -amt }); return true; };
  const fresh = () => ({ day: 0, held: [], piles: Object.fromEntries(D.clans.map(c => [c.resource, 0])), mana: 20, cool: {}, raidsBroken: 0, raidsTaken: 0, sold: 0, rentDrawn: 0, rentByClan: {}, seed: D.seed, grant: false, log: [], saved: Date.now() });
  let S = read(KEY, fresh());
  const note = m => { S.log.unshift({ t: Math.floor(S.day), m }); S.log.length = Math.min(S.log.length, 60); };
  const save = () => { S.saved = Date.now(); localStorage.setItem(KEY, JSON.stringify(S)); saveD(); };
  if (!S.grant) { S.grant = true; credit(20000, 'the jarl\'s first hoard, against the cap'); note('Six clans, six periods, none of them sharing a factor. The jarl has 20,000 HEZE and no assets. Nothing here can be maximised; it can only be composed.'); }
  const asset = id => A.find(a => a.id === id); const held = kind => S.held.map(asset).filter(a => a && a.kind === kind);
  const cap = res => 100 + held('pile').filter(p => p.resource === res).reduce((a, p) => a + p.holds, 0);
  const turn = () => { const d = Math.floor(S.day) % 4; return d === 0 ? A.find(a => a.id === 'turn-dawn') : d === 1 ? A.find(a => a.id === 'turn-noon') : A.find(a => a.id === 'turn-night'); };
  const price = res => ({ nitrogen: 3, hydrogen: 9, record: 12, biomass: 2, signal: 6, silicate: 4 })[res] || 3;

  /* the town's rent, paid back down: the town records what it sent, the continent records who grew the provision, and each clan's share becomes stock in its pile at the docket price */
  const readJ = k => { try { return JSON.parse(localStorage.getItem(k) || 'null') || {}; } catch (e) { return {}; } };
  function rents(quiet) { const sent = readJ('town.v1').rentSent || 0, inflow = sent - (S.rentDrawn || 0); if (inflow < 1) return; const by = readJ('continent.v1').producedBy || {}; const tot = D.clans.reduce((a, c) => a + (by[c.id] || 0), 0); S.rentByClan = S.rentByClan || {}; const lines = [];
    for (const c of D.clans) { const share = tot > 0 ? (by[c.id] || 0) / tot : 1 / D.clans.length, heze = inflow * share; if (heze <= 0) continue; const units = Math.floor(heze / price(c.resource)); const room = Math.max(0, cap(c.resource) - S.piles[c.resource]); S.piles[c.resource] += Math.min(units, room); S.rentByClan[c.id] = (S.rentByClan[c.id] || 0) + heze; if (units) lines.push(`${c.name} ${fmt(heze)} → ${fmt(Math.min(units, room))} ${c.resource}${units > room ? ' (the rest had no pile)' : ''}`); }
    S.rentDrawn = sent; if (!quiet && lines.length) note(`The town's rent came down, ${fmt(inflow)} HEZE: ${lines.join('; ')}.`); }
  function step(dt, quiet) { const d0 = Math.floor(S.day); S.day += dt; const d1 = Math.floor(S.day); if (d1 === d0) return; const T = turn(); rents(quiet); const raidMul = T.id === 'turn-noon' ? 1.3 : T.id === 'turn-night' ? 0.7 : 1;
    S.mana = Math.min(20, S.mana + 1); for (const k in S.cool) S.cool[k] = Math.max(0, S.cool[k] - 1);
    for (const c of D.clans) { if (d1 % c.period !== 0) continue;
      /* the clan's works fire on its period; the turn of the planet scales them */
      const got = held('work').filter(w => w.clan === c.id).reduce((a, w) => a + w.yield, 0) * (T.id === 'turn-dawn' ? 1.2 : T.id === 'turn-night' ? 0.6 : 1); if (got) { const room = cap(c.resource) - S.piles[c.resource]; const kept = Math.min(got, Math.max(0, room)); S.piles[c.resource] += kept; if (!quiet && got > kept) note(`${c.name}'s works made ${fmt(got)} ${c.resource}; ${fmt(got - kept)} had nowhere to go.`); }
      /* the clan raids on its period unless a ford is held against it; your own raiders take from the others */
      const raiders = 4 + Math.floor(d1 / 50) * 2, wall = held('band').filter(b => !b.raids).reduce((a, b) => a + b.strength, 0) * raidMul;
      if (!held('work').some(w => w.clan === c.id) || true) { if (wall >= raiders * raidMul) { S.raidsBroken++; if (!quiet && d1 % 20 === 0) note(`${c.name} came at the ford and broke on it.`); }
        else { const res = D.clans[(D.clans.indexOf(c) + 1) % D.clans.length].resource; const take = Math.min(S.piles[res], Math.round(S.piles[res] * 0.15 * raidMul)); if (take > 0) { S.piles[res] -= take; S.raidsTaken++; if (!quiet) note(`${c.name} raided on day ${d1} and took ${fmt(take)} ${res}. A band at the ford would have held.`); } } }
      const mine = held('band').filter(b => b.raids && b.clan === c.id).reduce((a, b) => a + b.strength, 0); if (mine) { const spoil = Math.round(mine * 2 * raidMul); credit(spoil * 2, `${c.name}'s raiders, spoil`); if (!quiet && d1 % 10 === 0) note(`${c.name}'s raiders came back with spoil worth ${fmt(spoil * 2)} HEZE.`); } }
    for (const b of held('band')) { S.piles[b.resource] = Math.max(0, S.piles[b.resource] - b.upkeep); }
    /* bronze: silicate and hydrogen together, once a day, sold to the docket */
    const bronze = Math.min(S.piles.silicate || 0, (S.piles.hydrogen || 0) * 3, 20); if (bronze > 0) { S.piles.silicate -= bronze; S.piles.hydrogen -= bronze / 3; credit(bronze * 8, 'bronze cast and sold'); S.sold += bronze * 8; } }
  const away = Math.min((Date.now() - S.saved) / 1000, 8 * 3600); if (away > 5) { let left = away; while (left > 0) { const d = Math.min(1, left); step(d, true); left -= d; } note(`Away ${Math.round(away / 60)} min: every period fired, every raid came. Credited in full, and taken in full.`); }

  const stats = [['heze', 'HEZE'], ['turn', 'the planet'], ['assets', 'the portfolio'], ['raids', 'raids'], ['bronze', 'bronze sold'], ['rent', 'rents from the town'], ['mana', 'the reserve']];
  $('#stats').append(...stats.map(([id, label]) => el('div', { class: 'stat', id: 'st-' + id }, el('b', {}, label), el('span'), el('i'))));
  const setStat = (id, v, i) => { const s = $('#st-' + id); s.children[1].textContent = v; s.children[2].textContent = i || ''; };
  function buildClans() { const box = $('#clans'); box.innerHTML = ''; for (const c of D.clans) { const sec = el('div', { class: 'clan' }, el('h3', {}, `${c.name} · ${c.house}`, el('small', {}, `${c.resource} every ${c.period} days · next on day ${Math.ceil((Math.floor(S.day) + 1) / c.period) * c.period}${(S.rentByClan || {})[c.id] ? ' · rents ' + fmt(S.rentByClan[c.id]) : ''}`)), el('p', {}, c.saga.slice(0, 160) + (c.saga.length > 160 ? '…' : '')));
      for (const a of A.filter(x => x.clan === c.id)) { const got = S.held.includes(a.id); sec.append(el('div', { class: 'asset' + (got ? ' held' : '') }, el('b', {}, `${a.kind === 'work' ? '⌂' : a.kind === 'band' ? (a.raids ? '⚔' : '⛨') : '▤'} ${a.name}`), el('span', { class: 'n' }, got ? 'held' : `${fmt(a.cost)} HEZE`), el('p', {}, a.text), got ? '' : el('button', { disabled: Dk.heze < a.cost ? 'true' : null, onclick: () => { if (debit(a.cost, a.name)) { S.held.push(a.id); note(`Took ${a.name}.`); save(); render(); } } }, 'Take'))); }
      box.append(sec); } }
  function buildSpells() { const box = $('#spells'); box.innerHTML = ''; for (const sp of D.spells) { const cd = S.cool[sp.id] || 0; box.append(el('div', { class: 'spell' }, el('button', { disabled: (cd > 0 || S.mana < sp.cost) ? 'true' : null, onclick: () => cast(sp), title: sp.does }, el('b', {}, sp.glyph), ` ${sp.name}`), el('small', {}, cd > 0 ? `${cd}d` : `${sp.cost} · ${sp.cooldown}d`))); } }
  function cast(sp) { if (S.mana < sp.cost || (S.cool[sp.id] || 0) > 0) return; S.mana -= sp.cost; S.cool[sp.id] = sp.cooldown;
    if (sp.id === 'ward' || sp.id === 'gate') { S.cool.ford = sp.cooldown; note(`${sp.name}: the ford is held by sorcery for ${sp.cooldown} days.`); } else if (sp.id === 'bolt' || sp.id === 'unmake') { const c = D.clans[Math.floor(S.day) % D.clans.length]; credit(400, `${sp.name} on ${c.name}'s raiders`); note(`${sp.name}: ${c.name}'s raiders scattered; their spoil is yours.`); } else if (sp.id === 'summon') { for (const r in S.piles) S.piles[r] = Math.min(cap(r), S.piles[r] + 10); note('Summon: a bound thing fills every pile a little.'); } else if (sp.id === 'bind') { S.cool.ford = 10; note('Bind: the next raid stands still at the ford.'); }
    save(); render(); }
  function render() { const T = turn(); setStat('heze', fmt(Dk.heze), 'the shared docket'); setStat('turn', T.name, T.does); setStat('assets', S.held.length, `${held('work').length} works · ${held('band').length} bands · ${held('pile').length} piles`); setStat('raids', `${S.raidsBroken} / ${S.raidsTaken}`, 'broken at the ford / taken'); setStat('bronze', fmt(S.sold), 'silicate and hydrogen, cast'); setStat('mana', `${S.mana} / 20`, 'one a day'); setStat('rent', fmt(S.rentDrawn || 0), 'HEZE, turned into stock by clan');
    $('#piles').innerHTML = D.clans.map(c => `<div class="pile"><b>${c.resource}</b><span>${fmt(S.piles[c.resource] || 0)}</span> <small style="color:var(--dim)">/ ${fmt(cap(c.resource))}</small><div class="bar"><div style="width:${Math.min(100, 100 * (S.piles[c.resource] || 0) / cap(c.resource))}%"></div></div></div>`).join('');
    buildClans(); buildSpells(); $('#log').innerHTML = S.log.map(l => `<div><b>d${l.t}</b>${l.m}</div>`).join(''); $('#clock').textContent = `day ${Math.floor(S.day)} · seed ${S.seed}`; $('#woven').textContent = `${A.length} templates woven`; }
  $('#wipe').onclick = () => { if (confirm('Start the war again? Assets and piles go; the docket stays.')) { S = fresh(); S.grant = true; save(); render(); } };
  $('#reweave').onclick = () => { const seed = +$('#seed').value || 793; A = weave(D.clans.map(c => ({ ...c, tiers: D.assets.filter(a => a.kind === 'work' && a.clan === c.id).map(w => ({ n: w.tier, yield: w.yield, note: w.text.split(' Yields')[0] })) })), seed); S.seed = seed; S.held = S.held.filter(id => A.some(a => a.id === id)); note(`Re-woven with seed ${seed}: ${A.length} templates, in this page.`); save(); render(); };
  $('#download').onclick = () => { const bundle = { seed: S.seed, wovenBy: 'clans.html', count: A.length, files: Object.fromEntries(A.map(a => ['templates-asset/' + a.id + '.json', a])) }; const a = el('a', { href: URL.createObjectURL(new Blob([JSON.stringify(bundle, null, 1)], { type: 'application/json' })), download: `templates-asset-seed-${S.seed}.json` }); document.body.append(a); a.click(); a.remove(); };
  const cv = $('#scene'), g = cv.getContext('2d');
  function draw(t) { const W = cv.width = cv.clientWidth, H = cv.height; const T = turn(); const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, T.id === 'turn-night' ? '#0a0806' : '#3a1a10'); sky.addColorStop(1, T.id === 'turn-night' ? '#2a1a12' : '#c86a2a'); g.fillStyle = sky; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(240,200,150,.12)'; for (let i = 0; i < 5; i++) { g.beginPath(); g.ellipse((i * 233 + t / 30) % (W + 200) - 100, 40 + i * 14, 160, 10, 0, 0, 7); g.fill(); }
    g.fillStyle = '#3a2a1a'; g.beginPath(); g.moveTo(0, H); g.lineTo(0, H * .6); for (let x = 0; x <= W; x += 24) g.lineTo(x, H * .6 + Math.sin(x / 70) * 10 + Math.sin(x / 23) * 3); g.lineTo(W, H); g.fill();
    D.clans.forEach((c, i) => { const x = 60 + i * ((W - 120) / 5), works = held('work').filter(w => w.clan === c.id).length, bands = held('band').filter(b => b.clan === c.id).length, firing = Math.floor(S.day) % c.period === 0;
      g.fillStyle = firing ? '#f2c98a' : '#6b5a3a'; g.fillRect(x - 3, H * .6 - 60, 6, 60); for (let k = 0; k < Math.min(6, works); k++) { g.fillStyle = '#8a6a3a'; g.fillRect(x - 30 + k * 10, H * .62 + k % 2 * 8, 8, 10); } for (let k = 0; k < Math.min(6, bands); k++) { g.fillStyle = '#c9583a'; g.beginPath(); g.arc(x - 25 + k * 10, H * .78, 4, 0, 7); g.fill(); }
      g.fillStyle = 'rgba(239,233,220,.8)'; g.font = '11px system-ui'; g.textAlign = 'center'; g.fillText(`${c.name} · ${c.period}`, x, H * .6 - 66); });
    g.fillStyle = 'rgba(239,233,220,.8)'; g.font = '11px system-ui'; g.textAlign = 'left'; g.fillText(`${T.name} · day ${Math.floor(S.day)} · ${S.held.length} assets`, 10, 16); requestAnimationFrame(draw); }
  render(); requestAnimationFrame(draw); setInterval(() => { step(1); render(); }, 1000); setInterval(save, 5000); addEventListener('beforeunload', save);
})();

/* siege.page.js — the script for siege.html. Inlined by siege.mjs at build; not loaded on its own. */
(function () {
  const D = JSON.parse(document.getElementById('def-json').textContent);
  const $ = s => document.querySelector(s), el = (t, a = {}, ...k) => { const e = document.createElement(t); for (const [n, v] of Object.entries(a)) { if (v == null) continue; n === 'html' ? e.innerHTML = v : n.startsWith('on') ? e[n] = v : e.setAttribute(n, v); } k.forEach(x => e.append(x)); return e; };
  const fmt = n => Math.round(n).toLocaleString('en-US');
  const CAP = 21000000, DKEY = 'descent.v1', KEY = 'siege.v1', DAYS = D.years * 365;
  /* the docket, shared with the ground landing and Troy */
  let Dk; try { Dk = Object.assign({ heze: 0, issued: 0, ledger: [] }, JSON.parse(localStorage.getItem(DKEY) || 'null') || {}); } catch (e) { Dk = { heze: 0, issued: 0, ledger: [] }; }
  const saveD = () => { Dk.saved = Date.now(); localStorage.setItem(DKEY, JSON.stringify(Dk)); };
  const credit = (amt, line) => { const a = Math.min(amt, Math.max(0, CAP - Dk.issued)); if (a <= 0) return 0; Dk.heze += a; Dk.issued += a; Dk.ledger.unshift({ t: Date.now(), line: 'Siege: ' + line, amt: a }); Dk.ledger.length = Math.min(Dk.ledger.length, 300); return a; };
  const debit = (amt, line) => { if (Dk.heze < amt) return false; Dk.heze -= amt; Dk.ledger.unshift({ t: Date.now(), line: 'Siege: ' + line, amt: -amt }); return true; };

  const W = 1200, H = 340, WALLX = 1010, DEAD = 60 /* 8.3 m of dead ground, drawn wide */, SLOTS = 14;
  const slotY = i => 40 + i * ((H - 80) / (SLOTS - 1));
  const fresh = () => ({ day: 0, towers: {}, slots: SLOTS, garrison: 1, mana: 20, manaMax: 20, cool: {}, breach: 0, kills: 0, level: 0, aiBonus: 0, wave: 0, nextWave: D.waveEvery, nextWedding: D.weddingEvery, weddings: 0, wedding: null, over: null, paused: false, treasury: false, log: [], enemies: [], shots: [], saved: Date.now() });
  let S = fresh(); try { S = Object.assign(fresh(), JSON.parse(localStorage.getItem(KEY) || 'null') || {}); } catch (e) {}
  const note = m => { S.log.unshift({ t: Math.floor(S.day), m }); S.log.length = Math.min(S.log.length, 60); };
  const save = () => { S.saved = Date.now(); localStorage.setItem(KEY, JSON.stringify({ ...S, enemies: [], shots: [] })); saveD(); };
  if (!S.treasury) { S.treasury = true; credit(D.treasury, "Priam's treasury, opened for the war"); note(`Priam opens the treasury: ${fmt(D.treasury)} HEZE against the cap. The fleet is on the horizon and it is ${D.ahead} levels ahead.`); }

  const prince = id => D.princes.find(p => p.id === id);
  const towerList = () => Object.entries(S.towers).map(([slot, t]) => ({ slot: +slot, ...t, p: prince(t.id), y: slotY(+slot) }));
  const playerLevel = () => Math.floor(S.day / 365) + Math.floor((Object.keys(S.towers).length + towerList().reduce((a, t) => a + t.lvl - 1, 0)) / 3);
  const aiLevel = () => playerLevel() + D.ahead + S.aiBonus;
  const has = id => towerList().some(t => t.id === id);
  const statsOf = t => { const s = { ...t.p.stats }; const mul = Math.pow(1.4, t.lvl - 1); s.damage *= mul * S.garrison; if (s.bolt) s.bolt *= mul;
    const neighbours = towerList().filter(o => Math.abs(o.slot - t.slot) === 1); if (neighbours.some(o => o.p.stats.buffRange)) s.range *= 1.5; if (s.pairWith && neighbours.some(o => o.id === s.pairWith)) s.damage *= s.pairMul; if (neighbours.some(o => o.p.stats.pairWith === t.id)) s.damage *= 1.3; return s; };

  /* ------------------------------------------------------------- the fleet */
  function spawnWave() { S.wave++; const L = aiLevel(); const n = 3 + L; const shapes = D.demons.filter(d => d.wave <= Math.max(1, L)); const names = ['Achaean', 'Myrmidon', 'Locrian', 'Argive', 'Cretan', 'Ithacan'];
    for (let i = 0; i < n; i++) { const d = shapes[Math.floor(Math.random() * shapes.length)]; S.enemies.push({ id: d.id, glyph: d.glyph, colour: d.colour, hp: d.hp * 10 * Math.pow(1.15, L), max: d.hp * 10 * Math.pow(1.15, L), speed: d.speed * 12, x: -20 - i * 26 - Math.random() * 40, y: 30 + Math.random() * (H - 60), slow: 0, poison: 0, poisonFor: 0, held: 0, name: names[i % names.length] }); }
    note(`Wave ${S.wave}: ${n} shapes at level ${L}. ${shapes.map(s => s.name).join(', ')}.`); }
  function step(dt) { if (S.over || S.paused) return; S.day += dt; S.mana = Math.min(S.manaMax, S.mana + dt); for (const k in S.cool) S.cool[k] = Math.max(0, S.cool[k] - dt);
    S.nextWave -= dt; if (S.nextWave <= 0) { S.nextWave = Math.max(12, D.waveEvery - aiLevel()); spawnWave(); }
    S.nextWedding -= dt; if (S.nextWedding <= 0 && !S.wedding) { S.nextWedding = D.weddingEvery; openWedding(); }
    const shut = (S.cool.gateShut || 0) > 0;
    for (const e of S.enemies) { if (e.dead) continue; if (e.held > 0) { e.held -= dt; continue; } if (e.poisonFor > 0) { e.hp -= e.poison * dt; e.poisonFor -= dt; }
      const sp = e.speed * (e.slow > 0 ? 0.5 : 1) * dt; if (e.slow > 0) e.slow -= dt;
      const taunt = towerList().find(t => t.p.stats.taunt); if (e.id === 'hollow' && taunt) e.y += Math.sign(taunt.y - e.y) * Math.min(Math.abs(taunt.y - e.y), sp * 0.6);
      if (e.id === 'digger' && e.x >= WALLX - DEAD) { e.x = WALLX - DEAD + 2; if (!shut) S.breach += 0.004 * dt * Math.pow(1.05, aiLevel()); continue; }
      e.x += sp; if (e.x >= WALLX - 6) { if (e.id === 'herald') { if (!shut) { S.breach += 2; note('A herald reached the gate with a letter and the garrison believed it. The gate opened.'); } } else if (e.id === 'climber') S.breach += 0.6; else S.breach += shut ? 0 : e.max / 120; e.dead = true; } }
    /* towers shoot */
    for (const t of towerList()) { const s = statsOf(t); if (s.bolt) { if ((t.boltT = (t.boltT || 0) + dt) >= s.boltEvery) { t.boltT = 0; const best = S.enemies.filter(e => !e.dead).sort((a, b) => b.hp - a.hp)[0]; if (best) { best.hp -= s.bolt; S.shots.push({ x1: WALLX + 6, y1: t.y, x2: best.x, y2: best.y, c: t.p.colour, life: .4 }); } } S.towers[t.slot].boltT = t.boltT; continue; }
      if (s.repair) S.breach = Math.max(0, S.breach - s.repair * dt); if (!s.damage) continue;
      t.cd = (t.cd || 0) - dt; if (t.cd > 0) { S.towers[t.slot].cd = t.cd; continue; }
      const inRange = S.enemies.filter(e => !e.dead && Math.hypot(e.x - WALLX, e.y - t.y) <= s.range && (s.dead !== false || e.x < WALLX - DEAD || (S.cool.ward || 0) > 0)); if (!inRange.length) continue;
      const target = inRange.sort((a, b) => b.x - a.x)[0]; let dmg = s.damage; if (s.crit && Math.random() < s.crit) dmg *= s.critMul;
      const hit = e => { e.hp -= dmg; if (s.poison) { e.poison = s.poison * S.garrison; e.poisonFor = s.poisonFor; } if (s.slow) e.slow = s.slowFor; };
      hit(target); if (s.splash) for (const e of inRange) if (e !== target && Math.hypot(e.x - target.x, e.y - target.y) <= s.splash) hit(e);
      S.shots.push({ x1: WALLX + 6, y1: t.y, x2: target.x, y2: target.y, c: t.p.colour, life: .25 }); S.towers[t.slot].cd = 1 / s.rate; }
    for (const e of S.enemies) if (!e.dead && e.hp <= 0) { e.dead = true; S.kills++; credit(Math.round(e.max / 2), `a ${e.id} at level ${aiLevel()}`); }
    S.enemies = S.enemies.filter(e => !e.dead); S.shots.forEach(s => s.life -= dt); S.shots = S.shots.filter(s => s.life > 0);
    if (S.breach >= D.breachMax) { S.over = 'fell'; note(`The wall is breached nine times. Troy falls on day ${Math.floor(S.day)} of ${DAYS}, in year ${Math.floor(S.day / 365) + 1}, against an AI at level ${aiLevel()}.`); }
    if (S.day >= DAYS && !S.over) { S.over = 'held'; note(`Ten years. The wall held against a fleet that was always ${D.ahead} levels ahead. ${S.kills} shapes, ${S.wave} waves, ${S.weddings} weddings.`); } }

  /* -------------------------------------------------------- the weddings */
  function openWedding() { S.weddings++; const last = S.weddings >= D.years; const pool = D.suitors.filter(s => s.id !== 'paris'); const pick = [];
    while (pick.length < 2) { const s = pool[Math.floor(Math.random() * pool.length)]; if (!pick.includes(s)) pick.push(s); }
    const third = last || Math.random() < 0.3 ? D.suitors.find(s => s.id === 'paris') : pool.find(s => !pick.includes(s)); pick.splice(Math.floor(Math.random() * 3), 0, third);
    const aiBid = Math.round(8000 * Math.pow(1.22, aiLevel()) * (0.7 + Math.random() * 0.6));
    S.wedding = { suitors: pick.map(s => s.id), aiBid, chosen: null, last }; note(`A wedding in year ${Math.floor(S.day / 365) + 1}: three suitors behind veils. ${last ? 'The last wedding of the war; one of them is Paris.' : 'One of them may be Paris.'} ${has('helenus') ? 'Helenus lifts the veils.' : ''}`); }
  function bid(idx, amount) { const w = S.wedding; const s = D.suitors.find(x => x.id === w.suitors[idx]); const paid = debit(amount, `a blind bid at a wedding`); if (!paid) return note('The docket cannot cover that bid.');
    if (amount <= w.aiBid) { note(`The fleet bid ${fmt(w.aiBid)} against your ${fmt(amount)}. ${s.name} sails with them; the AI gains a level.`); S.aiBonus++; }
    else { note(`Your ${fmt(amount)} beat the fleet's ${fmt(w.aiBid)}. The veil comes off: ${s.name}. ${s.text}`); const d = s.dowry;
      if (d.kind === 'garrison') S.garrison *= d.x; else if (d.kind === 'slot') S.slots = Math.min(SLOTS, S.slots + 1); else if (d.kind === 'heze') credit(d.x, `${s.name}'s bride price`); else if (d.kind === 'repair') S.breach = Math.max(0, S.breach - d.x); else if (d.kind === 'mana') { S.manaMax += d.x; S.mana += d.x; }
      else if (d.kind === 'upgrade') { const t = towerList()[0]; if (t) S.towers[t.slot].lvl++; } else if (d.kind === 'helen') { S.aiBonus += 2; credit(30000, 'Helen\'s dowry, which is the war'); } }
    S.wedding = null; save(); render(); }

  /* ---------------------------------------------------------------- ui */
  let picked = null;
  const stats = [['heze', 'HEZE'], ['level', 'you · the fleet'], ['breach', 'the wall'], ['wave', 'waves'], ['day', 'the war'], ['mana', 'the reserve']];
  $('#stats').append(...stats.map(([id, label]) => el('div', { class: 'stat', id: 'st-' + id }, el('b', {}, label), el('span'), el('i'))));
  const setStat = (id, v, i) => { const s = $('#st-' + id); s.children[1].textContent = v; s.children[2].textContent = i || ''; };
  function buildPrinces() { const box = $('#princes'); box.innerHTML = ''; for (const p of D.princes) { const built = has(p.id); const cost = p.cost;
      box.append(el('div', { class: 'card' + (picked === p.id ? ' on' : '') + (built ? ' built' : '') + (Dk.heze < cost && !built ? ' locked' : ''), onclick: () => { picked = picked === p.id ? null : p.id; buildPrinces(); $('#spell-hint').textContent = picked ? `${p.name} picked: click an empty slot on the wall.` : ''; } },
        el('h3', {}, `${p.glyph} ${p.name}`, el('span', {}, built ? 'on the wall' : `${fmt(cost)} HEZE`)), el('p', {}, `${p.kind} · reach ${p.stats.range} · ${p.stats.damage ? p.stats.damage + ' × ' + p.stats.rate + '/day' : 'no bow'}${p.stats.dead === false ? ' · blind to the dead ground' : p.stats.dead ? ' · sees the dead ground' : ''}`), el('p', {}, p.does))); } }
  function buildSpells() { const box = $('#spells'); box.innerHTML = ''; for (const sp of D.spells) { const cd = S.cool[sp.id] || 0; box.append(el('div', { class: 'spell' }, el('button', { disabled: (cd > 0 || S.mana < sp.cost || S.over) ? 'true' : null, onclick: () => cast(sp), title: sp.does }, el('b', {}, sp.glyph), ` ${sp.name}`), el('small', {}, cd > 0 ? `${Math.ceil(cd)}d` : `${sp.cost} · ${sp.cooldown}d`))); } }
  function cast(sp) { if (S.mana < sp.cost || (S.cool[sp.id] || 0) > 0) return; const live = S.enemies.filter(e => !e.dead); const strongest = live.sort((a, b) => b.hp - a.hp)[0], nearest = live.sort((a, b) => b.x - a.x)[0];
    if (sp.id === 'bolt') { if (!nearest) return; nearest.hp -= 40 * Math.pow(1.15, aiLevel()); } else if (sp.id === 'unmake') { if (!strongest) return; strongest.hp = 0; } else if (sp.id === 'bind') { if (!nearest) return; nearest.held = 10; }
    else if (sp.id === 'ward') S.cool.ward = 6; else if (sp.id === 'gate') S.cool.gateShut = 14; else if (sp.id === 'summon') { for (const e of live) if (e.x > WALLX - 160) e.hp -= 15 * Math.pow(1.15, aiLevel()); }
    S.mana -= sp.cost; S.cool[sp.id] = sp.cooldown; note(`${sp.name}: ${sp.does}`); render(); }
  function buildWedding() { const box = $('#wedding'); box.innerHTML = ''; const w = S.wedding; if (!w) return box.append(el('p', { style: 'color:var(--dim);margin:0' }, `${S.weddings} held. The next in ${Math.ceil(S.nextWedding)} days. The fleet bids at its level; bid more than it does without knowing who is behind the veil.`));
    const seer = has('helenus'); box.append(el('p', { style: 'color:var(--dim);margin:0 0 6px' }, `${w.last ? 'The last wedding. One veil is Paris.' : 'Three veils.'} ${seer ? 'Helenus names them.' : 'Helenus is not on the wall; you bid blind.'}`));
    const inp = el('input', { type: 'number', min: 1000, step: 1000, value: Math.min(Dk.heze, 12000) });
    w.suitors.forEach((id, i) => { const s = D.suitors.find(x => x.id === id); box.append(el('div', { class: 'card veil', onclick: () => bid(i, +inp.value) }, el('h3', {}, seer ? `${s.name}` : `Suitor ${'ABC'[i]}, veiled`, el('span', {}, 'bid on this one')), el('p', {}, seer ? s.text : 'A dowry you cannot see.'))); });
    box.append(el('div', { class: 'row', style: 'margin-top:6px' }, el('span', { class: 'badge' }, 'your bid'), inp, el('span', { class: 'badge hot' }, 'the fleet bids blind too'))); }
  function buildFleet() { const L = aiLevel(); const shapes = D.demons.filter(d => d.wave <= Math.max(1, L)); $('#fleet').innerHTML = `<p style="margin:0;color:var(--dim)">Level ${L} (you are ${playerLevel()}, it is always ${D.ahead} ahead${S.aiBonus ? ', and ' + S.aiBonus + ' more from the weddings' : ''}). Next wave in ${Math.ceil(S.nextWave)} days: ${3 + L} shapes from ${shapes.map(s => s.glyph + ' ' + s.name).join(', ')}. ${has('helenus') ? 'Helenus: the largest will be a ' + shapes[shapes.length - 1].name + '.' : ''}</p>` + shapes.map(s => `<p style="margin:4px 0 0;font-size:11.5px;color:var(--dim)"><b style="color:${s.colour}">${s.glyph} ${s.name}</b> · ${s.trait}</p>`).join(''); }
  function render() { setStat('heze', fmt(Dk.heze), 'the shared docket'); setStat('level', `${playerLevel()} · ${aiLevel()}`, `${D.ahead} ahead${S.aiBonus ? ' +' + S.aiBonus : ''}`); setStat('breach', `${S.breach.toFixed(1)} / ${D.breachMax}`, S.breach > 6 ? 'nearly through' : 'breaches'); setStat('wave', S.wave, `${S.kills} shapes down`);
    setStat('day', S.over === 'held' ? 'held ten years' : S.over ? 'Troy fell' : `year ${Math.floor(S.day / 365) + 1} of ${D.years}`, `day ${Math.floor(S.day)} of ${DAYS}${S.paused ? ' · paused' : ''}`); setStat('mana', `${Math.floor(S.mana)} / ${S.manaMax}`, 'one a day');
    buildPrinces(); buildSpells(); buildWedding(); buildFleet(); $('#log').innerHTML = S.log.map(l => `<div><b>d${l.t}</b>${l.m}</div>`).join(''); $('#clock').textContent = `${Object.keys(S.towers).length} of ${S.slots} slots · ${S.weddings} weddings`; $('#pause').textContent = S.paused ? 'Resume' : 'Pause'; }
  $('#pause').onclick = () => { S.paused = !S.paused; render(); }; $('#wipe').onclick = () => { if (confirm('Start the siege again? The wall, the towers and the weddings go; the docket stays.')) { S = fresh(); S.treasury = true; save(); render(); } };

  /* --------------------------------------------------------------- field */
  const cv = $('#field'), g = cv.getContext('2d');
  cv.onclick = ev => { const r = cv.getBoundingClientRect(); const x = (ev.clientX - r.left) * W / r.width, y = (ev.clientY - r.top) * H / r.height; if (x < WALLX - 20) return; let slot = 0, best = 1e9; for (let i = 0; i < SLOTS; i++) { const d = Math.abs(slotY(i) - y); if (d < best) { best = d; slot = i; } } if (best > 14) return;
    const t = S.towers[slot]; if (t) { const p = prince(t.id); const cost = Math.round(p.cost * Math.pow(p.upgradeMul, t.lvl)); if (confirm(`Upgrade ${p.name} to ${t.lvl + 1} for ${fmt(cost)} HEZE?`) && debit(cost, `${p.name} to ${t.lvl + 1}`)) { t.lvl++; note(`${p.name} stands taller: level ${t.lvl}.`); } save(); render(); return; }
    if (!picked) return $('#spell-hint').textContent = 'Pick a prince first.'; if (slot >= S.slots) return $('#spell-hint').textContent = 'That slot is not yours yet; a suitor could bring it.'; if (has(picked)) return $('#spell-hint').textContent = 'He is already on the wall.';
    const p = prince(picked); if (!debit(p.cost, p.name)) return $('#spell-hint').textContent = 'Not enough HEZE.'; S.towers[slot] = { id: picked, lvl: 1 }; note(`${p.name} takes slot ${slot + 1}. ${p.text}`); picked = null; $('#spell-hint').textContent = ''; save(); render(); };
  function draw(t) { g.fillStyle = '#0e1a24'; g.fillRect(0, 0, W, H); g.fillStyle = '#1e3a2a'; g.fillRect(0, 0, WALLX - DEAD, H); g.fillStyle = (S.cool.ward || 0) > 0 ? '#3a3020' : '#2a2018'; g.fillRect(WALLX - DEAD, 0, DEAD, H);
    g.fillStyle = '#6b5a3a'; g.fillRect(WALLX, 0, W - WALLX, H); g.fillStyle = (S.cool.gateShut || 0) > 0 ? '#c9583a' : '#3a2a18'; g.fillRect(WALLX, H / 2 - 22, 12, 44);
    g.fillStyle = 'rgba(239,233,220,.35)'; g.font = '10px system-ui'; g.textAlign = 'left'; g.fillText('dead ground · 8.3 m', WALLX - DEAD + 4, H - 6); g.fillText('the plain · the fleet lands on the left', 8, H - 6);
    for (let i = 0; i < SLOTS; i++) { const y = slotY(i), mine = i < S.slots, tw = S.towers[i]; g.fillStyle = mine ? (tw ? '#8a7a5a' : '#4a3d2a') : '#2a2420'; g.fillRect(WALLX + 18, y - 9, 18, 18);
      if (tw) { const p = prince(tw.id); g.fillStyle = p.colour; g.font = '15px system-ui'; g.textAlign = 'center'; g.fillText(p.glyph, WALLX + 27, y + 6); if (tw.lvl > 1) { g.font = '9px system-ui'; g.fillStyle = '#efe9dc'; g.fillText(tw.lvl, WALLX + 44, y + 3); }
        if (picked === null && Math.abs((mouseY || -99) - y) < 10) { const s = statsOf({ slot: i, ...tw, p, y }); g.strokeStyle = 'rgba(242,201,138,.35)'; g.beginPath(); g.arc(WALLX, y, s.range, 0, 7); g.stroke(); } } }
    if (picked !== null) { const p = prince(picked); g.strokeStyle = 'rgba(242,201,138,.25)'; g.setLineDash([4, 4]); g.beginPath(); g.arc(WALLX, mouseY || H / 2, p.stats.range, 0, 7); g.stroke(); g.setLineDash([]); }
    for (const e of S.enemies) { g.font = '16px system-ui'; g.textAlign = 'center'; g.fillStyle = e.held > 0 ? '#7fc5e8' : e.colour; g.fillText(e.glyph, e.x, e.y + 6); g.fillStyle = '#2b3445'; g.fillRect(e.x - 10, e.y - 14, 20, 3); g.fillStyle = e.poisonFor > 0 ? '#7fa85a' : '#e06f5a'; g.fillRect(e.x - 10, e.y - 14, 20 * Math.max(0, e.hp / e.max), 3); }
    for (const s of S.shots) { g.strokeStyle = s.c; g.globalAlpha = Math.min(1, s.life * 4); g.beginPath(); g.moveTo(s.x1, s.y1); g.lineTo(s.x2, s.y2); g.stroke(); g.globalAlpha = 1; }
    if (S.over) { g.fillStyle = 'rgba(11,13,18,.6)'; g.fillRect(0, 0, W, H); g.fillStyle = '#f2c98a'; g.font = '26px system-ui'; g.textAlign = 'center'; g.fillText(S.over === 'held' ? 'The wall held. Ten years.' : 'Troy has fallen.', W / 2, H / 2); }
    requestAnimationFrame(draw); }
  let mouseY = null; cv.onmousemove = ev => { const r = cv.getBoundingClientRect(); mouseY = (ev.clientY - r.top) * H / r.height; };

  render(); requestAnimationFrame(draw);
  let last = performance.now(); setInterval(() => { const now = performance.now(); step(Math.min(0.5, (now - last) / 1000)); last = now; }, 100);
  setInterval(render, 1000); setInterval(save, 5000); addEventListener('beforeunload', save);
})();

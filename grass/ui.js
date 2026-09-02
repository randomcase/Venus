/* ui.js — the meadow's room. Reads the rules (inline or def.json), keeps the
   save, draws the meadow, and lays the engine's API out as tabs. */
(async function () {
  const $ = s => document.querySelector(s), el = (t, a = {}, ...kids) => { const e = document.createElement(t); for (const [k, v] of Object.entries(a)) { if (v == null) continue; k === 'html' ? e.innerHTML = v : k.startsWith('on') ? e[k] = v : e.setAttribute(k, v); }; kids.forEach(k => e.append(k)); return e; };
  const isExt = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;
  const store = {
    get: async k => isExt ? (await chrome.storage.local.get(k))[k] : (() => { try { return localStorage.getItem(k); } catch (e) { return null; } })(),
    set: async (k, v) => isExt ? chrome.storage.local.set({ [k]: v }) : (() => { try { localStorage.setItem(k, v); } catch (e) {} })(),
    del: async k => isExt ? chrome.storage.local.remove(k) : (() => { try { localStorage.removeItem(k); } catch (e) {} })(),
  };
  const inline = document.getElementById('tick-def');
  const shipped = inline ? JSON.parse(inline.textContent) : await fetch('def.json').then(r => r.json());
  let def = shipped; const ov = await store.get('grass.def'); if (ov) { try { def = JSON.parse(ov); } catch (e) {} }
  Tick.load(def, (await store.get('grass.save')) || null);
  Tick.catchUp();
  let D = Tick.def(), S = Tick.state();

  const fmt = n => { n = +n || 0; const a = Math.abs(n); if (a < 1e3) return a < 10 && n % 1 ? n.toFixed(2) : a < 100 && n % 1 ? n.toFixed(1) : Math.round(n).toString();
    const u = [['k', 1e3], ['M', 1e6], ['B', 1e9], ['T', 1e12]]; for (let i = u.length - 1; i >= 0; i--) if (a >= u[i][1]) return (n / u[i][1]).toFixed(a / u[i][1] < 10 ? 2 : 1) + u[i][0]; return n.toExponential(2); };
  const rname = id => (D.resources.find(r => r.id === id) || { name: id }).name;
  const costStr = c => Object.entries(c).map(([r, v]) => `${fmt(v)} ${rname(r)}`).join(' · ');
  const costCls = c => Tick.can(c) ? 'ok' : 'bad';
  $('#tagline').textContent = D.tagline;

  /* ---------------------------------------------------------------- tabs */
  const TABS = [['bank', 'The meadow'], ['assize', D.ship.name], ['protocols', 'Sayings'], ['reaches', 'Chapters'], ['fork', D.prestige.name], ['you', D.becoming ? 'Your form' : 'Your blade'], ['workshop', 'Workshop'], ['log', 'Log']];
  const panels = {}; let tab = 'bank';
  for (const [id, name] of TABS) { const b = el('button', { onclick: () => show(id) }, name); b.dataset.tab = id; $('#nav').append(b); panels[id] = el('div', { class: 'panel', id: 'p-' + id }); $('#panels').append(panels[id]); }
  function show(id) { tab = id; document.querySelectorAll('nav button').forEach(b => b.classList.toggle('on', b.dataset.tab === id)); Object.entries(panels).forEach(([k, p]) => p.classList.toggle('on', k === id)); build[id] && build[id](); }
  try { const last = localStorage.getItem('grass.tab'); if (last && panels[last]) tab = last; } catch (e) {}

  /* --------------------------------------------------------------- stats */
  const stats = {};
  function statCard(id, label) { const s = el('div', { class: 'stat' }, el('b', {}, label), el('span'), el('i'), el('div', { class: 'bar' }, el('div'))); stats[id] = s; $('#stats').append(s); }
  statCard('primary', rname(D.primary)); if (D.stillness) statCard('still', 'stillness'); statCard('power', D.powerName); statCard('acres', D.lift.name); statCard('crew', D.crew.name); statCard('ship', D.ship.name); statCard('tide', 'the sky');
  if (D.becoming) statCard('form', 'your form'); if (D.forest) statCard('forest', 'the forest'); if (D.mycelium) statCard('myc', 'the mycelium');
  const setStat = (id, v, i, bar, warn) => { const s = stats[id]; s.children[1].textContent = v; s.children[2].textContent = i || ''; const b = s.children[3].firstChild; if (bar == null) s.children[3].style.display = 'none'; else { s.children[3].style.display = ''; b.style.width = Math.min(100, bar * 100) + '%'; b.classList.toggle('warn', !!warn); } };

  /* ----------------------------------------------------------------- bank */
  let mult = 1, sig = '';
  const signature = () => S.sectors.join() + '|' + S.research.join() + '|' + Object.keys(Tick.mods().unlock).join() + '|' + S.playstyle + '|' + S.refloats + '|' + S.ring + ':' + S.form;
  const build = {};
  build.bank = () => {
    const p = panels.bank; p.innerHTML = '';
    p.append(el('button', { id: 'tap', class: 'act', onclick: () => { Tick.tap(); refresh(); } }, tapLabel()));
    const seg = el('div', { class: 'row' }, el('span', { style: 'color:var(--dim)' }, 'let'), el('div', { class: 'seg' }, ...[1, 10, 'max'].map(k => el('button', { class: k === mult ? 'on' : '', onclick: () => { mult = k; build.bank(); } }, '×' + k))));
    p.append(seg);
    for (const s of D.sectors) { if (!S.sectors.includes(s.id)) continue;
      const ms = D.machines.filter(m => m.sector === s.id && Tick.available(m)); if (!ms.length) continue;
      const sec = el('section', {}, el('h2', {}, s.name, el('i', {}, s.role)));
      for (const m of ms) { const b = el('button', { class: 'act m', onclick: () => { Tick.buy(m.id, mult); refresh(); } }, el('b', {}, m.name), el('span', { class: 'n' }), el('i', {}, m.desc + ' ', el('span', { class: 'r' }), el('br'), el('span', { class: 'cost' }))); b.dataset.m = m.id; sec.append(b); }
      p.append(sec); }
    if (!S.playstyle && D.playstyles) p.append(playstyleModal());
    sig = signature();
  };
  function playstyleModal() {
    const m = el('div', { class: 'modal' }, el('div', {}, el('h2', {}, 'Who stays as your guest?'), el('p', {}, 'A guest is a template: a set of multipliers and a few things only they know how to let happen. You choose one at the first blade and again at every return.'),
      el('div', { class: 'grid' }, ...D.playstyles.map(ps => el('div', { class: 'card' }, el('h3', {}, ps.name), el('p', {}, ps.desc), el('button', { class: 'act', onclick: () => { Tick.setPlaystyle(ps.id); build.bank(); } }, 'Take it'))))));
    return m;
  }
  function refreshBank() { const M = Tick.mods(), L = Tick.lift();
    for (const b of panels.bank.querySelectorAll('.m')) { const m = D.machines.find(x => x.id === b.dataset.m); let k = mult === 'max' ? Math.max(1, Tick.maxBuy(m)) : mult; const c = Tick.cost(m, k);
      b.children[1].textContent = S.n[m.id]; const r = b.querySelector('.r'), cs = b.querySelector('.cost');
      const outs = Object.entries(m.out || {}).map(([res, q]) => `${fmt(q * (M.machine[m.id] || 1) * M.all * (res === 'power' ? 1 : (M.res[res] || 1) * Tick.calm()))} ${res === 'power' ? D.powerName : rname(res)}/s`);
      const ins = Object.entries(m.in || {}).map(([res, q]) => `−${fmt(q)} ${rname(res)}/s`);
      r.textContent = [...outs, ...ins, m.lift ? `+${fmt(m.lift * M.lift)} ${D.lift.name}` : '', m.draw ? `${fmt(m.draw * M.draw)} ${D.powerName}` : '', m.crew ? `${fmt(m.crew * M.crewNeed)} ${D.crew.name}` : '', m.mass ? `${m.mass} ${D.lift.name}` : ''].filter(Boolean).join(' · ');
      const room = L.used + (m.mass || 0) * k <= L.cap; cs.textContent = `×${k}: ${costStr(c)}` + (room ? '' : ` · no ${D.lift.name}`); cs.className = 'cost ' + (Tick.can(c) && room ? 'ok' : 'bad'); b.disabled = !(Tick.can(c) && room); }
    const t = $('#tap'); if (t) t.textContent = tapLabel(); }
  const tapLabel = () => { const M = Tick.mods(); return `Act · +${fmt(D.tap * M.tap * M.all)} ${rname(D.primary)}` + (D.stillness ? ` · costs ${D.stillness.tapCost} stillness` : ''); };

  /* --------------------------------------------------------------- assize */
  build.assize = () => { const p = panels.assize; p.innerHTML = '';
    p.append(el('section', {}, el('h2', {}, D.ship.name), el('p', { style: 'color:var(--dim);margin:0 0 8px' }, D.ship.note), el('div', { id: 'ship-status' })));
    const sec = el('section', {}, el('h2', {}, 'The order', el('i', {}, `what ${fmt(D.ship.cargo)} kg of hold carries`)));
    for (const k of Object.keys(D.ship.plan)) { const inp = el('input', { type: 'range', min: 0, max: 100, step: 1, value: Math.round((S.plan[k] || 0) * 100) }); inp.dataset.k = k;
      inp.oninput = () => { const plan = {}; for (const i of sec.querySelectorAll('input')) plan[i.dataset.k] = +i.value; Tick.setPlan(plan); refreshAssize(); };
      sec.append(el('label', { class: 'f' }, rname(k), inp, el('output'))); }
    p.append(sec);
    p.append(el('section', {}, el('h2', {}, 'Landed'), el('ul', { id: 'ship-log', style: 'margin:0;padding:0' })));
    refreshAssize(); };
  function refreshAssize() { if (tab !== 'assize') return; const M = Tick.mods(), cargo = D.ship.cargo * M.cargo, st = $('#ship-status'); if (!st) return;
    const locked = !!S.ship.manifest, t = S.ship.t;
    st.innerHTML = `<div class="badge ${locked ? 'hot' : ''}">${D.ship.name} ${S.ship.n}</div> <div class="badge">lands in ${Math.ceil(t)} d</div> <div class="badge">${locked ? 'loaded, order locked' : 'loads in ' + Math.ceil(t - D.ship.lock) + ' d, order open'}</div> <div class="badge">hold ${fmt(cargo)} kg</div>`;
    const man = S.ship.manifest || S.plan;
    for (const i of panels.assize.querySelectorAll('input[type=range]')) { const k = i.dataset.k, f = man[k] || 0, kg = cargo * f; i.disabled = false;
      i.nextElementSibling.textContent = k === 'crew' ? `${Math.floor(kg / (D.ship.crewMass * M.crewMass))} seats` : `${fmt(kg)} ${rname(k)}`; }
    const ul = $('#ship-log'); ul.innerHTML = S.log.filter(l => l.m.startsWith(D.ship.name)).slice(0, 8).map(l => `<li><b>d${l.t}</b>${l.m}</li>`).join(''); ul.id = 'ship-log'; ul.classList.add('loglist'); }

  /* ------------------------------------------------------------ protocols */
  build.protocols = () => { const p = panels.protocols; p.innerHTML = ''; const g = el('div', { class: 'grid' });
    for (const r of D.research) { const done = S.research.includes(r.id), needs = (r.needs || []).filter(x => !S.research.includes(x)), shut = (r.excludes || []).some(x => S.research.includes(x));
      const c = el('div', { class: 'card' + (done ? ' done' : '') }, el('h3', {}, r.name), el('p', {}, r.desc), needs.length ? el('p', {}, 'needs ' + needs.map(x => D.research.find(y => y.id === x).name).join(', ')) : '',
        r.excludes ? el('p', {}, (shut ? 'closed by ' : 'closes ') + r.excludes.map(x => D.research.find(y => y.id === x).name).join(', ')) : '',
        el('button', { class: 'act', disabled: done || needs.length || shut ? true : undefined, onclick: () => { Tick.research(r.id); refresh(); } }, done ? 'known' : shut ? 'closed' : `${fmt(Tick.researchCost(r))} ${rname('science')}`)); c.dataset.r = r.id; g.append(c); }
    p.append(el('section', {}, el('h2', {}, 'Sayings', el('i', {}, `bought with ${rname('science')}; the quiet pool makes it`)), g)); };
  function refreshProtocols() { for (const c of panels.protocols.querySelectorAll('.card')) { const r = D.research.find(x => x.id === c.dataset.r); const b = c.querySelector('button'); if (S.research.includes(r.id)) continue; const needs = (r.needs || []).some(x => !S.research.includes(x)) || (r.excludes || []).some(x => S.research.includes(x)); b.disabled = needs || S.res.science < Tick.researchCost(r); } }

  /* -------------------------------------------------------------- reaches */
  build.reaches = () => { const p = panels.reaches; p.innerHTML = ''; const g = el('div', { class: 'grid' });
    for (const s of D.sectors) { const built = S.sectors.includes(s.id); const cost = { ...(s.cost || {}) }; const crew = cost.crew || 0; delete cost.crew;
      const c = el('div', { class: 'card' + (built ? ' done' : '') }, el('h3', {}, s.name, ' ', el('span', { class: 'badge' }, s.role)), el('p', {}, s.desc),
        s.needs ? el('p', {}, 'after ' + s.needs.map(x => D.sectors.find(y => y.id === x).name).join(' and ')) : '',
        s.effects ? el('p', {}, s.effects.map(e => `${e.target} ×${e.x}`).join(', ')) : '',
        built ? el('span', { class: 'badge hot' }, 'reached') : el('button', { class: 'act', onclick: () => { Tick.build(s.id); refresh(); } }, `${costStr(cost)}${crew ? ' · ' + crew + ' ' + D.crew.name : ''}`));
      c.dataset.s = s.id; g.append(c); }
    p.append(el('section', {}, el('h2', {}, 'Twelve chapters', el('i', {}, 'in the order they have to be reached in')), g)); };
  function refreshReaches() { for (const c of panels.reaches.querySelectorAll('.card')) { const s = D.sectors.find(x => x.id === c.dataset.s); const b = c.querySelector('button'); if (!b) continue; const cost = { ...(s.cost || {}) }; const crew = cost.crew || 0; delete cost.crew; b.disabled = !(Tick.sectorOk(s) && Tick.can(cost) && S.res.crew >= crew); } }

  /* ----------------------------------------------------------------- fork */
  build.fork = () => { const p = panels.fork; p.innerHTML = ''; const P = D.prestige;
    p.append(el('section', {}, el('h2', {}, P.name), el('p', { style: 'color:var(--dim)' }, P.note), el('div', { id: 'fork-status' })));
    const g = el('div', { class: 'grid' });
    for (const d of P.doctrines) g.append(el('div', { class: 'card' }, el('h3', {}, d.name, S.doctrines[d.id] ? el('span', { class: 'badge hot' }, '×' + S.doctrines[d.id]) : ''), el('p', {}, d.desc), el('button', { class: 'act', onclick: () => { if (confirm(`${P.name}, keeping "${d.name}"? The meadow goes back to one blade.`)) { Tick.refloat(d.id); S = Tick.state(); refresh(true); show('bank'); } } }, 'Return, keeping this')));
    p.append(el('section', {}, el('h2', {}, 'What you keep close'), g)); };
  function refreshFork() { const st = $('#fork-status'); if (!st) return; const ok = Tick.canRefloat();
    st.innerHTML = `<span class="badge ${ok ? 'hot' : ''}">${ok ? 'the root is ready' : 'needs ' + D.sectors.find(s => s.id === D.prestige.requires).name + ' and ' + fmt(D.prestige.min) + ' ' + rname(D.primary) + ' all time'}</span> <span class="badge">root ${S.ballast} → +${Tick.refloatPoints()}</span> <span class="badge">everything ×${(1 + D.prestige.perPoint * S.ballast).toFixed(1)} now</span> <span class="badge">returns ${S.refloats}</span>`;
    panels.fork.querySelectorAll('.card button').forEach(b => b.disabled = !ok); }

  /* ------------------------------------------------------------------ you */
  build.you = () => { const p = panels.you; p.innerHTML = '';
    if (D.becoming) { const fd = Tick.formDef(), next = Tick.nextForm();
      p.append(el('section', {}, el('h2', {}, 'Your form', el('i', {}, D.becoming.note)),
        el('div', { class: 'row', style: 'justify-content:flex-start' }, el('span', { class: 'badge hot' }, `ring ${S.ring}`), el('span', { class: 'badge' }, `form ${S.form + 1} of ${Tick.formsPerRing()}`), el('span', { class: 'badge' }, `${S.acorns} acorn${S.acorns === 1 ? '' : 's'}`), el('span', { class: 'badge' }, `${S.formsDone} becoming${S.formsDone === 1 ? '' : 's'}`), el('span', { class: 'badge' }, `+${Math.round((D.becoming.perForm * S.formsDone + D.becoming.perRing * (S.ring - 1)) * 100)}% for good`)),
        el('h3', { style: 'margin:8px 0 2px;font-size:16px' }, fd.name), el('p', { style: 'color:var(--dim);margin:0 0 8px' }, fd.text || 'it is what it is'),
        el('p', { style: 'margin:0 0 4px' }, `To become ${next.name} (${next.text || ''}):`), el('ul', { id: 'conds', style: 'margin:0 0 8px;padding-left:18px;color:var(--dim)' }),
        el('button', { id: 'become', class: 'act', style: 'width:100%;text-align:center', onclick: () => { Tick.become(); refresh(true); } }, `Become ${next.name}`))); }
    if (D.forest) { const ft = Tick.forestTier(); p.append(el('section', {}, el('h2', {}, 'The forest', el('i', {}, D.forest.note)), el('p', { style: 'color:var(--dim);margin:0' }, `${S.trees} tree${S.trees === 1 ? '' : 's'} · ${ft.name}${ft.next ? ` · ${ft.next.name} at ${fmt(ft.next.at)}` : ''} · +${Math.round(D.forest.perTree * 100)}% each and +${Math.round(D.forest.tierBonus * 100)}% per tier · ${fmt(D.forest.ground)} ground each · ${Object.entries(D.forest.natural || {}).map(([r, q]) => `${q} ${rname(r)}/s each`).join(', ')}`))); }
    if (D.mycelium) p.append(el('section', {}, el('h2', {}, 'The mycelium', el('i', {}, D.mycelium.note)), el('p', { style: 'color:var(--dim);margin:0' }, `${Tick.depthName()} · depth ${S.depth} · ${fmt(S.spores)} spores · next depth at ${fmt(Tick.depthNeed(S.depth + 1))} · fruits every ${D.mycelium.every} days and takes ${Math.round(D.mycelium.tribute * 100)}% of the ${rname(D.primary)} as tribute · +${Math.round(D.mycelium.perLevel * 100)}% per depth`)));
    refreshYou(); if (!D.avatar) return;
    const form = el('div'); const cv = el('canvas', { id: 'you-canvas', width: 300, height: 420 });
    for (const f of D.avatar.fields) { const v = S.avatar[f.id]; let inp;
      if (f.type === 'text') inp = el('input', { type: 'text', value: v || '', oninput: e => set(f.id, e.target.value) });
      else if (f.type === 'range') { inp = el('input', { type: 'range', min: f.min, max: f.max, value: v, oninput: e => { set(f.id, +e.target.value); e.target.nextElementSibling.textContent = e.target.value; } }); }
      else if (f.type === 'color') inp = el('div', { class: 'sw' }, ...f.options.map(c => el('button', { style: 'background:' + c, class: c === v ? 'on' : '', title: c, onclick: e => { set(f.id, c); [...e.target.parentNode.children].forEach(x => x.classList.toggle('on', x === e.target)); } })));
      else inp = el('select', { onchange: e => set(f.id, e.target.value) }, ...f.options.map(o => el('option', { value: o, selected: o === v ? '' : undefined }, o)));
      form.append(el('label', { class: 'f' }, f.name, inp, el('output', {}, f.type === 'range' ? v : ''))); }
    function set(k, v) { Tick.setAvatar({ [k]: v }); drawYou(); }
    p.append(el('section', {}, el('h2', {}, D.becoming ? 'Its colours' : 'Your blade', el('i', {}, D.avatar.note)), el('div', { class: 'avatar-wrap' }, cv, form)));
    p.append(el('section', {}, el('h2', {}, 'Playstyle'), el('p', { style: 'color:var(--dim)' }, (() => { const ps = S.playstyle && (D.playstyles || []).find(x => x.id === S.playstyle); return ps ? ps.name + ' — ' + ps.desc : S.playstyle ? S.playstyle + ' — not in this template' : 'not chosen yet'; })())));
    drawYou(); };
  function refreshYou() { const ul = $('#conds'); if (!ul || !D.becoming) return; ul.innerHTML = Tick.conditions().map(c => `<li class="${c.ok ? 'ok' : ''}">${fmt(c.have)} / ${fmt(c.need)} ${c.label}</li>`).join(''); const b = $('#become'); if (b) b.disabled = !Tick.canBecome(); }
  function drawYou(t = 0) { const cv = $('#you-canvas'); if (!cv) return; const g = cv.getContext('2d'); g.clearRect(0, 0, cv.width, cv.height);
    const bg = g.createLinearGradient(0, 0, 0, cv.height); bg.addColorStop(0, '#12263a'); bg.addColorStop(1, '#1e3b2a'); g.fillStyle = bg; g.fillRect(0, 0, cv.width, cv.height); g.fillStyle = '#3a5a3a'; g.fillRect(0, cv.height - 40, cv.width, 40); drawForm(g, cv.width / 2, cv.height - 40, 1.5, S, t); }
  function drawBlade(g, x, y, s, a, t = 0) { /* the blade, from the template. Nothing on it looks back. */
    const H = s * (10 + (+a.height || 40) * 1.1), wd = { fine: 2, narrow: 3.5, broad: 6, flat: 8 }[a.width] || 3.5, w0 = wd * s;
    const wind = { still: .2, swaying: 1, restless: 2.2 }[a.mood] || 1, lean = { upright: 0, leaning: .18, bowed: .45, 'wind-bent': .3 }[a.lean] || 0;
    const nb = { 'one blade': 1, three: 3, five: 5, 'a tuft': 9 }[a.clump] || 1, green = a.green || '#9ad36a', tip = a.tip || '#e8e0a0';
    const root = a.root || 'bare earth';
    if (root === 'moss') { g.fillStyle = '#4f7a4a'; g.beginPath(); g.ellipse(x, y, 14 * s, 4 * s, 0, 0, 7); g.fill(); }
    if (/shell|cowrie|pearl|stone/.test(root)) { g.fillStyle = root.includes('pearl') ? '#f4f0ff' : root.includes('stone') ? '#8a8a90' : '#f2c98a'; const k = root.includes('lot') ? 5 : 1; for (let i = 0; i < k; i++) { g.beginPath(); g.ellipse(x + (i - (k - 1) / 2) * 7 * s + 6 * s, y + 1 * s, 3 * s, 2.2 * s, 0, 0, 7); g.fill(); } }
    for (let i = 0; i < nb; i++) { const off = nb === 1 ? 0 : (i - (nb - 1) / 2) * 3.2 * s, hh = H * (nb === 1 ? 1 : .7 + ((i * 37) % 10) / 20), ph = i * 1.3;
      const sway = Math.sin(t / (900 - wind * 200) + ph) * wind * .08 + lean + (nb === 1 ? 0 : off / (30 * s));
      const cx = x + off + sway * hh * .6, cy = y - hh * .55, tx = x + off + sway * hh * 1.4, ty = y - hh * (1 - Math.abs(sway) * .25);
      const grd = g.createLinearGradient(0, y, 0, ty); grd.addColorStop(0, green); grd.addColorStop(.75, green); grd.addColorStop(1, tip); g.fillStyle = grd;
      g.beginPath(); g.moveTo(x + off - w0, y); g.quadraticCurveTo(cx - w0 * .6, cy, tx, ty); g.quadraticCurveTo(cx + w0 * .6, cy, x + off + w0, y); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = Math.max(.6, .5 * s); g.beginPath(); g.moveTo(x + off, y); g.quadraticCurveTo(cx, cy, tx, ty); g.stroke();
      if (a.dew && a.dew !== 'none') { g.fillStyle = 'rgba(220,240,255,.75)'; const nd = a.dew === 'heavy' ? 5 : 2; for (let d = 1; d <= nd; d++) { const u = d / (nd + 1), px = (1 - u) * (1 - u) * (x + off) + 2 * (1 - u) * u * cx + u * u * tx, py = (1 - u) * (1 - u) * y + 2 * (1 - u) * u * cy + u * u * ty; g.beginPath(); g.ellipse(px + w0 * .4, py, 1.1 * s, 1.6 * s, 0, 0, 7); g.fill(); } }
      const head = a.head || 'none'; if (head !== 'none' && (nb === 1 || i % 2 === 0)) { const hc = a.headColor || '#e8d9a0'; g.fillStyle = hc; g.strokeStyle = hc;
        if (head === 'wheat ear') for (let k = 0; k < 7; k++) { g.beginPath(); g.ellipse(tx + (k % 2 ? 1 : -1) * 2.2 * s, ty + 4 * s + k * 3 * s, 2 * s, 3 * s, 0, 0, 7); g.fill(); }
        if (head === 'foxtail plume') { g.lineWidth = .8 * s; for (let k = 0; k < 18; k++) { const yy = ty + 2 * s + k * 1.6 * s; g.beginPath(); g.moveTo(tx, yy); g.lineTo(tx + ((k % 2) ? 5 : -5) * s, yy - 4 * s); g.stroke(); } }
        if (head === 'oat panicle') { g.lineWidth = .7 * s; for (let k = 0; k < 5; k++) { const yy = ty + 6 * s + k * 5 * s, dx = ((k % 2) ? 1 : -1) * (6 + k) * s; g.beginPath(); g.moveTo(tx, yy); g.lineTo(tx + dx, yy + 5 * s); g.stroke(); g.beginPath(); g.ellipse(tx + dx, yy + 6 * s, 1.6 * s, 3 * s, .3, 0, 7); g.fill(); } }
        if (head === 'reed plume') { g.globalAlpha = .8; g.beginPath(); g.ellipse(tx, ty - 6 * s, 4 * s, 12 * s, sway * .5, 0, 7); g.fill(); g.globalAlpha = 1; }
        if (head === 'seed tuft') for (let k = 0; k < 9; k++) { const an = k / 9 * Math.PI * 2; g.beginPath(); g.ellipse(tx + Math.cos(an) * 4 * s, ty - 2 * s + Math.sin(an) * 4 * s, 1.2 * s, 1.2 * s, 0, 0, 7); g.fill(); } } }
    if (a.kind === 'bamboo') { g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = s; for (let k = 1; k < 5; k++) { const yy = y - H * k / 5; g.beginPath(); g.moveTo(x - w0 * 1.2, yy); g.lineTo(x + w0 * 1.2, yy); g.stroke(); } }
    g.fillStyle = 'rgba(239,233,220,.85)'; g.font = `${11 * s / 1.6}px system-ui`; g.textAlign = 'center'; g.fillText(a.name || '', x, y + 16 * s); }

  /* ------------------------------------------------------------- workshop */
  build.workshop = () => { const p = panels.workshop; p.innerHTML = '';
    const ta = el('textarea', { spellcheck: 'false' }); ta.value = JSON.stringify(D, null, 1); const msg = el('p', { style: 'color:var(--dim);margin:4px 0' });
    const btn = (t, f) => el('button', { class: 'act', onclick: async () => { try { msg.textContent = (await f()) || 'done'; } catch (e) { msg.textContent = 'no: ' + e.message; } } }, t);
    p.append(el('section', {}, el('h2', {}, 'The rules', el('i', {}, 'def.json, live. Apply keeps your save; Save as default keeps the rules across reloads.')), ta,
      el('div', { class: 'row' }, btn('Apply', () => { const d = JSON.parse(ta.value); validate(d); Tick.load(d, Tick.serialize()); D = Tick.def(); S = Tick.state(); refresh(true); return 'applied'; }),
        btn('Save as default', async () => { const d = JSON.parse(ta.value); validate(d); await store.set('grass.def', JSON.stringify(d)); Tick.load(d, Tick.serialize()); D = Tick.def(); S = Tick.state(); refresh(true); return 'saved as default'; }),
        btn('Revert to shipped', async () => { await store.del('grass.def'); Tick.load(shipped, Tick.serialize()); D = Tick.def(); S = Tick.state(); ta.value = JSON.stringify(D, null, 1); refresh(true); return 'shipped rules restored'; })), msg));
    const tpl = el('div', { class: 'grid' }), tsec = el('section', {}, el('h2', {}, 'Templates', el('i', {}, 'n0 is the game as shipped. The maybe list holds candidates; starting one begins a new meadow under those rules.')), tpl);
    p.append(tsec);
    fetch('templates/index.json').then(r => r.ok ? r.json() : Promise.reject(new Error('no index'))).then(list => { for (const tp of list) tpl.append(el('div', { class: 'card' + (tp.status === 'default' ? ' done' : '') },
        el('h3', {}, tp.name, ' ', el('span', { class: 'badge' + (tp.status === 'maybe' ? ' hot' : '') }, tp.status)), el('p', {}, tp.desc),
        el('button', { class: 'act', onclick: async () => { if (!confirm(`Start a new meadow under "${tp.name}"? The current save is replaced.`)) return;
          const d = await fetch('templates/' + tp.file).then(r => r.json()); validate(d); await store.set('grass.def', JSON.stringify(d)); await store.del('grass.save');
          Tick.load(d, null); D = Tick.def(); S = Tick.state(); ta.value = JSON.stringify(D, null, 1); refresh(true); show('bank'); } }, 'Start with this'))); })
      .catch(() => tpl.append(el('p', { style: 'color:var(--dim)' }, 'Templates live in grass/templates/ and need the workshop edition (the extension, or the folder served); the flat export carries only its own rules.')));
    p.append(el('section', {}, el('h2', {}, 'Export', el('i', {}, 'one flat HTML with the engine, these rules and this room inlined; it lives in the yard as grass.html and the arcade picks it up')),
      el('div', { class: 'row' }, btn('Export the game (HTML)', async () => { const html = await assemble(); download('grass.html', html, 'text/html'); return `exported ${fmt(html.length)} bytes`; }),
        btn('Download save (JSON)', () => { download('grass-save.json', Tick.serialize(), 'application/json'); }),
        btn('Download rules (JSON)', () => { download('def.json', JSON.stringify(D, null, 1), 'application/json'); }))));
    const imp = el('textarea', { placeholder: 'paste a save here', style: 'min-height:80px' });
    p.append(el('section', {}, el('h2', {}, 'Import / reset'), imp, el('div', { class: 'row' }, btn('Import save', () => { const s = JSON.parse(imp.value); Tick.load(D, s); S = Tick.state(); refresh(true); return 'imported'; }),
      btn('Wipe save', async () => { if (!confirm('Wipe the save?')) return 'kept'; await store.del('grass.save'); Tick.load(D, null); S = Tick.state(); refresh(true); return 'wiped'; }),
      isExt ? btn('Open in a tab', () => { chrome.tabs.create({ url: chrome.runtime.getURL('play.html') }); }) : '')));
    p.append(el('section', {}, el('h2', {}, 'API', el('i', {}, 'window.Tick, from the console or a script; the ScalaFX edition (grass/desktop) serves the same calls over HTTP on 127.0.0.1:7331')),
      el('p', { html: '<code>Tick.state()</code> <code>Tick.def()</code> <code>Tick.mods()</code> <code>Tick.rates()</code> <code>Tick.power()</code> <code>Tick.crew()</code> <code>Tick.lift()</code><br><code>Tick.tap()</code> <code>Tick.buy(id, k|\'max\')</code> <code>Tick.research(id)</code> <code>Tick.build(id)</code> <code>Tick.setPlan({rain,crew,stone,wood})</code> <code>Tick.refloat(rule)</code> <code>Tick.setPlaystyle(id)</code> <code>Tick.setAvatar({kind, green, ...})</code><br><code>Tick.step(dt)</code> <code>Tick.serialize()</code> <code>Tick.load(def, save)</code> <code>Tick.on(\'log\'|\'ship\'|\'change\', fn)</code>', style: 'line-height:1.9' }))); };
  function validate(d) { for (const k of ['resources', 'machines', 'sectors', 'research', 'events', 'milestones', 'prestige', 'ship', 'day', 'lift', 'crew', 'primary']) if (!(k in d)) throw new Error('missing ' + k); if (!d.resources.some(r => r.id === d.primary)) throw new Error('primary is not a resource'); }
  async function assemble() { const files = {}; for (const f of ['play.html', 'engine.js', 'ui.js']) files[f] = await fetch(f).then(r => { if (!r.ok) throw new Error('cannot read ' + f + ' (export from the extension or a server, not from a flat file)'); return r.text(); });
    return Tick.assemble(files, D, { footer: '<footer class="yard"><a href="arcade.html">← the arcade</a> · <a href="index.html">the yard</a> · <a href="grass/play.html">the workshop</a></footer>' }); }
  function download(name, text, type) { const url = URL.createObjectURL(new Blob([text], { type })); if (isExt && chrome.downloads) chrome.downloads.download({ url, filename: name, saveAs: true }); else { const a = el('a', { href: url, download: name }); document.body.append(a); a.click(); a.remove(); } }

  /* ------------------------------------------------------------------ log */
  build.log = () => { panels.log.innerHTML = ''; panels.log.append(el('section', {}, el('h2', {}, 'The record'), el('ul', { id: 'log' }))); refreshLog(); };
  function refreshLog() { const ul = $('#log'); if (!ul) return; ul.innerHTML = S.log.map(l => `<li><b>d${l.t}</b>${l.m}</li>`).join(''); }
  Tick.on('log', () => { if (tab === 'log') refreshLog(); if (tab === 'assize') refreshAssize(); });
  Tick.on('ship', got => { if (isExt && chrome.runtime) chrome.runtime.sendMessage({ type: 'notify', title: D.ship.name + ' has landed', body: Object.entries(got).map(([k, v]) => `${v} ${rname(k)}`).join(', ') }).catch(() => {}); });

  /* -------------------------------------------------------------- refresh */
  function refresh(structural) { S = Tick.state(); D = Tick.def(); const M = Tick.mods();
    if (structural || signature() !== sig) { build[tab] && build[tab](); sig = signature(); }
    const P = Tick.power(), C = Tick.crew(), L = Tick.lift(), R = Tick.rates();
    setStat('primary', fmt(S.res[D.primary]), `${(R[D.primary] || 0) >= 0 ? '+' : ''}${fmt(R[D.primary] || 0)}/s · all ×${M.all.toFixed(2)}`);
    setStat('power', `${fmt(P.sup)} / ${fmt(P.dem)}`, P.eff < 1 ? `brownout: everything at ${Math.round(P.eff * 100)}%` : 'supply / demand', P.dem ? P.sup / P.dem : 1, P.eff < 1);
    setStat('acres', `${fmt(L.used)} / ${fmt(L.cap)}`, L.used / L.cap > .9 ? 'nearly full: clear plots' : 'used / cleared', L.used / L.cap, L.used / L.cap > .9);
    setStat('crew', `${fmt(S.res.crew)}`, `${fmt(C.need)} hands wanted · morale ${Math.round(S.morale * 100)}%`, C.need ? Math.min(1, S.res.crew / C.need) : 1, C.eff < 1 || S.morale < 1);
    setStat('ship', `${Math.ceil(S.ship.t)} d`, S.ship.manifest ? 'the clouds have gathered' : 'still open to what you ask', 1 - S.ship.t / D.ship.cadence);
    if (D.stillness) setStat('still', `${Math.round(S.still)} / ${D.stillness.max}`, `growing at ${Math.round(Tick.calm() * 100)}%`, S.still / D.stillness.max, Tick.calm() < .6);
    const ev = S.events.map(e => D.events.find(x => x.id === e.id).name).join(', ');
    setStat('tide', (Tick.season() ? Tick.season().name + ' · ' : '') + (Tick.isDay() ? D.day.dayName : D.day.nightName), ev || (Tick.isDay() ? 'sun on the grass' : `dark · ${Math.round(M.night * 100)}%`), Tick.phase(), !!ev);
    $('#resline').innerHTML = D.resources.filter(r => r.id !== D.primary && r.id !== 'crew').map(r => `<span><b>${fmt(S.res[r.id])}</b>${isFinite(Tick.cap(r.id)) ? '/' + fmt(Tick.cap(r.id)) : ''} ${r.name}${R[r.id] ? ` <i style="color:${R[r.id] > 0 ? 'var(--ok)' : 'var(--bad)'}">${R[r.id] > 0 ? '+' : ''}${fmt(R[r.id])}</i>` : ''}</span>`).join('');
    $('#clock').textContent = `day ${Math.floor(S.clock)} · ${S.refloats ? 'return ' + S.refloats + ' · ' : ''}${S.playstyle ? 'guest: ' + S.playstyle : 'no guest yet'}${D.becoming ? ' · ring ' + S.ring + ', ' + Tick.formDef().name : ''}`;
    if (D.becoming) { const fd = Tick.formDef(), cs = Tick.conditions(), done = cs.filter(c => c.ok).length; setStat('form', fd.name, `ring ${S.ring} · ${S.acorns} acorn${S.acorns === 1 ? '' : 's'} · ${Tick.canBecome() ? 'ready to become ' + Tick.nextForm().name : done + '/' + cs.length + ' toward ' + Tick.nextForm().name}`, cs.length ? cs.reduce((a, c) => a + Math.min(1, c.have / c.need), 0) / cs.length : 1); }
    if (D.forest) { const ft = Tick.forestTier(); setStat('forest', `${S.trees} tree${S.trees === 1 ? '' : 's'}`, ft.name + (ft.next ? ` · ${ft.next.name} at ${fmt(ft.next.at)}` : ''), ft.next ? S.trees / ft.next.at : 1); }
    if (D.mycelium) { const need = Tick.depthNeed(S.depth + 1), prev = S.depth ? Tick.depthNeed(S.depth) : 1; setStat('myc', Tick.depthName(), `${fmt(S.spores)} spores · fruits in ${Math.ceil(S.flushT)} d`, Math.log(Math.max(1, S.spores) / prev) / Math.log(need / prev)); }
    if (tab === 'bank') refreshBank(); else if (tab === 'protocols') refreshProtocols(); else if (tab === 'reaches') refreshReaches(); else if (tab === 'fork') refreshFork(); else if (tab === 'assize') refreshAssize(); else if (tab === 'you') refreshYou(); }

  /* ---------------------------------------------------------------- scene */
  const cv = $('#scene'), g = cv.getContext('2d'); const motes = []; let flash = 0;
  Tick.on('ship', () => { flash = 1; });
  function scene(t) { const W = cv.width = cv.clientWidth * (devicePixelRatio || 1) / 1, H = cv.height; g.setTransform(1, 0, 0, 1, 0, 0);
    const light = Tick.light(), day = Tick.isDay(), ph = Tick.phase(), M = Tick.mods();
    const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, day ? '#2a4a6e' : '#070b16'); sky.addColorStop(1, day ? '#e7a26b' : '#1b2438'); g.fillStyle = sky; g.fillRect(0, 0, W, H);
    const sx = W * (day ? ph / (1 - D.day.night) : (ph - (1 - D.day.night)) / D.day.night), sy = H * .55 - Math.sin(Math.PI * (day ? ph / (1 - D.day.night) : (ph - (1 - D.day.night)) / D.day.night)) * H * .45;
    g.fillStyle = day ? '#ffe9a8' : '#dfe6f5'; g.beginPath(); g.arc(sx, sy, day ? 14 : 9, 0, 7); g.fill();
    g.fillStyle = day ? '#274f3b' : '#0e1f19'; for (let i = 0; i < 14; i++) { const x = W - i * (W / 12) - 30, h = 40 + (i * 37 % 30); g.beginPath(); g.moveTo(x - 18, H * .62); g.lineTo(x, H * .62 - h); g.lineTo(x + 18, H * .62); g.fill(); }
    const tide = day ? 1 : .6, wy = H * (.72 - .06 * tide); const water = g.createLinearGradient(0, wy, 0, H); water.addColorStop(0, day ? '#3f8fbf' : '#1a3550'); water.addColorStop(1, day ? '#1f4a6e' : '#0b1a2a'); g.fillStyle = water; g.fillRect(0, wy, W, H - wy);
    g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 1; for (let i = 0; i < 5; i++) { g.beginPath(); const y = wy + 10 + i * 14; for (let x = 0; x <= W; x += 8) g.lineTo(x, y + Math.sin(x / 22 + t / 600 + i) * 2); g.stroke(); }
    g.fillStyle = day ? '#5a4a34' : '#241e16'; g.fillRect(0, wy - 8, W * .42, 8); g.fillStyle = day ? '#3a5a3a' : '#152215'; g.fillRect(0, H * .62, W, wy - 8 - H * .62);
    const S0 = Tick.state(); const n = id => S0.n[id] || 0;
    const prod = D.machines.filter(m => m.out && m.out[D.primary]).reduce((a, m) => a + n(m.id), 0), suns = D.machines.filter(m => m.out && m.out.power && m.solar).reduce((a, m) => a + n(m.id), 0);
    const tufts = Math.min(70, 1 + Math.round(Math.log2(1 + prod + S0.res[D.primary] / 200) * 7)); g.strokeStyle = day ? '#9ad36a' : '#3f6b34'; g.lineWidth = 2;
    for (let i = 0; i < tufts; i++) { const x = 10 + (i * 137 % Math.max(1, W * .42)), y = H * .63 + (i * 53 % Math.max(1, wy - 14 - H * .63)), sw = Math.sin(t / 700 + i) * 3; for (let k = -1; k <= 1; k++) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + k * 4 + sw, y - 10 - (k === 0 ? 4 : 0)); g.stroke(); } }
    for (let i = 0; i < Math.min(8, suns); i++) { const x = W * .46 + i * 22, y = H * .62 + 8; g.fillStyle = day ? '#ffd86a' : '#6a5a3a'; g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); g.strokeStyle = day ? '#ffe9a8' : '#4a4a3a'; g.lineWidth = 1; for (let k = 0; k < 8; k++) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(k + t / 900) * 9, y + Math.sin(k + t / 900) * 9); g.stroke(); } }
    S0.sectors.forEach((id, i) => { const k = D.sectors.findIndex(s => s.id === id), x = 20 + k * (W / 13); g.fillStyle = day ? '#6b5a44' : '#2a2420'; g.fillRect(x, H * .62 - 16, 18, 16); g.fillStyle = Tick.power().eff < 1 && Math.sin(t / 60 + k) > .3 ? '#333' : '#ffd68a'; g.fillRect(x + 6, H * .62 - 11, 5, 6); });
    const rate = Tick.rates()[D.primary] || 0; if (Math.random() < Math.min(1, rate / 40 + .05)) motes.push({ x: Math.random() * W * .4, y: wy + 5 + Math.random() * 20, v: .3 + Math.random() * .6, life: 1 });
    g.fillStyle = '#f2c98a'; for (const m of motes) { m.y -= m.v; m.life -= .012; g.globalAlpha = Math.max(0, m.life); g.beginPath(); g.arc(m.x, m.y, 2, 0, 7); g.fill(); } g.globalAlpha = 1; for (let i = motes.length - 1; i >= 0; i--) if (motes[i].life <= 0) motes.splice(i, 1);
    if (S0.ship.t < 60) { const f = 1 - S0.ship.t / 60, bx = W + 80 - f * (W * .7), by = 34; g.fillStyle = 'rgba(120,130,150,.85)'; for (const [dx, r] of [[-30, 16], [0, 22], [28, 15], [-8, 18]]) { g.beginPath(); g.arc(bx + dx, by, r, 0, 7); g.fill(); } g.strokeStyle = 'rgba(156,198,232,.5)'; g.lineWidth = 1; for (let i = 0; i < 8; i++) { g.beginPath(); g.moveTo(bx - 30 + i * 9, by + 18); g.lineTo(bx - 33 + i * 9, by + 30 + (t / 5 + i * 7) % 12); g.stroke(); } }
    if (flash > 0) { g.fillStyle = `rgba(242,201,138,${flash * .5})`; g.fillRect(0, 0, W, H); flash -= .02; }
    for (const e of S0.events) { const d = D.events.find(x => x.id === e.id); const col = d.color || '#ffffff';
      if (d.fx === 'rain') { g.strokeStyle = col; g.globalAlpha = .4; g.lineWidth = 1; for (let i = 0; i < 40; i++) { const x = (i * 97 + t / 4) % W, y = (i * 53 + t / 3) % H; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 3, y + 10); g.stroke(); } g.globalAlpha = 1; }
      if (d.fx === 'sparks') { g.fillStyle = col; for (let i = 0; i < 14; i++) { const x = (i * 83 + t / 9) % W, y = H - ((i * 41 + t / 6) % H); g.fillRect(x, y, 3, 3); } }
      if (d.fx === 'gold') { g.fillStyle = col; g.globalAlpha = .12 + Math.sin(t / 200) * .05; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
      if (d.fx === 'shadow') { g.fillStyle = col; g.globalAlpha = .45; g.fillRect(0, 0, W, H); g.globalAlpha = 1; const dx = (t / 8) % (W + 300) - 150, fl = Math.sin(t / 150) * 10; g.fillStyle = 'rgba(0,0,0,.6)'; g.beginPath(); g.ellipse(dx, 40, 90, 14, 0, 0, 7); g.fill(); g.beginPath(); g.moveTo(dx - 60, 40); g.lineTo(dx - 120, 20 + fl); g.lineTo(dx - 50, 46); g.moveTo(dx + 60, 40); g.lineTo(dx + 120, 20 + fl); g.lineTo(dx + 50, 46); g.fill(); }
      g.fillStyle = 'rgba(239,233,220,.9)'; g.font = '12px system-ui'; g.textAlign = 'right'; g.fillText(d.name + ' · ' + Math.ceil(e.left) + 'd', W - 10, 18 + 16 * S0.events.indexOf(e)); }
    drawForest(g, W, H, wy, S0, day);
    drawForm(g, W * .45, wy - 10, .55, S0, t);
    if (tab === 'you') drawYou(t);
    g.fillStyle = 'rgba(239,233,220,.7)'; g.font = '11px system-ui'; g.textAlign = 'left'; g.fillText(`${day ? D.day.dayName : D.day.nightName} · light ${Math.round(light * 100)}% · ${S0.sectors.length}/${D.sectors.length} chapters · stillness ${Math.round(S0.still || 0)}`, 10, 16);
    requestAnimationFrame(scene); }

  /* the form, the forest, the mushrooms. Silhouettes only; nothing here has eyes. */
  function drawForm(g, x, y, s, S0, t) { const fd = D.becoming ? Tick.formDef(S0.ring, S0.form) : null, shape = fd ? fd.shape : 'blade', a = S0.avatar, green = a.green || '#9ad36a', ring = S0.ring || 1;
    const H = s * (10 + (+a.height || 40) * 1.1), wig = Math.sin(t / 900) * 2 * s;
    const tree = (h, w, canopy) => { g.fillStyle = '#5a3d24'; g.fillRect(x - w / 2, y - h, w, h); g.fillStyle = green; for (const [dx, dy, r] of canopy) { g.beginPath(); g.ellipse(x + dx * s + wig * .3, y - h - dy * s, r * s, r * s * .8, 0, 0, 7); g.fill(); } };
    const label = () => { g.fillStyle = 'rgba(239,233,220,.85)'; g.font = `${11 * s / 1.6}px system-ui`; g.textAlign = 'center'; g.fillText(a.name || '', x, y + 16 * s); };
    if (['blade', 'fern', 'tuft', 'reed', 'sedge'].includes(shape)) { drawBlade(g, x, y, s, shape === 'blade' ? a : { ...a, clump: shape === 'tuft' ? 'a tuft' : 'three', head: shape === 'reed' ? 'reed plume' : a.head }, t); return; }
    if (['flower', 'blossom', 'lotus', 'thistle'].includes(shape)) { drawBlade(g, x, y, s, { ...a, head: 'none', clump: 'one blade' }, t); const n = shape === 'thistle' ? 14 : shape === 'lotus' ? 8 : 6, col = a.headColor || '#e8d9a0', tx = x + wig, ty = y - H;
      g.fillStyle = col; for (let i = 0; i < n; i++) { const an = i / n * Math.PI * 2 + t / 4000; g.beginPath(); g.ellipse(tx + Math.cos(an) * 6 * s, ty + Math.sin(an) * 6 * s, 4.5 * s, 2.2 * s, an, 0, 7); g.fill(); }
      g.fillStyle = a.tip || '#f2c98a'; g.beginPath(); g.arc(tx, ty, 3 * s, 0, 7); g.fill(); return; }
    if (['acorn', 'gourd', 'lichen', 'bramble'].includes(shape)) { g.fillStyle = shape === 'gourd' ? '#c9a227' : shape === 'lichen' ? '#8fb56a' : '#b98c5a'; g.beginPath(); g.ellipse(x, y - 8 * s, 7 * s, 9 * s, 0, 0, 7); g.fill();
      if (shape === 'acorn' || shape === 'bramble') { g.fillStyle = '#6b4a2a'; g.beginPath(); g.ellipse(x, y - 14 * s, 8 * s, 4 * s, 0, 0, 7); g.fill(); g.fillRect(x - s, y - 20 * s, 2 * s, 6 * s); } label(); return; }
    if (['sapling', 'willow', 'pine'].includes(shape)) { tree((30 + 6 * Math.min(ring, 8)) * s, 3 * s, shape === 'pine' ? [[0, 12, 9], [0, 4, 12], [0, -4, 15]] : [[0, 6, 12], [-6, 0, 8], [6, 0, 8]]); label(); return; }
    if (shape === 'oak') { tree((50 + 6 * Math.min(ring, 10)) * s, 8 * s, [[0, 14, 26], [-18, 4, 16], [18, 4, 16], [-8, 24, 12], [8, 24, 12]]); label(); return; }
    if (shape === 'grove') { const ox = x; for (const dx of [-26, 0, 26]) { x = ox + dx * s; tree((40 + 5 * Math.min(ring, 10)) * s, 5 * s, [[0, 10, 18], [-10, 2, 12], [10, 2, 12]]); } x = ox; label(); return; }
    drawBlade(g, x, y, s, a, t); }
  function drawForest(g, W, H, wy, S0, day) { const trees = S0.trees || 0, depth = S0.depth || 0;
    for (let i = 0; i < Math.min(40, trees); i++) { const tx = W * .56 + (i * 41 % Math.max(1, W * .42)), th = 18 + (i * 13 % 16), ty = H * .62 + 4 + (i * 7 % 10); g.fillStyle = day ? '#4a3220' : '#1e150c'; g.fillRect(tx - 1.5, ty - th, 3, th); g.fillStyle = day ? '#3f8a3a' : '#173a1a'; g.beginPath(); g.ellipse(tx, ty - th, 9, 8, 0, 0, 7); g.fill(); }
    if (trees > 40) { g.fillStyle = 'rgba(239,233,220,.7)'; g.font = '10px system-ui'; g.textAlign = 'right'; g.fillText(`${trees} trees`, W - 10, H * .62 - 4); }
    for (let i = 0; i < Math.min(30, depth * 3); i++) { const mx = 12 + (i * 53 % Math.max(1, W * .4)), my = wy - 4 - (i * 29 % Math.max(1, wy - 8 - H * .63)); g.fillStyle = '#e8e0d0'; g.fillRect(mx - 1, my - 5, 2, 5); g.fillStyle = i % 3 ? '#c9583a' : '#e8c070'; g.beginPath(); g.ellipse(mx, my - 5, 4, 2.5, 0, Math.PI, 0); g.fill(); } }

  /* ----------------------------------------------------------------- loop */
  let last = performance.now();
  setInterval(() => { const now = performance.now(); Tick.step(Math.min(1, (now - last) / 1e3)); last = now; refresh(); }, 100);
  setInterval(() => store.set('grass.save', Tick.serialize()), 5000);
  addEventListener('beforeunload', () => { try { localStorage.setItem('grass.tab', tab); } catch (e) {} if (!isExt) { try { localStorage.setItem('grass.save', Tick.serialize()); } catch (e) {} } });
  show(tab); refresh(true); requestAnimationFrame(scene);
})();

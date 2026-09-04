/* descent.page.js — the script for descent.html. Inlined by descent.mjs at build; not loaded on its own. */
(function () {
  const L = JSON.parse(document.getElementById('lessons-json').textContent), D = JSON.parse(document.getElementById('def-json').textContent);
  const $ = s => document.querySelector(s), el = (t, a = {}, ...k) => { const e = document.createElement(t); for (const [n, v] of Object.entries(a)) { if (v == null) continue; n === 'html' ? e.innerHTML = v : n.startsWith('on') ? e[n] = v : e.setAttribute(n, v); }; k.forEach(x => e.append(x)); return e; };
  const fmt = n => Math.round(n).toLocaleString('en-US');
  const KEY = 'descent.v1';
  const fresh = () => ({ heze: 0, issued: 0, ledger: [], passed: [], stages: [], hardening: [], code: {}, lander: null, minutes: 0, record: 0, landings: 0, saved: Date.now() });
  let S = fresh(); try { S = Object.assign(fresh(), JSON.parse(localStorage.getItem(KEY) || 'null') || {}); } catch (e) {}
  const save = () => { S.saved = Date.now(); localStorage.setItem(KEY, JSON.stringify(S)); };
  const credit = (amt, line) => { const room = Math.max(0, D.cap - S.issued); const a = Math.min(amt, room); if (a <= 0) { note(line + ' — the cap is reached. Nothing in these files issues more.'); return 0; } S.heze += a; S.issued += a; S.ledger.unshift({ t: Date.now(), line, amt: a }); return a; };
  const debit = (amt, line) => { if (S.heze < amt) return false; S.heze -= amt; S.ledger.unshift({ t: Date.now(), line, amt: -amt }); return true; };
  const note = m => { $('#clock').textContent = m; };
  const life = () => D.baseLife + D.hardening.filter(h => S.hardening.includes(h.id)).reduce((a, h) => a + h.min, 0);
  const landed = () => S.stages.includes('ground');
  const lessonById = id => L.find(l => l.id === id);

  /* ---------------------------------------------------------------- clock
     One real second is one surface minute. Absence is credited in full, up to
     the lander's life, because that is what the sixth lesson says a board does. */
  function tick(now = Date.now()) { if (!S.lander || !S.lander.alive) return; const mins = (now - S.lander.since) / 1000; const lived = Math.min(mins, S.lander.life);
    const newMin = Math.floor(lived) - S.lander.minutes; if (newMin > 0) { S.lander.minutes += newMin; S.minutes += newMin; credit(newMin * D.perMinute, `${newMin} min of surface data`); }
    if (S.lander.minutes > S.record) S.record = S.lander.minutes;
    if (mins >= S.lander.life) { S.lander.alive = false; S.ledger.unshift({ t: now, line: `The lander stopped after ${S.lander.minutes} minutes.`, amt: 0 }); } }
  tick();

  /* ---------------------------------------------------------------- stats */
  const stats = [['heze', 'HEZE on the docket'], ['issued', 'issued of 21,000,000'], ['school', 'lessons passed'], ['stage', 'the approach'], ['surface', 'surface clock']];
  $('#stats').append(...stats.map(([id, label]) => el('div', { class: 'stat', id: 'st-' + id }, el('b', {}, label), el('span'), el('i'))));
  const setStat = (id, v, i) => { const s = $('#st-' + id); s.children[1].textContent = v; s.children[2].textContent = i || ''; };

  /* -------------------------------------------------------------- approach */
  function buildStages() { const box = $('#stages'); box.innerHTML = '';
    D.stages.forEach((st, i) => { const done = S.stages.includes(st.id), prev = i === 0 || S.stages.includes(D.stages[i - 1].id), missing = st.needs.filter(n => !S.passed.includes(n));
      const c = el('div', { class: 'card' + (done ? ' done' : prev ? '' : ' locked') }, el('h3', {}, st.name + (st.km != null ? ` · ${st.km} km` : ''), el('span', {}, done ? 'ordered' : fmt(st.heze) + ' HEZE')), el('p', { class: 'why' }, st.why),
        st.needs.length ? el('p', {}, 'asks for: ' + st.needs.map(n => lessonById(n).title + (S.passed.includes(n) ? ' ✓' : '')).join(', ')) : el('p', {}, 'asks for nothing but the window'),
        done ? el('span', { class: 'badge ok' }, i === D.stages.length - 1 ? 'on the ground' : 'done') : el('button', { class: 'primary', disabled: (!prev || missing.length || S.heze < st.heze) ? true : undefined, onclick: () => order(st) }, !prev ? 'after the stage before' : missing.length ? 'pass ' + missing.map(n => lessonById(n).title).join(' and ') : S.heze < st.heze ? `needs ${fmt(st.heze - S.heze)} more HEZE` : `Order · ${fmt(st.heze)} HEZE`));
      box.append(c); }); }
  function order(st) { if (!debit(st.heze, st.name)) return; S.stages.push(st.id); if (st.id === 'ground') land(); save(); render(); }
  function land() { S.landings++; S.lander = { alive: true, since: Date.now(), life: life(), minutes: 0 }; S.ledger.unshift({ t: Date.now(), line: `Landing ${S.landings}. Life ${life()} minutes at ${D.perMinute} HEZE a minute.`, amt: 0 }); }

  /* --------------------------------------------------------------- surface */
  function buildSurface() { const box = $('#lander'); box.innerHTML = ''; const hb = $('#hardening'); hb.innerHTML = '';
    if (!landed()) { box.append(el('p', { style: 'color:var(--dim);margin:0' }, `Nothing on the ground yet. Base life ${D.baseLife} minutes; Venera 13 managed ${D.venera}.`)); return; }
    const a = S.lander && S.lander.alive;
    box.append(el('div', { class: 'card' + (a ? ' done' : '') }, el('h3', {}, a ? `Alive · minute ${S.lander.minutes} of ${S.lander.life}` : `Stopped after ${S.lander ? S.lander.minutes : 0} minutes`, el('span', {}, `record ${S.record} min`)),
      el('p', {}, `${S.landings} landing${S.landings === 1 ? '' : 's'} · ${fmt(S.minutes)} surface minutes in all · ${S.record > D.venera ? 'past Venera 13' : `${D.venera - S.record} minutes short of Venera 13`} · ${D.perMinute} HEZE a minute, credited in full while you are away`),
      a ? '' : el('button', { class: 'primary', disabled: S.heze < D.relanding ? true : undefined, onclick: () => { if (debit(D.relanding, 'Another probe')) { land(); save(); render(); } } }, `Land another · ${fmt(D.relanding)} HEZE`)));
    hb.append(el('h2', { style: 'margin-top:10px' }, 'Hardening', el('i', {}, 'minutes bought from the yard\'s price list; the next probe gets them')));
    const ok = S.passed.includes(D.hardNeeds);
    if (!ok) hb.append(el('p', { style: 'color:var(--dim);margin:0 0 6px' }, `Hardening asks for “${lessonById(D.hardNeeds).title}” first: it is the lesson about clocks that run while you are gone.`));
    for (const h of D.hardening) { const have = S.hardening.includes(h.id);
      hb.append(el('div', { class: 'card' + (have ? ' done' : '') }, el('h3', {}, `${h.name} · +${h.min} min`, el('span', {}, have ? 'fitted' : fmt(h.heze) + ' HEZE')), el('p', {}, h.why),
        have ? '' : el('button', { disabled: (!ok || S.heze < h.heze) ? true : undefined, onclick: () => { if (debit(h.heze, h.name)) { S.hardening.push(h.id); if (S.lander && S.lander.alive) S.lander.life += h.min; save(); render(); } } }, S.heze < h.heze ? `needs ${fmt(h.heze - S.heze)} more` : 'Fit it'))); } }

  /* ---------------------------------------------------------------- school */
  function buildLessons() { const box = $('#lessons'); box.innerHTML = '';
    for (const l of L) { const passed = S.passed.includes(l.id), missing = l.needs.filter(n => !S.passed.includes(n));
      const card = el('div', { class: 'card lesson' + (passed ? ' done' : missing.length ? ' locked' : '') }, el('h3', {}, l.title, el('span', {}, passed ? 'paid' : fmt(D.grants[l.id] || 0) + ' HEZE')), el('p', { class: 'why' }, l.one_line),
        el('p', {}, `${l.subject}` + (l.needs.length ? ' · after ' + l.needs.map(n => lessonById(n).title).join(', ') : '')));
      const det = el('details'); det.append(el('summary', {}, passed ? 'Read it again' : missing.length ? 'Read ahead (the checks wait for ' + missing.map(n => lessonById(n).title).join(', ') + ')' : 'Read, then write'));
      for (const s of l.sections) det.append(el('div', { class: 'sec' }, el('h4', {}, s.heading), ...s.body.map(p => el('p', {}, p))));
      const ta = el('textarea', { spellcheck: 'false' }); ta.value = S.code[l.id] || l.practice.starter; ta.oninput = () => { S.code[l.id] = ta.value; save(); };
      const out = el('ul', { class: 'checks' });
      det.append(el('div', { class: 'sec' }, el('h4', {}, 'Practice'), el('p', {}, l.practice.brief)), ta,
        el('div', { class: 'row' }, el('button', { class: 'primary', disabled: missing.length ? true : undefined, onclick: () => run(l, ta.value, out) }, 'Run the checks'),
          ...(l.practice.violators || []).map((v, i) => el('button', { onclick: () => { ta.value = v; S.code[l.id] = v; save(); run(l, v, out); } }, `Wrong version ${i + 1}`)),
          el('button', { onclick: () => { ta.value = l.practice.starter; S.code[l.id] = ''; save(); out.innerHTML = ''; } }, 'Start over')),
        out, el('p', { style: 'margin-top:6px' }, el('b', {}, 'Ask. '), l.ask));
      card.append(det); box.append(card); } }
  function run(l, code, out) { out.innerHTML = ''; let all = true;
    for (const c of l.practice.checks) { let ok = false, err = '';
      try { ok = !!new Function(code + '\
;return (' + c.test + ');')(); } catch (e) { err = e.message; }
      if (!ok) all = false; out.append(el('li', { class: (ok ? 'ok' : 'bad') + (c.constraint ? ' c' : '') }, c.name + (c.constraint ? ' (a constraint on the source)' : '') + (err ? ' — ' + err : ''))); }
    if (all && !S.passed.includes(l.id)) { S.passed.push(l.id); const a = credit(D.grants[l.id] || 0, 'Lesson: ' + l.title); out.append(el('li', { class: 'ok' }, `All ${l.practice.checks.length} checks. The docket is credited ${fmt(a)} HEZE.`)); save(); render(); }
    else if (all) out.append(el('li', { class: 'ok' }, 'All checks, again. It was paid the first time.')); }

  /* ---------------------------------------------------------------- render */
  function render() { tick();
    setStat('heze', fmt(S.heze), 'a unit of account, not money'); setStat('issued', fmt(S.issued), `${((S.issued / D.cap) * 100).toFixed(3)}% of the cap`);
    setStat('school', `${S.passed.length} / ${L.length}`, S.passed.length === L.length ? 'the whole school' : 'each pays once');
    const reached = D.stages.filter(s => S.stages.includes(s.id)); setStat('stage', reached.length ? reached[reached.length - 1].name : 'not begun', `${reached.length} of ${D.stages.length} stages`);
    setStat('surface', S.lander && S.lander.alive ? `min ${S.lander.minutes}` : S.lander ? 'stopped' : '—', `record ${S.record} · Venera 13: ${D.venera}`);
    buildStages(); buildSurface(); buildLessons();
    $('#ledger').innerHTML = S.ledger.slice(0, 60).map(e => `<div><span>${new Date(e.t).toLocaleString()} · ${e.line}</span><b>${e.amt ? (e.amt > 0 ? '+' : '') + fmt(e.amt) : ''}</b></div>`).join('') || '<div>Nothing on the docket yet. The first lesson pays.</div>'; }
  $('#export').onclick = () => { const a = el('a', { href: URL.createObjectURL(new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' })), download: 'docket.json' }); document.body.append(a); a.click(); a.remove(); };
  $('#wipe').onclick = () => { if (confirm('Start again? The docket, the lessons and the landings go.')) { localStorage.removeItem(KEY); S = fresh(); render(); } };

  /* ------------------------------------------------------------------ sky
     The profile of the approach: altitude on the vertical, the stages as
     rungs, the cloud deck, the surface glow, and the probe as a capsule. */
  const cv = $('#sky'), g = cv.getContext('2d');
  function sky(t) { const W = cv.width = cv.clientWidth, H = cv.height; const grd = g.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, '#05070d'); grd.addColorStop(.45, '#3a2a1a'); grd.addColorStop(.8, '#8a4a1a'); grd.addColorStop(1, '#f0a83c'); g.fillStyle = grd; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(240,220,180,.18)'; for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse((i * 197 + t / 40) % (W + 200) - 100, H * .42 + (i % 3) * 8, 120, 9, 0, 0, 7); g.fill(); }
    const y = km => H - 22 - Math.log10(1 + (km || 0)) / Math.log10(251) * (H - 44);
    g.strokeStyle = 'rgba(239,233,220,.25)'; g.lineWidth = 1; g.font = '11px system-ui'; g.fillStyle = 'rgba(239,233,220,.75)'; g.textAlign = 'left';
    D.stages.forEach((st, i) => { const yy = st.km == null ? 12 : Math.max(30, y(st.km)); const done = S.stages.includes(st.id); g.strokeStyle = done ? 'rgba(111,212,168,.6)' : 'rgba(239,233,220,.2)'; g.beginPath(); g.moveTo(90, yy); g.lineTo(W - 20, yy); g.stroke(); g.fillStyle = done ? '#6fd4a8' : 'rgba(239,233,220,.6)'; g.fillText(`${st.name}${st.km != null ? ' · ' + st.km + ' km' : ''}`, 94, yy - 3); });
    const reached = D.stages.filter(s => S.stages.includes(s.id)); const cur = reached.length ? reached[reached.length - 1] : null; const py = cur ? (cur.km == null ? 12 : Math.max(30, y(cur.km))) : -20, px = 50 + Math.sin(t / 1500) * 4;
    if (cur) { g.fillStyle = S.lander && !S.lander.alive && cur.id === 'ground' ? '#6b4a2a' : '#cfd8e6'; g.beginPath(); g.moveTo(px - 10, py); g.lineTo(px, py - 16); g.lineTo(px + 10, py); g.closePath(); g.fill(); g.fillRect(px - 8, py, 16, 6); if (cur.id !== 'ground') { g.strokeStyle = 'rgba(207,216,230,.5)'; g.beginPath(); g.moveTo(px, py - 16); g.lineTo(px, py - 34); g.stroke(); g.beginPath(); g.ellipse(px, py - 38, 14, 5, 0, Math.PI, 0); g.stroke(); } }
    g.fillStyle = '#6b3a12'; g.fillRect(0, H - 18, W, 18); g.fillStyle = 'rgba(239,233,220,.85)'; g.font = '11px system-ui'; g.textAlign = 'right'; g.fillText(`475 °C · 92 bar · ${S.lander && S.lander.alive ? 'minute ' + S.lander.minutes + ' of ' + S.lander.life : 'the surface'}`, W - 10, H - 5);
    requestAnimationFrame(sky); }

  render(); requestAnimationFrame(sky);
  setInterval(() => { const before = S.lander && S.lander.minutes, alive = S.lander && S.lander.alive; tick(); if (S.lander && (S.lander.minutes !== before || alive !== S.lander.alive)) { save(); render(); } }, 1000);
  addEventListener('beforeunload', save);
})();

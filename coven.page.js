/* coven.page.js — the script for coven.html. Inlined by coven.mjs after the weave function. */
(function () {
  const D = JSON.parse(document.getElementById('def-json').textContent);
  /* the rules: embedded from templates-rules/coven.json at build, and overridden by a rulebook kept in this browser through the editor in the quarter */
  const RULES = (() => { let o = {}; try { o = (JSON.parse(localStorage.getItem('custom.v1') || 'null') || {})['templates-rules/coven.json'] || {}; } catch (e) {} return Object.assign({}, D.rules, o.rules || o); })();
  const $ = s => document.querySelector(s), fmt = n => Math.round(n).toLocaleString('en-US');
  const KEY = 'coven.v1';
  const read = (k, d) => { try { return Object.assign(d, JSON.parse(localStorage.getItem(k) || 'null') || {}); } catch (e) { return d; } };
  let W = { people: D.people, syndicates: D.syndicates, doors: D.doors };
  let S = read(KEY, { day: 0, seed: D.seed, props: [], carried: 0, chain: [], nextId: 1, lastSync: 0, auto: false, log: [], saved: Date.now() });
  const note = m => { S.log.unshift({ t: Math.floor(S.day), m }); S.log.length = Math.min(S.log.length, 60); };
  const save = () => { S.saved = Date.now(); localStorage.setItem(KEY, JSON.stringify(S)); };
  let cur = 0;
  if (!S.log.length) note(`Twenty-one syndicates, sixty-three practitioners, two hundred doors. Two of three sign or nothing moves, and every ${RULES.intervalDays} days the warlocks carry what was signed across.`);

  const syn = i => W.syndicates[i], people = id => W.people.filter(p => p.syndicate === id);
  const OFFICES = ['witch', 'wizard', 'warlock'];
  const WHY = ['a door that had not moved in a season', 'a redemption asked for at the counter', 'a tranche share drawn against the next door', 'a correction the book found on replay', 'a carry the other world says it never received', 'an issuance due on the schedule and not yet taken', 'a reconciliation of two tallies that disagree by one', 'a door asking to be closed for the interval'];

  /* proposals accrue at the doors: one every few days, at a door of some syndicate */
  function step(dt, quiet) { const d0 = Math.floor(S.day); S.day += dt; const d1 = Math.floor(S.day); if (d1 === d0) return;
    if (d1 % RULES.proposalEvery === 0) { const k = (d1 * 2654435761) >>> 0, sy = W.syndicates[k % W.syndicates.length], door = sy.doors[0] + (k >> 8) % (sy.doors[1] - sy.doors[0] + 1);
      S.props.unshift({ id: 'e' + S.nextId++, door, syn: sy.id, why: WHY[(k >> 4) % WHY.length], amount: 100 * (1 + (k >> 12) % 40), signed: [], at: d1 }); S.props.length = Math.min(S.props.length, RULES.deskLimit);
      if (!quiet) note(`Door ${door} proposes: ${WHY[(k >> 4) % WHY.length]}.`); }
    if (S.auto) for (const p of S.props) { if (p.signed.length >= 2) continue; const k = ((d1 + p.id.length * 7) * 40503) >>> 0; if (k % 100 < RULES.signChance) { const o = OFFICES.find(o => !p.signed.includes(o)); if (o) { p.signed.push(o); if (!quiet && p.signed.length === 2) note(`${p.id} at door ${p.door}: two of three, and it waits for the carry.`); } } }
    if (d1 - S.lastSync >= RULES.intervalDays) carry(quiet); }

  /* THE FAR SIDE. The syndicate is multiplanetary and it is enormous, and the honest thing to
     draw is that it does not care. At every carry the other world's chain arrives with its own
     interval's volume, which is orders of magnitude larger than anything these doors did; it
     never rejects, never asks a question and never answers one. It reconciles. That indifference
     is not contempt, it is scale, and it is also the safety in it: something that cannot notice
     you cannot single you out. The volume is deterministic from the interval, so it is the same
     for anyone who runs this at the same count, and it is not a number this deck can move. */
  const farSide = n => { const h = ((n * 2654435761) ^ 0x9e3779b9) >>> 0;
    return { events: 900000 + (h % 700000), worlds: 3 + (h >>> 20) % 5, note: ['reconciled without comment', 'accepted in bulk, unread', 'merged at the interval', 'taken as read', 'folded into the quarter\'s total'][h % 5] }; };

  /* the syndication: what was signed is carried across and committed, hashed and chained */
  async function carry(quiet) { const ready = S.props.filter(p => p.signed.length >= 2); S.lastSync = Math.floor(S.day);
    const prev = S.chain.length ? S.chain[0].hash : '0'.repeat(64);
    const far = farSide(S.chain.length + 1);
    const body = JSON.stringify({ at: S.lastSync, prev, far, events: ready.map(p => ({ id: p.id, door: p.door, syn: p.syn, amount: p.amount, signed: p.signed })) });
    let hash; try { const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(body)); hash = [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join(''); }
    catch (e) { hash = 'sha-256 unavailable in this context'; }
    S.chain.unshift({ n: S.chain.length + 1, at: S.lastSync, count: ready.length, amount: ready.reduce((a, p) => a + p.amount, 0), prev, hash, far }); S.chain.length = Math.min(S.chain.length, 40);
    S.props = S.props.filter(p => p.signed.length < 2); S.carried += ready.length;
    if (!quiet) note(ready.length ? `Syndication ${S.chain.length}: ${ready.length} carried across, ${fmt(ready.reduce((a, p) => a + p.amount, 0))} HEZE, checkpoint ${hash.slice(0, 12)}.` : `Syndication ${S.chain.length}: nothing was signed, so nothing crossed. The checkpoint says so.`);
    save(); render(); }
  const away = Math.min((Date.now() - S.saved) / 1000, RULES.awayHours * 3600); if (away > 5) { let left = away; while (left > 0) { const d = Math.min(1, left); step(d, true); left -= d; } note(`Away ${Math.round(away / 60)} min: the doors went on proposing, and the intervals came round.`); }

  /* sigils: rings, bars and chords from the practitioner's own numbers. Geometry, never a face. */
  function sigil(cv, p) { const g = cv.getContext('2d'), W = cv.width = 104, H = cv.height = 104, cx = W / 2, cy = H / 2, R = 38;
    g.clearRect(0, 0, W, H); g.strokeStyle = p.office === 'witch' ? '#6fd4a8' : p.office === 'wizard' ? '#3f8fbf' : '#f2c98a'; g.lineWidth = 2; g.globalAlpha = .9;
    for (let r = 0; r < p.sigil.ring; r++) { g.beginPath(); g.arc(cx, cy, R - r * 7, 0, 7); g.stroke(); }
    g.save(); g.translate(cx, cy); g.rotate(p.sigil.turn * Math.PI / 180);
    for (let b = 0; b < p.sigil.bars; b++) { const a = b * 2 * Math.PI / p.sigil.bars; g.beginPath(); g.moveTo(Math.cos(a) * (R - 14), Math.sin(a) * (R - 14)); g.lineTo(Math.cos(a) * R, Math.sin(a) * R); g.stroke(); }
    if (p.sigil.chord) { g.beginPath(); for (let c = 0; c < p.sigil.chord; c++) { const a1 = c * 2 * Math.PI / p.sigil.chord, a2 = a1 + Math.PI * 2 / 3; g.moveTo(Math.cos(a1) * (R - 10), Math.sin(a1) * (R - 10)); g.lineTo(Math.cos(a2) * (R - 10), Math.sin(a2) * (R - 10)); } g.globalAlpha = .5; g.stroke(); }
    g.restore(); }

  function render() { const sy = syn(cur);
    $('#syns').innerHTML = W.syndicates.map((s, i) => { const open = S.props.filter(p => p.syn === s.id), ready = open.filter(p => p.signed.length >= 2).length;
      return `<div class="syn ${i === cur ? 'on' : ''}" data-i="${i}"><b>${s.tranche}</b><span>doors ${s.doors[0]}–${s.doors[1]}</span><br><span class="${ready ? 'q' : open.length ? 'w' : ''}">${open.length ? `${ready}/${open.length} signed` : 'quiet'}</span></div>`; }).join('');
    $('#syns').querySelectorAll('.syn').forEach(e => e.onclick = () => { cur = +e.dataset.i; render(); });
    $('#syn-name').innerHTML = `${sy.name}<i>${sy.text}</i>`;
    $('#syn-stats').innerHTML = [['tranche', `${sy.tranche} of ${D.syndicateCount}`], ['holds', fmt(sy.holds) + ' HEZE'], ['doors', `${sy.doors[0]} to ${sy.doors[1]} (${sy.doorCount})`], ['quorum', `${sy.quorum} of ${sy.of}`], ['seat', sy.seat]].map(([k, v]) => `<div class="stat"><span>${k}</span><b>${v}</b></div>`).join('');
    $('#who').innerHTML = people(sy.id).map(p => `<div class="who"><canvas data-p="${p.id}"></canvas><div><em>${p.office} &middot; ${p.office_is}</em><b>${p.name}</b><p>${p.does}</p><p>Keeps ${p.keeps}. Holds the spell ${p.glyph} ${p.spell}. Key share <code>${p.share}</code>.</p><p><small>Reads ${p.reads}.</small> ${p.reason}</p></div><div></div></div>`).join('');
    $('#who').querySelectorAll('canvas').forEach(cv => sigil(cv, W.people.find(p => p.id === cv.dataset.p)));
    const due = RULES.intervalDays - (Math.floor(S.day) - S.lastSync);
    $('#sync-stats').innerHTML = [['interval', `${RULES.intervalDays} days, six months`], ['next syndication', `in ${Math.max(0, due)} days`], ['signed and waiting', S.props.filter(p => p.signed.length >= 2).length], ['carried in all', fmt(S.carried)], ['checkpoints', S.chain.length]].map(([k, v]) => `<div class="stat"><span>${k}</span><b>${v}</b></div>`).join('');
    $('#clock-bar').style.width = `${100 * Math.min(1, (RULES.intervalDays - Math.max(0, due)) / RULES.intervalDays)}%`;
    $('#autosign').textContent = S.auto ? 'They are signing' : 'Let them sign';
    /* the bank's health, read rather than asserted: can every door still reach quorum, is the chain unbroken,
       are the checkpoints on their interval, and is anything sitting unsigned longer than an interval */
    const short = W.syndicates.filter(s => people(s.id).length < RULES.quorum).length;
    const broken = S.chain.slice(0, -1).findIndex((c, i) => c.prev !== S.chain[i + 1].hash);
    const stale = S.props.filter(p => p.signed.length < RULES.quorum && Math.floor(S.day) - p.at > RULES.staleAfter).length;
    const late = Math.max(0, Math.floor(S.day) - S.lastSync - RULES.intervalDays);
    const H = [['quorum', short ? `${short} syndicates cannot reach ${RULES.quorum} of ${RULES.of}` : `reachable at all ${W.syndicates.length}`, !short],
      ['the chain', S.chain.length < 2 ? (S.chain.length ? 'one checkpoint, nothing to contradict it' : 'no checkpoint yet') : broken === -1 ? `unbroken over ${S.chain.length} checkpoints` : `broken at checkpoint ${S.chain[broken].n}`, broken === -1],
      ['the interval', late ? `${late} days late` : 'on its interval', !late],
      ['the desk', stale ? `${stale} unsigned longer than an interval` : `${S.props.length} open, none stale`, !stale],
      ['issuance', `${fmt(S.carried)} events carried, against ${fmt(RULES.cap)} of headroom`, true]];
    $('#health').innerHTML = H.map(([k, v, ok]) => `<div class="stat"><span>${k}</span><b style="color:${ok ? 'var(--ok)' : 'var(--bad)'}">${v}</b></div>`).join('')
      + `<p style="color:var(--dim);font-size:12px;margin:8px 0 0">${H.every(h => h[2]) ? 'Healthy: every door can be signed, the chain agrees with itself, and the carries are on time. A bank is healthy when nothing about it needs explaining.' : 'Not healthy yet, and the line above says which part. Nothing here is hidden by an average.'}</p>`;
    $('#props').innerHTML = S.props.length ? S.props.slice(0, 12).map(p => `<div class="prop"><b>${p.id} &middot; door ${p.door}</b><div class="sigs">${OFFICES.map(o => `<i class="${p.signed.includes(o) ? 'on' : ''}" title="${o}"></i>`).join('')}</div><p>${p.why} &middot; ${fmt(p.amount)} HEZE &middot; ${p.signed.length}/2 signed${p.signed.length ? ' by the ' + p.signed.join(' and the ') : ''}</p><div class="row">${OFFICES.filter(o => !p.signed.includes(o)).map(o => `<button data-e="${p.id}" data-o="${o}">sign as ${o}</button>`).join('')}</div></div>`).join('') : '<p style="color:var(--dim);margin:0">No proposals at the doors. They come on their own.</p>';
    $('#props').querySelectorAll('button').forEach(b => b.onclick = () => { const p = S.props.find(x => x.id === b.dataset.e); if (!p || p.signed.length >= 2) return; p.signed.push(b.dataset.o);
      if (p.signed.length >= 2) note(`${p.id} at door ${p.door}: two of three. It waits for the carry.`); save(); render(); });
    $('#chain').innerHTML = S.chain.length ? S.chain.map(c => { const f = c.far, share = f ? (100 * c.count / (c.count + f.events)) : null;
      return `<div><b>#${c.n}</b> day ${c.at} &middot; ${c.count} carried &middot; ${fmt(c.amount)} HEZE<br>${c.hash.slice(0, 32)}…<br><span style="opacity:.6">over ${c.prev.slice(0, 16)}…</span>${f ? `<br><span style="color:var(--sea)">far side: ${fmt(f.events)} events from ${f.worlds} worlds, ${f.note}. Ours was ${share < 0.001 ? '<0.001' : share.toFixed(4)}% of the interval.</span>` : ''}</div>`; }).join('') : '<div>No syndication yet. The first checkpoint is taken at the first interval, whether or not anything crossed.</div>';
    $('#log').innerHTML = S.log.map(l => `<div><b>d${l.t}</b> ${l.m}</div>`).join('');
    $('#clock').textContent = `day ${Math.floor(S.day)} · seed ${S.seed}`; }

  $('#carry').onclick = () => carry(false);
  $('#autosign').onclick = () => { S.auto = !S.auto; note(S.auto ? 'The custodians will sign on their own, at their own pace.' : 'The custodians stop signing; nothing crosses unless you sign it.'); save(); render(); };
  $('#regen').onclick = () => { const seed = +$('#seed').value || D.seed; W = weave(seed, D.pred, D.spells, D.syndicateCount, D.doorCount); S.seed = seed; S.props = []; note(`Re-generated with seed ${seed}: another sixty-three, another two hundred doors. The chain stands; the people at the doors do not.`); save(); render(); };
  $('#download').onclick = () => { const files = {}; for (const t of [...W.people, ...W.syndicates, ...W.doors]) files['templates-coven/' + t.id + '.json'] = t;
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify({ seed: S.seed, wovenBy: 'coven.html', count: Object.keys(files).length, files }, null, 1)], { type: 'application/json' })); a.download = `templates-coven-seed-${S.seed}.json`; document.body.append(a); a.click(); a.remove(); };
  render(); setInterval(() => { step(1); render(); }, RULES.secondsPerDay * 1000); setInterval(save, 5000); addEventListener('beforeunload', save);
})();

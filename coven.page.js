/* coven.page.js — the script for coven.html. Inlined by coven.mjs after the weave function. */
(function () {
  const D = JSON.parse(document.getElementById('def-json').textContent);
  /* the rules: embedded from templates-rules/coven.json at build, and overridden by a rulebook kept in this browser through the editor in the quarter */
  const RULES = (() => { let o = {}; try { o = (JSON.parse(localStorage.getItem('custom.v1') || 'null') || {})['templates-rules/coven.json'] || {}; } catch (e) {} return Object.assign({}, D.rules, o.rules || o); })();
  const $ = s => document.querySelector(s), fmt = n => Math.round(n).toLocaleString('en-US');
  const KEY = 'coven.v1', DKEY = 'descent.v1';
  const read = (k, d) => { try { return Object.assign(d, JSON.parse(localStorage.getItem(k) || 'null') || {}); } catch (e) { return d; } };
  let W = { people: D.people, syndicates: D.syndicates, doors: D.doors, crofts: D.crofts };
  let S = read(KEY, { day: 0, seed: D.seed, props: [], carried: 0, chain: [], nextId: 1, lastSync: 0, auto: false, log: [], wax: {}, built: {}, saved: Date.now() });
  S.wax = S.wax || {}; S.built = S.built || {};
  let Dk = read(DKEY, { heze: 0, issued: 0, ledger: [] });
  const note = m => { S.log.unshift({ t: Math.floor(S.day), m }); S.log.length = Math.min(S.log.length, 60); };
  const save = () => { S.saved = Date.now(); Dk.saved = Date.now(); localStorage.setItem(KEY, JSON.stringify(S)); localStorage.setItem(DKEY, JSON.stringify(Dk)); };
  const debit = (amt, line) => { if (Dk.heze < amt) return false; Dk.heze -= amt; Dk.ledger.unshift({ t: Date.now(), line: 'Coven: ' + line, amt: -amt }); return true; };
  let cur = 0;

  /* THE CROFTS AND HOLDS. One croft per syndicate, growing sealing wax on its own coprime period —
     the same trick as the war of clans, so no two syndicates' crofts ever come due together. Four hold
     types, one catalog offered to all twenty-one: a watch-tower for the witch's door (better odds when
     the custodians sign on their own), an archive for the wizard's book (a proposal stays fresh longer
     before it counts against the bank's health), a waystation for the warlock's crossing (carry this
     syndicate's own signed proposals early, without waiting the six months), and a granary that favours
     no office and simply holds more wax. Effects are read from the hold's own template, never hard-coded
     here — building is buying a row in an effects table, exactly like the clans' assets. */
  const croftFor = synId => W.crofts.find(c => c.syndicate === synId);
  const builtAt = synId => S.built[synId] || [];
  function effectsFor(synId) { const e = { signChanceMul: 1, staleAfterMul: 1, waxCapAdd: 0, earlyCarry: false };
    for (const id of builtAt(synId)) { const h = D.holds.find(x => x.id === id); if (!h) continue; const f = h.effect;
      if (f.type === 'mul' && f.target === 'signChance') e.signChanceMul *= f.x; if (f.type === 'mul' && f.target === 'staleAfter') e.staleAfterMul *= f.x;
      if (f.type === 'add' && f.target === 'waxCap') e.waxCapAdd += f.x; if (f.type === 'unlock' && f.target === 'earlyCarry') e.earlyCarry = true; }
    return e; }
  function buildHold(synId, holdId) { const h = D.holds.find(x => x.id === holdId); if (!h) return;
    if (builtAt(synId).includes(holdId)) return; const wax = S.wax[synId] || 0;
    if (wax < h.costWax) return note(`Not enough wax at ${W.syndicates.find(s => s.id === synId).name} for ${h.name}: has ${fmt(wax)}, needs ${h.costWax}.`);
    if (!debit(h.costHeze, `${h.name} at ${W.syndicates.find(s => s.id === synId).name}`)) return note(`Not enough on the docket for ${h.name}: needs ${fmt(h.costHeze)} HEZE.`);
    S.wax[synId] = wax - h.costWax; (S.built[synId] = S.built[synId] || []).push(holdId);
    note(`Built ${h.name} at ${W.syndicates.find(s => s.id === synId).name}, favouring the ${h.office === 'none' ? 'whole syndicate' : h.office}.`); save(); render(); }
  if (!S.log.length) note(`Twenty-one syndicates, sixty-three practitioners, two hundred doors. Two of three sign or nothing moves, and every ${RULES.intervalDays} days the warlocks carry what was signed across.`);

  const syn = i => W.syndicates[i], people = id => W.people.filter(p => p.syndicate === id);
  const OFFICES = ['witch', 'wizard', 'warlock'];
  const WHY = ['a door that had not moved in a season', 'a redemption asked for at the counter', 'a tranche share drawn against the next door', 'a correction the book found on replay', 'a carry the other world says it never received', 'an issuance due on the schedule and not yet taken', 'a reconciliation of two tallies that disagree by one', 'a door asking to be closed for the interval'];

  /* proposals accrue at the doors: one every few days, at a door of some syndicate */
  function step(dt, quiet) { const d0 = Math.floor(S.day); S.day += dt; const d1 = Math.floor(S.day); if (d1 === d0) return;
    if (d1 % RULES.proposalEvery === 0) { const k = (d1 * 2654435761) >>> 0, sy = W.syndicates[k % W.syndicates.length], door = sy.doors[0] + (k >> 8) % (sy.doors[1] - sy.doors[0] + 1);
      S.props.unshift({ id: 'e' + S.nextId++, door, syn: sy.id, why: WHY[(k >> 4) % WHY.length], amount: 100 * (1 + (k >> 12) % 40), signed: [], at: d1 }); S.props.length = Math.min(S.props.length, RULES.deskLimit);
      if (!quiet) note(`Door ${door} proposes: ${WHY[(k >> 4) % WHY.length]}.`); }
    if (S.auto) for (const p of S.props) { if (p.signed.length >= 2) continue; const k = ((d1 + p.id.length * 7) * 40503) >>> 0; const chance = RULES.signChance * effectsFor(p.syn).signChanceMul; if (k % 100 < chance) { const o = OFFICES.find(o => !p.signed.includes(o)); if (o) { p.signed.push(o); if (!quiet && p.signed.length === 2) note(`${p.id} at door ${p.door}: two of three, and it waits for the carry.`); } } }
    /* the crofts: each grows on its own period, coprime with every other, so no two are ever due together */
    for (const c of W.crofts) if (d1 % c.period === 0) { const cap = c.cap + effectsFor(c.syndicate).waxCapAdd, had = S.wax[c.syndicate] || 0, got = Math.max(0, Math.min(c.yield, cap - had));
      S.wax[c.syndicate] = had + got; if (!quiet && got < c.yield) note(`The croft at ${c.seat} filled its store; some wax went to waste. A granary would help.`); }
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

  /* the syndication: what was signed is carried across and committed, hashed and chained. `onlySyn`
     is the waystation's early carry — a syndicate with one may carry its OWN signed proposals the
     moment they are ready, without waiting for the six-month interval, and never another's. */
  async function carry(quiet, onlySyn) {
    const ready = S.props.filter(p => p.signed.length >= 2 && (!onlySyn || p.syn === onlySyn));
    if (onlySyn && !ready.length) { note(`Nothing signed at ${W.syndicates.find(s => s.id === onlySyn).name} yet to carry early.`); return render(); }
    if (!onlySyn) S.lastSync = Math.floor(S.day);
    const prev = S.chain.length ? S.chain[0].hash : '0'.repeat(64);
    const far = farSide(S.chain.length + 1);
    const body = JSON.stringify({ at: Math.floor(S.day), prev, far, onlySyn: onlySyn || null, events: ready.map(p => ({ id: p.id, door: p.door, syn: p.syn, amount: p.amount, signed: p.signed })) });
    let hash; try { const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(body)); hash = [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join(''); }
    catch (e) { hash = 'sha-256 unavailable in this context'; }
    S.chain.unshift({ n: S.chain.length + 1, at: Math.floor(S.day), count: ready.length, amount: ready.reduce((a, p) => a + p.amount, 0), prev, hash, far, early: !!onlySyn }); S.chain.length = Math.min(S.chain.length, 40);
    S.props = S.props.filter(p => !(p.signed.length >= 2 && (!onlySyn || p.syn === onlySyn))); S.carried += ready.length;
    if (!quiet) note(onlySyn ? `Early carry via the waystation at ${W.syndicates.find(s => s.id === onlySyn).name}: ${ready.length} carried, ${fmt(ready.reduce((a, p) => a + p.amount, 0))} HEZE, ahead of the interval.`
      : ready.length ? `Syndication ${S.chain.length}: ${ready.length} carried across, ${fmt(ready.reduce((a, p) => a + p.amount, 0))} HEZE, checkpoint ${hash.slice(0, 12)}.` : `Syndication ${S.chain.length}: nothing was signed, so nothing crossed. The checkpoint says so.`);
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
    $('#syn-stats').innerHTML = [['tranche', `${sy.tranche} of ${D.syndicateCount}`], ['tranche holds', fmt(sy.holds) + ' HEZE'], ['doors', `${sy.doors[0]} to ${sy.doors[1]} (${sy.doorCount})`], ['quorum', `${sy.quorum} of ${sy.of}`], ['seat', sy.seat]].map(([k, v]) => `<div class="stat"><span>${k}</span><b>${v}</b></div>`).join('');
    $('#who').innerHTML = people(sy.id).map(p => `<div class="who"><canvas data-p="${p.id}"></canvas><div><em>${p.office} &middot; ${p.office_is}</em><b>${p.name}</b><p>${p.does}</p><p>Keeps ${p.keeps}. Holds the spell ${p.glyph} ${p.spell}. Key share <code>${p.share}</code>.</p><p><small>Reads ${p.reads}.</small> ${p.reason}</p></div><div></div></div>`).join('');
    $('#who').querySelectorAll('canvas').forEach(cv => sigil(cv, W.people.find(p => p.id === cv.dataset.p)));
    /* the croft and its holds, for the syndicate on screen */
    const croft = croftFor(sy.id), wax = S.wax[sy.id] || 0, built = builtAt(sy.id), eff = effectsFor(sy.id), cap = croft.cap + eff.waxCapAdd;
    $('#croft-stats').innerHTML = [['sealing wax', `${fmt(wax)} / ${fmt(cap)}`], ['grows', `${croft.yield} every ${croft.period} days`], ['built', built.length ? built.map(id => D.holds.find(h => h.id === id).name).join(', ') : 'nothing yet']].map(([k, v]) => `<div class="stat"><span>${k}</span><b>${v}</b></div>`).join('');
    $('#holds').innerHTML = D.holds.map(h => { const have = built.includes(h.id), afford = wax >= h.costWax && Dk.heze >= h.costHeze;
      return `<div class="prop"><b>${h.name} <small style="color:var(--dim);text-transform:none">&middot; favours the ${h.office === 'none' ? 'whole syndicate' : h.office}</small></b><span>${have ? '<span style="color:var(--ok)">built</span>' : ''}</span><p>${h.text}</p>${have ? '' : `<div class="row"><button data-h="${h.id}" ${afford ? '' : 'disabled'}>Build — ${h.costWax} wax, ${fmt(h.costHeze)} HEZE</button></div>`}</div>`; }).join('');
    $('#holds').querySelectorAll('button').forEach(b => b.onclick = () => buildHold(sy.id, b.dataset.h));
    const canEarly = eff.earlyCarry, earlyReady = S.props.some(p => p.syn === sy.id && p.signed.length >= 2);
    $('#early-carry-wrap').hidden = !canEarly;
    if (canEarly) { $('#early-carry').disabled = !earlyReady; $('#early-carry').onclick = () => carry(false, sy.id); }
    const due = RULES.intervalDays - (Math.floor(S.day) - S.lastSync);
    $('#sync-stats').innerHTML = [['HEZE on the docket', fmt(Dk.heze)], ['interval', `${RULES.intervalDays} days, six months`], ['next syndication', `in ${Math.max(0, due)} days`], ['signed and waiting', S.props.filter(p => p.signed.length >= 2).length], ['carried in all', fmt(S.carried)], ['checkpoints', S.chain.length]].map(([k, v]) => `<div class="stat"><span>${k}</span><b>${v}</b></div>`).join('');
    $('#clock-bar').style.width = `${100 * Math.min(1, (RULES.intervalDays - Math.max(0, due)) / RULES.intervalDays)}%`;
    $('#autosign').textContent = S.auto ? 'They are signing' : 'Let them sign';
    /* the bank's health, read rather than asserted: can every door still reach quorum, is the chain unbroken,
       are the checkpoints on their interval, and is anything sitting unsigned longer than an interval */
    const short = W.syndicates.filter(s => people(s.id).length < RULES.quorum).length;
    const broken = S.chain.slice(0, -1).findIndex((c, i) => c.prev !== S.chain[i + 1].hash);
    const stale = S.props.filter(p => p.signed.length < RULES.quorum && Math.floor(S.day) - p.at > RULES.staleAfter * effectsFor(p.syn).staleAfterMul).length;
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
  $('#regen').onclick = () => { const seed = +$('#seed').value || D.seed; W = weave(seed, D.pred, D.spells, D.syndicateCount, D.doorCount); S.seed = seed; S.props = []; note(`Re-generated with seed ${seed}: another sixty-three, another two hundred doors, another twenty-one crofts. The chain stands, and so do the wax and the holds already built; the people at the doors do not.`); save(); render(); };
  $('#download').onclick = () => { const files = {}; for (const t of [...W.people, ...W.syndicates, ...W.doors, ...W.crofts]) files[(t.kind === 'croft' ? 'templates-croft/' : 'templates-coven/') + t.id + '.json'] = t;
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify({ seed: S.seed, wovenBy: 'coven.html', count: Object.keys(files).length, files }, null, 1)], { type: 'application/json' })); a.download = `templates-coven-seed-${S.seed}.json`; document.body.append(a); a.click(); a.remove(); };
  render(); setInterval(() => { step(1); render(); }, RULES.secondsPerDay * 1000); setInterval(save, 5000); addEventListener('beforeunload', save);
})();

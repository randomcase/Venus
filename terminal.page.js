/* terminal.page.js — the script for terminal.html. Inlined by terminal.mjs.

   A notebook before an automation. You do a thing by hand, you see the number it
   changed, you do it again; when the sequence is right you record it and set it
   running. Nothing is automated that was not first typed. */
(function () {
  const D = JSON.parse(document.getElementById('def-json').textContent);
  const $ = s => document.querySelector(s), out = $('#out'), inp = $('#in');
  const fmt = n => Math.round(n).toLocaleString('en-US');
  const FERT = [0, 0.6, 0.8, 1, 1.3];
  /* every read is fresh, and every write goes back at once: nothing is held between commands,
     so a deck open in another tab is never overwritten by something this page remembered */
  const J = k => { try { return JSON.parse(localStorage.getItem(k) || 'null') || {}; } catch (e) { return {}; } };
  const put = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const say = (text, cls) => { const d = document.createElement('div'); if (cls) d.className = cls; d.textContent = text; out.append(d); out.scrollTop = 1e9; return d; };
  const html = (h) => { const d = document.createElement('div'); d.innerHTML = h; out.append(d); out.scrollTop = 1e9; };

  let here = 'the bridge';
  const T = J('terminal.v1'); const HIST = T.hist || []; const MACROS = T.macros || {}; let recording = null, timer = null;
  const saveT = () => put('terminal.v1', { hist: HIST.slice(-200), macros: MACROS });
  const parcelAt = (x, y) => { const i = y * D.N + x; return { x, y, clan: D.clans[+D.idx[i]], fert: FERT[+D.fert[i]], region: D.regions[D.clans[+D.idx[i]].id] }; };

  /* ---------------------------------------------------------------- commands */
  const CMD = {};
  const cmd = (name, args, help, fn) => { CMD[name] = { name, args, help, fn }; };

  cmd('help', '', 'what can be typed here', () => {
    html('<span class="dim">Every command acts on the decks\' own saved state. A command that changes something says what it changed.</span>');
    for (const c of Object.values(CMD)) html(`<span class="sea">${c.name}${c.args ? ' ' + c.args : ''}</span>  <span class="dim">${c.help}</span>`);
  });

  cmd('look', '', 'where the work is stuck, and what to do next', () => {
    const c = J('clans.v1'), ct = J('continent.v1'), v = J('village.v1'), t = J('town.v1'), cv = J('coven.v1'), d = J('descent.v1');
    const piles = Object.values(c.piles || {}).reduce((a, b) => a + b, 0), grown = (ct.cells || []).filter(x => x === 2).length;
    say(`The Hesperus, ${J('hesperus.v1').launched ? 'under way' : 'not yet launched'}. ${fmt(d.heze || 0)} HEZE on the docket, ${fmt(d.issued || 0)} issued of 21,000,000.`);
    const L = [];
    if (!c.piles) L.push(['the clans are unmanned', 'take']);
    else if (piles < 3) L.push([`only ${fmt(piles)} units piled, and a sowing costs ${D.rules.continent.sowCost}`, 'take']);
    else if (!grown) L.push([`${fmt(piles)} piled and no parcel sown`, 'sow 31 31']);
    else if (!(ct.produced > 0)) L.push([`${fmt(grown)} parcels grown, no provision made yet`, 'wait, or sow more']);
    else if ((ct.produced || 0) > (v.drawnContinent || 0) + 50) L.push([`${fmt((ct.produced || 0) - (v.drawnContinent || 0))} provision undrawn on the continent`, 'open the village']);
    else if (!(t.citizens > 0)) L.push(['the town has no citizens', 'open the town and build a guild']);
    else if (!(t.rentSent > 0)) L.push(['no rent is going down to the clans', 'build a tenement in the town']);
    if ((cv.props || []).length && !(cv.props || []).some(p => p.signed.length >= 2)) L.push([`${cv.props.length} proposals open and none signed`, 'sign']);
    if (!L.length) say('Every link is carrying. Nothing in the loop is waiting on you.', 'ok');
    else for (const [what, next] of L) html(`<span class="bad">stuck</span> ${what} <span class="dim">→ try</span> <span class="sea">${next}</span>`);
    say(`clans ${fmt(piles)} piled · continent ${fmt(grown)}/4080 grown, ${fmt(ct.produced || 0)} produced · village ${fmt(v.grain || 0)} grain, ${v.households || 0} households · town ${t.citizens || 0} citizens, ${fmt(t.rentSent || 0)} rent sent · coven ${(cv.chain || []).length} checkpoints`, 'dim');
  });

  cmd('piles', '', 'what the clans have under cover', () => {
    const c = J('clans.v1'); if (!c.piles) return say('The clans have not been opened. Nothing is piled.', 'dim');
    for (const cl of D.clans) say(`${cl.resource.padEnd(10)} ${String(Math.round(c.piles[cl.resource] || 0)).padStart(7)}   ${cl.name}, every ${cl.period} days`);
    say(`${fmt(Object.values(c.piles).reduce((a, b) => a + b, 0))} in all · ${(c.held || []).length} assets held`, 'dim');
  });

  cmd('take', '[id]', 'take a clan asset; with no id, list what is affordable', a => {
    const c = J('clans.v1'), d = J('descent.v1');
    if (!c.held) return say('The clans have not been opened yet. Open clans.html once so the jarl gets his hoard, then come back.', 'dim');
    if (!a[0]) { const can = D.assets.filter(x => !c.held.includes(x.id) && x.cost <= (d.heze || 0)).slice(0, 14);
      if (!can.length) return say(`Nothing affordable at ${fmt(d.heze || 0)} HEZE.`, 'dim');
      for (const x of can) say(`${x.id.padEnd(18)} ${String(fmt(x.cost)).padStart(7)} HEZE  ${x.name}`);
      return say(`${can.length} shown. take <id>`, 'dim'); }
    const x = D.assets.find(y => y.id === a[0]); if (!x) return say(`No asset called ${a[0]}.`, 'bad');
    if (c.held.includes(x.id)) return say(`${x.id} is already held.`, 'dim');
    if ((d.heze || 0) < x.cost) return say(`${x.name} costs ${fmt(x.cost)} HEZE and the docket has ${fmt(d.heze || 0)}.`, 'bad');
    d.heze -= x.cost; (d.ledger = d.ledger || []).unshift({ t: Date.now(), line: 'Terminal: ' + x.name, amt: -x.cost });
    c.held.push(x.id); (c.log = c.log || []).unshift({ t: Math.floor(c.day || 0), m: `Took ${x.name} from the terminal.` });
    put('descent.v1', d); put('clans.v1', c);
    say(`Took ${x.name} for ${fmt(x.cost)} HEZE. The docket has ${fmt(d.heze)} left; ${c.held.length} assets held.`, 'ok');
  });

  cmd('parcel', '<x> <y>', 'what is at a parcel of Aphrodite Terra', a => {
    const x = +a[0], y = +a[1]; if (!(x >= 0 && x < D.N && y >= 0 && y < D.N)) return say(`Give two numbers from 0 to ${D.N - 1}.`, 'bad');
    const p = parcelAt(x, y), ct = J('continent.v1'), s = (ct.cells || [])[y * D.N + x] || 0;
    say(`parcel-${x}-${y} · ${p.region} · ${p.clan.name} · ${p.clan.resource} every ${p.clan.period} days · fertility ${p.fert}${p.fert === 0 ? ' (lava; nothing takes)' : ''} · ${['bare', 'sown', 'grown'][s]}`);
  });

  cmd('sow', '<x> <y>', 'sow a parcel from its clan\'s pile', a => {
    const x = +a[0], y = +a[1]; if (!(x >= 0 && x < D.N && y >= 0 && y < D.N)) return say(`Give two numbers from 0 to ${D.N - 1}.`, 'bad');
    const p = parcelAt(x, y); if (p.fert === 0) return say(`parcel-${x}-${y} is a lava flow. Nothing takes there.`, 'bad');
    const ct = J('continent.v1'), c = J('clans.v1'), cost = D.rules.continent.sowCost;
    if (!c.piles) return say('There are no piles to sow from. Open the clans first.', 'bad');
    if (!ct.cells) { ct.cells = new Array(D.N * D.N).fill(0); ct.day = ct.day || 0; ct.produced = ct.produced || 0; ct.sown = ct.sown || 0; ct.spread = ct.spread || 0; ct.log = ct.log || []; ct.seed = ct.seed || 4096; }
    const i = y * D.N + x; if (ct.cells[i]) return say(`parcel-${x}-${y} is already ${['bare', 'sown', 'grown'][ct.cells[i]]}.`, 'dim');
    if ((c.piles[p.clan.resource] || 0) < cost) return say(`The ${p.clan.resource} pile holds ${Math.round(c.piles[p.clan.resource] || 0)} and a sowing costs ${cost}.`, 'bad');
    c.piles[p.clan.resource] -= cost; ct.cells[i] = 1; ct.sown = (ct.sown || 0) + 1;
    (ct.log = ct.log || []).unshift({ t: Math.floor(ct.day || 0), m: `Sowed parcel-${x}-${y} in ${p.region} from the terminal.` });
    ct.saved = Date.now(); c.saved = Date.now(); put('continent.v1', ct); put('clans.v1', c);
    say(`Sowed parcel-${x}-${y} in ${p.region}. ${cost} ${p.clan.resource} drawn; the pile holds ${Math.round(c.piles[p.clan.resource])}. It grows on ${p.clan.name}'s period, every ${p.clan.period} days.`, 'ok');
  });

  cmd('doors', '', 'what is open at the doors of the coven', () => {
    const cv = J('coven.v1'); if (!cv.props) return say('The coven has not been opened.', 'dim');
    if (!cv.props.length) return say('No proposals open. They arrive on their own.', 'dim');
    for (const p of cv.props.slice(0, 12)) say(`${p.id.padEnd(6)} door ${String(p.door).padStart(3)}  ${p.signed.length}/2  ${p.why} · ${fmt(p.amount)} HEZE${p.signed.length ? ' · signed by the ' + p.signed.join(' and the ') : ''}`);
    say(`${cv.props.length} open · ${cv.props.filter(p => p.signed.length >= 2).length} have two of three and wait for the carry · ${(cv.chain || []).length} checkpoints`, 'dim');
  });

  cmd('sign', '<id> <office>', 'sign a proposal as witch, wizard or warlock', a => {
    const cv = J('coven.v1'); if (!cv.props) return say('The coven has not been opened.', 'bad');
    if (!a[0]) return say('sign <id> <witch|wizard|warlock> — see doors', 'dim');
    const p = cv.props.find(x => x.id === a[0]); if (!p) return say(`No proposal ${a[0]} open.`, 'bad');
    const o = (a[1] || '').toLowerCase(); if (!['witch', 'wizard', 'warlock'].includes(o)) return say('The offices are witch, wizard and warlock.', 'bad');
    if (p.signed.includes(o)) return say(`The ${o} has already signed ${p.id}.`, 'dim');
    if (p.signed.length >= 2) return say(`${p.id} already has two of three; it waits for the carry.`, 'dim');
    p.signed.push(o); cv.saved = Date.now(); put('coven.v1', cv);
    say(`The ${o} signed ${p.id} at door ${p.door}. ${p.signed.length} of 2.${p.signed.length >= 2 ? ' It waits for the carry now.' : ''}`, 'ok');
  });

  cmd('carry', '', 'run the syndication now', async () => {
    const cv = J('coven.v1'); if (!cv.chain) return say('The coven has not been opened.', 'bad');
    const ready = (cv.props || []).filter(p => p.signed.length >= 2);
    const prev = cv.chain.length ? cv.chain[0].hash : '0'.repeat(64);
    const h = ((cv.chain.length + 1) * 2654435761 ^ 0x9e3779b9) >>> 0;
    const far = { events: 900000 + (h % 700000), worlds: 3 + (h >>> 20) % 5, note: 'reconciled without comment' };
    const body = JSON.stringify({ at: Math.floor(cv.day || 0), prev, far, events: ready.map(p => ({ id: p.id, door: p.door, syn: p.syn, amount: p.amount, signed: p.signed })) });
    let hash; try { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(body)); hash = [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); } catch (e) { hash = 'sha-256 unavailable'; }
    cv.chain.unshift({ n: cv.chain.length + 1, at: Math.floor(cv.day || 0), count: ready.length, amount: ready.reduce((a, p) => a + p.amount, 0), prev, hash, far });
    cv.props = (cv.props || []).filter(p => p.signed.length < 2); cv.carried = (cv.carried || 0) + ready.length; cv.lastSync = Math.floor(cv.day || 0); cv.saved = Date.now(); put('coven.v1', cv);
    say(`Syndication ${cv.chain.length}: ${ready.length} carried, ${fmt(ready.reduce((a, p) => a + p.amount, 0))} HEZE. Checkpoint ${hash.slice(0, 16)}…`, 'ok');
    say(`The far side sent back ${fmt(far.events)} events from ${far.worlds} worlds, ${far.note}. Ours was ${(100 * ready.length / (ready.length + far.events)).toFixed(5)}% of the interval.`, 'sea');
  });

  /* ------------------------------------------------- the notebook: JSON and calls */
  cmd('json', '<path>', 'read a template or a rulebook, as it is on disk', async a => {
    if (!a[0]) return say('json templates-rules/clans.json', 'dim');
    const over = (J('custom.v1') || {})[a[0]];
    if (over) { say(`${a[0]} — your kept version, from this browser:`, 'sea'); return say(JSON.stringify(over, null, 1)); }
    try { const r = await fetch(a[0]); if (!r.ok) throw new Error(r.status); say(`${a[0]} — as built:`, 'sea'); say(JSON.stringify(await r.json(), null, 1)); }
    catch (e) { say(`${a[0]} could not be read (${e.message}).`, 'bad'); }
  });

  cmd('set', '<path> <key> <value>', 'change a rule and keep it in this browser; the deck reads it next load', async a => {
    if (a.length < 3) return say('set templates-rules/continent.json sowCost 5', 'dim');
    const [path, key, ...rest] = a, raw = rest.join(' ');
    if (/templates-rules\/docket\.json$/.test(path)) return say('The docket\'s rulebook holds from door 1 to door 200 and is not editable. The ledger enforces it, not this page.', 'bad');
    const custom = J('custom.v1'); let doc = custom[path];
    if (!doc) { try { const r = await fetch(path); if (!r.ok) throw new Error(r.status); doc = await r.json(); } catch (e) { return say(`${path} could not be read (${e.message}).`, 'bad'); } }
    let val; try { val = JSON.parse(raw); } catch (e) { val = raw; }
    const target = doc.rules && key in doc.rules ? doc.rules : doc;
    const was = target[key]; target[key] = val;
    custom[path] = doc; put('custom.v1', custom);
    say(`${path}: ${key} was ${JSON.stringify(was)}, is now ${JSON.stringify(val)}. Kept in this browser; that deck plays by it on its next load.`, 'ok');
  });

  cmd('state', '<deck>', 'the raw JSON a deck has saved', a => {
    const K = { clans: 'clans.v1', continent: 'continent.v1', village: 'village.v1', town: 'town.v1', market: 'market.v1', coven: 'coven.v1', docket: 'descent.v1', ship: 'hesperus.v1', chronicle: 'chronicle.v1', custom: 'custom.v1', terminal: 'terminal.v1' };
    if (!K[a[0]]) return say(`state <${Object.keys(K).join('|')}>`, 'dim');
    const v = J(K[a[0]]); const s = JSON.stringify(v, null, 1);
    say(s.length > 4000 ? s.slice(0, 4000) + `\n… ${s.length} characters in all; the whole of it is under ${K[a[0]]}.` : s);
  });

  cmd('api', '<path>', 'call the ledger server on 7332 and print what comes back', async a => {
    const path = a[0] || '/api/summary', url = 'http://localhost:7332' + (path.startsWith('/') ? path : '/api/' + path);
    say(`GET ${url}`, 'dim');
    try { const r = await fetch(url); const j = await r.json(); const s = JSON.stringify(j, null, 1);
      say(s.length > 4000 ? s.slice(0, 4000) + '\n… truncated' : s); }
    catch (e) { say(`No answer from the ledger server (${e.message}). Start it with: node ledger/serve.mjs ledger/bank 7332`, 'bad'); }
  });

  cmd('ask', '<question>', 'ask the counsel aboard, through the ledger server', async a => {
    if (!a.length) return say('ask how much is on the docket', 'dim');
    const decks = { clans: J('clans.v1'), continent: (() => { const c = J('continent.v1'); return { day: c.day, produced: c.produced, grown: (c.cells || []).filter(x => x === 2).length }; })(), village: J('village.v1'), town: J('town.v1'), market: J('market.v1'), coven: (() => { const c = J('coven.v1'); return { carried: c.carried, checkpoints: (c.chain || []).length, open: (c.props || []).length }; })(), docket: J('descent.v1') };
    const d = say('…', 'dim');
    try { const r = await fetch('http://localhost:7332/api/counsel', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question: a.join(' '), decks }) });
      const j = await r.json(); d.textContent = j.answer || j.error || 'No answer came back.'; d.className = ''; }
    catch (e) { d.textContent = 'The counsel is not aboard. Start the ledger server with an ANTHROPIC_API_KEY in the environment.'; d.className = 'bad'; }
  });

  cmd('define', '<word>', 'the glossary', a => {
    const q = a.join(' ').toLowerCase(); if (!q) return say('define heze', 'dim');
    const hits = D.terms.filter(t => t.w.toLowerCase() === q) .concat(D.terms.filter(t => t.w.toLowerCase() !== q && t.w.toLowerCase().includes(q)));
    if (!hits.length) return say(`Nothing in the glossary called "${q}". It only holds what the templates actually say.`, 'dim');
    for (const h of hits.slice(0, 6)) { html(`<span class="sea">${h.w}</span>`); say(h.d, 'dim'); }
    if (hits.length > 6) say(`… and ${hits.length - 6} more.`, 'dim');
  });

  cmd('chronicle', '[n]', 'the last lines the ship wrote about itself', a => {
    const c = J('chronicle.v1'), n = Math.min(+a[0] || 12, 60);
    if (!(c.lines || []).length) return say('The chronicle has written nothing yet. Open the glossary once and leave a deck running.', 'dim');
    for (const l of c.lines.slice(0, n).reverse()) say(`${new Date(l.t).toLocaleTimeString()}  ${l.text}`);
    say(`${c.lines.length} lines in all.`, 'dim');
  });

  /* --------------------------------------------- from the notebook to automation */
  cmd('record', '<name>', 'start recording what you type into a macro', a => {
    if (!a[0]) return say('record morning', 'dim');
    recording = { name: a[0], lines: [] }; say(`Recording into "${a[0]}". Type the commands, then: end`, 'ok');
  });
  cmd('end', '', 'stop recording and keep the macro', () => {
    if (!recording) return say('Nothing is being recorded.', 'dim');
    MACROS[recording.name] = recording.lines; saveT();
    say(`Kept "${recording.name}" with ${recording.lines.length} commands. Run it with: run ${recording.name}`, 'ok'); recording = null;
  });
  cmd('macros', '', 'what has been recorded', () => {
    const k = Object.keys(MACROS); if (!k.length) return say('Nothing recorded yet. record <name>, then type, then end.', 'dim');
    for (const n of k) say(`${n.padEnd(14)} ${MACROS[n].length} commands: ${MACROS[n].join(' ; ')}`);
  });
  cmd('run', '<name>', 'run a macro once', async a => {
    const m = MACROS[a[0]]; if (!m) return say(`No macro called ${a[0]}.`, 'bad');
    say(`running ${a[0]} — ${m.length} commands`, 'dim'); for (const line of m) await exec(line, true);
  });
  cmd('automate', '<name> <seconds>', 'run a macro on an interval; this is the line the notebook was for', async a => {
    if (!a[0]) return say('automate morning 20', 'dim');
    const m = MACROS[a[0]]; if (!m) return say(`No macro called ${a[0]}. Record it first: nothing is automated here that was not first typed.`, 'bad');
    const s = Math.max(5, +a[1] || 30); if (timer) clearInterval(timer);
    timer = setInterval(async () => { say(`— ${a[0]} —`, 'dim'); for (const line of m) await exec(line, true); }, s * 1000);
    say(`"${a[0]}" runs every ${s} seconds until you type stop. It does exactly what you typed, and says what it changed each time.`, 'ok');
  });
  cmd('stop', '', 'stop the automation', () => { if (!timer) return say('Nothing is running.', 'dim'); clearInterval(timer); timer = null; say('Stopped.', 'ok'); });
  cmd('clear', '', 'clear the screen', () => { out.innerHTML = ''; });

  /* ------------------------------------------------------------------ the loop */
  async function exec(line, quiet) {
    const parts = line.trim().split(/\s+/); if (!parts[0]) return;
    const c = CMD[parts[0].toLowerCase()];
    if (!quiet) html(`<span class="you">&gt; ${line.replace(/</g, '&lt;')}</span>`);
    if (!c) return say(`No command "${parts[0]}". Type help.`, 'bad');
    if (recording && !['record', 'end', 'help', 'clear', 'macros'].includes(c.name)) recording.lines.push(line.trim());
    try { await c.fn(parts.slice(1)); } catch (e) { say(`${c.name} failed: ${e.message}`, 'bad'); }
  }
  let hi = HIST.length;
  inp.addEventListener('keydown', async e => {
    if (e.key === 'Enter') { const line = inp.value; inp.value = ''; if (!line.trim()) return; HIST.push(line); hi = HIST.length; saveT(); await exec(line); }
    else if (e.key === 'ArrowUp') { if (hi > 0) { hi--; inp.value = HIST[hi] || ''; } e.preventDefault(); }
    else if (e.key === 'ArrowDown') { if (hi < HIST.length) { hi++; inp.value = HIST[hi] || ''; } e.preventDefault(); }
  });
  addEventListener('click', () => { if (!getSelection().toString()) inp.focus(); });
  setInterval(() => { const cv = J('coven.v1'), c = J('clans.v1'); $('#where').textContent = `${J('hesperus.v1').launched ? 'under way' : 'in dock'} · ${fmt(Object.values(c.piles || {}).reduce((a, b) => a + b, 0))} piled · ${(cv.chain || []).length} checkpoints${timer ? ' · automating' : ''}${recording ? ' · recording' : ''}`; }, 2000);
  say('The terminal. Everything the decks do with buttons can be done here in words, against the same state.', 'sea');
  say('This is the notebook: read the JSON, call the api, change a rule, do it by hand until it is right. Then record it and automate it. Nothing runs here that was not first typed.', 'dim');
  say('Type help.', 'dim');
  inp.focus();
})();

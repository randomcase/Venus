/* glossary.page.js — the script for glossary.html. Inlined by glossary.mjs. */
(function () {
  const D = JSON.parse(document.getElementById('def-json').textContent);
  const $ = s => document.querySelector(s), fmt = n => Math.round(n).toLocaleString('en-US');
  const J = k => { try { return JSON.parse(localStorage.getItem(k) || 'null') || {}; } catch (e) { return {}; } };
  const KEY = 'chronicle.v1';
  let C = J(KEY); if (!C.lines) C = { lines: [], last: null, started: Date.now(), saved: Date.now() };
  const save = () => { C.saved = Date.now(); localStorage.setItem(KEY, JSON.stringify(C)); };

  /* WHAT THE CHRONICLE WATCHES. Each watcher reads one quantity out of one deck's saved state
     and says how to write a change in it. Nothing is written unless the number actually moved,
     and the line always carries the amount, so the text can be checked against the state. */
  const WATCH = [
    { id: 'heze', deck: 'the docket', read: s => Math.round(s.descent.heze || 0), unit: 'HEZE',
      up: (d, v) => `The docket took in ${fmt(d)} HEZE, and stands at ${fmt(v)}.`, down: (d, v) => `${fmt(d)} HEZE went out of the docket, leaving ${fmt(v)}.` },
    { id: 'piles', deck: 'the clans', read: s => Math.round(Object.values(s.clans.piles || {}).reduce((a, b) => a + b, 0)), unit: 'units piled',
      up: (d, v) => `The clans piled ${fmt(d)} more; ${fmt(v)} is under cover.`, down: (d, v) => `${fmt(d)} went off the piles, by raid or by upkeep or by sowing. ${fmt(v)} left.` },
    { id: 'grown', deck: 'the continent', read: s => (s.continent.cells || []).filter(x => x === 2).length, unit: 'parcels',
      up: (d, v) => `${fmt(d)} more parcels of Aphrodite Terra came up. ${fmt(v)} of 4,080 arable are grown.`, down: (d, v) => `${fmt(d)} parcels went back to bare. ${fmt(v)} still stand.` },
    { id: 'produced', deck: 'the continent', read: s => Math.round(s.continent.produced || 0), unit: 'provision',
      up: (d, v) => `The continent made ${fmt(d)} provision, ${fmt(v)} in all since it was first sown.`, down: () => null },
    { id: 'grain', deck: 'the village', read: s => Math.round(s.village.grain || 0), unit: 'grain',
      up: (d, v) => `${fmt(d)} came up the road to the village. Its store holds ${fmt(v)}.`, down: (d, v) => `The trades took ${fmt(d)} grain. ${fmt(v)} is left in the village.` },
    { id: 'households', deck: 'the village', read: s => s.village.households || 0, unit: 'households',
      up: (d, v) => `${d} more households in the village; ${v} now.`, down: (d, v) => `The village is ${d} households smaller, at ${v}.` },
    { id: 'citizens', deck: 'the town', read: s => s.town.citizens || 0, unit: 'citizens',
      up: (d, v) => `${d} more citizens in the town, fed on what came up from the fields. ${v} in all.`, down: (d, v) => `${d} fewer citizens; the town holds ${v}.` },
    { id: 'rent', deck: 'the town', read: s => Math.round(s.town.rentSent || 0), unit: 'HEZE of rent',
      up: (d, v) => `The town sent ${fmt(d)} HEZE of rent back down to the clans, ${fmt(v)} since the charter.`, down: () => null },
    { id: 'held', deck: 'the market', read: s => (s.market.held || []).length, unit: 'tranches',
      up: (d, v) => `${d} more tranches taken on the market; the portfolio holds ${v}.`, down: (d, v) => `${d} tranches sold. ${v} held.` },
    { id: 'carried', deck: 'the coven', read: s => s.coven.carried || 0, unit: 'events carried',
      up: (d, v) => `The warlocks carried ${fmt(d)} signed events across at the syndication. ${fmt(v)} have crossed in all.`, down: () => null },
    { id: 'checkpoints', deck: 'the coven', read: s => (s.coven.chain || []).length, unit: 'checkpoints',
      up: (d, v) => `A checkpoint was committed over the crossing; the chain is ${v} deep.`, down: () => null },
    { id: 'chartered', deck: 'the town', read: s => s.town.chartered ? 1 : 0, unit: 'charter',
      up: () => 'The town took its charter. Nobody asked the village.', down: () => 'The charter is gone.' },
    { id: 'launched', deck: 'the ship', read: s => s.hesperus.launched ? 1 : 0, unit: 'launch',
      up: () => 'The Hesperus is under way. Every deck was at zero when she went.', down: () => null },
  ];
  const snap = () => { const s = { descent: J('descent.v1'), clans: J('clans.v1'), continent: J('continent.v1'), village: J('village.v1'), town: J('town.v1'), market: J('market.v1'), coven: J('coven.v1'), hesperus: J('hesperus.v1') };
    const o = {}; for (const w of WATCH) { try { o[w.id] = w.read(s); } catch (e) { o[w.id] = 0; } } return o; };

  function tick() { const now = snap();
    if (!C.last) { C.last = now; if (!C.lines.length) write('The chronicle opens. From here it writes a line whenever a quantity on some deck actually moves, and nothing at all when nothing does.', true); save(); return render(); }
    let wrote = false;
    for (const w of WATCH) { const a = C.last[w.id] || 0, b = now[w.id] || 0; if (a === b) continue;
      const line = b > a ? w.up(b - a, b) : w.down(a - b, b); if (line) { write(line); wrote = true; } }
    C.last = now; if (wrote) save(); render(); }
  function write(text, quiet) { C.lines.unshift({ t: Date.now(), text }); C.lines.length = Math.min(C.lines.length, 400); if (!quiet) C.saved = Date.now(); }
  const when = t => { const s = (Date.now() - t) / 1000; return s < 60 ? 'just now' : s < 3600 ? `${Math.round(s / 60)} min ago` : s < 86400 ? `${Math.round(s / 3600)} h ago` : new Date(t).toLocaleString(); };

  function render() { $('#chron').innerHTML = C.lines.length ? C.lines.map(l => `<p><small>${when(l.t)}</small>${l.text}</p>`).join('') : '<p class="q">Nothing has moved yet. Open a deck and leave it running; this fills itself.</p>';
    const now = C.last || {}; $('#watch').innerHTML = WATCH.map(w => `<div class="stat"><span>${w.unit} <small style="opacity:.6">${w.deck}</small></span><b>${fmt(now[w.id] || 0)}</b></div>`).join('')
      + `<p style="color:var(--dim);font-size:12px;margin:8px 0 0">${C.lines.length} lines since ${new Date(C.started).toLocaleDateString()}. The chronicle keeps writing while this page is open, and picks up whatever moved while it was closed.</p>`; }

  /* the glossary: filtered, and live where a term has a current value */
  const LIVE = {
    cap: () => `${fmt(J('descent.v1').issued || 0)} issued of 21,000,000`,
    intervalDays: () => { const c = J('coven.v1'); return c.day != null ? `next carry in ${Math.max(0, 183 - (Math.floor(c.day) - (c.lastSync || 0)))} days` : null; },
    door: () => { const c = J('coven.v1'); return (c.props || []).length ? `${c.props.length} proposals open at the doors` : null; },
    syndication: () => { const c = J('coven.v1'); return (c.chain || []).length ? `${c.chain.length} checkpoints committed, ${fmt(c.carried || 0)} events carried` : null; },
    grainPerCitizen: () => { const v = J('village.v1'), t = J('town.v1'); return v.grain != null ? `${fmt(v.grain)} grain in the village feeds ${Math.floor((v.grain || 0) / 10)} of the town's ${t.citizens || 0}` : null; },
    sowCost: () => { const c = J('continent.v1'); return c.cells ? `${(c.cells || []).filter(x => x === 2).length} parcels grown so far` : null; },
    'the clans': () => { const c = J('clans.v1'); return c.piles ? `${fmt(Object.values(c.piles).reduce((a, b) => a + b, 0))} units piled` : null; },
    'the market': () => { const m = J('market.v1'); return m.held ? `${m.held.length} tranches held at degree ${m.degree}` : null; },
    'the town': () => { const t = J('town.v1'); return t.built ? `${t.citizens || 0} citizens, ${fmt(t.rentSent || 0)} HEZE sent down` : null; },
    'the coven': () => { const c = J('coven.v1'); return c.chain ? `${c.chain.length} checkpoints, ${(c.props || []).length} open at the doors` : null; },
  };
  let filter = '', src = '';
  function terms() { const q = filter.toLowerCase();
    const list = D.terms.filter(t => (!src || t.source === src) && (!q || t.word.toLowerCase().includes(q) || t.sense.toLowerCase().includes(q)));
    $('#count').textContent = `${list.length} of ${D.terms.length} terms`;
    $('#terms').innerHTML = list.map(t => { let now = null; try { now = LIVE[t.word] ? LIVE[t.word]() : null; } catch (e) {}
      return `<div class="entry"><b>${t.word}</b> <span class="src">${t.source}</span><p>${t.sense}</p>${now ? `<p class="now">now: ${now}</p>` : ''}</div>`; }).join('') || '<div class="entry"><p>No term of that name. The glossary only holds what the templates actually say.</p></div>'; }
  $('#q').oninput = e => { filter = e.target.value; terms(); };
  $('#sources').innerHTML = [['', 'everything'], ...D.sources.map(s => [s, s])].map(([v, l]) => `<button data-s="${v}">${l}</button>`).join('');
  $('#sources').querySelectorAll('button').forEach(b => b.onclick = () => { src = b.dataset.s; terms(); });
  $('#download').onclick = () => { const text = C.lines.slice().reverse().map(l => `${new Date(l.t).toISOString()}  ${l.text}`).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([`The chronicle of the Hesperus\nopened ${new Date(C.started).toISOString()}\n${C.lines.length} lines\n\n${text}\n`], { type: 'text/plain' })); a.download = 'chronicle.txt'; document.body.append(a); a.click(); a.remove(); };
  $('#clear').onclick = () => { if (!confirm('Start a new chronicle? What it has written is lost unless you download it first.')) return; C = { lines: [], last: snap(), started: Date.now(), saved: Date.now() }; save(); render(); };
  terms(); tick(); setInterval(tick, 3000);
})();

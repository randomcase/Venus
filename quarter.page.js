/* quarter.page.js — the script for quarter.html. Inlined by quarter.mjs. */
(function () {
  const D = JSON.parse(document.getElementById('def-json').textContent), R = D.rooms;
  const $ = s => document.querySelector(s), fmt = n => Math.round(n).toLocaleString('en-US');
  const J = k => { try { return JSON.parse(localStorage.getItem(k) || 'null') || {}; } catch (e) { return {}; } };
  /* customizations kept in this browser, keyed by path; the quarter reads its own back before drawing anything */
  let OV = J('custom.v1'); const keepOV = () => localStorage.setItem('custom.v1', JSON.stringify(OV));
  function applyOverrides() { for (const room of R) { const o = OV['templates-quarter/room-' + room.id + '.json']; if (o) Object.assign(room, o, { id: room.id, pieces: room.pieces }); for (const p of room.pieces) { const q = OV['templates-quarter/' + p.id + '.json']; if (q) Object.assign(p, q, { id: p.id, room: p.room }); } } }
  applyOverrides();
  const cv = $('#plan'), g = cv.getContext('2d'); let cur = 0;
  /* the same 2 × 3 as on the bridge: library and loom hall across the top, walk and workshop, shelf and the empty room */
  const cell = i => { const W = cv.width, H = cv.height, c = i % 2, r = Math.floor(i / 2); return { x: 14 + c * (W - 28) / 2, y: 14 + r * (H - 28) / 3, w: (W - 28) / 2, h: (H - 28) / 3 }; };
  function draw(t) { const W = cv.width, H = cv.height; g.fillStyle = '#06070d'; g.fillRect(0, 0, W, H);
    R.forEach((room, i) => { const { x, y, w, h } = cell(i), on = i === cur; g.fillStyle = on ? '#141a30' : '#0d1020'; g.fillRect(x, y, w, h); g.strokeStyle = on ? '#f2c98a' : '#2b3445'; g.lineWidth = on ? 2 : 1; g.strokeRect(x, y, w, h);
      g.fillStyle = on ? '#f2c98a' : '#95a0b3'; g.font = '600 13px system-ui'; g.textAlign = 'left'; g.fillText(room.name.toUpperCase(), x + 12, y + 22); g.font = '11px system-ui'; g.fillStyle = '#6f7b96'; g.fillText(`${fmt(room.km2)} km² · ${room.pieces.length} pieces`, x + 12, y + 38);
      const ix = x + 14, iy = y + 50, iw = w - 28, ih = h - 62;
      const byKind = k => room.pieces.filter(p => p.kind === k);
      /* shelves: rows of books */
      byKind('shelf').forEach((p, k) => { const yy = iy + 8 + k * (ih - 16) / Math.max(1, byKind('shelf').length); g.fillStyle = '#5a4630'; g.fillRect(ix, yy, iw * .55, 3); for (let b = 0; b < 18; b++) { g.fillStyle = ['#7a5a1e', '#3f8fbf', '#6fd4a8', '#b46a4a'][(b + k) % 4]; g.fillRect(ix + b * (iw * .55 / 18), yy - 7 - (b + k) % 3, iw * .55 / 18 - 2, 7 + (b + k) % 3); } });
      /* chairs and benches: rounded and bars */
      byKind('chair').forEach((p, k) => { const cx = ix + iw * .62 + (k % 4) * (iw * .38 / 4), cy = iy + 10 + Math.floor(k / 4) * 22; g.fillStyle = '#8a6a3a'; g.beginPath(); g.roundRect(cx, cy, 14, 12, 4); g.fill(); });
      byKind('bench').forEach((p, k) => { const n = byKind('bench').length, cx = ix + (k + .5) * iw / n, cy = iy + ih * (room.id === 'long-walk' ? .55 : .8); g.fillStyle = room.id === 'long-walk' ? '#4a5a7a' : '#8a6a3a'; g.fillRect(cx - 7, cy, 14, 4); g.fillRect(cx - 6, cy + 4, 2, 4); g.fillRect(cx + 4, cy + 4, 2, 4); });
      /* looms: a line with its warp */
      byKind('loom').forEach((p, k) => { const yy = iy + 6 + k * (ih - 12) / Math.max(1, byKind('loom').length); g.strokeStyle = '#c9a26a'; g.lineWidth = 2; g.beginPath(); g.moveTo(ix, yy); g.lineTo(ix + iw * .7, yy); g.stroke(); g.strokeStyle = 'rgba(201,162,106,.45)'; g.lineWidth = 1; for (let s = 0; s < 24; s++) { g.beginPath(); g.moveTo(ix + s * iw * .7 / 24, yy); g.lineTo(ix + s * iw * .7 / 24, yy + 6); g.stroke(); } });
      /* lanterns: lit, blinking on their own */
      byKind('lantern').forEach((p, k) => { const n = byKind('lantern').length, lx = room.id === 'long-walk' ? ix + (k + .5) * iw / n : ix + iw * .62 + (k % 3) * (iw * .38 / 3) + 8, ly = room.id === 'long-walk' ? iy + ih * .3 : iy + ih * .75 + Math.floor(k / 3) * 16; const a = .35 + .65 * Math.max(0, Math.sin(t / 900 + k * 1.3)) ** 2; const gl = g.createRadialGradient(lx, ly, 0, lx, ly, 14); gl.addColorStop(0, p.hue); gl.addColorStop(1, 'rgba(0,0,0,0)'); g.globalAlpha = a; g.fillStyle = gl; g.beginPath(); g.arc(lx, ly, 14, 0, 7); g.fill(); g.globalAlpha = 1; g.fillStyle = '#fff'; g.beginPath(); g.arc(lx, ly, 1.6, 0, 7); g.fill(); });
      /* the long walk itself */
      if (room.id === 'long-walk') { g.strokeStyle = 'rgba(63,143,191,.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(ix, iy + ih * .45); g.lineTo(ix + iw, iy + ih * .45); g.stroke(); }
      /* workbenches and the whiteboard */
      byKind('workbench').forEach((p, k) => { const n = byKind('workbench').length, cols = Math.ceil(n / 2), bx = ix + (k % cols) * iw / cols, by = iy + 6 + Math.floor(k / cols) * (ih * .42); g.fillStyle = '#3a4460'; g.fillRect(bx, by, iw / cols - 8, 12); g.fillStyle = '#3f8fbf'; g.fillRect(bx + 3, by + 3, 5, 5); });
      byKind('whiteboard').forEach(() => { g.fillStyle = '#e8e0d0'; g.fillRect(ix, iy + ih - 12, iw * .5, 8); });
      /* pigeonholes: a grid, a lamp over the stand */
      const holes = byKind('pigeonhole'); if (holes.length) { const cols = 7, rows = Math.ceil(holes.length / cols), cw = iw * .6 / cols, ch = Math.min(18, ih * .8 / rows); holes.forEach((p, k) => { g.strokeStyle = '#5a4630'; g.lineWidth = 1; g.strokeRect(ix + (k % cols) * cw, iy + Math.floor(k / cols) * ch, cw - 2, ch - 2); g.fillStyle = '#f2c98a'; g.fillRect(ix + (k % cols) * cw + 3, iy + Math.floor(k / cols) * ch + 3, cw - 8, 3); }); }
      byKind('stand').forEach(() => { const sx = ix + iw * .8, sy = iy + ih * .5; g.fillStyle = '#8a6a3a'; g.fillRect(sx - 2, sy, 4, 26); g.fillRect(sx - 12, sy - 4, 24, 5); const gl = g.createRadialGradient(sx, sy - 22, 0, sx, sy - 22, 22); gl.addColorStop(0, 'rgba(255,230,107,.5)'); gl.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gl; g.beginPath(); g.arc(sx, sy - 22, 22, 0, 7); g.fill(); });
      /* the table */
      byKind('table').forEach(() => { g.fillStyle = '#5a4630'; g.fillRect(ix + iw * .1, iy + ih - 10, iw * .45, 5); });
      /* the empty room says nothing; a faint mark of the light that comes in */
      if (room.id === 'empty') { g.fillStyle = 'rgba(233,241,255,.05)'; g.fillRect(ix, iy, iw, ih); } });
    requestAnimationFrame(draw); }
  cv.onclick = e => { const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * cv.width, y = (e.clientY - r.top) / r.height * cv.height; R.forEach((room, i) => { const c = cell(i); if (x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) { cur = i; render(); } }); };
  function render() { const room = R[cur]; $('#rooms').innerHTML = R.map((r, i) => `<button class="${i === cur ? 'on' : ''}" data-i="${i}">${r.name}</button>`).join(''); $('#rooms').querySelectorAll('button').forEach(b => b.onclick = () => { cur = +b.dataset.i; render(); });
    $('#room-name').innerHTML = `${room.name}<i>${room.what}</i>`; $('#room-stats').innerHTML = [['area', fmt(room.km2) + ' km²'], ['light', room.light], ['pieces', room.pieces.length]].map(([k, v]) => `<div class="stat"><span>${k}</span><b>${v}</b></div>`).join('');
    $('#pieces').innerHTML = room.pieces.length ? room.pieces.map(p => `<div class="piece"><b>${p.name}</b><p>${p.text}</p><small>woven from ${p.wovenBy}</small></div>`).join('') : `<div class="piece"><b>nothing</b><p>${room.pieces.length === 0 ? 'No furniture. The absence is on the record as a decision.' : ''}</p></div>`; }
  /* the console: the counsel aboard, through the ledger server; honest when it is not there */
  const clog = (who, text) => { const d = document.createElement('div'); d.style.cssText = 'border-bottom:1px solid var(--edge);padding:4px 0'; d.innerHTML = `<b style="color:${who === 'you' ? 'var(--gold)' : 'var(--sea)'}">${who}</b> ${text.replace(/</g, '&lt;')}`; $('#console-log').append(d); $('#console-log').scrollTop = 1e9; };
  async function counsel(q) { const decks = { clans: J('clans.v1'), continent: (() => { const c = J('continent.v1'); return { day: c.day, produced: c.produced, producedBy: c.producedBy, grown: (c.cells || []).filter(x => x === 2).length }; })(), village: J('village.v1'), town: J('town.v1'), market: J('market.v1'), docket: (() => { const d = J('descent.v1'); return { heze: d.heze, issued: d.issued, recent: (d.ledger || []).slice(0, 12) }; })(), quarter: { rooms: R.map(r => ({ name: r.name, km2: r.km2, pieces: r.pieces.length })), customizations: Object.keys(OV).length } };
    try { const r = await fetch('http://localhost:7332/api/counsel', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question: q, decks }) }); const j = await r.json(); return j.answer || j.error || (j.refused ? 'The counsel declined that one.' : 'No answer came back.'); }
    catch (e) { return 'The counsel is not aboard. Run the ledger server (node ledger/serve.mjs ledger/bank 7332) with an ANTHROPIC_API_KEY in the environment, and ask again.'; } }
  $('#console-send').onclick = async () => { const q = $('#console-q').value.trim(); if (!q) return; $('#console-q').value = ''; clog('you', q); clog('counsel', '…'); const a = await counsel(q); $('#console-log').lastChild.innerHTML = `<b style="color:var(--sea)">counsel</b> ${a.replace(/</g, '&lt;')}`; };
  $('#console-q').onkeydown = e => { if (e.key === 'Enter') $('#console-send').click(); };
  clog('counsel', 'Aboard, when the server is. Ask about the decks: the piles, the continent, the village, the town, the market, the docket, or this quarter.');
  /* the editor: load any template by path from the ship, keep the change in this browser, hand it back as a file */
  const note = m => { $('#ed-note').textContent = m; };
  const dl = (name, obj) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(obj, null, 1)], { type: 'application/json' })); a.download = name; document.body.append(a); a.click(); a.remove(); };
  $('#ed-load').onclick = async () => { const p = $('#ed-path').value.trim(); if (OV[p]) { $('#ed-text').value = JSON.stringify(OV[p], null, 1); note(`${p}: your kept version, from this browser.`); return; } try { const r = await fetch(p); if (!r.ok) throw new Error(r.status); $('#ed-text').value = JSON.stringify(await r.json(), null, 1); note(`${p}: loaded from the ship as built.`); } catch (e) { note(`${p}: could not be loaded (${e.message}). Paths are relative to the yard, like templates-clan/bjorn.json.`); } };
  $('#ed-keep').onclick = () => { const p = $('#ed-path').value.trim(); try { OV[p] = JSON.parse($('#ed-text').value); keepOV(); applyOverrides(); render(); note(`${p}: kept in this browser (${Object.keys(OV).length} customization${Object.keys(OV).length === 1 ? '' : 's'} in all). If it is a room or a piece of the quarter, the plan shows it now.`); } catch (e) { note('Not JSON: ' + e.message); } };
  $('#ed-file').onclick = () => { const p = $('#ed-path').value.trim(); try { dl(p.split('/').pop(), JSON.parse($('#ed-text').value)); } catch (e) { note('Not JSON: ' + e.message); } };
  $('#ed-bundle').onclick = () => dl('customizations.json', { wovenBy: 'quarter.html', count: Object.keys(OV).length, files: OV });
  $('#ed-forget').onclick = () => { const p = $('#ed-path').value.trim(); delete OV[p]; keepOV(); note(`${p}: forgotten; reload to see the ship as built.`); };
  render(); requestAnimationFrame(draw);
})();

/* engine.js — Tideline. The rules, with no DOM in them.

   Everything the game knows comes from def.json. This file turns that
   definition into a state machine and exposes it as `Tick`, a small API you
   can drive from the page, the console, the Workshop tab, or a script:

     Tick.load(def, savedState?)   Tick.step(dt)         Tick.tap()
     Tick.buy(machineId, k|'max')  Tick.research(id)     Tick.build(sectorId)
     Tick.setPlan({silver,crew,gear,grain})               Tick.refloat(doctrineId)
     Tick.setPlaystyle(id)         Tick.setAvatar(obj)
     Tick.formDef() Tick.nextForm() Tick.conditions() Tick.canBecome() Tick.become()
     Tick.forestTier() Tick.depthName() Tick.depthNeed(d)
     Tick.state() Tick.def() Tick.mods() Tick.power() Tick.crew() Tick.lift()
     Tick.rates() Tick.light() Tick.cost(m,k) Tick.maxBuy(m) Tick.available(m)
     Tick.catchUp(now) Tick.serialize() Tick.on('log'|'change'|'ship', fn)
     Tick.assemble(files, def) — builds the standalone HTML export.

   Effects are declarative so they can live in JSON:
     {type:'mul', target:'all'|'tap'|'draw'|'lift'|'cargo'|'science'|'storm'|
                          'crewWater'|'crewNeed'|'crewMass'|'researchCost'|
                          'machine:<id>'|'res:<id>', x}
     {type:'add', target:'night', x}      {type:'unlock', id}
   'crewWater' scales every crew upkeep; the name is older than the theme.
*/
(function (root) {
  const T = { version: 2 };
  let D = null, S = null, M = null, flows = {}, handlers = {};
  const byId = (arr, id) => arr.find(x => x.id === id);
  const emit = (e, x) => (handlers[e] || []).forEach(f => f(x));
  T.on = (e, f) => { (handlers[e] = handlers[e] || []).push(f); return T; };
  T.log = (m) => { S.log.unshift({ t: Math.round(S.clock), m }); if (S.log.length > 80) S.log.length = 80; emit('log', m); };
  const defaultAvatar = () => Object.fromEntries((D.avatar ? D.avatar.fields : []).map(f => [f.id, f.default != null ? f.default : f.type === 'range' ? f.min : f.options[0]]));

  T.fresh = () => ({
    v: 2, clock: 0, saved: Date.now(),
    res: Object.fromEntries(D.resources.map(r => [r.id, r.start || 0])),
    total: { [D.primary]: 0, ships: 0 },
    n: Object.fromEntries(D.machines.map(m => [m.id, 0])),
    sectors: D.sectors.filter(s => s.built).map(s => s.id),
    research: [], milestones: [], events: [], log: [],
    ship: { n: 1, t: D.ship.cadence, manifest: null }, plan: { ...D.ship.plan },
    morale: 1, ballast: 0, doctrines: {}, refloats: 0, playstyle: null, avatar: defaultAvatar(), still: D.stillness ? D.stillness.max : 0,
    form: 0, ring: 1, acorns: 0, formsDone: 0, sinceAct: 0, trees: 0, spores: 0, depth: 0, flushT: D.mycelium ? D.mycelium.every : 0,
  });
  const migrate = (s) => { const f = T.fresh(); const o = Object.assign({}, f, s);
    o.res = Object.assign({}, f.res, s.res || {}); o.n = Object.assign({}, f.n, s.n || {});
    o.avatar = Object.assign({}, f.avatar, s.avatar || {}); for (const k of Object.keys(o.avatar)) if (!(k in f.avatar)) delete o.avatar[k]; return o; };

  T.load = (def, state) => { D = def; S = state ? migrate(typeof state === 'string' ? JSON.parse(state) : state) : T.fresh(); recompute(); return T; };
  T.def = () => D; T.state = () => S; T.mods = () => M; T.flows = () => flows;
  T.serialize = () => { S.saved = Date.now(); return JSON.stringify(S); };

  /* ---------------------------------------------------------------- mods */
  const base = () => ({ all: 1, tap: 1, draw: 1, night: 0, cargo: 1, lift: 1, liftBase: 0, science: 1, storm: 1, stillness: 1, decay: 1, cap: 1,
    crewWater: 1, crewNeed: 1, crewMass: 1, researchCost: 1, machine: {}, res: {}, unlock: {} });
  function apply(e, soft = 1) {
    if (e.type === 'unlock') { M.unlock[e.id] = true; return; }
    const [k, id] = e.target.split(':');
    if (e.type === 'add') { M[k] = (M[k] || 0) + e.x; return; }
    const x = soft === 1 ? e.x : 1 + (e.x - 1) * soft;
    if (id) M[k][id] = (M[k][id] || 1) * x; else M[k] = (M[k] || 1) * x;
  }
  function recompute() {
    M = base();
    const ps = S.playstyle && byId(D.playstyles || [], S.playstyle); if (ps) ps.effects.forEach(e => apply(e));
    const se = T.season(); if (se) (se.effects || []).forEach(e => apply(e));
    const fd = T.formDef(); if (fd) (fd.effects || []).forEach(e => apply(e));
    if (D.becoming) M.all *= 1 + D.becoming.perForm * S.formsDone + D.becoming.perRing * (S.ring - 1);
    if (D.forest) { M.all *= 1 + D.forest.perTree * S.trees + D.forest.tierBonus * T.forestTier().index; M.liftBase += D.forest.ground * S.trees; }
    if (D.mycelium) M.all *= 1 + D.mycelium.perLevel * S.depth;
    D.sectors.forEach(s => S.sectors.includes(s.id) && (s.effects || []).forEach(e => apply(e)));
    D.research.forEach(r => S.research.includes(r.id) && (r.effects || []).forEach(e => apply(e)));
    D.milestones.forEach(m => S.milestones.includes(m.id) && (m.effects || []).forEach(e => apply(e)));
    for (const [d, lv] of Object.entries(S.doctrines)) { const doc = byId(D.prestige.doctrines, d); if (doc) for (let i = 0; i < lv; i++) doc.effects.forEach(e => apply(e)); }
    M.all *= 1 + D.prestige.perPoint * S.ballast;
    S.events.forEach(ev => { const d = byId(D.events, ev.id); d && d.effects.forEach(e => apply(e, M.storm)); });
    emit('change');
  }
  const mm = id => M.machine[id] || 1, rm = id => M.res[id] || 1;

  /* --------------------------------------------------------------- world */
  T.phase = () => (S.clock % D.day.length) / D.day.length;
  T.isDay = () => T.phase() < 1 - D.day.night;
  T.light = () => T.isDay() ? 1 : Math.min(1, M.night);
  T.power = (light = T.light()) => {
    let sup = 0, dem = 0;
    for (const m of D.machines) { const n = S.n[m.id]; if (!n) continue;
      if (m.out && m.out.power) { let p = m.out.power * n * mm(m.id) * M.all; if (m.solar) p *= light; if (m.night) p *= light < 1 ? 1 : 0; sup += p; }
      dem += (m.draw || 0) * n * M.draw; }
    return { sup, dem, eff: dem > 0 ? Math.min(1, sup / dem) : 1 };
  };
  T.crew = () => { const need = D.machines.reduce((a, m) => a + (m.crew || 0) * S.n[m.id], 0) * M.crewNeed;
    return { need, have: S.res.crew, eff: need > 0 ? Math.min(1, S.res.crew / need) : 1 }; };
  T.lift = () => ({
    cap: (D.lift.base + M.liftBase + D.machines.reduce((a, m) => a + (m.lift || 0) * S.n[m.id], 0)) * M.lift,
    used: D.machines.reduce((a, m) => a + (m.mass || 0) * S.n[m.id], 0) + S.res.crew * D.lift.crewMass });
  T.available = m => S.sectors.includes(m.sector) && (!m.requires || M.unlock[m.requires]) && (!m.needsMachine || S.n[m.needsMachine.id] >= m.needsMachine.n);
  T.cap = r => { const d = byId(D.resources, r); if (!d || d.cap == null) return Infinity;
    return (d.cap + D.machines.reduce((a, m) => a + ((m.store || {})[r] || 0) * S.n[m.id], 0)) * M.cap; };
  const seasonIdx = () => D.seasons ? Math.floor(S.clock / D.seasons.length) % D.seasons.list.length : -1;
  T.season = () => D.seasons ? D.seasons.list[seasonIdx()] : null;

  /* ---------------------------------------------------------------- buying */
  T.cost = (m, k = 1) => { const g = m.growth || D.growth, n = S.n[m.id], out = {};
    for (const [r, c] of Object.entries(m.cost)) out[r] = Math.ceil(c * Math.pow(g, n) * (Math.pow(g, k) - 1) / (g - 1)); return out; };
  T.can = cost => Object.entries(cost).every(([r, c]) => (S.res[r] || 0) >= c);
  const pay = cost => Object.entries(cost).forEach(([r, c]) => { S.res[r] -= c; });
  T.maxBuy = m => { const L = T.lift(); let lo = 0, hi = 1000;
    const ok = k => T.can(T.cost(m, k)) && L.used + (m.mass || 0) * k <= L.cap;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (ok(mid)) lo = mid; else hi = mid - 1; } return lo; };
  T.buy = (id, k = 1) => { const m = byId(D.machines, id); if (!m || !T.available(m)) return false;
    if (k === 'max') k = T.maxBuy(m); if (k < 1) return false;
    const c = T.cost(m, k); if (!T.can(c)) return false;
    const L = T.lift(); if (L.used + (m.mass || 0) * k > L.cap) { T.log(`No ${D.lift.name} for that. Open more.`); return false; }
    pay(c); S.n[id] += k; emit('change'); return true; };
  T.researchCost = r => Math.ceil(r.cost * M.researchCost);
  T.research = id => { const r = byId(D.research, id); if (!r || S.research.includes(id)) return false;
    if ((r.needs || []).some(x => !S.research.includes(x)) || (r.excludes || []).some(x => S.research.includes(x))) return false;
    const c = T.researchCost(r); if (S.res.science < c) return false;
    S.res.science -= c; S.research.push(id); T.log(`${r.name}: ${r.desc}.`); recompute(); return true; };
  T.sectorOk = s => !S.sectors.includes(s.id) && (s.needs || []).every(x => S.sectors.includes(x));
  T.build = id => { const s = byId(D.sectors, id); if (!s || !T.sectorOk(s)) return false;
    const c = { ...s.cost }; const crew = c.crew || 0; delete c.crew;
    if (S.res.crew < crew || !T.can(c)) return false;
    pay(c); S.sectors.push(id); T.log(`${s.name} (${s.role}) reached.`); recompute(); return true; };
  T.calm = () => D.stillness ? D.stillness.floor + (1 - D.stillness.floor) * S.still / D.stillness.max : 1;
  T.tap = () => { const v = D.tap * M.tap * M.all; S.res[D.primary] += v; S.total[D.primary] += v; S.sinceAct = 0; if (D.stillness) S.still = Math.max(0, S.still - D.stillness.tapCost); return v; };
  const keys = () => Object.keys(D.ship.plan);
  const norm = p => { const t = keys().reduce((a, k) => a + Math.max(0, p[k] || 0), 0) || 1;
    return Object.fromEntries(keys().map(k => [k, Math.max(0, p[k] || 0) / t])); };
  T.setPlan = p => { S.plan = norm(p); return S.plan; };
  T.setPlaystyle = id => { if (S.playstyle || !byId(D.playstyles || [], id)) return false; S.playstyle = id; T.log(`Playstyle: ${byId(D.playstyles, id).name}.`); recompute(); return true; };
  T.setAvatar = a => { Object.assign(S.avatar, a); emit('change'); return S.avatar; };
  T.canRefloat = () => S.sectors.includes(D.prestige.requires) && S.total[D.primary] >= D.prestige.min;
  T.refloatPoints = () => Math.floor(Math.sqrt(S.total[D.primary] / D.prestige.min));
  T.refloat = doc => { if (!T.canRefloat() || !byId(D.prestige.doctrines, doc)) return false;
    const keep = { ballast: S.ballast + T.refloatPoints(), doctrines: { ...S.doctrines, [doc]: (S.doctrines[doc] || 0) + 1 }, refloats: S.refloats + 1, log: S.log, avatar: S.avatar,
      ring: S.ring, acorns: S.acorns, formsDone: S.formsDone, trees: S.trees, spores: S.spores, depth: S.depth, sinceAct: S.sinceAct, flushT: S.flushT };
    S = Object.assign(T.fresh(), keep); recompute();
    T.log(`${D.prestige.name}: reputation ${S.ballast}, rule ${doc}. Everything ×${(1 + D.prestige.perPoint * S.ballast).toFixed(1)} for good.`); return true; };

  /* -------------------------------------------------------------- becoming
     The transformation of things. Three tracks that do not end:
       forms and rings  — what your blade is; ring 1 is scripted, the rest generated
       the forest       — one tree per ring closed, never reset, never lost
       the mycelium     — under everything; fed by rot and by tribute; depth on a log scale */
  const h32 = (a, b, c) => { let x = (Math.imul(a, 73856093) ^ Math.imul(b, 19349663) ^ Math.imul(c, 83492791)) | 0; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return x >>> 0; };
  const cap1 = s => s.charAt(0).toUpperCase() + s.slice(1);
  T.formsPerRing = (r = S.ring) => !D.becoming ? 0 : r === 1 ? D.becoming.forms.length : D.becoming.generator.formsPerRing;
  T.formDef = (r = S.ring, k = S.form) => { const B = D.becoming; if (!B) return null; if (r === 1) return B.forms[Math.min(k, B.forms.length - 1)];
    const g = B.generator, hn = h32(B.seed, r, k * 3 + 1), hp = h32(B.seed, r, k * 3 + 2), hs = h32(B.seed, r, k * 3 + 3);
    const plant = hp % g.names.plant.length, pas = g.passives[hs % g.passives.length];
    const when = { total: { [D.primary]: g.threshold.base * Math.pow(g.threshold.perForm, k) * Math.pow(g.threshold.perRing, r - 1) } };
    if (g.twist && k % g.twist.every === 0) when.stillDays = g.twist.stillDays * r;
    return { id: `r${r}f${k}`, name: g.names.first[hn % g.names.first.length] + ' ' + g.names.plant[plant], shape: g.shapes[plant % g.shapes.length], effects: pas.effects, text: pas.text, when }; };
  T.nextForm = () => S.form + 1 < T.formsPerRing() ? T.formDef(S.ring, S.form + 1) : T.formDef(S.ring + 1, 0);
  T.conditions = (fd = T.formDef()) => { if (!fd || !fd.when) return []; const out = [], w = fd.when, rn = id => (byId(D.resources, id) || { name: id }).name;
    for (const [res, v] of Object.entries(w.total || {})) out.push({ label: `${rn(res)}, all time`, have: S.total[res] || 0, need: v });
    for (const [res, v] of Object.entries(w.res || {})) out.push({ label: `${rn(res)} in hand`, have: S.res[res] || 0, need: v });
    for (const [id, v] of Object.entries(w.n || {})) out.push({ label: (byId(D.machines, id) || { name: id }).name, have: S.n[id] || 0, need: v });
    if (w.sectors != null) out.push({ label: 'chapters', have: S.sectors.length, need: w.sectors === 'all' ? D.sectors.length : w.sectors });
    if (w.stillDays != null) out.push({ label: 'days without acting', have: S.sinceAct, need: w.stillDays });
    out.forEach(c => { c.ok = c.have >= c.need; }); return out; };
  T.canBecome = () => !!D.becoming && T.conditions().every(c => c.ok);
  T.become = () => { if (!T.canBecome()) return false; const was = T.formDef(); S.form++; S.formsDone++;
    if (S.form >= T.formsPerRing()) { S.ring++; S.form = 0; S.acorns++; S.trees++; T.log(`${cap1(was.name)} dropped an acorn. Ring ${S.ring - 1} closed and a tree stands. Ring ${S.ring} begins as ${T.formDef().name}.`); }
    else { const now = T.formDef(); T.log(`${cap1(was.name)} became ${now.name}.${now.text ? ' ' + cap1(now.text) + '.' : ''}`); }
    recompute(); return true; };
  T.forestTier = () => { const F = D.forest; if (!F) return { index: 0, name: '', next: null }; let index = 0, name = F.none || 'no trees yet', next = F.tiers[0];
    F.tiers.forEach((t, i) => { if (S.trees >= t.at) { index = i + 1; name = t.name; next = F.tiers[i + 1] || null; } });
    const last = F.tiers[F.tiers.length - 1]; if (S.trees >= last.at) { const k = Math.floor(Math.log10(S.trees / last.at)); index = F.tiers.length + k; if (k > 0) name = `${last.name}, ${S.trees} trees`; const na = last.at * Math.pow(10, k + 1); next = { at: na, name: `${last.name}, ${na} trees` }; }
    return { index, name, next }; };
  T.depthOf = sp => { const Y = D.mycelium; return !Y || sp < Y.base ? 0 : Math.floor(Math.log(sp / Y.base) / Math.log(Y.growth)) + 1; };
  T.depthNeed = d => D.mycelium ? D.mycelium.base * Math.pow(D.mycelium.growth, d - 1) : Infinity;
  T.depthName = (d = S.depth) => { const n = D.mycelium.names; return d < n.length ? n[d] : `${n[n.length - 1]}, depth ${d}`; };

  /* ------------------------------------------------------------------ tick */
  function arrive() {
    const cargo = D.ship.cargo * M.cargo, man = S.ship.manifest || norm(S.plan), got = {};
    for (const [k, f] of Object.entries(man)) { const kg = cargo * f; if (kg <= 0) continue;
      if (k === 'crew') { const c = Math.floor(kg / (D.ship.crewMass * M.crewMass)); S.res.crew += c; got.crew = c; }
      else { S.res[k] += kg; got[k] = Math.round(kg); } }
    S.total.ships++;
    const nm = k => (byId(D.resources, k) || { name: k }).name;
    T.log(`${D.ship.name} ${S.ship.n} lands: ` + Object.entries(got).map(([k, v]) => `${v} ${nm(k)}`).join(', ') + '.');
    S.ship = { n: S.ship.n + 1, t: S.ship.t + D.ship.cadence, manifest: null }; emit('ship', got);
  }
  T.step = (dt, quiet) => {
    const s0 = seasonIdx(); S.clock += dt; let dirty = false;
    if (seasonIdx() !== s0) { dirty = true; if (!quiet) T.log(`${T.season().name}.`); }
    const light = T.light(), P = T.power(light), C = T.crew(), calm = T.calm(); flows = {};
    const add = (r, v) => { flows[r] = (flows[r] || 0) + v; };
    for (const [res, q] of Object.entries(D.natural || {})) { const v = q * M.all * rm(res) * calm; S.res[res] += v * dt; S.total[res] = (S.total[res] || 0) + v * dt; add(res, v); }
    if (D.stillness) S.still = Math.min(D.stillness.max, S.still + D.stillness.regen * M.stillness * dt);
    S.sinceAct += dt;
    if (D.forest && S.trees) for (const [res, q] of Object.entries(D.forest.natural || {})) { const v = q * S.trees * M.all * rm(res) * calm; S.res[res] += v * dt; S.total[res] = (S.total[res] || 0) + v * dt; add(res, v); }
    for (const m of D.machines) { const n = S.n[m.id]; if (!n) continue;
      let r = 1; if (m.draw) r *= P.eff; if (m.crew) r *= C.eff * S.morale;
      if (m.solar) r *= light; if (m.night) r *= light < 1 ? 1 : 0;
      if (m.in) { for (const [res, q] of Object.entries(m.in)) { const need = q * n * r * dt; if (need > 0 && S.res[res] < need) r *= Math.max(0, S.res[res] / need); }
        for (const [res, q] of Object.entries(m.in)) { S.res[res] = Math.max(0, S.res[res] - q * n * r * dt); add(res, -q * n * r); } }
      if (m.out) for (const [res, q] of Object.entries(m.out)) { if (res === 'power') continue;
        const v = q * n * r * mm(m.id) * M.all * rm(res) * calm * (res === 'science' ? M.science : 1);
        S.res[res] += v * dt; S.total[res] = (S.total[res] || 0) + v * dt; add(res, v); } }
    const crew = S.res.crew;
    if (crew > 0) { let ok = true;
      for (const [res, q] of Object.entries(D.crew.needs)) { const w = q * crew * M.crewWater; if (S.res[res] < w * dt) ok = false;
        S.res[res] = Math.max(0, S.res[res] - w * dt); add(res, -w); }
      const target = ok ? 1 : D.crew.lowMorale; S.morale += Math.sign(target - S.morale) * Math.min(Math.abs(target - S.morale), 0.05 * dt); }
    let lost = 0;
    for (const r of D.resources) { if (r.decay) { const loss = S.res[r.id] * r.decay * M.decay * dt; S.res[r.id] -= loss; lost += loss; add(r.id, -loss / dt); }
      const c = T.cap(r.id); if (S.res[r.id] > c) S.res[r.id] = c; }
    if (D.mycelium) { const Y = D.mycelium; S.spores += Y.perTree * S.trees * dt + (Y.fromDecay ? lost : 0);
      S.flushT -= dt; while (S.flushT <= 0) { S.flushT += Y.every; const tr = S.res[D.primary] * Y.tribute; S.res[D.primary] -= tr; S.spores += tr; if (!quiet) T.log(`The mushrooms fruit. Tribute: ${Math.round(tr)} ${D.primary} to the mycelium.`); }
      const d = T.depthOf(S.spores); if (d !== S.depth) { S.depth = d; T.log(`The mycelium is ${T.depthName(d)}.`); dirty = true; } }
    S.ship.t -= dt;
    if (!S.ship.manifest && S.ship.t <= D.ship.lock) { S.ship.manifest = norm(S.plan); T.log(`${D.ship.name} ${S.ship.n} has loaded. The order is locked.`); }
    while (S.ship.t <= 0) arrive();
    if (!quiet) { for (const ev of D.events) { if (S.events.some(e => e.id === ev.id)) continue;
        if (Math.random() < ev.p * dt) { S.events.push({ id: ev.id, left: ev.dur }); T.log(`${ev.name}: ${ev.desc}`); dirty = true; } }
      S.events.forEach(e => { e.left -= dt; }); const before = S.events.length; S.events = S.events.filter(e => e.left > 0); if (S.events.length !== before) dirty = true; }
    for (const ms of D.milestones) { if (S.milestones.includes(ms.id)) continue;
      const v = ms.kind === 'total' ? S.total[ms.res] || 0 : ms.kind === 'res' ? S.res[ms.res] : ms.kind === 'research' ? S.research.length : S.sectors.length;
      if (v >= ms.at) { S.milestones.push(ms.id); T.log(ms.text); dirty = true; } }
    if (dirty) recompute();
  };
  T.rates = () => flows;
  T.catchUp = (now = Date.now()) => { const away = Math.min((now - S.saved) / 1e3, D.offlineCap); if (away < 5) return 0;
    const before = S.res[D.primary]; let left = away; while (left > 0) { const d = Math.min(5, left); T.step(d, true); left -= d; }
    S.events = []; recompute(); T.log(`Away ${Math.round(away / 60)} min: +${Math.round(S.res[D.primary] - before)} ${D.primary}.`); return away; };

  /* --------------------------------------------------------------- export
     Assemble the standalone page: play.html with the engine, the definition
     and the UI inlined, so it runs from disk with no extension around it. */
  T.assemble = (files, def, opts = {}) => {
    const stamp = `<!--\n  Exported from the Tideline workshop (tideline/) on ${new Date().toISOString().slice(0, 10)}.\n  Edit tideline/def.json or the Workshop tab and export again; do not edit this file by hand.\n  SCRIPT: yes. It is a game and it counts while you are gone. Marked, like game.html.\n-->`;
    const js = s => s.replace(/<\/(script)/gi, '<\\/$1'); // a literal </script> inside inlined code would end the tag early
    return files['play.html']
      .replace('<!--STAMP-->', stamp)
      .replace('<script src="engine.js"></script>', () => '<script>\n' + js(files['engine.js']) + '\n</script>')
      .replace('<script src="ui.js"></script>', () => '<script id="tick-def" type="application/json">' + JSON.stringify(def).replace(/<\//g, '<\\/') + '</script>\n<script>\n' + js(files['ui.js']) + '\n</script>')
      .replace('<!--EXPORT-->', opts.footer || '');
  };
  root.Tick = T;
})(typeof globalThis !== 'undefined' ? globalThis : window);

/* ═══════════════════════════════════════════════════════════════════════════
   castle-rules.mjs — the rules and the fabric arithmetic, stated ONCE.

   Three things need these: castle.mjs to refuse a bad plan file, estate.mjs to
   cost one, and keep.html to do both live in the browser while somebody drags
   a slider. A rule written down three times is a rule that goes stale in two
   of them, so it is written here and the other three take it.

   The browser copy is not a translation. keep.mjs reads this file as text,
   strips the export keywords, and embeds the source, so the validator running
   under somebody's mouse is byte-for-byte the validator that refuses a commit.
   ═══════════════════════════════════════════════════════════════════════════ */

/* every rate is an assumption and every one of them is arguable */
export const RATE = {
  repoint_m2: 300,        /* lime mortar, specialist rate, per m² of wall face */
  repoint_years: 90,      /* the cycle it comes round on */
  roof_m2: 420,
  roof_years: 80,
  heat_m2_yr: 26,         /* per m² of heated floor, thick stone, poor envelope */
  reinstate_m2: 4200,     /* like-for-like heritage rebuild, per m² of floor */
  insure_pc: 0.0035,
  warden_yr: 62000,
  wardens_per_ha: 0.9
};

/* ── what a plan must satisfy ──────────────────────────────────────────
   Returns a list of complaints. Empty means it stands. */
export function checkPlan(c) {
  const errs = [];
  if (!c) return ['there is no plan'];

  for (const k of ['id', 'name', 'kind', 'era', 'ground', 'wards', 'axis', 'lesson'])
    if (c[k] === undefined || c[k] === '') errs.push('missing ' + k);

  const wards = c.wards || [];
  if (!wards.length) errs.push('a castle with no ward is a tower');
  for (const w of wards) {
    if (!w.w || !w.d) errs.push('ward "' + (w.id || '?') + '" has no dimensions');
    if (w.wall === undefined) errs.push('ward "' + (w.id || '?') + '" does not say whether it is walled');
  }

  /* a mound you can see over is a step */
  if (c.motte) {
    const tallestWall = Math.max(0, ...wards.map((w) => w.wall || 0));
    if (c.motte.height < tallestWall)
      errs.push('the motte is ' + c.motte.height + ' m and the wall is ' + tallestWall +
        ' m — a mound you can see over is not a mound');
  }

  /* a curtain wall with an undefended corner is a wall with a door in it */
  const walled = wards.filter((w) => w.wall > 0);
  if (c.towers > 0 && c.towers < walled.length * 4)
    errs.push(c.towers + ' towers for ' + walled.length + ' walled ward(s) — that is ' +
      (walled.length * 4 - c.towers) + ' corner(s) with nothing on them');

  if (c.gallery) {
    const g = c.gallery;
    if (!g.bays) errs.push('a gallery with no bays');
    else if (g.mirrors % g.bays !== 0)
      errs.push(g.mirrors + ' mirrors across ' + g.bays + ' bays leaves ' +
        (g.mirrors % g.bays) + ' over — somebody ran out of wall');
    if (g.windows !== g.bays)
      errs.push(g.windows + ' windows facing ' + g.bays + ' bays; the whole device ' +
        'is that they answer one another');
  }
  return errs;
}

/* ── the physical quantities, from what the plan declares ───────────── */
export function fabric(c) {
  const wards = c.wards || [];
  const footprint = wards.reduce((a, w) => a + w.w * w.d, 0);
  const walled = wards.filter((w) => w.wall > 0);
  const wallRun = walled.reduce((a, w) => a + 2 * (w.w + w.d), 0);
  /* ×2 because a wall has two faces and both get pointed */
  const wallFace = walled.reduce((a, w) => a + 2 * (w.w + w.d) * w.wall * 2, 0);

  const keepH = c.keep ? c.keep.height : 0;
  const keepFloor = c.keep && c.keep.diameter
    ? Math.PI * (c.keep.diameter / 2) ** 2 * Math.max(1, Math.round(keepH / 4))
    : (c.keep ? 900 * Math.max(1, Math.round(keepH / 4)) : 0);
  const floor = footprint * 0.34 + keepFloor;
  const roofArea = floor * 0.42;
  return { footprint, ha: footprint / 10000, wallRun, wallFace, floor, roofArea };
}

/* ── and what that costs to keep standing, every year ───────────────── */
export function upkeep(c) {
  const f = fabric(c);
  const repoint = f.wallFace / RATE.repoint_years * RATE.repoint_m2;
  const roof = f.roofArea / RATE.roof_years * RATE.roof_m2;
  const heat = f.floor * 0.55 * RATE.heat_m2_yr;
  const reinstate = f.floor * RATE.reinstate_m2;
  const insure = reinstate * RATE.insure_pc;
  const staff = Math.ceil(f.ha * RATE.wardens_per_ha) * RATE.warden_yr;
  return { ...f, repoint, roof, heat, reinstate, insure, staff,
           outflow: repoint + roof + heat + insure + staff };
}

/* ── bricks, from wall volume rather than from a round number ───────── */
export const BRICK = { per_m3: 500, wall_t: 0.6, kg: 2.3 };
export function bricks(c) {
  const wards = c.wards || [];
  const walled = wards.filter((w) => w.wall > 0);
  const wallVol = walled.reduce((a, w) => a + 2 * (w.w + w.d) * w.wall * BRICK.wall_t, 0);
  const f = fabric(c);
  const rangeVol = f.floor * 0.18;
  const n = (wallVol + rangeVol) * BRICK.per_m3;
  return { count: n, tonnes: n * BRICK.kg / 1000, wallVol, rangeVol };
}

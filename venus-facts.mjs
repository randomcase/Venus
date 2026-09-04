/* ═══════════════════════════════════════════════════════════════════════════
   venus-facts.mjs — the constants and the two derivations that more than one
   board needs, stated once.

   cistern.mjs found the divergence and paper.mjs has to lead with it, which is
   exactly the situation that produces two copies of the same arithmetic
   drifting apart. So the arithmetic lives here and both import it, the same
   way castle-rules.mjs is the one copy of the castle checks.

   Nothing here is a finding. The findings are what the boards say about these
   numbers; this file only makes sure they are saying it about the same ones.
   ═══════════════════════════════════════════════════════════════════════════ */

export const SIGMA = 5.670374419e-8;      /* Stefan–Boltzmann, W/m²K⁴ */
export const S0 = 1361;                   /* solar constant at 1 AU, W/m² */
export const AU = 1.495978707e11;         /* m */
export const MU_SUN = 1.32712440018e20;   /* m³/s² */

/* the deck */
export const DECK = {
  km: 55,
  g: 8.71,                 /* m/s² at 55 km */
  g_earth: 9.80665,
  /* 570 and not 574: the column mass carries a bar of about +/-25, which
     owns the tens digit, so the units digit was never ours to write. The
     instrument layer refused the old figure on its first run and was right. */
  shield: 570,             /* g/cm2 of atmosphere overhead */
  shield_earth: 1033,      /* g/cm² at sea level */
  lapse: 9.5,              /* K/km */
  nitrogen_ratio: 4.3      /* Venus's atmospheric N against Earth's */
};
export const WEIGHT = DECK.g / DECK.g_earth;      /* 0.888 */
export const SETTLE = 1 - WEIGHT;                 /* slower fall */
export const CARRY = 1 / WEIGHT - 1;              /* further carriage */

/* the clocks */
export const CLOCK = {
  solar_d: 116.75, sidereal_d: 243.02, synodic_d: 583.92,
  passage_d: 146, light_min: 4.94
};

/* ── the two worlds ──────────────────────────────────────────────────── */
const BODY = [
  { id: 'venus', name: 'Venus', au: 0.7233, albedo: 0.77,  surface: 737 },
  { id: 'earth', name: 'Earth', au: 1.0000, albedo: 0.306, surface: 288 }
];

/* What decides a temperature is what is ABSORBED, not what arrives. Venus is
   nearer and brighter, and the second of those wins — which is the whole
   divergence and is computed here rather than asserted anywhere. */
export const worlds = BODY.map((b) => {
  const flux = S0 / (b.au * b.au);
  const absorbed = flux / 4 * (1 - b.albedo);
  const teff = Math.pow(absorbed / SIGMA, 0.25);
  return { ...b, flux, absorbed, teff, greenhouse: b.surface - teff };
});
export const VENUS = worlds[0];
export const EARTH = worlds[1];
export const fluxRatio = VENUS.flux / EARTH.flux;
export const absorbedRatio = VENUS.absorbed / EARTH.absorbed;
export const greenhouseRatio = VENUS.greenhouse / EARTH.greenhouse;

/* the receipt for the ocean that left */
export const DH_RATIO = 150;         /* Venus D/H against Earth's, approximate */
export const WATER_PPM = 20;
export const EARTH_OCEAN_KG = 1.35e21;
export const KG_PER_K = 2.04e15;     /* water freed per kelvin of heating */
export const ONE_PC_OCEAN_K = (EARTH_OCEAN_KG * 0.01) / KG_PER_K;

/* ── closure, which is the only water question there is ─────────────── */
export const CREW = 20;
export const PER_HEAD_KG = 25;       /* drink, food prep, hygiene, laundry */
export const DAILY_KG = CREW * PER_HEAD_KG;

/* Make-up mass goes as (1 − r). A reciprocal, so all the leverage sits at the
   top end where it is least visible. */
export function makeup(r) {
  const perDay = DAILY_KG * (1 - r);
  return { r, perDay, perYear: perDay * 365.25,
           perWindow: perDay * CLOCK.synodic_d };
}
export const LADDER = [0.80, 0.90, 0.95, 0.98, 0.99, 0.995, 0.999, 0.9995]
  .map(makeup);
export const CLOSURE_LEVER = makeup(0.98).perWindow / makeup(0.999).perWindow;
export const MISSED_WINDOW_D = CLOCK.synodic_d + CLOCK.passage_d;

/* ── transit: the cheapest trajectory is the slowest one ────────────── */
const R_E = 1.0 * AU, R_V = 0.7233 * AU, DAY = 86400;
export function transfer(qAU) {
  const q = qAU * AU;
  const a = (R_E + q) / 2;
  const e = (R_E - q) / (R_E + q);
  const n = Math.sqrt(MU_SUN / (a * a * a));
  const cosNu = (a * (1 - e * e) / R_V - 1) / e;
  if (cosNu < -1 || cosNu > 1) return null;
  const nu = Math.acos(Math.max(-1, Math.min(1, cosNu)));
  const E = Math.acos(Math.max(-1, Math.min(1,
    (e + Math.cos(nu)) / (1 + e * Math.cos(nu)))));
  const M = E - e * Math.sin(E);
  const days = (Math.PI - M) / n / DAY;

  const vAp = Math.sqrt(MU_SUN * (2 / R_E - 1 / a));
  const vE = Math.sqrt(MU_SUN / R_E);
  const vInf = Math.abs(vE - vAp);

  const vPer = Math.sqrt(MU_SUN * (2 / R_V - 1 / a));
  const vTan = Math.sqrt(MU_SUN * a * (1 - e * e)) / R_V;
  const vRad = Math.sqrt(Math.max(0, vPer * vPer - vTan * vTan));
  const vVen = Math.sqrt(MU_SUN / R_V);
  const vArr = Math.sqrt((vTan - vVen) ** 2 + vRad * vRad);

  return { q: qAU, days, c3: (vInf / 1000) ** 2, vInf: vInf / 1000,
           vArr: vArr / 1000, e };
}
export const HOHMANN = transfer(R_V / AU);

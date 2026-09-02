#!/usr/bin/env node
/* rules.mjs — the rules of the loop, pulled out of the scripts into templates.

   Every number a deck plays by used to live in its script: the price of
   nitrogen, the raid curve, the dividend, what a sowing costs, how much
   grain feeds a citizen, the charter. Now each deck has a rulebook in
   templates-rules/, the generator embeds it, the page reads it, and a
   rulebook kept in the browser through the editor (custom.v1, under the
   rulebook's path) overrides it on the next load. So the editor changes
   prices, rates and periods without a rebuild, and a rulebook written back
   into the yard changes them for good.

   The docket's rules are shared: the cap is one number for every deck.
       node rules.mjs            writes templates-rules/*.json
   import { rulesFor } from './rules.mjs'   in a generator */
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';

const DOCKET = { cap: 21000000, awayHours: 8, secondsPerDay: 1 };
const NOTES_DOCKET = { cap: 'HEZE that can ever be issued across every deck; a unit of account inside the files, never a token', awayHours: 'the most time a deck will catch up on when you come back', secondsPerDay: 'how long a day is, in real seconds' };

export const RULES = {
  clans: { ...DOCKET, grant: 20000, price: { nitrogen: 3, hydrogen: 9, record: 12, biomass: 2, signal: 6, silicate: 4 }, pileBase: 100, manaMax: 20, manaPerDay: 1, raidersBase: 4, raidersStep: 2, raidersEvery: 50, raidTake: 0.15, spoilPerStrength: 2, spoilPrice: 2, bronzePerDay: 20, bronzeHydrogenRatio: 3, bronzePrice: 8 },
  market: { ...DOCKET, grant: 50000, defaultDegree: 3, dividend: 0.02, volatilityBase: 0.35, volatilityPerDegree: 0.35, weightMin: 0.7, weightSpan: 0.6, driftPeriodMul: 2, tape: 14 },
  continent: { ...DOCKET, sowCost: 3, spreadCost: 1 },
  village: { ...DOCKET, tradeFeeds: 2, prosperityBase: 0.6, prosperityFed: 0.4, prosperityIdle: 0.5, squareBonus: 0.05, keepDefault: 0.8, noteThreshold: 5 },
  town: { ...DOCKET, guildStaff: 3, guildFeeds: 3, grainPerCitizen: 10, charterGuilds: 5, charterCitizens: 15, exchangeBonus: 0.04, keepDefault: 0.8 },
  coven: { ...DOCKET, intervalDays: 183, quorum: 2, of: 3, proposalEvery: 3, signChance: 12, deskLimit: 40, staleAfter: 183, activityEvery: 5, stealCooldown: 30 },
};
export const NOTES = {
  clans: { ...NOTES_DOCKET, grant: 'HEZE the jarl starts with, credited against the cap', price: 'HEZE per unit of each resource, at the docket', pileBase: 'what each resource can hold with no pile built', manaMax: 'the reserve the spells draw on', manaPerDay: 'how much of the reserve comes back each day', raidersBase: 'raid strength on day one', raidersStep: 'how much raid strength grows each step', raidersEvery: 'days between steps of raid strength', raidTake: 'share of a pile a raid takes when the ford is not held', spoilPerStrength: 'spoil per point of your raiders\' strength', spoilPrice: 'HEZE per unit of spoil', bronzePerDay: 'most bronze cast in a day', bronzeHydrogenRatio: 'units of silicate per unit of hydrogen in a casting', bronzePrice: 'HEZE per unit of bronze' },
  market: { ...NOTES_DOCKET, grant: 'HEZE a seat on the market comes with', defaultDegree: 'the degree the board opens at', dividend: 'share of the farm price paid per tranche on the farm\'s period', volatilityBase: 'how far a farm\'s price swings', volatilityPerDegree: 'how much wider each degree of syndication swings', weightMin: 'the lightest a tranche can be weighted against its parent', weightSpan: 'the range above that', driftPeriodMul: 'a price\'s drift period, in multiples of the farm\'s period', tape: 'tickers on the tape' },
  continent: { ...NOTES_DOCKET, sowCost: 'units drawn from the pile to sow a parcel by hand', spreadCost: 'units drawn from the pile per parcel the continent spreads into on its own' },
  village: { ...NOTES_DOCKET, tradeFeeds: 'households each trade feeds', prosperityBase: 'prosperity with everyone housed and nobody fed', prosperityFed: 'prosperity added when everyone housed is fed', prosperityIdle: 'prosperity with no households', squareBonus: 'prosperity added per square', keepDefault: 'share of a trade\'s pay kept with no lane built', noteThreshold: 'grain arriving below this is not written in the record' },
  coven: { ...NOTES_DOCKET, intervalDays: 'days between syndications; six months, the interplanetary interval', quorum: 'signatures an event needs', of: 'custodians in a syndicate', proposalEvery: 'days between proposals arriving at the doors', signChance: 'chance in a hundred that a custodian signs on a given day, when they are signing on their own', deskLimit: 'proposals the desk holds before the oldest fall off', staleAfter: 'days after which an unsigned proposal counts against the bank\'s health', activityEvery: 'days between a syndicate rolling a new activity — quiet, planning, discovery or staged', stealCooldown: 'days a syndicate stays alert to a failed steal before it can be tried again' },
  town: { ...NOTES_DOCKET, guildStaff: 'citizens a guild needs to run at full', guildFeeds: 'citizens a guild feeds', grainPerCitizen: 'grain in the village\'s store that feeds one citizen', charterGuilds: 'guilds the charter needs', charterCitizens: 'citizens the charter needs', exchangeBonus: 'prosperity added per exchange', keepDefault: 'share of dues kept with no road built' },
};
/* THE DOCKET'S OWN RULEBOOK: what does not change from door 1 to door 200. These are not
   prices; they are the terms on which a unit at the first door is the same unit at the
   two-hundredth. A deck may change its prices. Nothing may change these, and the ledger
   (ledger/ledger.mjs) is what enforces them: they are written here so the editor can show
   them, and marked so it will not keep a changed copy. */
export const DOCKET_RULES = {
  unit: 'HEZE', notToken: 'a unit of account inside the files; never a token, never transferred for sale, never in a wallet',
  cap: DOCKET.cap, tranches: 21, perTranche: 1000000, years: 200, doors: 200, schedule: 'straight-line: each door may issue the same share of a tranche; nothing may be issued ahead of its door',
  fungible: 'a unit carries no history that changes what it is worth; a unit issued at door 1 and a unit issued at door 200 are the same unit, and every deck must accept either without asking which',
  chances: 'the cap is a budget of attempts, not a scarcity: 21,000,000 units is 21,000,000 chances to act, and a chance not taken is not saved, it is only not taken',
  centralized: 'the prices are decentralized, door by door; the effort is centralized at the syndicates, where every door\'s events are reconciled into one chain and the doors find out what the others did',
  balances: 'replay only: a balance is the sum of the events, never a number kept on its own',
  write: 'two of three custodians sign an event, or it is not an event',
  chain: 'every event hashes the one before it, SHA-256 and SHA3-256 both; a Merkle checkpoint per door',
  exit: 'redeem is the only way a unit leaves; there is no burn and no sale',
  syndication: 'the chain is syndicated between worlds every six months, an interplanetary interval; between syndications each side keeps its own events and reconciles at the next',
  procurement: 'inward: the ship procures from within; water and food are free and unpriced on every deck',
  immutable: true,
};
export const rulesFor = deck => ({ ...RULES[deck] });
export const rulebook = deck => ({ id: 'rules-' + deck, kind: 'rules', deck, path: `templates-rules/${deck}.json`, rules: RULES[deck], notes: NOTES[deck], text: `The rulebook of the ${deck}. Keep a changed copy in the browser through the editor in the quarter and the ${deck} plays by it on its next load; write it into the yard and it plays by it for good.`, wovenBy: 'rules.mjs' });

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  rmSync('templates-rules', { recursive: true, force: true }); mkdirSync('templates-rules');
  for (const deck of Object.keys(RULES)) writeFileSync(`templates-rules/${deck}.json`, JSON.stringify(rulebook(deck), null, 1));
  writeFileSync('templates-rules/docket.json', JSON.stringify({ id: 'rules-docket', kind: 'rules', deck: 'docket', path: 'templates-rules/docket.json', rules: DOCKET_RULES, text: 'The docket\'s rulebook: what holds from door 1 to door 200. Not editable; the ledger enforces it, and a changed copy kept in the browser is ignored by every deck.', wovenBy: 'rules.mjs' }, null, 1));
  console.log(`rulebooks: ${Object.keys(RULES).join(', ')} · ${Object.values(RULES).reduce((n, r) => n + Object.keys(r).length, 0)} rules in all`);
}

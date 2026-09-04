/* lights.mjs — the light switches, and the rule that every flick is written down.

   A registry (lights.json) names the switches the assistant may touch. Two
   adapters: `sim`, a state file for testing, and `homeassistant`, which calls
   Home Assistant's REST API (switch.turn_on / turn_off) with a long-lived
   token from HASS_TOKEN. Every change is appended to the ledger as a `note`
   signed by the lights key, so the 200-year record includes who turned what
   on, and when. Switches not on the allow list cannot be touched by anyone
   going through this module. */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { Ledger, loadKey } from './ledger.mjs';

export const DEFAULT_REGISTRY = { adapter: 'sim', url: 'http://homeassistant.local:8123', rateLimitPerMinute: 30,
  switches: [
    { id: 'switch.porch', name: 'Porch light', room: 'outside', allow: true },
    { id: 'switch.kitchen_ceiling', name: 'Kitchen ceiling', room: 'kitchen', allow: true },
    { id: 'switch.kitchen_counter', name: 'Kitchen counter strip', room: 'kitchen', allow: true },
    { id: 'switch.hall', name: 'Hall', room: 'hall', allow: true },
    { id: 'switch.workshop', name: 'Workshop bench light', room: 'workshop', allow: true },
    { id: 'switch.garage_door', name: 'Garage door opener', room: 'garage', allow: false, why: 'not a light; never automated' },
  ] };

export class Lights {
  constructor(dir, { keyName = 'lights' } = {}) { this.dir = dir; this.regFile = join(dir, 'lights.json'); this.stateFile = join(dir, 'lights.state.json');
    if (!existsSync(this.regFile)) writeFileSync(this.regFile, JSON.stringify(DEFAULT_REGISTRY, null, 1));
    this.reg = JSON.parse(readFileSync(this.regFile, 'utf8')); this.state = existsSync(this.stateFile) ? JSON.parse(readFileSync(this.stateFile, 'utf8')) : {}; this.keyName = keyName; this.recent = []; }
  list() { return this.reg.switches.map(s => ({ id: s.id, name: s.name, room: s.room, allow: !!s.allow, on: !!this.state[s.id], ...(s.why ? { why: s.why } : {}) })); }
  find(q) { const t = String(q).toLowerCase(); return this.reg.switches.filter(s => s.id.toLowerCase() === t || s.name.toLowerCase().includes(t) || s.room.toLowerCase() === t); }
  async set(id, on, { by = 'assistant', reason = '' } = {}) {
    const sw = this.reg.switches.find(s => s.id === id); if (!sw) throw new Error(`no switch ${id}`); if (!sw.allow) throw new Error(`${sw.name} is not on the allow list${sw.why ? ': ' + sw.why : ''}`);
    const now = Date.now(); this.recent = this.recent.filter(t => now - t < 60000); if (this.recent.length >= (this.reg.rateLimitPerMinute || 30)) throw new Error('rate limit: too many switch changes this minute'); this.recent.push(now);
    if (this.reg.adapter === 'homeassistant') { const token = process.env.HASS_TOKEN; if (!token) throw new Error('HASS_TOKEN not set');
      const r = await fetch(`${this.reg.url}/api/services/switch/turn_${on ? 'on' : 'off'}`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ entity_id: id }) }); if (!r.ok) throw new Error(`Home Assistant said ${r.status}`); }
    this.state[id] = !!on; writeFileSync(this.stateFile, JSON.stringify(this.state, null, 1));
    const l = new Ledger(this.dir); let seq = null; try { seq = l.append('note', { system: 'lights', switch: id, name: sw.name, on: !!on, by, reason }, [loadKey(this.dir, this.keyName)]).seq; } catch (e) { if (!/ENOENT|no such/.test(e.message)) throw e; }
    return { id, name: sw.name, on: !!on, ledgerSeq: seq };
  }
}

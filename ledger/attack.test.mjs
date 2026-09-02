import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load, runAll, ATTACKS } from './attack.mjs';

test('every template in templates-attack has a matching mechanical attack function', () => {
  for (const t of load()) assert.ok(typeof ATTACKS[t.id] === 'function', `no attack function for ${t.id}`);
});

test('every attack in the tree runs and its declared defense holds — this is the templates as a real test suite', () => {
  const results = runAll();
  assert.equal(results.length, load().length, 'every template ran or was accounted for');
  for (const r of results) {
    assert.equal(r.skipped, undefined, `${r.id} was skipped: ${r.reason} — the knowledge tree order is wrong`);
    assert.equal(r.ok, true, `${r.id} did not hold as declared: ${r.text}`);
  }
});

test('the knowledge tree actually gates: forged-root-syndication does not run before its prerequisites', () => {
  const ordered = runAll().map(r => r.id);
  const gate = ordered.indexOf('forged-root-syndication');
  for (const req of ['tampered-amount', 'dropped-line', 'forged-signature']) assert.ok(ordered.indexOf(req) < gate, `${req} must run before forged-root-syndication`);
});

test('a dependent template is skipped, not silently run, when its prerequisite does not hold', () => {
  // an injected, synthetic pair — real ids and real files are never touched
  ATTACKS['test-always-fails'] = () => ({ ok: false, detail: 'deliberately fails, for this test only' });
  ATTACKS['test-should-be-skipped'] = () => { throw new Error('this must never run — its prerequisite did not hold'); };
  const synthetic = [
    { id: 'test-always-fails', name: 'a prerequisite that never holds', requires: [], response: { pass: 'held: {{detail}}', fail: 'did not hold: {{detail}}' } },
    { id: 'test-should-be-skipped', name: 'depends on it', requires: ['test-always-fails'], response: { pass: 'held', fail: 'did not hold' } },
  ];
  const results = runAll(undefined, synthetic);
  const failed = results.find(r => r.id === 'test-always-fails'), skipped = results.find(r => r.id === 'test-should-be-skipped');
  assert.equal(failed.ok, false);
  assert.equal(skipped.skipped, true);
  assert.match(skipped.reason, /requires test-always-fails/);
});

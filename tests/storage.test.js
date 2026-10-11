/* Alle lagringsadaptere har samme grensesnitt; local.js lagrer i localStorage som prototypen. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { METHODS, missingMethods } from '../src/storage/index.js';
import * as local from '../src/storage/local.js';
import * as supabase from '../src/storage/supabase.js';

test('local og supabase har hele grensesnittet', () => {
  assert.deepEqual(missingMethods(local), []);
  assert.deepEqual(missingMethods(supabase), []);
  assert.deepEqual(Object.keys(local).sort(), [...METHODS].sort());
  assert.deepEqual(Object.keys(supabase).sort(), [...METHODS].sort());
});

test('supabase-stubben kobler ikke til noe', async () => {
  await assert.rejects(supabase.init({}), /ikke implementert/);
  await assert.rejects(supabase.loadAll(), /ikke implementert/);
});

test('local: saveAll/loadAll og granulære endringer', async () => {
  const mem = new Map();
  globalThis.localStorage = { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)) };
  try {
    assert.equal(await local.loadAll(), null);
    await local.saveAll({techs:[{id:'t1', name:'Tekniker 1-01', shift:1, roles:[]}], acts:[], machines:[], roles:[], work:[], entries:[], noAuto:{}});
    assert.ok(mem.has('lms-timer-poc-v1'));
    await local.saveEntry({id:'e1', date:'2026-01-05', tech:'t1', act:'line', machine:'', work:'', hours:9});
    await local.saveEntry({id:'e1', date:'2026-01-05', tech:'t1', act:'line', machine:'', work:'', hours:4});
    await local.setNoAuto('2026-01-05', 't1', true);
    let s = await local.loadAll();
    assert.deepEqual(s.entries.map(e => e.hours), [4]);
    assert.equal(s.noAuto['2026-01-05|t1'], true);
    await local.deleteTech('t1');
    s = await local.loadAll();
    assert.equal(s.techs.length, 0);
    assert.equal(s.entries.length, 0);
  } finally { delete globalThis.localStorage; }
});

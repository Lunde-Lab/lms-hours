/* Profiler: bare skiftledere og admin har tilgang; bare admin administrerer profiler. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultProfiles, isAdmin, canManage, checkNew, checkRemove, migrateProfiles } from '../src/profiles.js';
import { freshState, migrate } from '../src/state.js';

let n = 0; const uid = () => 'p' + (++n);

test('standardprofiler: én admin og én skiftleder per skift, anonyme navn', () => {
  const ps = defaultProfiles(uid);
  assert.deepEqual(ps.map(p => [p.name, p.role, p.shift]), [['Admin','admin',null], ['Skiftleder 1','leader',1], ['Skiftleder 2','leader',2], ['Skiftleder 3','leader',3]]);
  assert.ok(freshState().profiles.some(isAdmin));
});
test('tilgang: skiftleder og admin kan administrere, bare admin er admin', () => {
  assert.equal(canManage({role:'leader'}), true);
  assert.equal(canManage({role:'admin'}), true);
  assert.equal(canManage(null), false);
  assert.equal(canManage({role:'tekniker'}), false);
  assert.equal(isAdmin({role:'leader'}), false);
});
test('ny profil krever navn, rolle, skift for skiftleder og unikt navn', () => {
  const ps = defaultProfiles(uid);
  assert.match(checkNew(ps, {name:' ', role:'leader', shift:1}), /navnet/);
  assert.match(checkNew(ps, {name:'Ny', role:'sjef', shift:1}), /rolle/);
  assert.match(checkNew(ps, {name:'Ny', role:'leader', shift:null}), /skift/);
  assert.match(checkNew(ps, {name:'skiftleder 1', role:'leader', shift:1}), /finnes/);
  assert.equal(checkNew(ps, {name:'Ny', role:'admin', shift:null}), '');
});
test('kan ikke fjerne seg selv eller siste admin', () => {
  const ps = defaultProfiles(uid); const [admin, leader] = ps;
  assert.match(checkRemove(ps, admin.id, admin), /egen/);
  assert.match(checkRemove(ps, admin.id, leader), /minst én admin/);
  assert.equal(checkRemove(ps, leader.id, admin), '');
  ps.push({id:'a2', name:'Admin 2', role:'admin', shift:null});
  assert.equal(checkRemove(ps, admin.id, ps[4]), '');
});
test('migrering: eldre tilstand får standardprofiler, og det finnes alltid en admin', () => {
  const o = freshState(); delete o.profiles;
  assert.equal(migrate(o).profiles.length, 4);
  const ps = migrateProfiles([{id:'x', name:'Skiftleder 1', role:'leader', shift:'1'}, {id:'y', name:'Ugyldig', role:'sjef'}], uid);
  assert.deepEqual(ps.map(p => [p.name, p.role, p.shift]), [['Admin','admin',null], ['Skiftleder 1','leader',1]]);
});

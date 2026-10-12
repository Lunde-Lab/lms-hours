/* LMS-standard i tilstanden: automatisk føring fyller resten av arbeidsdagen. */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { S, setState, setStorage, freshState, reindex, recomputeAuto, migrate, hasMW, label } from '../src/state.js';

setStorage({ saveAll(){} });
let t;
beforeEach(() => { setState(freshState()); reindex(); t = S.techs.find(x => x.shift === 1); });
const autos = d => S.entries.filter(e => e.tech === t.id && e.date === d && e.auto);

test('uten føringer får teknikeren hel dag LMS-standard', () => {
  recomputeAuto(t.id, '2026-01-05');
  assert.deepEqual(autos('2026-01-05').map(e => [e.act, e.hours]), [['h1500', 9]]);
});
test('manuell føring reduserer LMS-standard til resten', () => {
  S.entries.push({id:'m1', date:'2026-01-09', tech:t.id, act:'kurs', machine:'', work:'', hours:4});
  recomputeAuto(t.id, '2026-01-09');
  assert.deepEqual(autos('2026-01-09').map(e => e.hours), [4.5]);   // fredag kveld 8,5 t
});
test('full dag fjerner LMS-standard', () => {
  recomputeAuto(t.id, '2026-01-10');
  S.entries.push({id:'m2', date:'2026-01-10', tech:t.id, act:'line', machine:'', work:'', hours:9.5});
  recomputeAuto(t.id, '2026-01-10');
  assert.equal(autos('2026-01-10').length, 0);
});
test('ingen LMS-standard på fridag eller når den er slått av', () => {
  recomputeAuto(t.id, '2026-01-20');
  assert.equal(autos('2026-01-20').length, 0);
  S.noAuto['2026-01-05|' + t.id] = true;
  recomputeAuto(t.id, '2026-01-05');
  assert.equal(autos('2026-01-05').length, 0);
});
test('migrering legger til nye LMS-arbeid og beholder egne', () => {
  const o = freshState(); o.work = ['Sheet', 'Eget']; const m = migrate(o);
  assert.deepEqual(m.work, ['Sheet','Repair','Inspection','Mod','SLL','Testing','Final','Eget']);
});
test('Line og Mod føres med maskin og arbeid, som LMS', () => {
  assert.deepEqual(S.acts.filter(a => hasMW(a)).map(a => a.id), ['line', 'h1500', 'mod']);
  assert.equal(label({act:'line', machine:'ONX', work:'Repair'}), 'Line · ONX · Repair');
  assert.equal(label({act:'h1500', machine:'', work:''}), 'LMS');
});
test('migrering gir Line og Mod maskin og arbeid i lagret tilstand', () => {
  const o = freshState(); for (const a of o.acts) delete a.mw;
  assert.equal(migrate(o).acts.find(a => a.id === 'mod').mw, true);
});

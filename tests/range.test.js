/* Føring av flere dager for én tekniker (dra i kalenderen). */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { S, setState, setStorage, freshState, reindex, recomputeAuto, entriesOf, rangeDays, applyRange, clearRange, overtime } from '../src/state.js';

setStorage({ saveAll(){} });
let t;
beforeEach(() => { setState(freshState()); reindex(); t = S.techs.find(x => x.shift === 1); });

/* Skift 1: kveld 05.–09.01, helg 10.–11.01, dag 12.–16.01, fri 17.–25.01 */
test('perioden gjelder bare arbeidsdager, fridager hoppes over', () => {
  assert.deepEqual(rangeDays(t.id, '2026-01-14', '2026-01-19'), ['2026-01-14', '2026-01-15', '2026-01-16']);
});
test('perioden med bare fridager gjelder alle dagene (overtid)', () => {
  assert.equal(rangeDays(t.id, '2026-01-18', '2026-01-20').length, 3);
});
test('ekstra personell gjelder bare dagene de er aktive', () => {
  const x = {id:'x1', name:'Tekniker 1-99', shift:1, roles:[], extra:{from:'2026-01-07', until:'2026-01-08'}}; S.techs.push(x);
  assert.deepEqual(rangeDays(x.id, '2026-01-05', '2026-01-09'), ['2026-01-07', '2026-01-08']);
});
test('erstatter føringene med hel dag av aktiviteten', () => {
  recomputeAuto(t.id, '2026-01-08');
  S.entries.push({id:'m1', date:'2026-01-09', tech:t.id, act:'kurs', machine:'', work:'', hours:3}); reindex();
  const n = applyRange(t.id, '2026-01-08', '2026-01-10', 'ferie');
  assert.equal(n, 3);
  assert.deepEqual(['2026-01-08', '2026-01-09', '2026-01-10'].map(d => entriesOf(t.id, d).map(e => [e.act, e.hours, !!e.auto])),
    [[['ferie', 9, false]], [['ferie', 8.5, false]], [['ferie', 9.5, false]]]);
});
test('LMS får maskin og arbeid', () => {
  applyRange(t.id, '2026-01-12', '2026-01-13', 'h1500', 'ONA', 'Inspection');
  assert.deepEqual(entriesOf(t.id, '2026-01-13').map(e => [e.machine, e.work]), [['ONA', 'Inspection']]);
});
test('nullstill fjerner føringer og slår på LMS-standard igjen', () => {
  applyRange(t.id, '2026-01-05', '2026-01-06', 'kurs');
  S.noAuto['2026-01-06|' + t.id] = true;
  clearRange(t.id, '2026-01-05', '2026-01-06');
  assert.equal(S.noAuto['2026-01-06|' + t.id], undefined);
  assert.deepEqual(entriesOf(t.id, '2026-01-06').map(e => [e.act, e.hours, e.auto]), [['h1500', 9, true]]);
});
test('føringer på fridag er overtid, på arbeidsdag ikke', () => {
  assert.equal(overtime({tech:t.id, date:'2026-01-20'}), true);    // fri
  assert.equal(overtime({tech:t.id, date:'2026-01-12'}), false);   // dag
});

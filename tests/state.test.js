/* LMS-standard i tilstanden: automatisk føring fyller resten av arbeidsdagen. */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { S, setState, setStorage, freshState, reindex, recomputeAuto, migrate, hasMW, lacksMW, label, noteOf, setNote, moveTech, removeTech } from '../src/state.js';
import { FIXED_MACHINES } from '../src/model.js';

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
  assert.equal(label({act:'line', machine:'ONA', work:'Repair'}), 'Line · ONA · Repair');
  assert.equal(label({act:'h1500', machine:'', work:''}), 'LMS');
});
test('migrering gir Line og Mod maskin og arbeid i lagret tilstand', () => {
  const o = freshState(); for (const a of o.acts) delete a.mw;
  assert.equal(migrate(o).acts.find(a => a.id === 'mod').mw, true);
});
test('notat per tekniker og dag; tomt notat fjernes', () => {
  setNote(t.id, '2026-01-05', 'Kurs flyttet');
  assert.equal(noteOf(t.id, '2026-01-05'), 'Kurs flyttet');
  assert.equal(noteOf(t.id, '2026-01-06'), '');
  setNote(t.id, '2026-01-05', '   ');
  assert.deepEqual(S.notes, {});
  const o = freshState(); delete o.notes; assert.deepEqual(migrate(o).notes, {});
});
test('Fravær er en fast aktivitet og legges til i lagret tilstand', () => {
  const o = freshState(); o.acts = o.acts.filter(a => a.id !== 'fravaer');
  const m = migrate(o);
  assert.deepEqual(m.acts.map(a => a.id), ['line','h1500','ass','assm','hs','kurs','mod','ferie','avsp','fravaer','annet']);
  assert.equal(m.acts.find(a => a.id === 'fravaer').name, 'Fravær');
});
test('LMS uten maskin eller arbeid mangler noe; Line uten maskin gjør ikke det', () => {
  assert.equal(lacksMW({act:'h1500', machine:'', work:'', hours:9}), true);
  assert.equal(lacksMW({act:'h1500', machine:'ONA', work:'', hours:9}), true);
  assert.equal(lacksMW({act:'h1500', machine:'ONA', work:'Sheet', hours:9}), false);
  assert.equal(lacksMW({act:'h1500', machine:'', work:'', hours:0}), false);
  assert.equal(lacksMW({act:'line', machine:'', work:'', hours:9}), false);
});

test('faste maskiner finnes alltid og starter som ferdig; egne maskiner og status beholdes', () => {
  assert.deepEqual(S.machines.map(m => m.name), FIXED_MACHINES);
  assert.equal(S.machines.every(m => !m.active), true);
  const o = freshState(); o.machines = [{id:'x', name:'OIB', active:true}, {id:'y', name:'TEST', active:true}];
  const m = migrate(o);
  assert.deepEqual(m.machines.map(x => x.name), [...FIXED_MACHINES, 'TEST']);
  assert.equal(m.machines.find(x => x.name === 'OIB').active, true);
  assert.equal(m.machines.find(x => x.name === 'OIC').active, false);
});
test('Assessment er en fast aktivitet uten rolle', () => {
  const o = freshState(); o.acts = o.acts.filter(a => a.id !== 'assm');
  const a = migrate(o).acts.find(x => x.id === 'assm');
  assert.equal(a.name, 'Assessment'); assert.equal(a.role, '');
});
test('tekniker kan flyttes til et annet skift; føringene beholdes', () => {
  S.entries.push({id:'m4', date:'2026-01-05', tech:t.id, act:'kurs', machine:'', work:'', hours:9});
  assert.equal(moveTech(t.id, 2), true);
  assert.equal(t.shift, 2);
  assert.equal(S.entries.some(e => e.id === 'm4'), true);
  assert.equal(moveTech(t.id, 2), false);
  assert.equal(moveTech(t.id, 9), false);
});
test('fjerning av tekniker sletter føringer og notater', () => {
  S.entries.push({id:'m5', date:'2026-01-05', tech:t.id, act:'kurs', machine:'', work:'', hours:9});
  setNote(t.id, '2026-01-05', 'Notat');
  removeTech(t.id);
  assert.equal(S.techs.some(x => x.id === t.id), false);
  assert.equal(S.entries.some(e => e.tech === t.id), false);
  assert.equal(noteOf(t.id, '2026-01-05'), '');
});
test('migrering: OWS blir ONS, ONX og ONZ fjernes', () => {
  const o = freshState();
  o.machines = [{id:'w', name:'OWS', active:true}, {id:'x', name:'ONX', active:true}, {id:'z', name:'ONZ', active:false}];
  o.entries = [{id:'e1', date:'2026-01-05', tech:o.techs[0].id, act:'h1500', machine:'OWS', work:'Sheet', hours:9}];
  const m = migrate(o);
  assert.deepEqual(m.machines.map(x => x.name), FIXED_MACHINES);
  assert.equal(m.machines.find(x => x.name === 'ONS').active, true);
  assert.equal(m.entries[0].machine, 'ONS');
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultPlan } from '../src/model.js';
import { phase, workHours, stdHours, extraUntil, lmsFill, cycle, timeTxt } from '../src/schedule.js';
import { dn, isoOf, isoWeek } from '../src/util.js';

const plan = defaultPlan();
const add = (date, n) => isoOf(dn(date) + n);
/* forventet fase for dag i syklusen (0-basert): 5 kveld, 2 helg, 5 dag, 9 fri */
const expected = p => p < 5 ? ['K', p+1, 5] : p < 7 ? ['H', p-4, 2] : p < 12 ? ['D', p-6, 5] : ['F', p-11, 9];

test('syklusen er 21 dager (5 kveld / 2 helg / 5 dag / 9 fri)', () => {
  assert.deepEqual(plan.days, {K:5, H:2, D:5, F:9});
  assert.equal(cycle(plan), 21);
});

for (const [id, start] of [[1,'2026-01-05'],[2,'2026-01-12'],[3,'2026-01-19']]){
  test(`skift ${id}: fase for hver dag i to sykluser fra ${start}`, () => {
    for (let n = 0; n < 42; n++){
      const [key, idx, len] = expected(n % 21);
      assert.deepEqual(phase(plan, id, add(start, n)), {key, idx, len}, `dag ${n} (${add(start, n)})`);
    }
  });
  test(`skift ${id}: dagene før start er slutten av forrige syklus`, () => {
    assert.deepEqual(phase(plan, id, add(start, -1)), {key:'F', idx:9, len:9});
    assert.deepEqual(phase(plan, id, add(start, -9)), {key:'F', idx:1, len:9});
    assert.deepEqual(phase(plan, id, add(start, -10)), {key:'D', idx:5, len:5});
  });
  test(`skift ${id}: kveld starter mandag, helg er lør–søn`, () => {
    assert.equal(new Date(start).getUTCDay(), 1);
    assert.equal(phase(plan, id, add(start, 5)).key, 'H');
    assert.equal(new Date(add(start, 5)).getUTCDay(), 6);
  });
}

test('skiftene ligger en uke forskjøvet', () => {
  assert.deepEqual(phase(plan, 1, '2026-01-12'), {key:'D', idx:1, len:5});
  assert.deepEqual(phase(plan, 2, '2026-01-12'), {key:'K', idx:1, len:5});
  assert.deepEqual(phase(plan, 3, '2026-01-12'), {key:'F', idx:3, len:9});
});

test('timer per dag: kveld man–tor 9 t, fre 8,5 t', () => {
  for (const d of ['2026-01-05','2026-01-06','2026-01-07','2026-01-08']) assert.equal(workHours(plan, 'K', d), 9, d);
  assert.equal(workHours(plan, 'K', '2026-01-09'), 8.5);
  assert.equal(timeTxt(plan, 'K', '2026-01-05'), '14:30–23:30');
  assert.equal(timeTxt(plan, 'K', '2026-01-09'), '10:30–19:00');
});
test('timer per dag: helg 9,5 t', () => {
  assert.equal(workHours(plan, 'H', '2026-01-10'), 9.5);
  assert.equal(workHours(plan, 'H', '2026-01-11'), 9.5);
});
test('timer per dag: dag man–tor 9 t, fre 7 t', () => {
  for (const d of ['2026-01-12','2026-01-13','2026-01-14','2026-01-15']) assert.equal(workHours(plan, 'D', d), 9, d);
  assert.equal(workHours(plan, 'D', '2026-01-16'), 7);
});
test('fridag gir overtidstimer (9 t)', () => {
  assert.equal(workHours(plan, 'F', '2026-01-20'), 9);
  assert.equal(timeTxt(plan, 'F', '2026-01-20'), 'overtid');
});

test('stdHours følger teknikerens skift gjennom en hel syklus', () => {
  const t = {shift:1};
  const week = [9,9,9,9,8.5, 9.5,9.5, 9,9,9,9,7];
  week.forEach((h, n) => assert.equal(stdHours(plan, t, add('2026-01-05', n)), h, `dag ${n}`));
  assert.equal(stdHours(plan, {shift:2}, '2026-01-16'), 8.5);   // skift 2 kveld fredag
  assert.equal(stdHours(plan, {shift:3}, '2026-01-30'), 7);     // skift 3 dag fredag
});

test('extraUntil teller bare skiftdager', () => {
  assert.equal(extraUntil(plan, 1, '2026-01-05', 1), '2026-01-05');
  assert.equal(extraUntil(plan, 1, '2026-01-05', 12), '2026-01-16');
  assert.equal(extraUntil(plan, 1, '2026-01-05', 13), '2026-01-26');   // hopper over 9 fridager
  assert.equal(extraUntil(plan, 1, '2026-01-20', 1), '2026-01-26');    // start på fridag
});

test('LMS-standard fyller resten av dagen', () => {
  assert.equal(lmsFill(9, 0), 9);
  assert.equal(lmsFill(9, 4), 5);
  assert.equal(lmsFill(8.5, 4), 4.5);
  assert.equal(lmsFill(7, 7), 0);
  assert.ok(lmsFill(9, 10) < 0);
  assert.equal(lmsFill(9.5, 2.25), 7.5);   // rundes til nærmeste halvtime
});
test('ISO-ukenummer', () => {
  assert.equal(isoWeek('2026-01-01'), 1);    // torsdag
  assert.equal(isoWeek('2026-01-05'), 2);
  assert.equal(isoWeek('2026-10-12'), 42);
  assert.equal(isoWeek('2027-01-01'), 53);   // fredag i uke 53 av 2026
  assert.equal(isoWeek('2024-12-30'), 1);    // mandag i uke 1 av 2025
});

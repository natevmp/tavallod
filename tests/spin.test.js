import test from 'node:test';
import assert from 'node:assert/strict';
import { PRIZES, WINNING_INDEX, SEGMENT_ANGLE, planSpin, prizeIndexAtRotation } from '../docs/spin.js';

const normalize = (degrees) => ((degrees % 360) + 360) % 360;

test('the ten approved prizes and winning segment are present', () => {
  assert.deepEqual(PRIZES, [
    '50% off McDonalds (or 25% off Five Guys)!',
    'An appearance on Eshge Abadi!',
    'Saucise pard nakon!',
    'An eReader of your choice!',
    'Breakfast in bed',
    'Breakfast on the toilet',
    'Apocketfullofsunshine',
    'A cat',
    'A zebra',
    'British Citizenship',
  ]);
  assert.equal(WINNING_INDEX, 3);
  assert.equal(SEGMENT_ANGLE, 360 / PRIZES.length);
});

test('pointer lookup matches independently calculated segment centers', () => {
  for (let segment = 0; segment < PRIZES.length; segment += 1) {
    for (const revolutions of [-5, 0, 1, 100]) {
      const rotation = -(segment + 0.5) * SEGMENT_ANGLE + revolutions * 360;
      assert.equal(prizeIndexAtRotation(rotation), segment);
    }
  }
});

test('extreme random values always land safely inside the winning wedge', () => {
  for (const value of [0, 0.000001, 0.25, 0.5, 0.75, 0.999999999999]) {
    for (const current of [0, 1, 234, 359.9, 360, 12843.2, -45]) {
      const { rotation, duration } = planSpin(current, () => value);
      const pointerAngle = normalize(-rotation);
      const offset = pointerAngle - WINNING_INDEX * SEGMENT_ANGLE;
      assert.ok(offset >= SEGMENT_ANGLE * 0.3 - 1e-7);
      assert.ok(offset <= SEGMENT_ANGLE * 0.7 + 1e-7);
      assert.equal(Math.floor(pointerAngle / SEGMENT_ANGLE), WINNING_INDEX);
      assert.equal(prizeIndexAtRotation(rotation), WINNING_INDEX);
      assert.ok(rotation - current >= 5 * 360);
      assert.ok(rotation - current < 9 * 360);
      assert.ok(duration >= 4800 && duration <= 6500);
    }
  }
});

test('ten thousand successive spins stay correct and vary naturally', () => {
  let seed = 2026;
  const random = () => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  let current = 0;
  const durations = new Set();
  const positions = new Set();
  const counts = new Set();
  for (let spin = 0; spin < 10000; spin += 1) {
    const { rotation, duration } = planSpin(current, random);
    const pointerAngle = normalize(-rotation);
    assert.equal(Math.floor(pointerAngle / SEGMENT_ANGLE), WINNING_INDEX);
    const offset = pointerAngle - WINNING_INDEX * SEGMENT_ANGLE;
    assert.ok(offset >= SEGMENT_ANGLE * 0.3 - 1e-6);
    assert.ok(offset <= SEGMENT_ANGLE * 0.7 + 1e-6);
    assert.ok(duration >= 4800 && duration <= 6500);
    const turns = Math.floor((rotation - current) / 360);
    assert.ok(turns >= 5 && turns <= 8);
    counts.add(turns);
    durations.add(Math.round(duration));
    positions.add(Math.round(normalize(rotation) * 10));
    current = rotation;
  }
  assert.equal(counts.size, 4);
  assert.ok(durations.size > 10);
  assert.ok(positions.size > 10);
});

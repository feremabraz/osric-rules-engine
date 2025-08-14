import { describe, expect, it } from 'vitest';
import { createRng, rollDice, rollDie, withTempSeed } from '../../osric';

describe('Dice utilities (Item 9)', () => {
  it('rollDie respects bounds', () => {
    const rng = createRng(123);
    for (let i = 0; i < 20; i++) {
      const v = rollDie(rng, 6);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(6);
    }
  });
  it('rollDice aggregates and returns rolls list', () => {
    const rng = createRng(42);
    const r = rollDice(rng, { count: 3, sides: 6, bonus: 2 });
    expect(r.rolls.length).toBe(3);
    expect(r.total).toBe(r.rolls.reduce((a, b) => a + b, 0) + 2);
  });
  it('withTempSeed restores original state', () => {
    const rng = createRng(10);
    const before = rng.getState();
    const valInside = withTempSeed(rng, 999, (r) => r.int(1, 6));
    const after = rng.getState();
    expect(after).toBe(before); // state restored
    const valNormal = rng.int(1, 6);
    expect(typeof valInside).toBe('number');
    expect(typeof valNormal).toBe('number');
  });
});

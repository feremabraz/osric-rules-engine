import { describe, expect, it } from 'vitest';
import { RNG, createRng } from '../../engine/core/rng';

describe('CE-03 RNG', () => {
  it('identical seed produces identical sequence', () => {
    const a = createRng(123456);
    const b = createRng(123456);
    const seqA = Array.from({ length: 5 }, () => a.float());
    const seqB = Array.from({ length: 5 }, () => b.float());
    expect(seqA).toEqual(seqB);
  });
  it('state restore resumes sequence', () => {
    const r = new RNG(42);
    const first = r.float();
    const state = r.getState();
    const nextVals = [r.float(), r.float()];
    r.setState(state);
    const resumed1 = r.float();
    const resumed2 = r.float();
    expect(resumed1).toBe(nextVals[0]);
    expect(resumed2).toBe(nextVals[1]);
    expect(first).not.toBe(resumed1);
  });
  it('int range inclusive and deterministic', () => {
    const r1 = new RNG(999);
    const r2 = new RNG(999);
    const ints1 = Array.from({ length: 10 }, () => r1.int(1, 6));
    const ints2 = Array.from({ length: 10 }, () => r2.int(1, 6));
    expect(ints1).toEqual(ints2);
    for (const v of ints1) {
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(6);
    }
  });
});

import { describe, expect, it } from 'vitest';
import { computeHash, verifyHash } from '../../engine/core/integrity';

describe('CE-07 Integrity Hash', () => {
  it('stable across key insertion order', () => {
    const a = { x: 1, y: 2, z: { q: 5, r: 6 } };
    const b = { z: { r: 6, q: 5 }, y: 2, x: 1 };
    const ha = computeHash(a);
    const hb = computeHash(b);
    expect(ha).toBe(hb);
  });
  it('detects mutation', () => {
    interface Acc {
      a: number;
      nested: { v: number };
    }
    const acc: Acc = { a: 1, nested: { v: 2 } };
    const h1 = computeHash(acc);
    acc.nested.v = 3;
    const h2 = computeHash(acc);
    expect(h1).not.toBe(h2);
    expect(verifyHash(h1, acc)).toBe(false);
  });
});

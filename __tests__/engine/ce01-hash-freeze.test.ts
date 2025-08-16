import { describe, expect, it } from 'vitest';
import { deepFreeze } from '../../engine/core/freeze';
import { combineHash, hashHex, hashValue } from '../../engine/core/hash';

describe('CE-01 hash utilities', () => {
  it('stable for primitive values', () => {
    const a = hashValue('hello');
    const b = hashValue('hello');
    expect(a).toBe(b);
    expect(hashHex('hello')).toBe(hashHex('hello'));
  });
  it('object key order independence', () => {
    const h1 = hashValue({ a: 1, b: 2, c: 3 });
    const h2 = hashValue({ c: 3, b: 2, a: 1 });
    expect(h1).toBe(h2);
  });
  it('array order dependence', () => {
    const h1 = hashValue([1, 2, 3]);
    const h2 = hashValue([3, 2, 1]);
    expect(h1).not.toBe(h2);
  });
  it('combine mixes values', () => {
    const h = combineHash(hashValue('x'), hashValue('y'));
    expect(typeof h).toBe('bigint');
  });
  it('rejects circular', () => {
    type O = { a: number; self?: O };
    const obj: O = { a: 1 };
    obj.self = obj;
    expect(() => hashValue(obj)).toThrow();
  });
});

describe('CE-01 deepFreeze', () => {
  it('deeply freezes nested objects', () => {
    const o = { a: { b: [1, { c: 2 }] } } as const;
    const f = deepFreeze(o) as typeof o & { x?: number };
    expect(() => {
      f.x = 1;
    }).toThrow();
    expect(Object.isFrozen(f)).toBe(true);
    // Attempt mutation (will silently fail in non-strict mode, but object remains frozen)
    // @ts-ignore - expected to throw in strict mode when attempting mutation
    expect(() => {
      (f.a as unknown as { b: number }).b = 2;
    }).toThrow();
    expect(Object.isFrozen(f.a)).toBe(true);
  });
  it('returns primitives unchanged', () => {
    expect(deepFreeze(5)).toBe(5);
  });
});

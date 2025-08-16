import { describe, expect, it } from 'vitest';
import { EffectsBuffer } from '../../engine/core/effects';

describe('CE-04 EffectsBuffer', () => {
  it('preserves insertion order', () => {
    const buf = new EffectsBuffer();
    buf.add('A', 't1');
    buf.add('B', 't2', { x: 1 });
    buf.add('C', 't3');
    const effects = buf.drain();
    expect(effects.map((e) => e.type)).toEqual(['A', 'B', 'C']);
  });
  it('drain empties buffer and freezes snapshot', () => {
    const buf = new EffectsBuffer();
    buf.add('X', 't');
    const snap = buf.drain();
    expect(buf.size()).toBe(0);
    expect(buf.isEmpty()).toBe(true);
    expect(Object.isFrozen(snap)).toBe(true);
    // Attempt to mutate via casting through unknown to mutable; should throw
    expect(() => {
      (snap as unknown as unknown[]).push({});
    }).toThrow();
  });
  it('multiple drain cycles independent', () => {
    const buf = new EffectsBuffer();
    buf.add('A', 't');
    const first = buf.drain();
    buf.add('B', 't');
    const second = buf.drain();
    expect(first.length).toBe(1);
    expect(second.length).toBe(1);
    expect(first[0]?.type).toBe('A');
    expect(second[0]?.type).toBe('B');
  });
});

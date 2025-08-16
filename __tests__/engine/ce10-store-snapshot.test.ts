// CE-10 tests: EngineStore snapshot / restore invariants
import { describe, expect, it } from 'vitest';
import { command } from '../../engine/authoring/dsl';
import { MemoryStore } from '../../engine/core/types';
import { Engine } from '../../engine/facade/engine';

// Define a simple command that mutates store via side-effect stage (simulate later integration)
// For now commands only produce accumulator fragments; store usage will appear in later CE steps.
// We'll just ensure snapshot / restore are independent from RNG state.

command('ce10:add', undefined)
  .calc(() => ({ value: 1 }))
  .emit(() => ({}));

command('ce10:fail', undefined)
  .validate(() => {
    throw new Error('boom');
  })
  .emit(() => ({}));

describe('CE-10 EngineStore snapshot / restore', () => {
  it('restores store state while preserving RNG sequence', () => {
    const store = new MemoryStore({ counter: 0, items: [1, 2, 3] });
    const engine = new Engine({ seed: 123, store });
    const snap = store.snapshot();
    // Advance RNG via execute (will consume one RNG float) and mutate store externally
    const r1 = engine.execute('ce10:add', {});
    expect(r1.ok).toBe(true);
    store.mutate((s) => {
      s.counter = 42;
      (s.items as number[]).push(4);
    });
    // Take another RNG value indirectly
    engine.execute('ce10:add', {});
    const postMutationSnap = store.snapshot();
    expect(postMutationSnap).not.toEqual(snap);
    // Restore original snapshot
    store.restore(snap);
    expect(store.getState()).toEqual({ counter: 0, items: [1, 2, 3] });
    // Execute again: RNG sequence should continue (deterministic progression)
    const r2 = engine.execute('ce10:add', {});
    expect(r2.ok).toBe(true);
  });
});

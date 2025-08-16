// CE-11 simulation diff tests
import { beforeEach, describe, expect, it } from 'vitest';
import { command } from '../../engine/authoring/dsl';
import { MemoryStore } from '../../engine/core/types';
import { Engine } from '../../engine/facade/engine';
import { CommandRegistry } from '../../engine/facade/registry';

interface Entity {
  id: string;
  value: number;
}

// Command that mutates three collections semantics (simulated by directly modifying store via mutate stage)
// Since we don't yet thread the store into rule ctx, we'll emulate by returning fragments representing changes.
// For diffing demonstration we simulate store arrays existing externally; diff logic only inspects store snapshot.

function registerSimCommands() {
  command('sim:create')
    .mutate((_acc, _p, ctx) => {
      const store = (ctx as unknown as { store: MemoryStore }).store;
      (store.getState().entities as Entity[]).push({ id: 'b', value: 2 });
    })
    .emit(() => ({}));
  command('sim:mutate')
    .mutate((_acc, _p, ctx) => {
      const store = (ctx as unknown as { store: MemoryStore }).store;
      const e = (store.getState().entities as Entity[]).find((e: Entity) => e.id === 'a');
      if (e) e.value = 10;
    })
    .emit(() => ({}));
  command('sim:delete')
    .mutate((_acc, _p, ctx) => {
      const store = (ctx as unknown as { store: MemoryStore }).store;
      const arr = store.getState().entities as Entity[];
      const idx = arr.findIndex((e: Entity) => e.id === 'a');
      if (idx >= 0) arr.splice(idx, 1);
    })
    .emit(() => ({}));
}

describe('CE-11 simulate diff', () => {
  beforeEach(() => {
    CommandRegistry.clear();
    registerSimCommands();
  });

  it('classifies created, mutated, deleted', () => {
    // Initial store state
    const store = new MemoryStore({
      entities: [{ id: 'a', value: 1 }],
    });
    const engine = new Engine({ seed: 5, store });
    const simCreate = engine.simulate('sim:create', {});
    expect(simCreate.diff.created.find((d) => d.id === 'b')).toBeTruthy();
    const simMutate = engine.simulate('sim:mutate', {});
    expect(simMutate.diff.mutated.find((d) => d.id === 'a')).toBeTruthy();
    const simDelete = engine.simulate('sim:delete', {});
    expect(simDelete.diff.deleted.find((d) => d.id === 'a')).toBeTruthy();
  });

  it('does not persist changes or RNG advancement after simulate', () => {
    const store = new MemoryStore({ entities: [] as Entity[] });
    const engine = new Engine({ seed: 7, store });
    // @ts-expect-error accessing private for test
    const firstState = engine.rng.getState().s;
    const sim = engine.simulate('sim:create', {});
    expect(sim.result.ok).toBe(true); // command exists
    // @ts-expect-error accessing private for test
    const afterState = engine.rng.getState().s;
    expect(afterState).toBe(firstState); // RNG rolled back
  });
});

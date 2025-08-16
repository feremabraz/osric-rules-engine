import { describe, expect, it } from 'vitest';
import { DomainEngine } from '../../osric-engine/engine';
import { DomainMemoryStore } from '../../osric-engine/memoryStore';
import '../../osric-engine/commands/grantXp'; // ensure command registration
import { createCharacter } from '../../osric-engine/domain/entities/character';

// DE-02 tests: wrapper & single command (grantXp)

describe('DE-02 grantXp command', () => {
  it('increments xp deterministically with seed', () => {
    const store = new DomainMemoryStore();
    createCharacter(store, 'c1', 'Alice');
    const engine = new DomainEngine({ seed: 123, store });
    const r1 = engine.grantXp('c1', 25);
    expect(r1.ok).toBe(true);
    const after = store.getCharacter('c1');
    expect(after?.xp).toBe(25);
    // simulate should not persist
    const sim = engine.simulateGrantXp('c1', 10);
    expect(sim.result.ok).toBe(true);
    const afterSim = store.getCharacter('c1');
    expect(afterSim?.xp).toBe(25); // unchanged
    // simulate diff should show mutation to xp
    const mutated = sim.diff.mutated.find((m) => m.id === 'c1');
    expect(mutated).toBeDefined();
  });

  it('fails when character not found', () => {
    const store = new DomainMemoryStore();
    const engine = new DomainEngine({ store });
    const r = engine.grantXp('missing', 5);
    expect(r.ok).toBe(false);
    if (!r.ok && r.type === 'domain-failure') {
      expect(r.code).toBe('NOT_FOUND');
    }
  });
});

import { describe, expect, it } from 'vitest';
import { DomainEngine } from '../../osric-engine/engine';
import { DomainMemoryStore } from '../../osric-engine/memoryStore';
import '../../osric-engine/commands/createCharacter';
import '../../osric-engine/commands/attackRoll';

// DE-05 attackRoll RNG determinism

describe('DE-05 attackRoll', () => {
  function setup(seed?: number) {
    const store = new DomainMemoryStore();
    const engine = new DomainEngine({ store, seed });
    engine.execute('osric:createCharacter', { id: 'a', name: 'Attacker' });
    engine.execute('osric:createCharacter', { id: 't', name: 'Target' });
    return { engine };
  }

  it('deterministic roll with fixed seed', () => {
    const { engine } = setup(42);
    const r1 = engine.execute('osric:attackRoll', { attackerId: 'a', targetId: 't' });
    const r2 = engine.execute('osric:attackRoll', { attackerId: 'a', targetId: 't' });
    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    if (r1.ok && r2.ok) {
      const d1 = r1.data as { roll: number };
      const d2 = r2.data as { roll: number };
      expect(typeof d1.roll).toBe('number');
      expect(typeof d2.roll).toBe('number');
    }
    // Recreate engine with same seed -> first roll should match original first roll
    const { engine: engine2 } = setup(42);
    const r1b = engine2.execute('osric:attackRoll', { attackerId: 'a', targetId: 't' });
    if (r1.ok && r1b.ok) {
      const d1 = r1.data as { roll: number };
      const d1b = r1b.data as { roll: number };
      expect(d1b.roll).toBe(d1.roll);
    }
  });

  it('fails when attacker missing', () => {
    const store = new DomainMemoryStore();
    const engine = new DomainEngine({ store, seed: 1 });
    engine.execute('osric:createCharacter', { id: 't', name: 'Target' });
    const r = engine.execute('osric:attackRoll', { attackerId: 'a', targetId: 't' });
    expect(r.ok).toBe(false);
  });
});

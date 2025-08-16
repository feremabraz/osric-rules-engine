import { describe, expect, it } from 'vitest';
import { DomainEngine } from '../../osric-engine/engine';
import { DomainMemoryStore } from '../../osric-engine/memoryStore';
import '../../osric-engine/commands/createCharacter';
import '../../osric-engine/commands/startBattle';

// DE-04 startBattle tests

describe('DE-04 startBattle', () => {
  function setup() {
    const store = new DomainMemoryStore();
    const engine = new DomainEngine({ store });
    engine.execute('osric:createCharacter', { id: 'c1', name: 'A' });
    engine.execute('osric:createCharacter', { id: 'c2', name: 'B' });
    return { store, engine };
  }

  it('starts a battle with participants', () => {
    const { engine, store } = setup();
    const res = engine.execute('osric:startBattle', { id: 'b1', participantIds: ['c1', 'c2'] });
    expect(res.ok).toBe(true);
    const battle = store.getBattle('b1');
    expect(battle?.participants.length).toBe(2);
    expect(battle?.round).toBe(1);
    expect(battle?.status).toBe('pending');
  });

  it('rejects duplicate battle id', () => {
    const { engine } = setup();
    engine.execute('osric:startBattle', { id: 'b1', participantIds: ['c1', 'c2'] });
    const res2 = engine.execute('osric:startBattle', { id: 'b1', participantIds: ['c1', 'c2'] });
    expect(res2.ok).toBe(false);
  });

  it('fails when character missing', () => {
    const { engine } = setup();
    const res = engine.execute('osric:startBattle', {
      id: 'b1',
      participantIds: ['c1', 'missing'],
    });
    expect(res.ok).toBe(false);
  });

  it('simulate startBattle produces diff without persisting', () => {
    const { engine, store } = setup();
    const sim = engine.simulate('osric:startBattle', { id: 'b2', participantIds: ['c1', 'c2'] });
    expect(sim.result.ok).toBe(true);
    expect(store.getBattle('b2')).toBeUndefined();
    // diff should show created battle entity via created array referencing battle state list size change
    // Our diff heuristic only tracks arrays of objects with id. Battles array fits; expect one created item with id b2.
    const createdIds = sim.diff.created.map((obj) => (obj as { id?: string }).id).filter(Boolean);
    expect(createdIds).toContain('b2');
  });
});

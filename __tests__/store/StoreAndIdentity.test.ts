import { describe, expect, it } from 'vitest';
import { Engine } from '../../osric';

function makeDraft(engine: Engine) {
  const { human, fighter, prepare } = engine.entities.character;
  return prepare(human, fighter, { name: 'Rogar' });
}

describe('Store & Identity', () => {
  it('stores a character draft and returns a prefixed id', () => {
    const engine = new Engine();
    const draft = makeDraft(engine);
    const id = engine.store.setEntity('character', draft);
    expect(id.startsWith('char_')).toBe(true);
    const fetched = engine.store.getEntity('character', id);
    expect(fetched).not.toBeNull();
    expect(fetched?.name).toBe(draft.name);
    expect(fetched?.id).toBe(id);
  });

  it('updates character enforcing invariants', () => {
    const engine = new Engine();
    const id = engine.store.setEntity('character', makeDraft(engine));
    const updated = engine.store.updateEntity('character', id, { hp: 5 });
    expect(updated.hp).toBe(5);
    expect(() => engine.store.updateEntity('character', id, { hp: -11 })).toThrow();
  });

  it('removes character and snapshot reflects change', () => {
    const engine = new Engine();
    const id = engine.store.setEntity('character', makeDraft(engine));
    expect(engine.store.snapshot().characters.length).toBe(1);
    const removed = engine.store.removeEntity('character', id);
    expect(removed).toBe(true);
    expect(engine.store.getEntity('character', id)).toBeNull();
    expect(engine.store.snapshot().characters.length).toBe(0);
  });
});

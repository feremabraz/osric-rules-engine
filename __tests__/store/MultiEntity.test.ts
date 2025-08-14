import { describe, expect, it } from 'vitest';
import { Engine } from '../../osric';

// Helper creators
function makeCharacter(engine: Engine) {
  const { human, fighter, prepare } = engine.entities.character;
  return prepare(human, fighter, { name: 'Arkon' });
}
function makeMonster(engine: Engine) {
  return engine.entities.monster.prepare({ name: 'Goblin', level: 2, hp: 3 });
}
function makeItem(engine: Engine) {
  return engine.entities.item.prepare({ name: 'Shortsword', kind: 'weapon' });
}

describe('Multi-Entity Store Skeleton', () => {
  it('creates and retrieves monster & item drafts with correct id prefixes and immutability', () => {
    const engine = new Engine();
    const monsterDraft = makeMonster(engine);
    const itemDraft = makeItem(engine);

    const monId = engine.store.setEntity('monster', monsterDraft);
    const itmId = engine.store.setEntity('item', itemDraft);

    expect(monId.startsWith('mon_')).toBe(true);
    expect(itmId.startsWith('itm_')).toBe(true);

    const mon = engine.store.getEntity('monster', monId);
    const itm = engine.store.getEntity('item', itmId);
    expect(mon).not.toBeNull();
    expect(itm).not.toBeNull();
    expect(mon?.name).toBe('Goblin');
    expect(itm?.name).toBe('Shortsword');

    // Immutability
    expect(Object.isFrozen(monsterDraft)).toBe(true);
    expect(Object.isFrozen(itemDraft)).toBe(true);
    if (mon) expect(Object.isFrozen(mon)).toBe(true);
    if (itm) expect(Object.isFrozen(itm)).toBe(true);
  });

  it('snapshot includes characters, monsters, and items arrays', () => {
    const engine = new Engine();
    engine.store.setEntity('character', makeCharacter(engine));
    engine.store.setEntity('monster', makeMonster(engine));
    engine.store.setEntity('item', makeItem(engine));
    const snap = engine.store.snapshot();
    expect(Array.isArray(snap.characters)).toBe(true);
    expect(Array.isArray(snap.monsters)).toBe(true);
    expect(Array.isArray(snap.items)).toBe(true);
    expect(snap.characters.length).toBe(1);
    expect(snap.monsters.length).toBe(1);
    expect(snap.items.length).toBe(1);
  });

  it('updates monster and item independently', () => {
    const engine = new Engine();
    const monId = engine.store.setEntity('monster', makeMonster(engine));
    const itmId = engine.store.setEntity('item', makeItem(engine));
    const updatedMon = engine.store.updateEntity('monster', monId, { hp: 5 });
    const updatedItem = engine.store.updateEntity('item', itmId, { name: 'Longsword' });
    expect(updatedMon.hp).toBe(5);
    expect(updatedItem.name).toBe('Longsword');
  });

  it('removes monster and item entries separately', () => {
    const engine = new Engine();
    const monId = engine.store.setEntity('monster', makeMonster(engine));
    const itmId = engine.store.setEntity('item', makeItem(engine));
    expect(engine.store.removeEntity('monster', monId)).toBe(true);
    expect(engine.store.removeEntity('item', itmId)).toBe(true);
    expect(engine.store.getEntity('monster', monId)).toBeNull();
    expect(engine.store.getEntity('item', itmId)).toBeNull();
  });
});

// NOTE: Brand enforcement (compile-time) is implicitly covered by TypeScript; attempting to
// pass a MonsterId where a CharacterId is expected would be a type error and thus cannot
// reside in this (runtime) test file. A separate *.d.ts type test could be added if desired.

import { describe, expect, it } from 'vitest';
import {
  getCharacter,
  listCharacters,
  queryFaction,
  requireCharacter,
  updateCharacter,
} from '../../osric';
import { Engine } from '../../osric/engine/Engine';
import { baselineCharacter } from '../../osric/testing/shortcuts';

async function setup() {
  const engine = new Engine();
  await engine.start();
  const a = await baselineCharacter(engine, { name: 'Alice' });
  const b = await baselineCharacter(engine, { name: 'Bob' });
  const c = await baselineCharacter(engine, { name: 'Cultist' });
  // Adjust factions (default is 'party')
  updateCharacter(engine.store, c, { faction: 'cult' });
  return { engine, a, b, c };
}

describe('entityHelpers (Item 10)', () => {
  it('getCharacter returns character or null', async () => {
    const { engine, a } = await setup();
    expect(getCharacter(engine.store, a)).toBeTruthy();
  });
  it('requireCharacter throws when missing', async () => {
    const { engine } = await setup();
    const missing = 'char_missing' as unknown as import('../../osric/store/ids').CharacterId;
    expect(() => requireCharacter(engine.store, missing)).toThrow();
  });
  it('updateCharacter patches and returns updated record', async () => {
    const { engine, a } = await setup();
    const before = requireCharacter(engine.store, a);
    const updated = updateCharacter(engine.store, a, { hp: before.hp + 5 });
    expect(updated.hp).toBe(before.hp + 5);
  });
  it('listCharacters returns all characters', async () => {
    const { engine } = await setup();
    expect(listCharacters(engine.store).length).toBe(3);
  });
  it('queryFaction filters by faction', async () => {
    const { engine } = await setup();
    const party = queryFaction(engine.store, 'party');
    expect(party.length).toBe(2);
    const cult = queryFaction(engine.store, 'cult');
    expect(cult.length).toBe(1);
  });
});

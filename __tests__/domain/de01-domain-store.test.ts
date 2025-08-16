import { describe, expect, it } from 'vitest';
import {
  createCharacter,
  grantXp,
  listCharacters,
} from '../../osric-engine/domain/entities/character';
import { DomainMemoryStore } from '../../osric-engine/memoryStore';

// DE-01 tests: create / update (via grantXp) / query

describe('DE-01 Domain Store & Entities', () => {
  it('creates and lists characters', () => {
    const store = new DomainMemoryStore();
    createCharacter(store, 'c1', 'Alice');
    createCharacter(store, 'c2', 'Bob');
    const chars = listCharacters(store);
    expect(chars.map((c) => c.id)).toEqual(['c1', 'c2']);
    expect(chars[0].xp).toBe(0);
  });

  it('updates character XP', () => {
    const store = new DomainMemoryStore();
    createCharacter(store, 'c1', 'Alice');
    grantXp(store, 'c1', 50);
    const c = store.getCharacter('c1');
    expect(c?.xp).toBe(50);
  });

  it('prevents duplicate id and negative xp', () => {
    const store = new DomainMemoryStore();
    createCharacter(store, 'c1', 'Alice');
    expect(() => createCharacter(store, 'c1', 'Dup')).toThrow();
    expect(() => grantXp(store, 'c1', -10)).toThrow();
  });

  it('fails when granting xp to unknown character', () => {
    const store = new DomainMemoryStore();
    expect(() => grantXp(store, 'nope', 10)).toThrow('Character not found');
  });
});

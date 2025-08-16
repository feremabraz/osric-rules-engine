// DE-01 Character entity helpers
import type { Character, DomainMemoryStore } from '../../memoryStore';

export function createCharacter(store: DomainMemoryStore, id: string, name: string): Character {
  const character: Character = { id, name, xp: 0 };
  store.addCharacter(character);
  return character;
}

export function grantXp(store: DomainMemoryStore, id: string, amount: number): Character {
  if (amount < 0) throw new Error('Negative XP not allowed');
  const c = store.getCharacter(id);
  if (!c) throw new Error('Character not found');
  c.xp += amount;
  return c;
}

export function listCharacters(store: DomainMemoryStore): Character[] {
  // Return a shallow copy to avoid external mutation
  return [...store.getState().characters];
}

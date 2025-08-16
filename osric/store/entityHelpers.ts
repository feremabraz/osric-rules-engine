import type { Character } from '../entities/character';
import type { CharacterId } from './ids';
import type { StoreFacade } from './storeFacade';

// Character-focused helpers providing clearer intent, stronger typing, and reduced repetition.

/** Retrieve a character by id or null if missing. */
export function getCharacter(store: StoreFacade, id: CharacterId): Character | null {
  return store.getEntity('character', id as CharacterId);
}

/** Retrieve a character or throw if it does not exist. */
export function requireCharacter(store: StoreFacade, id: CharacterId): Character {
  const ch = getCharacter(store, id);
  if (!ch) throw new Error(`Character ${id} not found`);
  return ch;
}

/** Partially update a character (delegates to store.updateEntity). */
export function updateCharacter(
  store: StoreFacade,
  id: CharacterId,
  patch: Partial<Omit<Character, 'id'>>
): Character {
  return store.updateEntity('character', id, patch);
}

/** List all characters (snapshot). */
export function listCharacters(store: StoreFacade): readonly Character[] {
  return store.snapshot().characters;
}

/** Filter characters belonging to a given faction. */
export function queryFaction(store: StoreFacade, faction: string): readonly Character[] {
  return listCharacters(store).filter((c) => c.faction === faction);
}

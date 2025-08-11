// Branded ID constructors and guards for staged adoption across the codebase.
// Usage: createCharacterId('char-123'), isCharacterId(x)
import type { Brand, CharacterId, ItemId, MonsterId, SpellId } from './entities';

function makeId<T extends string, B extends string>(value: T): Brand<T, B> {
  return value as Brand<T, B>;
}

export const createCharacterId = (value: string): CharacterId => makeId(value);
export const createItemId = (value: string): ItemId => makeId(value);
export const createMonsterId = (value: string): MonsterId => makeId(value);
export const createSpellId = (value: string): SpellId => makeId(value);

export const isCharacterId = (val: unknown): val is CharacterId => typeof val === 'string';
export const isItemId = (val: unknown): val is ItemId => typeof val === 'string';
export const isMonsterId = (val: unknown): val is MonsterId => typeof val === 'string';
export const isSpellId = (val: unknown): val is SpellId => typeof val === 'string';

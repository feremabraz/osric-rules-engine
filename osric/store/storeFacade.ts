// Phase 9: Multi-entity StoreFacade (character | monster | item)
import type { Character, CharacterDraft } from '../entities/character';
import type { Item, ItemDraft } from '../entities/item';
import type { Monster, MonsterDraft } from '../entities/monster';
import {
  type CharacterId,
  type ItemId,
  type MonsterId,
  createCharacterId,
  createItemId,
  createMonsterId,
} from './ids';

interface CharacterRecord extends Character {}
interface MonsterRecord extends Monster {}
interface ItemRecord extends Item {}

export interface BattleState {
  id: string;
  round: number;
  timeSeconds: number;
  order: { id: CharacterId; rolled: number }[];
  activeIndex: number;
  recordRolls?: boolean;
  rollsLog?: { type: 'init' | 'attack' | 'damage' | 'morale'; value: number; state: number }[];
  effectsLog?: { round: number; type: string; target: string; payload?: unknown }[];
  log?: { round: number; type: string; target: string; payload?: unknown }[]; // alias of effectsLog for spec naming alignment
}

export type EntityType = 'character' | 'monster' | 'item';

export interface StoreFacadeSnapshot {
  characters: Character[];
  monsters: Monster[];
  items: Item[];
  battles: BattleState[];
}

export interface StoreFacade {
  setEntity(type: 'character', draft: CharacterDraft): CharacterId;
  setEntity(type: 'monster', draft: MonsterDraft): MonsterId;
  setEntity(type: 'item', draft: ItemDraft): ItemId;
  getEntity(type: 'character', id: CharacterId): Character | null;
  getEntity(type: 'monster', id: MonsterId): Monster | null;
  getEntity(type: 'item', id: ItemId): Item | null;
  updateEntity(
    type: 'character',
    id: CharacterId,
    patch: Partial<Omit<Character, 'id'>>
  ): Character;
  updateEntity(type: 'monster', id: MonsterId, patch: Partial<Omit<Monster, 'id'>>): Monster;
  updateEntity(type: 'item', id: ItemId, patch: Partial<Omit<Item, 'id'>>): Item;
  removeEntity(type: 'character', id: CharacterId): boolean;
  removeEntity(type: 'monster', id: MonsterId): boolean;
  removeEntity(type: 'item', id: ItemId): boolean;
  snapshot(): StoreFacadeSnapshot;
  // Battle state helpers (Phase 03)
  setBattle(state: BattleState): string;
  getBattle(id: string): BattleState | null;
  updateBattle(id: string, patch: Partial<Omit<BattleState, 'id'>>): BattleState;
  removeBattle(id: string): boolean;
}

export function createStoreFacade(): StoreFacade {
  const characters = new Map<CharacterId, CharacterRecord>();
  const monsters = new Map<MonsterId, MonsterRecord>();
  const items = new Map<ItemId, ItemRecord>();
  const battles = new Map<string, BattleState>();

  function freeze<T extends object>(obj: T): T {
    return Object.freeze(obj);
  }

  function setEntity(type: 'character', draft: CharacterDraft): CharacterId;
  function setEntity(type: 'monster', draft: MonsterDraft): MonsterId;
  function setEntity(type: 'item', draft: ItemDraft): ItemId;
  function setEntity(
    type: EntityType,
    draft: CharacterDraft | MonsterDraft | ItemDraft
  ): CharacterId | MonsterId | ItemId {
    if (type === 'character') {
      const id = createCharacterId();
      const now = Date.now();
      const d = draft as CharacterDraft; // narrowed
      const record: CharacterRecord = freeze({ ...d, id, createdAt: now, updatedAt: now });
      characters.set(id, record);
      return id;
    }
    if (type === 'monster') {
      const id = createMonsterId();
      const now = Date.now();
      const d = draft as MonsterDraft;
      const record: MonsterRecord = freeze({ ...d, id, createdAt: now, updatedAt: now });
      monsters.set(id, record);
      return id;
    }
    if (type === 'item') {
      const id = createItemId();
      const now = Date.now();
      const d = draft as ItemDraft;
      const record: ItemRecord = freeze({ ...d, id, createdAt: now, updatedAt: now });
      items.set(id, record);
      return id;
    }
    throw new Error(`Unsupported entity type '${type}'`);
  }

  function getEntity(type: 'character', id: CharacterId): Character | null;
  function getEntity(type: 'monster', id: MonsterId): Monster | null;
  function getEntity(type: 'item', id: ItemId): Item | null;
  function getEntity(
    type: EntityType,
    id: CharacterId | MonsterId | ItemId
  ): Character | Monster | Item | null {
    if (type === 'character') return characters.get(id as CharacterId) ?? null;
    if (type === 'monster') return monsters.get(id as MonsterId) ?? null;
    if (type === 'item') return items.get(id as ItemId) ?? null;
    throw new Error(`Unsupported entity type '${type}'`);
  }

  function validateCharacterPatch(
    _current: CharacterRecord,
    patch: Partial<Omit<Character, 'id'>>
  ): void {
    // Runtime can drive hp below 0 (down to -10) for death tracking (Phase 05 unconscious/death thresholds)
    if (patch.hp !== undefined && patch.hp < -10) throw new Error('hp must be >= -10');
  }

  function updateEntity(
    type: 'character',
    id: CharacterId,
    patch: Partial<Omit<Character, 'id'>>
  ): Character;
  function updateEntity(
    type: 'monster',
    id: MonsterId,
    patch: Partial<Omit<Monster, 'id'>>
  ): Monster;
  function updateEntity(type: 'item', id: ItemId, patch: Partial<Omit<Item, 'id'>>): Item;
  function updateEntity(
    type: EntityType,
    id: CharacterId | MonsterId | ItemId,
    patch: Partial<Omit<Character | Monster | Item, 'id'>>
  ): Character | Monster | Item {
    if (type === 'character') {
      const existing = characters.get(id as CharacterId);
      if (!existing) throw new Error(`Character ${id} not found`);
      validateCharacterPatch(existing, patch as Partial<Omit<Character, 'id'>>);
      const updated: CharacterRecord = Object.freeze({
        ...existing,
        ...(patch as Partial<Omit<Character, 'id'>>),
        updatedAt: Date.now(),
      });
      characters.set(id as CharacterId, updated);
      return updated;
    }
    if (type === 'monster') {
      const existing = monsters.get(id as MonsterId);
      if (!existing) throw new Error(`Monster ${id} not found`);
      const updated: MonsterRecord = Object.freeze({
        ...existing,
        ...(patch as Partial<Omit<Monster, 'id'>>),
        updatedAt: Date.now(),
      });
      monsters.set(id as MonsterId, updated);
      return updated;
    }
    if (type === 'item') {
      const existing = items.get(id as ItemId);
      if (!existing) throw new Error(`Item ${id} not found`);
      const updated: ItemRecord = Object.freeze({
        ...existing,
        ...(patch as Partial<Omit<Item, 'id'>>),
        updatedAt: Date.now(),
      });
      items.set(id as ItemId, updated);
      return updated;
    }
    throw new Error(`Unsupported entity type '${type}'`);
  }

  function removeEntity(type: EntityType, id: CharacterId | MonsterId | ItemId): boolean {
    switch (type) {
      case 'character':
        return characters.delete(id as CharacterId);
      case 'monster':
        return monsters.delete(id as MonsterId);
      case 'item':
        return items.delete(id as ItemId);
      default:
        throw new Error(`Unsupported entity type '${type}'`);
    }
  }

  function snapshot(): StoreFacadeSnapshot {
    return {
      characters: Array.from(characters.values()),
      monsters: Array.from(monsters.values()),
      items: Array.from(items.values()),
      battles: Array.from(battles.values()),
    };
  }

  function setBattle(state: BattleState): string {
    battles.set(state.id, Object.freeze({ ...state }));
    return state.id;
  }
  function getBattle(id: string): BattleState | null {
    return battles.get(id) ?? null;
  }
  function updateBattle(id: string, patch: Partial<Omit<BattleState, 'id'>>): BattleState {
    const existing = battles.get(id);
    if (!existing) throw new Error(`Battle ${id} not found`);
    const merged = { ...existing, ...patch } as BattleState;
    if (patch.effectsLog && !patch.log) merged.log = patch.effectsLog;
    if (patch.log && !patch.effectsLog) merged.effectsLog = patch.log;
    const updated = Object.freeze(merged);
    battles.set(id, updated);
    return updated;
  }
  function removeBattle(id: string): boolean {
    return battles.delete(id);
  }

  return {
    setEntity,
    getEntity,
    updateEntity,
    removeEntity,
    snapshot,
    setBattle,
    getBattle,
    updateBattle,
    removeBattle,
  };
}

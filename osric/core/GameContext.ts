import type { CharacterId, ItemId, MonsterId } from '@osric/types';
import type { Character } from '@osric/types/character';
import type { Item } from '@osric/types/item';
import type { Monster } from '@osric/types/monster';
import type { Spell } from '@osric/types/spell';
import { atom, type createStore } from 'jotai';
import type { TypedContextKey } from './ContextKeys';
import type { RuleEngine } from './RuleEngine';

export type GameEntity = Character | Monster;

export interface TemporaryData {
  [key: string]: unknown;
}

export const entitiesAtom = atom<Map<string, GameEntity>>(new Map());
export const itemsAtom = atom<Map<string, Item>>(new Map());
export const spellsAtom = atom<Map<string, Spell>>(new Map());
export const temporaryDataAtom = atom<TemporaryData>({});

export class GameContext {
  constructor(
    private store: ReturnType<typeof createStore>,
    private ruleEngine?: RuleEngine
  ) {}

  getRuleEngine(): RuleEngine {
    if (!this.ruleEngine) {
      throw new Error(
        'RuleEngine not initialized. Call setRuleEngine() before using getRuleEngine().'
      );
    }
    return this.ruleEngine;
  }

  setRuleEngine(engine: RuleEngine): void {
    this.ruleEngine = engine;
  }

  isFullyInitialized(): boolean {
    return this.ruleEngine !== undefined;
  }

  // Overloads to support branded IDs without changing runtime behavior
  getEntity<T extends GameEntity>(id: string): T | null;
  getEntity<T extends GameEntity>(id: CharacterId): T | null;
  getEntity<T extends GameEntity>(id: MonsterId): T | null;
  getEntity<T extends GameEntity>(id: CharacterId | MonsterId | string): T | null {
    const entities = this.store.get(entitiesAtom);
    return (entities.get(id as string) as T) || null;
  }

  hasEntity(id: string): boolean;
  hasEntity(id: CharacterId): boolean;
  hasEntity(id: MonsterId): boolean;
  hasEntity(id: CharacterId | MonsterId | string): boolean {
    const entities = this.store.get(entitiesAtom);
    return entities.has(id as string);
  }

  setEntity(id: string, entity: GameEntity): void;
  setEntity(id: CharacterId, entity: GameEntity): void;
  setEntity(id: MonsterId, entity: GameEntity): void;
  setEntity(id: CharacterId | MonsterId | string, entity: GameEntity): void {
    const entities = this.store.get(entitiesAtom);
    const newEntities = new Map(entities);
    newEntities.set(id as string, entity);
    this.store.set(entitiesAtom, newEntities);
  }

  removeEntity(id: string): void;
  removeEntity(id: CharacterId): void;
  removeEntity(id: MonsterId): void;
  removeEntity(id: CharacterId | MonsterId | string): void {
    const entities = this.store.get(entitiesAtom);
    const newEntities = new Map(entities);
    newEntities.delete(id as string);
    this.store.set(entitiesAtom, newEntities);
  }

  getEntitiesOfType<T extends GameEntity>(predicate: (entity: GameEntity) => entity is T): T[] {
    const entities = this.store.get(entitiesAtom);
    const result: T[] = [];

    for (const entity of entities.values()) {
      if (predicate(entity)) {
        result.push(entity);
      }
    }

    return result;
  }

  getItem<T extends Item>(id: string): T | null;
  getItem<T extends Item>(id: ItemId): T | null;
  getItem<T extends Item>(id: ItemId | string): T | null {
    const items = this.store.get(itemsAtom);
    return (items.get(id as string) as T) || null;
  }

  setItem(id: string, item: Item): void;
  setItem(id: ItemId, item: Item): void;
  setItem(id: ItemId | string, item: Item): void {
    const items = this.store.get(itemsAtom);
    const newItems = new Map(items);
    newItems.set(id as string, item);
    this.store.set(itemsAtom, newItems);
  }

  removeItem(id: string): void;
  removeItem(id: ItemId): void;
  removeItem(id: ItemId | string): void {
    const items = this.store.get(itemsAtom);
    const newItems = new Map(items);
    newItems.delete(id as string);
    this.store.set(itemsAtom, newItems);
  }

  getSpell(name: string): Spell | null {
    const spells = this.store.get(spellsAtom);
    return spells.get(name) || null;
  }

  setSpell(name: string, spell: Spell): void {
    const spells = this.store.get(spellsAtom);
    const newSpells = new Map(spells);
    newSpells.set(name, spell);
    this.store.set(spellsAtom, newSpells);
  }

  getTemporary<T>(key: string): T | null;
  getTemporary<T>(key: TypedContextKey<T>): T | null;
  getTemporary<T>(key: string | TypedContextKey<T>): T | null {
    const tempData = this.store.get(temporaryDataAtom);
    const k = typeof key === 'string' ? key : key.key;
    return (tempData[k] as T) || null;
  }

  setTemporary<T>(key: string, value: T): void;
  setTemporary<T>(key: TypedContextKey<T>, value: T): void;
  setTemporary<T>(key: string | TypedContextKey<T>, value: T): void {
    const tempData = this.store.get(temporaryDataAtom);
    const k = typeof key === 'string' ? key : key.key;
    const newTempData = { ...tempData, [k]: value };
    this.store.set(temporaryDataAtom, newTempData);
  }

  clearTemporary(): void {
    this.store.set(temporaryDataAtom, {});
  }

  clearTemporaryKey(key: string): void {
    const tempData = this.store.get(temporaryDataAtom);
    const newTempData = { ...tempData };
    delete newTempData[key];
    this.store.set(temporaryDataAtom, newTempData);
  }

  createSnapshot(): {
    entities: [string, GameEntity][];
    items: [string, Item][];
    spells: [string, Spell][];
    temporaryData: TemporaryData;
  } {
    return {
      entities: Array.from(this.store.get(entitiesAtom).entries()),
      items: Array.from(this.store.get(itemsAtom).entries()),
      spells: Array.from(this.store.get(spellsAtom).entries()),
      temporaryData: this.store.get(temporaryDataAtom),
    };
  }

  isValid(): boolean {
    return this.store !== null;
  }
}

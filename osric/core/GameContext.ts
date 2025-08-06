import type { Character, Item, Monster, Spell } from '@osric/types/entities';
import { atom, type createStore } from 'jotai';

export type GameEntity = Character | Monster;

export interface TemporaryData {
  [key: string]: unknown;
}

export const entitiesAtom = atom<Map<string, GameEntity>>(new Map());
export const itemsAtom = atom<Map<string, Item>>(new Map());
export const spellsAtom = atom<Map<string, Spell>>(new Map());
export const temporaryDataAtom = atom<TemporaryData>({});

export class GameContext {
  constructor(private store: ReturnType<typeof createStore>) {}

  getEntity<T extends GameEntity>(id: string): T | null {
    const entities = this.store.get(entitiesAtom);
    return (entities.get(id) as T) || null;
  }

  hasEntity(id: string): boolean {
    const entities = this.store.get(entitiesAtom);
    return entities.has(id);
  }

  setEntity(id: string, entity: GameEntity): void {
    const entities = this.store.get(entitiesAtom);
    const newEntities = new Map(entities);
    newEntities.set(id, entity);
    this.store.set(entitiesAtom, newEntities);
  }

  removeEntity(id: string): void {
    const entities = this.store.get(entitiesAtom);
    const newEntities = new Map(entities);
    newEntities.delete(id);
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

  getItem<T extends Item>(id: string): T | null {
    const items = this.store.get(itemsAtom);
    return (items.get(id) as T) || null;
  }

  setItem(id: string, item: Item): void {
    const items = this.store.get(itemsAtom);
    const newItems = new Map(items);
    newItems.set(id, item);
    this.store.set(itemsAtom, newItems);
  }

  removeItem(id: string): void {
    const items = this.store.get(itemsAtom);
    const newItems = new Map(items);
    newItems.delete(id);
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

  getTemporary<T>(key: string): T | null {
    const tempData = this.store.get(temporaryDataAtom);
    return (tempData[key] as T) || null;
  }

  setTemporary(key: string, value: unknown): void {
    const tempData = this.store.get(temporaryDataAtom);
    const newTempData = { ...tempData, [key]: value };
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

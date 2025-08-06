/**
 * GameContext - Shared game state and workspace for command execution
 *
 * This provides a centralized way to manage game state during command execution.
 * Uses Jotai for reactive state management.
 */

import { atom, type createStore } from 'jotai';
import type { Character, Item, Monster, Spell } from '../types/entities';

/**
 * Union type for all game entities
 */
export type GameEntity = Character | Monster;

/**
 * Temporary data storage for inter-rule communication
 */
export interface TemporaryData {
  [key: string]: unknown;
}

/**
 * Jotai atoms for game state management
 */
export const entitiesAtom = atom<Map<string, GameEntity>>(new Map());
export const itemsAtom = atom<Map<string, Item>>(new Map());
export const spellsAtom = atom<Map<string, Spell>>(new Map());
export const temporaryDataAtom = atom<TemporaryData>({});

/**
 * GameContext provides access to game state and temporary data during command execution
 */
export class GameContext {
  constructor(private store: ReturnType<typeof createStore>) {} // Jotai store

  // Entity Management

  /**
   * Get an entity by ID
   */
  getEntity<T extends GameEntity>(id: string): T | null {
    const entities = this.store.get(entitiesAtom);
    return (entities.get(id) as T) || null;
  }

  /**
   * Check if an entity exists
   */
  hasEntity(id: string): boolean {
    const entities = this.store.get(entitiesAtom);
    return entities.has(id);
  }

  /**
   * Add or update an entity
   */
  setEntity(id: string, entity: GameEntity): void {
    const entities = this.store.get(entitiesAtom);
    const newEntities = new Map(entities);
    newEntities.set(id, entity);
    this.store.set(entitiesAtom, newEntities);
  }

  /**
   * Remove an entity
   */
  removeEntity(id: string): void {
    const entities = this.store.get(entitiesAtom);
    const newEntities = new Map(entities);
    newEntities.delete(id);
    this.store.set(entitiesAtom, newEntities);
  }

  /**
   * Get all entities of a specific type
   */
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

  // Item Management

  /**
   * Get an item by ID
   */
  getItem<T extends Item>(id: string): T | null {
    const items = this.store.get(itemsAtom);
    return (items.get(id) as T) || null;
  }

  /**
   * Add or update an item
   */
  setItem(id: string, item: Item): void {
    const items = this.store.get(itemsAtom);
    const newItems = new Map(items);
    newItems.set(id, item);
    this.store.set(itemsAtom, newItems);
  }

  /**
   * Remove an item
   */
  removeItem(id: string): void {
    const items = this.store.get(itemsAtom);
    const newItems = new Map(items);
    newItems.delete(id);
    this.store.set(itemsAtom, newItems);
  }

  // Spell Management

  /**
   * Get a spell by name
   */
  getSpell(name: string): Spell | null {
    const spells = this.store.get(spellsAtom);
    return spells.get(name) || null;
  }

  /**
   * Add or update a spell
   */
  setSpell(name: string, spell: Spell): void {
    const spells = this.store.get(spellsAtom);
    const newSpells = new Map(spells);
    newSpells.set(name, spell);
    this.store.set(spellsAtom, newSpells);
  }

  // Temporary Data Management (for inter-rule communication)

  /**
   * Get temporary data with type safety
   */
  getTemporary<T>(key: string): T | null {
    const tempData = this.store.get(temporaryDataAtom);
    return (tempData[key] as T) || null;
  }

  /**
   * Set temporary data
   */
  setTemporary(key: string, value: unknown): void {
    const tempData = this.store.get(temporaryDataAtom);
    const newTempData = { ...tempData, [key]: value };
    this.store.set(temporaryDataAtom, newTempData);
  }

  /**
   * Clear temporary data (usually done after command execution)
   */
  clearTemporary(): void {
    this.store.set(temporaryDataAtom, {});
  }

  /**
   * Clear specific temporary data key
   */
  clearTemporaryKey(key: string): void {
    const tempData = this.store.get(temporaryDataAtom);
    const newTempData = { ...tempData };
    delete newTempData[key];
    this.store.set(temporaryDataAtom, newTempData);
  }

  // Utility Methods

  /**
   * Create a snapshot of current context (for debugging/testing)
   */
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

  /**
   * Check if context is in a valid state for command execution
   */
  isValid(): boolean {
    // Basic validation - can be extended as needed
    return this.store !== null;
  }
}

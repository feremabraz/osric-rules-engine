import { abilityMod } from '../entities/ability';
import { item } from '../entities/item';
import { getCharacter } from '../store/entityHelpers';
import type { CharacterId } from '../store/ids';
import type { StoreFacade } from '../store/storeFacade';

export interface CombatSnapshot {
  hp: { current: number; max: number };
  attack: { base: number; strMod: number; dexMod: number };
  ac: number;
  initiativeBase: number;
  movementMps: number;
  encumbranceKg: number;
}

export function getCombatSnapshot(store: StoreFacade, id: CharacterId): CombatSnapshot | null {
  const ch = getCharacter(store, id as CharacterId);
  if (!ch) return null;
  const strMod = abilityMod(ch.ability.str);
  const dexMod = abilityMod(ch.ability.dex);
  const armorKey = (ch.equipped.armor ?? 'none') as keyof typeof item.armors;
  const armor = item.armors[armorKey];
  const ac = 10 + (armor?.armorClassBase ?? 0) + dexMod;
  return {
    hp: { current: ch.hp, max: ch.hp }, // max placeholder (no max tracking yet)
    attack: { base: ch.stats.baseAttack, strMod, dexMod },
    ac,
    initiativeBase: ch.stats.initiative.base,
    movementMps: ch.stats.movement.speedMps,
    encumbranceKg: ch.encumbrance.totalWeightKg,
  };
}

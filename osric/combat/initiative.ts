import { abilityMod } from '../entities/ability';
import type { Character } from '../entities/character';
import { item } from '../entities/item';

// Phase 02 Item 1: compute initiative base (DEX mod + armor penalty + encumbrance penalty placeholder)
export function computeInitiativeBase(ch: Character): number {
  const dex = ch.ability.dex;
  const dexMod = abilityMod(dex);
  // Armor penalty via equipped armor meta if present
  let armorPenalty = 0;
  if (ch.equipped.armor) {
    const armorKey = ch.equipped.armor as keyof typeof item.armors | 'none';
    const meta = item.armors[armorKey as keyof typeof item.armors] ?? item.armors.none;
    armorPenalty = meta.initiativePenalty ?? 0;
  }
  const encumbrancePenalty = 0; // placeholder future formula
  return dexMod + armorPenalty + encumbrancePenalty;
}

export function recalcAndStoreInitiative(
  ch: Character,
  update: (patch: Partial<Character>) => void
) {
  const base = computeInitiativeBase(ch);
  update({ stats: { ...ch.stats, initiative: { base } } });
}

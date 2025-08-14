import type { Engine } from '../engine/Engine';
import { abilityMod } from '../entities/ability';
import { requireCharacter } from '../store/entityHelpers';
import type { CharacterId } from '../store/ids';

export type SavingThrowType = 'death' | 'wands' | 'petrification' | 'breath' | 'spells';

export interface SavingThrowResult {
  type: SavingThrowType;
  characterId: CharacterId;
  roll: number; // raw d20
  abilityMod: number;
  modifiersTotal: number; // external modifiers sum
  total: number; // roll + abilityMod + modifiersTotal
  target: number; // target to meet or exceed
  success: boolean;
}

// Simplified mapping from saving throw type to ability that modifies it
const SAVE_ABILITY: Record<SavingThrowType, keyof import('../entities/character').AbilityScores> = {
  death: 'con',
  wands: 'dex',
  petrification: 'con',
  breath: 'dex',
  spells: 'wis',
};

export function performSavingThrow(
  engine: Engine,
  characterId: CharacterId,
  type: SavingThrowType,
  modifiers: number[] = []
): SavingThrowResult {
  const ch = requireCharacter(engine.store, characterId as CharacterId);
  const abilityKey = SAVE_ABILITY[type];
  const abil = ch.ability[abilityKey];
  const aMod = abilityMod(abil);
  const modsTotal = modifiers.reduce((a, b) => a + b, 0);
  const roll = (engine as unknown as { rng: { int: (a: number, b: number) => number } }).rng.int(
    1,
    20
  );
  const target = ch.stats.saves[type];
  const total = roll + aMod + modsTotal;
  return {
    type,
    characterId,
    roll,
    abilityMod: aMod,
    modifiersTotal: modsTotal,
    total,
    target,
    success: total >= target,
  };
}

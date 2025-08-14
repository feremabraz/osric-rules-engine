import type { Character as CharacterData } from '@osric/types/character';
import type { Weapon } from '@osric/types/item';
import type { Monster as MonsterData } from '@osric/types/monster';

// Central AttackContext used by combat rules that operate on a single attack resolution
export interface AttackContext {
  attacker: CharacterData | MonsterData;
  target: CharacterData | MonsterData;
  weapon?: Weapon;
  attackType?: string;
  situationalModifiers?: number;
  isChargedAttack?: boolean;
  // Optional fields used by some rules when they embed transient data on the context
  hitRoll?: number;
  isCriticalHit?: boolean;
  multipleAttacks?: boolean;
  roundState?: {
    currentRound: number;
    fractionalAttacksCarriedOver: number;
  };
}

export function isFighterClass(character: CharacterData): boolean {
  // OSRIC core martial classes; keep list centralized
  return ['Fighter', 'Paladin', 'Ranger'].includes(character.class);
}

export function hasLessThanOneHD(target: CharacterData | MonsterData): boolean {
  if ('hitDice' in target) {
    const match = target.hitDice.match(/^([\d.]+)/);
    if (match) {
      const hdValue = Number.parseFloat(match[1]);
      return hdValue < 1;
    }
  }

  if ('level' in target) {
    return target.level === 0 || (target.hitPoints.maximum <= 4 && target.level === 1);
  }

  return false;
}

export function getAttacksPerRound(
  attacker: CharacterData | MonsterData,
  weapon?: Weapon,
  target?: CharacterData | MonsterData
): number {
  // Monster logic: number of damage entries = number of attacks
  if ('hitDice' in attacker) {
    return attacker.damagePerAttack ? attacker.damagePerAttack.length : 1;
  }

  const character = attacker as CharacterData;

  const fighter = isFighterClass(character);

  // Fighters against <1HD opponents can attack once per level
  if (fighter && target && hasLessThanOneHD(target)) {
    return character.level;
  }

  let attacksPerRound = 1;

  // Fighter class base progression
  if (fighter) {
    if (character.level >= 13) {
      attacksPerRound = 2;
    } else if (character.level >= 7) {
      attacksPerRound = 1.5;
    }
  }

  // Apply weapon specialization bonuses when present
  if (weapon && character.weaponSpecializations) {
    const specialization = character.weaponSpecializations.find(
      (spec) => spec.weapon.toLowerCase() === weapon.name.toLowerCase()
    );

    if (specialization) {
      const specializationLevel = specialization.bonuses.attackRate || 1;
      attacksPerRound = getSpecializedAttackRate(
        character.level,
        specializationLevel,
        attacksPerRound
      );
    }
  }

  return attacksPerRound;
}

function getSpecializedAttackRate(
  level: number,
  specializationLevel: number,
  baseAttacks: number
): number {
  if (specializationLevel === 1) {
    if (level >= 13) return 2.5;
    if (level >= 7) return 2.0;
    return 1.5;
  }

  if (specializationLevel === 2) {
    if (level >= 13) return 3.0;
    if (level >= 7) return 2.5;
    return 2.0;
  }

  return baseAttacks;
}

export function calculateTargetNumber(
  attacker: CharacterData | MonsterData,
  target: CharacterData | MonsterData
): number {
  const attackerThac0 = attacker.thac0;
  const targetAC = target.armorClass;
  return attackerThac0 - targetAC;
}

export function calculateAttackModifiers(
  attacker: CharacterData | MonsterData,
  weapon?: Weapon,
  situationalModifiers = 0,
  isChargedAttack = false
): number {
  let totalModifier = situationalModifiers;

  if ('abilityModifiers' in attacker) {
    if ((!weapon || weapon.type === 'Melee') && attacker.abilityModifiers.strengthHitAdj) {
      totalModifier += attacker.abilityModifiers.strengthHitAdj;
    }

    if (weapon?.type === 'Ranged' && attacker.abilityModifiers.dexterityMissile) {
      totalModifier += attacker.abilityModifiers.dexterityMissile;
    }
  }

  if (weapon?.magicBonus) {
    totalModifier += weapon.magicBonus;
  }

  if (isChargedAttack) {
    totalModifier += 2;
  }

  if ('weaponSpecializations' in attacker && weapon && attacker.weaponSpecializations) {
    const specialization = attacker.weaponSpecializations.find(
      (spec) => spec.weapon === weapon.name
    );
    if (specialization?.bonuses.hitBonus) {
      totalModifier += specialization.bonuses.hitBonus;
    }
  }

  return totalModifier;
}

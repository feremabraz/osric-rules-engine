/**
 * WeaponVsArmorRules.ts - OSRIC Weapon vs Armor Rules
 *
 * Implements the complete OSRIC weapon vs armor system including:
 * - Weapon damage type classification (slashing, piercing, bludgeoning)
 * - Armor category classification based on AC values
 * - Attack roll modifiers based on weapon type vs armor type
 * - Optional rule integration with core combat mechanics
 *
 * PRESERVATION: All OSRIC weapon vs armor mechanics preserved exactly.
 */

import type { Command } from '@osric/core/Command';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, type RuleResult } from '@osric/core/Rule';
import { COMMAND_TYPES } from '@osric/types/constants';
import type {
  Character as CharacterData,
  Monster as MonsterData,
  Weapon,
} from '../../types/entities';

type WeaponType = 'Slashing' | 'Piercing' | 'Bludgeoning';
type ArmorCategory =
  | 'Unarmored'
  | 'Padded/Leather'
  | 'StuddedLeather/Ring'
  | 'Scale/Chain'
  | 'Banded/Splint'
  | 'Plate';

interface WeaponVsArmorContext {
  attacker: CharacterData | MonsterData;
  defender: CharacterData | MonsterData;
  weapon: Weapon;
}

export class WeaponVsArmorRule extends BaseRule {
  name = 'weapon-vs-armor';

  async execute(context: GameContext, _command: Command): Promise<RuleResult> {
    const weaponArmorContext = context.getTemporary('weapon-armor-context') as WeaponVsArmorContext;

    if (!weaponArmorContext) {
      return this.createFailureResult('No weapon vs armor context found');
    }

    const { defender, weapon } = weaponArmorContext;

    // Calculate weapon vs armor adjustment
    const adjustment = this.getWeaponVsArmorAdjustment(weapon, defender.armorClass);

    // Store adjustment for use by attack roll
    context.setTemporary('weapon-vs-armor-adjustment', adjustment);

    const adjustmentText =
      adjustment > 0 ? `+${adjustment}` : adjustment < 0 ? `${adjustment}` : '0';

    return this.createSuccessResult(
      `Weapon vs armor adjustment: ${adjustmentText} (${this.getWeaponType(weapon)} vs ${this.getArmorCategory(defender.armorClass)})`
    );
  }

  canApply(context: GameContext, command: Command): boolean {
    if (command.type !== COMMAND_TYPES.ATTACK) return false;

    const weaponArmorContext = context.getTemporary('weapon-armor-context') as WeaponVsArmorContext;
    return weaponArmorContext !== null;
  }

  /**
   * Weapon vs. Armor adjustments table (OSRIC)
   * Numbers represent modifiers to attack rolls
   */
  private readonly WEAPON_VS_ARMOR_TABLE: Record<WeaponType, Record<ArmorCategory, number>> = {
    Slashing: {
      Unarmored: 0,
      'Padded/Leather': -1,
      'StuddedLeather/Ring': 0,
      'Scale/Chain': 0,
      'Banded/Splint': +1,
      Plate: +2,
    },
    Piercing: {
      Unarmored: 0,
      'Padded/Leather': +1,
      'StuddedLeather/Ring': 0,
      'Scale/Chain': -1,
      'Banded/Splint': -2,
      Plate: -3,
    },
    Bludgeoning: {
      Unarmored: 0,
      'Padded/Leather': 0,
      'StuddedLeather/Ring': +1,
      'Scale/Chain': +2,
      'Banded/Splint': 0,
      Plate: -1,
    },
  };

  /**
   * Map weapons to their damage type
   */
  private readonly WEAPON_DAMAGE_TYPES: Record<string, WeaponType> = {
    // Slashing weapons
    'Sword, Long': 'Slashing',
    'Sword, Short': 'Slashing',
    'Sword, Broad': 'Slashing',
    'Sword, Bastard': 'Slashing',
    'Sword, Two-Handed': 'Slashing',
    'Axe, Battle': 'Slashing',
    'Axe, Hand': 'Slashing',
    Scimitar: 'Slashing',
    Falchion: 'Slashing',

    // Piercing weapons
    Dagger: 'Piercing',
    Spear: 'Piercing',
    Arrow: 'Piercing',
    Bolt: 'Piercing',
    Trident: 'Piercing',
    'Bow, Short': 'Piercing',
    'Bow, Long': 'Piercing',
    'Crossbow, Light': 'Piercing',
    'Crossbow, Heavy': 'Piercing',
    Pike: 'Piercing',
    Javelin: 'Piercing',

    // Bludgeoning weapons
    Mace: 'Bludgeoning',
    'Hammer, War': 'Bludgeoning',
    Club: 'Bludgeoning',
    Flail: 'Bludgeoning',
    'Morning Star': 'Bludgeoning',
    Staff: 'Bludgeoning',
    Quarterstaff: 'Bludgeoning',
    Maul: 'Bludgeoning',
  };

  /**
   * Map armor class to armor category
   */
  private readonly AC_TO_ARMOR_CATEGORY: Record<number, ArmorCategory> = {
    10: 'Unarmored', // AC 10 (no armor)
    9: 'Padded/Leather', // AC 9-8 (leather, padded)
    8: 'Padded/Leather',
    7: 'StuddedLeather/Ring', // AC 7 (studded leather, ring)
    6: 'StuddedLeather/Ring', // AC 6 (scale)
    5: 'Scale/Chain', // AC 5 (chain)
    4: 'Scale/Chain', // AC 4 (banded)
    3: 'Banded/Splint', // AC 3 (splint)
    2: 'Plate', // AC 2 (plate)
    1: 'Plate', // AC 1-0 (field plate)
    0: 'Plate',
  };

  /**
   * Get weapon vs. armor adjustment based on weapon and target's armor
   */
  public getWeaponVsArmorAdjustment(weapon: Weapon, targetAC: number): number {
    // Determine weapon damage type
    const damageType = this.getWeaponType(weapon);

    // Determine armor category based on AC
    const armorCategory = this.getArmorCategory(targetAC);

    // Get adjustment from table
    return this.WEAPON_VS_ARMOR_TABLE[damageType][armorCategory];
  }

  /**
   * Get weapon damage type
   */
  private getWeaponType(weapon: Weapon): WeaponType {
    return this.WEAPON_DAMAGE_TYPES[weapon.name] || 'Slashing'; // Default to slashing
  }

  /**
   * Get armor category from AC
   */
  private getArmorCategory(targetAC: number): ArmorCategory {
    // In OSRIC, lower AC is better (descending AC system)
    // Ensure AC is within valid range (0-10)
    const boundedAC = Math.min(Math.max(targetAC, 0), 10);
    return this.AC_TO_ARMOR_CATEGORY[boundedAC] || 'Unarmored';
  }
}

export class WeaponTypeRule extends BaseRule {
  name = 'weapon-type';

  async execute(context: GameContext, _command: Command): Promise<RuleResult> {
    const weapon = context.getTemporary('weapon') as Weapon;

    if (!weapon) {
      return this.createFailureResult('No weapon found in context');
    }

    const weaponType = this.getWeaponType(weapon);
    const isVersatile = this.isVersatileWeapon(weapon);

    // Store weapon type information
    context.setTemporary('weapon-type', weaponType);
    context.setTemporary('weapon-is-versatile', isVersatile);

    return this.createSuccessResult(
      `${weapon.name} is a ${weaponType.toLowerCase()} weapon${isVersatile ? ' (versatile damage type)' : ''}`
    );
  }

  canApply(context: GameContext, command: Command): boolean {
    if (command.type !== COMMAND_TYPES.ATTACK && command.type !== COMMAND_TYPES.CHECK_WEAPON_TYPE)
      return false;

    const weapon = context.getTemporary('weapon') as Weapon;
    return weapon !== null;
  }

  /**
   * Map weapons to their damage type
   */
  private readonly WEAPON_DAMAGE_TYPES: Record<string, WeaponType> = {
    // Slashing weapons
    'Sword, Long': 'Slashing',
    'Sword, Short': 'Slashing',
    'Sword, Broad': 'Slashing',
    'Sword, Bastard': 'Slashing',
    'Sword, Two-Handed': 'Slashing',
    'Axe, Battle': 'Slashing',
    'Axe, Hand': 'Slashing',
    Scimitar: 'Slashing',
    Falchion: 'Slashing',

    // Piercing weapons
    Dagger: 'Piercing',
    Spear: 'Piercing',
    Arrow: 'Piercing',
    Bolt: 'Piercing',
    Trident: 'Piercing',
    'Bow, Short': 'Piercing',
    'Bow, Long': 'Piercing',
    'Crossbow, Light': 'Piercing',
    'Crossbow, Heavy': 'Piercing',
    Pike: 'Piercing',
    Javelin: 'Piercing',

    // Bludgeoning weapons
    Mace: 'Bludgeoning',
    'Hammer, War': 'Bludgeoning',
    Club: 'Bludgeoning',
    Flail: 'Bludgeoning',
    'Morning Star': 'Bludgeoning',
    Staff: 'Bludgeoning',
    Quarterstaff: 'Bludgeoning',
    Maul: 'Bludgeoning',
  };

  /**
   * Weapons that can be used with different damage types
   */
  private readonly VERSATILE_WEAPONS: Record<string, WeaponType[]> = {
    Quarterstaff: ['Bludgeoning', 'Piercing'], // Can thrust or strike
    Spear: ['Piercing', 'Slashing'], // Can thrust or cut
    Halberd: ['Slashing', 'Piercing'], // Has axe and spear components
    Poleaxe: ['Slashing', 'Bludgeoning'], // Has axe and hammer components
  };

  /**
   * Get weapon damage type
   */
  private getWeaponType(weapon: Weapon): WeaponType {
    return this.WEAPON_DAMAGE_TYPES[weapon.name] || 'Slashing'; // Default to slashing
  }

  /**
   * Check if weapon has multiple damage types
   */
  private isVersatileWeapon(weapon: Weapon): boolean {
    return weapon.name in this.VERSATILE_WEAPONS;
  }
}

export class ArmorCategoryRule extends BaseRule {
  name = 'armor-category';

  async execute(context: GameContext, _command: Command): Promise<RuleResult> {
    const target = context.getTemporary('target') as CharacterData | MonsterData;

    if (!target) {
      return this.createFailureResult('No target found in context');
    }

    const armorCategory = this.getArmorCategory(target.armorClass);
    const armorEffectiveness = this.getArmorEffectiveness(target.armorClass);

    // Store armor information
    context.setTemporary('armor-category', armorCategory);
    context.setTemporary('armor-effectiveness', armorEffectiveness);

    return this.createSuccessResult(
      `Target has ${armorCategory} (AC ${target.armorClass}) - ${armorEffectiveness} protection`
    );
  }

  canApply(context: GameContext, command: Command): boolean {
    if (command.type !== COMMAND_TYPES.ATTACK && command.type !== COMMAND_TYPES.CHECK_ARMOR)
      return false;

    const target = context.getTemporary('target') as CharacterData | MonsterData;
    return target !== null;
  }

  /**
   * Map armor class to armor category
   */
  private readonly AC_TO_ARMOR_CATEGORY: Record<number, ArmorCategory> = {
    10: 'Unarmored',
    9: 'Padded/Leather',
    8: 'Padded/Leather',
    7: 'StuddedLeather/Ring',
    6: 'StuddedLeather/Ring',
    5: 'Scale/Chain',
    4: 'Scale/Chain',
    3: 'Banded/Splint',
    2: 'Plate',
    1: 'Plate',
    0: 'Plate',
  };

  /**
   * Get armor category from AC
   */
  private getArmorCategory(targetAC: number): ArmorCategory {
    const boundedAC = Math.min(Math.max(targetAC, 0), 10);
    return this.AC_TO_ARMOR_CATEGORY[boundedAC] || 'Unarmored';
  }

  /**
   * Get armor effectiveness description
   */
  private getArmorEffectiveness(targetAC: number): string {
    if (targetAC >= 8) return 'light';
    if (targetAC >= 5) return 'medium';
    if (targetAC >= 2) return 'heavy';
    return 'full plate';
  }
}

// Utility functions for direct use (exported for tests)

/**
 * Get weapon vs armor adjustment (for test compatibility)
 */
export function getWeaponVsArmorAdjustment(weapon: Weapon, targetAC: number): number {
  const rule = new WeaponVsArmorRule();
  return rule.getWeaponVsArmorAdjustment(weapon, targetAC);
}

/**
 * Apply weapon vs armor adjustment (for test compatibility)
 */
export function applyWeaponVsArmorAdjustment(
  target: CharacterData | MonsterData,
  weapon: Weapon | undefined,
  _baseAttackRoll = 10
): number {
  if (!weapon) {
    return 0;
  }

  const rule = new WeaponVsArmorRule();
  return rule.getWeaponVsArmorAdjustment(weapon, target.armorClass);
}

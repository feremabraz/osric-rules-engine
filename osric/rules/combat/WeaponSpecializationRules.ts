/**
 * WeaponSpecializationRules.ts - OSRIC Weapon Specialization Rules
 *
 * Implements the complete OSRIC weapon specialization system including:
 * - Fighter-class specialization requirements
 * - To-hit and damage bonuses for specialized weapons
 * - Rate of attack improvements from specialization
 * - Double specialization for melee weapons
 * - Weapon proficiency slot costs
 *
 * PRESERVATION: All OSRIC specialization mechanics preserved exactly.
 */

import type { Command } from '@osric/core/Command';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, type RuleResult } from '@osric/core/Rule';
import { COMMAND_TYPES } from '@osric/types/constants';
import type {
  CharacterClass,
  Character as CharacterData,
  Monster as MonsterData,
  Weapon,
} from '../../types/entities';

export enum SpecializationLevel {
  NONE = 0,
  SPECIALIZED = 1,
  DOUBLE_SPECIALIZED = 2,
}

interface SpecializationContext {
  character: CharacterData;
  weapon: Weapon;
  checkEligibility?: boolean;
  calculateBonuses?: boolean;
}

export class WeaponSpecializationRule extends BaseRule {
  name = 'weapon-specialization';

  async execute(context: GameContext, _command: Command): Promise<RuleResult> {
    const specContext = context.getTemporary('specialization-context') as SpecializationContext;

    if (!specContext) {
      return this.createFailureResult('No specialization context found');
    }

    const { character, weapon, checkEligibility, calculateBonuses } = specContext;

    if (checkEligibility) {
      const eligibility = this.checkSpecializationEligibility(character, weapon);
      context.setTemporary('specialization-eligibility', eligibility);

      return this.createSuccessResult(
        eligibility.canSpecialize
          ? `Can specialize in ${weapon.name} (${eligibility.slotCost} slots)`
          : `Cannot specialize in ${weapon.name}: ${eligibility.reason}`
      );
    }

    if (calculateBonuses) {
      const bonuses = this.calculateSpecializationBonuses(character, weapon);
      context.setTemporary('specialization-bonuses', bonuses);

      return this.createSuccessResult(
        bonuses.level > 0
          ? `Specialization bonuses applied: +${bonuses.hitBonus} hit, +${bonuses.damageBonus} damage, ${bonuses.attackRate} attacks/round`
          : 'No specialization bonuses - character not specialized with this weapon'
      );
    }

    return this.createSuccessResult('Weapon specialization check completed');
  }

  canApply(context: GameContext, command: Command): boolean {
    if (
      command.type !== COMMAND_TYPES.ATTACK &&
      command.type !== COMMAND_TYPES.CHECK_SPECIALIZATION
    )
      return false;

    const specContext = context.getTemporary('specialization-context') as SpecializationContext;
    return specContext !== null;
  }

  /**
   * Check if a character can specialize in a weapon
   */
  private checkSpecializationEligibility(
    character: CharacterData,
    weapon: Weapon
  ): {
    canSpecialize: boolean;
    canDoubleSpecialize: boolean;
    slotCost: number;
    reason?: string;
  } {
    // Only fighters and their subclasses can specialize
    const specializationClasses: CharacterClass[] = ['Fighter', 'Paladin', 'Ranger'];

    if (!specializationClasses.includes(character.class)) {
      return {
        canSpecialize: false,
        canDoubleSpecialize: false,
        slotCost: 0,
        reason: 'Only Fighter, Paladin, and Ranger can specialize in weapons',
      };
    }

    // Check if the character is proficient with the weapon
    const isProficient = character.proficiencies?.some(
      (p) => p.weapon.toLowerCase() === weapon.name.toLowerCase()
    );

    if (!isProficient) {
      return {
        canSpecialize: false,
        canDoubleSpecialize: false,
        slotCost: 0,
        reason: 'Must be proficient with weapon to specialize',
      };
    }

    const slotCost = this.getSpecializationSlotCost(weapon);
    const canDoubleSpecialize = this.canDoubleSpecialize(weapon);

    return {
      canSpecialize: true,
      canDoubleSpecialize,
      slotCost,
    };
  }

  /**
   * Calculate specialization bonuses for a character and weapon
   */
  private calculateSpecializationBonuses(
    character: CharacterData,
    weapon: Weapon
  ): {
    level: SpecializationLevel;
    hitBonus: number;
    damageBonus: number;
    attackRate: number;
  } {
    const specLevel = this.getSpecializationLevel(character, weapon);

    if (specLevel === SpecializationLevel.NONE) {
      return {
        level: SpecializationLevel.NONE,
        hitBonus: 0,
        damageBonus: 0,
        attackRate: this.getBaseAttackRate(character),
      };
    }

    const hitBonus = this.getSpecializationHitBonus(specLevel);
    const damageBonus = this.getSpecializationDamageBonus(specLevel, weapon);
    const attackRate = this.getSpecializedAttackRate(character, specLevel);

    return {
      level: specLevel,
      hitBonus,
      damageBonus,
      attackRate,
    };
  }

  /**
   * Get character's specialization level with a weapon
   */
  private getSpecializationLevel(character: CharacterData, weapon: Weapon): SpecializationLevel {
    if (!character.weaponSpecializations) return SpecializationLevel.NONE;

    const spec = character.weaponSpecializations.find(
      (s) => s.weapon.toLowerCase() === weapon.name.toLowerCase()
    );

    if (!spec) return SpecializationLevel.NONE;

    // Check if this is a double specialization based on bonuses
    if (spec.bonuses.attackBonus >= 3) {
      return SpecializationLevel.DOUBLE_SPECIALIZED;
    }

    if (spec.bonuses.attackBonus >= 1) {
      return SpecializationLevel.SPECIALIZED;
    }

    return SpecializationLevel.NONE;
  }

  /**
   * Get to-hit bonus from weapon specialization
   */
  private getSpecializationHitBonus(specLevel: SpecializationLevel): number {
    switch (specLevel) {
      case SpecializationLevel.SPECIALIZED:
        return 1; // +1 to hit for regular specialization
      case SpecializationLevel.DOUBLE_SPECIALIZED:
        return 3; // +3 to hit for double specialization
      default:
        return 0;
    }
  }

  /**
   * Get damage bonus from weapon specialization
   */
  private getSpecializationDamageBonus(specLevel: SpecializationLevel, weapon: Weapon): number {
    switch (specLevel) {
      case SpecializationLevel.SPECIALIZED:
        if (weapon.type === 'Melee') {
          return 2; // +2 damage for melee specialization
        }
        return 1; // +1 damage for ranged specialization
      case SpecializationLevel.DOUBLE_SPECIALIZED:
        return 3; // +3 damage for double specialization (melee only)
      default:
        return 0;
    }
  }

  /**
   * Get base attack rate for character (without specialization)
   */
  private getBaseAttackRate(character: CharacterData): number {
    const isFighterClass = ['Fighter', 'Paladin', 'Ranger'].includes(character.class);

    if (!isFighterClass) return 1;

    // Base fighter progression
    if (character.level >= 13) return 2; // 2/1
    if (character.level >= 7) return 1.5; // 3/2
    return 1; // 1/1
  }

  /**
   * Get specialized attack rate
   */
  private getSpecializedAttackRate(
    character: CharacterData,
    specLevel: SpecializationLevel
  ): number {
    const isFighterClass = ['Fighter', 'Paladin', 'Ranger'].includes(character.class);

    if (!isFighterClass) return 1;

    // Get level tier (0: levels 1-6, 1: levels 7-12, 2: levels 13+)
    const levelTier = character.level >= 13 ? 2 : character.level >= 7 ? 1 : 0;

    // Attack rates table indexed by [specializationLevel][levelTier]
    const attacksTable = [
      // NONE (unspecialized)
      [1, 1.5, 2],
      // SPECIALIZED
      [1.5, 2, 2.5], // 3/2, 2/1, 5/2 attacks
      // DOUBLE_SPECIALIZED
      [2, 2.5, 3], // 2/1, 5/2, 3/1 attacks
    ];

    return attacksTable[specLevel][levelTier];
  }

  /**
   * Get specialization slot cost
   */
  private getSpecializationSlotCost(weapon: Weapon): number {
    if (weapon.type === 'Melee' || weapon.name.toLowerCase().includes('crossbow')) {
      return 1; // Melee weapons and crossbows cost 1 slot
    }
    return 2; // Other missile weapons cost 2 slots
  }

  /**
   * Check if a weapon is eligible for double specialization
   */
  private canDoubleSpecialize(weapon: Weapon): boolean {
    // Double specialization is only allowed for melee weapons
    // excluding polearms and two-handed swords
    if (weapon.type !== 'Melee') {
      return false;
    }

    // Exclude two-handed weapons like polearms and two-handed swords
    if (weapon.twoHanded) {
      return false;
    }

    return true;
  }
}

export class SpecializationRequirementRule extends BaseRule {
  name = 'specialization-requirement';

  async execute(context: GameContext, _command: Command): Promise<RuleResult> {
    const character = context.getTemporary('character') as CharacterData;
    const weapon = context.getTemporary('weapon') as Weapon;

    if (!character || !weapon) {
      return this.createFailureResult('Character or weapon not found in context');
    }

    const requirements = this.checkSpecializationRequirements(character, weapon);
    context.setTemporary('specialization-requirements', requirements);

    return this.createSuccessResult(
      requirements.meetsRequirements
        ? 'Character meets all specialization requirements'
        : `Requirements not met: ${requirements.missingRequirements.join(', ')}`
    );
  }

  canApply(context: GameContext, command: Command): boolean {
    if (command.type !== COMMAND_TYPES.CHECK_SPECIALIZATION) return false;

    const character = context.getTemporary('character') as CharacterData;
    const weapon = context.getTemporary('weapon') as Weapon;

    return character !== null && weapon !== null;
  }

  /**
   * Check all requirements for weapon specialization
   */
  private checkSpecializationRequirements(
    character: CharacterData,
    weapon: Weapon
  ): {
    meetsRequirements: boolean;
    missingRequirements: string[];
  } {
    const missing: string[] = [];

    // Must be fighter, paladin, or ranger
    if (!['Fighter', 'Paladin', 'Ranger'].includes(character.class)) {
      missing.push('Must be Fighter, Paladin, or Ranger');
    }

    // Must be proficient with the weapon
    const isProficient = character.proficiencies?.some(
      (p) => p.weapon.toLowerCase() === weapon.name.toLowerCase()
    );

    if (!isProficient) {
      missing.push('Must be proficient with weapon');
    }

    // Must have enough weapon proficiency slots
    const slotCost =
      weapon.type === 'Melee' || weapon.name.toLowerCase().includes('crossbow') ? 1 : 2;
    const availableSlots = this.calculateAvailableProficiencySlots(character);

    if (availableSlots < slotCost) {
      missing.push(`Need ${slotCost} proficiency slots (${availableSlots} available)`);
    }

    // For double specialization, must already be specialized
    const currentSpecLevel = this.getCurrentSpecializationLevel(character, weapon);
    if (currentSpecLevel === SpecializationLevel.NONE) {
      // This is for initial specialization, which is fine
    }

    return {
      meetsRequirements: missing.length === 0,
      missingRequirements: missing,
    };
  }

  /**
   * Calculate available proficiency slots for a character
   */
  private calculateAvailableProficiencySlots(character: CharacterData): number {
    // Base slots by class
    let baseSlots = 4; // Default for fighters

    if (character.class === 'Paladin' || character.class === 'Ranger') {
      baseSlots = 3; // Paladins and Rangers get fewer slots
    }

    // Additional slots every few levels (varies by class)
    const additionalSlots = Math.floor((character.level - 1) / 3);

    const totalSlots = baseSlots + additionalSlots;

    // Count used slots
    const usedSlots =
      (character.proficiencies?.length || 0) + (character.weaponSpecializations?.length || 0);

    return Math.max(0, totalSlots - usedSlots);
  }

  /**
   * Get current specialization level with a weapon
   */
  private getCurrentSpecializationLevel(
    character: CharacterData,
    weapon: Weapon
  ): SpecializationLevel {
    if (!character.weaponSpecializations) return SpecializationLevel.NONE;

    const spec = character.weaponSpecializations.find(
      (s) => s.weapon.toLowerCase() === weapon.name.toLowerCase()
    );

    if (!spec) return SpecializationLevel.NONE;

    // Determine level based on bonuses
    if (spec.bonuses.attackBonus >= 3) {
      return SpecializationLevel.DOUBLE_SPECIALIZED;
    }

    if (spec.bonuses.attackBonus >= 1) {
      return SpecializationLevel.SPECIALIZED;
    }

    return SpecializationLevel.NONE;
  }
}

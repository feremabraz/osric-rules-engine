import type { Command } from '@osric/core/Command';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, type RuleResult } from '@osric/core/Rule';
import { COMMAND_TYPES } from '@osric/types/constants';
import type {
  CharacterClass,
  Character as CharacterData,
  Monster as MonsterData,
  Weapon,
} from '@osric/types/entities';

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

  private checkSpecializationEligibility(
    character: CharacterData,
    weapon: Weapon
  ): {
    canSpecialize: boolean;
    canDoubleSpecialize: boolean;
    slotCost: number;
    reason?: string;
  } {
    const specializationClasses: CharacterClass[] = ['Fighter', 'Paladin', 'Ranger'];

    if (!specializationClasses.includes(character.class)) {
      return {
        canSpecialize: false,
        canDoubleSpecialize: false,
        slotCost: 0,
        reason: 'Only Fighter, Paladin, and Ranger can specialize in weapons',
      };
    }

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

  private getSpecializationLevel(character: CharacterData, weapon: Weapon): SpecializationLevel {
    if (!character.weaponSpecializations) return SpecializationLevel.NONE;

    const spec = character.weaponSpecializations.find(
      (s) => s.weapon.toLowerCase() === weapon.name.toLowerCase()
    );

    if (!spec) return SpecializationLevel.NONE;

    if (spec.bonuses.attackBonus >= 3) {
      return SpecializationLevel.DOUBLE_SPECIALIZED;
    }

    if (spec.bonuses.attackBonus >= 1) {
      return SpecializationLevel.SPECIALIZED;
    }

    return SpecializationLevel.NONE;
  }

  private getSpecializationHitBonus(specLevel: SpecializationLevel): number {
    switch (specLevel) {
      case SpecializationLevel.SPECIALIZED:
        return 1;
      case SpecializationLevel.DOUBLE_SPECIALIZED:
        return 3;
      default:
        return 0;
    }
  }

  private getSpecializationDamageBonus(specLevel: SpecializationLevel, weapon: Weapon): number {
    switch (specLevel) {
      case SpecializationLevel.SPECIALIZED:
        if (weapon.type === 'Melee') {
          return 2;
        }
        return 1;
      case SpecializationLevel.DOUBLE_SPECIALIZED:
        return 3;
      default:
        return 0;
    }
  }

  private getBaseAttackRate(character: CharacterData): number {
    const isFighterClass = ['Fighter', 'Paladin', 'Ranger'].includes(character.class);

    if (!isFighterClass) return 1;

    if (character.level >= 13) return 2;
    if (character.level >= 7) return 1.5;
    return 1;
  }

  private getSpecializedAttackRate(
    character: CharacterData,
    specLevel: SpecializationLevel
  ): number {
    const isFighterClass = ['Fighter', 'Paladin', 'Ranger'].includes(character.class);

    if (!isFighterClass) return 1;

    const levelTier = character.level >= 13 ? 2 : character.level >= 7 ? 1 : 0;

    const attacksTable = [
      [1, 1.5, 2],

      [1.5, 2, 2.5],

      [2, 2.5, 3],
    ];

    return attacksTable[specLevel][levelTier];
  }

  private getSpecializationSlotCost(weapon: Weapon): number {
    if (weapon.type === 'Melee' || weapon.name.toLowerCase().includes('crossbow')) {
      return 1;
    }
    return 2;
  }

  private canDoubleSpecialize(weapon: Weapon): boolean {
    if (weapon.type !== 'Melee') {
      return false;
    }

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

  private checkSpecializationRequirements(
    character: CharacterData,
    weapon: Weapon
  ): {
    meetsRequirements: boolean;
    missingRequirements: string[];
  } {
    const missing: string[] = [];

    if (!['Fighter', 'Paladin', 'Ranger'].includes(character.class)) {
      missing.push('Must be Fighter, Paladin, or Ranger');
    }

    const isProficient = character.proficiencies?.some(
      (p) => p.weapon.toLowerCase() === weapon.name.toLowerCase()
    );

    if (!isProficient) {
      missing.push('Must be proficient with weapon');
    }

    const slotCost =
      weapon.type === 'Melee' || weapon.name.toLowerCase().includes('crossbow') ? 1 : 2;
    const availableSlots = this.calculateAvailableProficiencySlots(character);

    if (availableSlots < slotCost) {
      missing.push(`Need ${slotCost} proficiency slots (${availableSlots} available)`);
    }

    const currentSpecLevel = this.getCurrentSpecializationLevel(character, weapon);
    if (currentSpecLevel === SpecializationLevel.NONE) {
    }

    return {
      meetsRequirements: missing.length === 0,
      missingRequirements: missing,
    };
  }

  private calculateAvailableProficiencySlots(character: CharacterData): number {
    let baseSlots = 4;

    if (character.class === 'Paladin' || character.class === 'Ranger') {
      baseSlots = 3;
    }

    const additionalSlots = Math.floor((character.level - 1) / 3);

    const totalSlots = baseSlots + additionalSlots;

    const usedSlots =
      (character.proficiencies?.length || 0) + (character.weaponSpecializations?.length || 0);

    return Math.max(0, totalSlots - usedSlots);
  }

  private getCurrentSpecializationLevel(
    character: CharacterData,
    weapon: Weapon
  ): SpecializationLevel {
    if (!character.weaponSpecializations) return SpecializationLevel.NONE;

    const spec = character.weaponSpecializations.find(
      (s) => s.weapon.toLowerCase() === weapon.name.toLowerCase()
    );

    if (!spec) return SpecializationLevel.NONE;

    if (spec.bonuses.attackBonus >= 3) {
      return SpecializationLevel.DOUBLE_SPECIALIZED;
    }

    if (spec.bonuses.attackBonus >= 1) {
      return SpecializationLevel.SPECIALIZED;
    }

    return SpecializationLevel.NONE;
  }
}

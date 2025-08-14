import type { Command } from '@osric/core/Command';
import { ContextKeys } from '@osric/core/ContextKeys';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, type RuleResult } from '@osric/core/Rule';
import type { Character as CharacterData } from '@osric/types/character';
import { RULE_NAMES } from '@osric/types/constants';
import { COMMAND_TYPES } from '@osric/types/constants';
import type { Weapon } from '@osric/types/item';
import { SpecializationLevel } from './WeaponSpecializationRules';

export class SpecializationRequirementRules extends BaseRule {
  name = RULE_NAMES.WEAPON_SPECIALIZATION;

  async execute(context: GameContext, _command: Command): Promise<RuleResult> {
    const character = context.getTemporary(ContextKeys.CHARACTER_CREATION_DATA) as CharacterData;
    const weapon = context.getTemporary(ContextKeys.COMBAT_ATTACK_WEAPON) as Weapon;

    if (!character || !weapon) {
      return this.createFailureResult('Character or weapon not found in context');
    }

    const requirements = this.checkSpecializationRequirements(character, weapon);
    context.setTemporary(ContextKeys.COMBAT_SPECIALIZATION_REQUIREMENTS, requirements);

    return this.createSuccessResult(
      requirements.meetsRequirements
        ? 'Character meets all specialization requirements'
        : `Requirements not met: ${requirements.missingRequirements.join(', ')}`
    );
  }

  canApply(context: GameContext, command: Command): boolean {
    if (command.type !== COMMAND_TYPES.CHECK_SPECIALIZATION) return false;

    const character = context.getTemporary(ContextKeys.CHARACTER_CREATION_DATA) as CharacterData;
    const weapon = context.getTemporary(ContextKeys.COMBAT_ATTACK_WEAPON) as Weapon;

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

  private getCurrentSpecializationLevel(character: CharacterData, weapon: Weapon) {
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

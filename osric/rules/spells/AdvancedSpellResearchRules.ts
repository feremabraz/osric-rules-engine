import type { Character } from '@osric/types/character';
import { RULE_NAMES } from '@osric/types/constants';
import type { Item } from '@osric/types/item';
import { ContextKeys } from '../../core/ContextKeys';
import { DiceEngine } from '../../core/Dice';
import type { GameContext } from '../../core/GameContext';
import { BaseRule, type RuleResult } from '../../core/Rule';

export class AdvancedSpellResearchRules extends BaseRule {
  name = RULE_NAMES.ADVANCED_SPELL_RESEARCH;
  description = 'Handle complex spell research requirements';

  canApply(context: GameContext): boolean {
    const researchProject = context.getTemporary(ContextKeys.SPELL_ADV_RESEARCH_PROJECT);
    return researchProject !== null;
  }

  async execute(context: GameContext): Promise<RuleResult> {
    const researchProject = context.getTemporary<{
      researcher: Character;
      spellName: string;
      spellLevel: number;
      complexity: 'simple' | 'moderate' | 'complex' | 'legendary';
      specialRequirements: string[];
      researchType: 'modify' | 'create' | 'reverse';
    }>(ContextKeys.SPELL_ADV_RESEARCH_PROJECT);

    if (!researchProject) {
      return this.createFailureResult('No advanced research project found');
    }

    const { researcher, spellName, spellLevel, complexity, specialRequirements, researchType } =
      researchProject;

    let baseTime = spellLevel * 4;
    let baseCost = spellLevel * spellLevel * 500;
    let baseSuccessChance = 60;

    switch (complexity) {
      case 'simple':
        baseTime *= 1;
        baseCost *= 1;
        baseSuccessChance += 20;
        break;
      case 'moderate':
        baseTime *= 1.5;
        baseCost *= 1.5;
        baseSuccessChance += 0;
        break;
      case 'complex':
        baseTime *= 2;
        baseCost *= 2;
        baseSuccessChance -= 20;
        break;
      case 'legendary':
        baseTime *= 3;
        baseCost *= 4;
        baseSuccessChance -= 40;
        break;
    }

    switch (researchType) {
      case 'modify':
        baseTime *= 0.75;
        baseCost *= 0.75;
        baseSuccessChance += 10;
        break;
      case 'create':
        break;
      case 'reverse':
        baseTime *= 1.5;
        baseCost *= 1.25;
        baseSuccessChance -= 15;
        break;
    }

    const unmetRequirements: string[] = [];
    for (const requirement of specialRequirements) {
      if (!this.checkSpecialRequirement(researcher, requirement)) {
        unmetRequirements.push(requirement);
      }
    }

    if (unmetRequirements.length > 0) {
      return this.createFailureResult(
        `Cannot begin advanced research - unmet requirements: ${unmetRequirements.join(', ')}`
      );
    }

    const intelligenceBonus = Math.floor((researcher.abilities.intelligence - 15) / 2);
    const levelBonus = Math.floor((researcher.level || 1) / 3);

    const finalSuccessChance = Math.max(
      5,
      Math.min(95, baseSuccessChance + intelligenceBonus * 5 + levelBonus * 2)
    );

    const finalTime = Math.ceil(baseTime);
    const finalCost = Math.ceil(baseCost);

    const message =
      `Advanced spell research for "${spellName}" (${complexity} ${researchType}): ` +
      `${finalTime} weeks, ${finalCost} gp, ${finalSuccessChance}% success chance`;

    return this.createSuccessResult(message, {
      spellName,
      spellLevel,
      complexity,
      researchType,
      timeRequired: finalTime,
      goldRequired: finalCost,
      successChance: finalSuccessChance,
      specialRequirements,
    });
  }

  private checkSpecialRequirement(researcher: Character, requirement: string): boolean {
    switch (requirement.toLowerCase()) {
      case 'ancient tome':
        return researcher.inventory.some(
          (item: Item) =>
            item.name.toLowerCase().includes('ancient') && item.name.toLowerCase().includes('tome')
        );

      case 'rare components':
        return researcher.currency.gold >= 1000;

      case 'laboratory':
        return false;

      case 'assistant spellcaster':
        return true;

      case 'divine blessing':
        return researcher.class === 'Cleric' && researcher.level >= 9;

      case 'planar knowledge':
        return false;

      default:
        return false;
    }
  }
}

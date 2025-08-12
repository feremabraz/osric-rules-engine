import type { Character } from '@osric/types/character';
import { RULE_NAMES } from '@osric/types/constants';
import type { Item } from '@osric/types/item';
import type { Spell } from '@osric/types/spell';
import type {
  IdentificationResult,
  MagicScroll,
  MaterialComponent,
  SpellWithComponents,
} from '@osric/types/spell-types';
import { ContextKeys } from '../../core/ContextKeys';
import { DiceEngine } from '../../core/Dice';
import type { GameContext } from '../../core/GameContext';
import { BaseRule, type RuleResult } from '../../core/Rule';

export class SpellComponentManagementRule extends BaseRule {
  name = 'spell-component-management';
  description = 'Manage detailed spell components and their availability';

  canApply(context: GameContext): boolean {
    const caster = context.getTemporary(ContextKeys.SPELL_CASTER);
    const spell = context.getTemporary(ContextKeys.SPELL_TO_CAST);
    return caster !== null && spell !== null;
  }

  async execute(context: GameContext): Promise<RuleResult> {
    const caster = context.getTemporary<Character>(ContextKeys.SPELL_CASTER);
    const spell = context.getTemporary<SpellWithComponents>(ContextKeys.SPELL_TO_CAST);

    if (!caster || !spell) {
      return this.createFailureResult('Missing caster or spell information');
    }

    const missingComponents: string[] = [];
    const consumedComponents: MaterialComponent[] = [];

    if (spell.componentRequirements.includes('V')) {
      if (caster.statusEffects?.some((effect) => effect.name.toLowerCase().includes('silence'))) {
        missingComponents.push('Verbal (silenced)');
      }
    }

    if (spell.componentRequirements.includes('S')) {
      const hasHandsFree = true;

      if (!hasHandsFree) {
        missingComponents.push('Somatic (hands occupied)');
      }

      if (
        caster.statusEffects?.some(
          (effect) =>
            effect.name.toLowerCase().includes('paralyz') ||
            effect.name.toLowerCase().includes('bound')
        )
      ) {
        missingComponents.push('Somatic (cannot move hands)');
      }
    }

    if (spell.componentRequirements.includes('M')) {
      for (const component of spell.detailedMaterialComponents) {
        const hasComponent = caster.inventory.some((item: Item) =>
          item.name.toLowerCase().includes(component.name.toLowerCase())
        );

        if (!hasComponent) {
          const hasSpellPouch = caster.inventory.some(
            (item: Item) =>
              item.name.toLowerCase().includes('spell component pouch') ||
              item.name.toLowerCase().includes('component pouch')
          );

          if (!hasSpellPouch || (component.cost && component.cost > 1)) {
            missingComponents.push(`Material: ${component.name}`);
          }
        } else if (component.consumed) {
          consumedComponents.push(component);
        }
      }
    }

    if (missingComponents.length > 0) {
      return this.createFailureResult(
        `Cannot cast "${spell.name}" - missing components: ${missingComponents.join(', ')}`
      );
    }

    if (consumedComponents.length > 0) {
      for (const component of consumedComponents) {
        const itemIndex = caster.inventory.findIndex((item: Item) =>
          item.name.toLowerCase().includes(component.name.toLowerCase())
        );

        if (itemIndex >= 0) {
          caster.inventory.splice(itemIndex, 1);
        }
      }

      context.setEntity(caster.id, caster);
    }

    const message = `${caster.name} has all required components for "${spell.name}". ${
      consumedComponents.length > 0
        ? `Consumed: ${consumedComponents.map((c) => c.name).join(', ')}`
        : 'No components consumed'
    }`;

    return this.createSuccessResult(message, {
      spellName: spell.name,
      componentsChecked: spell.componentRequirements,
      consumedComponents: consumedComponents.map((c) => c.name),
    });
  }
}

export class SpellFailureRule extends BaseRule {
  name = 'spell-failure';
  description = 'Handle spell failure and backfire effects';

  canApply(context: GameContext): boolean {
    const spellAttempt = context.getTemporary(ContextKeys.SPELL_ATTEMPT);
    return spellAttempt !== null;
  }

  async execute(context: GameContext): Promise<RuleResult> {
    const spellAttempt = context.getTemporary<{
      caster: Character;
      spell: Spell;
      failureRoll: number;
      failureChance: number;
      backfireChance?: number;
    }>(ContextKeys.SPELL_ATTEMPT);

    if (!spellAttempt) {
      return this.createFailureResult('No spell attempt information found');
    }

    const { caster, spell, failureRoll, failureChance, backfireChance = 0 } = spellAttempt;

    const spellFailed = failureRoll > 100 - failureChance;

    if (!spellFailed) {
      return this.createSuccessResult(`${caster.name} successfully casts "${spell.name}"`);
    }

    const backfireRoll = DiceEngine.roll('1d100');
    const backfireFailed = backfireRoll.total <= backfireChance;

    if (backfireFailed) {
      const backfireEffect = this.determineBackfireEffect(spell.level);

      this.applyBackfireEffect(caster, backfireEffect, context);

      const message =
        `SPELL FAILURE with BACKFIRE! ${caster.name} fails to cast "${spell.name}" ` +
        `(rolled ${failureRoll} vs ${100 - failureChance}% failure chance). ` +
        `Backfire effect: ${backfireEffect.description}`;

      return this.createFailureResult(message, {
        spellName: spell.name,
        failureRoll,
        failureChance,
        backfire: true,
        backfireEffect: backfireEffect.description,
        backfireRoll: backfireRoll.total,
      });
    }

    const message =
      `SPELL FAILURE! ${caster.name} fails to cast "${spell.name}" ` +
      `(rolled ${failureRoll} vs ${100 - failureChance}% failure chance). No backfire effect.`;

    return this.createFailureResult(message, {
      spellName: spell.name,
      failureRoll,
      failureChance,
      backfire: false,
    });
  }

  private determineBackfireEffect(spellLevel: number): { description: string; effect: string } {
    const roll = DiceEngine.roll('1d20');
    const adjustedRoll = roll.total + spellLevel;

    if (adjustedRoll <= 5) {
      return {
        description: 'Minor magical discharge - 1 point of damage',
        effect: 'damage_1',
      };
    }
    if (adjustedRoll <= 10) {
      return {
        description: 'Magical feedback - lose 1 additional spell slot of same level',
        effect: 'lose_spell_slot',
      };
    }
    if (adjustedRoll <= 15) {
      return {
        description: 'Wild magic surge - random spell effect in 3m radius',
        effect: 'wild_surge',
      };
    }
    if (adjustedRoll <= 20) {
      return {
        description: 'Temporal disruption - lose next turn',
        effect: 'lose_turn',
      };
    }
    return {
      description: 'Severe backlash - take damage equal to spell level',
      effect: 'damage_spell_level',
    };
  }

  private applyBackfireEffect(
    caster: Character,
    effect: { description: string; effect: string },
    context: GameContext
  ): void {
    switch (effect.effect) {
      case 'damage_1':
        if (caster.hitPoints) {
          caster.hitPoints.current = Math.max(0, caster.hitPoints.current - 1);
        }
        break;
      case 'damage_spell_level':
        if (caster.hitPoints) {
          const damage = Number.parseInt(effect.effect.split('_')[2]) || 1;
          caster.hitPoints.current = Math.max(0, caster.hitPoints.current - damage);
        }
        break;
      case 'lose_spell_slot':
        break;
      case 'lose_turn': {
        const stunnedEffect = {
          name: 'Stunned',
          duration: 1,
          description: 'Lost next turn due to magical backlash',
          effect: 'stunned',
          savingThrow: null,
          endCondition: 'time',
        };
        caster.statusEffects.push(stunnedEffect);
        break;
      }
      case 'wild_surge':
        context.setTemporary(ContextKeys.SPELL_WILD_MAGIC_SURGE, { caster: caster.id, radius: 10 });
        break;
    }

    context.setEntity(caster.id, caster);
  }
}

export class SpellConcentrationRule extends BaseRule {
  name = RULE_NAMES.SPELL_INTERRUPTION;
  description = 'Manage spell concentration and duration';

  canApply(context: GameContext): boolean {
    const concentrationCheck = context.getTemporary(ContextKeys.SPELL_CONCENTRATION_CHECK);
    return concentrationCheck !== null;
  }

  async execute(context: GameContext): Promise<RuleResult> {
    const concentrationCheck = context.getTemporary<{
      caster: Character;
      spell: Spell;
      distraction: 'damage' | 'spell' | 'environmental' | 'movement';
      distractionSeverity: number;
    }>(ContextKeys.SPELL_CONCENTRATION_CHECK);

    if (!concentrationCheck) {
      return this.createFailureResult('No concentration check information found');
    }

    const { caster, spell, distraction, distractionSeverity } = concentrationCheck;

    let baseDC = 10;
    switch (distraction) {
      case 'damage':
        baseDC = Math.max(10, distractionSeverity);
        break;
      case 'spell':
        baseDC = 10 + spell.level;
        break;
      case 'environmental':
        baseDC = 10 + distractionSeverity;
        break;
      case 'movement':
        baseDC = 10 + Math.floor(distractionSeverity / 2);
        break;
    }

    const constitutionModifier = Math.floor((caster.abilities.constitution - 10) / 2);

    const proficiencyBonus = caster.level ? Math.ceil(caster.level / 4) + 1 : 2;
    const hasConcentrationProficiency = false;

    const concentrationRoll = DiceEngine.roll('1d20');
    const totalRoll =
      concentrationRoll.total +
      constitutionModifier +
      (hasConcentrationProficiency ? proficiencyBonus : 0);

    const concentrationMaintained = totalRoll >= baseDC;

    if (concentrationMaintained) {
      const message =
        `${caster.name} maintains concentration on "${spell.name}" ` +
        `(rolled ${concentrationRoll.total} + ${constitutionModifier} ${hasConcentrationProficiency ? `+ ${proficiencyBonus}` : ''} = ${totalRoll} vs DC ${baseDC})`;

      return this.createSuccessResult(message, {
        spellName: spell.name,
        distraction,
        dc: baseDC,
        roll: concentrationRoll.total,
        total: totalRoll,
        maintained: true,
      });
    }

    const message =
      `${caster.name} loses concentration on "${spell.name}" ` +
      `(rolled ${concentrationRoll.total} + ${constitutionModifier} ${hasConcentrationProficiency ? `+ ${proficiencyBonus}` : ''} = ${totalRoll} vs DC ${baseDC}). Spell effect ends.`;

    context.setTemporary(ContextKeys.SPELL_ENDED, { caster: caster.id, spell: spell.name });

    return this.createFailureResult(message, {
      spellName: spell.name,
      distraction,
      dc: baseDC,
      roll: concentrationRoll.total,
      total: totalRoll,
      maintained: false,
    });
  }
}

export class SpellInteractionRule extends BaseRule {
  name = 'spell-interaction';
  description = 'Handle spell interactions and counterspells';

  canApply(context: GameContext): boolean {
    const spellInteraction = context.getTemporary(ContextKeys.SPELL_INTERACTION);
    return spellInteraction !== null;
  }

  async execute(context: GameContext): Promise<RuleResult> {
    const spellInteraction = context.getTemporary<{
      type: 'counterspell' | 'dispel' | 'interaction';
      targetSpell: Spell;
      interactingSpell: Spell;
      caster: Character;
      target?: Character;
    }>(ContextKeys.SPELL_INTERACTION);

    if (!spellInteraction) {
      return this.createFailureResult('No spell interaction information found');
    }

    const { type, targetSpell, interactingSpell, caster, target } = spellInteraction;

    switch (type) {
      case 'counterspell':
        return this.handleCounterspell(targetSpell, interactingSpell, caster);

      case 'dispel':
        return this.handleDispelMagic(targetSpell, interactingSpell, caster, target);

      case 'interaction':
        return this.handleSpellInteraction(targetSpell, interactingSpell, caster);

      default:
        return this.createFailureResult('Unknown spell interaction type');
    }
  }

  private async handleCounterspell(
    targetSpell: Spell,
    counterspell: Spell,
    caster: Character
  ): Promise<RuleResult> {
    if (counterspell.level < targetSpell.level) {
      return this.createFailureResult(
        `Counterspell level ${counterspell.level} cannot counter level ${targetSpell.level} spell`
      );
    }

    if (counterspell.level >= targetSpell.level) {
      const message = `${caster.name} successfully counters "${targetSpell.name}" with "${counterspell.name}"`;

      return this.createSuccessResult(message, {
        targetSpell: targetSpell.name,
        counterspell: counterspell.name,
        automatic: true,
      });
    }

    return this.createFailureResult('Counterspell failed');
  }

  private async handleDispelMagic(
    targetSpell: Spell,
    dispelSpell: Spell,
    caster: Character,
    _target?: Character
  ): Promise<RuleResult> {
    const casterLevel = caster.level || 1;
    const dispelDC = 11 + targetSpell.level;

    const dispelRoll = DiceEngine.roll('1d20');
    const totalRoll = dispelRoll.total + casterLevel;

    const dispelSuccess = totalRoll >= dispelDC;

    if (dispelSuccess) {
      const message =
        `${caster.name} successfully dispels "${targetSpell.name}" ` +
        `(rolled ${dispelRoll.total} + ${casterLevel} = ${totalRoll} vs DC ${dispelDC})`;

      return this.createSuccessResult(message, {
        targetSpell: targetSpell.name,
        dispelSpell: dispelSpell.name,
        roll: dispelRoll.total,
        casterLevel,
        total: totalRoll,
        dc: dispelDC,
      });
    }

    const message =
      `${caster.name} fails to dispel "${targetSpell.name}" ` +
      `(rolled ${dispelRoll.total} + ${casterLevel} = ${totalRoll} vs DC ${dispelDC})`;

    return this.createFailureResult(message, {
      targetSpell: targetSpell.name,
      dispelSpell: dispelSpell.name,
      roll: dispelRoll.total,
      casterLevel,
      total: totalRoll,
      dc: dispelDC,
    });
  }

  private async handleSpellInteraction(
    targetSpell: Spell,
    interactingSpell: Spell,
    _caster: Character
  ): Promise<RuleResult> {
    const interactions = this.getSpellInteractions(targetSpell.name, interactingSpell.name);

    if (interactions.length === 0) {
      return this.createSuccessResult(
        `"${targetSpell.name}" and "${interactingSpell.name}" do not interact - both effects apply normally`
      );
    }

    const interaction = interactions[0];

    const message = `Spell interaction: "${targetSpell.name}" and "${interactingSpell.name}" - ${interaction.effect}`;

    return this.createSuccessResult(message, {
      targetSpell: targetSpell.name,
      interactingSpell: interactingSpell.name,
      interactionType: interaction.type,
      effect: interaction.effect,
    });
  }

  private getSpellInteractions(
    spell1: string,
    spell2: string
  ): Array<{ type: string; effect: string }> {
    const interactions: Record<string, Record<string, { type: string; effect: string }>> = {
      fireball: {
        'ice storm': {
          type: 'elemental',
          effect: 'Both spells neutralize each other in overlapping area',
        },
        'wall of ice': {
          type: 'elemental',
          effect: 'Fireball melts ice wall, reducing its duration by half',
        },
      },
      'lightning bolt': {
        water: { type: 'elemental', effect: 'Lightning damage increased by 50% in water' },
        'metal armor': { type: 'conductive', effect: 'Target in metal armor takes +1d6 damage' },
      },
      darkness: {
        light: {
          type: 'opposing',
          effect: 'Light and darkness cancel each other in overlapping areas',
        },
        'continual light': { type: 'opposing', effect: 'Continual light suppresses darkness' },
      },
    };

    const result: Array<{ type: string; effect: string }> = [];

    if (interactions[spell1.toLowerCase()]?.[spell2.toLowerCase()]) {
      result.push(interactions[spell1.toLowerCase()][spell2.toLowerCase()]);
    }

    if (interactions[spell2.toLowerCase()]?.[spell1.toLowerCase()]) {
      result.push(interactions[spell2.toLowerCase()][spell1.toLowerCase()]);
    }

    return result;
  }
}

export class AdvancedSpellResearchRule extends BaseRule {
  name = 'advanced-spell-research';
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

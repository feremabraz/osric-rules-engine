import { rollDice } from '../../core/Dice';
import type { GameContext } from '../../core/GameContext';
import { BaseRule, type RuleResult } from '../../core/Rule';
import type {
  IdentificationResult,
  MagicScroll,
  MaterialComponent,
  SpellWithComponents,
} from '../../types/SpellTypes';
import type { Character, Item, Spell } from '../../types/entities';

/**
 * Rule for detailed spell component management
 * Based on OSRIC advanced spell component system
 */
export class SpellComponentManagementRule extends BaseRule {
  name = 'spell-component-management';
  description = 'Manage detailed spell components and their availability';

  canApply(context: GameContext): boolean {
    const caster = context.getTemporary('caster');
    const spell = context.getTemporary('spellToCast');
    return caster !== null && spell !== null;
  }

  async execute(context: GameContext): Promise<RuleResult> {
    const caster = context.getTemporary<Character>('caster');
    const spell = context.getTemporary<SpellWithComponents>('spellToCast');

    if (!caster || !spell) {
      return this.createFailureResult('Missing caster or spell information');
    }

    const missingComponents: string[] = [];
    const consumedComponents: MaterialComponent[] = [];

    // Check Verbal component
    if (spell.componentRequirements.includes('V')) {
      // Check if silenced (simplified check)
      if (caster.statusEffects?.some((effect) => effect.name.toLowerCase().includes('silence'))) {
        missingComponents.push('Verbal (silenced)');
      }
    }

    // Check Somatic component
    if (spell.componentRequirements.includes('S')) {
      // Simplified hand occupation check
      const hasHandsFree = true; // Would need more detailed equipment system

      if (!hasHandsFree) {
        missingComponents.push('Somatic (hands occupied)');
      }

      // Check for paralysis or binding
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

    // Check Material components
    if (spell.componentRequirements.includes('M')) {
      for (const component of spell.detailedMaterialComponents) {
        const hasComponent = caster.inventory.some((item: Item) =>
          item.name.toLowerCase().includes(component.name.toLowerCase())
        );

        if (!hasComponent) {
          // Check if component can be substituted with spell component pouch
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

    // Consume material components
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

/**
 * Rule for advanced spell failure and backfire effects
 * Based on OSRIC spell failure mechanics
 */
export class SpellFailureRule extends BaseRule {
  name = 'spell-failure';
  description = 'Handle spell failure and backfire effects';

  canApply(context: GameContext): boolean {
    const spellAttempt = context.getTemporary('spellAttempt');
    return spellAttempt !== null;
  }

  async execute(context: GameContext): Promise<RuleResult> {
    const spellAttempt = context.getTemporary<{
      caster: Character;
      spell: Spell;
      failureRoll: number;
      failureChance: number;
      backfireChance?: number;
    }>('spellAttempt');

    if (!spellAttempt) {
      return this.createFailureResult('No spell attempt information found');
    }

    const { caster, spell, failureRoll, failureChance, backfireChance = 0 } = spellAttempt;

    // Check if spell failed
    const spellFailed = failureRoll > 100 - failureChance;

    if (!spellFailed) {
      return this.createSuccessResult(`${caster.name} successfully casts "${spell.name}"`);
    }

    // Spell failed - check for backfire
    const backfireRoll = rollDice(1, 100);
    const backfireFailed = backfireRoll.result <= backfireChance;

    if (backfireFailed) {
      // Determine backfire effect based on spell level
      const backfireEffect = this.determineBackfireEffect(spell.level);

      // Apply backfire effect
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
        backfireRoll: backfireRoll.result,
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
    const roll = rollDice(1, 20);
    const adjustedRoll = roll.result + spellLevel;

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
        description: 'Wild magic surge - random spell effect in 3m radius', // converted from 10ft
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
        // Implementation would depend on spell slot system
        break;
      case 'lose_turn': {
        // Add stunned status effect
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
        // Mark for wild magic surge processing
        context.setTemporary('wildMagicSurge', { caster: caster.id, radius: 10 });
        break;
    }

    context.setEntity(caster.id, caster);
  }
}

/**
 * Rule for spell duration and concentration management
 * Based on OSRIC concentration mechanics
 */
export class SpellConcentrationRule extends BaseRule {
  name = 'spell-concentration';
  description = 'Manage spell concentration and duration';

  canApply(context: GameContext): boolean {
    const concentrationCheck = context.getTemporary('concentrationCheck');
    return concentrationCheck !== null;
  }

  async execute(context: GameContext): Promise<RuleResult> {
    const concentrationCheck = context.getTemporary<{
      caster: Character;
      spell: Spell;
      distraction: 'damage' | 'spell' | 'environmental' | 'movement';
      distractionSeverity: number; // 1-10 scale
    }>('concentrationCheck');

    if (!concentrationCheck) {
      return this.createFailureResult('No concentration check information found');
    }

    const { caster, spell, distraction, distractionSeverity } = concentrationCheck;

    // Base concentration DC based on distraction type
    let baseDC = 10;
    switch (distraction) {
      case 'damage':
        baseDC = Math.max(10, distractionSeverity); // DC = damage taken
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

    // Constitution modifier
    const constitutionModifier = Math.floor((caster.abilities.constitution - 10) / 2);

    // Concentration proficiency (simplified check)
    const proficiencyBonus = caster.level ? Math.ceil(caster.level / 4) + 1 : 2;
    const hasConcentrationProficiency = false; // Would need skill system implementation

    // Roll concentration check
    const concentrationRoll = rollDice(1, 20);
    const totalRoll =
      concentrationRoll.result +
      constitutionModifier +
      (hasConcentrationProficiency ? proficiencyBonus : 0);

    const concentrationMaintained = totalRoll >= baseDC;

    if (concentrationMaintained) {
      const message =
        `${caster.name} maintains concentration on "${spell.name}" ` +
        `(rolled ${concentrationRoll.result} + ${constitutionModifier} ${hasConcentrationProficiency ? `+ ${proficiencyBonus}` : ''} = ${totalRoll} vs DC ${baseDC})`;

      return this.createSuccessResult(message, {
        spellName: spell.name,
        distraction,
        dc: baseDC,
        roll: concentrationRoll.result,
        total: totalRoll,
        maintained: true,
      });
    }

    // Concentration broken - end spell effect
    const message =
      `${caster.name} loses concentration on "${spell.name}" ` +
      `(rolled ${concentrationRoll.result} + ${constitutionModifier} ${hasConcentrationProficiency ? `+ ${proficiencyBonus}` : ''} = ${totalRoll} vs DC ${baseDC}). Spell effect ends.`;

    // Mark spell as ended
    context.setTemporary('spellEnded', { caster: caster.id, spell: spell.name });

    return this.createFailureResult(message, {
      spellName: spell.name,
      distraction,
      dc: baseDC,
      roll: concentrationRoll.result,
      total: totalRoll,
      maintained: false,
    });
  }
}

/**
 * Rule for advanced spell interactions and counterspells
 * Based on OSRIC spell interaction mechanics
 */
export class SpellInteractionRule extends BaseRule {
  name = 'spell-interaction';
  description = 'Handle spell interactions and counterspells';

  canApply(context: GameContext): boolean {
    const spellInteraction = context.getTemporary('spellInteraction');
    return spellInteraction !== null;
  }

  async execute(context: GameContext): Promise<RuleResult> {
    const spellInteraction = context.getTemporary<{
      type: 'counterspell' | 'dispel' | 'interaction';
      targetSpell: Spell;
      interactingSpell: Spell;
      caster: Character;
      target?: Character;
    }>('spellInteraction');

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
    // Counterspell must be cast at same level or higher
    if (counterspell.level < targetSpell.level) {
      return this.createFailureResult(
        `Counterspell level ${counterspell.level} cannot counter level ${targetSpell.level} spell`
      );
    }

    // If same level, automatic success
    if (counterspell.level >= targetSpell.level) {
      const message = `${caster.name} successfully counters "${targetSpell.name}" with "${counterspell.name}"`;

      return this.createSuccessResult(message, {
        targetSpell: targetSpell.name,
        counterspell: counterspell.name,
        success: true,
        automatic: true,
      });
    }

    // This shouldn't be reached given the logic above, but included for completeness
    return this.createFailureResult('Counterspell failed');
  }

  private async handleDispelMagic(
    targetSpell: Spell,
    dispelSpell: Spell,
    caster: Character,
    _target?: Character
  ): Promise<RuleResult> {
    // Dispel magic check: 1d20 + caster level vs DC (11 + spell level)
    const casterLevel = caster.level || 1;
    const dispelDC = 11 + targetSpell.level;

    const dispelRoll = rollDice(1, 20);
    const totalRoll = dispelRoll.result + casterLevel;

    const dispelSuccess = totalRoll >= dispelDC;

    if (dispelSuccess) {
      const message =
        `${caster.name} successfully dispels "${targetSpell.name}" ` +
        `(rolled ${dispelRoll.result} + ${casterLevel} = ${totalRoll} vs DC ${dispelDC})`;

      return this.createSuccessResult(message, {
        targetSpell: targetSpell.name,
        dispelSpell: dispelSpell.name,
        roll: dispelRoll.result,
        casterLevel,
        total: totalRoll,
        dc: dispelDC,
        success: true,
      });
    }

    const message =
      `${caster.name} fails to dispel "${targetSpell.name}" ` +
      `(rolled ${dispelRoll.result} + ${casterLevel} = ${totalRoll} vs DC ${dispelDC})`;

    return this.createFailureResult(message, {
      targetSpell: targetSpell.name,
      dispelSpell: dispelSpell.name,
      roll: dispelRoll.result,
      casterLevel,
      total: totalRoll,
      dc: dispelDC,
      success: false,
    });
  }

  private async handleSpellInteraction(
    targetSpell: Spell,
    interactingSpell: Spell,
    _caster: Character
  ): Promise<RuleResult> {
    // Check for specific spell interactions
    const interactions = this.getSpellInteractions(targetSpell.name, interactingSpell.name);

    if (interactions.length === 0) {
      return this.createSuccessResult(
        `"${targetSpell.name}" and "${interactingSpell.name}" do not interact - both effects apply normally`
      );
    }

    const interaction = interactions[0]; // Take first matching interaction

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
    // Define common spell interactions
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

/**
 * Rule for spell research complexity and advanced requirements
 * Based on OSRIC advanced spell research system
 */
export class AdvancedSpellResearchRule extends BaseRule {
  name = 'advanced-spell-research';
  description = 'Handle complex spell research requirements';

  canApply(context: GameContext): boolean {
    const researchProject = context.getTemporary('advancedResearchProject');
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
    }>('advancedResearchProject');

    if (!researchProject) {
      return this.createFailureResult('No advanced research project found');
    }

    const { researcher, spellName, spellLevel, complexity, specialRequirements, researchType } =
      researchProject;

    // Calculate base requirements
    let baseTime = spellLevel * 4; // weeks
    let baseCost = spellLevel * spellLevel * 500; // gold
    let baseSuccessChance = 60;

    // Apply complexity modifiers
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

    // Apply research type modifiers
    switch (researchType) {
      case 'modify':
        baseTime *= 0.75;
        baseCost *= 0.75;
        baseSuccessChance += 10;
        break;
      case 'create':
        // Base values
        break;
      case 'reverse':
        baseTime *= 1.5;
        baseCost *= 1.25;
        baseSuccessChance -= 15;
        break;
    }

    // Check special requirements
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

    // Intelligence and level bonuses
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
        return researcher.currency.gold >= 1000; // Simplified check

      case 'laboratory':
        // Would need more detailed equipment system
        return false; // Simplified

      case 'assistant spellcaster':
        // Would need to check for available assistant
        return true; // Simplified

      case 'divine blessing':
        return researcher.class === 'Cleric' && researcher.level >= 9;

      case 'planar knowledge':
        // Would need skill system implementation
        return false; // Simplified

      default:
        return false;
    }
  }
}

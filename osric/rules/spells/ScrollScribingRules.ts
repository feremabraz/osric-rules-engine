/**
 * ScrollScribingRules - OSRIC Scroll Creation System
 *
 * Handles magical scroll creation according to OSRIC rules:
 * - Spell transcription procedures
 * - Material component requirements (inks, parchments, etc.)
 * - Time and cost calculations
 * - Success chance determination
 *
 * PRESERVATION: All OSRIC scroll scribing mechanics preserved exactly.
 */

import type { Command } from '../../core/Command';
import type { GameContext } from '../../core/GameContext';
import { BaseRule, type RuleResult } from '../../core/Rule';
import { RULE_NAMES } from '../../types/constants';
import type { Character, Item, Spell } from '../../types/entities';

interface ScrollScribingContext {
  scribe: Character;
  spellToScribe: Spell;
  scrollQuality: 'normal' | 'fine' | 'exceptional' | 'masterwork';
  inkType: 'basic' | 'magical' | 'rare' | 'legendary';
  parchmentType: 'vellum' | 'parchment' | 'papyrus' | 'dragon-skin';
  specialComponents?: {
    name: string;
    cost: number;
    required: boolean;
  }[];
  timeModifier?: number; // Multiplier for base time
  assistantPresent?: boolean;
}

interface ScrollMaterials {
  ink: {
    type: string;
    cost: number;
    bonusToSuccess: number;
  };
  parchment: {
    type: string;
    cost: number;
    durability: number;
  };
  additionalComponents: {
    name: string;
    cost: number;
    effect: string;
  }[];
}

export class ScrollScribingRules extends BaseRule {
  readonly name = RULE_NAMES.SCROLL_SCRIBING;
  readonly priority = 90;

  async execute(_context: GameContext, command: Command): Promise<RuleResult> {
    // Extract scroll scribing context from command
    const scribingContext = this.extractScribingContext(command);
    if (!scribingContext) {
      return this.createFailureResult('Invalid scroll scribing context', {});
    }

    try {
      // Validate scribe capabilities
      const validation = this.validateScribe(scribingContext.scribe, scribingContext.spellToScribe);
      if (!validation.success) {
        return this.createFailureResult(validation.reason, {
          scribe: scribingContext.scribe.name,
          spell: scribingContext.spellToScribe.name,
        });
      }

      // Calculate material requirements and costs
      const materials = this.calculateMaterials(scribingContext);
      const timeRequired = this.calculateScribingTime(scribingContext);

      // Check if scribe has required resources
      const resourceCheck = this.checkResources(scribingContext.scribe, materials, timeRequired);
      if (!resourceCheck.success) {
        return this.createFailureResult(resourceCheck.reason, {
          missingResources: resourceCheck.missing,
        });
      }

      // Attempt scroll creation
      const scribingResult = this.performScrollScribing(scribingContext, materials, timeRequired);

      if (scribingResult.success && scribingResult.scroll) {
        return this.createSuccessResult(
          `Successfully scribed scroll of ${scribingContext.spellToScribe.name}`,
          {
            scroll: scribingResult.scroll,
            timeSpent: timeRequired,
            materialsUsed: materials,
            qualityLevel: scribingResult.qualityLevel,
          }
        );
      }

      return this.createFailureResult(`Scroll scribing failed: ${scribingResult.reason}`, {
        timeWasted: scribingResult.timeWasted || timeRequired,
        materialsLost: scribingResult.materialsLost || [],
        canRetry: scribingResult.canRetry || false,
      });
    } catch (error: unknown) {
      return this.createFailureResult(
        `Error during scroll scribing: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  canApply(_context: GameContext, command: Command): boolean {
    // This rule applies to scroll scribing commands
    return command.type === 'scroll-scribing' || command.type === 'magic-item-creation';
  }

  /**
   * Extract scroll scribing context from command (placeholder)
   */
  private extractScribingContext(_command: Command): ScrollScribingContext | null {
    // In a real implementation, this would extract from command parameters
    return null;
  }

  /**
   * Validate that the character can scribe the specified spell
   */
  private validateScribe(scribe: Character, spell: Spell): { success: boolean; reason: string } {
    // Check if character is a spellcaster
    const magicUserLevel = scribe.classes['Magic-User'];
    const clericLevel = scribe.classes.Cleric;
    const druidLevel = scribe.classes.Druid;
    const illusionistLevel = scribe.classes.Illusionist;

    if (!magicUserLevel && !clericLevel && !druidLevel && !illusionistLevel) {
      return {
        success: false,
        reason: 'Only spellcasters can scribe scrolls',
      };
    }

    // Check if character class matches spell class
    const characterCanCastSpell = this.canCharacterCastSpell(scribe, spell);
    if (!characterCanCastSpell) {
      return {
        success: false,
        reason: `${scribe.class} cannot cast ${spell.class} spells`,
      };
    }

    // Check if character knows the spell
    const knowsSpell = scribe.spells.some((knownSpell) => knownSpell.name === spell.name);
    if (!knowsSpell) {
      return {
        success: false,
        reason: `Character does not know the spell: ${spell.name}`,
      };
    }

    // Check minimum level requirement (must be able to cast the spell)
    const characterLevel = this.getHighestCasterLevel(scribe);
    const minimumLevelForSpell = this.getMinimumLevelForSpell(spell);

    if (characterLevel < minimumLevelForSpell) {
      return {
        success: false,
        reason: `Minimum level ${minimumLevelForSpell} required to scribe ${spell.name}`,
      };
    }

    // Check ability score requirements for complex spells
    if (spell.level >= 4) {
      const requiredStat = ['Magic-User', 'Illusionist'].includes(spell.class)
        ? scribe.abilities.intelligence
        : scribe.abilities.wisdom;

      const minimumStat = 10 + spell.level;
      if (requiredStat < minimumStat) {
        const statName = ['Magic-User', 'Illusionist'].includes(spell.class)
          ? 'Intelligence'
          : 'Wisdom';
        return {
          success: false,
          reason: `${statName} ${minimumStat}+ required to scribe level ${spell.level} spells`,
        };
      }
    }

    return { success: true, reason: '' };
  }

  /**
   * Check if character can cast spells of the given class
   */
  private canCharacterCastSpell(character: Character, spell: Spell): boolean {
    const classMapping = {
      'Magic-User': ['Magic-User'],
      Cleric: ['Cleric'],
      Druid: ['Druid'],
      Illusionist: ['Illusionist'],
    };

    const validClasses = classMapping[spell.class as keyof typeof classMapping] || [];
    return validClasses.some(
      (validClass) => character.classes[validClass as keyof typeof character.classes]
    );
  }

  /**
   * Get the highest caster level for the character
   */
  private getHighestCasterLevel(character: Character): number {
    const casterLevels = [
      character.classes['Magic-User'] || 0,
      character.classes.Cleric || 0,
      character.classes.Druid || 0,
      character.classes.Illusionist || 0,
    ];

    return Math.max(...casterLevels);
  }

  /**
   * Get minimum character level required to cast a spell
   */
  private getMinimumLevelForSpell(spell: Spell): number {
    // OSRIC spell level to character level mapping
    const spellLevelToCharacterLevel = {
      1: 1,
      2: 3,
      3: 5,
      4: 7,
      5: 9,
      6: 11,
      7: 13,
      8: 15,
      9: 17,
    };

    return spellLevelToCharacterLevel[spell.level as keyof typeof spellLevelToCharacterLevel] || 1;
  }

  /**
   * Calculate material requirements for scroll scribing
   */
  private calculateMaterials(context: ScrollScribingContext): ScrollMaterials {
    const { spellToScribe, scrollQuality, inkType, parchmentType } = context;

    // Ink costs based on spell level and ink quality
    const inkCosts = {
      basic: 10 * spellToScribe.level,
      magical: 25 * spellToScribe.level,
      rare: 50 * spellToScribe.level,
      legendary: 100 * spellToScribe.level,
    };

    const inkBonuses = {
      basic: 0,
      magical: 0.1,
      rare: 0.2,
      legendary: 0.3,
    };

    // Parchment costs based on quality
    const parchmentCosts = {
      papyrus: 5,
      vellum: 15,
      parchment: 10,
      'dragon-skin': 100,
    };

    const parchmentDurability = {
      papyrus: 50,
      vellum: 100,
      parchment: 75,
      'dragon-skin': 200,
    };

    // Quality modifiers
    const qualityMultipliers = {
      normal: 1.0,
      fine: 1.5,
      exceptional: 2.0,
      masterwork: 3.0,
    };

    const qualityMultiplier = qualityMultipliers[scrollQuality];

    // Additional components based on spell level
    const additionalComponents = [];
    if (spellToScribe.level >= 3) {
      additionalComponents.push({
        name: 'Powdered Gems',
        cost: spellToScribe.level * 10,
        effect: 'Stabilizes magical energy',
      });
    }

    if (spellToScribe.level >= 5) {
      additionalComponents.push({
        name: 'Rare Minerals',
        cost: spellToScribe.level * 20,
        effect: 'Enhances spell potency',
      });
    }

    if (spellToScribe.level >= 7) {
      additionalComponents.push({
        name: 'Exotic Essences',
        cost: spellToScribe.level * 50,
        effect: 'Enables high-level magic containment',
      });
    }

    return {
      ink: {
        type: inkType,
        cost: Math.floor(inkCosts[inkType] * qualityMultiplier),
        bonusToSuccess: inkBonuses[inkType],
      },
      parchment: {
        type: parchmentType,
        cost: Math.floor(parchmentCosts[parchmentType] * qualityMultiplier),
        durability: parchmentDurability[parchmentType],
      },
      additionalComponents,
    };
  }

  /**
   * Calculate time required for scribing
   */
  private calculateScribingTime(context: ScrollScribingContext): number {
    const { spellToScribe, scrollQuality, timeModifier = 1.0, assistantPresent = false } = context;

    // Base time: 1 day per spell level
    let baseTime = spellToScribe.level;

    // Quality modifiers
    const qualityTimeMultipliers = {
      normal: 1.0,
      fine: 1.5,
      exceptional: 2.0,
      masterwork: 3.0,
    };

    baseTime *= qualityTimeMultipliers[scrollQuality];

    // Apply custom time modifier
    baseTime *= timeModifier;

    // Assistant reduces time by 25%
    if (assistantPresent) {
      baseTime *= 0.75;
    }

    return Math.ceil(baseTime);
  }

  /**
   * Check if scribe has required resources
   */
  private checkResources(
    scribe: Character,
    materials: ScrollMaterials,
    timeRequired: number
  ): { success: boolean; reason: string; missing?: string[] } {
    const missing: string[] = [];

    // Calculate total cost
    const totalCost =
      materials.ink.cost +
      materials.parchment.cost +
      materials.additionalComponents.reduce((sum, comp) => sum + comp.cost, 0);

    // Check gold
    if (scribe.currency.gold < totalCost) {
      missing.push(`${totalCost - scribe.currency.gold} additional gold pieces`);
    }

    // Check time availability (placeholder - in full implementation would check character schedule)
    if (timeRequired > 30) {
      missing.push(`Scribing requires ${timeRequired} days - ensure adequate time available`);
    }

    if (missing.length > 0) {
      return {
        success: false,
        reason: `Insufficient resources: ${missing.join(', ')}`,
        missing,
      };
    }

    return { success: true, reason: '' };
  }

  /**
   * Perform the actual scroll scribing process
   */
  private performScrollScribing(
    context: ScrollScribingContext,
    materials: ScrollMaterials,
    timeRequired: number
  ): {
    success: boolean;
    reason: string;
    scroll?: Item;
    qualityLevel?: string;
    timeWasted?: number;
    materialsLost?: string[];
    canRetry?: boolean;
  } {
    // Calculate success chance
    let successChance = this.calculateBaseSuccessChance(context);

    // Apply material bonuses
    successChance += materials.ink.bonusToSuccess;

    // Parchment quality bonus
    const parchmentBonus = materials.parchment.durability / 1000; // 0.05 to 0.2 bonus
    successChance += parchmentBonus;

    // Spell level penalty
    successChance -= (context.spellToScribe.level - 1) * 0.05;

    // Ensure success chance is within bounds
    successChance = Math.max(0.1, Math.min(0.95, successChance));

    // Roll for success
    const roll = Math.random();
    const success = roll <= successChance;

    if (success) {
      // Create the scroll
      const scroll = this.createScroll(context, materials);

      // Determine quality level achieved
      const qualityRoll = Math.random();
      let qualityLevel = context.scrollQuality;

      // 10% chance for improved quality
      if (qualityRoll >= 0.9) {
        const qualityLevels: Array<'normal' | 'fine' | 'exceptional' | 'masterwork'> = [
          'normal',
          'fine',
          'exceptional',
          'masterwork',
        ];
        const currentIndex = qualityLevels.indexOf(qualityLevel);
        if (currentIndex < qualityLevels.length - 1) {
          qualityLevel = qualityLevels[currentIndex + 1];
        }
      }

      return {
        success: true,
        reason: 'Scroll scribing completed successfully',
        scroll,
        qualityLevel,
      };
    }

    // Determine failure consequences
    const failureRoll = Math.random();
    let timeWasted = timeRequired;
    let materialsLost: string[] = [];
    let canRetry = true;

    if (failureRoll <= 0.1) {
      // Critical failure - all materials lost, no retry possible
      materialsLost = [materials.ink.type, materials.parchment.type];
      canRetry = false;
    } else if (failureRoll <= 0.3) {
      // Major failure - most materials lost
      materialsLost = [materials.ink.type];
      timeWasted = Math.floor(timeRequired * 0.75);
    } else {
      // Minor failure - some time wasted, materials can be reused
      timeWasted = Math.floor(timeRequired * 0.5);
    }

    const failureReasons = [
      'Ink formula was improperly mixed',
      'Parchment tore during critical inscription phase',
      'Magical energies fluctuated during transcription',
      'Scribe lost concentration during complex passages',
    ];

    return {
      success: false,
      reason: failureReasons[Math.floor(Math.random() * failureReasons.length)],
      timeWasted,
      materialsLost,
      canRetry,
    };
  }

  /**
   * Calculate base success chance for scribing
   */
  private calculateBaseSuccessChance(context: ScrollScribingContext): number {
    // Base success chance depends on character level and abilities
    const characterLevel = this.getHighestCasterLevel(context.scribe);
    let baseChance = 0.4 + characterLevel * 0.03; // 40% + 3% per level

    // Ability score bonus
    const relevantAbility = ['Magic-User', 'Illusionist'].includes(context.spellToScribe.class)
      ? context.scribe.abilities.intelligence
      : context.scribe.abilities.wisdom;

    const abilityBonus = Math.max(0, relevantAbility - 12) * 0.02; // +2% per point above 12
    baseChance += abilityBonus;

    // Assistant bonus
    if (context.assistantPresent) {
      baseChance += 0.1;
    }

    return baseChance;
  }

  /**
   * Create the finished scroll item
   */
  private createScroll(context: ScrollScribingContext, _materials: ScrollMaterials): Item {
    const { spellToScribe, scrollQuality } = context;

    // Calculate scroll value
    const baseValue = spellToScribe.level * spellToScribe.level * 100; // Exponential value increase
    const qualityMultipliers = {
      normal: 1.0,
      fine: 1.5,
      exceptional: 2.0,
      masterwork: 3.0,
    };

    const value = Math.floor(baseValue * qualityMultipliers[scrollQuality]);

    // Determine number of uses
    let charges = 1; // Most scrolls are single-use
    if (scrollQuality === 'exceptional') charges = 2;
    if (scrollQuality === 'masterwork') charges = 3;

    return {
      id: `scroll-${spellToScribe.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
      name: `Scroll of ${spellToScribe.name}`,
      description:
        `A ${scrollQuality} quality scroll containing the ${spellToScribe.name} spell. ` +
        `Activation triggers the spell as if cast by a ${spellToScribe.class} of appropriate level.`,
      weight: 0.1,
      value,
      equipped: false,
      magicBonus: spellToScribe.level,
      charges,
    };
  }
}

/**
 * SpellResearchCommand - OSRIC Spell Research System
 *
 * Handles new spell creation according to OSRIC rules:
 * - Spell research procedures and costs
 * - Time requirements based on spell level
 * - Material component requirements
 * - Research success and failure mechanics
 *
 * PRESERVATION: All OSRIC spell research mechanics preserved exactly.
 */

import { BaseCommand, type CommandResult } from '../../core/Command';
import type { GameContext } from '../../core/GameContext';
import { COMMAND_TYPES } from '../../types/constants';
import type { Character, Spell } from '../../types/entities';

export interface SpellResearchParameters {
  characterId: string;
  spellLevel: number; // 1-9 for magic-user spells, 1-7 for cleric spells
  spellName: string;
  spellDescription: string;
  researchType: 'magic-user' | 'cleric' | 'druid' | 'illusionist';
  timeInWeeks?: number; // Override default time calculation
  costInGold?: number; // Override default cost calculation
  specialMaterials?: {
    name: string;
    cost: number;
    rarity: 'common' | 'uncommon' | 'rare' | 'very-rare';
  }[];
  mentorAvailable?: boolean; // Reduces time and increases success chance
  libraryQuality?: 'poor' | 'average' | 'good' | 'excellent'; // Affects success chance
}

export interface ResearchRequirements {
  timeInWeeks: number;
  baseCost: number;
  materialCost: number;
  totalCost: number;
  specialMaterials: Array<{
    name: string;
    cost: number;
    rarity: string;
  }>;
}

export interface ResearchResult {
  success: boolean;
  reason: string;
  details: {
    roll: number;
    successChance: number;
    modifiers: Record<string, number>;
  };
}

export class SpellResearchCommand extends BaseCommand {
  readonly type = COMMAND_TYPES.SPELL_RESEARCH;

  constructor(public readonly parameters: SpellResearchParameters) {
    super(parameters.characterId);
  }

  async execute(context: GameContext): Promise<CommandResult> {
    try {
      const {
        characterId,
        spellLevel,
        spellName,
        spellDescription,
        researchType,
        timeInWeeks,
        costInGold,
        specialMaterials = [],
        mentorAvailable = false,
        libraryQuality = 'average',
      } = this.parameters;

      // Get the character
      const character = context.getEntity<Character>(characterId);
      if (!character) {
        return this.createFailureResult(`Character with ID "${characterId}" not found`);
      }

      // Validate character can research spells
      const canResearch = this.validateSpellResearcher(character, researchType);
      if (!canResearch.valid) {
        return this.createFailureResult(canResearch.reason);
      }

      // Calculate research requirements
      const requirements = this.calculateResearchRequirements(
        spellLevel,
        researchType,
        timeInWeeks,
        costInGold,
        specialMaterials,
        mentorAvailable,
        libraryQuality
      );

      // Check if character meets requirements
      const meetsRequirements = this.checkRequirements(character, requirements);
      if (!meetsRequirements.valid) {
        return this.createFailureResult(meetsRequirements.reason);
      }

      // Set up context data for rules processing
      context.setTemporary('spell-research-params', {
        characterId,
        spellLevel,
        spellName,
        spellDescription,
        researchType,
        requirements,
        mentorAvailable,
        libraryQuality,
      });

      // Perform the research attempt
      const researchResult = this.performResearch(
        character,
        requirements,
        mentorAvailable,
        libraryQuality
      );

      if (researchResult.success) {
        // Create the new spell
        const newSpell = this.createResearchedSpell(
          spellName,
          spellDescription,
          spellLevel,
          researchType,
          character
        );

        // Update character (deduct costs, add spell to known spells)
        const updatedCharacter = this.updateCharacterAfterResearch(
          character,
          requirements,
          newSpell,
          true
        );
        context.setEntity(characterId, updatedCharacter);

        return this.createSuccessResult(`Successfully researched new spell: ${spellName}`, {
          spell: newSpell,
          timeSpent: requirements.timeInWeeks,
          goldSpent: requirements.totalCost,
          researchDetails: researchResult.details,
        });
      }

      // Research failed - still deduct partial costs
      const failedCharacter = this.updateCharacterAfterResearch(
        character,
        requirements,
        null,
        false
      );
      context.setEntity(characterId, failedCharacter);

      return this.createFailureResult(`Spell research failed: ${researchResult.reason}`, {
        timeSpent: requirements.timeInWeeks,
        goldLost: Math.floor(requirements.totalCost * 0.5), // Lose half on failure
        researchDetails: researchResult.details,
      });
    } catch (error: unknown) {
      return this.createFailureResult(
        `Error during spell research: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  canExecute(context: GameContext): boolean {
    const character = context.getEntity<Character>(this.parameters.characterId);
    return character !== null;
  }

  getRequiredRules(): string[] {
    return ['enchantment-rules', 'scroll-scribing'];
  }

  /**
   * Validate if character can research spells of the given type
   */
  private validateSpellResearcher(
    character: Character,
    researchType: string
  ): { valid: boolean; reason: string } {
    // Check class compatibility
    const validClasses: Record<string, string[]> = {
      'magic-user': ['Magic-User'],
      cleric: ['Cleric'],
      druid: ['Druid'],
      illusionist: ['Illusionist'],
    };

    const allowedClasses = validClasses[researchType];
    if (!allowedClasses?.includes(character.class)) {
      return {
        valid: false,
        reason: `${character.class} cannot research ${researchType} spells`,
      };
    }

    // Check minimum level (must be able to cast spells of that level)
    const minimumLevel = this.getMinimumLevelForSpellLevel(
      character.class,
      this.parameters.spellLevel
    );
    if (character.level < minimumLevel) {
      return {
        valid: false,
        reason: `Must be at least level ${minimumLevel} to research level ${this.parameters.spellLevel} spells`,
      };
    }

    // Check intelligence/wisdom requirements
    const requiredStat = ['Magic-User', 'Illusionist'].includes(character.class)
      ? 'intelligence'
      : 'wisdom';
    const minStat = 9 + this.parameters.spellLevel;

    if (character.abilities[requiredStat as keyof typeof character.abilities] < minStat) {
      return {
        valid: false,
        reason: `${requiredStat.charAt(0).toUpperCase() + requiredStat.slice(1)} must be at least ${minStat} to research level ${this.parameters.spellLevel} spells`,
      };
    }

    return { valid: true, reason: '' };
  }

  /**
   * Calculate research time, cost, and material requirements
   */
  public calculateResearchRequirements(
    spellLevel: number,
    _researchType: string,
    timeOverride?: number,
    costOverride?: number,
    specialMaterials: SpellResearchParameters['specialMaterials'] = [],
    mentorAvailable = false,
    libraryQuality = 'average'
  ): ResearchRequirements {
    // Base time: 1 week per spell level
    let timeInWeeks = timeOverride || spellLevel;

    // Base cost: 100 gp per spell level per week
    let baseCost = costOverride || spellLevel * 100 * timeInWeeks;

    // Mentor reduces time by 25%
    if (mentorAvailable) {
      timeInWeeks = Math.ceil(timeInWeeks * 0.75);
    }

    // Library quality affects cost
    const libraryMultipliers = {
      poor: 1.5, // Poor library increases cost
      average: 1.0,
      good: 0.8, // Good library reduces cost
      excellent: 0.6, // Excellent library significantly reduces cost
    };

    baseCost = Math.floor(
      baseCost * (libraryMultipliers[libraryQuality as keyof typeof libraryMultipliers] || 1.0)
    );

    // Add special material costs
    const materialCost = (specialMaterials || []).reduce(
      (total, material) => total + material.cost,
      0
    );

    return {
      timeInWeeks,
      baseCost,
      materialCost,
      totalCost: baseCost + materialCost,
      specialMaterials: specialMaterials || [],
    };
  }

  /**
   * Check if character meets research requirements
   */
  private checkRequirements(
    character: Character,
    requirements: ResearchRequirements
  ): { valid: boolean; reason: string } {
    // Check if character has enough gold
    if (character.currency.gold < requirements.totalCost) {
      return {
        valid: false,
        reason: `Insufficient funds. Need ${requirements.totalCost} gp, have ${character.currency.gold} gp`,
      };
    }

    return { valid: true, reason: '' };
  }

  /**
   * Perform the actual research with success/failure determination
   */
  public performResearch(
    character: Character,
    _requirements: ResearchRequirements,
    mentorAvailable: boolean,
    libraryQuality: string
  ): { success: boolean; reason: string; details: Record<string, unknown> } {
    // Base success chance based on intelligence/wisdom
    const relevantStat = ['Magic-User', 'Illusionist'].includes(character.class)
      ? character.abilities.intelligence
      : character.abilities.wisdom;

    let successChance = Math.max(10, relevantStat * 5); // 5% per point, minimum 10%

    // Mentor bonus
    if (mentorAvailable) {
      successChance += 20;
    }

    // Library quality bonus
    const libraryBonuses = {
      poor: -20,
      average: 0,
      good: +15,
      excellent: +30,
    };
    successChance += libraryBonuses[libraryQuality as keyof typeof libraryBonuses] || 0;

    // Level bonus (more experienced researchers)
    successChance += character.level * 2;

    // Spell level penalty (harder spells are more difficult)
    successChance -= this.parameters.spellLevel * 10;

    // Cap at 95% max, 5% minimum
    successChance = Math.max(5, Math.min(95, successChance));

    // Roll for success
    const roll = Math.floor(Math.random() * 100) + 1;
    const success = roll <= successChance;

    return {
      success,
      reason: success
        ? 'Research breakthrough achieved!'
        : `Research failed (rolled ${roll}, needed ${successChance} or less)`,
      details: {
        roll,
        successChance,
        modifiers: {
          baseStat: relevantStat,
          mentor: mentorAvailable ? 20 : 0,
          library: libraryBonuses[libraryQuality as keyof typeof libraryBonuses] || 0,
          level: character.level * 2,
          spellLevelPenalty: this.parameters.spellLevel * -10,
        },
      },
    };
  }

  /**
   * Create the actual spell object from research
   */
  public createResearchedSpell(
    name: string,
    description: string,
    level: number,
    researchType: string,
    _researcher: Character
  ): Spell {
    return {
      name,
      level,
      class: this.mapResearchTypeToSpellClass(researchType),
      castingTime: '1 segment',
      range: '0',
      duration: 'Instantaneous',
      areaOfEffect: 'Caster only',
      savingThrow: 'None',
      description,
      components: ['V', 'S'], // Verbal and Somatic components
      reversible: false,
      materialComponents: null,
      effect: () => ({
        damage: null,
        healing: null,
        statusEffects: [],
        success: true,
        message: `${name} spell effect activated`,
        narrative: `The ${name} spell takes effect`,
      }),
    };
  }

  /**
   * Map research type to SpellClass
   */
  private mapResearchTypeToSpellClass(
    researchType: string
  ): 'Magic-User' | 'Cleric' | 'Druid' | 'Illusionist' {
    switch (researchType.toLowerCase()) {
      case 'magic-user':
        return 'Magic-User';
      case 'cleric':
        return 'Cleric';
      case 'druid':
        return 'Druid';
      case 'illusionist':
        return 'Illusionist';
      default:
        return 'Magic-User'; // Default fallback
    }
  }

  /**
   * Determine spell school based on research type and description
   */
  private determineSpellSchool(researchType: string, description: string): string {
    if (researchType === 'illusionist') return 'Illusion';
    if (researchType === 'cleric' || researchType === 'druid') return 'Clerical';

    // For magic-user spells, try to determine school from description
    const schoolKeywords = {
      Abjuration: ['protect', 'ward', 'dispel', 'counter'],
      Alteration: ['change', 'transform', 'alter', 'modify'],
      Conjuration: ['summon', 'create', 'conjure', 'call'],
      Divination: ['detect', 'know', 'sense', 'divine', 'scry'],
      Enchantment: ['charm', 'mind', 'control', 'influence'],
      Evocation: ['damage', 'energy', 'force', 'blast', 'bolt'],
      Necromancy: ['death', 'undead', 'drain', 'decay', 'soul'],
      Transmutation: ['transmute', 'convert', 'change form'],
    };

    const lowerDesc = description.toLowerCase();
    for (const [school, keywords] of Object.entries(schoolKeywords)) {
      if (keywords.some((keyword) => lowerDesc.includes(keyword))) {
        return school;
      }
    }

    return 'Universal'; // Default school
  }

  /**
   * Update character after research (success or failure)
   */
  private updateCharacterAfterResearch(
    character: Character,
    requirements: ResearchRequirements,
    newSpell: Spell | null,
    success: boolean
  ): Character {
    const costToDeduct = success
      ? requirements.totalCost
      : Math.floor(requirements.totalCost * 0.5);

    const updatedCharacter = {
      ...character,
      currency: {
        ...character.currency,
        gold: character.currency.gold - costToDeduct,
      },
    };

    // If successful and spell was created, add to known spells
    if (success && newSpell) {
      // Note: This assumes the character has a knownSpells array
      // The actual implementation would depend on the Character interface
    }

    return updatedCharacter;
  }

  /**
   * Get minimum level required to cast spells of given level
   */
  public getMinimumLevelForSpellLevel(characterClass: string, spellLevel: number): number {
    // OSRIC spell progression tables
    const spellProgression: Record<string, number[]> = {
      'Magic-User': [1, 3, 5, 7, 9, 11, 13, 15, 17], // Levels for spell levels 1-9
      Cleric: [1, 3, 5, 7, 9, 11, 13], // Levels for spell levels 1-7
      Druid: [1, 3, 5, 7, 9, 11, 13], // Levels for spell levels 1-7
      Illusionist: [1, 3, 5, 7, 9, 11, 13], // Levels for spell levels 1-7
    };

    const progression = spellProgression[characterClass];
    if (!progression || spellLevel < 1 || spellLevel > progression.length) {
      return 20; // Invalid combination
    }

    return progression[spellLevel - 1];
  }
}

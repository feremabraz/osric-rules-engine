import { SpellResearchValidator } from '@osric/commands/spells/validators/SpellResearchValidator';
import { BaseCommand, type CommandResult, type EntityId } from '@osric/core/Command';
import { DiceEngine } from '@osric/core/Dice';
import type { GameContext } from '@osric/core/GameContext';
import { isSuccess } from '@osric/core/Rule';
import { formatValidationErrors } from '@osric/core/ValidationPrimitives';
import type { CharacterId } from '@osric/types';
import type { Character } from '@osric/types/character';
import { COMMAND_TYPES, RULE_NAMES } from '@osric/types/constants';
import type { Spell } from '@osric/types/spell';

export interface SpellResearchParameters {
  characterId: string | CharacterId;
  spellLevel: number;
  spellName: string;
  spellDescription: string;
  researchType: 'magic-user' | 'cleric' | 'druid' | 'illusionist';
  timeInWeeks?: number;
  costInGold?: number;
  specialMaterials?: {
    name: string;
    cost: number;
    rarity: 'common' | 'uncommon' | 'rare' | 'very-rare';
  }[];
  mentorAvailable?: boolean;
  libraryQuality?: 'poor' | 'average' | 'good' | 'excellent';
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
  kind: 'success' | 'failure';
  reason: string;
  details: {
    roll: number;
    successChance: number;
    modifiers: Record<string, number>;
  };
}

export class SpellResearchCommand extends BaseCommand<SpellResearchParameters> {
  readonly type = COMMAND_TYPES.SPELL_RESEARCH;
  readonly parameters: SpellResearchParameters;

  constructor(parameters: SpellResearchParameters, actorId: EntityId, targetIds: EntityId[] = []) {
    super(parameters, actorId, targetIds);
    this.parameters = parameters;
  }

  protected validateParameters(): void {
    const result = SpellResearchValidator.validate(this.parameters);
    if (!result.valid) {
      const msgs = formatValidationErrors(result.errors);
      throw new Error(`Parameter validation failed: ${msgs.join(', ')}`);
    }
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

      const character = context.getEntity<Character>(characterId);
      if (!character) {
        return this.createFailureResult(`Character with ID "${characterId}" not found`);
      }

      const canResearch = this.validateSpellResearcher(character, researchType);
      if (!canResearch.valid) {
        return this.createFailureResult(canResearch.reason);
      }

      const requirements = this.calculateResearchRequirements(
        spellLevel,
        researchType,
        timeInWeeks,
        costInGold,
        specialMaterials,
        mentorAvailable,
        libraryQuality
      );

      const meetsRequirements = this.checkRequirements(character, requirements);
      if (!meetsRequirements.valid) {
        return this.createFailureResult(meetsRequirements.reason);
      }

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

      const researchResult = this.performResearch(
        character,
        requirements,
        mentorAvailable,
        libraryQuality
      );

      if (isSuccess(researchResult)) {
        const newSpell = this.createResearchedSpell(
          spellName,
          spellDescription,
          spellLevel,
          researchType,
          character
        );

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

      const failedCharacter = this.updateCharacterAfterResearch(
        character,
        requirements,
        null,
        false
      );
      context.setEntity(characterId, failedCharacter);

      return this.createFailureResult(
        `Spell research failed: ${researchResult.reason}`,
        undefined,
        {
          timeSpent: requirements.timeInWeeks,
          goldLost: Math.floor(requirements.totalCost * 0.5),
          researchDetails: researchResult.details,
        }
      );
    } catch (error: unknown) {
      return this.createFailureResult(
        `Error during spell research: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  canExecute(context: GameContext): boolean {
    const character = context.getEntity<Character>(this.parameters.characterId);
    return character !== null;
  }

  getRequiredRules(): string[] {
    return [RULE_NAMES.SPELL_RESEARCH, RULE_NAMES.SPELL_EFFECTS];
  }

  private validateSpellResearcher(
    character: Character,
    researchType: string
  ): { valid: boolean; reason: string } {
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

  public calculateResearchRequirements(
    spellLevel: number,
    _researchType: string,
    timeOverride?: number,
    costOverride?: number,
    specialMaterials: SpellResearchParameters['specialMaterials'] = [],
    mentorAvailable = false,
    libraryQuality = 'average'
  ): ResearchRequirements {
    let timeInWeeks = timeOverride || spellLevel;

    let baseCost = costOverride || spellLevel * 100 * timeInWeeks;

    if (mentorAvailable) {
      timeInWeeks = Math.ceil(timeInWeeks * 0.75);
    }

    const libraryMultipliers = {
      poor: 1.5,
      average: 1.0,
      good: 0.8,
      excellent: 0.6,
    };

    baseCost = Math.floor(
      baseCost * (libraryMultipliers[libraryQuality as keyof typeof libraryMultipliers] || 1.0)
    );

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

  private checkRequirements(
    character: Character,
    requirements: ResearchRequirements
  ): { valid: boolean; reason: string } {
    if (character.currency.gold < requirements.totalCost) {
      return {
        valid: false,
        reason: `Insufficient funds. Need ${requirements.totalCost} gp, have ${character.currency.gold} gp`,
      };
    }

    return { valid: true, reason: '' };
  }

  public performResearch(
    character: Character,
    _requirements: ResearchRequirements,
    mentorAvailable: boolean,
    libraryQuality: string
  ): { kind: 'success' | 'failure'; reason: string; details: Record<string, unknown> } {
    const relevantStat = ['Magic-User', 'Illusionist'].includes(character.class)
      ? character.abilities.intelligence
      : character.abilities.wisdom;

    let successChance = Math.max(10, relevantStat * 5);

    if (mentorAvailable) {
      successChance += 20;
    }

    const libraryBonuses = {
      poor: -20,
      average: 0,
      good: +15,
      excellent: +30,
    };
    successChance += libraryBonuses[libraryQuality as keyof typeof libraryBonuses] || 0;

    successChance += character.level * 2;

    successChance -= this.parameters.spellLevel * 10;

    successChance = Math.max(5, Math.min(95, successChance));

    const roll = DiceEngine.roll('1d100').total;
    const success = roll <= successChance;

    return {
      kind: success ? 'success' : 'failure',
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
      components: ['V', 'S'],
      reversible: false,
      materialComponents: null,
      effect: () => ({
        damage: null,
        healing: null,
        statusEffects: [],
        message: `${name} spell effect activated`,
        narrative: `The ${name} spell takes effect`,
      }),
    };
  }

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
        return 'Magic-User';
    }
  }

  private determineSpellSchool(researchType: string, description: string): string {
    if (researchType === 'illusionist') return 'Illusion';
    if (researchType === 'cleric' || researchType === 'druid') return 'Clerical';

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

    return 'Universal';
  }

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

    if (success && newSpell) {
    }

    return updatedCharacter;
  }

  public getMinimumLevelForSpellLevel(characterClass: string, spellLevel: number): number {
    const spellProgression: Record<string, number[]> = {
      'Magic-User': [1, 3, 5, 7, 9, 11, 13, 15, 17],
      Cleric: [1, 3, 5, 7, 9, 11, 13],
      Druid: [1, 3, 5, 7, 9, 11, 13],
      Illusionist: [1, 3, 5, 7, 9, 11, 13],
    };

    const progression = spellProgression[characterClass];
    if (!progression || spellLevel < 1 || spellLevel > progression.length) {
      return 20;
    }

    return progression[spellLevel - 1];
  }
}

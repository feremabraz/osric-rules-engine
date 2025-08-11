import type { Command } from '@osric/core/Command';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, type RuleResult } from '@osric/core/Rule';
import type { CharacterId } from '@osric/types';
import { COMMAND_TYPES, RULE_NAMES } from '@osric/types/constants';
import type { Character } from '@osric/types/entities';

interface ThiefSkillCheckParameters {
  characterId: string | CharacterId;
  skillType:
    | 'pick-locks'
    | 'find-traps'
    | 'move-silently'
    | 'hide-shadows'
    | 'hear-noise'
    | 'climb-walls'
    | 'read-languages';
  situationalModifiers?: {
    difficulty?: 'easy' | 'normal' | 'hard' | 'very-hard';
    equipment?: number;
    lighting?: 'bright' | 'dim' | 'dark' | 'pitch-black';
    time?: 'rushed' | 'normal' | 'careful';
    noise?: 'silent' | 'quiet' | 'normal' | 'loud';
    surface?: 'easy' | 'normal' | 'difficult' | 'treacherous';
  };
  targetDifficulty?: number;
}

export class ThiefSkillRule extends BaseRule {
  readonly name = RULE_NAMES.THIEF_SKILLS;
  readonly priority = 500;

  canApply(_context: GameContext, command: Command): boolean {
    return command.type === COMMAND_TYPES.THIEF_SKILL_CHECK;
  }

  async apply(context: GameContext, _command: Command): Promise<RuleResult> {
    const skillData = context.getTemporary<ThiefSkillCheckParameters>(
      'character:thief-skill:params'
    );

    if (!skillData) {
      return this.createFailureResult(
        'No thief skill check data provided',
        undefined,
        false,
        'thief-skill:error'
      );
    }

    try {
      const character = context.getEntity<Character>(skillData.characterId);
      if (!character) {
        return this.createFailureResult(
          `Character ${skillData.characterId} not found`,
          undefined,
          false,
          'thief-skill:error'
        );
      }

      const validationResult = this.validateThiefSkillUse(character, skillData.skillType);
      if (!validationResult.success) {
        return validationResult;
      }

      const skillCalculation = this.calculateSkillChance(character, skillData);

      const specialRules = this.applySpecialRules(character, skillData, skillCalculation);

      return this.createSuccessResult(
        'Thief skill validation complete',
        {
          characterId: skillData.characterId,
          skillType: skillData.skillType,
          baseChance: skillCalculation.baseChance,
          finalChance: skillCalculation.finalChance,
          modifiers: skillCalculation.modifiers,
          specialRules,
          canAttempt: validationResult.canAttempt,
          restrictions: validationResult.restrictions,
        },
        undefined,
        undefined,
        false,
        'thief-skill:calculation'
      );
    } catch (error) {
      return this.createFailureResult(
        `Failed to process thief skill rule: ${error instanceof Error ? error.message : String(error)}`,
        undefined,
        false,
        'thief-skill:error'
      );
    }
  }

  private validateThiefSkillUse(
    character: Character,
    skillType: string
  ): RuleResult & { canAttempt?: boolean; restrictions?: string[] } {
    const characterClass = character.class.toLowerCase();
    const level = character.experience.level;
    const restrictions: string[] = [];

    const hasThiefSkills =
      characterClass === 'thief' ||
      characterClass === 'assassin' ||
      characterClass.includes('thief');

    if (!hasThiefSkills) {
      return {
        ...this.createFailureResult(
          'Character does not have thief skills',
          undefined,
          false,
          'thief-skill:validation'
        ),
        canAttempt: false,
      };
    }

    if (skillType === 'read-languages' && level < 4) {
      return {
        ...this.createFailureResult(
          'Read Languages skill requires level 4 or higher',
          undefined,
          false,
          'thief-skill:validation'
        ),
        canAttempt: false,
      };
    }

    if (characterClass === 'assassin') {
      if (skillType === 'find-traps' && level < 3) {
        restrictions.push('Assassins cannot find traps until level 3');
      }
    }

    const race = character.race.toLowerCase();
    if (race === 'dwarf' && skillType === 'climb-walls') {
      restrictions.push('Dwarves have -10% penalty to climb walls due to their build');
    }

    return {
      ...this.createSuccessResult(
        'Character can use thief skill',
        undefined,
        undefined,
        undefined,
        false,
        'thief-skill:validation'
      ),
      canAttempt: true,
      restrictions,
    };
  }

  private calculateSkillChance(
    character: Character,
    skillData: ThiefSkillCheckParameters
  ): {
    baseChance: number;
    finalChance: number;
    modifiers: Array<{ source: string; modifier: number; description: string }>;
  } {
    const modifiers: Array<{ source: string; modifier: number; description: string }> = [];

    const baseChance = this.getBaseSkillPercentage(character, skillData.skillType, modifiers);
    let finalChance = baseChance;

    if (skillData.situationalModifiers) {
      finalChance = this.applySituationalModifiers(
        finalChance,
        skillData.situationalModifiers,
        skillData.skillType,
        modifiers
      );
    }

    if (skillData.targetDifficulty !== undefined) {
      modifiers.push({
        source: 'override',
        modifier: skillData.targetDifficulty - finalChance,
        description: `Target difficulty override: ${skillData.targetDifficulty}%`,
      });
      finalChance = skillData.targetDifficulty;
    }

    finalChance = Math.max(1, Math.min(99, finalChance));

    return { baseChance, finalChance, modifiers };
  }

  private getBaseSkillPercentage(
    character: Character,
    skillType: string,
    modifiers: Array<{ source: string; modifier: number; description: string }>
  ): number {
    const level = Math.min(character.experience.level, 15);
    const characterClass = character.class.toLowerCase();

    const skillTables: Record<string, number[]> = {
      'pick-locks': [10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80],
      'find-traps': [20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90],
      'move-silently': [15, 21, 27, 33, 40, 47, 55, 62, 70, 78, 85, 93, 99, 99, 99],
      'hide-shadows': [10, 15, 20, 25, 31, 37, 43, 49, 56, 63, 70, 77, 85, 93, 99],
      'hear-noise': [10, 10, 15, 15, 20, 20, 25, 25, 30, 30, 35, 35, 40, 40, 50],
      'climb-walls': [85, 86, 87, 88, 90, 92, 94, 96, 98, 99, 99, 99, 99, 99, 99],
      'read-languages': [0, 0, 0, 0, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70],
    };

    let basePercent = skillTables[skillType]?.[level - 1] || 0;

    const racialMod = this.getRacialModifier(character, skillType);
    if (racialMod !== 0) {
      modifiers.push({
        source: 'racial',
        modifier: racialMod,
        description: `${character.race} racial modifier`,
      });
      basePercent += racialMod;
    }

    const abilityMod = this.getAbilityModifier(character, skillType);
    if (abilityMod !== 0) {
      modifiers.push({
        source: 'ability',
        modifier: abilityMod,
        description: 'Ability score modifier',
      });
      basePercent += abilityMod;
    }

    const classMod = this.getClassModifier(character, skillType);
    if (classMod !== 0) {
      modifiers.push({
        source: 'class',
        modifier: classMod,
        description: `${character.class} class modifier`,
      });
      basePercent += classMod;
    }

    if (characterClass.includes('/')) {
      const penalty = Math.floor(basePercent * -0.2);
      modifiers.push({
        source: 'multi-class',
        modifier: penalty,
        description: 'Multi-class penalty (-20%)',
      });
      basePercent += penalty;
    }

    return Math.max(0, basePercent);
  }

  private applySituationalModifiers(
    baseChance: number,
    situationalMods: NonNullable<ThiefSkillCheckParameters['situationalModifiers']>,
    skillType: string,
    modifiers: Array<{ source: string; modifier: number; description: string }>
  ): number {
    let modifiedChance = baseChance;

    if (situationalMods.difficulty && situationalMods.difficulty !== 'normal') {
      const difficultyMods = {
        easy: 20,
        hard: -20,
        'very-hard': -40,
      };
      const mod = difficultyMods[situationalMods.difficulty as keyof typeof difficultyMods];
      if (mod) {
        modifiers.push({
          source: 'difficulty',
          modifier: mod,
          description: `${situationalMods.difficulty} difficulty`,
        });
        modifiedChance += mod;
      }
    }

    if (situationalMods.equipment) {
      modifiers.push({
        source: 'equipment',
        modifier: situationalMods.equipment,
        description: 'Equipment bonus/penalty',
      });
      modifiedChance += situationalMods.equipment;
    }

    if (situationalMods.time && situationalMods.time !== 'normal') {
      const timeMods = {
        rushed: -20,
        careful: 10,
      };
      const mod = timeMods[situationalMods.time as keyof typeof timeMods];
      if (mod) {
        modifiers.push({
          source: 'time',
          modifier: mod,
          description: `${situationalMods.time} time taken`,
        });
        modifiedChance += mod;
      }
    }

    modifiedChance += this.applyEnvironmentalModifiers(situationalMods, skillType, modifiers);

    return modifiedChance;
  }

  private applyEnvironmentalModifiers(
    situationalMods: NonNullable<ThiefSkillCheckParameters['situationalModifiers']>,
    skillType: string,
    modifiers: Array<{ source: string; modifier: number; description: string }>
  ): number {
    let environmentalMod = 0;

    if (['move-silently', 'hide-shadows'].includes(skillType) && situationalMods.lighting) {
      const lightingMods = {
        bright: -10,
        dim: 0,
        dark: 10,
        'pitch-black': 20,
      };
      const mod = lightingMods[situationalMods.lighting];
      if (mod !== 0) {
        modifiers.push({
          source: 'lighting',
          modifier: mod,
          description: `${situationalMods.lighting} lighting`,
        });
        environmentalMod += mod;
      }
    }

    if (skillType === 'hear-noise' && situationalMods.noise) {
      const noiseMods = {
        silent: 20,
        quiet: 10,
        normal: 0,
        loud: -20,
      };
      const mod = noiseMods[situationalMods.noise];
      if (mod !== 0) {
        modifiers.push({
          source: 'noise',
          modifier: mod,
          description: `${situationalMods.noise} ambient noise`,
        });
        environmentalMod += mod;
      }
    }

    if (skillType === 'climb-walls' && situationalMods.surface) {
      const surfaceMods = {
        easy: 10,
        normal: 0,
        difficult: -15,
        treacherous: -30,
      };
      const mod = surfaceMods[situationalMods.surface];
      if (mod !== 0) {
        modifiers.push({
          source: 'surface',
          modifier: mod,
          description: `${situationalMods.surface} climbing surface`,
        });
        environmentalMod += mod;
      }
    }

    return environmentalMod;
  }

  private getRacialModifier(character: Character, skillType: string): number {
    const race = character.race.toLowerCase();

    const racialMods: Record<string, Record<string, number>> = {
      halfling: {
        'move-silently': 5,
        'hide-shadows': 5,
        'hear-noise': 5,
        'pick-locks': 5,
      },
      elf: {
        'move-silently': 5,
        'hide-shadows': 10,
        'hear-noise': 5,
      },
      'half-elf': {
        'move-silently': 10,
        'hide-shadows': 5,
        'hear-noise': 5,
      },
      dwarf: {
        'climb-walls': -10,
      },
    };

    return racialMods[race]?.[skillType] || 0;
  }

  private getAbilityModifier(character: Character, skillType: string): number {
    if (['pick-locks', 'move-silently', 'hide-shadows'].includes(skillType)) {
      return this.getDexterityModifier(character.abilities.dexterity);
    }

    if (skillType === 'read-languages') {
      return this.getIntelligenceModifier(character.abilities.intelligence);
    }

    return 0;
  }

  private getDexterityModifier(dexterity: number): number {
    if (dexterity >= 17) return 15;
    if (dexterity >= 16) return 10;
    if (dexterity >= 15) return 5;
    if (dexterity >= 9) return 0;
    if (dexterity >= 8) return -10;
    if (dexterity >= 7) return -15;
    return -20;
  }

  private getIntelligenceModifier(intelligence: number): number {
    if (intelligence >= 17) return 10;
    if (intelligence >= 15) return 5;
    if (intelligence >= 13) return 0;
    if (intelligence >= 9) return 0;
    if (intelligence >= 7) return -5;
    return -10;
  }

  private getClassModifier(character: Character, skillType: string): number {
    const characterClass = character.class.toLowerCase();

    if (characterClass === 'assassin') {
      if (skillType === 'move-silently' || skillType === 'hide-shadows') {
        return Math.floor(character.experience.level * 0.5);
      }

      if (skillType === 'climb-walls') {
        return -5;
      }
    }

    return 0;
  }

  private applySpecialRules(
    character: Character,
    skillData: ThiefSkillCheckParameters,
    _skillCalculation: { baseChance: number; finalChance: number }
  ): string[] {
    const specialRules: string[] = [];

    if (skillData.skillType === 'read-languages' && character.experience.level < 4) {
      specialRules.push('Read Languages requires level 4 minimum');
    }

    specialRules.push('Natural 1 always succeeds, natural 100 always fails');

    if (['move-silently', 'hide-shadows', 'climb-walls'].includes(skillData.skillType)) {
      specialRules.push('Heavy armor imposes penalties to this skill');
    }

    if (skillData.skillType === 'find-traps') {
      specialRules.push('Finding traps requires careful searching (1 turn per 10-foot area)');
    }

    if (skillData.skillType === 'pick-locks') {
      specialRules.push("Lock picking requires thieves' tools and takes 1-4 rounds");
    }

    return specialRules;
  }
}

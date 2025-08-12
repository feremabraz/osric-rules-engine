import { ThiefSkillCheckValidator } from '@osric/commands/character/validators/ThiefSkillCheckValidator';
import { BaseCommand, type CommandResult, type EntityId } from '@osric/core/Command';
import { ContextKeys } from '@osric/core/ContextKeys';
import type { GameContext } from '@osric/core/GameContext';
import { formatValidationErrors } from '@osric/core/ValidationPrimitives';
import type { Character } from '@osric/types/character';
import { COMMAND_TYPES, RULE_NAMES } from '@osric/types/constants';

export interface ThiefSkillCheckParameters {
  characterId: string | import('@osric/types').CharacterId;
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

export class ThiefSkillCheckCommand extends BaseCommand<ThiefSkillCheckParameters> {
  readonly type = COMMAND_TYPES.THIEF_SKILL_CHECK;
  readonly parameters: ThiefSkillCheckParameters;

  constructor(
    parameters: ThiefSkillCheckParameters,
    actorId: EntityId = 'game-master',
    targetIds: EntityId[] = []
  ) {
    super(parameters, actorId, targetIds);
    this.parameters = parameters;
  }

  protected validateParameters(): void {
    const result = ThiefSkillCheckValidator.validate(this.parameters);
    if (!result.valid) {
      const msgs = formatValidationErrors(result.errors);
      throw new Error(`Parameter validation failed: ${msgs.join(', ')}`);
    }
  }

  async execute(context: GameContext): Promise<CommandResult> {
    try {
      const { characterId } = this.parameters;

      const character = context.getEntity<Character>(characterId);
      if (!character) {
        return this.createFailureResult(`Character with ID "${characterId}" not found`);
      }

      if (!this.canUseThiefSkills(character)) {
        return this.createFailureResult(
          `${character.name} does not have thief skills (must be Thief, Assassin, or multi-class with Thief)`
        );
      }

      // Normalize temporary key to the convention used by rules
      context.setTemporary(ContextKeys.THIEF_SKILL_PARAMS, this.parameters);

      // Publish params for rules and delegate to RuleEngine
      return await this.executeWithRuleEngine(context);
    } catch (error) {
      return this.createFailureResult(
        `Failed to perform thief skill check: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  canExecute(context: GameContext): boolean {
    if (!this.validateEntitiesExist(context)) {
      return false;
    }

    const character = context.getEntity<Character>(this.parameters.characterId);
    if (!character) {
      return false;
    }

    return this.canUseThiefSkills(character);
  }

  getRequiredRules(): string[] {
    return [RULE_NAMES.THIEF_SKILLS];
  }

  private canUseThiefSkills(character: Character): boolean {
    const characterClass = character.class.toLowerCase();

    if (characterClass === 'thief' || characterClass === 'assassin') {
      return true;
    }

    if (characterClass.includes('thief')) {
      return true;
    }

    return false;
  }

  private getBaseSkillPercentage(character: Character, skillType: string): number {
    const level = character.experience.level;
    const characterClass = character.class.toLowerCase();

    const thiefSkillTable: Record<string, number[]> = {
      'pick-locks': [10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80],
      'find-traps': [20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90],
      'move-silently': [15, 21, 27, 33, 40, 47, 55, 62, 70, 78, 85, 93, 99, 99, 99],
      'hide-shadows': [10, 15, 20, 25, 31, 37, 43, 49, 56, 63, 70, 77, 85, 93, 99],
      'hear-noise': [10, 10, 15, 15, 20, 20, 25, 25, 30, 30, 35, 35, 40, 40, 50],
      'climb-walls': [85, 86, 87, 88, 90, 92, 94, 96, 98, 99, 99, 99, 99, 99, 99],
      'read-languages': [0, 0, 0, 0, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70],
    };

    const tableLevel = Math.min(level, 15);
    const skillProgression = thiefSkillTable[skillType];

    if (!skillProgression) {
      return 0;
    }

    let basePercent = skillProgression[tableLevel - 1] || 0;

    basePercent += this.getRacialModifier(character, skillType);

    if (this.isDexterityBasedSkill(skillType)) {
      basePercent += this.getDexterityModifier(character.abilities.dexterity);
    }

    if (characterClass === 'assassin') {
      basePercent = this.getAssassinSkillModifier(basePercent, skillType);
    }

    if (characterClass.includes('/')) {
      basePercent = Math.floor(basePercent * 0.8);
    }

    return Math.max(0, Math.min(99, basePercent));
  }

  private applyModifiers(
    basePercent: number,
    modifiers: ThiefSkillCheckParameters['situationalModifiers'],
    skillType: string
  ): number {
    let modifiedPercent = basePercent;

    if (!modifiers) return modifiedPercent;

    if (modifiers.difficulty) {
      const difficultyMod = {
        easy: +20,
        normal: 0,
        hard: -20,
        'very-hard': -40,
      }[modifiers.difficulty];
      modifiedPercent += difficultyMod;
    }

    if (modifiers.equipment) {
      modifiedPercent += modifiers.equipment;
    }

    if (modifiers.time) {
      const timeMod = {
        rushed: -20,
        normal: 0,
        careful: +10,
      }[modifiers.time];
      modifiedPercent += timeMod;
    }

    modifiedPercent += this.getSkillSpecificModifiers(modifiers, skillType);

    return Math.max(1, Math.min(99, modifiedPercent));
  }

  private getSkillSpecificModifiers(
    modifiers: ThiefSkillCheckParameters['situationalModifiers'],
    skillType: string
  ): number {
    let modifier = 0;

    if ((skillType === 'move-silently' || skillType === 'hide-shadows') && modifiers?.lighting) {
      const lightingMod = {
        bright: -10,
        dim: 0,
        dark: +10,
        'pitch-black': +20,
      }[modifiers.lighting];
      modifier += lightingMod;
    }

    if (skillType === 'hear-noise' && modifiers?.noise) {
      const noiseMod = {
        silent: +20,
        quiet: +10,
        normal: 0,
        loud: -20,
      }[modifiers.noise];
      modifier += noiseMod;
    }

    if (skillType === 'climb-walls' && modifiers?.surface) {
      const surfaceMod = {
        easy: +10,
        normal: 0,
        difficult: -15,
        treacherous: -30,
      }[modifiers.surface];
      modifier += surfaceMod;
    }

    return modifier;
  }

  private getRacialModifier(character: Character, skillType: string): number {
    const race = character.race.toLowerCase();

    const racialModifiers: Record<string, Record<string, number>> = {
      halfling: {
        'move-silently': +5,
        'hide-shadows': +5,
        'hear-noise': +5,
        'pick-locks': +5,
      },
      elf: {
        'move-silently': +5,
        'hide-shadows': +10,
        'hear-noise': +5,
      },
      'half-elf': {
        'move-silently': +10,
        'hide-shadows': +5,
        'hear-noise': +5,
      },
    };

    return racialModifiers[race]?.[skillType] || 0;
  }

  private isDexterityBasedSkill(skillType: string): boolean {
    return ['pick-locks', 'move-silently', 'hide-shadows'].includes(skillType);
  }

  private getDexterityModifier(dexterity: number): number {
    if (dexterity >= 17) return +15;
    if (dexterity >= 16) return +10;
    if (dexterity >= 15) return +5;
    if (dexterity >= 9) return 0;
    if (dexterity >= 8) return -10;
    if (dexterity >= 7) return -15;
    return -20;
  }

  private getAssassinSkillModifier(basePercent: number, skillType: string): number {
    switch (skillType) {
      case 'move-silently':
      case 'hide-shadows':
        return Math.floor(basePercent * 1.1);
      case 'climb-walls':
        return Math.floor(basePercent * 0.9);
      default:
        return basePercent;
    }
  }

  private getModifierDescriptions(
    modifiers: ThiefSkillCheckParameters['situationalModifiers'],
    skillType: string
  ): string[] {
    const descriptions: string[] = [];

    if (!modifiers) return descriptions;

    if (modifiers.difficulty && modifiers.difficulty !== 'normal') {
      descriptions.push(`Difficulty: ${modifiers.difficulty}`);
    }

    if (modifiers.equipment) {
      descriptions.push(`Equipment: ${modifiers.equipment > 0 ? '+' : ''}${modifiers.equipment}%`);
    }

    if (modifiers.time && modifiers.time !== 'normal') {
      descriptions.push(`Time: ${modifiers.time}`);
    }

    if (modifiers.lighting && ['move-silently', 'hide-shadows'].includes(skillType)) {
      descriptions.push(`Lighting: ${modifiers.lighting}`);
    }

    if (modifiers.noise && skillType === 'hear-noise') {
      descriptions.push(`Noise level: ${modifiers.noise}`);
    }

    if (modifiers.surface && skillType === 'climb-walls') {
      descriptions.push(`Surface: ${modifiers.surface}`);
    }

    return descriptions;
  }
}

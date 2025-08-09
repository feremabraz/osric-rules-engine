import type { Command } from '@osric/core/Command';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, type RuleResult } from '@osric/core/Rule';
import { COMMAND_TYPES, RULE_NAMES } from '@osric/types/constants';
import type { AbilityScores, CharacterClass, CharacterRace } from '@osric/types/entities';

interface CharacterCreationData {
  abilityScoreMethod: 'standard3d6' | 'arranged3d6' | '4d6dropLowest';
  race: CharacterRace;
  characterClass: CharacterClass;
  arrangedScores?: AbilityScores;
}

export class AbilityScoreGenerationRule extends BaseRule {
  readonly name = RULE_NAMES.ABILITY_SCORE_GENERATION;
  readonly priority = 10;

  async execute(context: GameContext, _command: Command): Promise<RuleResult> {
    const creationData = this.getRequiredContext<CharacterCreationData>(
      context,
      'character:creation:params'
    );

    try {
      let abilityScores: AbilityScores;

      switch (creationData.abilityScoreMethod) {
        case 'standard3d6':
          abilityScores = this.generateStandard3d6();
          break;
        case 'arranged3d6':
          if (creationData.arrangedScores) {
            abilityScores = creationData.arrangedScores;
          } else {
            const rolledScores = this.generate3d6Arranged();

            abilityScores = this.assignArrangedScores(rolledScores);
          }
          break;
        case '4d6dropLowest': {
          const bestScores = this.generate4d6DropLowest();
          abilityScores = this.assignArrangedScores(bestScores);
          break;
        }
        default:
          return this.createFailureResult(
            `Unknown ability score method: ${creationData.abilityScoreMethod}`
          );
      }

      this.setContext(context, 'character:creation:ability-scores', abilityScores);

      return this.createSuccessResult(
        `Generated ability scores using ${creationData.abilityScoreMethod}`,
        {
          abilityScores,
          method: creationData.abilityScoreMethod,
        }
      );
    } catch (error) {
      return this.createFailureResult(
        `Ability score generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  canApply(context: GameContext, command: Command): boolean {
    if (command.type !== COMMAND_TYPES.CREATE_CHARACTER) return false;

    const creationData = context.getTemporary('character:creation:context');
    return creationData != null;
  }

  private generateStandard3d6(): AbilityScores {
    const rollDice = () => Math.floor(Math.random() * 6) + 1;
    const roll3d6 = () => rollDice() + rollDice() + rollDice();

    return {
      strength: roll3d6(),
      dexterity: roll3d6(),
      constitution: roll3d6(),
      intelligence: roll3d6(),
      wisdom: roll3d6(),
      charisma: roll3d6(),
    };
  }

  private generate3d6Arranged(): number[] {
    const rollDice = () => Math.floor(Math.random() * 6) + 1;
    const roll3d6 = () => rollDice() + rollDice() + rollDice();

    return Array(6)
      .fill(0)
      .map(() => roll3d6());
  }

  private generate4d6DropLowest(): number[] {
    const rollDice = () => Math.floor(Math.random() * 6) + 1;

    const roll4d6DropLowest = () => {
      const rolls = [rollDice(), rollDice(), rollDice(), rollDice()];
      const minRoll = Math.min(...rolls);
      const minIndex = rolls.indexOf(minRoll);
      return rolls.reduce((sum, val, index) => (index !== minIndex ? sum + val : sum), 0);
    };

    return Array(6)
      .fill(0)
      .map(() => roll4d6DropLowest());
  }

  private assignArrangedScores(scores: number[]): AbilityScores {
    if (scores.length !== 6) {
      throw new Error('Expected exactly 6 ability scores');
    }

    return {
      strength: scores[0],
      dexterity: scores[1],
      constitution: scores[2],
      intelligence: scores[3],
      wisdom: scores[4],
      charisma: scores[5],
    };
  }
}

export class ExceptionalStrengthRule extends BaseRule {
  readonly name = RULE_NAMES.ABILITY_SCORE_MODIFIERS;
  readonly priority = 15;

  async execute(context: GameContext, _command: Command): Promise<RuleResult> {
    const creationData = context.getTemporary(
      'character:creation:context'
    ) as CharacterCreationData;
    const abilityScores = context.getTemporary(
      'character:creation:ability-scores'
    ) as AbilityScores;

    if (!abilityScores) {
      return this.createFailureResult('No ability scores found for exceptional strength check');
    }

    const exceptionalStrength = this.rollExceptionalStrength(
      creationData.characterClass,
      abilityScores.strength
    );

    if (exceptionalStrength !== null) {
      context.setTemporary('character:creation:exceptional-strength', exceptionalStrength);

      return this.createSuccessResult(
        `Rolled exceptional strength: 18/${exceptionalStrength.toString().padStart(2, '0')}`,
        { exceptionalStrength }
      );
    }

    return this.createSuccessResult('No exceptional strength applicable');
  }

  canApply(context: GameContext, command: Command): boolean {
    if (command.type !== COMMAND_TYPES.CREATE_CHARACTER) return false;

    const abilityScores = context.getTemporary(
      'character:creation:ability-scores'
    ) as AbilityScores;
    const creationData = context.getTemporary(
      'character:creation:context'
    ) as CharacterCreationData;

    return (
      abilityScores?.strength === 18 &&
      creationData &&
      this.canHaveExceptionalStrength(creationData.characterClass)
    );
  }

  private rollExceptionalStrength(characterClass: CharacterClass, strength: number): number | null {
    if (!this.canHaveExceptionalStrength(characterClass)) {
      return null;
    }

    if (strength !== 18) {
      return null;
    }

    const roll = Math.floor(Math.random() * 100) + 1;
    return roll;
  }

  private canHaveExceptionalStrength(characterClass: CharacterClass): boolean {
    return ['Fighter', 'Paladin', 'Ranger'].includes(characterClass);
  }
}

export class RacialAbilityAdjustmentRule extends BaseRule {
  readonly name = RULE_NAMES.RACIAL_ABILITIES;
  readonly priority = 20;

  async execute(context: GameContext, _command: Command): Promise<RuleResult> {
    const creationData = context.getTemporary(
      'character:creation:context'
    ) as CharacterCreationData;
    const abilityScores = context.getTemporary(
      'character:creation:ability-scores'
    ) as AbilityScores;

    if (!abilityScores) {
      return this.createFailureResult('No ability scores found for racial adjustment');
    }

    const adjustedScores = this.applyRacialAbilityAdjustments(abilityScores, creationData.race);

    const meetsRequirements = this.meetsRacialRequirements(adjustedScores, creationData.race);

    if (!meetsRequirements) {
      return this.createFailureResult(
        `Character does not meet racial ability requirements for ${creationData.race}`,
        undefined,
        true
      );
    }

    context.setTemporary('character:creation:adjusted-scores', adjustedScores);

    const adjustmentMessage = this.getAdjustmentMessage(
      abilityScores,
      adjustedScores,
      creationData.race
    );

    return this.createSuccessResult(
      `Applied racial adjustments for ${creationData.race}${adjustmentMessage}`,
      {
        originalScores: abilityScores,
        adjustedScores,
        race: creationData.race,
      }
    );
  }

  canApply(context: GameContext, command: Command): boolean {
    if (command.type !== 'create-character') return false;

    const abilityScores = context.getTemporary('character:creation:ability-scores');
    const creationData = context.getTemporary('character:creation:context');

    return abilityScores != null && creationData != null;
  }

  private applyRacialAbilityAdjustments(
    abilityScores: AbilityScores,
    race: CharacterRace
  ): AbilityScores {
    const newScores = { ...abilityScores };

    switch (race) {
      case 'Dwarf':
        newScores.constitution += 1;
        newScores.charisma -= 1;
        break;
      case 'Elf':
        newScores.dexterity += 1;
        newScores.constitution -= 1;
        break;
      case 'Halfling':
        newScores.strength -= 1;
        newScores.dexterity += 1;
        break;
      case 'Half-Orc':
        newScores.strength += 1;
        newScores.constitution += 1;
        newScores.charisma -= 2;
        break;
    }

    for (const key of Object.keys(newScores)) {
      const ability = key as keyof AbilityScores;
      if (newScores[ability] < 3) newScores[ability] = 3;
      if (newScores[ability] > 18) newScores[ability] = 18;
    }

    return newScores;
  }

  private meetsRacialRequirements(abilityScores: AbilityScores, race: CharacterRace): boolean {
    switch (race) {
      case 'Dwarf':
        return (
          abilityScores.strength >= 8 &&
          abilityScores.dexterity >= 3 &&
          abilityScores.constitution >= 12 &&
          abilityScores.intelligence >= 3 &&
          abilityScores.wisdom >= 3 &&
          abilityScores.charisma >= 3
        );
      case 'Elf':
        return (
          abilityScores.strength >= 3 &&
          abilityScores.dexterity >= 7 &&
          abilityScores.constitution >= 8 &&
          abilityScores.intelligence >= 8 &&
          abilityScores.wisdom >= 3 &&
          abilityScores.charisma >= 8
        );
      case 'Gnome':
        return (
          abilityScores.strength >= 6 &&
          abilityScores.dexterity >= 3 &&
          abilityScores.constitution >= 8 &&
          abilityScores.intelligence >= 7 &&
          abilityScores.wisdom >= 3 &&
          abilityScores.charisma >= 3
        );
      case 'Half-Elf':
        return (
          abilityScores.strength >= 3 &&
          abilityScores.dexterity >= 6 &&
          abilityScores.constitution >= 6 &&
          abilityScores.intelligence >= 4 &&
          abilityScores.wisdom >= 3 &&
          abilityScores.charisma >= 3
        );
      case 'Halfling':
        return (
          abilityScores.strength >= 6 &&
          abilityScores.dexterity >= 8 &&
          abilityScores.constitution >= 10 &&
          abilityScores.intelligence >= 6 &&
          abilityScores.wisdom >= 3 &&
          abilityScores.charisma >= 3
        );
      case 'Half-Orc':
        return (
          abilityScores.strength >= 6 &&
          abilityScores.dexterity >= 3 &&
          abilityScores.constitution >= 13 &&
          abilityScores.intelligence >= 3 &&
          abilityScores.wisdom >= 3 &&
          abilityScores.charisma >= 3
        );
      case 'Human':
        return true;
      default:
        return false;
    }
  }

  private getAdjustmentMessage(
    original: AbilityScores,
    adjusted: AbilityScores,
    _race: CharacterRace
  ): string {
    const changes: string[] = [];

    for (const ability of [
      'strength',
      'dexterity',
      'constitution',
      'intelligence',
      'wisdom',
      'charisma',
    ] as const) {
      const diff = adjusted[ability] - original[ability];
      if (diff !== 0) {
        const sign = diff > 0 ? '+' : '';
        changes.push(`${ability} ${sign}${diff}`);
      }
    }

    return changes.length > 0 ? ` (${changes.join(', ')})` : ' (no adjustments)';
  }
}

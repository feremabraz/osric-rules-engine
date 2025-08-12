import { FallingDamageValidator } from '@osric/commands/exploration/validators/FallingDamageValidator';
import { BaseCommand, type CommandResult, type EntityId } from '@osric/core/Command';
import { DiceEngine } from '@osric/core/Dice';
import type { GameContext } from '@osric/core/GameContext';
import { isFailure, isSuccess } from '@osric/core/Rule';
import { formatValidationErrors } from '@osric/core/ValidationPrimitives';
import type { CharacterId } from '@osric/types';
import type { Character } from '@osric/types/character';
import { COMMAND_TYPES } from '@osric/types/constants';

export interface FallingDamageParameters {
  characterId: string | CharacterId;
  fallDistance: number;
  surfaceType?: 'soft' | 'normal' | 'hard' | 'spikes';
  circumstances?: {
    intentional?: boolean;
    hasFeatherFall?: boolean;
    encumbrance?: 'light' | 'moderate' | 'heavy' | 'severe';
    dexterityCheck?: boolean;
  };
  savingThrow?: boolean;
  description?: string;
}

export class FallingDamageCommand extends BaseCommand<FallingDamageParameters> {
  readonly type = COMMAND_TYPES.FALLING_DAMAGE;
  readonly parameters: FallingDamageParameters;

  constructor(parameters: FallingDamageParameters, actorId: EntityId, targetIds: EntityId[] = []) {
    super(parameters, actorId, targetIds);
    this.parameters = parameters;
  }

  protected validateParameters(): void {
    const result = FallingDamageValidator.validate(this.parameters);
    if (!result.valid) {
      const msgs = formatValidationErrors(result.errors);
      throw new Error(`Parameter validation failed: ${msgs.join(', ')}`);
    }
  }

  async execute(context: GameContext): Promise<CommandResult> {
    try {
      const { characterId, fallDistance, surfaceType, circumstances, savingThrow, description } =
        this.parameters;

      const character = context.getEntity<Character>(characterId);
      if (!character) {
        return this.createFailureResult(`Character with ID "${characterId}" not found`);
      }

      if (fallDistance < 0) {
        return this.createFailureResult('Fall distance must be positive');
      }

      if (fallDistance < 10) {
        return this.createSuccessResult(
          `${character.name} falls ${fallDistance} feet but takes no damage (less than 10 feet)`,
          {
            characterId,
            fallDistance,
            damage: 0,
            description: description || `Short fall of ${fallDistance} feet`,
          }
        );
      }

      context.setTemporary('falling-damage-params', this.parameters);

      if (circumstances?.hasFeatherFall) {
        return this.createSuccessResult(
          `${character.name} falls ${fallDistance} feet but takes no damage (Feather Fall effect)`,
          {
            characterId,
            fallDistance,
            damage: 0,
            description: 'Protected by Feather Fall spell',
            specialEffect: 'feather-fall',
          }
        );
      }

      const damageCalculation = this.calculateFallingDamage(
        fallDistance,
        surfaceType,
        circumstances
      );

      let finalDamage = damageCalculation.baseDamage;
      const modifiers: string[] = [];

      if (circumstances?.dexterityCheck) {
        const dexCheck = this.performDexterityCheck(character);
        if (isSuccess(dexCheck)) {
          finalDamage = Math.floor(finalDamage / 2);
          modifiers.push(`Dexterity check success: damage halved (rolled ${dexCheck.roll})`);
        } else {
          modifiers.push(`Dexterity check failed (rolled ${dexCheck.roll})`);
        }
      }

      if (damageCalculation.surfaceModifier !== 1) {
        const originalDamage = finalDamage;
        finalDamage = Math.floor(finalDamage * damageCalculation.surfaceModifier);
        modifiers.push(`${surfaceType} surface: ${originalDamage} → ${finalDamage} damage`);
      }

      type DeathSave =
        | { required: true; kind: 'success' | 'failure'; roll: number }
        | { required: false };
      let deathSave: DeathSave = { required: false };
      if (savingThrow && finalDamage >= character.hitPoints.current) {
        const ds = this.performDeathSave(character);
        deathSave = ds;
        if (isSuccess(ds)) {
          modifiers.push(`Death save success: survives at 1 HP (rolled ${ds.roll})`);
          finalDamage = character.hitPoints.current - 1;
        } else {
          modifiers.push(`Death save failed: fatal fall (rolled ${ds.roll})`);
        }
      }

      const newHitPoints = Math.max(0, character.hitPoints.current - finalDamage);
      const updatedCharacter = {
        ...character,
        hitPoints: {
          current: newHitPoints,
          maximum: character.hitPoints.maximum,
        },
      };

      context.setEntity(characterId, updatedCharacter);

      const fallDescription = description || `${fallDistance}-foot fall`;
      let resultMessage: string;

      if (newHitPoints <= 0 && deathSave.required && isFailure(deathSave)) {
        resultMessage = `${character.name} dies from the ${fallDescription} (${finalDamage} damage)`;
      } else if (newHitPoints <= 0) {
        resultMessage = `${character.name} is knocked unconscious by the ${fallDescription} (${finalDamage} damage)`;
      } else {
        resultMessage = `${character.name} takes ${finalDamage} damage from the ${fallDescription}`;
      }

      return this.createSuccessResult(resultMessage, {
        characterId,
        fallDistance,
        baseDamage: damageCalculation.baseDamage,
        finalDamage,
        surfaceType: surfaceType || 'normal',
        newHitPoints,
        wasKnockedOut: newHitPoints <= 0,
        died: newHitPoints <= 0 && deathSave.required && isFailure(deathSave),
        modifiers,
        diceRolled: damageCalculation.diceRolled,
        deathSave,
        description: fallDescription,
      });
    } catch (error) {
      return this.createFailureResult(
        `Failed to calculate falling damage: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  canExecute(context: GameContext): boolean {
    return this.validateEntitiesExist(context);
  }

  getRequiredRules(): string[] {
    return ['falling-damage'];
  }

  private calculateFallingDamage(
    fallDistance: number,
    surfaceType: FallingDamageParameters['surfaceType'] = 'normal',
    circumstances?: FallingDamageParameters['circumstances']
  ): {
    baseDamage: number;
    diceRolled: Array<{ die: number; result: number }>;
    surfaceModifier: number;
  } {
    const tenFootIncrements = Math.floor(fallDistance / 10);
    const diceRolled: Array<{ die: number; result: number }> = [];
    let totalDamage = 0;

    for (let i = 0; i < tenFootIncrements; i++) {
      const roll = DiceEngine.roll('1d6').total;
      diceRolled.push({ die: i + 1, result: roll });
      totalDamage += roll;
    }

    if (tenFootIncrements > 20) {
      const extraIncrements = tenFootIncrements - 20;
      diceRolled.push({ die: -1, result: extraIncrements * 3 });
      totalDamage += extraIncrements * 3;
    }

    if (circumstances?.intentional && fallDistance <= 30) {
      totalDamage = Math.max(0, totalDamage - 2);
    }

    if (circumstances?.encumbrance) {
      const encumbrancePenalty = {
        light: 0,
        moderate: 1,
        heavy: 2,
        severe: 4,
      }[circumstances.encumbrance];
      totalDamage += encumbrancePenalty;
    }

    const surfaceModifier = this.getSurfaceModifier(surfaceType);

    return {
      baseDamage: totalDamage,
      diceRolled,
      surfaceModifier,
    };
  }

  private getSurfaceModifier(surfaceType: string): number {
    switch (surfaceType) {
      case 'soft':
        return 0.5;
      case 'normal':
        return 1.0;
      case 'hard':
        return 1.5;
      case 'spikes':
        return 2.0;
      default:
        return 1.0;
    }
  }

  private performDexterityCheck(character: Character): {
    kind: 'success' | 'failure';
    roll: number;
  } {
    const targetNumber = character.abilities.dexterity;
    const roll = DiceEngine.roll('1d20').total;

    return {
      kind: roll <= targetNumber ? 'success' : 'failure',
      roll,
    };
  }

  private performDeathSave(character: Character): {
    required: boolean;
    kind: 'success' | 'failure';
    roll: number;
  } {
    const roll = DiceEngine.roll('1d20').total;

    const characterClass = character.class.toLowerCase();
    let saveTarget = 14;

    if (
      characterClass === 'fighter' ||
      characterClass === 'paladin' ||
      characterClass === 'ranger'
    ) {
      saveTarget = 12;
    } else if (characterClass === 'cleric' || characterClass === 'druid') {
      saveTarget = 10;
    } else if (characterClass === 'magic-user' || characterClass === 'illusionist') {
      saveTarget = 16;
    } else if (characterClass === 'thief' || characterClass === 'assassin') {
      saveTarget = 13;
    }

    const conModifier = this.getConstitutionSaveModifier(character.abilities.constitution);
    const finalTarget = saveTarget + conModifier;

    return {
      required: true,
      kind: roll >= finalTarget ? 'success' : 'failure',
      roll,
    };
  }

  private getConstitutionSaveModifier(constitution: number): number {
    if (constitution >= 17) return -4;
    if (constitution >= 16) return -3;
    if (constitution >= 15) return -2;
    if (constitution >= 14) return -1;
    if (constitution >= 7) return 0;
    if (constitution >= 4) return 1;
    return 2;
  }
}

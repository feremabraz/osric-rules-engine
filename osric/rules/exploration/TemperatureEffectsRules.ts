import type { Command } from '@osric/core/Command';
import { DiceEngine } from '@osric/core/Dice';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, type RuleResult } from '@osric/core/Rule';
import type { Character } from '@osric/types/character';
import { COMMAND_TYPES, RULE_NAMES } from '@osric/types/constants';

interface TemperatureCheckParams {
  characterId: string;
  temperature: 'freezing' | 'cold' | 'cool' | 'mild' | 'warm' | 'hot' | 'scorching';
  exposureTime?: number; // in hours
  activityType?: 'rest' | 'travel' | 'combat' | 'foraging';
}

export class TemperatureEffectsRules extends BaseRule {
  readonly name = RULE_NAMES.TEMPERATURE_EFFECTS;
  readonly priority = 10;

  canApply(_context: GameContext, command: Command): boolean {
    return command.type === COMMAND_TYPES.TEMPERATURE_CHECK;
  }

  async apply(context: GameContext, command: Command): Promise<RuleResult> {
    const {
      characterId,
      temperature,
      exposureTime = 1,
      activityType = 'travel',
    } = command.parameters as unknown as TemperatureCheckParams;

    const character = context.getEntity<Character>(characterId);
    if (!character) {
      return this.createFailureResult(
        `Character with ID "${characterId}" not found`,
        undefined,
        true
      );
    }

    const protection = this.getProtectionLevel(character, temperature);
    const activityMod = this.getActivityModifier(activityType);

    const { damage, notes } = this.calculateTemperatureDamage(
      temperature,
      exposureTime,
      protection,
      activityMod
    );

    if (damage > 0) {
      const updated = {
        ...character,
        hitPoints: {
          ...character.hitPoints,
          current: Math.max(0, character.hitPoints.current - damage),
        },
      };
      context.setEntity(character.id, updated);
    }

    return this.createSuccessResult('Temperature effects resolved', {
      characterId,
      temperature,
      exposureTime,
      protection,
      activityType,
      damage,
      notes,
    });
  }

  private getProtectionLevel(
    character: Character,
    temperature: TemperatureCheckParams['temperature']
  ): 'none' | 'light' | 'moderate' | 'heavy' {
    const inv = character.inventory.map((i) => i.name.toLowerCase());
    const hasCloak = inv.some((n) => n.includes('cloak'));
    const hasFur = inv.some((n) => n.includes('fur'));
    const hasResist = inv.some((n) => n.includes('resist'));
    const hasHat = inv.some((n) => n.includes('hat') || n.includes('hood'));

    if (temperature === 'freezing' || temperature === 'cold') {
      if (hasFur && hasCloak) return 'heavy';
      if (hasCloak) return 'moderate';
      return 'none';
    }

    if (temperature === 'hot' || temperature === 'scorching') {
      if (hasHat && hasCloak) return 'moderate';
      if (hasHat) return 'light';
      return 'none';
    }

    if (hasResist) return 'heavy';
    return 'light';
  }

  private getActivityModifier(
    activity: NonNullable<TemperatureCheckParams['activityType']>
  ): number {
    switch (activity) {
      case 'combat':
        return 2;
      case 'foraging':
        return 1.5;
      case 'travel':
        return 1.25;
      default:
        return 1;
    }
  }

  private calculateTemperatureDamage(
    temperature: TemperatureCheckParams['temperature'],
    exposureTime: number,
    protection: ReturnType<TemperatureEffectsRules['getProtectionLevel']>,
    activityMod: number
  ): { damage: number; notes: string[] } {
    let damage = 0;
    const notes: string[] = [];

    const step = Math.max(1, Math.floor(exposureTime));

    for (let hour = 0; hour < step; hour++) {
      switch (temperature) {
        case 'freezing': {
          const base = 2; // baseline 2 HP per hour
          const prot = protection === 'heavy' ? 0 : protection === 'moderate' ? 1 : 2;
          const roll = DiceEngine.roll('1d4').total; // variability
          damage += Math.max(0, Math.floor((base + prot + roll - 2) * activityMod));
          notes.push('Freezing exposure');
          break;
        }
        case 'cold': {
          const base = 1;
          const prot = protection === 'heavy' ? 0 : protection === 'moderate' ? 0 : 1;
          const roll = DiceEngine.roll('1d3').total;
          damage += Math.max(0, Math.floor((base + prot + Math.floor(roll / 2)) * activityMod));
          notes.push('Cold exposure');
          break;
        }
        case 'hot':
        case 'scorching': {
          const base = temperature === 'scorching' ? 2 : 1;
          const prot = protection === 'heavy' ? 0 : protection === 'moderate' ? 1 : 2;
          const roll = DiceEngine.roll('1d4').total;
          damage += Math.max(0, Math.floor((base + prot + roll - 2) * activityMod));
          notes.push('Heat exposure');
          break;
        }
        default:
          break;
      }
    }

    return { damage, notes };
  }
}

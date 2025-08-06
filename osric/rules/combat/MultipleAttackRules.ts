import type { Command } from '@osric/core/Command';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, type RuleResult } from '@osric/core/Rule';
import { COMMAND_TYPES } from '@osric/types/constants';
import type {
  Character as CharacterData,
  CombatResult,
  Monster as MonsterData,
  Weapon,
} from '@osric/types/entities';

interface AttackContext {
  attacker: CharacterData | MonsterData;
  target: CharacterData | MonsterData;
  weapon?: Weapon;
  attackType?: string;
  situationalModifiers?: number;
  isChargedAttack?: boolean;
  multipleAttacks?: boolean;
  roundState?: {
    currentRound: number;
    fractionalAttacksCarriedOver: number;
  };
}

export enum AttackSequence {
  FIRST = 'first',
  SUBSEQUENT = 'subsequent',
  FINAL = 'final',
}

export class MultipleAttackRule extends BaseRule {
  name = 'multiple-attack';

  async execute(context: GameContext, _command: Command): Promise<RuleResult> {
    const attackContext = context.getTemporary('attack-context') as AttackContext;

    if (!attackContext) {
      return this.createFailureResult('No attack context found');
    }

    const { attacker, target, weapon } = attackContext;

    const attacksPerRound = this.getAttacksPerRound(attacker, weapon, target);

    if (attacksPerRound <= 1) {
      context.setTemporary('attacks-this-round', 1);
      return this.createSuccessResult('Single attack - no multiple attack processing needed');
    }

    const results = this.resolveMultipleAttacks(attackContext, attacksPerRound);

    context.setTemporary('multiple-attack-results', results.results);
    context.setTemporary('fractional-attacks-carried', results.fractionalAttacksCarriedOver);
    context.setTemporary('attacks-this-round', results.results.length);

    return this.createSuccessResult(
      `Multiple attacks resolved: ${results.results.length} attacks executed`,
      undefined,
      undefined,
      undefined,
      true
    );
  }

  canApply(context: GameContext, command: Command): boolean {
    if (command.type !== COMMAND_TYPES.ATTACK) return false;

    const attackContext = context.getTemporary('attack-context') as AttackContext;
    if (!attackContext) return false;

    const attacksPerRound = this.getAttacksPerRound(
      attackContext.attacker,
      attackContext.weapon,
      attackContext.target
    );

    return attacksPerRound > 1 || attackContext.multipleAttacks === true;
  }

  private getAttacksPerRound(
    attacker: CharacterData | MonsterData,
    weapon?: Weapon,
    target?: CharacterData | MonsterData
  ): number {
    if ('hitDice' in attacker) {
      return attacker.damagePerAttack ? attacker.damagePerAttack.length : 1;
    }

    const character = attacker as CharacterData;

    const isFighterClass = ['Fighter', 'Paladin', 'Ranger'].includes(character.class);

    if (isFighterClass && target && this.hasLessThanOneHD(target)) {
      return character.level;
    }

    let attacksPerRound = 1;

    if (isFighterClass) {
      if (character.level >= 13) {
        attacksPerRound = 2;
      } else if (character.level >= 7) {
        attacksPerRound = 1.5;
      }
    }

    if (weapon && character.weaponSpecializations) {
      const specialization = character.weaponSpecializations.find(
        (spec) => spec.weapon.toLowerCase() === weapon.name.toLowerCase()
      );

      if (specialization) {
        const specializationLevel = specialization.bonuses.attackRate || 1;

        attacksPerRound = this.getSpecializedAttackRate(
          character.level,
          specializationLevel,
          attacksPerRound
        );
      }
    }

    return attacksPerRound;
  }

  private getSpecializedAttackRate(
    level: number,
    specializationLevel: number,
    baseAttacks: number
  ): number {
    if (specializationLevel === 1) {
      if (level >= 13) return 2.5;
      if (level >= 7) return 2.0;
      return 1.5;
    }

    if (specializationLevel === 2) {
      if (level >= 13) return 3.0;
      if (level >= 7) return 2.5;
      return 2.0;
    }

    return baseAttacks;
  }

  private hasLessThanOneHD(target: CharacterData | MonsterData): boolean {
    if ('hitDice' in target) {
      const match = target.hitDice.match(/^([\d.]+)/);
      if (match) {
        const hdValue = Number.parseFloat(match[1]);
        return hdValue < 1;
      }
    }

    if ('level' in target) {
      return target.level === 0 || (target.hitPoints.maximum <= 4 && target.level === 1);
    }

    return false;
  }

  private resolveMultipleAttacks(
    attackContext: AttackContext,
    attacksThisRound: number
  ): {
    results: CombatResult[];
    fractionalAttacksCarriedOver: number;
  } {
    const { attacker, target, weapon, situationalModifiers = 0, roundState } = attackContext;

    const effectiveRoundState = roundState ?? {
      currentRound: 1,
      fractionalAttacksCarriedOver: 0,
    };

    let totalAttacks = Math.floor(attacksThisRound);
    let fractionalPart = attacksThisRound % 1;

    const combinedFraction = effectiveRoundState.fractionalAttacksCarriedOver + fractionalPart;
    if (combinedFraction >= 1) {
      totalAttacks += 1;
      fractionalPart = combinedFraction - 1;
    } else {
      fractionalPart = combinedFraction;
    }

    const results: CombatResult[] = [];

    for (let i = 0; i < totalAttacks; i++) {
      const attackSequence =
        totalAttacks === 1
          ? AttackSequence.FIRST
          : i === 0
            ? AttackSequence.FIRST
            : i === totalAttacks - 1
              ? AttackSequence.FINAL
              : AttackSequence.SUBSEQUENT;

      let attackModifier = situationalModifiers;

      if (attackSequence === AttackSequence.SUBSEQUENT) {
        attackModifier -= 2;
      } else if (attackSequence === AttackSequence.FINAL) {
        attackModifier -= 5;
      }

      const result = this.executeAttack(attacker, target, weapon, attackModifier);

      if (totalAttacks > 1) {
        result.message = `Attack ${i + 1}/${totalAttacks}: ${result.message}`;
      }

      results.push(result);

      if (target.hitPoints.current <= 0) {
        break;
      }
    }

    return {
      results,
      fractionalAttacksCarriedOver: fractionalPart,
    };
  }

  private executeAttack(
    attacker: CharacterData | MonsterData,
    target: CharacterData | MonsterData,
    _weapon?: Weapon,
    _modifier = 0
  ): CombatResult {
    return {
      hit: true,
      damage: [1],
      critical: false,
      message: `${attacker.name} attacks ${target.name}`,
      specialEffects: null,
    };
  }
}

export class AttackPrecedenceRule extends BaseRule {
  name = 'attack-precedence';

  async execute(context: GameContext, _command: Command): Promise<RuleResult> {
    const attackContext = context.getTemporary('attack-context') as AttackContext;

    if (!attackContext) {
      return this.createFailureResult('No attack context found');
    }

    const { attacker, weapon } = attackContext;
    const hasMultipleAttacks = this.getAttacksPerRound(attacker, weapon) > 1;
    const precedence = this.getAttackPrecedence(hasMultipleAttacks);

    context.setTemporary('attack-precedence', precedence);

    return this.createSuccessResult(
      precedence < 0
        ? 'Fighter with multiple attacks goes first'
        : 'Normal initiative order applies'
    );
  }

  canApply(context: GameContext, command: Command): boolean {
    if (command.type !== COMMAND_TYPES.ATTACK) return false;

    const attackContext = context.getTemporary('attack-context') as AttackContext;
    return attackContext !== null;
  }

  private getAttackPrecedence(hasMultipleAttacks: boolean): number {
    if (!hasMultipleAttacks) return 0;

    return -1;
  }

  private getAttacksPerRound(attacker: CharacterData | MonsterData, _weapon?: Weapon): number {
    if ('hitDice' in attacker) {
      return attacker.damagePerAttack ? attacker.damagePerAttack.length : 1;
    }

    const character = attacker as CharacterData;
    const isFighterClass = ['Fighter', 'Paladin', 'Ranger'].includes(character.class);

    if (!isFighterClass) return 1;

    if (character.level >= 13) return 2;
    if (character.level >= 7) return 1.5;
    return 1;
  }
}

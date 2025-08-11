import type { Command } from '@osric/core/Command';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, type RuleResult } from '@osric/core/Rule';
import type { CharacterId, MonsterId } from '@osric/types';
import { COMMAND_TYPES, RULE_NAMES } from '@osric/types/constants';
import type { Character, Monster } from '@osric/types/entities';

interface TurnUndeadParameters {
  characterId: string | CharacterId;
  targetUndeadIds: Array<string | MonsterId>;
  situationalModifiers?: {
    holySymbolBonus?: number;
    spellBonus?: number;
    areaBonus?: number;
    alignment?: 'good' | 'neutral' | 'evil';
    isEvil?: boolean;
  };
  massAttempt?: boolean;
}

export class TurnUndeadRule extends BaseRule {
  readonly name = RULE_NAMES.TURN_UNDEAD;
  readonly priority = 500;

  canApply(_context: GameContext, command: Command): boolean {
    return command.type === COMMAND_TYPES.TURN_UNDEAD;
  }

  async apply(context: GameContext, _command: Command): Promise<RuleResult> {
    const turnData = context.getTemporary<TurnUndeadParameters>('character:turn-undead:params');

    if (!turnData) {
      return this.createFailureResult(
        'No turn undead data provided',
        undefined,
        false,
        'turn-undead:error'
      );
    }

    try {
      const character = context.getEntity<Character>(turnData.characterId);
      if (!character) {
        return this.createFailureResult(
          `Character ${turnData.characterId} not found`,
          undefined,
          false,
          'turn-undead:error'
        );
      }

      const validationResult = this.validateTurnUndead(character, turnData);
      if (!validationResult.success) {
        return { ...validationResult, dataKind: 'turn-undead:validation' };
      }

      const targetUndead: Monster[] = [];
      for (const undeadId of turnData.targetUndeadIds) {
        const undead = context.getEntity<Monster>(undeadId);
        if (!undead) {
          return this.createFailureResult(
            `Undead creature ${undeadId} not found`,
            undefined,
            false,
            'turn-undead:error'
          );
        }
        targetUndead.push(undead);
      }

      const turnCalculation = this.calculateTurnUndead(character, targetUndead, turnData);

      const specialRules = this.applySpecialRules(character, turnData, turnCalculation);

      return this.createSuccessResult(
        'Turn undead validation complete',
        {
          characterId: turnData.characterId,
          effectiveLevel: turnCalculation.effectiveLevel,
          targetUndead: turnCalculation.targetAnalysis,
          targetAnalysis: turnCalculation.targetAnalysis,
          modifiers: turnCalculation.modifiers,
          specialRules,
          canAttempt: validationResult.canAttempt,
          restrictions: validationResult.restrictions,
          turnLimit: validationResult.turnLimit,
        },
        undefined,
        undefined,
        false,
        'turn-undead:calculation'
      );
    } catch (error) {
      return this.createFailureResult(
        `Failed to process turn undead rule: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private validateTurnUndead(
    character: Character,
    turnData: TurnUndeadParameters
  ): RuleResult & { canAttempt?: boolean; restrictions?: string[]; turnLimit?: number } {
    const characterClass = character.class.toLowerCase();
    const restrictions: string[] = [];

    const turnAbility = this.getTurnUndeadAbility(character);
    if (!turnAbility.canTurn) {
      return {
        ...this.createFailureResult(turnAbility.reason || 'Cannot turn undead'),
        canAttempt: false,
      };
    }

    if (character.hitPoints.current <= 0) {
      return {
        ...this.createFailureResult('Cannot turn undead while unconscious or dead'),
        canAttempt: false,
      };
    }

    if (!this.hasHolySymbol(character)) {
      restrictions.push('Requires holy symbol to turn undead');
    }

    if (turnData.situationalModifiers?.isEvil && characterClass === 'paladin') {
      return {
        ...this.createFailureResult('Paladins cannot command undead (only turn/destroy)'),
        canAttempt: false,
      };
    }

    const turnLimit = this.getTurnLimit(character);

    return {
      ...this.createSuccessResult('Turn undead attempt is valid'),
      canAttempt: true,
      restrictions,
      turnLimit,
    };
  }

  private getTurnUndeadAbility(character: Character): {
    canTurn: boolean;
    effectiveLevel?: number;
    reason?: string;
  } {
    const characterClass = character.class.toLowerCase();
    const level = character.experience.level;

    if (characterClass === 'cleric' || characterClass === 'druid') {
      return { canTurn: true, effectiveLevel: level };
    }

    if (characterClass === 'paladin') {
      if (level >= 3) {
        const effectiveLevel = Math.max(1, level - 2);
        return { canTurn: true, effectiveLevel };
      }
      return { canTurn: false, reason: 'Paladins can only turn undead starting at level 3' };
    }

    if (characterClass.includes('cleric')) {
      return { canTurn: true, effectiveLevel: level };
    }

    return { canTurn: false, reason: 'Only clerics, druids, and paladins can turn undead' };
  }

  private hasHolySymbol(character: Character): boolean {
    return character.inventory.some(
      (item) =>
        item.name.toLowerCase().includes('holy symbol') ||
        item.name.toLowerCase().includes('religious symbol')
    );
  }

  private getTurnLimit(_character: Character): number {
    return 1;
  }

  private calculateTurnUndead(
    character: Character,
    targetUndead: Monster[],
    turnData: TurnUndeadParameters
  ): {
    effectiveLevel: number;
    targetAnalysis: Array<{
      undeadId: string;
      name: string;
      hitDice: number;
      turnChance: string;
      canTurn: boolean;
      wouldDestroy: boolean;
    }>;
    modifiers: Array<{ source: string; modifier: number; description: string }>;
  } {
    const turnAbility = this.getTurnUndeadAbility(character);
    const effectiveLevel = turnAbility.effectiveLevel || 1;
    const modifiers: Array<{ source: string; modifier: number; description: string }> = [];

    if (turnData.situationalModifiers) {
      if (turnData.situationalModifiers.holySymbolBonus) {
        modifiers.push({
          source: 'holy-symbol',
          modifier: turnData.situationalModifiers.holySymbolBonus,
          description: 'Blessed holy symbol bonus',
        });
      }

      if (turnData.situationalModifiers.spellBonus) {
        modifiers.push({
          source: 'spell',
          modifier: turnData.situationalModifiers.spellBonus,
          description: 'Spell effects (Bless, etc.)',
        });
      }

      if (turnData.situationalModifiers.areaBonus) {
        modifiers.push({
          source: 'area',
          modifier: turnData.situationalModifiers.areaBonus,
          description: 'Consecrated ground bonus',
        });
      }
    }

    const targetAnalysis = targetUndead.map((undead) => {
      const undeadHD = this.parseHitDice(undead.hitDice);
      const levelDifference = effectiveLevel - undeadHD;
      const isEvil = turnData.situationalModifiers?.isEvil || false;

      let turnChance: string;
      let canTurn = false;
      let wouldDestroy = false;

      if (levelDifference >= 7) {
        turnChance = 'Automatic';
        canTurn = true;
        wouldDestroy = !isEvil;
      } else if (levelDifference >= 5) {
        turnChance = '4+ on 2d6';
        canTurn = true;
        wouldDestroy = !isEvil;
      } else if (levelDifference >= 2) {
        turnChance = '7+ on 2d6';
        canTurn = true;
      } else if (levelDifference >= 0) {
        turnChance = '10+ on 2d6';
        canTurn = true;
      } else if (levelDifference >= -2) {
        turnChance = '13+ on 2d6';
        canTurn = true;
      } else {
        turnChance = 'Impossible';
        canTurn = false;
      }

      return {
        undeadId: undead.id,
        name: undead.name,
        hitDice: undeadHD,
        turnChance,
        canTurn,
        wouldDestroy,
      };
    });

    return { effectiveLevel, targetAnalysis, modifiers };
  }

  private parseHitDice(hitDice: string): number {
    const match = hitDice.match(/^(\d+)([+-]\d+)?$/);
    if (!match) {
      return 1;
    }

    const dice = Number.parseInt(match[1], 10);
    const bonus = match[2] ? Number.parseInt(match[2], 10) : 0;

    return dice + (bonus > 0 ? 1 : 0);
  }

  private applySpecialRules(
    character: Character,
    turnData: TurnUndeadParameters,
    _turnCalculation: { effectiveLevel: number }
  ): string[] {
    const specialRules: string[] = [];
    const characterClass = character.class.toLowerCase();

    if (characterClass === 'cleric') {
      if (turnData.situationalModifiers?.isEvil) {
        specialRules.push('Evil clerics command undead instead of turning them');
      } else {
        specialRules.push('Good clerics turn undead; may destroy weak undead');
      }
    }

    if (characterClass === 'paladin') {
      specialRules.push('Paladins turn as clerics 2 levels lower');
      specialRules.push('Paladins can only turn/destroy, never command undead');
    }

    if (characterClass === 'druid') {
      specialRules.push('Druids can turn undead but not skeletons/zombies');
    }

    specialRules.push('Can attempt once per turn (10 minutes)');
    specialRules.push('Requires holy symbol');
    specialRules.push('Affects 2d6 HD of undead on success');
    specialRules.push('Undead of same type turned together');

    if (turnData.situationalModifiers?.alignment) {
      const alignment = turnData.situationalModifiers.alignment;
      if (alignment === 'good') {
        specialRules.push('Good alignment provides bonuses in consecrated areas');
      } else if (alignment === 'evil') {
        specialRules.push('Evil alignment suffers penalties in consecrated areas');
      }
    }

    return specialRules;
  }
}

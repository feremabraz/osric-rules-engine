import type { Character } from '@osric/types/character';
import { RULE_NAMES } from '@osric/types/constants';
import type { Spell } from '@osric/types/spell';
import { ContextKeys } from '../../core/ContextKeys';
import { DiceEngine } from '../../core/Dice';
import type { GameContext } from '../../core/GameContext';
import { BaseRule, type RuleResult } from '../../core/Rule';

export class SpellFailureRules extends BaseRule {
  name = RULE_NAMES.SPELL_FAILURE;
  description = 'Handle spell failure and backfire effects';

  canApply(context: GameContext): boolean {
    const spellAttempt = context.getTemporary(ContextKeys.SPELL_ATTEMPT);
    return spellAttempt !== null;
  }

  async execute(context: GameContext): Promise<RuleResult> {
    const spellAttempt = context.getTemporary<{
      caster: Character;
      spell: Spell;
      failureRoll: number;
      failureChance: number;
      backfireChance?: number;
    }>(ContextKeys.SPELL_ATTEMPT);

    if (!spellAttempt) {
      return this.createFailureResult('No spell attempt information found');
    }

    const { caster, spell, failureRoll, failureChance, backfireChance = 0 } = spellAttempt;

    const spellFailed = failureRoll > 100 - failureChance;

    if (!spellFailed) {
      return this.createSuccessResult(`${caster.name} successfully casts "${spell.name}"`);
    }

    const backfireRoll = DiceEngine.roll('1d100');
    const backfireFailed = backfireRoll.total <= backfireChance;

    if (backfireFailed) {
      const backfireEffect = this.determineBackfireEffect(spell.level);

      this.applyBackfireEffect(caster, backfireEffect, context);

      const message =
        `SPELL FAILURE with BACKFIRE! ${caster.name} fails to cast "${spell.name}" ` +
        `(rolled ${failureRoll} vs ${100 - failureChance}% failure chance). ` +
        `Backfire effect: ${backfireEffect.description}`;

      return this.createFailureResult(message, {
        spellName: spell.name,
        failureRoll,
        failureChance,
        backfire: true,
        backfireEffect: backfireEffect.description,
        backfireRoll: backfireRoll.total,
      });
    }

    const message =
      `SPELL FAILURE! ${caster.name} fails to cast "${spell.name}" ` +
      `(rolled ${failureRoll} vs ${100 - failureChance}% failure chance). No backfire effect.`;

    return this.createFailureResult(message, {
      spellName: spell.name,
      failureRoll,
      failureChance,
      backfire: false,
    });
  }

  private determineBackfireEffect(spellLevel: number): { description: string; effect: string } {
    const roll = DiceEngine.roll('1d20');
    const adjustedRoll = roll.total + spellLevel;

    if (adjustedRoll <= 5) {
      return {
        description: 'Minor magical discharge - 1 point of damage',
        effect: 'damage_1',
      };
    }
    if (adjustedRoll <= 10) {
      return {
        description: 'Magical feedback - lose 1 additional spell slot of same level',
        effect: 'lose_spell_slot',
      };
    }
    if (adjustedRoll <= 15) {
      return {
        description: 'Wild magic surge - random spell effect in 3m radius',
        effect: 'wild_surge',
      };
    }
    if (adjustedRoll <= 20) {
      return {
        description: 'Temporal disruption - lose next turn',
        effect: 'lose_turn',
      };
    }
    return {
      description: 'Severe backlash - take damage equal to spell level',
      effect: 'damage_spell_level',
    };
  }

  private applyBackfireEffect(
    caster: Character,
    effect: { description: string; effect: string },
    context: GameContext
  ): void {
    switch (effect.effect) {
      case 'damage_1':
        if (caster.hitPoints) {
          caster.hitPoints.current = Math.max(0, caster.hitPoints.current - 1);
        }
        break;
      case 'damage_spell_level':
        if (caster.hitPoints) {
          const damage = Number.parseInt(effect.effect.split('_')[2]) || 1;
          caster.hitPoints.current = Math.max(0, caster.hitPoints.current - damage);
        }
        break;
      case 'lose_spell_slot':
        break;
      case 'lose_turn': {
        const stunnedEffect = {
          name: 'Stunned',
          duration: 1,
          description: 'Lost next turn due to magical backlash',
          effect: 'stunned',
          savingThrow: null,
          endCondition: 'time',
        };
        caster.statusEffects.push(stunnedEffect);
        break;
      }
      case 'wild_surge':
        context.setTemporary(ContextKeys.SPELL_WILD_MAGIC_SURGE, { caster: caster.id, radius: 10 });
        break;
    }

    context.setEntity(caster.id, caster);
  }
}

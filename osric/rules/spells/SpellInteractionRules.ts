import type { Character } from '@osric/types/character';
import type { Spell } from '@osric/types/spell';
import { ContextKeys } from '../../core/ContextKeys';
import { DiceEngine } from '../../core/Dice';
import type { GameContext } from '../../core/GameContext';
import { BaseRule, type RuleResult } from '../../core/Rule';

export class SpellInteractionRules extends BaseRule {
  name = 'spell-interaction';
  description = 'Handle spell interactions and counterspells';

  canApply(context: GameContext): boolean {
    const spellInteraction = context.getTemporary(ContextKeys.SPELL_INTERACTION);
    return spellInteraction !== null;
  }

  async execute(context: GameContext): Promise<RuleResult> {
    const spellInteraction = context.getTemporary<{
      type: 'counterspell' | 'dispel' | 'interaction';
      targetSpell: Spell;
      interactingSpell: Spell;
      caster: Character;
      target?: Character;
    }>(ContextKeys.SPELL_INTERACTION);

    if (!spellInteraction) {
      return this.createFailureResult('No spell interaction information found');
    }

    const { type, targetSpell, interactingSpell, caster, target } = spellInteraction;

    switch (type) {
      case 'counterspell':
        return this.handleCounterspell(targetSpell, interactingSpell, caster);

      case 'dispel':
        return this.handleDispelMagic(targetSpell, interactingSpell, caster, target);

      case 'interaction':
        return this.handleSpellInteraction(targetSpell, interactingSpell, caster);

      default:
        return this.createFailureResult('Unknown spell interaction type');
    }
  }

  private async handleCounterspell(
    targetSpell: Spell,
    counterspell: Spell,
    caster: Character
  ): Promise<RuleResult> {
    if (counterspell.level < targetSpell.level) {
      return this.createFailureResult(
        `Counterspell level ${counterspell.level} cannot counter level ${targetSpell.level} spell`
      );
    }

    if (counterspell.level >= targetSpell.level) {
      const message = `${caster.name} successfully counters "${targetSpell.name}" with "${counterspell.name}"`;

      return this.createSuccessResult(message, {
        targetSpell: targetSpell.name,
        counterspell: counterspell.name,
        automatic: true,
      });
    }

    return this.createFailureResult('Counterspell failed');
  }

  private async handleDispelMagic(
    targetSpell: Spell,
    dispelSpell: Spell,
    caster: Character,
    _target?: Character
  ): Promise<RuleResult> {
    const casterLevel = caster.level || 1;
    const dispelDC = 11 + targetSpell.level;

    const dispelRoll = DiceEngine.roll('1d20');
    const totalRoll = dispelRoll.total + casterLevel;

    const dispelSuccess = totalRoll >= dispelDC;

    if (dispelSuccess) {
      const message =
        `${caster.name} successfully dispels "${targetSpell.name}" ` +
        `(rolled ${dispelRoll.total} + ${casterLevel} = ${totalRoll} vs DC ${dispelDC})`;

      return this.createSuccessResult(message, {
        targetSpell: targetSpell.name,
        dispelSpell: dispelSpell.name,
        roll: dispelRoll.total,
        casterLevel,
        total: totalRoll,
        dc: dispelDC,
      });
    }

    const message =
      `${caster.name} fails to dispel "${targetSpell.name}" ` +
      `(rolled ${dispelRoll.total} + ${casterLevel} = ${totalRoll} vs DC ${dispelDC})`;

    return this.createFailureResult(message, {
      targetSpell: targetSpell.name,
      dispelSpell: dispelSpell.name,
      roll: dispelRoll.total,
      casterLevel,
      total: totalRoll,
      dc: dispelDC,
    });
  }

  private async handleSpellInteraction(
    targetSpell: Spell,
    interactingSpell: Spell,
    _caster: Character
  ): Promise<RuleResult> {
    const interactions = this.getSpellInteractions(targetSpell.name, interactingSpell.name);

    if (interactions.length === 0) {
      return this.createSuccessResult(
        `"${targetSpell.name}" and "${interactingSpell.name}" do not interact - both effects apply normally`
      );
    }

    const interaction = interactions[0];

    const message = `Spell interaction: "${targetSpell.name}" and "${interactingSpell.name}" - ${interaction.effect}`;

    return this.createSuccessResult(message, {
      targetSpell: targetSpell.name,
      interactingSpell: interactingSpell.name,
      interactionType: interaction.type,
      effect: interaction.effect,
    });
  }

  private getSpellInteractions(
    spell1: string,
    spell2: string
  ): Array<{ type: string; effect: string }> {
    const interactions: Record<string, Record<string, { type: string; effect: string }>> = {
      fireball: {
        'ice storm': {
          type: 'elemental',
          effect: 'Both spells neutralize each other in overlapping area',
        },
        'wall of ice': {
          type: 'elemental',
          effect: 'Fireball melts ice wall, reducing its duration by half',
        },
      },
      'lightning bolt': {
        water: { type: 'elemental', effect: 'Lightning damage increased by 50% in water' },
        'metal armor': { type: 'conductive', effect: 'Target in metal armor takes +1d6 damage' },
      },
      darkness: {
        light: {
          type: 'opposing',
          effect: 'Light and darkness cancel each other in overlapping areas',
        },
        'continual light': { type: 'opposing', effect: 'Continual light suppresses darkness' },
      },
    };

    const result: Array<{ type: string; effect: string }> = [];

    if (interactions[spell1.toLowerCase()]?.[spell2.toLowerCase()]) {
      result.push(interactions[spell1.toLowerCase()][spell2.toLowerCase()]);
    }

    if (interactions[spell2.toLowerCase()]?.[spell1.toLowerCase()]) {
      result.push(interactions[spell2.toLowerCase()][spell1.toLowerCase()]);
    }

    return result;
  }
}

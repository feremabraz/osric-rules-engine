import type { Character } from '@osric/types/character';
import { RULE_NAMES } from '@osric/types/constants';
import type { Spell } from '@osric/types/spell';
import { ContextKeys } from '../../core/ContextKeys';
import { DiceEngine } from '../../core/Dice';
import type { GameContext } from '../../core/GameContext';
import { BaseRule, type RuleResult } from '../../core/Rule';

export class SpellConcentrationRules extends BaseRule {
  name = RULE_NAMES.SPELL_INTERRUPTION;
  description = 'Manage spell concentration and duration';

  canApply(context: GameContext): boolean {
    const concentrationCheck = context.getTemporary(ContextKeys.SPELL_CONCENTRATION_CHECK);
    return concentrationCheck !== null;
  }

  async execute(context: GameContext): Promise<RuleResult> {
    const concentrationCheck = context.getTemporary<{
      caster: Character;
      spell: Spell;
      distraction: 'damage' | 'spell' | 'environmental' | 'movement';
      distractionSeverity: number;
    }>(ContextKeys.SPELL_CONCENTRATION_CHECK);

    if (!concentrationCheck) {
      return this.createFailureResult('No concentration check information found');
    }

    const { caster, spell, distraction, distractionSeverity } = concentrationCheck;

    let baseDC = 10;
    switch (distraction) {
      case 'damage':
        baseDC = Math.max(10, distractionSeverity);
        break;
      case 'spell':
        baseDC = 10 + spell.level;
        break;
      case 'environmental':
        baseDC = 10 + distractionSeverity;
        break;
      case 'movement':
        baseDC = 10 + Math.floor(distractionSeverity / 2);
        break;
    }

    const constitutionModifier = Math.floor((caster.abilities.constitution - 10) / 2);

    const proficiencyBonus = caster.level ? Math.ceil(caster.level / 4) + 1 : 2;
    const hasConcentrationProficiency = false;

    const concentrationRoll = DiceEngine.roll('1d20');
    const totalRoll =
      concentrationRoll.total +
      constitutionModifier +
      (hasConcentrationProficiency ? proficiencyBonus : 0);

    const concentrationMaintained = totalRoll >= baseDC;

    if (concentrationMaintained) {
      const message =
        `${caster.name} maintains concentration on "${spell.name}" ` +
        `(rolled ${concentrationRoll.total} + ${constitutionModifier} ${hasConcentrationProficiency ? `+ ${proficiencyBonus}` : ''} = ${totalRoll} vs DC ${baseDC})`;

      return this.createSuccessResult(message, {
        spellName: spell.name,
        distraction,
        dc: baseDC,
        roll: concentrationRoll.total,
        total: totalRoll,
        maintained: true,
      });
    }

    const message =
      `${caster.name} loses concentration on "${spell.name}" ` +
      `(rolled ${concentrationRoll.total} + ${constitutionModifier} ${hasConcentrationProficiency ? `+ ${proficiencyBonus}` : ''} = ${totalRoll} vs DC ${baseDC}). Spell effect ends.`;

    context.setTemporary(ContextKeys.SPELL_ENDED, { caster: caster.id, spell: spell.name });

    return this.createFailureResult(message, {
      spellName: spell.name,
      distraction,
      dc: baseDC,
      roll: concentrationRoll.total,
      total: totalRoll,
      maintained: false,
    });
  }
}

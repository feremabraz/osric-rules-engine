import type { Character } from '@osric/types/character';
import { ContextKeys } from '../../core/ContextKeys';
import { DiceEngine } from '../../core/Dice';
import type { GameContext } from '../../core/GameContext';
import { BaseRule, type RuleResult } from '../../core/Rule';

export class SpellLearningRules extends BaseRule {
  name = 'spell-learning';
  description = 'Learn spells from external sources';

  canApply(context: GameContext): boolean {
    const spellLearning = context.getTemporary(ContextKeys.SPELL_RESEARCH_LEARN);
    return spellLearning !== null;
  }

  async execute(context: GameContext): Promise<RuleResult> {
    const spellLearning = context.getTemporary<{
      character: Character;
      spellName: string;
      spellLevel: number;
      source: 'scroll' | 'spellbook' | 'tutor' | 'library';
      difficultyModifier?: number;
    }>(ContextKeys.SPELL_RESEARCH_LEARN);

    if (!spellLearning) {
      return this.createFailureResult('No spell learning data found');
    }

    const { character, spellName, spellLevel, source, difficultyModifier = 0 } = spellLearning;

    const maxSpellLevel = Math.min(9, Math.ceil(character.level / 2));
    if (spellLevel > maxSpellLevel) {
      return this.createFailureResult(
        `${character.name} cannot learn level ${spellLevel} spells yet (max level: ${maxSpellLevel})`
      );
    }

    const extendedCharacter = character as Character & {
      spellsKnown?: Array<{ name: string; level: number }>;
    };
    const knownSpells = extendedCharacter.spellsKnown || [];
    const alreadyKnown = knownSpells.some(
      (spell: { name: string; level: number }) =>
        spell.name.toLowerCase() === spellName.toLowerCase() && spell.level === spellLevel
    );

    if (alreadyKnown) {
      return this.createFailureResult(`${character.name} already knows "${spellName}"`);
    }

    const baseChance = 50;
    const intelligenceBonus = (character.abilities.intelligence - 10) * 5;
    const levelBonus = character.level * 2;
    const spellLevelPenalty = spellLevel * 5;

    let sourceModifier = 0;
    switch (source) {
      case 'scroll':
        sourceModifier = -10;
        break;
      case 'spellbook':
        sourceModifier = 0;
        break;
      case 'tutor':
        sourceModifier = 15;
        break;
      case 'library':
        sourceModifier = 5;
        break;
    }

    const totalChance = Math.min(
      95,
      Math.max(
        5,
        baseChance +
          intelligenceBonus +
          levelBonus -
          spellLevelPenalty +
          sourceModifier +
          difficultyModifier
      )
    );

    const learningRoll = DiceEngine.roll('1d100');
    const success = learningRoll.total <= totalChance;

    if (success) {
      const newSpell = {
        id: `${character.id}-${spellName}-${Date.now()}`,
        name: spellName,
        level: spellLevel,
        school: 'Unknown',
        components: ['V', 'S'],
        castingTime: '1 round',
        range: 'Touch',
        duration: 'Instantaneous',
        description: `${spellName} (Level ${spellLevel} spell)`,
      };

      const updatedCharacter = {
        ...character,
        spellsKnown: [...knownSpells, newSpell],
      };

      context.setEntity(character.id, updatedCharacter);

      const message =
        `SUCCESS! ${character.name} learns "${spellName}" from ${source} ` +
        `(rolled ${learningRoll.total} vs ${totalChance}%)`;

      return this.createSuccessResult(message, {
        spellName,
        spellLevel,
        source,
        rollResult: learningRoll.total,
        successChance: totalChance,
        newSpell,
      });
    }

    const message =
      `${character.name} fails to learn "${spellName}" from ${source} ` +
      `(rolled ${learningRoll.total} vs ${totalChance}%)`;

    const constitutionLoss = spellLevel > 3 ? 1 : 0;
    if (constitutionLoss > 0) {
      const updatedCharacter = {
        ...character,
        abilities: {
          ...character.abilities,
          constitution: Math.max(1, character.abilities.constitution - constitutionLoss),
        },
        statusEffects: [
          ...character.statusEffects,
          {
            name: 'Constitution Loss (Spell Study)',
            duration: constitutionLoss * 8,
            description: `Lost ${constitutionLoss} constitution from intensive spell study`,
            effect: 'constitution_drain',
            savingThrow: null,
            endCondition: 'time',
          },
        ],
      };

      context.setEntity(character.id, updatedCharacter);
    }

    return this.createFailureResult(message, {
      spellName,
      spellLevel,
      source,
      rollResult: learningRoll.total,
      successChance: totalChance,
      constitutionLoss,
    });
  }
}

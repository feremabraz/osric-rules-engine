import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, type RuleResult } from '@osric/core/Rule';

import type { Character, Monster, Spell, SpellResult, StatusEffect } from '@osric/types';
import { RULE_NAMES } from '@osric/types/constants';

export class SpellCastingRules extends BaseRule {
  public readonly name = RULE_NAMES.SPELL_CASTING;
  public readonly description = 'Handles OSRIC spell casting mechanics and effects';

  public canApply(context: GameContext): boolean {
    const caster = this.getOptionalContext<Character>(context, 'spell:cast:caster');
    const spell = this.getOptionalContext<Spell>(context, 'spell:cast:spell');
    return !!(caster && spell);
  }

  public async execute(context: GameContext): Promise<RuleResult> {
    try {
      const caster = this.getRequiredContext<Character>(context, 'spell:cast:caster');
      const spell = this.getRequiredContext<Spell>(context, 'spell:cast:spell');
      const targets =
        this.getOptionalContext<(Character | Monster)[]>(context, 'spell:cast:targets') || [];
      const _overrideComponents =
        this.getOptionalContext<boolean>(context, 'spell:cast:components') || false;

      const validationResult = this.validateSpellCasting(caster, spell, targets);
      if (!validationResult.success) {
        return validationResult;
      }

      const slotResult = this.consumeSpellSlot(caster, spell);
      if (!slotResult.success) {
        return slotResult;
      }

      const spellResult = this.resolveSpellEffect(caster, spell, targets);

      const effectResults = this.applySpellEffects(targets, spellResult, spell);

      if (slotResult.updatedCaster) {
        context.setEntity(caster.id, slotResult.updatedCaster);
      }

      this.setContext(context, 'spell:cast:validation', spellResult);
      this.setContext(context, 'castSpell_effectResults', effectResults);

      return this.createSuccessResult(`${caster.name} successfully casts ${spell.name}`, {
        spellCast: spell.name,
        targets: targets.map((t) => t.name),
        damage: spellResult.damage,
        healing: spellResult.healing,
        statusEffects: spellResult.statusEffects,
      });
    } catch (error) {
      return this.createFailureResult(
        `Error in spell casting: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private validateSpellCasting(
    caster: Character,
    spell: Spell,
    targets: (Character | Monster)[]
  ): RuleResult {
    if (caster.hitPoints.current <= 0) {
      return this.createFailureResult(`${caster.name} is unconscious and cannot cast spells`);
    }

    if (spell.components.includes('V')) {
      const silenced = caster.statusEffects.some(
        (effect) => effect.name === 'Silenced' || effect.name === 'Gagged'
      );
      if (silenced) {
        return this.createFailureResult(
          `${caster.name} cannot speak and thus cannot cast ${spell.name}`
        );
      }
    }

    if (spell.components.includes('S')) {
      const canPerformSomatic = this.canPerformSomaticComponents(caster);
      if (!canPerformSomatic) {
        return this.createFailureResult(
          `${caster.name} cannot perform somatic components for ${spell.name}`
        );
      }
    }

    if (targets.length === 0 && spell.range !== 'Self' && spell.range !== '0') {
      return this.createFailureResult(`${spell.name} requires targets but none were provided`);
    }

    if (spell.range === 'Self' && targets.length > 0) {
      return this.createFailureResult(`${spell.name} can only target the caster`);
    }

    return this.createSuccessResult('Spell casting validation passed');
  }

  private canPerformSomaticComponents(character: Character): boolean {
    const restrictedMovement = character.statusEffects.some(
      (effect) =>
        effect.name === 'Paralyzed' || effect.name === 'Restrained' || effect.name === 'Bound'
    );

    if (restrictedMovement) {
      return false;
    }

    const equippedItems = character.inventory.filter((item) => item.equipped);
    let occupiedHands = 0;

    for (const item of equippedItems) {
      if (item.name.toLowerCase().includes('shield')) {
        occupiedHands += 1;
      }
    }

    return occupiedHands < 2;
  }

  private consumeSpellSlot(
    caster: Character,
    spell: Spell
  ): RuleResult & { updatedCaster?: Character } {
    const spellLevel = spell.level;
    const memorizedSpells = caster.memorizedSpells[spellLevel] || [];

    const spellIndex = memorizedSpells.findIndex(
      (memorizedSpell) => memorizedSpell.name === spell.name
    );

    if (spellIndex === -1) {
      return this.createFailureResult(`${caster.name} does not have ${spell.name} memorized`);
    }

    const updatedCaster: Character = {
      ...caster,
      memorizedSpells: {
        ...caster.memorizedSpells,
        [spellLevel]: memorizedSpells.filter((_, index) => index !== spellIndex),
      },
    };

    return {
      ...this.createSuccessResult(`Consumed spell slot for ${spell.name}`),
      updatedCaster,
    };
  }

  private resolveSpellEffect(
    caster: Character,
    spell: Spell,
    targets: (Character | Monster)[]
  ): SpellResult {
    if (spell.effect && typeof spell.effect === 'function') {
      return spell.effect(caster, targets);
    }

    return this.getDefaultSpellEffect(caster, spell, targets);
  }

  private getDefaultSpellEffect(
    caster: Character,
    spell: Spell,
    _targets: (Character | Monster)[]
  ): SpellResult {
    const casterLevel = caster.level;

    switch (spell.name.toLowerCase()) {
      case 'magic missile': {
        const missiles = Math.min(5, Math.floor((casterLevel + 1) / 2));
        const damage = Array(missiles)
          .fill(0)
          .map(() => this.rollDice(1, 4) + 1);
        return {
          damage,
          healing: null,
          statusEffects: null,
          narrative: `${missiles} magic missile${missiles > 1 ? 's' : ''} streak toward the target`,
        };
      }

      case 'cure light wounds': {
        const healing = [this.rollDice(1, 8)];
        return {
          damage: null,
          healing,
          statusEffects: null,
          narrative: 'Divine energy flows through the target, healing wounds',
        };
      }

      case 'sleep': {
        const sleepHD = this.rollDice(2, 4);
        const sleepEffect: StatusEffect = {
          name: 'Asleep',
          duration: casterLevel * 5,
          effect: 'Target is unconscious and helpless',
          savingThrow: null,
          endCondition: 'Damage or loud noise',
        };
        return {
          damage: null,
          healing: null,
          statusEffects: [sleepEffect],
          narrative: `A magical slumber affects creatures with up to ${sleepHD} hit dice`,
        };
      }

      case 'shield': {
        const shieldEffect: StatusEffect = {
          name: 'Shield',
          duration: casterLevel * 5,
          effect: 'AC 2 vs missiles, AC 4 vs other attacks',
          savingThrow: null,
          endCondition: 'Duration expires',
        };
        return {
          damage: null,
          healing: null,
          statusEffects: [shieldEffect],
          narrative: 'An invisible barrier of force appears around the caster',
        };
      }

      default:
        return {
          damage: null,
          healing: null,
          statusEffects: null,
          narrative: `${spell.name} is cast but has no implemented effect`,
        };
    }
  }

  private applySpellEffects(
    targets: (Character | Monster)[],
    _spellResult: SpellResult,
    spell: Spell
  ): Array<{ target: Character | Monster; effectApplied: boolean; savingThrow?: number }> {
    const results: Array<{
      target: Character | Monster;
      effectApplied: boolean;
      savingThrow?: number;
    }> = [];

    for (const target of targets) {
      let effectApplied = true;
      let savingThrow: number | undefined;

      if (spell.savingThrow !== 'None') {
        savingThrow = this.rollDice(1, 20);
        const savingThrowTarget = this.getSavingThrowTarget(target, spell.savingThrow);

        if (savingThrow >= savingThrowTarget) {
          effectApplied = false;
        }
      }

      results.push({
        target,
        effectApplied,
        savingThrow,
      });
    }

    return results;
  }

  private getSavingThrowTarget(target: Character | Monster, saveType: string): number {
    const baseLevel = target.level || 1;

    switch (saveType) {
      case 'Poison or Death':
        return Math.max(1, 15 - Math.floor(baseLevel / 2));
      case 'Wands':
        return Math.max(1, 16 - Math.floor(baseLevel / 2));
      case 'Paralysis, Polymorph, or Petrification':
        return Math.max(1, 17 - Math.floor(baseLevel / 2));
      case 'Breath Weapons':
        return Math.max(1, 18 - Math.floor(baseLevel / 2));
      case 'Spells, Rods, or Staves':
        return Math.max(1, 19 - Math.floor(baseLevel / 2));
      default:
        return 15;
    }
  }

  private rollDice(count: number, sides: number): number {
    let total = 0;
    for (let i = 0; i < count; i++) {
      total += Math.floor(Math.random() * sides) + 1;
    }
    return total;
  }
}

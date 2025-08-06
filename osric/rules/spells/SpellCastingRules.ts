import type { GameContext } from '../../core/GameContext';
import { BaseRule, type RuleResult } from '../../core/Rule';
import type { Character, Monster, Spell, SpellResult, StatusEffect } from '../../types';
import { RULE_NAMES } from '../../types/constants';

/**
 * Rule for handling spell casting mechanics in the OSRIC system.
 *
 * Preserves OSRIC spell mechanics:
 * - Spell slot validation and consumption
 * - Range and area of effect validation
 * - Casting time requirements
 * - Saving throw calculations
 * - Spell effect resolution
 * - Status effect application
 */
export class SpellCastingRules extends BaseRule {
  public readonly name = RULE_NAMES.SPELL_CASTING;
  public readonly description = 'Handles OSRIC spell casting mechanics and effects';

  public canApply(context: GameContext): boolean {
    // This rule applies when we have spell casting temporary data
    const caster = context.getTemporary<Character>('castSpell_caster');
    const spell = context.getTemporary<Spell>('castSpell_spell');
    return !!(caster && spell);
  }

  public async execute(context: GameContext): Promise<RuleResult> {
    try {
      const caster = context.getTemporary<Character>('castSpell_caster');
      const spell = context.getTemporary<Spell>('castSpell_spell');
      const targets = context.getTemporary<(Character | Monster)[]>('castSpell_targets') || [];
      const _overrideComponents =
        context.getTemporary<boolean>('castSpell_overrideComponents') || false;

      if (!caster || !spell) {
        return this.createFailureResult('Missing caster or spell in context');
      }

      // Validate spell casting prerequisites
      const validationResult = this.validateSpellCasting(caster, spell, targets);
      if (!validationResult.success) {
        return validationResult;
      }

      // Check and consume spell slot
      const slotResult = this.consumeSpellSlot(caster, spell);
      if (!slotResult.success) {
        return slotResult;
      }

      // Calculate spell effects
      const spellResult = this.resolveSpellEffect(caster, spell, targets);

      // Apply effects to targets
      const effectResults = this.applySpellEffects(targets, spellResult, spell);

      // Update caster with consumed spell slot
      if (slotResult.updatedCaster) {
        context.setEntity(caster.id, slotResult.updatedCaster);
      }

      // Store results for command to use
      context.setTemporary('castSpell_spellResult', spellResult);
      context.setTemporary('castSpell_effectResults', effectResults);

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

  /**
   * Validate that the spell can be cast by this caster at these targets
   * Preserves OSRIC range, area of effect, and casting requirements
   */
  private validateSpellCasting(
    caster: Character,
    spell: Spell,
    targets: (Character | Monster)[]
  ): RuleResult {
    // Check if caster is conscious and able to cast
    if (caster.hitPoints.current <= 0) {
      return this.createFailureResult(`${caster.name} is unconscious and cannot cast spells`);
    }

    // Check if caster is silenced (affects spells with verbal components)
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

    // Check if caster can perform somatic components
    if (spell.components.includes('S')) {
      const canPerformSomatic = this.canPerformSomaticComponents(caster);
      if (!canPerformSomatic) {
        return this.createFailureResult(
          `${caster.name} cannot perform somatic components for ${spell.name}`
        );
      }
    }

    // Validate range and targets (simplified - in full implementation would check positioning)
    if (targets.length === 0 && spell.range !== 'Self' && spell.range !== '0') {
      return this.createFailureResult(`${spell.name} requires targets but none were provided`);
    }

    // Check if targets are valid for this spell
    if (spell.range === 'Self' && targets.length > 0) {
      return this.createFailureResult(`${spell.name} can only target the caster`);
    }

    return this.createSuccessResult('Spell casting validation passed');
  }

  /**
   * Check if character can perform somatic components
   */
  private canPerformSomaticComponents(character: Character): boolean {
    // Check if hands are bound or paralyzed
    const restrictedMovement = character.statusEffects.some(
      (effect) =>
        effect.name === 'Paralyzed' || effect.name === 'Restrained' || effect.name === 'Bound'
    );

    if (restrictedMovement) {
      return false;
    }

    // Check if at least one hand is free (simplified check)
    // In full implementation, would check equipped items and hand usage
    const equippedItems = character.inventory.filter((item) => item.equipped);
    let occupiedHands = 0;

    for (const item of equippedItems) {
      // Simple heuristic - shields and two-handed weapons occupy hands
      if (item.name.toLowerCase().includes('shield')) {
        occupiedHands += 1;
      }
      // This would be enhanced with proper weapon type checking
    }

    return occupiedHands < 2; // Assuming humanoid with 2 hands
  }

  /**
   * Check if caster has the required spell slot and consume it
   * Preserves OSRIC spell slot mechanics
   */
  private consumeSpellSlot(
    caster: Character,
    spell: Spell
  ): RuleResult & { updatedCaster?: Character } {
    // Check if caster has memorized this spell
    const spellLevel = spell.level;
    const memorizedSpells = caster.memorizedSpells[spellLevel] || [];

    const spellIndex = memorizedSpells.findIndex(
      (memorizedSpell) => memorizedSpell.name === spell.name
    );

    if (spellIndex === -1) {
      return this.createFailureResult(`${caster.name} does not have ${spell.name} memorized`);
    }

    // Create updated caster with spell slot consumed
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

  /**
   * Calculate spell effects based on caster level and spell mechanics
   * Preserves OSRIC spell damage, healing, and effect calculations
   */
  private resolveSpellEffect(
    caster: Character,
    spell: Spell,
    targets: (Character | Monster)[]
  ): SpellResult {
    // Use the spell's built-in effect function if available
    if (spell.effect && typeof spell.effect === 'function') {
      return spell.effect(caster, targets);
    }

    // Default spell effect resolution based on spell name and level
    return this.getDefaultSpellEffect(caster, spell, targets);
  }

  /**
   * Default spell effects for common OSRIC spells
   * This preserves the original spell mechanics from the existing spellResolver
   */
  private getDefaultSpellEffect(
    caster: Character,
    spell: Spell,
    _targets: (Character | Monster)[]
  ): SpellResult {
    const casterLevel = caster.level;

    switch (spell.name.toLowerCase()) {
      case 'magic missile': {
        // 1 missile per odd level (1, 3, 5, etc.), max 5 missiles
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
        // Affects 2d4 HD of creatures
        const sleepHD = this.rollDice(2, 4);
        const sleepEffect: StatusEffect = {
          name: 'Asleep',
          duration: casterLevel * 5, // 5 rounds per level
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
          duration: casterLevel * 5, // 5 rounds per level
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

  /**
   * Apply spell effects to targets, handling saving throws where applicable
   */
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

      // Handle saving throws
      if (spell.savingThrow !== 'None') {
        savingThrow = this.rollDice(1, 20);
        const savingThrowTarget = this.getSavingThrowTarget(target, spell.savingThrow);

        if (savingThrow >= savingThrowTarget) {
          effectApplied = false; // Saved against the spell
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

  /**
   * Get the saving throw target for a character/monster against a specific save type
   * This would use the full OSRIC saving throw tables in a complete implementation
   */
  private getSavingThrowTarget(target: Character | Monster, saveType: string): number {
    // Simplified saving throw calculation
    // In full implementation, this would use OSRIC saving throw tables by class and level
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
        return 15; // Default saving throw
    }
  }

  /**
   * Simple dice rolling function
   * In a full implementation, this would use the centralized dice system
   */
  private rollDice(count: number, sides: number): number {
    let total = 0;
    for (let i = 0; i < count; i++) {
      total += Math.floor(Math.random() * sides) + 1;
    }
    return total;
  }
}

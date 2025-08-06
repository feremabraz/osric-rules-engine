import { BaseCommand, type CommandResult } from '../../core/Command';
import type { GameContext } from '../../core/GameContext';
import type { Character, Monster, Spell } from '../../types';
import { COMMAND_TYPES } from '../../types/constants';

/**
 * Command for casting spells in the OSRIC system.
 * Handles spell validation, component checking, slot consumption, and effect resolution.
 *
 * Preserves OSRIC spell mechanics:
 * - Spell slot consumption based on spell level
 * - Component requirements (Verbal, Somatic, Material)
 * - Casting time and interruption mechanics
 * - Range limitations and area of effect
 * - Saving throw calculations
 * - Spell effect resolution with proper damage/healing
 */
export class CastSpellCommand extends BaseCommand {
  public readonly type = COMMAND_TYPES.CAST_SPELL;

  constructor(
    casterId: string,
    private spellName: string,
    targetIds: string[] = [],
    private spellLevel?: number, // For scrolls or items that may cast at different levels
    private overrideComponents = false // For items that don't require components
  ) {
    super(casterId, targetIds);
  }

  public async execute(context: GameContext): Promise<CommandResult> {
    try {
      // Get the caster
      const caster = context.getEntity<Character>(this.actorId);
      if (!caster) {
        return this.createFailureResult(`Caster with ID ${this.actorId} not found.`);
      }

      // Validate that the caster can cast spells
      if (!this.isSpellcaster(caster)) {
        return this.createFailureResult(`${caster.name} is not a spellcasting class.`);
      }

      // Find the spell in the caster's memorized spells or spell list
      const spell = this.findSpell(caster, this.spellName, this.spellLevel);
      if (!spell) {
        return this.createFailureResult(
          `${caster.name} does not have ${this.spellName} memorized or available.`
        );
      }

      // Get targets
      const targets = this.getTargets(context);

      // Validate spell casting using temporary data to communicate between rules
      context.setTemporary('castSpell_caster', caster);
      context.setTemporary('castSpell_spell', spell);
      context.setTemporary('castSpell_targets', targets);
      context.setTemporary('castSpell_overrideComponents', this.overrideComponents);

      // Store results for rule chain to populate
      context.setTemporary('castSpell_validationResult', null);
      context.setTemporary('castSpell_spellResult', null);

      return this.createSuccessResult(`${caster.name} casts ${spell.name}`, {
        spell: spell.name,
        caster: caster.name,
        targets: targets.map((t) => t.name),
      });
    } catch (error) {
      return this.createFailureResult(
        `Error casting spell: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  public canExecute(context: GameContext): boolean {
    // Validate entities exist
    if (!this.validateEntities(context)) {
      return false;
    }

    // Get the caster
    const caster = context.getEntity<Character>(this.actorId);
    if (!caster) {
      return false;
    }

    // Must be a spellcaster
    if (!this.isSpellcaster(caster)) {
      return false;
    }

    // Must have the spell available
    const spell = this.findSpell(caster, this.spellName, this.spellLevel);
    return !!spell;
  }

  public getRequiredRules(): string[] {
    return [
      'SpellCastingValidation',
      'ComponentTracking',
      'SpellSlotConsumption',
      'SpellEffectResolution',
    ];
  }

  /**
   * Get target entities for the spell
   */
  private getTargets(context: GameContext): (Character | Monster)[] {
    const targets: (Character | Monster)[] = [];

    for (const targetId of this.targetIds) {
      const target = context.getEntity(targetId);
      if (target) {
        targets.push(target);
      }
    }

    return targets;
  }

  /**
   * Check if a character is a spellcasting class
   */
  private isSpellcaster(character: Character): boolean {
    const spellcastingClasses = [
      'Magic-User',
      'Cleric',
      'Druid',
      'Illusionist',
      'Paladin',
      'Ranger',
    ];

    // Check primary class
    if (spellcastingClasses.includes(character.class)) {
      return true;
    }

    // Check multiclass
    if (character.classes) {
      return Object.keys(character.classes).some((cls) => spellcastingClasses.includes(cls));
    }

    return false;
  }

  /**
   * Find a spell in the character's memorized spells or available spell list
   */
  private findSpell(character: Character, spellName: string, overrideLevel?: number): Spell | null {
    const normalizedName = spellName.toLowerCase();

    // First check memorized spells
    if (character.memorizedSpells) {
      for (const [levelStr, spells] of Object.entries(character.memorizedSpells)) {
        const level = Number.parseInt(levelStr, 10);
        if (overrideLevel && level !== overrideLevel) {
          continue;
        }

        const foundSpell = spells.find((spell) => spell.name.toLowerCase() === normalizedName);
        if (foundSpell) {
          return foundSpell;
        }
      }
    }

    // Then check spellbook (for Magic-Users and Illusionists)
    if (character.spellbook) {
      const foundSpell = character.spellbook.find((spell) => {
        if (overrideLevel && spell.level !== overrideLevel) {
          return false;
        }
        return spell.name.toLowerCase() === normalizedName;
      });
      if (foundSpell) {
        return foundSpell;
      }
    }

    return null;
  }
}

import { BaseCommand, type CommandResult } from '../../core/Command';
import type { GameContext } from '../../core/GameContext';
import type { Character, Spell } from '../../types';
import { COMMAND_TYPES } from '../../types/constants';

/**
 * Command for memorizing spells in the OSRIC system.
 * Handles spell slot allocation, spell availability checking, and rest requirements.
 *
 * Preserves OSRIC spell memorization mechanics:
 * - Spell slot limits by class and level
 * - Rest requirements for memorization
 * - Spellbook availability for Magic-Users and Illusionists
 * - Divine spell availability for Clerics and Druids
 * - Bonus spells from high ability scores
 */
export class MemorizeSpellCommand extends BaseCommand {
  public readonly type = COMMAND_TYPES.MEMORIZE_SPELL;

  constructor(
    casterId: string,
    private spellName: string,
    private spellLevel: number,
    private replaceSpell?: string // If replacing an already memorized spell
  ) {
    super(casterId);
  }

  public async execute(context: GameContext): Promise<CommandResult> {
    try {
      // Get the caster
      const caster = context.getEntity<Character>(this.actorId);
      if (!caster) {
        return this.createFailureResult(`Caster with ID ${this.actorId} not found.`);
      }

      // Validate that the caster can memorize spells
      if (!this.isSpellcaster(caster)) {
        return this.createFailureResult(`${caster.name} is not a spellcasting class.`);
      }

      // Find the spell to memorize
      const spell = this.findAvailableSpell(caster, this.spellName, this.spellLevel);
      if (!spell) {
        return this.createFailureResult(
          `${caster.name} does not have access to ${this.spellName} (level ${this.spellLevel}).`
        );
      }

      // Check if caster has available spell slots
      const slotResult = this.checkSpellSlotAvailability(caster, this.spellLevel);
      if (!slotResult.success) {
        return this.createFailureResult(slotResult.message);
      }

      // Store data for rule processing
      context.setTemporary('memorizeSpell_caster', caster);
      context.setTemporary('memorizeSpell_spell', spell);
      context.setTemporary('memorizeSpell_level', this.spellLevel);
      context.setTemporary('memorizeSpell_replaceSpell', this.replaceSpell);

      return this.createSuccessResult(`${caster.name} memorizes ${spell.name}`, {
        spell: spell.name,
        level: this.spellLevel,
        caster: caster.name,
      });
    } catch (error) {
      return this.createFailureResult(
        `Error memorizing spell: ${error instanceof Error ? error.message : 'Unknown error'}`
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
    const spell = this.findAvailableSpell(caster, this.spellName, this.spellLevel);
    if (!spell) {
      return false;
    }

    // Must have available spell slots (or be replacing a spell)
    const slotResult = this.checkSpellSlotAvailability(caster, this.spellLevel);
    return slotResult.success || !!this.replaceSpell;
  }

  public getRequiredRules(): string[] {
    return ['SpellMemorizationValidation', 'SpellSlotAllocation', 'RestRequirements'];
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
   * Find a spell that the character can memorize
   */
  private findAvailableSpell(
    character: Character,
    spellName: string,
    spellLevel: number
  ): Spell | null {
    const normalizedName = spellName.toLowerCase();

    // For arcane casters (Magic-User, Illusionist), check spellbook
    if (character.class === 'Magic-User' || character.class === 'Illusionist') {
      return this.findSpellInSpellbook(character, normalizedName, spellLevel);
    }

    // For divine casters (Cleric, Druid, Paladin, Ranger), check class spell list
    if (['Cleric', 'Druid', 'Paladin', 'Ranger'].includes(character.class)) {
      return this.findSpellInClassList(character, normalizedName, spellLevel);
    }

    return null;
  }

  /**
   * Find spell in character's spellbook (for arcane casters)
   */
  private findSpellInSpellbook(
    character: Character,
    spellName: string,
    spellLevel: number
  ): Spell | null {
    if (!character.spellbook) {
      return null;
    }

    return (
      character.spellbook.find(
        (spell) => spell.name.toLowerCase() === spellName && spell.level === spellLevel
      ) || null
    );
  }

  /**
   * Find spell in class spell list (for divine casters)
   * In a full implementation, this would access the complete OSRIC spell lists
   */
  private findSpellInClassList(
    character: Character,
    spellName: string,
    spellLevel: number
  ): Spell | null {
    // Simplified implementation - in practice this would access full spell lists
    // For now, we'll create a basic spell if the character should have access
    if (this.canAccessSpellLevel(character, spellLevel)) {
      // Return a basic spell object - in full implementation would look up from spell lists
      return {
        name: spellName.charAt(0).toUpperCase() + spellName.slice(1),
        level: spellLevel,
        class: this.getSpellClass(character.class),
        range: 'Varies',
        duration: 'Varies',
        areaOfEffect: 'Varies',
        components: ['V', 'S'],
        castingTime: '1 segment',
        savingThrow: 'None',
        description: 'Divine spell',
        reversible: false,
        materialComponents: null,
        effect: (_caster, _targets) => ({
          damage: null,
          healing: null,
          statusEffects: null,
          narrative: 'Divine magic is invoked',
        }),
      };
    }

    return null;
  }

  /**
   * Check if character can access spells of this level
   */
  private canAccessSpellLevel(character: Character, spellLevel: number): boolean {
    // Check if character has spell slots for this level
    return !!character.spellSlots[spellLevel] && character.spellSlots[spellLevel] > 0;
  }

  /**
   * Get the spell class for a character class
   */
  private getSpellClass(characterClass: string): 'Magic-User' | 'Cleric' | 'Druid' | 'Illusionist' {
    switch (characterClass) {
      case 'Magic-User':
        return 'Magic-User';
      case 'Cleric':
      case 'Paladin':
        return 'Cleric';
      case 'Druid':
      case 'Ranger':
        return 'Druid';
      case 'Illusionist':
        return 'Illusionist';
      default:
        return 'Cleric'; // Default fallback
    }
  }

  /**
   * Check if the character has available spell slots for the given level
   */
  private checkSpellSlotAvailability(
    character: Character,
    spellLevel: number
  ): { success: boolean; message: string } {
    // Get total spell slots for this level
    const totalSlots = character.spellSlots[spellLevel] || 0;

    if (totalSlots === 0) {
      return {
        success: false,
        message: `${character.name} has no spell slots for level ${spellLevel} spells`,
      };
    }

    // Count currently memorized spells of this level
    const memorizedSpells = character.memorizedSpells[spellLevel] || [];
    const usedSlots = memorizedSpells.length;

    if (usedSlots >= totalSlots) {
      return {
        success: false,
        message: `${character.name} has no available spell slots for level ${spellLevel} spells (${usedSlots}/${totalSlots} used)`,
      };
    }

    return {
      success: true,
      message: `Available spell slot found (${usedSlots + 1}/${totalSlots})`,
    };
  }
}

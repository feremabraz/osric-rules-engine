import { BaseCommand, type CommandResult } from '../../core/Command';
import type { GameContext } from '../../core/GameContext';
import type { Character, Spell } from '../../types';
import { COMMAND_TYPES } from '../../types/constants';

export class MemorizeSpellCommand extends BaseCommand {
  public readonly type = COMMAND_TYPES.MEMORIZE_SPELL;

  constructor(
    casterId: string,
    private spellName: string,
    private spellLevel: number,
    private replaceSpell?: string
  ) {
    super(casterId);
  }

  public async execute(context: GameContext): Promise<CommandResult> {
    try {
      const caster = context.getEntity<Character>(this.actorId);
      if (!caster) {
        return this.createFailureResult(`Caster with ID ${this.actorId} not found.`);
      }

      if (!this.isSpellcaster(caster)) {
        return this.createFailureResult(`${caster.name} is not a spellcasting class.`);
      }

      const spell = this.findAvailableSpell(caster, this.spellName, this.spellLevel);
      if (!spell) {
        return this.createFailureResult(
          `${caster.name} does not have access to ${this.spellName} (level ${this.spellLevel}).`
        );
      }

      const slotResult = this.checkSpellSlotAvailability(caster, this.spellLevel);
      if (!slotResult.success) {
        return this.createFailureResult(slotResult.message);
      }

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
    if (!this.validateEntities(context)) {
      return false;
    }

    const caster = context.getEntity<Character>(this.actorId);
    if (!caster) {
      return false;
    }

    if (!this.isSpellcaster(caster)) {
      return false;
    }

    const spell = this.findAvailableSpell(caster, this.spellName, this.spellLevel);
    if (!spell) {
      return false;
    }

    const slotResult = this.checkSpellSlotAvailability(caster, this.spellLevel);
    return slotResult.success || !!this.replaceSpell;
  }

  public getRequiredRules(): string[] {
    return ['SpellMemorizationValidation', 'SpellSlotAllocation', 'RestRequirements'];
  }

  private isSpellcaster(character: Character): boolean {
    const spellcastingClasses = [
      'Magic-User',
      'Cleric',
      'Druid',
      'Illusionist',
      'Paladin',
      'Ranger',
    ];

    if (spellcastingClasses.includes(character.class)) {
      return true;
    }

    if (character.classes) {
      return Object.keys(character.classes).some((cls) => spellcastingClasses.includes(cls));
    }

    return false;
  }

  private findAvailableSpell(
    character: Character,
    spellName: string,
    spellLevel: number
  ): Spell | null {
    const normalizedName = spellName.toLowerCase();

    if (character.class === 'Magic-User' || character.class === 'Illusionist') {
      return this.findSpellInSpellbook(character, normalizedName, spellLevel);
    }

    if (['Cleric', 'Druid', 'Paladin', 'Ranger'].includes(character.class)) {
      return this.findSpellInClassList(character, normalizedName, spellLevel);
    }

    return null;
  }

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

  private findSpellInClassList(
    character: Character,
    spellName: string,
    spellLevel: number
  ): Spell | null {
    if (this.canAccessSpellLevel(character, spellLevel)) {
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

  private canAccessSpellLevel(character: Character, spellLevel: number): boolean {
    return !!character.spellSlots[spellLevel] && character.spellSlots[spellLevel] > 0;
  }

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
        return 'Cleric';
    }
  }

  private checkSpellSlotAvailability(
    character: Character,
    spellLevel: number
  ): { success: boolean; message: string } {
    const totalSlots = character.spellSlots[spellLevel] || 0;

    if (totalSlots === 0) {
      return {
        success: false,
        message: `${character.name} has no spell slots for level ${spellLevel} spells`,
      };
    }

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

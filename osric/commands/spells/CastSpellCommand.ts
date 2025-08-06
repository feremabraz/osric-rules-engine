import { BaseCommand, type CommandResult } from '@osric/core/Command';
import type { GameContext } from '@osric/core/GameContext';
import type { Character, Monster, Spell } from '@osric/types';
import { COMMAND_TYPES } from '@osric/types/constants';

export class CastSpellCommand extends BaseCommand {
  public readonly type = COMMAND_TYPES.CAST_SPELL;

  constructor(
    casterId: string,
    private spellName: string,
    targetIds: string[] = [],
    private spellLevel?: number,
    private overrideComponents = false
  ) {
    super(casterId, targetIds);
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

      const spell = this.findSpell(caster, this.spellName, this.spellLevel);
      if (!spell) {
        return this.createFailureResult(
          `${caster.name} does not have ${this.spellName} memorized or available.`
        );
      }

      const targets = this.getTargets(context);

      context.setTemporary('castSpell_caster', caster);
      context.setTemporary('castSpell_spell', spell);
      context.setTemporary('castSpell_targets', targets);
      context.setTemporary('castSpell_overrideComponents', this.overrideComponents);

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

  private findSpell(character: Character, spellName: string, overrideLevel?: number): Spell | null {
    const normalizedName = spellName.toLowerCase();

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

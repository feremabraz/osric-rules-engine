import { CastSpellValidator } from '@osric/commands/spells/validators/CastSpellValidator';
import { BaseCommand, type CommandResult, type EntityId } from '@osric/core/Command';
import type { GameContext } from '@osric/core/GameContext';
import { formatValidationErrors } from '@osric/core/ValidationPrimitives';
import type { Character, Monster, Spell } from '@osric/types';
import { COMMAND_TYPES, RULE_NAMES } from '@osric/types/constants';

export interface CastSpellParameters {
  casterId: string;
  spellName: string;
  targetIds?: string[];
  spellLevel?: number;
  overrideComponents?: boolean;
}

export class CastSpellCommand extends BaseCommand<CastSpellParameters> {
  public readonly type = COMMAND_TYPES.CAST_SPELL;
  readonly parameters: CastSpellParameters;

  constructor(parameters: CastSpellParameters, actorId: EntityId, targetIds: EntityId[] = []) {
    super(parameters, actorId, targetIds);
    this.parameters = parameters;
  }

  protected validateParameters(): void {
    const result = CastSpellValidator.validate(this.parameters);
    if (!result.valid) {
      const messages = formatValidationErrors(result.errors);
      throw new Error(`Parameter validation failed: ${messages.join(', ')}`);
    }
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

      const spell = this.findSpell(caster, this.parameters.spellName, this.parameters.spellLevel);
      if (!spell) {
        return this.createFailureResult(
          `${caster.name} does not have ${this.parameters.spellName} memorized or available.`
        );
      }

      const targets = this.getTargets(context);

      context.setTemporary('spell:cast:caster', caster);
      context.setTemporary('spell:cast:spell', spell);
      context.setTemporary('spell:cast:targets', targets);
      context.setTemporary('spell:cast:components', this.parameters.overrideComponents);

      context.setTemporary('spell:cast:validation', null);
      context.setTemporary('spell:cast-spell:result', null);

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
    if (!this.validateEntitiesExist(context)) {
      return false;
    }

    const caster = context.getEntity<Character>(this.actorId);
    if (!caster) {
      return false;
    }

    if (!this.isSpellcaster(caster)) {
      return false;
    }

    const spell = this.findSpell(caster, this.parameters.spellName, this.parameters.spellLevel);
    return !!spell;
  }

  public getRequiredRules(): string[] {
    return [
      RULE_NAMES.SPELL_CASTING,
      RULE_NAMES.COMPONENT_TRACKING,
      RULE_NAMES.SPELL_MEMORIZATION,
      RULE_NAMES.SPELL_EFFECT_RESOLUTION,
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

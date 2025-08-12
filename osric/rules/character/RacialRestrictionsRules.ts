import type { Command } from '@osric/core/Command';
import { ContextKeys } from '@osric/core/ContextKeys';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, type RuleResult } from '@osric/core/Rule';
import type { CharacterClass, CharacterRace } from '@osric/types/character';
import { COMMAND_TYPES, RULE_NAMES } from '@osric/types/constants';

interface CharacterCreationParams {
  race: CharacterRace;
  characterClass: CharacterClass;
}

export class RacialRestrictionsRules extends BaseRule {
  readonly name = RULE_NAMES.RACIAL_RESTRICTIONS;
  readonly priority = 22;

  canApply(context: GameContext, command: Command): boolean {
    if (command.type !== COMMAND_TYPES.CREATE_CHARACTER) return false;
    const params = context.getTemporary(
      ContextKeys.CHARACTER_CREATION_PARAMS
    ) as CharacterCreationParams | null;
    return params != null;
  }

  async apply(context: GameContext, _command: Command): Promise<RuleResult> {
    const params = this.getRequiredContext<CharacterCreationParams>(
      context,
      ContextKeys.CHARACTER_CREATION_PARAMS
    );

    const allowed = this.getAllowedClassesForRace(params.race);
    if (!allowed.includes(params.characterClass)) {
      return this.createFailureResult(
        `${params.race} cannot be ${params.characterClass}`,
        { race: params.race, attemptedClass: params.characterClass },
        true
      );
    }

    // Persist validation marker for downstream rules if needed
    this.setContext(context, 'character:creation:class-validation', params.characterClass);

    return this.createSuccessResult(`${params.race} is allowed to be ${params.characterClass}`, {
      race: params.race,
      characterClass: params.characterClass,
      allowedClasses: allowed,
    });
  }

  private getAllowedClassesForRace(race: CharacterRace): CharacterClass[] {
    // Use presence in level limit map as allowed list, matching system constraints
    const map: Record<CharacterRace, CharacterClass[]> = {
      Human: [
        'Fighter',
        'Cleric',
        'Magic-User',
        'Thief',
        'Assassin',
        'Druid',
        'Illusionist',
        'Paladin',
        'Ranger',
        'Monk',
      ],
      Dwarf: ['Fighter', 'Cleric', 'Thief', 'Assassin'],
      Elf: ['Fighter', 'Cleric', 'Magic-User', 'Thief', 'Assassin', 'Ranger'],
      Gnome: ['Fighter', 'Cleric', 'Magic-User', 'Thief', 'Assassin', 'Illusionist'],
      'Half-Elf': ['Fighter', 'Cleric', 'Magic-User', 'Thief', 'Assassin', 'Druid', 'Ranger'],
      Halfling: ['Fighter', 'Cleric', 'Thief', 'Druid'],
      'Half-Orc': ['Fighter', 'Cleric', 'Thief', 'Assassin'],
    };
    return map[race] ?? [];
  }
}

import type { Command } from '@osric/core/Command';
import { ContextKeys } from '@osric/core/ContextKeys';
import { DiceEngine } from '@osric/core/Dice';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, type RuleResult } from '@osric/core/Rule';
import type { CharacterClass } from '@osric/types/character';
import { COMMAND_TYPES, RULE_NAMES } from '@osric/types/constants';

interface CharacterCreationParams {
  characterClass: CharacterClass;
}

export class StartingEquipmentRule extends BaseRule {
  readonly name = RULE_NAMES.STARTING_EQUIPMENT;
  readonly priority = 60;

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

    const gold = this.rollStartingGold(params.characterClass);
    const kit = this.chooseStarterKit(params.characterClass, gold);

    this.setContext(context, 'character:creation:starting-gold', gold);
    this.setContext(context, 'character:creation:starting-equipment', kit.items);

    return this.createSuccessResult('Allocated starting equipment and gold', {
      gold,
      items: kit.items,
      kit: kit.name,
    });
  }

  private rollStartingGold(characterClass: CharacterClass): number {
    // Simplified OSRIC starting gold by class (in gp)
    switch (characterClass) {
      case 'Fighter':
      case 'Paladin':
      case 'Ranger':
        return DiceEngine.roll('5d4').total * 10;
      case 'Cleric':
      case 'Druid':
      case 'Monk':
        return DiceEngine.roll('3d6').total * 10;
      case 'Magic-User':
      case 'Illusionist':
        return DiceEngine.roll('2d4').total * 10;
      case 'Thief':
      case 'Assassin':
        return DiceEngine.roll('2d6').total * 10;
      default:
        return DiceEngine.roll('3d6').total * 10;
    }
  }

  private chooseStarterKit(
    characterClass: CharacterClass,
    budget: number
  ): { name: string; items: string[] } {
    // Keep prices implicit; ensure kit plausible for class and budget
    const kits: Record<CharacterClass, Array<{ name: string; cost: number; items: string[] }>> = {
      Fighter: [
        { name: 'Soldier Kit', cost: 60, items: ['Chain Mail', 'Shield', 'Longsword', 'Dagger'] },
        { name: 'Light Foot', cost: 40, items: ['Leather Armor', 'Spear', 'Shortbow', 'Quiver'] },
      ],
      Paladin: [
        {
          name: 'Holy Knight',
          cost: 100,
          items: ['Chain Mail', 'Shield', 'Warhammer', 'Holy Symbol'],
        },
      ],
      Ranger: [
        { name: 'Woodsman', cost: 70, items: ['Studded Leather', 'Longbow', 'Quiver', 'Hand Axe'] },
      ],
      Cleric: [
        { name: 'Templar', cost: 50, items: ['Scale Mail', 'Shield', 'Mace', 'Holy Symbol'] },
      ],
      Druid: [
        {
          name: 'Initiate of the Circle',
          cost: 30,
          items: ['Leather Armor', 'Scimitar', 'Holy Symbol'],
        },
      ],
      Monk: [{ name: 'Ascetic', cost: 5, items: ['Robes', 'Quarterstaff'] }],
      'Magic-User': [{ name: 'Apprentice', cost: 15, items: ['Robes', 'Dagger', 'Spellbook'] }],
      Illusionist: [{ name: 'Trickster', cost: 15, items: ['Robes', 'Dagger', 'Spellbook'] }],
      Thief: [
        { name: 'Burglar', cost: 40, items: ['Leather Armor', 'Shortsword', 'Thieves’ Tools'] },
      ],
      Assassin: [
        {
          name: 'Cutthroat',
          cost: 40,
          items: ['Leather Armor', 'Shortsword', 'Dagger', 'Poison Vial'],
        },
      ],
    } as const;

    const options = kits[characterClass] || [];
    const affordable = options.filter((k) => k.cost <= budget).sort((a, b) => b.cost - a.cost);

    const chosen = affordable[0] || { name: 'Commoner', cost: 0, items: ['Clothes', 'Dagger'] };
    return { name: chosen.name, items: chosen.items };
  }
}

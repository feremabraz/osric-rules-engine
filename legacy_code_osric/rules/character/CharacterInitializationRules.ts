import type { BaseCommand } from '@osric/core/Command';
import { ContextKeys } from '@osric/core/ContextKeys';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, type RuleResult } from '@osric/core/Rule';
import { CharacterFactory } from '@osric/entities/Character';
import type {
  AbilityScores,
  Alignment,
  CharacterClass,
  CharacterRace,
  Character as CharacterType,
} from '@osric/types/character';
import { RULE_NAMES } from '@osric/types/constants';

export interface CharacterInitializationParams {
  playerName: string;
}

export class CharacterInitializationRules extends BaseRule {
  readonly name = RULE_NAMES.CHARACTER_INITIALIZATION;

  async apply(
    context: GameContext,
    command: BaseCommand<CharacterInitializationParams>
  ): Promise<RuleResult> {
    try {
      // Get validated data from previous rules
      const characterClass = this.getRequiredContext<CharacterClass>(
        context,
        ContextKeys.CHARACTER_CREATION_CLASS_VALIDATION
      );
      const race = this.getRequiredContext<CharacterRace>(
        context,
        ContextKeys.CHARACTER_CREATION_RACE
      );
      const alignment = this.getRequiredContext<Alignment>(
        context,
        ContextKeys.CHARACTER_CREATION_ALIGNMENT
      );
      const baseAbilities = this.getRequiredContext<AbilityScores>(
        context,
        ContextKeys.CHARACTER_CREATION_ABILITY_SCORES
      );

      // Apply racial adjustments to abilities
      const finalAbilities = this.applyRacialAdjustments(baseAbilities, race);

      // Calculate hit points
      const hitPoints = this.calculateHitPoints(characterClass, finalAbilities.constitution);

      // Create character data
      const characterData: CharacterType = {
        id: command.targetIds[0],
        name: command.parameters.playerName,
        level: 1,
        hitPoints: {
          current: hitPoints,
          maximum: hitPoints,
        },
        armorClass: 10,
        thac0: 20, // Base THAC0 for level 1
        experience: {
          current: 0,
          requiredForNextLevel: 2000,
          level: 1,
        },
        alignment,
        inventory: [],
        position: 'origin',
        statusEffects: [],
        race,
        class: characterClass,
        abilities: finalAbilities,
        abilityModifiers: {
          strengthHitAdj: null,
          strengthDamageAdj: null,
          strengthEncumbrance: null,
          strengthOpenDoors: null,
          strengthBendBars: null,
          dexterityReaction: null,
          dexterityMissile: null,
          dexterityDefense: null,
          dexterityPickPockets: null,
          dexterityOpenLocks: null,
          dexterityFindTraps: null,
          dexterityMoveSilently: null,
          dexterityHideInShadows: null,
          constitutionHitPoints: null,
          constitutionSystemShock: null,
          constitutionResurrectionSurvival: null,
          constitutionPoisonSave: null,
          intelligenceLanguages: null,
          intelligenceLearnSpells: null,
          intelligenceMaxSpellLevel: null,
          intelligenceIllusionImmunity: false,
          wisdomMentalSave: null,
          wisdomBonusSpells: null,
          wisdomSpellFailure: null,
          charismaReactionAdj: null,
          charismaLoyaltyBase: null,
          charismaMaxHenchmen: null,
        },
        savingThrows: {
          'Poison or Death': 14,
          Wands: 15,
          'Paralysis, Polymorph, or Petrification': 16,
          'Breath Weapons': 17,
          'Spells, Rods, or Staves': 18,
        },
        spells: [],
        currency: { platinum: 0, gold: 50, electrum: 0, silver: 0, copper: 0 },
        encumbrance: 0,
        movementRate: 120,
        classes: { [characterClass]: 1 },
        primaryClass: characterClass,
        spellSlots: {},
        memorizedSpells: {},
        spellbook: [],
        thiefSkills: null,
        turnUndead: null,
        languages: ['Common'],
        age: 20,
        ageCategory: 'Adult',
        henchmen: [],
        racialAbilities: [],
        classAbilities: [],
        proficiencies: [],
        secondarySkills: [],
      };

      // Create character entity
      const character = CharacterFactory.create(characterData);

      // Store in context as entity (storing the data directly since GameEntity expects base type)
      context.setEntity(character.id, characterData);

      // Store result in temporary data
      this.setContext(context, ContextKeys.CHARACTER_CREATION_DATA, character);

      return this.createSuccessResult('Character created successfully', {
        characterId: character.id,
        name: character.name,
        race: character.race,
        class: character.characterClass,
        level: character.level,
        hitPoints: character.hitPoints,
        abilities: character.abilities,
      });
    } catch (error) {
      return this.createFailureResult('Failed to initialize character', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private applyRacialAdjustments(abilities: AbilityScores, race: CharacterRace): AbilityScores {
    const adjusted = { ...abilities };

    switch (race) {
      case 'Dwarf':
        adjusted.constitution += 1;
        adjusted.charisma -= 1;
        break;
      case 'Elf':
        adjusted.dexterity += 1;
        adjusted.constitution -= 1;
        break;
      case 'Gnome':
        adjusted.intelligence += 1;
        adjusted.strength -= 1;
        break;
      case 'Half-Elf':
        // No adjustments
        break;
      case 'Halfling':
        adjusted.dexterity += 1;
        adjusted.strength -= 1;
        break;
      case 'Half-Orc':
        adjusted.strength += 1;
        adjusted.constitution += 1;
        adjusted.charisma -= 2;
        break;
      default:
        // No adjustments for Human and others
        break;
    }

    return adjusted;
  }

  private calculateHitPoints(characterClass: CharacterClass, constitution: number): number {
    const baseHitDie = this.getHitDie(characterClass);
    const constitutionBonus = this.getConstitutionBonus(constitution);

    return Math.max(1, baseHitDie + constitutionBonus);
  }

  private getHitDie(characterClass: CharacterClass): number {
    const hitDice: Record<CharacterClass, number> = {
      Fighter: 8,
      Paladin: 8,
      Ranger: 8,
      'Magic-User': 4,
      Illusionist: 4,
      Cleric: 6,
      Druid: 6,
      Thief: 6,
      Assassin: 6,
      Monk: 4,
    };

    return hitDice[characterClass] || 6;
  }

  private getConstitutionBonus(constitution: number): number {
    if (constitution <= 3) return -2;
    if (constitution <= 6) return -1;
    if (constitution <= 14) return 0;
    if (constitution <= 16) return 1;
    if (constitution <= 17) return 2;
    if (constitution >= 18) return 3;
    return 0;
  }
}

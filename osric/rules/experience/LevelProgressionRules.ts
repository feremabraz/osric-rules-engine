/**
 * LevelProgressionRules - OSRIC Level Advancement
 *
 * Migrated from rules/experience/levelProgression.ts
 * PRESERVATION: All OSRIC level progression tables and requirements preserved exactly
 */

import type { Command } from '../../core/Command';
import type { GameContext } from '../../core/GameContext';
import { BaseRule, type RuleResult } from '../../core/Rule';
import { COMMAND_TYPES, RULE_NAMES } from '../../types/constants';
import type { Character, CharacterClass, ClassAbility } from '../../types/entities';

interface LevelUpParameters {
  characterId: string;
  skipTraining?: boolean; // For testing or special circumstances
}

export class LevelProgressionRule extends BaseRule {
  readonly name = RULE_NAMES.LEVEL_PROGRESSION;
  readonly priority = 600; // Execute after experience gain

  canApply(_context: GameContext, command: Command): boolean {
    return command.type === COMMAND_TYPES.LEVEL_UP;
  }

  async execute(context: GameContext, _command: Command): Promise<RuleResult> {
    const levelData = context.getTemporary<LevelUpParameters>('level-up-params');

    if (!levelData) {
      return this.createFailureResult('No level up data provided');
    }

    try {
      const character = context.getEntity<Character>(levelData.characterId);
      if (!character) {
        return this.createFailureResult(`Character ${levelData.characterId} not found`);
      }

      // Check if character is eligible for level advancement
      const eligibilityCheck = this.checkLevelEligibility(character);
      if (!eligibilityCheck.eligible) {
        return this.createFailureResult(
          eligibilityCheck.reason || 'Character not eligible for level advancement'
        );
      }

      // Calculate new level and benefits
      const newLevel = this.calculateNewLevel(character);
      const levelBenefits = this.calculateLevelBenefits(character, newLevel);

      // Apply level advancement
      const updatedCharacter = this.applyLevelAdvancement(character, newLevel, levelBenefits);

      context.setEntity(levelData.characterId, updatedCharacter);

      return this.createSuccessResult(`Level advanced to ${newLevel}`, {
        characterId: levelData.characterId,
        oldLevel: character.experience.level,
        newLevel,
        benefits: levelBenefits,
      });
    } catch (error) {
      return this.createFailureResult(
        `Failed to process level advancement: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Check if character meets requirements for level advancement
   */
  private checkLevelEligibility(character: Character): { eligible: boolean; reason?: string } {
    // Check if character has enough experience
    const currentXP = character.experience.current;
    const requiredXP = character.experience.requiredForNextLevel;

    if (currentXP < requiredXP) {
      return {
        eligible: false,
        reason: `Insufficient experience: ${currentXP}/${requiredXP} required`,
      };
    }

    // Check racial level limits
    const racialLimit = this.getRacialLevelLimit(character);
    if (character.experience.level >= racialLimit) {
      return {
        eligible: false,
        reason: `Racial level limit reached: ${character.race} ${character.class} limited to level ${racialLimit}`,
      };
    }

    // Training requirements (OSRIC)
    const trainingRequired = this.isTrainingRequired(character);
    if (trainingRequired && !this.hasCompletedTraining(character)) {
      return {
        eligible: false,
        reason: 'Training required before level advancement',
      };
    }

    return { eligible: true };
  }

  /**
   * Calculate the new level based on current experience
   */
  private calculateNewLevel(character: Character): number {
    const characterClass = character.class;
    const currentXP = character.experience.current;

    return determineLevel(characterClass, currentXP);
  }

  /**
   * Calculate what benefits the character gains from leveling
   */
  private calculateLevelBenefits(character: Character, newLevel: number): LevelBenefits {
    const oldLevel = character.experience.level;
    const benefits: LevelBenefits = {
      hitPointsGained: 0,
      spellSlotsGained: {},
      newAbilities: [],
      attackBonusGained: 0,
      savingThrowsImproved: [],
    };

    // Calculate hit points gained
    for (let level = oldLevel + 1; level <= newLevel; level++) {
      benefits.hitPointsGained += this.rollHitPoints(character, level);
    }

    // Calculate spell progression (for spell casters)
    if (this.isSpellCaster(character.class)) {
      benefits.spellSlotsGained = this.calculateSpellProgression(character, newLevel);
    }

    // Check for new class abilities
    benefits.newAbilities = this.getNewClassAbilities(character, newLevel);

    // Calculate attack bonus improvements
    benefits.attackBonusGained = this.calculateAttackBonusGain(character, newLevel);

    // Calculate saving throw improvements
    benefits.savingThrowsImproved = this.calculateSavingThrowImprovements(character, newLevel);

    return benefits;
  }

  /**
   * Apply all level advancement changes to character
   */
  private applyLevelAdvancement(
    character: Character,
    newLevel: number,
    benefits: LevelBenefits
  ): Character {
    const updatedCharacter = { ...character };

    // Update level and experience
    updatedCharacter.experience = {
      ...character.experience,
      level: newLevel,
      requiredForNextLevel: getExperienceForNextLevel(character.class, newLevel),
    };

    // Apply hit point gains
    updatedCharacter.hitPoints = {
      ...character.hitPoints,
      maximum: character.hitPoints.maximum + benefits.hitPointsGained,
      current: character.hitPoints.current + benefits.hitPointsGained, // Heal on level up
    };

    // Apply spell slot increases
    if (Object.keys(benefits.spellSlotsGained).length > 0) {
      updatedCharacter.spellSlots = {
        ...character.spellSlots,
        ...benefits.spellSlotsGained,
      };
    }

    // Add new class abilities
    if (benefits.newAbilities.length > 0) {
      updatedCharacter.classAbilities = [...character.classAbilities, ...benefits.newAbilities];
    }

    return updatedCharacter;
  }

  /**
   * Roll hit points for a specific level
   */
  private rollHitPoints(_character: Character, _level: number): number {
    // TODO: Implement proper hit point rolling with hit dice
    const hitDie = this.getHitDie(_character.class);
    const conBonus = this.getConstitutionBonus(_character.abilities.constitution);

    // For now, return average hit points + constitution bonus
    return Math.floor(hitDie / 2) + 1 + conBonus;
  }

  /**
   * Get hit die size for character class
   */
  private getHitDie(characterClass: string): number {
    switch (characterClass.toLowerCase()) {
      case 'fighter':
      case 'paladin':
      case 'ranger':
        return 10; // d10
      case 'cleric':
      case 'druid':
        return 8; // d8
      case 'magic-user':
      case 'illusionist':
        return 4; // d4
      case 'thief':
      case 'assassin':
        return 6; // d6
      default:
        return 6; // Default d6
    }
  }

  /**
   * Get constitution hit point bonus
   */
  private getConstitutionBonus(constitution: number): number {
    if (constitution >= 18) return 4;
    if (constitution >= 17) return 3;
    if (constitution >= 16) return 2;
    if (constitution >= 15) return 1;
    if (constitution >= 7) return 0;
    if (constitution >= 4) return -1;
    return -2;
  }

  /**
   * Check if character class can cast spells
   */
  private isSpellCaster(characterClass: string): boolean {
    const spellCasters = ['cleric', 'druid', 'magic-user', 'illusionist'];
    return spellCasters.includes(characterClass.toLowerCase());
  }

  /**
   * Calculate spell slot progression
   */
  private calculateSpellProgression(
    _character: Character,
    _newLevel: number
  ): Record<number, number> {
    // This would implement OSRIC spell progression tables
    // For now, return empty progression
    return {};
  }

  /**
   * Get new class abilities gained at this level
   */
  private getNewClassAbilities(_character: Character, _newLevel: number): ClassAbility[] {
    // Return new abilities gained at this level
    return [];
  }

  /**
   * Calculate attack bonus improvements
   */
  private calculateAttackBonusGain(_character: Character, _newLevel: number): number {
    // OSRIC THAC0 progression would be implemented here
    return 0;
  }

  /**
   * Calculate saving throw improvements
   */
  private calculateSavingThrowImprovements(_character: Character, _newLevel: number): string[] {
    // OSRIC saving throw progression would be implemented here
    return [];
  }

  /**
   * Get racial level limit for character
   */
  private getRacialLevelLimit(_character: Character): number {
    // OSRIC racial level limits would be implemented here
    // For now, return high limit
    return 20;
  }

  /**
   * Check if training is required for level advancement
   */
  private isTrainingRequired(_character: Character): boolean {
    // OSRIC training rules - usually required for all level advancement
    return true;
  }

  /**
   * Check if character has completed required training
   */
  private hasCompletedTraining(_character: Character): boolean {
    // This would check if character has completed training
    // For now, assume training is complete
    return true;
  }
}

interface LevelBenefits {
  hitPointsGained: number;
  spellSlotsGained: Record<number, number>;
  newAbilities: ClassAbility[];
  attackBonusGained: number;
  savingThrowsImproved: string[];
}

/**
 * Experience tables for each character class - OSRIC compliant
 */
const EXPERIENCE_TABLES: Record<CharacterClass, Array<{ level: number; experience: number }>> = {
  Fighter: [
    { level: 1, experience: 0 },
    { level: 2, experience: 2000 },
    { level: 3, experience: 4000 },
    { level: 4, experience: 8000 },
    { level: 5, experience: 16000 },
    { level: 6, experience: 32000 },
    { level: 7, experience: 64000 },
    { level: 8, experience: 125000 },
    { level: 9, experience: 250000 },
    { level: 10, experience: 500000 },
    { level: 11, experience: 750000 },
    { level: 12, experience: 1000000 },
    { level: 13, experience: 1250000 },
    { level: 14, experience: 1500000 },
    { level: 15, experience: 1750000 },
    { level: 16, experience: 2000000 },
    { level: 17, experience: 2250000 },
    { level: 18, experience: 2500000 },
    { level: 19, experience: 2750000 },
    { level: 20, experience: 3000000 },
  ],
  Cleric: [
    { level: 1, experience: 0 },
    { level: 2, experience: 1500 },
    { level: 3, experience: 3000 },
    { level: 4, experience: 6000 },
    { level: 5, experience: 13000 },
    { level: 6, experience: 27500 },
    { level: 7, experience: 55000 },
    { level: 8, experience: 110000 },
    { level: 9, experience: 225000 },
    { level: 10, experience: 450000 },
    { level: 11, experience: 675000 },
    { level: 12, experience: 900000 },
    { level: 13, experience: 1125000 },
    { level: 14, experience: 1350000 },
    { level: 15, experience: 1575000 },
    { level: 16, experience: 1800000 },
    { level: 17, experience: 2025000 },
    { level: 18, experience: 2250000 },
    { level: 19, experience: 2475000 },
    { level: 20, experience: 2700000 },
  ],
  'Magic-User': [
    { level: 1, experience: 0 },
    { level: 2, experience: 2500 },
    { level: 3, experience: 5000 },
    { level: 4, experience: 10000 },
    { level: 5, experience: 22500 },
    { level: 6, experience: 40000 },
    { level: 7, experience: 60000 },
    { level: 8, experience: 90000 },
    { level: 9, experience: 135000 },
    { level: 10, experience: 250000 },
    { level: 11, experience: 375000 },
    { level: 12, experience: 750000 },
    { level: 13, experience: 1125000 },
    { level: 14, experience: 1500000 },
    { level: 15, experience: 1875000 },
    { level: 16, experience: 2250000 },
    { level: 17, experience: 2625000 },
    { level: 18, experience: 3000000 },
    { level: 19, experience: 3375000 },
    { level: 20, experience: 3750000 },
  ],
  Thief: [
    { level: 1, experience: 0 },
    { level: 2, experience: 1250 },
    { level: 3, experience: 2500 },
    { level: 4, experience: 5000 },
    { level: 5, experience: 10000 },
    { level: 6, experience: 20000 },
    { level: 7, experience: 40000 },
    { level: 8, experience: 70000 },
    { level: 9, experience: 110000 },
    { level: 10, experience: 160000 },
    { level: 11, experience: 220000 },
    { level: 12, experience: 440000 },
    { level: 13, experience: 660000 },
    { level: 14, experience: 880000 },
    { level: 15, experience: 1100000 },
    { level: 16, experience: 1320000 },
    { level: 17, experience: 1540000 },
    { level: 18, experience: 1760000 },
    { level: 19, experience: 1980000 },
    { level: 20, experience: 2200000 },
  ],
  Paladin: [
    { level: 1, experience: 0 },
    { level: 2, experience: 2750 },
    { level: 3, experience: 5500 },
    { level: 4, experience: 12000 },
    { level: 5, experience: 24000 },
    { level: 6, experience: 45000 },
    { level: 7, experience: 95000 },
    { level: 8, experience: 175000 },
    { level: 9, experience: 350000 },
    { level: 10, experience: 700000 },
    { level: 11, experience: 1050000 },
    { level: 12, experience: 1400000 },
    { level: 13, experience: 1750000 },
    { level: 14, experience: 2100000 },
    { level: 15, experience: 2450000 },
    { level: 16, experience: 2800000 },
    { level: 17, experience: 3150000 },
    { level: 18, experience: 3500000 },
    { level: 19, experience: 3850000 },
    { level: 20, experience: 4200000 },
  ],
  Ranger: [
    { level: 1, experience: 0 },
    { level: 2, experience: 2250 },
    { level: 3, experience: 4500 },
    { level: 4, experience: 10000 },
    { level: 5, experience: 20000 },
    { level: 6, experience: 40000 },
    { level: 7, experience: 90000 },
    { level: 8, experience: 150000 },
    { level: 9, experience: 225000 },
    { level: 10, experience: 325000 },
    { level: 11, experience: 650000 },
    { level: 12, experience: 975000 },
    { level: 13, experience: 1300000 },
    { level: 14, experience: 1625000 },
    { level: 15, experience: 1950000 },
    { level: 16, experience: 2275000 },
    { level: 17, experience: 2600000 },
    { level: 18, experience: 2925000 },
    { level: 19, experience: 3250000 },
    { level: 20, experience: 3575000 },
  ],
  Druid: [
    { level: 1, experience: 0 },
    { level: 2, experience: 2000 },
    { level: 3, experience: 4000 },
    { level: 4, experience: 7500 },
    { level: 5, experience: 12500 },
    { level: 6, experience: 20000 },
    { level: 7, experience: 35000 },
    { level: 8, experience: 60000 },
    { level: 9, experience: 90000 },
    { level: 10, experience: 125000 },
    { level: 11, experience: 200000 },
    { level: 12, experience: 300000 },
    { level: 13, experience: 750000 },
    { level: 14, experience: 1500000 },
    { level: 15, experience: 3000000 },
    { level: 16, experience: 3500000 },
    { level: 17, experience: 4000000 },
    { level: 18, experience: 4500000 },
    { level: 19, experience: 5000000 },
    { level: 20, experience: 5500000 },
  ],
  Illusionist: [
    { level: 1, experience: 0 },
    { level: 2, experience: 2500 },
    { level: 3, experience: 4500 },
    { level: 4, experience: 9000 },
    { level: 5, experience: 18000 },
    { level: 6, experience: 35000 },
    { level: 7, experience: 60000 },
    { level: 8, experience: 95000 },
    { level: 9, experience: 145000 },
    { level: 10, experience: 220000 },
    { level: 11, experience: 440000 },
    { level: 12, experience: 660000 },
    { level: 13, experience: 880000 },
    { level: 14, experience: 1100000 },
    { level: 15, experience: 1320000 },
    { level: 16, experience: 1540000 },
    { level: 17, experience: 1760000 },
    { level: 18, experience: 1980000 },
    { level: 19, experience: 2200000 },
    { level: 20, experience: 2420000 },
  ],
  Assassin: [
    { level: 1, experience: 0 },
    { level: 2, experience: 1500 },
    { level: 3, experience: 3000 },
    { level: 4, experience: 6000 },
    { level: 5, experience: 12000 },
    { level: 6, experience: 24000 },
    { level: 7, experience: 50000 },
    { level: 8, experience: 100000 },
    { level: 9, experience: 200000 },
    { level: 10, experience: 300000 },
    { level: 11, experience: 425000 },
    { level: 12, experience: 575000 },
    { level: 13, experience: 750000 },
    { level: 14, experience: 1000000 },
    { level: 15, experience: 1500000 },
    { level: 16, experience: 2000000 },
    { level: 17, experience: 2500000 },
    { level: 18, experience: 3000000 },
    { level: 19, experience: 3500000 },
    { level: 20, experience: 4000000 },
  ],
  Monk: [
    { level: 1, experience: 0 },
    { level: 2, experience: 2250 },
    { level: 3, experience: 4750 },
    { level: 4, experience: 10000 },
    { level: 5, experience: 22500 },
    { level: 6, experience: 47500 },
    { level: 7, experience: 98000 },
    { level: 8, experience: 200000 },
    { level: 9, experience: 350000 },
    { level: 10, experience: 500000 },
    { level: 11, experience: 700000 },
    { level: 12, experience: 950000 },
    { level: 13, experience: 1250000 },
    { level: 14, experience: 1750000 },
    { level: 15, experience: 2250000 },
    { level: 16, experience: 2750000 },
    { level: 17, experience: 3250000 },
  ],
};

/**
 * Determine a character's level based on experience points - OSRIC compliant
 */
export function determineLevel(characterClass: CharacterClass, experiencePoints: number): number {
  const table = EXPERIENCE_TABLES[characterClass];
  if (!table) return 1;

  // Start from the highest level and work backwards
  for (let i = table.length - 1; i >= 0; i--) {
    if (experiencePoints >= table[i].experience) {
      return table[i].level;
    }
  }

  // If somehow below level 1 requirements, return level 1
  return 1;
}

/**
 * Get experience required for next level - OSRIC compliant
 */
export function getExperienceForNextLevel(
  characterClass: CharacterClass,
  currentLevel: number
): number {
  const table = EXPERIENCE_TABLES[characterClass];
  if (!table) return 0;

  const nextLevelEntry = table.find((entry) => entry.level === currentLevel + 1);
  return nextLevelEntry ? nextLevelEntry.experience : 0;
}

/**
 * Get level progression table for a character class - OSRIC compliant
 */
export function getLevelProgressionTable(
  characterClass: CharacterClass
): Array<{ level: number; experience: number }> {
  return EXPERIENCE_TABLES[characterClass] || [];
}

/**
 * Get level title for a character class at a specific level - OSRIC compliant
 */
export function getLevelTitle(characterClass: CharacterClass, level: number): string {
  // Simple level titles for now - can be expanded later
  const titles: Record<CharacterClass, string[]> = {
    Fighter: [
      'Veteran',
      'Warrior',
      'Swordsman',
      'Hero',
      'Swashbuckler',
      'Myrmidon',
      'Champion',
      'Superhero',
      'Lord',
    ],
    Cleric: [
      'Acolyte',
      'Adept',
      'Priest',
      'Curate',
      'Rector',
      'Vicar',
      'Canon',
      'Lama',
      'High Priest',
    ],
    'Magic-User': [
      'Prestidigitator',
      'Evoker',
      'Conjurer',
      'Theurgist',
      'Thaumaturgist',
      'Magician',
      'Enchanter',
      'Warlock',
      'Sorcerer',
      'Necromancer',
      'Wizard',
    ],
    Thief: [
      'Apprentice',
      'Footpad',
      'Robber',
      'Burglar',
      'Cutpurse',
      'Sharper',
      'Pilferer',
      'Master Pilferer',
      'Thief',
      'Master Thief',
    ],
    Paladin: [
      'Gallant',
      'Keeper',
      'Protector',
      'Defender',
      'Warder',
      'Guardian',
      'Chevalier',
      'Justiciar',
      'Paladin',
    ],
    Ranger: [
      'Runner',
      'Strider',
      'Scout',
      'Courser',
      'Tracker',
      'Guide',
      'Pathfinder',
      'Ranger',
      'Ranger Lord',
    ],
    Druid: [
      'Aspirant',
      'Ovate',
      'Initiate',
      'Adept',
      'Priest',
      'Druid',
      'Archdruid',
      'The Great Druid',
    ],
    Illusionist: [
      'Prestidigitator',
      'Trickster',
      'Beguiler',
      'Charmer',
      'Magician',
      'Spellbinder',
      'Enchanter',
      'Warlock',
      'Sorcerer',
      'Illusionist',
    ],
    Assassin: [
      'Bravo',
      'Ruffian',
      'Thug',
      'Killer',
      'Cutthroat',
      'Executioner',
      'Assassin',
      'Expert Assassin',
      'Senior Assassin',
      'Master Assassin',
    ],
    Monk: [
      'Novice',
      'Student',
      'Disciple',
      'Immaculate',
      'Master',
      'Superior Master',
      'Master of Dragons',
      'Master of the North Wind',
      'Master of the West Wind',
      'Master of the South Wind',
      'Master of the East Wind',
      'Master of Winter',
      'Master of Autumn',
      'Master of Summer',
      'Master of Spring',
      'Grand Master of Flowers',
      'Grand Master of the Four Winds',
    ],
  };

  const classTitles = titles[characterClass] || ['Unknown'];
  const titleIndex = Math.min(level - 1, classTitles.length - 1);
  return classTitles[titleIndex] || 'Unknown';
}

/**
 * Simple training requirements - can be expanded later
 */
export function getTrainingRequirements(
  _characterClass: CharacterClass,
  currentLevel: number,
  targetLevel: number
): {
  timeRequired: number; // in weeks
  costRequired: number; // in gold pieces
  trainerRequired: boolean;
} {
  const levelsToGain = targetLevel - currentLevel;
  return {
    timeRequired: levelsToGain * 2, // 2 weeks per level
    costRequired: levelsToGain * currentLevel * 100, // 100 gp per current level per new level
    trainerRequired: targetLevel > 3, // Need trainer after level 3
  };
}

/**
 * Check if training requirements are met
 */
export function meetsTrainingRequirements(
  requirements: { timeRequired: number; costRequired: number; trainerRequired: boolean },
  available: { timeAvailable: number; goldAvailable: number; hasTrainer: boolean }
): boolean {
  return (
    available.timeAvailable >= requirements.timeRequired &&
    available.goldAvailable >= requirements.costRequired &&
    (!requirements.trainerRequired || available.hasTrainer)
  );
}

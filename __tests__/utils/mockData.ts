import type {
  SurvivalNeedStatus,
  SwimmingDifficulty,
  TemperatureRange,
} from '../../rules/environment/types';
import type {
  AbilityScoreModifiers,
  AbilityScores,
  Character,
  CharacterRace,
  Item,
} from '../../rules/types';

/**
 * Creates a mock character for testing
 *
 * @param options Configuration options for the mock character
 * @returns A mock character instance
 */
export const createMockCharacter = (
  options: {
    strength?: number;
    race?: CharacterRace;
    inventory?: Item[];
    equipLightSource?: boolean;
    customizeCharacter?: Partial<Character>;
  } = {}
): Character => {
  const {
    strength = 10,
    race = 'Human',
    inventory = [],
    equipLightSource = false,
    customizeCharacter = {},
  } = options;

  // If equipLightSource is true, add a torch to the inventory
  const finalInventory = [...inventory];
  if (equipLightSource && !inventory.some((item) => item.name === 'Torch')) {
    const lightSource: Item = {
      id: 'torch-1',
      name: 'Torch',
      weight: 0.5,
      description: 'A wooden stick wrapped with oil-soaked cloth.',
      value: 1,
      equipped: equipLightSource,
      magicBonus: null,
      charges: null,
    };
    finalInventory.push(lightSource);
  }

  const abilityModifiers: AbilityScoreModifiers = {
    // Strength
    strengthHitAdj: null,
    strengthDamageAdj: null,
    strengthEncumbrance: null,
    strengthOpenDoors: null,
    strengthBendBars: null,

    // Dexterity
    dexterityReaction: null,
    dexterityMissile: null,
    dexterityDefense: null,
    dexterityPickPockets: null,
    dexterityOpenLocks: null,
    dexterityFindTraps: null,
    dexterityMoveSilently: null,
    dexterityHideInShadows: null,

    // Constitution
    constitutionHitPoints: null,
    constitutionSystemShock: null,
    constitutionResurrectionSurvival: null,
    constitutionPoisonSave: null,

    // Intelligence
    intelligenceLanguages: null,
    intelligenceLearnSpells: null,
    intelligenceMaxSpellLevel: null,
    intelligenceIllusionImmunity: false,

    // Wisdom
    wisdomMentalSave: null,
    wisdomBonusSpells: null,
    wisdomSpellFailure: null,

    // Charisma
    charismaReactionAdj: null,
    charismaLoyaltyBase: null,
    charismaMaxHenchmen: null,
  };

  const baseCharacter: Character = {
    id: 'test-char',
    name: 'Test Character',
    level: 1,
    hitPoints: { current: 10, maximum: 10 },
    armorClass: 10,
    thac0: 20,
    experience: { current: 0, requiredForNextLevel: 2000, level: 1 },
    alignment: 'Lawful Good',
    inventory: finalInventory,
    position: 'standing',
    statusEffects: [],
    race,
    class: 'Fighter',
    abilities: {
      strength,
      dexterity: 10,
      constitution: 10,
      intelligence: 10,
      wisdom: 10,
      charisma: 10,
    },
    abilityModifiers,
    savingThrows: {
      'Poison or Death': 14,
      Wands: 15,
      'Paralysis, Polymorph, or Petrification': 16,
      'Breath Weapons': 17,
      'Spells, Rods, or Staves': 17,
    },
    spells: [],
    currency: { platinum: 0, gold: 10, electrum: 0, silver: 0, copper: 0 },
    encumbrance: 0,
    movementRate: 36,
    classes: { Fighter: 1 },
    primaryClass: null,
    spellSlots: {},
    memorizedSpells: {},
    spellbook: [],
    thiefSkills: null,
    turnUndead: null,
    languages: ['Common'],
    age: 25,
    ageCategory: 'Adult',
    henchmen: [],
    racialAbilities: [],
    classAbilities: [],
    proficiencies: [],
    secondarySkills: [],
  };

  // Apply any custom character properties
  return { ...baseCharacter, ...customizeCharacter };
};

/**
 * Creates a mock item for testing
 *
 * @param weight The weight of the item
 * @returns A mock item instance
 */
export const createMockItem = (weight: number): Item => ({
  id: `item-${weight}`,
  name: `Test Item ${weight}kg`,
  weight,
  description: 'Test item',
  value: 1,
  equipped: false,
  magicBonus: null,
  charges: null,
});

// Standard ability scores for testing
export const standardAbilityScores: AbilityScores = {
  strength: 16,
  dexterity: 14,
  constitution: 15,
  intelligence: 12,
  wisdom: 10,
  charisma: 13,
};

// Standard ability modifiers corresponding to standard scores
export const standardAbilityModifiers: AbilityScoreModifiers = {
  // Strength
  strengthHitAdj: 1,
  strengthDamageAdj: 1,
  strengthEncumbrance: 35,
  strengthOpenDoors: 1,
  strengthBendBars: 10,

  // Dexterity
  dexterityReaction: -1,
  dexterityMissile: 1,
  dexterityDefense: -1,
  dexterityPickPockets: 0,
  dexterityOpenLocks: 0,
  dexterityFindTraps: 0,
  dexterityMoveSilently: 0,
  dexterityHideInShadows: 0,

  // Constitution
  constitutionHitPoints: 1,
  constitutionSystemShock: 90,
  constitutionResurrectionSurvival: 92,
  constitutionPoisonSave: 0,

  // Intelligence
  intelligenceLanguages: 3,
  intelligenceLearnSpells: 55,
  intelligenceMaxSpellLevel: 7,
  intelligenceIllusionImmunity: false,

  // Wisdom
  wisdomMentalSave: 0,
  wisdomBonusSpells: null,
  wisdomSpellFailure: 0,

  // Charisma
  charismaReactionAdj: 1,
  charismaLoyaltyBase: 55,
  charismaMaxHenchmen: 5,
};

// Environment testing specific mock data
export const mockSurvivalStatus: SurvivalNeedStatus = {
  daysSinceLastFood: 0,
  daysSinceLastWater: 0,
  currentEffects: [],
};

export const mockTerrains = [
  'Forest',
  'Desert',
  'Mountains',
  'Plains',
  'Swamp',
  'Arctic',
  'Dungeon',
];

export const mockSwimmingDifficulties: SwimmingDifficulty[] = [
  'Calm',
  'Choppy',
  'Rough',
  'Stormy',
  'Treacherous',
];

export const mockTemperatures: TemperatureRange[] = [
  'Frigid',
  'Cold',
  'Cool',
  'Moderate',
  'Warm',
  'Hot',
  'Extreme',
];

export const mockAdventurer = createMockCharacter({
  strength: 16,
  customizeCharacter: {
    id: 'char_adventurer',
    name: 'Thorn the Explorer',
    level: 3,
    hitPoints: { current: 24, maximum: 24 },
    class: 'Ranger',
    abilities: standardAbilityScores,
    abilityModifiers: standardAbilityModifiers,
    languages: ['Common', 'Elvish', 'Dwarvish'],
    encumbrance: 80,
    movementRate: 12,
    armorClass: 7, // Lower is better in OSRIC
    thac0: 18,
    classes: { Ranger: 3 },
    primaryClass: 'Ranger',
  },
});

export const mockWeakAdventurer = createMockCharacter({
  strength: 10,
  customizeCharacter: {
    id: 'char_weak_adventurer',
    name: 'Frail Finn',
    hitPoints: { current: 12, maximum: 12 },
    abilities: {
      ...standardAbilityScores,
      constitution: 6, // Very low constitution
    },
    abilityModifiers: {
      ...standardAbilityModifiers,
      constitutionHitPoints: -1,
      constitutionSystemShock: 40,
      constitutionResurrectionSurvival: 50,
      constitutionPoisonSave: -1,
    },
  },
});

export const mockArmoredAdventurer = createMockCharacter({
  strength: 16,
  customizeCharacter: {
    id: 'char_armored_adventurer',
    name: 'Armored Albert',
    armorClass: 3, // Plate mail
    movementRate: 9, // Reduced due to heavy armor
    encumbrance: 220, // Heavy encumbrance
    hitPoints: { current: 24, maximum: 24 },
    abilities: standardAbilityScores,
    abilityModifiers: standardAbilityModifiers,
  },
});

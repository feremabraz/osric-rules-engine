import type { AbilityScores, CharacterClass, CharacterRace, RacialAbility } from '@rules/types';

/**
 * Gets racial language choices for a character race
 */
export const getRacialLanguages = (race: CharacterRace): string[] => {
  const languagesByRace: Record<CharacterRace, string[]> = {
    Human: ['Common'],
    Dwarf: ['Common', 'Dwarfish', 'Gnomish', 'Goblin', 'Kobold', 'Orcish'],
    Elf: ['Common', 'Elven', 'Gnoll', 'Gnomish', 'Goblin', 'Halfling', 'Hobgoblin', 'Orcish'],
    Gnome: ['Common', 'Dwarfish', 'Gnomish', 'Goblin', 'Halfling', 'Kobold'],
    'Half-Elf': ['Common', 'Elven', 'Gnoll', 'Gnome', 'Goblin', 'Halfling', 'Hobgoblin', 'Orcish'],
    Halfling: ['Common', 'Dwarfish', 'Gnome', 'Goblin', 'Halfling', 'Orcish'],
    'Half-Orc': ['Common', 'Orcish'],
  };

  return languagesByRace[race] || ['Common'];
};

/**
 * Gets maximum additional languages a race can learn based on intelligence
 */
export const getMaxAdditionalLanguages = (race: CharacterRace, intelligence: number): number => {
  // Default maximum additional languages based on intelligence
  let maxByIntelligence = 0;

  if (intelligence >= 8) {
    maxByIntelligence = Math.floor((intelligence - 8) / 2) + 1;
  }

  // Race-specific limits override the intelligence-based maximum
  const racialLimits: Record<CharacterRace, number> = {
    Human: maxByIntelligence, // No limit for humans
    Dwarf: 2,
    Elf: 3, // Can learn 3 if Int is 18
    Gnome: 2,
    'Half-Elf': maxByIntelligence, // No racial limit
    Halfling: 2,
    'Half-Orc': 2,
  };

  return Math.min(racialLimits[race], maxByIntelligence);
};

/**
 * Gets racial level limits for classes
 */
export const getRaceLevelLimits = (
  race: CharacterRace,
  characterClass: CharacterClass,
  strength: number,
  intelligence: number,
  dexterity: number
): number | null => {
  // Human characters have unlimited advancement in all classes
  if (race === 'Human') {
    return null;
  }

  // Create a full AbilityScores object with default values for unused properties
  const abilityScores: AbilityScores = {
    strength,
    intelligence,
    dexterity,
    constitution: 10, // Default values for unused abilities
    wisdom: 10,
    charisma: 10,
  };

  // Define level limits for non-human races
  const levelLimits: Partial<
    Record<
      CharacterRace,
      Partial<Record<CharacterClass, number | null | ((attrs: AbilityScores) => number)>>
    >
  > = {
    Human: {}, // Humans have no level limits
    Dwarf: {
      Assassin: 9,
      Cleric: 8,
      Druid: null,
      Fighter: (attrs: AbilityScores) => (attrs.strength >= 18 ? 9 : attrs.strength >= 17 ? 8 : 7),
      Illusionist: null,
      'Magic-User': null,
      Paladin: null,
      Ranger: null,
      Thief: null, // Unlimited
    },
    Elf: {
      Assassin: 10,
      Cleric: 7,
      Druid: null,
      Fighter: (attrs: AbilityScores) => (attrs.strength >= 18 ? 7 : attrs.strength >= 17 ? 6 : 5),
      Illusionist: null,
      'Magic-User': (attrs: AbilityScores) =>
        attrs.intelligence >= 18 ? 11 : attrs.intelligence >= 17 ? 10 : 9,
      Paladin: null,
      Ranger: null,
      Thief: null, // Unlimited
    },
    Gnome: {
      Assassin: 8,
      Cleric: 7,
      Druid: null,
      Fighter: (attrs: AbilityScores) => (attrs.strength >= 18 ? 6 : 5),
      Illusionist: (attrs: AbilityScores) => {
        if (attrs.intelligence >= 18 && attrs.dexterity >= 17) return 7;
        if (attrs.intelligence >= 17 && attrs.dexterity >= 17) return 7;
        if (attrs.intelligence >= 17 || attrs.dexterity >= 17) return 6;
        return 5;
      },
      'Magic-User': null,
      Paladin: null,
      Ranger: null,
      Thief: null, // Unlimited
    },
    'Half-Elf': {
      Fighter: 8,
      Ranger: 8,
      'Magic-User': 12,
      Cleric: 5,
      Druid: 8,
      Thief: 12,
      Assassin: 11,
      Paladin: null,
      Illusionist: null,
    },
    Halfling: {
      Fighter: (attrs: AbilityScores) => (attrs.strength >= 18 ? 6 : 4),
      Ranger: null,
      'Magic-User': null,
      Cleric: null,
      Druid: null,
      Thief: 8,
      Assassin: null,
      Paladin: null,
      Illusionist: 6,
    },
    'Half-Orc': {
      Fighter: 10,
      Ranger: null,
      'Magic-User': null,
      Cleric: 4,
      Druid: null,
      Thief: 8,
      Assassin: (attrs: AbilityScores) => (attrs.dexterity >= 15 ? 10 : 8),
      Paladin: null,
      Illusionist: null,
    },
  };

  const limit = levelLimits[race]?.[characterClass];

  if (limit === null) {
    return null; // Class not available to this race
  }

  if (typeof limit === 'function') {
    return limit(abilityScores);
  }

  return limit === undefined ? null : limit;
};

/**
 * Gets infravision distance for a race
 */
export const getInfravisionDistance = (race: CharacterRace): number | null => {
  // Most demi-human races have 18-meter infravision (converted from 60 feet)
  const distances: Record<CharacterRace, number | null> = {
    Human: null,
    Dwarf: 18,
    Elf: 18,
    Gnome: 18,
    'Half-Elf': 18,
    Halfling: 18,
    'Half-Orc': 18,
  };

  return distances[race];
};

/**
 * Gets base movement rate for a race in meters
 */
export const getBaseMovementRate = (race: CharacterRace): number => {
  const movementRates: Record<CharacterRace, number> = {
    Human: 36, // Converted from 120 feet
    Dwarf: 27, // Converted from 90 feet
    Elf: 36,
    Gnome: 27,
    'Half-Elf': 36,
    Halfling: 27,
    'Half-Orc': 36,
  };

  return movementRates[race];
};

/**
 * Gets the racial abilities for a character race
 */
export const getRacialAbilities = (race: CharacterRace): RacialAbility[] => {
  const abilities: Record<CharacterRace, RacialAbility[]> = {
    Human: [
      {
        name: 'Unlimited Advancement',
        description: 'Humans have no level limits for any class.',
        effect: () => {
          /* No specific effect needed */
        },
      },
    ],
    Dwarf: [
      {
        name: 'Magic Resistance',
        description: 'Bonus against magic based on constitution: +1 per 3.5 points of Con',
        effect: () => {
          /* Apply magic resistance based on Con */
        },
      },
      {
        name: 'Poison Resistance',
        description: 'Bonus against poison based on constitution: +1 per 3.5 points of Con',
        effect: () => {
          /* Apply poison resistance based on Con */
        },
      },
      {
        name: 'Combat Bonus vs. Goblinoids',
        description: '+1 to hit against goblins, half-orcs, hobgoblins, and orcs',
        effect: () => {
          /* Apply combat bonus against specified enemies */
        },
      },
      {
        name: 'Defense Bonus vs. Giants',
        description:
          '-4 penalty to attack rolls made against the dwarf by giants, ogres, ogre mages, titans and trolls',
        effect: () => {
          /* Apply defense bonus against specified enemies */
        },
      },
      {
        name: 'Stonework Detection',
        description: 'Ability to detect certain features of stonework',
        effect: () => {
          /* Apply stonework detection abilities */
        },
      },
    ],
    Elf: [
      {
        name: 'Sleep and Charm Resistance',
        description: '90% resistance to sleep and charm spells',
        effect: () => {
          /* Apply sleep/charm resistance */
        },
      },
      {
        name: 'Combat Bonus',
        description: '+1 to hit with bow, longsword, and short sword',
        effect: () => {
          /* Apply combat bonuses with specific weapons */
        },
      },
      {
        name: 'Secret Door Detection',
        description: 'Enhanced ability to detect secret doors',
        effect: () => {
          /* Apply secret door detection ability */
        },
      },
      {
        name: 'Surprise Bonus',
        description: 'Bonus to surprise enemies when alone or with elves/halflings',
        effect: () => {
          /* Apply surprise bonus */
        },
      },
    ],
    Gnome: [
      {
        name: 'Magic Resistance',
        description: 'Bonus against magic based on constitution: +1 per 3.5 points of Con',
        effect: () => {
          /* Apply magic resistance based on Con */
        },
      },
      {
        name: 'Poison Resistance',
        description: 'Bonus against poison based on constitution: +1 per 3.5 points of Con',
        effect: () => {
          /* Apply poison resistance based on Con */
        },
      },
      {
        name: 'Combat Bonus vs. Kobolds and Goblins',
        description: '+1 to hit against kobolds and goblins',
        effect: () => {
          /* Apply combat bonus against specified enemies */
        },
      },
      {
        name: 'Defense Bonus vs. Larger Enemies',
        description: '-4 penalty to attack rolls made against the gnome by larger humanoids',
        effect: () => {
          /* Apply defense bonus against specified enemies */
        },
      },
      {
        name: 'Stonework Detection',
        description:
          'Ability to detect certain features of stonework and determine depth/direction underground',
        effect: () => {
          /* Apply stonework detection abilities */
        },
      },
      {
        name: 'Speak with Burrowing Animals',
        description: 'Ability to communicate with normal burrowing animals',
        effect: () => {
          /* Apply animal communication ability */
        },
      },
    ],
    'Half-Elf': [
      {
        name: 'Sleep and Charm Resistance',
        description: '30% resistance to sleep and charm spells',
        effect: () => {
          /* Apply sleep/charm resistance */
        },
      },
      {
        name: 'Secret Door Detection',
        description: 'Enhanced ability to detect secret doors',
        effect: () => {
          /* Apply secret door detection ability */
        },
      },
    ],
    Halfling: [
      {
        name: 'Magic Resistance',
        description: 'Bonus against magic based on constitution: +1 per 3.5 points of Con',
        effect: () => {
          /* Apply magic resistance based on Con */
        },
      },
      {
        name: 'Poison Resistance',
        description: 'Bonus against poison based on constitution: +1 per 3.5 points of Con',
        effect: () => {
          /* Apply poison resistance based on Con */
        },
      },
      {
        name: 'Missile Weapon Bonus',
        description: '+3 bonus to attacks with bow or sling',
        effect: () => {
          /* Apply missile weapon bonus */
        },
      },
      {
        name: 'Surprise Bonus',
        description: 'Bonus to surprise enemies when alone or with elves/halflings',
        effect: () => {
          /* Apply surprise bonus */
        },
      },
    ],
    'Half-Orc': [
      {
        name: 'Exceptional Strength',
        description: 'Half-orcs have naturally high strength and constitution',
        effect: () => {
          /* Apply strength and constitution adjustments */
        },
      },
    ],
  };

  return abilities[race] || [];
};

/**
 * Gets permitted class options for a race
 */
export const getPermittedClassOptions = (race: CharacterRace): CharacterClass[] => {
  const permittedClasses: Record<CharacterRace, CharacterClass[]> = {
    Human: [
      'Fighter',
      'Paladin',
      'Ranger',
      'Magic-User',
      'Illusionist',
      'Cleric',
      'Druid',
      'Thief',
      'Assassin',
    ],
    Dwarf: ['Fighter', 'Cleric', 'Thief', 'Assassin'],
    Elf: ['Fighter', 'Magic-User', 'Cleric', 'Thief', 'Assassin'],
    Gnome: ['Fighter', 'Cleric', 'Thief', 'Assassin', 'Illusionist'],
    'Half-Elf': ['Fighter', 'Ranger', 'Magic-User', 'Cleric', 'Thief', 'Assassin'],
    Halfling: ['Fighter', 'Druid', 'Thief'],
    'Half-Orc': ['Fighter', 'Cleric', 'Thief', 'Assassin'],
  };

  return permittedClasses[race] || [];
};

/**
 * Gets multi-class options for a race
 */
export const getMultiClassOptions = (race: CharacterRace): CharacterClass[][] => {
  // Humans can't multi-class, only dual-class
  if (race === 'Human') {
    return [];
  }

  const multiClassOptions: Record<CharacterRace, CharacterClass[][]> = {
    Dwarf: [['Fighter', 'Thief']],
    Elf: [
      ['Fighter', 'Magic-User'],
      ['Fighter', 'Thief'],
      ['Magic-User', 'Thief'],
      ['Fighter', 'Magic-User', 'Thief'],
    ],
    Gnome: [
      ['Fighter', 'Illusionist'],
      ['Fighter', 'Thief'],
      ['Illusionist', 'Thief'],
    ],
    'Half-Elf': [
      ['Cleric', 'Fighter'],
      ['Cleric', 'Ranger'],
      ['Cleric', 'Magic-User'],
      ['Fighter', 'Magic-User'],
      ['Fighter', 'Thief'],
      ['Magic-User', 'Thief'],
      ['Cleric', 'Fighter', 'Magic-User'],
      ['Fighter', 'Magic-User', 'Thief'],
    ],
    Halfling: [['Fighter', 'Thief']],
    'Half-Orc': [
      ['Cleric', 'Fighter'],
      ['Cleric', 'Thief'],
      ['Cleric', 'Assassin'],
      ['Fighter', 'Thief'],
      ['Fighter', 'Assassin'],
    ],
    Human: [], // Empty since humans can't multi-class
  };

  return multiClassOptions[race] || [];
};

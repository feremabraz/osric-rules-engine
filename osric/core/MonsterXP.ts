import type { Character, Monster } from '../types/entities';

const BASE_XP_BY_HD: Record<string, number> = {
  'less-than-1': 5,
  '1-minus': 7,
  '1': 10,
  '1-plus': 15,
  '2': 20,
  '2-plus': 35,
  '3': 50,
  '3-plus': 75,
  '4': 125,
  '4-plus': 175,
  '5': 275,
  '5-plus': 425,
  '6': 650,
  '6-plus': 975,
  '7': 1400,
  '7-plus': 1850,
  '8': 2300,
  '8-plus': 2750,
  '9': 3000,
  '9-plus': 3500,
  '10': 4000,
  '10-plus': 4500,
  '11': 5000,
  '11-plus': 5500,
  '12': 6000,
  '12-plus': 6500,
  '13': 7000,
  '13-plus': 7500,
  '14': 8000,
  '14-plus': 8500,
  '15': 9000,
  '15-plus': 9500,
  '16': 10000,
  '16-plus': 10500,
};

const SPECIAL_ABILITY_XP: Record<string, number> = {
  'breath-weapon': 100,
  poison: 100,
  paralysis: 75,
  'energy-drain': 200,
  'magic-use': 100,
  'spell-like-abilities': 50,

  'magic-resistance': 100,
  immunity: 75,
  regeneration: 100,
  invisibility: 50,

  'swallow-whole': 100,
  'multiple-attacks': 50,
  charm: 75,
  fear: 50,
  confusion: 75,

  flight: 25,
  teleportation: 50,
  phasing: 75,
};

function getBaseXP(hitDiceString: string): number {
  let hdKey: string;

  if (hitDiceString.includes('/')) {
    hdKey = 'less-than-1';
  } else if (hitDiceString.includes('+')) {
    const baseHD = Number.parseInt(hitDiceString.split('+')[0], 10);
    hdKey = `${baseHD}-plus`;
  } else if (hitDiceString.includes('-')) {
    const baseHD = Number.parseInt(hitDiceString.split('-')[0], 10);
    hdKey = `${baseHD}-minus`;
  } else {
    const baseHD = Number.parseInt(hitDiceString, 10);
    hdKey = baseHD.toString();
  }

  return BASE_XP_BY_HD[hdKey] || BASE_XP_BY_HD['16-plus'];
}

function calculateSpecialAbilityXP(monster: Monster): number {
  let bonusXP = 0;

  if (monster.specialAbilities) {
    for (const ability of monster.specialAbilities) {
      const abilityKey = ability.toLowerCase().replace(/\s+/g, '-');
      bonusXP += SPECIAL_ABILITY_XP[abilityKey] || 0;
    }
  }

  return bonusXP;
}

export function calculateMonsterXP(monster: Monster): number {
  const baseXP = getBaseXP(monster.hitDice);
  const abilityXP = calculateSpecialAbilityXP(monster);
  const totalXP = baseXP + abilityXP;

  return Math.max(1, totalXP);
}

export interface GroupXPParameters {
  monsters: Monster[];
  characters: Character[];
  encounterDifficulty?: 'easy' | 'normal' | 'hard' | 'deadly';
  roleplayingBonus?: number;
  tacticalBonus?: number;
}

export function calculateGroupXP(parameters: GroupXPParameters): Map<string, number> {
  const {
    monsters,
    characters,
    encounterDifficulty = 'normal',
    roleplayingBonus = 0,
    tacticalBonus = 0,
  } = parameters;

  let totalMonsterXP = 0;
  for (const monster of monsters) {
    totalMonsterXP += calculateMonsterXP(monster);
  }

  const difficultyMultiplier = getDifficultyMultiplier(encounterDifficulty, characters.length);
  let adjustedXP = Math.floor(totalMonsterXP * difficultyMultiplier);

  if (roleplayingBonus > 0) {
    adjustedXP += Math.floor(adjustedXP * (roleplayingBonus / 100));
  }

  if (tacticalBonus > 0) {
    adjustedXP += Math.floor(adjustedXP * (tacticalBonus / 100));
  }

  const xpDistribution = new Map<string, number>();
  const activeCharacters = characters.filter((char) => char.hitPoints.current > 0);

  if (activeCharacters.length === 0) {
    return xpDistribution;
  }

  const xpPerCharacter = Math.floor(adjustedXP / activeCharacters.length);

  for (const character of activeCharacters) {
    let characterXP = xpPerCharacter;

    characterXP = applyClassXPModifier(character, characterXP);

    characterXP = applyPrimeRequisiteBonus(character, characterXP);

    xpDistribution.set(character.id, characterXP);
  }

  return xpDistribution;
}

function getDifficultyMultiplier(difficulty: string, partySize: number): number {
  const baseMultipliers: Record<string, number> = {
    easy: 0.75,
    normal: 1.0,
    hard: 1.25,
    deadly: 1.5,
  };

  let multiplier = baseMultipliers[difficulty] || 1.0;

  if (partySize <= 3) {
    multiplier *= 1.1;
  } else if (partySize >= 6) {
    multiplier *= 0.9;
  }

  return multiplier;
}

function applyClassXPModifier(character: Character, baseXP: number): number {
  const activeClasses = Object.values(character.classes).filter((level) => level && level > 0);
  if (activeClasses.length > 1) {
    return Math.floor(baseXP / activeClasses.length);
  }

  return baseXP;
}

function applyPrimeRequisiteBonus(character: Character, baseXP: number): number {
  let highestPrimeReq = 0;

  for (const [className, level] of Object.entries(character.classes)) {
    if (level && level > 0) {
      const primeReqs = getPrimeRequisites(className);
      for (const ability of primeReqs) {
        const score = character.abilities[ability as keyof typeof character.abilities];
        if (score > highestPrimeReq) {
          highestPrimeReq = score;
        }
      }
    }
  }

  if (highestPrimeReq >= 16) {
    return Math.floor(baseXP * 1.1);
  }
  if (highestPrimeReq >= 13) {
    return Math.floor(baseXP * 1.05);
  }

  return baseXP;
}

function getPrimeRequisites(className: string): string[] {
  const primeRequisites: Record<string, string[]> = {
    fighter: ['strength'],
    cleric: ['wisdom'],
    'magic-user': ['intelligence'],
    thief: ['dexterity'],
    ranger: ['strength', 'intelligence', 'wisdom'],
    paladin: ['strength', 'charisma'],
    druid: ['wisdom', 'charisma'],
    illusionist: ['intelligence'],
    assassin: ['strength', 'intelligence', 'dexterity'],
    monk: ['strength', 'wisdom', 'dexterity'],
    bard: ['dexterity', 'intelligence', 'charisma'],
  };

  return primeRequisites[className.toLowerCase()] || [];
}

export function calculateXPForNextLevel(character: Character): number {
  const primaryClass = character.class;
  const currentLevel = character.level;

  const classMultipliers: Record<string, number> = {
    Fighter: 2000,
    Cleric: 1500,
    'Magic-User': 2500,
    Thief: 1200,
    Paladin: 2750,
    Ranger: 2250,
    Druid: 2000,
    Illusionist: 2250,
    Assassin: 1500,
    Monk: 2250,
  };

  const multiplier = classMultipliers[primaryClass] || 2000;
  return multiplier * (currentLevel + 1);
}

export function canLevelUp(character: Character): boolean {
  const xpNeeded = calculateXPForNextLevel(character);
  return character.experience.current >= xpNeeded;
}

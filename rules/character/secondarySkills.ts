/**
 * Secondary Skills
 * These represent non-class-based proficiencies and background knowledge
 */

/**
 * Secondary skill categories
 */
export const SECONDARY_SKILL_CATEGORIES = [
  'Agriculture',
  'Animal Handling',
  'Armorer/Weaponsmith',
  'Artisan/Engineer',
  'Baker',
  'Blacksmith',
  'Bowyer/Fletcher',
  'Brewer',
  'Butcher',
  'Carpenter',
  'Cook',
  'Fisher',
  'Forester',
  'Gambler',
  'Hunter/Trapper',
  'Jeweler',
  'Leather Worker',
  'Mason',
  'Miner',
  'Navigator',
  'Sailor',
  'Scribe',
  'Shipwright',
  'Tailor',
  'Teamster',
  'Trader/Merchant',
  'Weaver',
  'Woodworker',
] as const;

export type SecondarySkill = (typeof SECONDARY_SKILL_CATEGORIES)[number];

/**
 * Secondary skills grouped by origins (for random selection)
 */
export const SKILL_GROUPS: Record<string, SecondarySkill[]> = {
  Rural: [
    'Agriculture',
    'Animal Handling',
    'Blacksmith',
    'Carpenter',
    'Fisher',
    'Forester',
    'Hunter/Trapper',
    'Leather Worker',
    'Woodworker',
  ],
  Urban: [
    'Armorer/Weaponsmith',
    'Artisan/Engineer',
    'Baker',
    'Brewer',
    'Butcher',
    'Cook',
    'Gambler',
    'Jeweler',
    'Mason',
    'Scribe',
    'Tailor',
    'Trader/Merchant',
    'Weaver',
  ],
  Wilderness: ['Forester', 'Hunter/Trapper', 'Leather Worker', 'Miner'],
  Maritime: ['Fisher', 'Navigator', 'Sailor', 'Shipwright'],
  Traveling: ['Gambler', 'Teamster', 'Trader/Merchant'],
};

/**
 * Secondary skill expertise levels
 */
export enum SkillLevel {
  Novice = 1,
  Apprentice = 2,
  Journeyman = 3,
  Master = 4,
}

/**
 * Secondary skill with expertise level
 */
export interface CharacterSecondarySkill {
  skill: SecondarySkill;
  level: SkillLevel;
}

/**
 * Generate a random secondary skill for a character
 */
export function generateRandomSecondarySkill(): CharacterSecondarySkill {
  // Roll 1d100 to determine skill category
  const roll = Math.floor(Math.random() * 100) + 1;
  let category: keyof typeof SKILL_GROUPS;

  if (roll <= 40) {
    category = 'Rural';
  } else if (roll <= 70) {
    category = 'Urban';
  } else if (roll <= 85) {
    category = 'Traveling';
  } else if (roll <= 95) {
    category = 'Maritime';
  } else {
    category = 'Wilderness';
  }

  // Pick a random skill from that category
  const skills = SKILL_GROUPS[category];
  const randomIndex = Math.floor(Math.random() * skills.length);
  const skill = skills[randomIndex];

  // Determine expertise level (mostly novice/apprentice)
  const levelRoll = Math.floor(Math.random() * 100) + 1;
  let level: SkillLevel;

  if (levelRoll <= 50) {
    level = SkillLevel.Novice;
  } else if (levelRoll <= 85) {
    level = SkillLevel.Apprentice;
  } else if (levelRoll <= 98) {
    level = SkillLevel.Journeyman;
  } else {
    level = SkillLevel.Master;
  }

  return {
    skill,
    level,
  };
}

/**
 * Determine if a skill check succeeds based on skill level
 * @param skill The character's secondary skill
 * @param difficulty 1-20 difficulty rating (higher is harder)
 * @returns Whether the skill check succeeds
 */
export function checkSecondarySkill(skill: CharacterSecondarySkill, difficulty: number): boolean {
  // Base success chance by level
  const baseChance = {
    [SkillLevel.Novice]: 50,
    [SkillLevel.Apprentice]: 65,
    [SkillLevel.Journeyman]: 80,
    [SkillLevel.Master]: 95,
  };

  // Calculate success chance based on difficulty
  const successChance = baseChance[skill.level] - difficulty * 5;

  // Roll percentile
  const roll = Math.floor(Math.random() * 100) + 1;

  return roll <= successChance;
}

/**
 * Get a description of a character's proficiency with a secondary skill
 */
export function getSkillLevelDescription(level: SkillLevel): string {
  switch (level) {
    case SkillLevel.Novice:
      return 'has basic familiarity with';
    case SkillLevel.Apprentice:
      return 'is competent with';
    case SkillLevel.Journeyman:
      return 'is highly skilled in';
    case SkillLevel.Master:
      return 'has mastered';
    default:
      return 'knows something about';
  }
}

import type { AbilityScores } from '@rules/types';

/**
 * Contains methods to generate ability scores based on OSRIC rules
 */

/**
 * Generate ability scores using the standard 3d6 method
 * Rolls 3d6 for each ability in order
 */
export const generateStandard3d6 = (): AbilityScores => {
  const rollDice = () => Math.floor(Math.random() * 6) + 1; // Simulate a d6 roll
  const roll3d6 = () => rollDice() + rollDice() + rollDice();

  return {
    strength: roll3d6(),
    dexterity: roll3d6(),
    constitution: roll3d6(),
    intelligence: roll3d6(),
    wisdom: roll3d6(),
    charisma: roll3d6(),
  };
};

/**
 * Generate ability scores using 3d6 but allow arranging the scores
 * Rolls 3d6 six times, returning the scores for player to assign
 */
export const generate3d6Arranged = (): number[] => {
  const rollDice = () => Math.floor(Math.random() * 6) + 1;
  const roll3d6 = () => rollDice() + rollDice() + rollDice();

  return Array(6)
    .fill(0)
    .map(() => roll3d6());
};

/**
 * Generate ability scores using 4d6, drop lowest
 * This method tends to generate higher ability scores
 */
export const generate4d6DropLowest = (): number[] => {
  const rollDice = () => Math.floor(Math.random() * 6) + 1;

  const roll4d6DropLowest = () => {
    const rolls = [rollDice(), rollDice(), rollDice(), rollDice()];
    const minRoll = Math.min(...rolls);
    const minIndex = rolls.indexOf(minRoll);
    return rolls.reduce((sum, val, index) => (index !== minIndex ? sum + val : sum), 0);
  };

  return Array(6)
    .fill(0)
    .map(() => roll4d6DropLowest());
};

/**
 * Check if ability scores qualify for a fighter's exceptional strength
 * Fighters, paladins, and rangers with 18 strength roll d% for exceptional strength
 */
export const rollExceptionalStrength = (characterClass: string): number | null => {
  // Only fighters, paladins, and rangers can have exceptional strength
  if (!['Fighter', 'Paladin', 'Ranger'].includes(characterClass)) {
    return null;
  }

  // Roll percentile dice
  const roll = Math.floor(Math.random() * 100) + 1;
  return roll;
};

/**
 * Apply racial ability score adjustments
 */
export const applyRacialAbilityAdjustments = (
  abilityScores: AbilityScores,
  race: string
): AbilityScores => {
  const newScores = { ...abilityScores };

  switch (race) {
    case 'Dwarf':
      newScores.constitution += 1;
      newScores.charisma -= 1; // Only with respect to non-dwarfs
      break;
    case 'Elf':
      newScores.dexterity += 1;
      newScores.constitution -= 1;
      break;
    case 'Halfling':
      newScores.strength -= 1;
      newScores.dexterity += 1;
      break;
    case 'Half-Orc':
      newScores.strength += 1;
      newScores.constitution += 1;
      newScores.charisma -= 2;
      break;
    // No adjustments for humans or other races
  }

  // Ensure no score goes below 3 or above 18 (unless exceptional strength)
  for (const key of Object.keys(newScores)) {
    const ability = key as keyof AbilityScores;
    if (newScores[ability] < 3) newScores[ability] = 3;
    if (newScores[ability] > 18) newScores[ability] = 18;
  }

  return newScores;
};

/**
 * Check if ability scores meet racial minimum requirements
 */
export const meetsRacialRequirements = (abilityScores: AbilityScores, race: string): boolean => {
  switch (race) {
    case 'Dwarf':
      return (
        abilityScores.strength >= 8 &&
        abilityScores.dexterity >= 3 &&
        abilityScores.constitution >= 12 &&
        abilityScores.intelligence >= 3 &&
        abilityScores.wisdom >= 3 &&
        abilityScores.charisma >= 3
      );
    case 'Elf':
      return (
        abilityScores.strength >= 3 &&
        abilityScores.dexterity >= 7 &&
        abilityScores.constitution >= 8 &&
        abilityScores.intelligence >= 8 &&
        abilityScores.wisdom >= 3 &&
        abilityScores.charisma >= 8
      );
    case 'Gnome':
      return (
        abilityScores.strength >= 6 &&
        abilityScores.dexterity >= 3 &&
        abilityScores.constitution >= 8 &&
        abilityScores.intelligence >= 7 &&
        abilityScores.wisdom >= 3 &&
        abilityScores.charisma >= 3
      );
    case 'Half-Elf':
      return (
        abilityScores.strength >= 3 &&
        abilityScores.dexterity >= 6 &&
        abilityScores.constitution >= 6 &&
        abilityScores.intelligence >= 4 &&
        abilityScores.wisdom >= 3 &&
        abilityScores.charisma >= 3
      );
    case 'Halfling':
      return (
        abilityScores.strength >= 6 &&
        abilityScores.dexterity >= 8 &&
        abilityScores.constitution >= 10 &&
        abilityScores.intelligence >= 6 &&
        abilityScores.wisdom >= 3 &&
        abilityScores.charisma >= 3
      );
    case 'Half-Orc':
      return (
        abilityScores.strength >= 6 &&
        abilityScores.dexterity >= 3 &&
        abilityScores.constitution >= 13 &&
        abilityScores.intelligence >= 3 &&
        abilityScores.wisdom >= 3 &&
        abilityScores.charisma >= 3
      );
    case 'Human':
      // Humans have no ability score requirements
      return true;
    default:
      return false;
  }
};

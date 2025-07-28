import type { Character, Monster, StatusEffect } from '@rules/types';
import { roll } from '@rules/utils/dice';

/**
 * Check if a character survives a system shock (such as polymorph, petrification)
 * Returns true if the character survives, false if they don't
 */
export const checkSystemShock = (character: Character): boolean => {
  if (!('abilities' in character)) return true; // Monsters always pass

  // Get constitution score
  const conScore = character.abilities.constitution;

  // Get system shock survival chance based on constitution
  let survivalChance = 0;

  // Based on OSRIC constitution table
  if (conScore <= 3) survivalChance = 35;
  else if (conScore <= 4) survivalChance = 40;
  else if (conScore <= 5) survivalChance = 45;
  else if (conScore <= 6) survivalChance = 50;
  else if (conScore <= 7) survivalChance = 55;
  else if (conScore <= 8) survivalChance = 60;
  else if (conScore <= 9) survivalChance = 65;
  else if (conScore <= 10) survivalChance = 70;
  else if (conScore <= 11) survivalChance = 75;
  else if (conScore <= 12) survivalChance = 80;
  else if (conScore <= 13) survivalChance = 85;
  else if (conScore <= 14) survivalChance = 90;
  else if (conScore <= 15) survivalChance = 92;
  else if (conScore <= 16) survivalChance = 95;
  else if (conScore <= 17) survivalChance = 97;
  else if (conScore <= 18) survivalChance = 99;
  else if (conScore >= 19) survivalChance = 99;

  // If the character has a constitution modifier, apply it
  if (character.abilityModifiers.constitutionSystemShock) {
    survivalChance += character.abilityModifiers.constitutionSystemShock;
  }

  // Clamp values between 1 and 99
  survivalChance = Math.min(99, Math.max(1, survivalChance));

  // Roll percentile dice (1-100)
  const rollResult = roll(100);

  // Return true if roll is less than or equal to survival chance
  return rollResult <= survivalChance;
};

/**
 * Check if a character can be resurrected
 * Returns true if resurrection is possible, false if not
 */
export const checkResurrectionSurvival = (character: Character | Monster): boolean => {
  if (!('abilities' in character)) return false; // Monsters cannot be resurrected

  // Get constitution score
  const conScore = character.abilities.constitution;

  // Get resurrection survival chance based on constitution
  let survivalChance = 0;

  // Based on OSRIC constitution table
  if (conScore <= 3) survivalChance = 40;
  else if (conScore <= 4) survivalChance = 45;
  else if (conScore <= 5) survivalChance = 50;
  else if (conScore <= 6) survivalChance = 55;
  else if (conScore <= 7) survivalChance = 60;
  else if (conScore <= 8) survivalChance = 65;
  else if (conScore <= 9) survivalChance = 70;
  else if (conScore <= 10) survivalChance = 75;
  else if (conScore <= 11) survivalChance = 80;
  else if (conScore <= 12) survivalChance = 85;
  else if (conScore <= 13) survivalChance = 90;
  else if (conScore <= 14) survivalChance = 92;
  else if (conScore <= 15) survivalChance = 94;
  else if (conScore <= 16) survivalChance = 96;
  else if (conScore <= 17) survivalChance = 98;
  else if (conScore <= 18) survivalChance = 100;
  else if (conScore >= 19) survivalChance = 100;

  // If the character has a constitution modifier, apply it
  if (character.abilityModifiers.constitutionResurrectionSurvival) {
    survivalChance += character.abilityModifiers.constitutionResurrectionSurvival;
  }

  // Clamp values between 1 and 100
  survivalChance = Math.min(100, Math.max(1, survivalChance));

  // Roll percentile dice (1-100)
  const rollResult = roll(100);

  // Return true if roll is less than or equal to survival chance
  return rollResult <= survivalChance;
};

/**
 * Process a character's death
 * Returns appropriate status effects and messages
 */
export const processDeath = (character: Character | Monster) => {
  const statusEffects: StatusEffect[] = [];
  let message = '';

  // Mark as dead
  statusEffects.push({
    name: 'Dead',
    duration: 0, // Permanent until resurrected
    effect: 'Character is dead',
    savingThrow: null,
    endCondition: 'When resurrected',
  });

  // Generic death message
  message = `${character.name} has died.`;

  // For player characters, check if resurrection is possible
  if ('abilities' in character) {
    const canBeResurrected = checkResurrectionSurvival(character);

    if (canBeResurrected) {
      message += ` ${character.name} can be resurrected.`;
    } else {
      message += ` ${character.name} cannot be resurrected.`;

      // Update status effect
      statusEffects[0] = {
        ...statusEffects[0],
        endCondition: 'Cannot be resurrected',
      };
    }
  }

  return {
    statusEffects,
    message,
  };
};

/**
 * Resurrect a dead character
 * Returns true if successful, false if not
 */
export const resurrectCharacter = (character: Character, spellLevel = 7) => {
  const statusEffects: StatusEffect[] = [];

  // Check if character can be resurrected
  const canBeResurrected = checkResurrectionSurvival(character);

  if (!canBeResurrected) {
    return {
      success: false,
      message: `${character.name} cannot be resurrected.`,
      statusEffects,
    };
  }

  // Resurrection is successful
  // Reset hit points to 1
  character.hitPoints.current = 1;

  // Remove 'Dead' status effect
  const deadIndex = character.statusEffects.findIndex((effect) => effect.name === 'Dead');
  if (deadIndex !== -1) {
    character.statusEffects.splice(deadIndex, 1);
  }

  // Add weak status effect
  statusEffects.push({
    name: 'Weakened',
    duration: spellLevel, // Days of rest required = level of character resurrected
    effect: 'Character is weakened from resurrection',
    savingThrow: null,
    endCondition: 'After required rest period',
  });

  // If using Raise Dead (level 5) rather than Resurrection (level 7),
  // the character is bedridden for recovery time
  if (spellLevel === 5) {
    statusEffects.push({
      name: 'Bedridden',
      duration: character.level, // Days equal to character level
      effect: 'Character must rest after being raised',
      savingThrow: null,
      endCondition: 'After full rest period',
    });
  }

  return {
    success: true,
    message: `${character.name} has been resurrected and has ${character.hitPoints.current} hit points.`,
    statusEffects,
  };
};

/**
 * Handle bleeding rules for unconscious characters
 * In OSRIC, characters at exactly 0 hp will lose 1 hp per round
 * until they receive aid or die at -10 hp
 */
export const handleBleeding = (character: Character | Monster) => {
  const statusEffects: StatusEffect[] = [];
  let message = '';

  // Only handle bleeding for characters at exactly 0 hp
  // or those with a Bleeding status effect
  const hasBleedingEffect = character.statusEffects.some((effect) => effect.name === 'Bleeding');

  if (character.hitPoints.current !== 0 && !hasBleedingEffect) {
    return {
      isDead: false,
      message: '',
      statusEffects: [],
    };
  }

  // Reduce hp by 1
  character.hitPoints.current -= 1;
  message = `${character.name} is bleeding.`;

  // Check if character is now dead (at -10 or below)
  if (character.hitPoints.current <= -10) {
    const deathResult = processDeath(character);
    return {
      isDead: true,
      message: deathResult.message,
      statusEffects: deathResult.statusEffects,
    };
  }

  // Add or update bleeding status effect
  const bleedingEffect: StatusEffect = {
    name: 'Bleeding',
    duration: 0, // Until healed
    effect: 'Losing 1 hp per round',
    savingThrow: null,
    endCondition: 'When healed above 0 hp or dies',
  };

  statusEffects.push(bleedingEffect);

  return {
    isDead: false,
    message,
    statusEffects,
  };
};

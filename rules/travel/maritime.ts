import type { Character } from '@rules/types';
import { roll, rollMultiple } from '@rules/utils/dice';

/**
 * Ship types and their properties
 */
export interface ShipType {
  id: string;
  name: string;
  speed: number; // in knots
  cargoCapacity: number; // in kg
  crewRequired: number;
  minimumCrew: number;
  hitPoints: number;
  armorClass: number;
  cost: number; // in gold pieces
  description: string;
}

/**
 * Standard ship types in OSRIC
 */
export const ShipTypes: Record<string, ShipType> = {
  rowboat: {
    id: 'rowboat',
    name: 'Rowboat',
    speed: 1.5,
    cargoCapacity: 500, // kg
    crewRequired: 1,
    minimumCrew: 1,
    hitPoints: 20,
    armorClass: 7,
    cost: 50,
    description: 'A small boat designed for rivers and lakes.',
  },
  sailingShip: {
    id: 'sailingShip',
    name: 'Sailing Ship',
    speed: 3,
    cargoCapacity: 5000,
    crewRequired: 10,
    minimumCrew: 3,
    hitPoints: 100,
    armorClass: 5,
    cost: 5000,
    description: 'A standard sailing vessel for coastal and open sea travel.',
  },
  warship: {
    id: 'warship',
    name: 'Warship',
    speed: 2.5,
    cargoCapacity: 3000,
    crewRequired: 30,
    minimumCrew: 10,
    hitPoints: 200,
    armorClass: 3,
    cost: 10000,
    description: 'A heavily armed and armored ship designed for naval combat.',
  },
  galley: {
    id: 'galley',
    name: 'Galley',
    speed: 4,
    cargoCapacity: 2000,
    crewRequired: 50,
    minimumCrew: 20,
    hitPoints: 150,
    armorClass: 4,
    cost: 8000,
    description: 'A long, narrow ship powered by oars and sails, used for war and trade.',
  },
};

/**
 * Sea conditions and their effects on travel
 */
export interface SeaCondition {
  name: string;
  movementModifier: number; // Multiplier to ship speed
  navigationDC: number; // Difficulty class for navigation checks
  damageRisk: number; // % chance of taking damage each hour
  description: string;
}

export const SeaConditions: Record<string, SeaCondition> = {
  calm: {
    name: 'Calm',
    movementModifier: 1.0,
    navigationDC: 5,
    damageRisk: 0,
    description: 'Smooth sailing with gentle waves.',
  },
  choppy: {
    name: 'Choppy',
    movementModifier: 0.75,
    navigationDC: 10,
    damageRisk: 1,
    description: 'Moderate waves make travel slower and navigation more difficult.',
  },
  rough: {
    name: 'Rough',
    movementModifier: 0.5,
    navigationDC: 15,
    damageRisk: 5,
    description: 'High waves and strong winds make travel difficult and dangerous.',
  },
  stormy: {
    name: 'Stormy',
    movementModifier: 0.25,
    navigationDC: 20,
    damageRisk: 15,
    description: 'Violent storms with massive waves. Travel is extremely hazardous.',
  },
  hurricane: {
    name: 'Hurricane',
    movementModifier: 0.1,
    navigationDC: 25,
    damageRisk: 40,
    description: 'Catastrophic conditions. Only the most experienced sailors can hope to survive.',
  },
};

/**
 * Navigation check result
 */
export interface NavigationCheckResult {
  success: boolean;
  degreesOffCourse: number; // 0-360 degrees
  distanceOffCourse: number; // in km
  message: string;
}

/**
 * Performs a navigation check for a ship
 */
export function performNavigationCheck(
  navigator: Character,
  condition: SeaCondition,
  hasNavigatorsTools: boolean,
  hasMap: boolean,
  hasCompass: boolean
): NavigationCheckResult {
  // Base navigation DC based on sea condition
  let dc = condition.navigationDC;

  // Apply modifiers
  if (!hasNavigatorsTools) dc += 5;
  if (!hasMap) dc += 2;
  if (!hasCompass) dc += 2;

  // Make the check (using the navigator's Intelligence or Wisdom modifier, whichever is higher)
  const modifier = Math.max(
    Math.floor((navigator.abilities.intelligence - 10) / 2),
    Math.floor((navigator.abilities.wisdom - 10) / 2)
  );

  const rollResult = roll(20) + modifier;
  const success = rollResult >= dc;

  // Calculate how far off course they are
  let degreesOffCourse = 0;
  if (!success) {
    // The further from the DC, the more off course
    const margin = dc - rollResult;
    degreesOffCourse = Math.min(90, margin * 5); // Cap at 90 degrees
  }

  // Calculate distance off course (1 degree ~= 111km at the equator, but we'll use a simpler model)
  const distanceOffCourse = (degreesOffCourse / 10) * roll(6);

  return {
    success,
    degreesOffCourse,
    distanceOffCourse,
    message: success
      ? 'You successfully maintain your course.'
      : `You've gone off course by approximately ${Math.round(distanceOffCourse)}km.`,
  };
}

/**
 * Calculates daily movement for a ship
 */
export function calculateDailyShipMovement(
  ship: ShipType,
  condition: SeaCondition,
  crewRatio: number // 0-1, where 1 is full crew
): number {
  // Base speed in km/day (1 knot = 1.852 km/h * 24h = 44.448 km/day)
  const baseSpeed = ship.speed * 44.448;

  // Apply sea condition modifier
  let speed = baseSpeed * condition.movementModifier;

  // Apply crew ratio (minimum 50% speed with minimal crew)
  const crewEfficiency = 0.5 + crewRatio * 0.5;
  speed *= crewEfficiency;

  return Math.round(speed * 10) / 10; // Round to 1 decimal place
}

/**
 * Handles ship damage from sea conditions
 */
export function checkForShipDamage(
  _ship: ShipType, // Prefix with _ to indicate intentionally unused
  condition: SeaCondition,
  captainSkillBonus: number // Captain's relevant skill bonus
): { damage: number; critical: boolean } {
  // Base chance based on condition
  let damageChance = condition.damageRisk;

  // Reduce chance based on captain's skill
  damageChance = Math.max(0, damageChance - captainSkillBonus);

  // Early return if no damage risk
  if (damageChance <= 0) {
    return { damage: 0, critical: false };
  }

  // Roll for damage (1-100)
  const rollResult = roll(100);

  // Check if damage occurs (roll must be <= damageChance)
  if (rollResult > damageChance) {
    return { damage: 0, critical: false };
  }

  // Determine damage
  const isCritical = roll(20) >= 18;
  const damage = isCritical
    ? roll(8) + roll(8) // 2d8 for critical
    : roll(4); // 1d4 for normal damage

  return {
    damage: Math.max(1, damage), // Ensure at least 1 damage if we get here
    critical: isCritical,
  };
}

/**
 * Resolves a day of sea travel
 */
export function resolveDayOfTravel(
  ship: ShipType,
  crewCount: number,
  condition: SeaCondition,
  navigator: Character,
  captain: Character,
  hasNavigatorsTools: boolean,
  hasMap: boolean,
  hasCompass: boolean
) {
  const crewRatio = Math.min(1, crewCount / ship.crewRequired);
  const dailyMovement = calculateDailyShipMovement(ship, condition, crewRatio);

  // Perform navigation check
  const navigation = performNavigationCheck(
    navigator,
    condition,
    hasNavigatorsTools,
    hasMap,
    hasCompass
  );

  // Check for ship damage
  const captainSkillBonus = Math.floor((captain.abilities.charisma - 10) / 2); // Using CHA for leadership
  const damage = checkForShipDamage(ship, condition, captainSkillBonus);

  return {
    dailyMovement,
    navigation,
    damage,
    effectiveMovement: navigation.success ? dailyMovement : dailyMovement * 0.8, // 20% movement penalty when off course
    crewFatigue: calculateCrewFatigue(crewRatio, condition),
  };
}

/**
 * Calculates crew fatigue after a day of sailing
 */
export function calculateCrewFatigue(
  crewRatio: number,
  _condition: SeaCondition // Prefix with _ to indicate intentionally unused
): number {
  // Base fatigue is higher with fewer crew and worse conditions
  const fatigue = (1 - crewRatio) * 5; // 0-5 based on crew ratio

  // Add condition-based fatigue
  const conditionFatigueMap: Record<string, number> = {
    calm: 0,
    choppy: 1,
    rough: 2,
    stormy: 4,
    hurricane: 8,
  };
  const conditionFatigue = conditionFatigueMap[_condition.name.toLowerCase()] || 0;

  return Math.round(fatigue + (conditionFatigue as number));
}

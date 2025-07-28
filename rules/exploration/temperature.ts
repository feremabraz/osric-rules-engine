// Temperature effects implementation
import { roll } from '@rules/utils/dice';
import type { Character } from '../types';
import type {
  ResistanceResult,
  TemperatureEffect,
  TemperatureRange,
  TemperatureResistanceCheck,
} from './types';

/**
 * Check if a character can resist temperature effects
 */
export function checkTemperatureResistance(check: TemperatureResistanceCheck): ResistanceResult {
  const { character, temperatureEffect, modifiers } = check;

  // If no saving throw is required, character is affected
  if (!temperatureEffect.savingThrowRequired) {
    return applyTemperatureEffect(temperatureEffect, false);
  }

  // Determine base saving throw target
  let saveTarget = 15; // Default DC for environmental hazards

  // Constitution-based adjustment
  if (character.abilityModifiers.constitutionSystemShock) {
    const conBonus = character.abilityModifiers.constitutionSystemShock;
    // Convert percentage to modifier (roughly)
    const conMod = Math.floor(conBonus / 10);
    saveTarget -= conMod;
  }

  // Apply other modifiers
  if (modifiers.appropriateGear) saveTarget -= 4;
  if (modifiers.magicalProtection) saveTarget -= 6;

  // Apply constitution adjustment
  saveTarget += modifiers.constitutionAdjustment;

  // Exposure time increases difficulty
  const hoursExposedFactor = Math.floor(modifiers.hoursExposed / 2);
  saveTarget += hoursExposedFactor;

  // Roll the saving throw
  const savingThrow = roll(20);
  const success = savingThrow >= saveTarget;

  return applyTemperatureEffect(temperatureEffect, success);
}

/**
 * Apply temperature effects based on success or failure
 */
function applyTemperatureEffect(
  temperatureEffect: TemperatureEffect,
  saveSuccess: boolean
): ResistanceResult {
  let damage = null;
  const statusEffects: string[] = [];

  // If save is successful, reduce effects
  const effectMultiplier = saveSuccess ? 0.5 : 1;

  // Apply damage if any
  if (temperatureEffect.damagePerInterval) {
    // Parse damage string like "1d6"
    if (temperatureEffect.damagePerInterval === '1d6') {
      damage = Math.ceil(roll(6) * effectMultiplier);
    } else {
      // Default to 3 damage if we can't parse
      damage = Math.ceil(3 * effectMultiplier);
    }
  }

  // Apply status effects
  statusEffects.push(`${temperatureEffect.range} exposure`);

  if (temperatureEffect.movementPenalty > 0) {
    statusEffects.push(
      `Movement reduced by ${Math.ceil(temperatureEffect.movementPenalty * effectMultiplier)}%`
    );
  }

  if (temperatureEffect.combatPenalty > 0) {
    statusEffects.push(
      `Combat penalty -${Math.ceil(temperatureEffect.combatPenalty * effectMultiplier)}`
    );
  }

  if (temperatureEffect.spellcastingPenalty > 0) {
    statusEffects.push(
      `Spell failure chance ${Math.ceil(temperatureEffect.spellcastingPenalty * effectMultiplier)}%`
    );
  }

  // Duration based on interval - if they need to save every hour, that's the duration
  const duration = temperatureEffect.savingThrowInterval;

  return {
    success: saveSuccess,
    effectApplied: true, // Temperature always has some effect, even on success
    damage,
    statusEffects,
    duration,
  };
}

/**
 * Create a temperature effect definition
 */
export function createTemperatureEffect(
  range: TemperatureRange,
  savingThrowRequired: boolean,
  savingThrowInterval: number,
  damagePerInterval: string | null,
  abilityPenalties: Partial<Record<keyof Character['abilities'], number>>,
  movementPenalty: number,
  combatPenalty: number,
  spellcastingPenalty: number,
  protection: string[]
): TemperatureEffect {
  return {
    range,
    savingThrowRequired,
    savingThrowInterval,
    damagePerInterval,
    abilityPenalties,
    movementPenalty,
    combatPenalty,
    spellcastingPenalty,
    protection,
  };
}

/**
 * Create standard temperature effect definitions
 */
export function createStandardTemperatureEffects(): Record<TemperatureRange, TemperatureEffect> {
  return {
    'Extreme Cold': createTemperatureEffect(
      'Extreme Cold',
      true,
      1, // Save every hour
      '1d6', // 1d6 damage per hour
      { strength: -2, dexterity: -2 },
      30, // 30% movement penalty
      2, // -2 to attack rolls
      15, // 15% spell failure
      ['Cold weather gear', 'Endure Elements spell', 'Resist Energy spell']
    ),
    'Severe Cold': createTemperatureEffect(
      'Severe Cold',
      true,
      2, // Save every 2 hours
      '1d3', // 1d3 damage per 2 hours
      { dexterity: -1 },
      20, // 20% movement penalty
      1, // -1 to attack rolls
      10, // 10% spell failure
      ['Cold weather gear', 'Endure Elements spell']
    ),
    Cold: createTemperatureEffect(
      'Cold',
      false, // No save required
      4, // Check every 4 hours
      null, // No damage
      {},
      10, // 10% movement penalty
      0, // No attack penalty
      5, // 5% spell failure
      ['Normal winter clothing']
    ),
    Mild: createTemperatureEffect(
      'Mild',
      false,
      0, // No checks needed
      null, // No damage
      {},
      0, // No penalties
      0,
      0,
      []
    ),
    Comfortable: createTemperatureEffect('Comfortable', false, 0, null, {}, 0, 0, 0, []),
    Warm: createTemperatureEffect(
      'Warm',
      false,
      6, // Check every 6 hours
      null,
      {},
      5, // 5% movement penalty (sluggishness)
      0,
      0,
      ['Light clothing', 'Access to water']
    ),
    Hot: createTemperatureEffect('Hot', false, 4, null, { strength: -1 }, 10, 0, 5, [
      'Access to water',
      'Loose, light clothing',
    ]),
    'Severe Heat': createTemperatureEffect(
      'Severe Heat',
      true,
      2,
      '1d3',
      { strength: -1, constitution: -1 },
      20,
      1,
      10,
      ['Endure Elements spell', 'Create Water spell']
    ),
    'Extreme Heat': createTemperatureEffect(
      'Extreme Heat',
      true,
      1,
      '1d6',
      { strength: -2, constitution: -2 },
      30,
      2,
      15,
      ['Endure Elements spell', 'Resist Energy spell']
    ),
  };
}

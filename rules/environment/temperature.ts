import type {
  TemperatureEffectParams,
  TemperatureEffectResult,
  TemperatureRange,
} from '@rules/types';
import { roll } from '@rules/utils/dice';

/**
 * Temperature effect thresholds
 */
const TEMPERATURE_DAMAGE: Record<TemperatureRange, number> = {
  Frigid: 2, // Cold damage per hour
  Cold: 1, // Cold damage per hour
  Cool: 0, // No damage
  Moderate: 0, // No damage
  Warm: 0, // No damage
  Hot: 1, // Heat damage per hour
  Extreme: 2, // Heat damage per hour
};

/**
 * Survival difficulty levels by temperature
 */
const TEMPERATURE_DIFFICULTY: Record<TemperatureRange, number> = {
  Frigid: 15,
  Cold: 12,
  Cool: 8,
  Moderate: 5,
  Warm: 8,
  Hot: 12,
  Extreme: 15,
};

/**
 * Calculate the effects of temperature extremes on a character
 * Based on OSRIC-like rules for survival in harsh environments
 *
 * @param params Temperature effect parameters
 * @returns A result object with damage and status effects
 */
export const resolveTemperatureEffects = (
  params: TemperatureEffectParams
): TemperatureEffectResult => {
  const {
    character,
    temperature,
    hoursExposed,
    hasAppropriateClothing,
    hasAppropriateEquipment,
    modifiers = {},
  } = params;

  const { constitutionBonus = 0 } = modifiers;

  // Initialize result fields
  let damageApplied = 0;
  const statPenalties: Record<string, number> = {};
  const effects: string[] = [];

  // Get constitution modifier for determining resistance
  const constitutionMod = character.abilityModifiers.constitutionHitPoints || 0;
  const totalConstitutionBonus = constitutionMod + constitutionBonus;

  // Apply gear protection
  const clothingBonus = hasAppropriateClothing ? 4 : 0;
  const equipmentBonus = hasAppropriateEquipment ? 3 : 0;

  // Calculate base damage per hour from the temperature
  const baseDamagePerHour = TEMPERATURE_DAMAGE[temperature];

  // No damage for temperate conditions
  if (baseDamagePerHour === 0) {
    return {
      success: true,
      message: `${character.name} is comfortable in the ${temperature.toLowerCase()} temperature.`,
      damage: null,
      effects: null,
      temperature,
      effectLevel: 0,
      damageApplied: 0,
      statPenalties: {},
    };
  }

  // Determine if the character can resist the temperature effects
  const resistanceDC = TEMPERATURE_DIFFICULTY[temperature] - clothingBonus - equipmentBonus;
  const resistanceRoll = roll(20) + totalConstitutionBonus;
  const resisted = resistanceRoll >= resistanceDC;

  // Calculate effect level based on temperature and exposure time
  let effectLevel = 0;

  if (!resisted) {
    // Base effect level depends on temperature
    switch (temperature) {
      case 'Frigid':
      case 'Extreme':
        effectLevel = Math.min(3, 1 + Math.floor(hoursExposed / 3)); // Severe after 6+ hours
        break;
      case 'Cold':
      case 'Hot':
        effectLevel = Math.min(3, Math.floor(hoursExposed / 4)); // Severe after 12+ hours
        break;
      case 'Cool':
      case 'Warm':
        effectLevel = Math.min(2, Math.floor(hoursExposed / 8)); // Max moderate after 16+ hours
        break;
      default:
        effectLevel = 0;
    }

    // Calculate total damage based on unmitigated hours
    const mitigatedHours = Math.max(0, hoursExposed - (totalConstitutionBonus + clothingBonus / 2));
    damageApplied = Math.floor(baseDamagePerHour * mitigatedHours);

    // Apply damage to character
    if (damageApplied > 0) {
      character.hitPoints.current -= damageApplied;
    }

    // Apply stat penalties based on effect level
    if (effectLevel > 0) {
      const temperatureIsCold = ['Frigid', 'Cold', 'Cool'].includes(temperature);

      if (effectLevel >= 1) {
        // Mild effects - minor penalties
        statPenalties.dexterity = -1;

        if (temperatureIsCold) {
          effects.push('Chilled');
        } else {
          effects.push('Heat Strained');
        }
      }

      if (effectLevel >= 2) {
        // Moderate effects - more significant penalties
        statPenalties.dexterity = -2;
        statPenalties.strength = -1;

        if (temperatureIsCold) {
          effects.push('Hypothermia');
          statPenalties.intelligence = -1; // Mental fog from cold
        } else {
          effects.push('Heat Exhaustion');
          statPenalties.wisdom = -1; // Disorientation from heat
        }
      }

      if (effectLevel >= 3) {
        // Severe effects - serious penalties
        statPenalties.dexterity = -4;
        statPenalties.strength = -3;
        statPenalties.constitution = -2;

        if (temperatureIsCold) {
          effects.push('Severe Hypothermia');
          statPenalties.intelligence = -2;
        } else {
          effects.push('Heat Stroke');
          statPenalties.wisdom = -2;
          statPenalties.intelligence = -1;
        }
      }
    }
  }

  // Build result message
  let message = '';
  if (effects.length > 0) {
    message = `${character.name} is suffering from ${effects.join(' and ')} in the ${temperature.toLowerCase()} conditions.`;

    if (damageApplied > 0) {
      message += ` They take ${damageApplied} damage from ${temperature === 'Frigid' || temperature === 'Cold' ? 'cold' : 'heat'} exposure.`;
    }
  } else {
    message = `${character.name} is handling the ${temperature.toLowerCase()} temperature well.`;
  }

  // Check if character is unconscious or dead
  if (character.hitPoints.current <= 0) {
    effects.push('Unconscious');

    if (character.hitPoints.current <= -10) {
      effects.push('Dead');
      message += ` ${character.name} has died from ${temperature === 'Frigid' || temperature === 'Cold' ? 'exposure to cold' : 'heat stroke'}.`;
    } else {
      message += ` ${character.name} has fallen unconscious from ${temperature === 'Frigid' || temperature === 'Cold' ? 'exposure to cold' : 'heat stroke'}.`;
    }
  }

  // Fix: Set success to false if there are any effects
  return {
    success: effects.length === 0,
    message,
    damage: damageApplied > 0 ? [damageApplied] : null,
    effects: effects.length > 0 ? effects : null,
    temperature,
    effectLevel,
    damageApplied,
    statPenalties,
  };
};

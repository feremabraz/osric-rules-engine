import { roll, rollFromNotation, sumDice } from '@rules/utils/dice';
import type { Character } from '../types';
import type {
  Disease,
  DiseaseResistanceCheck,
  DiseaseType,
  Poison,
  PoisonResistanceCheck,
  PoisonType,
  ResistanceResult,
} from './types';

/**
 * Check if a character resists a disease
 */
export function checkDiseaseResistance(check: DiseaseResistanceCheck): ResistanceResult {
  const { character, disease, modifiers } = check;

  // Determine base saving throw target
  let saveTarget = 16; // Default DC for poison/disease

  // Apply constitution-based adjustment
  if (character.abilityModifiers.constitutionPoisonSave) {
    saveTarget -= character.abilityModifiers.constitutionPoisonSave;
  }

  // Apply disease-specific modifier
  saveTarget += disease.savingThrowModifier;

  // Apply other modifiers
  if (modifiers.magicalAid) saveTarget -= 4;
  if (modifiers.healerAssistance) saveTarget -= 2;
  if (modifiers.previousExposure) saveTarget -= 4;

  // Apply constitution adjustment (in addition to save bonus)
  saveTarget += modifiers.constitutionAdjustment;

  // Roll the saving throw
  const savingThrow = roll(20);
  const success = savingThrow >= saveTarget;

  // Determine effects if failed
  const damage = null;
  const statusEffects: string[] = [];
  let duration = 0;

  if (!success) {
    // Determine incubation and duration
    duration = disease.duration;

    // Apply disease effects
    statusEffects.push(`Infected with ${disease.name}`);
    for (const symptom of disease.symptoms) {
      statusEffects.push(symptom);
    }

    // Check for fatal result on plague
    if (disease.type === 'Plague' && disease.deathChance > 0 && rollDiseaseDeathCheck(disease)) {
      statusEffects.push('Fatal infection');
    }
  }

  return {
    success,
    effectApplied: !success,
    damage,
    statusEffects,
    duration,
  };
}

/**
 * Check if a disease is fatal based on its death chance
 */
function rollDiseaseDeathCheck(disease: Disease): boolean {
  // For plague specifically, we check if any d8 rolls an 8
  if (disease.type === 'Plague') {
    // Roll 2d8 per OSRIC rules
    const roll1 = roll(8);
    const roll2 = roll(8);
    return roll1 === 8 || roll2 === 8;
  }

  // For other diseases, use the defined death chance percentage
  return roll(100) <= disease.deathChance;
}

/**
 * Check if a character resists a poison
 */
export function checkPoisonResistance(check: PoisonResistanceCheck): ResistanceResult {
  const { character, poison, modifiers } = check;

  // Determine base saving throw target
  let saveTarget = 16; // Default DC for poison

  // Apply constitution-based adjustment
  if (character.abilityModifiers.constitutionPoisonSave) {
    saveTarget -= character.abilityModifiers.constitutionPoisonSave;
  }

  // Apply poison-specific modifier
  saveTarget += poison.savingThrowModifier;

  // Apply other modifiers
  if (modifiers.antidoteAdministered) saveTarget -= 6;
  if (modifiers.magicalProtection) saveTarget -= 4;

  // Apply constitution adjustment (in addition to save bonus)
  saveTarget += modifiers.constitutionAdjustment;

  // Time affects poison potency - for each hour outside a container, reduce save DC
  const hoursFactor = Math.floor(modifiers.timeElapsedSinceExposure / 60);
  if (hoursFactor > 0 && poison.halfLifeOutsideContainer > 0) {
    // Calculate degradation based on half-life
    // Each half-life period reduces the save DC by 2
    const halfLives = hoursFactor / poison.halfLifeOutsideContainer;
    const degradationFactor = Math.min(10, Math.floor(halfLives * 2));
    saveTarget = Math.max(1, saveTarget - degradationFactor);
  }

  // Roll the saving throw
  const savingThrow = roll(20);
  const success = savingThrow >= saveTarget;

  // Determine effects if failed
  let damage = null;
  const statusEffects: string[] = [];
  const duration = poison.duration;

  if (!success) {
    // Parse damage info
    if (poison.damage !== 'death') {
      try {
        const diceResults = rollFromNotation(poison.damage);
        damage = diceResults.total;
      } catch (error) {
        console.error(`Error parsing damage notation '${poison.damage}':`, error);
        // Fallback to a default damage value if parsing fails
        damage = 10;
      }
    } else {
      // Death occurs in 15 minutes (not instant) allowing for antidotes
      statusEffects.push('Fatal poison (death in 15 minutes without antidote)');
    }

    // Apply poison effects
    statusEffects.push(`Poisoned (${poison.name})`);
    for (const symptom of poison.symptoms) {
      statusEffects.push(symptom);
    }
  }

  return {
    success,
    effectApplied: !success,
    damage,
    statusEffects,
    duration,
  };
}

/**
 * Create a disease sample
 */
export function createDisease(
  name: string,
  type: DiseaseType,
  incubationPeriod: number,
  duration: number,
  abilityPenalties: Partial<Record<keyof Character['abilities'], number>>,
  savingThrowModifier: number,
  deathChance: number,
  symptoms: string[],
  treatmentOptions: string[]
): Disease {
  return {
    name,
    type,
    incubationPeriod,
    duration,
    abilityPenalties,
    savingThrowModifier,
    deathChance,
    symptoms,
    treatmentOptions,
  };
}

/**
 * Create a poison sample
 */
export function createPoison(
  name: string,
  type: PoisonType,
  onset: number,
  damage: string,
  secondaryDamage: string | null,
  savingThrowModifier: number,
  duration: number,
  symptoms: string[],
  antidotes: string[],
  halfLifeOutsideContainer: number
): Poison {
  return {
    name,
    type,
    onset,
    damage,
    secondaryDamage,
    savingThrowModifier,
    duration,
    symptoms,
    antidotes,
    halfLifeOutsideContainer,
  };
}

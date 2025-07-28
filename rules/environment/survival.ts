import type { SurvivalNeedParams, SurvivalNeedResult } from '@rules/types';
import { roll } from '@rules/utils/dice';

/**
 * Constants for survival needs
 */
const STARVATION_DAILY_DAMAGE = 1; // 1 HP per day without food
const THIRST_DAILY_DAMAGE = 2; // 2 HP per day without water
const DESERT_WATER_MULTIPLIER = 2; // Water needed in desert environments
const FRIGID_FOOD_MULTIPLIER = 1.5; // Food needed in frigid environments

/**
 * Handle starvation and thirst effects based on OSRIC rules
 *
 * @param params Survival parameters including character and status
 * @returns A result object with the updated status and effects
 */
export const resolveSurvivalNeeds = (params: SurvivalNeedParams): SurvivalNeedResult => {
  const {
    character,
    status,
    isDesertEnvironment = false,
    isFrigidEnvironment = false,
    modifiers = {},
  } = params;

  const { constitutionBonus = 0 } = modifiers;

  // Copy the status to avoid mutating the input
  const newStatus = { ...status };

  // Initialize damage and stat penalties
  let damageApplied = 0;
  const statPenalties: Record<string, number> = {};
  let message = '';
  const effects: string[] = [];

  // Get constitution modifier for determining thresholds
  const constitutionMod = character.abilityModifiers.constitutionHitPoints || 0;

  // HANDLE FOOD
  const foodThreshold = 3 + Math.max(0, constitutionMod + constitutionBonus);
  const isFrigidFoodFactor = isFrigidEnvironment ? FRIGID_FOOD_MULTIPLIER : 1;

  if (newStatus.daysSinceLastFood > 0) {
    // Apply effects based on days without food
    if (newStatus.daysSinceLastFood >= foodThreshold) {
      // Past the threshold - apply starvation damage
      const starvationDamage = Math.floor(
        STARVATION_DAILY_DAMAGE *
          (newStatus.daysSinceLastFood - foodThreshold + 1) *
          isFrigidFoodFactor
      );

      damageApplied += starvationDamage;
      character.hitPoints.current -= starvationDamage;

      // Add stat penalties
      const statPenaltyValue = Math.min(
        6,
        Math.floor((newStatus.daysSinceLastFood - foodThreshold) / 2) + 1
      );
      statPenalties.strength = statPenaltyValue;
      statPenalties.dexterity = statPenaltyValue;
      statPenalties.constitution = Math.floor(statPenaltyValue / 2);

      effects.push('Starving');

      if (newStatus.daysSinceLastFood >= foodThreshold + 5) {
        effects.push('Severely Malnourished');
      }
    } else {
      // Not yet at damage threshold, but hungry
      effects.push('Hungry');
    }
  }

  // HANDLE WATER
  const waterThreshold = 1 + Math.max(0, Math.floor((constitutionMod + constitutionBonus) / 2));
  const desertWaterFactor = isDesertEnvironment ? DESERT_WATER_MULTIPLIER : 1;

  if (newStatus.daysSinceLastWater > 0) {
    // Apply effects based on days without water
    if (newStatus.daysSinceLastWater === 1) {
      // First day without water - always thirsty
      effects.push('Thirsty');
    } else if (newStatus.daysSinceLastWater >= waterThreshold) {
      // Past the threshold - apply thirst damage
      const thirstDamage = Math.floor(
        THIRST_DAILY_DAMAGE *
          (newStatus.daysSinceLastWater - waterThreshold + 1) *
          desertWaterFactor
      );

      damageApplied += thirstDamage;
      character.hitPoints.current -= thirstDamage;

      // Add stat penalties - dehydration is more severe than hunger
      const statPenaltyValue = Math.min(
        8,
        Math.floor((newStatus.daysSinceLastWater - waterThreshold) * 2) + 2
      );
      statPenalties.strength = Math.max(statPenalties.strength || 0, statPenaltyValue);
      statPenalties.dexterity = Math.max(statPenalties.dexterity || 0, statPenaltyValue);
      statPenalties.constitution = Math.max(
        statPenalties.constitution || 0,
        Math.floor(statPenaltyValue / 1.5)
      );
      statPenalties.wisdom = Math.floor(statPenaltyValue / 2); // Mental effects of dehydration

      effects.push('Dehydrated');

      if (newStatus.daysSinceLastWater >= waterThreshold + 2) {
        effects.push('Severely Dehydrated');
      }
    } else {
      // Not yet at damage threshold, but thirsty
      effects.push('Thirsty');
    }
  }

  // Build result message
  if (effects.length > 0) {
    message = `${character.name} is suffering from ${effects.join(' and ')}.`;

    if (damageApplied > 0) {
      message += ` They take ${damageApplied} damage from survival needs.`;
    }
  } else {
    message = `${character.name} is well fed and hydrated.`;
  }

  // Check if character is unconscious or dead
  if (character.hitPoints.current <= 0) {
    effects.push('Unconscious');

    if (character.hitPoints.current <= -10) {
      effects.push('Dead');
      message += ` ${character.name} has died from ${newStatus.daysSinceLastWater > waterThreshold ? 'dehydration' : 'starvation'}.`;
    } else {
      message += ` ${character.name} has fallen unconscious from ${newStatus.daysSinceLastWater > waterThreshold ? 'dehydration' : 'starvation'}.`;
    }
  }

  // Update the status effects
  newStatus.currentEffects = effects;

  return {
    success: effects.length === 0, // Success if no negative effects
    message,
    damage: damageApplied > 0 ? [damageApplied] : null,
    effects: effects.length > 0 ? effects : null,
    status: newStatus,
    damageApplied,
    statPenalties,
  };
};

/**
 * Check if a character can find food and water in their environment
 *
 * @param character The character attempting to find food/water
 * @param terrain The type of terrain they're in
 * @returns Success or failure with message
 */
export const findFoodAndWater = (
  character: SurvivalNeedParams['character'],
  terrain: string
): { food: boolean; water: boolean; message: string } => {
  // Terrain difficulty modifiers for finding food and water
  const terrainModifiers: Record<string, { food: number; water: number }> = {
    Forest: { food: 2, water: 1 },
    Plains: { food: 0, water: -1 },
    Hills: { food: 0, water: 0 },
    Mountains: { food: -2, water: 1 },
    Desert: { food: -4, water: -4 },
    Swamp: { food: 1, water: 2 },
    Arctic: { food: -3, water: -2 },
    Jungle: { food: 3, water: 3 },
    Coastal: { food: 2, water: 2 },
    Urban: { food: -1, water: 0 },
    Dungeon: { food: -5, water: -3 },
    Underground: { food: -4, water: -2 },
  };

  const mod = terrainModifiers[terrain] || { food: 0, water: 0 };

  // Use wisdom for foraging skill
  const wisdomMod = character.abilityModifiers.wisdomMentalSave || 0;

  // Roll for finding food
  const foodRoll = roll(20);
  const foodTarget = 12 - wisdomMod - mod.food;
  const foodSuccess = foodRoll >= foodTarget;

  // Roll for finding water
  const waterRoll = roll(20);
  const waterTarget = 10 - wisdomMod - mod.water;
  const waterSuccess = waterRoll >= waterTarget;

  // Create message based on results
  let message = '';
  if (foodSuccess && waterSuccess) {
    message = `${character.name} successfully finds both food and water in the ${terrain}.`;
  } else if (foodSuccess) {
    message = `${character.name} finds food but no water in the ${terrain}.`;
  } else if (waterSuccess) {
    message = `${character.name} finds water but no food in the ${terrain}.`;
  } else {
    message = `${character.name} fails to find food or water in the ${terrain}.`;
  }

  return {
    food: foodSuccess,
    water: waterSuccess,
    message,
  };
};

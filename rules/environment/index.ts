export * from '@rules/types';

// Export falling damage functionality
export { calculateFallingDamage } from './falling';

// Export swimming and drowning functionality
export { resolveSwimming, resolveDrowning } from './swimming';

// Export survival needs functionality
export { resolveSurvivalNeeds, findFoodAndWater } from './survival';

// Export temperature effects functionality
export { resolveTemperatureEffects } from './temperature';

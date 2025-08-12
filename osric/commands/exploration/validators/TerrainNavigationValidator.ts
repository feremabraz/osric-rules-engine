import type { NavigationParameters } from '@osric/commands/exploration/TerrainNavigationCommand';
import {
  ValidationPrimitives,
  type Validator,
  isStringOneOf,
} from '@osric/core/ValidationPrimitives';

const NAV_METHODS = ['landmark', 'compass', 'stars', 'ranger-tracking', 'none'] as const;
const TIMES_OF_DAY = ['dawn', 'day', 'dusk', 'night'] as const;

export const TerrainNavigationValidator: Validator<NavigationParameters> = {
  rules: [
    ValidationPrimitives.required('characterId'),
    ValidationPrimitives.required('terrainType.name'),
    ValidationPrimitives.required('terrainType.movementModifier'),
    {
      field: 'terrainType.movementModifier',
      message: 'terrainType.movementModifier must be a number between 0 and 2',
      validate(value) {
        return typeof value === 'number' && value >= 0 && value <= 2;
      },
    },
    ValidationPrimitives.required('terrainType.gettingLostChance'),
    {
      field: 'terrainType.gettingLostChance',
      message: 'terrainType.gettingLostChance must be between 0 and 100',
      validate(value) {
        return typeof value === 'number' && value >= 0 && value <= 100;
      },
    },
    ValidationPrimitives.required('terrainType.visibilityDistance'),
    ValidationPrimitives.nonNegativeInteger('terrainType.visibilityDistance'),
    ValidationPrimitives.required('distance'),
    ValidationPrimitives.nonNegativeInteger('distance'),
    ValidationPrimitives.required('navigationMethod'),
    {
      field: 'navigationMethod',
      message: `navigationMethod must be one of: ${NAV_METHODS.join(', ')}`,
      validate(value) {
        return isStringOneOf(value, NAV_METHODS);
      },
    },
    ValidationPrimitives.required('hasMap'),
    {
      field: 'hasMap',
      message: 'hasMap must be a boolean',
      validate(value) {
        return typeof value === 'boolean';
      },
    },
    ValidationPrimitives.required('timeOfDay'),
    {
      field: 'timeOfDay',
      message: `timeOfDay must be one of: ${TIMES_OF_DAY.join(', ')}`,
      validate(value) {
        return isStringOneOf(value, TIMES_OF_DAY);
      },
    },
    {
      field: 'weatherConditions.visibility',
      message: 'weatherConditions.visibility must be a non-negative integer when provided',
      validate(value) {
        return value == null || (Number.isInteger(value) && (value as number) >= 0);
      },
    },
    {
      field: 'weatherConditions.movementPenalty',
      message: 'weatherConditions.movementPenalty must be a number when provided',
      validate(value) {
        return value == null || typeof value === 'number';
      },
    },
  ],
  validate(params) {
    return ValidationPrimitives.validateObject(
      params as unknown as Record<string, unknown>,
      this.rules
    );
  },
};

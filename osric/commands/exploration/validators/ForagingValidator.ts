import type { ForagingParameters } from '@osric/commands/exploration/ForagingCommand';
import {
  ValidationPrimitives,
  type Validator,
  isStringOneOf,
} from '@osric/core/ValidationPrimitives';

const FORAGE_TYPES = ['food', 'water', 'both'] as const;
const SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const;

export const ForagingValidator: Validator<ForagingParameters> = {
  rules: [
    ValidationPrimitives.required('characterId'),
    ValidationPrimitives.required('forageType'),
    {
      field: 'forageType',
      message: `forageType must be one of: ${FORAGE_TYPES.join(', ')}`,
      validate(value) {
        return isStringOneOf(value, FORAGE_TYPES);
      },
    },
    ValidationPrimitives.required('terrain'),
    ValidationPrimitives.required('season'),
    {
      field: 'season',
      message: `season must be one of: ${SEASONS.join(', ')}`,
      validate(value) {
        return isStringOneOf(value, SEASONS);
      },
    },
    ValidationPrimitives.required('timeSpent'),
    ValidationPrimitives.nonNegativeInteger('timeSpent'),
    ValidationPrimitives.required('groupSize'),
    ValidationPrimitives.nonNegativeInteger('groupSize'),
    ValidationPrimitives.required('hasForagingTools'),
    {
      field: 'hasForagingTools',
      message: 'hasForagingTools must be a boolean',
      validate(value) {
        return typeof value === 'boolean';
      },
    },
    {
      field: 'weatherConditions.type',
      message: 'weatherConditions.type must be a string when provided',
      validate(value) {
        return value == null || typeof value === 'string';
      },
    },
    {
      field: 'weatherConditions.impactsForaging',
      message: 'weatherConditions.impactsForaging must be a boolean when provided',
      validate(value) {
        return value == null || typeof value === 'boolean';
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

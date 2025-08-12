import type { MoveParameters } from '@osric/commands/exploration/MoveCommand';
import {
  ValidationPrimitives,
  type Validator,
  isStringOneOf,
} from '@osric/core/ValidationPrimitives';

const MOVE_TYPES = ['walk', 'run', 'sneak', 'fly', 'swim', 'climb'] as const;
const TERRAIN_TYPES_SIMPLE = ['Normal', 'Difficult', 'Very Difficult', 'Impassable'] as const;
const TIME_SCALES = ['combat', 'exploration', 'overland'] as const;

export const MoveValidator: Validator<MoveParameters> = {
  rules: [
    ValidationPrimitives.required('characterId'),
    ValidationPrimitives.required('movement.type'),
    {
      field: 'movement.type',
      message: `movement.type must be one of: ${MOVE_TYPES.join(', ')}`,
      validate(value) {
        return isStringOneOf(value, MOVE_TYPES);
      },
    },
    ValidationPrimitives.required('movement.distance'),
    ValidationPrimitives.nonNegativeInteger('movement.distance'),
    {
      field: 'movement.direction',
      message: 'movement.direction must be a string when provided',
      validate(value) {
        return value == null || typeof value === 'string';
      },
    },
    {
      field: 'movement.destination',
      message: 'movement.destination must be a string when provided',
      validate(value) {
        return value == null || typeof value === 'string';
      },
    },
    ValidationPrimitives.required('terrain.type'),
    {
      field: 'terrain.type',
      message: `terrain.type must be one of: ${TERRAIN_TYPES_SIMPLE.join(', ')}`,
      validate(value) {
        return isStringOneOf(value, TERRAIN_TYPES_SIMPLE);
      },
    },
    ValidationPrimitives.required('terrain.environment'),
    {
      field: 'terrain.environmentalFeature',
      message: 'terrain.environmentalFeature must be a string when provided',
      validate(value) {
        return value == null || typeof value === 'string';
      },
    },
    ValidationPrimitives.required('timeScale'),
    {
      field: 'timeScale',
      message: `timeScale must be one of: ${TIME_SCALES.join(', ')}`,
      validate(value) {
        return isStringOneOf(value, TIME_SCALES);
      },
    },
    {
      field: 'forcedMarch',
      message: 'forcedMarch must be a boolean when provided',
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

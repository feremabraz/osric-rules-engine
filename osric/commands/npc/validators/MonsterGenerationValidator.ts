import type { MonsterGenerationParameters } from '@osric/commands/npc/MonsterGenerationCommand';
import {
  ValidationPrimitives,
  type Validator,
  isStringOneOf,
} from '@osric/core/ValidationPrimitives';

const MG_TERRAINS = [
  'dungeon',
  'forest',
  'plains',
  'hills',
  'mountains',
  'swamp',
  'desert',
  'arctic',
  'ocean',
  'city',
] as const;
const MG_TIMES = ['day', 'night', 'dawn', 'dusk'] as const;
const MG_WEATHER = ['clear', 'rain', 'storm', 'fog', 'snow'] as const;

export const MonsterGenerationValidator: Validator<MonsterGenerationParameters> = {
  rules: [
    ValidationPrimitives.required('terrainType'),
    {
      field: 'terrainType',
      message: `terrainType must be one of: ${MG_TERRAINS.join(', ')}`,
      validate(value) {
        return isStringOneOf(value, MG_TERRAINS);
      },
    },
    ValidationPrimitives.required('encounterLevel'),
    {
      field: 'encounterLevel',
      message: 'encounterLevel must be between 1 and 20',
      validate(value) {
        return typeof value === 'number' && value >= 1 && value <= 20;
      },
    },
    ValidationPrimitives.required('partySize'),
    {
      field: 'partySize',
      message: 'partySize must be between 1 and 12',
      validate(value) {
        return typeof value === 'number' && value >= 1 && value <= 12;
      },
    },
    {
      field: 'timeOfDay',
      message: `timeOfDay must be one of: ${MG_TIMES.join(', ')}`,
      validate(value) {
        return value == null || isStringOneOf(value, MG_TIMES);
      },
    },
    {
      field: 'weather',
      message: `weather must be one of: ${MG_WEATHER.join(', ')}`,
      validate(value) {
        return value == null || isStringOneOf(value, MG_WEATHER);
      },
    },
    {
      field: 'specialConditions',
      message: 'specialConditions must be an object when provided',
      validate(value) {
        return value == null || (typeof value === 'object' && !Array.isArray(value));
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

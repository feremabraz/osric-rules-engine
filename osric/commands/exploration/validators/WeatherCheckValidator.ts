import type { WeatherCheckParameters } from '@osric/commands/exploration/WeatherCheckCommand';
import {
  ValidationPrimitives,
  type Validator,
  isStringOneOf,
} from '@osric/core/ValidationPrimitives';

const WEATHER_TYPES = [
  'clear',
  'overcast',
  'light-rain',
  'heavy-rain',
  'drizzle',
  'fog',
  'light-snow',
  'heavy-snow',
  'blizzard',
  'wind',
  'storm',
] as const;
const INTENSITY = ['light', 'moderate', 'heavy', 'severe'] as const;
const TEMPERATURE = ['freezing', 'cold', 'cool', 'mild', 'warm', 'hot', 'scorching'] as const;
const ACTIVITY_TYPES = [
  'travel',
  'combat',
  'spellcasting',
  'ranged-attack',
  'rest',
  'foraging',
] as const;

export const WeatherCheckValidator: Validator<WeatherCheckParameters> = {
  rules: [
    ValidationPrimitives.required('characterId'),
    ValidationPrimitives.required('currentWeather.type'),
    {
      field: 'currentWeather.type',
      message: `currentWeather.type must be one of: ${WEATHER_TYPES.join(', ')}`,
      validate(value) {
        return isStringOneOf(value, WEATHER_TYPES);
      },
    },
    ValidationPrimitives.required('currentWeather.intensity'),
    {
      field: 'currentWeather.intensity',
      message: `currentWeather.intensity must be one of: ${INTENSITY.join(', ')}`,
      validate(value) {
        return isStringOneOf(value, INTENSITY);
      },
    },
    ValidationPrimitives.required('currentWeather.duration'),
    ValidationPrimitives.nonNegativeInteger('currentWeather.duration'),
    ValidationPrimitives.required('currentWeather.temperature'),
    {
      field: 'currentWeather.temperature',
      message: `currentWeather.temperature must be one of: ${TEMPERATURE.join(', ')}`,
      validate(value) {
        return isStringOneOf(value, TEMPERATURE);
      },
    },
    ValidationPrimitives.required('activityType'),
    {
      field: 'activityType',
      message: `activityType must be one of: ${ACTIVITY_TYPES.join(', ')}`,
      validate(value) {
        return isStringOneOf(value, ACTIVITY_TYPES);
      },
    },
    {
      field: 'exposureTime',
      message: 'exposureTime must be a non-negative integer when provided',
      validate(value) {
        return value == null || (Number.isInteger(value) && (value as number) >= 0);
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

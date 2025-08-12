import type { ThiefSkillCheckParameters } from '@osric/commands/character/ThiefSkillCheckCommand';
import {
  ValidationPrimitives,
  type Validator,
  isStringOneOf,
} from '@osric/core/ValidationPrimitives';

const THIEF_SKILLS = [
  'pick-locks',
  'find-traps',
  'move-silently',
  'hide-shadows',
  'hear-noise',
  'climb-walls',
  'read-languages',
] as const;
const DIFFICULTY = ['easy', 'normal', 'hard', 'very-hard'] as const;
const LIGHTING = ['bright', 'dim', 'dark', 'pitch-black'] as const;
const TIME_MODES = ['rushed', 'normal', 'careful'] as const;
const NOISE = ['silent', 'quiet', 'normal', 'loud'] as const;
const SURFACE = ['easy', 'normal', 'difficult', 'treacherous'] as const;

export const ThiefSkillCheckValidator: Validator<ThiefSkillCheckParameters> = {
  rules: [
    ValidationPrimitives.required('characterId'),
    ValidationPrimitives.required('skillType'),
    {
      field: 'skillType',
      message: `skillType must be one of: ${THIEF_SKILLS.join(', ')}`,
      validate(value) {
        return isStringOneOf(value, THIEF_SKILLS);
      },
    },
    {
      field: 'situationalModifiers.difficulty',
      message: `difficulty must be one of: ${DIFFICULTY.join(', ')}`,
      validate(value) {
        return value == null || isStringOneOf(value, DIFFICULTY);
      },
    },
    {
      field: 'situationalModifiers.equipment',
      message: 'equipment modifier must be a number when provided',
      validate(value) {
        return value == null || typeof value === 'number';
      },
    },
    {
      field: 'situationalModifiers.lighting',
      message: `lighting must be one of: ${LIGHTING.join(', ')}`,
      validate(value) {
        return value == null || isStringOneOf(value, LIGHTING);
      },
    },
    {
      field: 'situationalModifiers.time',
      message: `time must be one of: ${TIME_MODES.join(', ')}`,
      validate(value) {
        return value == null || isStringOneOf(value, TIME_MODES);
      },
    },
    {
      field: 'situationalModifiers.noise',
      message: `noise must be one of: ${NOISE.join(', ')}`,
      validate(value) {
        return value == null || isStringOneOf(value, NOISE);
      },
    },
    {
      field: 'situationalModifiers.surface',
      message: `surface must be one of: ${SURFACE.join(', ')}`,
      validate(value) {
        return value == null || isStringOneOf(value, SURFACE);
      },
    },
    {
      field: 'targetDifficulty',
      message: 'targetDifficulty must be between 1 and 99 when provided',
      validate(value) {
        return value == null || (typeof value === 'number' && value >= 1 && value <= 99);
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

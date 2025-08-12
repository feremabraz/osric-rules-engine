import type { TurnUndeadParameters } from '@osric/commands/character/TurnUndeadCommand';
import {
  ValidationPrimitives,
  type Validator,
  isStringOneOf,
} from '@osric/core/ValidationPrimitives';

const ALIGNMENTS = ['good', 'neutral', 'evil'] as const;

export const TurnUndeadValidator: Validator<TurnUndeadParameters> = {
  rules: [
    ValidationPrimitives.required('characterId'),
    ValidationPrimitives.required('targetUndeadIds'),
    ValidationPrimitives.arrayNotEmpty('targetUndeadIds'),
    {
      field: 'situationalModifiers.holySymbolBonus',
      message: 'holySymbolBonus must be between -5 and +5 when provided',
      validate(value) {
        return value == null || (typeof value === 'number' && value >= -5 && value <= 5);
      },
    },
    {
      field: 'situationalModifiers.spellBonus',
      message: 'spellBonus must be a number when provided',
      validate(value) {
        return value == null || typeof value === 'number';
      },
    },
    {
      field: 'situationalModifiers.areaBonus',
      message: 'areaBonus must be a number when provided',
      validate(value) {
        return value == null || typeof value === 'number';
      },
    },
    {
      field: 'situationalModifiers.alignment',
      message: `alignment must be one of: ${ALIGNMENTS.join(', ')}`,
      validate(value) {
        return value == null || isStringOneOf(value, ALIGNMENTS);
      },
    },
    {
      field: 'situationalModifiers.isEvil',
      message: 'isEvil must be a boolean when provided',
      validate(value) {
        return value == null || typeof value === 'boolean';
      },
    },
    {
      field: 'massAttempt',
      message: 'massAttempt must be a boolean when provided',
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

import type { InitiativeParameters } from '@osric/commands/combat/InitiativeCommand';
import {
  ValidationPrimitives,
  type Validator,
  isStringOneOf,
} from '@osric/core/ValidationPrimitives';

const INITIATIVE_TYPES = ['individual', 'group'] as const;

export const InitiativeValidator: Validator<InitiativeParameters> = {
  rules: [
    ValidationPrimitives.required('entities'),
    {
      field: 'entities',
      message: 'entities must be a non-empty array',
      validate(value) {
        return Array.isArray(value) && value.length > 0;
      },
    },
    ValidationPrimitives.required('initiativeType'),
    {
      field: 'initiativeType',
      message: `initiativeType must be one of: ${INITIATIVE_TYPES.join(', ')}`,
      validate(value) {
        return isStringOneOf(value, INITIATIVE_TYPES);
      },
    },
    {
      field: 'weapons',
      message: 'weapons must be a record of entityId -> itemId when provided',
      validate(value) {
        return value == null || (typeof value === 'object' && !Array.isArray(value));
      },
    },
    {
      field: 'spells',
      message: 'spells must be a record of entityId -> spellName when provided',
      validate(value) {
        return value == null || (typeof value === 'object' && !Array.isArray(value));
      },
    },
    {
      field: 'circumstanceModifiers',
      message: 'circumstanceModifiers must be a record of entityId -> number when provided',
      validate(value) {
        return (
          value == null ||
          (typeof value === 'object' &&
            !Array.isArray(value) &&
            Object.values(value as Record<string, unknown>).every((v) => typeof v === 'number'))
        );
      },
    },
    {
      field: 'isFirstRound',
      message: 'isFirstRound must be a boolean when provided',
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

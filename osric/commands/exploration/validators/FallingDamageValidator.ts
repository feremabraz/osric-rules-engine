import type { FallingDamageParameters } from '@osric/commands/exploration/FallingDamageCommand';
import {
  ValidationPrimitives,
  type Validator,
  isStringOneOf,
} from '@osric/core/ValidationPrimitives';

const SURFACE_TYPES = ['soft', 'normal', 'hard', 'spikes'] as const;
const ENCUMBRANCE = ['light', 'moderate', 'heavy', 'severe'] as const;

export const FallingDamageValidator: Validator<FallingDamageParameters> = {
  rules: [
    ValidationPrimitives.required('characterId'),
    ValidationPrimitives.required('fallDistance'),
    ValidationPrimitives.nonNegativeInteger('fallDistance'),
    {
      field: 'surfaceType',
      message: `surfaceType must be one of: ${SURFACE_TYPES.join(', ')}`,
      validate(value) {
        return value == null || isStringOneOf(value, SURFACE_TYPES);
      },
    },
    {
      field: 'circumstances.intentional',
      message: 'circumstances.intentional must be a boolean when provided',
      validate(value) {
        return value == null || typeof value === 'boolean';
      },
    },
    {
      field: 'circumstances.hasFeatherFall',
      message: 'circumstances.hasFeatherFall must be a boolean when provided',
      validate(value) {
        return value == null || typeof value === 'boolean';
      },
    },
    {
      field: 'circumstances.encumbrance',
      message: `circumstances.encumbrance must be one of: ${ENCUMBRANCE.join(', ')}`,
      validate(value) {
        return value == null || isStringOneOf(value, ENCUMBRANCE);
      },
    },
    {
      field: 'circumstances.dexterityCheck',
      message: 'circumstances.dexterityCheck must be a boolean when provided',
      validate(value) {
        return value == null || typeof value === 'boolean';
      },
    },
    {
      field: 'savingThrow',
      message: 'savingThrow must be a boolean when provided',
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

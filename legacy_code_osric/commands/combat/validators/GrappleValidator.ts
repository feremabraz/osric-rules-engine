import type { GrappleParameters } from '@osric/commands/combat/GrappleCommand';
import {
  ValidationPrimitives,
  type Validator,
  isStringOneOf,
} from '@osric/core/ValidationPrimitives';

const GRAPPLE_TYPES = ['standard', 'overbearing'] as const;

export const GrappleValidator: Validator<GrappleParameters> = {
  rules: [
    ValidationPrimitives.required('attackerId'),
    ValidationPrimitives.required('targetId'),
    ValidationPrimitives.required('grappleType'),
    {
      field: 'grappleType',
      message: `grappleType must be one of: ${GRAPPLE_TYPES.join(', ')}`,
      validate(value) {
        return isStringOneOf(value, GRAPPLE_TYPES);
      },
    },
    {
      field: 'isChargedAttack',
      message: 'isChargedAttack must be a boolean when provided',
      validate(value) {
        return value == null || typeof value === 'boolean';
      },
    },
    {
      field: 'situationalModifiers',
      message: 'situationalModifiers must be a number when provided',
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

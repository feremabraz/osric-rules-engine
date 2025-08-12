import type { AttackParameters } from '@osric/commands/combat/AttackCommand';
import {
  ValidationPrimitives,
  type Validator,
  isStringOneOf,
} from '@osric/core/ValidationPrimitives';

const ATTACK_TYPES = ['normal', 'subdual', 'grapple'] as const;

export const AttackValidator: Validator<AttackParameters> = {
  rules: [
    ValidationPrimitives.required('attackerId'),
    ValidationPrimitives.required('targetId'),
    {
      field: 'situationalModifiers',
      message: 'situationalModifiers must be a number when provided',
      validate(value) {
        return value == null || typeof value === 'number';
      },
    },
    {
      field: 'attackType',
      message: `attackType must be one of: ${ATTACK_TYPES.join(', ')}`,
      validate(value) {
        return value == null || isStringOneOf(value, ATTACK_TYPES);
      },
    },
    {
      field: 'isChargedAttack',
      message: 'isChargedAttack must be a boolean when provided',
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

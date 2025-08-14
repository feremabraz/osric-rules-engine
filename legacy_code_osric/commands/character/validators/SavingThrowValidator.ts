import { ValidationPrimitives, type Validator } from '@osric/core/ValidationPrimitives';
import type { SavingThrowParams } from '@osric/types/commands';
import { SAVING_THROW_TYPES } from '@osric/types/commands';

export const SavingThrowValidator: Validator<SavingThrowParams> = {
  rules: [
    ValidationPrimitives.required('characterId'),
    ValidationPrimitives.required('saveType'),
    ValidationPrimitives.pattern(
      'saveType',
      new RegExp(`^(${SAVING_THROW_TYPES.join('|')})$`),
      'Invalid saving throw type'
    ),
    {
      field: 'difficultyModifier',
      message: 'difficultyModifier must be a number when provided',
      validate(value) {
        return value == null || typeof value === 'number';
      },
    },
    {
      field: 'targetNumber',
      message: 'targetNumber must be between 2 and 20 when provided',
      validate(value) {
        return value == null || (typeof value === 'number' && value >= 2 && value <= 20);
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

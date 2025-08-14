import type { LevelUpParameters } from '@osric/commands/character/LevelUpCommand';
import { ValidationPrimitives, type Validator } from '@osric/core/ValidationPrimitives';

export const LevelUpValidator: Validator<LevelUpParameters> = {
  rules: [
    ValidationPrimitives.required('characterId'),
    {
      field: 'targetLevel',
      message: 'targetLevel must be a positive integer when provided',
      validate(value) {
        return value == null || (Number.isInteger(value) && (value as number) > 0);
      },
    },
    {
      field: 'bypassTraining',
      message: 'bypassTraining must be a boolean when provided',
      validate(value) {
        return value == null || typeof value === 'boolean';
      },
    },
    {
      field: 'trainerDetails',
      message: 'trainerDetails must be an object when provided',
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

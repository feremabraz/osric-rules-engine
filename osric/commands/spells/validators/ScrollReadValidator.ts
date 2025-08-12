import type { ScrollReadParameters } from '@osric/commands/spells/ScrollReadCommand';
import { ValidationPrimitives, type Validator } from '@osric/core/ValidationPrimitives';

export const ScrollReadValidator: Validator<ScrollReadParameters> = {
  rules: [
    ValidationPrimitives.required('readerId'),
    ValidationPrimitives.required('scrollId'),
    {
      field: 'targetIds',
      message: 'targetIds must be an array of entity IDs when provided',
      validate(value) {
        return value == null || Array.isArray(value);
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

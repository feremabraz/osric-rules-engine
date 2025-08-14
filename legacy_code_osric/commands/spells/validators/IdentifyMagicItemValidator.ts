import type { IdentifyMagicItemParameters } from '@osric/commands/spells/IdentifyMagicItemCommand';
import {
  ValidationPrimitives,
  type Validator,
  isStringOneOf,
} from '@osric/core/ValidationPrimitives';

const IDENTIFY_METHODS = ['spell', 'sage', 'trial'] as const;

export const IdentifyMagicItemValidator: Validator<IdentifyMagicItemParameters> = {
  rules: [
    ValidationPrimitives.required('identifierId'),
    ValidationPrimitives.required('itemId'),
    ValidationPrimitives.required('method'),
    {
      field: 'method',
      message: `method must be one of: ${IDENTIFY_METHODS.join(', ')}`,
      validate(value) {
        return isStringOneOf(value, IDENTIFY_METHODS);
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

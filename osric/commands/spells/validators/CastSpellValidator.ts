import type { CastSpellParameters } from '@osric/commands/spells/CastSpellCommand';
import { ValidationPrimitives, type Validator } from '@osric/core/ValidationPrimitives';

export const CastSpellValidator: Validator<CastSpellParameters> = {
  rules: [
    ValidationPrimitives.required('casterId'),
    ValidationPrimitives.required('spellName'),
    {
      field: 'spellLevel',
      message: 'spellLevel must be a positive integer when provided',
      validate(value) {
        return value == null || (Number.isInteger(value as number) && (value as number) > 0);
      },
    },
    {
      field: 'targetIds',
      message: 'targetIds must be an array of entity IDs when provided',
      validate(value) {
        return value == null || Array.isArray(value);
      },
    },
    {
      field: 'overrideComponents',
      message: 'overrideComponents must be a boolean when provided',
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

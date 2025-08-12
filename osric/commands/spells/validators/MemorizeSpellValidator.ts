import type { MemorizeSpellParameters } from '@osric/commands/spells/MemorizeSpellCommand';
import { ValidationPrimitives, type Validator } from '@osric/core/ValidationPrimitives';

export const MemorizeSpellValidator: Validator<MemorizeSpellParameters> = {
  rules: [
    ValidationPrimitives.required('casterId'),
    ValidationPrimitives.required('spellName'),
    ValidationPrimitives.required('spellLevel'),
    ValidationPrimitives.positiveInteger('spellLevel'),
    {
      field: 'replaceSpell',
      message: 'replaceSpell must be a string when provided',
      validate(value) {
        return value == null || typeof value === 'string';
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

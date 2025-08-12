import type { CreateCharacterParameters } from '@osric/commands/character/CreateCharacterCommand';
import {
  OSRICValidation,
  ValidationPrimitives,
  type Validator,
} from '@osric/core/ValidationPrimitives';

export const CreateCharacterValidator: Validator<CreateCharacterParameters> = {
  rules: [
    ValidationPrimitives.required('name'),
    ValidationPrimitives.stringLength('name', 1, 50),
    OSRICValidation.characterRace('race'),
    OSRICValidation.characterClass('characterClass'),
    OSRICValidation.alignment('alignment'),
    ValidationPrimitives.oneOf('abilityScoreMethod', [
      'standard3d6',
      'arranged3d6',
      '4d6dropLowest',
    ]),
    ValidationPrimitives.custom<unknown>(
      'arrangedScores',
      (value) => value == null || typeof value === 'object',
      'must be provided when using arranged3d6'
    ),
  ],
  validate(params) {
    return ValidationPrimitives.validateObject(
      params as unknown as Record<string, unknown>,
      this.rules
    );
  },
};

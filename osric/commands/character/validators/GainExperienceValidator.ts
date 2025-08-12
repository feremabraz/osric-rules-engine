import type { GainExperienceParameters } from '@osric/commands/character/GainExperienceCommand';
import {
  ValidationPrimitives,
  type Validator,
  isStringOneOf,
} from '@osric/core/ValidationPrimitives';

const XP_SOURCE_TYPES = ['combat', 'treasure', 'story', 'other'] as const;

export const GainExperienceValidator: Validator<GainExperienceParameters> = {
  rules: [
    ValidationPrimitives.required('characterId'),
    ValidationPrimitives.required('experienceSource.type'),
    {
      field: 'experienceSource.type',
      message: `experienceSource.type must be one of: ${XP_SOURCE_TYPES.join(', ')}`,
      validate(value) {
        return isStringOneOf(value, XP_SOURCE_TYPES);
      },
    },
    {
      field: 'experienceSource.amount',
      message: 'experienceSource.amount must be a non-negative number when provided',
      validate(value) {
        return value == null || (typeof value === 'number' && value >= 0);
      },
    },
    {
      field: 'experienceSource.treasureValue',
      message: 'experienceSource.treasureValue must be a non-negative number when provided',
      validate(value) {
        return value == null || (typeof value === 'number' && value >= 0);
      },
    },
    {
      field: 'partyShare.enabled',
      message: 'partyShare.enabled must be a boolean when provided',
      validate(value) {
        return value == null || typeof value === 'boolean';
      },
    },
    {
      field: 'partyShare.partyMemberIds',
      message: 'partyShare.partyMemberIds must be an array of IDs when provided',
      validate(value) {
        return value == null || Array.isArray(value);
      },
    },
    {
      field: 'partyShare.shareRatio',
      message: 'partyShare.shareRatio must be a number between 0 and 1 when provided',
      validate(value) {
        return value == null || (typeof value === 'number' && value >= 0 && value <= 1);
      },
    },
    {
      field: 'applyClassModifiers',
      message: 'applyClassModifiers must be a boolean when provided',
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

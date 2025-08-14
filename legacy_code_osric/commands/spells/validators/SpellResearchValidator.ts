import type { SpellResearchParameters } from '@osric/commands/spells/SpellResearchCommand';
import {
  ValidationPrimitives,
  type Validator,
  isStringOneOf,
} from '@osric/core/ValidationPrimitives';

const RESEARCH_TYPES = ['magic-user', 'cleric', 'druid', 'illusionist'] as const;
const LIBRARY_QUALITY = ['poor', 'average', 'good', 'excellent'] as const;

export const SpellResearchValidator: Validator<SpellResearchParameters> = {
  rules: [
    ValidationPrimitives.required('characterId'),
    ValidationPrimitives.required('spellLevel'),
    ValidationPrimitives.positiveInteger('spellLevel'),
    ValidationPrimitives.required('spellName'),
    ValidationPrimitives.required('spellDescription'),
    ValidationPrimitives.required('researchType'),
    {
      field: 'researchType',
      message: `researchType must be one of: ${RESEARCH_TYPES.join(', ')}`,
      validate(value) {
        return isStringOneOf(value, RESEARCH_TYPES);
      },
    },
    {
      field: 'timeInWeeks',
      message: 'timeInWeeks must be a positive integer when provided',
      validate(value) {
        return value == null || (Number.isInteger(value as number) && (value as number) > 0);
      },
    },
    {
      field: 'costInGold',
      message: 'costInGold must be a non-negative integer when provided',
      validate(value) {
        return value == null || (Number.isInteger(value as number) && (value as number) >= 0);
      },
    },
    {
      field: 'specialMaterials',
      message: 'specialMaterials must be an array of {name, cost, rarity}',
      validate(value) {
        return (
          value == null ||
          (Array.isArray(value) &&
            (value as unknown[]).every((v) => {
              if (typeof v !== 'object' || v === null) return false;
              const o = v as { name?: unknown; cost?: unknown; rarity?: unknown };
              const rarity = o.rarity;
              return (
                typeof o.name === 'string' &&
                typeof o.cost === 'number' &&
                typeof rarity === 'string' &&
                ['common', 'uncommon', 'rare', 'very-rare'].includes(rarity)
              );
            }))
        );
      },
    },
    {
      field: 'mentorAvailable',
      message: 'mentorAvailable must be a boolean when provided',
      validate(value) {
        return value == null || typeof value === 'boolean';
      },
    },
    {
      field: 'libraryQuality',
      message: `libraryQuality must be one of: ${LIBRARY_QUALITY.join(', ')}`,
      validate(value) {
        return value == null || isStringOneOf(value, LIBRARY_QUALITY);
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

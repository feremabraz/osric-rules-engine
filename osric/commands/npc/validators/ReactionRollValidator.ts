import type { ReactionRollParameters } from '@osric/commands/npc/ReactionRollCommand';
import {
  ValidationPrimitives,
  type Validator,
  isStringOneOf,
} from '@osric/core/ValidationPrimitives';

const INTERACTION_TYPES = [
  'first_meeting',
  'negotiation',
  'intimidation',
  'persuasion',
  'bribery',
] as const;

export const ReactionRollValidator: Validator<ReactionRollParameters> = {
  rules: [
    ValidationPrimitives.required('characterId'),
    ValidationPrimitives.required('targetId'),
    ValidationPrimitives.required('interactionType'),
    {
      field: 'interactionType',
      message: `interactionType must be one of: ${INTERACTION_TYPES.join(', ')}`,
      validate(value) {
        return isStringOneOf(value, INTERACTION_TYPES);
      },
    },
    {
      field: 'modifiers.gifts',
      message: 'modifiers.gifts must be a number when provided',
      validate(value) {
        return value == null || typeof value === 'number';
      },
    },
    {
      field: 'modifiers.threats',
      message: 'modifiers.threats must be a number when provided',
      validate(value) {
        return value == null || typeof value === 'number';
      },
    },
    {
      field: 'modifiers.reputation',
      message: 'modifiers.reputation must be a number when provided',
      validate(value) {
        return value == null || typeof value === 'number';
      },
    },
    {
      field: 'modifiers.languageBarrier',
      message: 'modifiers.languageBarrier must be a number when provided',
      validate(value) {
        return value == null || typeof value === 'number';
      },
    },
    {
      field: 'modifiers.culturalDifferences',
      message: 'modifiers.culturalDifferences must be a number when provided',
      validate(value) {
        return value == null || typeof value === 'number';
      },
    },
    {
      field: 'modifiers.partySizeModifier',
      message: 'modifiers.partySizeModifier must be a number when provided',
      validate(value) {
        return value == null || typeof value === 'number';
      },
    },
    {
      field: 'isPartySpokesperson',
      message: 'isPartySpokesperson must be a boolean when provided',
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

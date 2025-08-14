import type { MagicItemCreationParameters } from '@osric/commands/spells/MagicItemCreationCommand';
import {
  ValidationPrimitives,
  type Validator,
  isStringOneOf,
} from '@osric/core/ValidationPrimitives';

const ITEM_TYPES = [
  'scroll',
  'potion',
  'weapon',
  'armor',
  'ring',
  'wand',
  'rod',
  'staff',
  'miscellaneous',
] as const;
const WORKSPACE_QUALITY = ['basic', 'good', 'excellent', 'legendary'] as const;

export const MagicItemCreationValidator: Validator<MagicItemCreationParameters> = {
  rules: [
    ValidationPrimitives.required('characterId'),
    ValidationPrimitives.required('itemType'),
    {
      field: 'itemType',
      message: `itemType must be one of: ${ITEM_TYPES.join(', ')}`,
      validate(value) {
        return isStringOneOf(value, ITEM_TYPES);
      },
    },
    {
      field: 'enchantmentLevel',
      message: 'enchantmentLevel must be a positive integer when provided',
      validate(value) {
        return value == null || (Number.isInteger(value as number) && (value as number) > 0);
      },
    },
    {
      field: 'spellsToScribe',
      message: 'spellsToScribe must be an array of strings when provided',
      validate(value) {
        return (
          value == null ||
          (Array.isArray(value) && (value as unknown[]).every((v) => typeof v === 'string'))
        );
      },
    },
    {
      field: 'materialComponents',
      message: 'materialComponents must be an array of {name, cost, quantity, available}',
      validate(value) {
        return (
          value == null ||
          (Array.isArray(value) &&
            (value as unknown[]).every((v) => {
              if (typeof v !== 'object' || v === null) return false;
              const o = v as {
                name?: unknown;
                cost?: unknown;
                quantity?: unknown;
                available?: unknown;
              };
              return (
                typeof o.name === 'string' &&
                typeof o.cost === 'number' &&
                typeof o.quantity === 'number' &&
                typeof o.available === 'boolean'
              );
            }))
        );
      },
    },
    {
      field: 'workspaceQuality',
      message: `workspaceQuality must be one of: ${WORKSPACE_QUALITY.join(', ')}`,
      validate(value) {
        return value == null || isStringOneOf(value, WORKSPACE_QUALITY);
      },
    },
    {
      field: 'assistantPresent',
      message: 'assistantPresent must be a boolean when provided',
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

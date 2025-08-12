import type { SearchParameters } from '@osric/commands/exploration/SearchCommand';
import {
  ValidationPrimitives,
  type Validator,
  isStringOneOf,
} from '@osric/core/ValidationPrimitives';

const SEARCH_TYPES = ['secret-doors', 'traps', 'hidden-objects', 'general'] as const;
const THOROUGHNESS = ['quick', 'normal', 'careful', 'meticulous'] as const;

export const SearchValidator: Validator<SearchParameters> = {
  rules: [
    ValidationPrimitives.required('characterId'),
    ValidationPrimitives.required('searchType'),
    {
      field: 'searchType',
      message: `searchType must be one of: ${SEARCH_TYPES.join(', ')}`,
      validate(value) {
        return isStringOneOf(value, SEARCH_TYPES);
      },
    },
    ValidationPrimitives.required('timeSpent'),
    ValidationPrimitives.nonNegativeInteger('timeSpent'),
    ValidationPrimitives.required('thoroughness'),
    {
      field: 'thoroughness',
      message: `thoroughness must be one of: ${THOROUGHNESS.join(', ')}`,
      validate(value) {
        return isStringOneOf(value, THOROUGHNESS);
      },
    },
    {
      field: 'target.area',
      message: 'target.area must be a non-empty string when provided',
      validate(value) {
        return value == null || (typeof value === 'string' && value.length > 0);
      },
    },
    {
      field: 'target.specificTarget',
      message: 'target.specificTarget must be a string when provided',
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

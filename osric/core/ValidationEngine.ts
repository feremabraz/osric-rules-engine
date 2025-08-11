/**
 * Comprehensive Validation System for the OSRIC Rules Engine
 * Provides declarative validation rules for commands and parameters
 */

export interface ValidationRule<T = unknown> {
  validate(value: T): boolean;
  message: string;
  field?: string;
}

export interface ValidationError {
  field: string;
  message: string;
  value: unknown;
}

/**
 * ValidationEngine provides fluent interface for creating validation rules
 */
export namespace ValidationEngine {
  export function required<T>(field: string): ValidationRule<T> {
    return {
      validate: (value: T) => value !== null && value !== undefined && value !== '',
      message: `${field} is required`,
      field,
    };
  }

  export function stringLength(field: string, min: number, max: number): ValidationRule<string> {
    return {
      validate: (value: string) => Boolean(value) && value.length >= min && value.length <= max,
      message: `${field} must be between ${min} and ${max} characters`,
      field,
    };
  }

  export function numberRange(field: string, min: number, max: number): ValidationRule<number> {
    return {
      validate: (value: number) => typeof value === 'number' && value >= min && value <= max,
      message: `${field} must be between ${min} and ${max}`,
      field,
    };
  }

  export function oneOf<T>(field: string, allowedValues: T[]): ValidationRule<T> {
    return {
      validate: (value: T) => allowedValues.includes(value),
      message: `${field} must be one of: ${allowedValues.join(', ')}`,
      field,
    };
  }

  export function arrayNotEmpty<T>(field: string): ValidationRule<T[]> {
    return {
      validate: (value: T[]) => Array.isArray(value) && value.length > 0,
      message: `${field} must contain at least one item`,
      field,
    };
  }

  export function positiveInteger(field: string): ValidationRule<number> {
    return {
      validate: (value: number) => Number.isInteger(value) && value > 0,
      message: `${field} must be a positive integer`,
      field,
    };
  }

  export function nonNegativeInteger(field: string): ValidationRule<number> {
    return {
      validate: (value: number) => Number.isInteger(value) && value >= 0,
      message: `${field} must be a non-negative integer`,
      field,
    };
  }

  export function email(field: string): ValidationRule<string> {
    return {
      validate: (value: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(value);
      },
      message: `${field} must be a valid email address`,
      field,
    };
  }

  export function pattern(
    field: string,
    regex: RegExp,
    description: string
  ): ValidationRule<string> {
    return {
      validate: (value: string) => regex.test(value),
      message: `${field} ${description}`,
      field,
    };
  }

  export function custom<T>(
    field: string,
    validator: (value: T) => boolean,
    message: string
  ): ValidationRule<T> {
    return {
      validate: validator,
      message: `${field} ${message}`,
      field,
    };
  }

  /**
   * Get field value from object using dot notation
   */
  function getFieldValue(obj: Record<string, unknown>, field: string): unknown {
    if (!field) return obj;

    const parts = field.split('.');
    let value: unknown = obj;

    for (const part of parts) {
      value = (value as Record<string, unknown>)?.[part];
    }

    return value;
  }

  /**
   * Validate multiple rules against an object
   */
  export function validateObject<T extends Record<string, unknown>>(
    obj: T,
    rules: ValidationRule[]
  ): { valid: boolean; errors: ValidationError[] } {
    const errors: ValidationError[] = [];

    for (const rule of rules) {
      const value = getFieldValue(obj, rule.field || '');
      if (!rule.validate(value)) {
        errors.push({
          field: rule.field || '',
          message: rule.message,
          value,
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate array of objects
   */
  export function validateArray<T extends Record<string, unknown>>(
    array: T[],
    rules: ValidationRule[],
    fieldPrefix = ''
  ): { valid: boolean; errors: ValidationError[] } {
    const errors: ValidationError[] = [];

    for (let i = 0; i < array.length; i++) {
      const result = validateObject(array[i], rules);
      if (!result.valid) {
        const prefixedErrors = result.errors.map((error) => ({
          ...error,
          field: fieldPrefix ? `${fieldPrefix}[${i}].${error.field}` : `[${i}].${error.field}`,
        }));
        errors.push(...prefixedErrors);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Create a compound validation rule
   */
  export function and<T>(...rules: ValidationRule<T>[]): ValidationRule<T> {
    return {
      validate: (value: T) => rules.every((rule) => rule.validate(value)),
      message: rules.map((rule) => rule.message).join(' and '),
      field: rules[0]?.field,
    };
  }

  /**
   * Create an OR validation rule
   */
  export function or<T>(...rules: ValidationRule<T>[]): ValidationRule<T> {
    return {
      validate: (value: T) => rules.some((rule) => rule.validate(value)),
      message: rules.map((rule) => rule.message).join(' or '),
      field: rules[0]?.field,
    };
  }
}

/**
 * Validation utilities for OSRIC-specific concepts
 */
export namespace OSRICValidation {
  /**
   * Normalize OSRIC enum-like values: lower-case and replace spaces with hyphens
   * Accepts inputs like "Lawful Good" or "Magic-User" and compares against
   * canonical lower-case lists like "lawful-good" or "magic-user".
   */
  function normalizeOsricValue(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    return value.trim().toLowerCase().replace(/\s+/g, '-');
  }

  export function abilityScore(field: string): ValidationRule<number> {
    return ValidationEngine.numberRange(field, 3, 18);
  }

  export function characterClass(field: string): ValidationRule<string> {
    const classes = [
      'fighter',
      'cleric',
      'magic-user',
      'thief',
      'ranger',
      'paladin',
      'druid',
      'illusionist',
      'assassin',
      'monk',
      'bard',
    ];
    return ValidationEngine.custom<string>(
      field,
      (value) => {
        const norm = normalizeOsricValue(value);
        return norm !== null && classes.includes(norm);
      },
      `must be one of: ${classes.join(', ')}`
    );
  }

  export function characterRace(field: string): ValidationRule<string> {
    const races = ['human', 'elf', 'dwarf', 'halfling', 'gnome', 'half-elf', 'half-orc'];
    return ValidationEngine.custom<string>(
      field,
      (value) => {
        const norm = normalizeOsricValue(value);
        return norm !== null && races.includes(norm);
      },
      `must be one of: ${races.join(', ')}`
    );
  }

  export function alignment(field: string): ValidationRule<string> {
    const alignments = [
      'lawful-good',
      'neutral-good',
      'chaotic-good',
      'lawful-neutral',
      'true-neutral',
      'chaotic-neutral',
      'lawful-evil',
      'neutral-evil',
      'chaotic-evil',
    ];
    return ValidationEngine.custom<string>(
      field,
      (value) => {
        const norm = normalizeOsricValue(value);
        return norm !== null && alignments.includes(norm);
      },
      `must be one of: ${alignments.join(', ')}`
    );
  }

  export function spellLevel(field: string): ValidationRule<number> {
    return ValidationEngine.numberRange(field, 1, 9);
  }

  export function characterLevel(field: string): ValidationRule<number> {
    return ValidationEngine.numberRange(field, 1, 36);
  }

  export function hitPoints(field: string): ValidationRule<number> {
    return ValidationEngine.nonNegativeInteger(field);
  }

  export function armorClass(field: string): ValidationRule<number> {
    return ValidationEngine.numberRange(field, -10, 10);
  }

  export function diceNotation(field: string): ValidationRule<string> {
    const dicePattern = /^\d*d\d+([+-]\d+)?$/i;
    return ValidationEngine.pattern(
      field,
      dicePattern,
      'must be valid dice notation (e.g., "1d6", "3d8+2")'
    );
  }

  export function entityId(field: string): ValidationRule<string> {
    return ValidationEngine.custom<string>(
      field,
      (value) => typeof value === 'string' && value.length > 0 && /^[a-zA-Z0-9_-]+$/.test(value),
      'must be a valid entity ID (alphanumeric, underscore, or dash)'
    );
  }
}

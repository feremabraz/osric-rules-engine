import { ValidationEngine } from '@osric/core/ValidationEngine';
import { describe, expect, it } from 'vitest';

describe('ValidationEngine', () => {
  it('required: fails on undefined, null, and empty string', () => {
    const rule = ValidationEngine.required('name');
    expect(rule.validate(undefined as unknown as string)).toBe(false);
    expect(rule.validate(null as unknown as string)).toBe(false);
    expect(rule.validate('')).toBe(false);
    expect(rule.validate('ok')).toBe(true);
  });

  it('stringLength: enforces inclusive bounds', () => {
    const rule = ValidationEngine.stringLength('name', 2, 4);
    expect(rule.validate('a')).toBe(false);
    expect(rule.validate('ab')).toBe(true);
    expect(rule.validate('abcd')).toBe(true);
    expect(rule.validate('abcde')).toBe(false);
  });

  it('numberRange: enforces inclusive numeric bounds', () => {
    const rule = ValidationEngine.numberRange('level', 1, 10);
    expect(rule.validate(0)).toBe(false);
    expect(rule.validate(1)).toBe(true);
    expect(rule.validate(10)).toBe(true);
    expect(rule.validate(11)).toBe(false);
  });

  it('oneOf: matches allowed values', () => {
    const rule = ValidationEngine.oneOf('type', ['a', 'b', 'c']);
    expect(rule.validate('a')).toBe(true);
    expect(rule.validate('d' as unknown as string)).toBe(false);
  });

  it('arrayNotEmpty: requires array with at least one item', () => {
    const rule = ValidationEngine.arrayNotEmpty('items');
    expect(rule.validate([])).toBe(false);
    expect(rule.validate(['x'])).toBe(true);
  });

  it('pattern: validates with regex and custom message', () => {
    const rule = ValidationEngine.pattern('dice', /^\d+d\d+$/i, 'must be valid dice');
    expect(rule.validate('2d6')).toBe(true);
    expect(rule.validate('d6')).toBe(false);
  });

  it('custom: supports arbitrary predicate', () => {
    const rule = ValidationEngine.custom<number>('hp', (v) => v % 2 === 0, 'must be even');
    expect(rule.validate(2)).toBe(true);
    expect(rule.validate(3)).toBe(false);
  });

  it('validateObject: supports dot-notation paths and aggregates errors', () => {
    const obj = { name: 'A', nested: { count: 1 } };
    const rules = [
      ValidationEngine.required('name'),
      ValidationEngine.stringLength('name', 1, 2),
      ValidationEngine.required('nested.count'),
      ValidationEngine.numberRange('nested.count', 2, 5),
    ];

    const result = ValidationEngine.validateObject(obj, rules);
    expect(result.valid).toBe(false);
    // Should fail numberRange for nested.count (1 < 2)
    expect(result.errors.some((e) => e.field === 'nested.count')).toBe(true);
  });

  it('validateArray: prefixes index to nested error paths', () => {
    const arr = [{ v: 0 }, { v: 2 }];
    const rules = [ValidationEngine.numberRange('v', 1, 3)];
    const res = ValidationEngine.validateArray(arr, rules, 'entries');
    expect(res.valid).toBe(false);
    expect(res.errors[0].field).toContain('entries[0].v');
  });

  it('toValidationResult: adapts to ValidationResult shape', () => {
    const obj = { distance: -1 };
    const rules = [ValidationEngine.nonNegativeInteger('distance')];
    const res = ValidationEngine.toValidationResult(obj, rules);
    expect(res.valid).toBe(false);
    expect(res.errors.length).toBeGreaterThan(0);
    expect(res.errors[0]).toContain('distance');
  });
});

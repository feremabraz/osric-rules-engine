import { beforeEach, describe, expect, it } from 'vitest';
import { makeCommandDescriptor } from '../../engine/core/command';
import { CommandRegistry } from '../../engine/facade/registry';

describe('CE-05 Command Registry', () => {
  beforeEach(() => {
    CommandRegistry.clear();
  });

  it('registers non-empty descriptor', () => {
    const d = makeCommandDescriptor('alpha', { validate: [() => null] });
    CommandRegistry.register(d);
    expect(CommandRegistry.get('alpha')).toBe(d);
    expect(CommandRegistry.list().length).toBe(1);
  });

  it('rejects duplicate key', () => {
    const d = makeCommandDescriptor('dup', { validate: [() => null] });
    CommandRegistry.register(d);
    expect(() => CommandRegistry.register(d)).toThrow(/already registered/);
  });

  it('rejects zero-rule descriptor', () => {
    const d = makeCommandDescriptor('empty');
    expect(() => CommandRegistry.register(d)).toThrow(/zero rules/);
  });
});

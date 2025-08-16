import { beforeEach, describe, expect, it } from 'vitest';
import { command } from '../../engine/authoring/dsl';
import { CommandRegistry } from '../../engine/facade/registry';

interface DescriptorLike {
  stages: {
    validate: unknown[];
    load: unknown[];
    calc: unknown[];
    mutate: unknown[];
    emit: unknown[];
  };
}
function countStages(d: DescriptorLike) {
  return {
    validate: d.stages.validate.length,
    load: d.stages.load.length,
    calc: d.stages.calc.length,
    mutate: d.stages.mutate.length,
    emit: d.stages.emit.length,
  };
}

describe('CE-06 DSL Builder', () => {
  beforeEach(() => CommandRegistry.clear());

  it('auto-registers on first stage method call', () => {
    const builder = command('cmd1');
    expect(CommandRegistry.get('cmd1')).toBeUndefined();
    builder.validate((acc) => acc);
    expect(CommandRegistry.get('cmd1')).toBeDefined();
  });

  it('accumulates rules in stage order', () => {
    const d = command('cmd2')
      .validate((a) => a)
      .load((a) => a)
      .calc((a) => a)
      .mutate((a) => a)
      .emit((a) => a);
    const counts = countStages(d);
    expect(counts).toEqual({ validate: 1, load: 1, calc: 1, mutate: 1, emit: 1 });
  });

  it('multiple rules per stage preserved', () => {
    const d = command('cmd3')
      .validate((a) => a)
      .validate((a) => a)
      .emit((a) => a);
    const counts = countStages(d);
    expect(counts.validate).toBe(2);
    expect(counts.emit).toBe(1);
  });

  it('descriptor snapshot frozen', () => {
    const d = command('cmd4')
      .validate((a) => a)
      .emit((a) => a);
    expect(Object.isFrozen(d)).toBe(true);
  });
});

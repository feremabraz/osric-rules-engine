import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import type { CommandClass } from '../../osric/command/Command';
import { Rule } from '../../osric/command/Rule';
import { defineCommand } from '../../osric/command/define';
import { registerCommand, resetRegisteredCommands } from '../../osric/command/register';
import { Engine } from '../../osric/engine/Engine';

class ValidateA extends Rule<{ a: number }> {
  static ruleName = 'ValidateA';
  static output = z.object({ a: z.number() });
  apply() {
    return { a: 1 };
  }
}
class LoadB extends Rule<{ b: number }> {
  static ruleName = 'LoadB';
  static output = z.object({ b: z.number() });
  apply() {
    return { b: 2 };
  }
}
class CalcC extends Rule<{ c: number }> {
  static ruleName = 'CalcC';
  static output = z.object({ c: z.number() });
  apply() {
    return { c: 3 };
  }
}
class MutateD extends Rule<{ d: number }> {
  static ruleName = 'MutateD';
  static output = z.object({ d: z.number() });
  apply() {
    return { d: 4 };
  }
}
class EmitE extends Rule<{ e: number }> {
  static ruleName = 'EmitE';
  static output = z.object({ e: z.number() });
  apply() {
    return { e: 5 };
  }
}

// Intentionally violating ordering: Calc before Validate
class CalcEarly extends Rule<{ x: number }> {
  static ruleName = 'CalcEarly';
  static output = z.object({ x: z.number() });
  apply() {
    return { x: 1 };
  }
}
class ValidateLate extends Rule<{ y: number }> {
  static ruleName = 'ValidateLate';
  static output = z.object({ y: z.number() });
  apply() {
    return { y: 2 };
  }
}

// Provide explicit categories to force recognition
type WithCategory = { category?: string };
(CalcEarly as unknown as WithCategory).category = 'calc';
(ValidateLate as unknown as WithCategory).category = 'validate';
// Provide categories for happy path as well
(ValidateA as unknown as WithCategory).category = 'validate';
(LoadB as unknown as WithCategory).category = 'load';
(CalcC as unknown as WithCategory).category = 'calc';
(MutateD as unknown as WithCategory).category = 'mutate';
(EmitE as unknown as WithCategory).category = 'emit';
// Removed stray any casts (lint compliance)

describe('Rule Ordering Enforcement (Item 11)', () => {
  beforeEach(() => resetRegisteredCommands());

  it('accepts properly ordered categories', async () => {
    const Good = defineCommand({
      key: 'GoodOrder',
      params: z.object({}),
      rules: [ValidateA, LoadB, CalcC, MutateD, EmitE],
    });
    registerCommand(Good as unknown as CommandClass);
    const engine = new Engine();
    await engine.start();
    const res = await engine.execute('GoodOrder', {});
    expect(res.ok).toBe(true);
  });

  it('rejects ordering violation', async () => {
    const Bad = defineCommand({
      key: 'BadOrder',
      params: z.object({}),
      rules: [CalcEarly, ValidateLate],
    });
    registerCommand(Bad as unknown as CommandClass);
    const engine = new Engine();
    await expect(engine.start()).rejects.toThrow(/ORDERING_VIOLATION/);
  });
});

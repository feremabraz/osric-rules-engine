import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { Command, Engine } from '../../osric';
import { registerCommand, resetRegisteredCommands } from '../../osric/command/register';

// Rule declares number but returns string to trigger validation failure.
class DeclaredNumberReturnsString extends class {} {
  static ruleName = 'Mismatch';
  static output = z.object({ value: z.number().int() });
  apply() {
    return { value: 'not-a-number' } as unknown as { value: number };
  }
}
class MismatchCommand extends Command {
  static key = 'mismatch';
  static params = z.object({});
  static rules = [DeclaredNumberReturnsString];
}

describe('Rule runtime validation failure', () => {
  it('fails with RULE_EXCEPTION and no accumulator mutation', async () => {
    resetRegisteredCommands();
    registerCommand(MismatchCommand as unknown as typeof Command);
    const engine = new Engine();
    await engine.start();
    const res = await engine.execute('mismatch', {});
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe('RULE_EXCEPTION');
      expect(res.error.message).toMatch(/Rule output validation failed/);
    }
  });
});

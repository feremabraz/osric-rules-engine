import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { Command, Engine } from '../../osric';
import { registerCommand, resetRegisteredCommands } from '../../osric/command/register';

class S1 extends class {} {
  static ruleName = 'S1';
  static output = z.object({ a: z.string(), shared: z.number() });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  apply(_ctx: unknown) {
    return { a: 'ok', shared: 1 };
  }
}
class S2 extends class {} {
  static ruleName = 'S2';
  static after = ['S1'];
  static output = z.object({ b: z.boolean(), shared: z.number() });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  apply(_ctx: unknown) {
    return { b: true, shared: 2 };
  }
}
class CompositeCommand extends Command {
  static key = 'composite';
  static params = z.object({});
  static rules = [S1, S2];
}

class Bad1 extends class {} {
  static ruleName = 'Bad1';
  static output = z.object({ x: z.string() });
  apply() {
    return { x: 'a' };
  }
}
class Bad2 extends class {} {
  static ruleName = 'Bad2';
  static after = ['Bad1'];
  static output = z.object({ x: z.number() }); // conflicting type
  apply() {
    return { x: 3 };
  }
}
class BadCommand extends Command {
  static key = 'bad';
  static params = z.object({});
  static rules = [Bad1, Bad2];
}

describe('Rule output schema merging', () => {
  it('rejects duplicate key even if schema types match (strict mode)', async () => {
    resetRegisteredCommands();
    registerCommand(CompositeCommand as unknown as typeof Command);
    const engine = new Engine();
    await expect(engine.start()).rejects.toThrow(
      /CONFLICTING_RESULT_KEY: Duplicate result key 'shared'/
    );
  });
  it('throws on duplicate key even when schemas would differ (strict mode catches earlier)', async () => {
    resetRegisteredCommands();
    registerCommand(BadCommand as unknown as typeof Command);
    const engine = new Engine();
    await expect(engine.start()).rejects.toThrow(
      /CONFLICTING_RESULT_KEY: Duplicate result key 'x'/
    );
  });
});

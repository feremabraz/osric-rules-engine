import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { Command, Engine } from '../../osric';
// Internalized registration helpers (Step 6) – import from internal module for tests
import { registerCommand, resetRegisteredCommands } from '../../osric/command/register';

class SimpleRule extends class {} {}
function makeRule(name: string, after?: string[]) {
  return class extends SimpleRule {
    static ruleName = name;
    static after = after;
    static output = z.object({});
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    apply(_ctx: unknown) {}
  };
}

class ACommand extends Command {
  static key = 'a';
  static params = z.object({ v: z.number() });
  static rules = [makeRule('R1'), makeRule('R2', ['R1'])];
}

class DuplicateKey extends Command {
  static key = 'a';
  static params = z.object({});
  static rules: ReturnType<typeof makeRule>[] = [];
}

class BadDep extends Command {
  static key = 'b';
  static params = z.object({});
  static rules = [makeRule('Only', ['Missing'])];
}

describe('Command registry validation', () => {
  it('builds registry for valid command', async () => {
    resetRegisteredCommands();
    registerCommand(ACommand);
    const engine = new Engine();
    await engine.start();
    const reg = engine.getRegistry();
    expect(reg.length).toBe(1);
    expect(reg[0].key).toBe('a');
    expect(reg[0].rules.map((r) => r.ruleName)).toEqual(['R1', 'R2']);
  });

  it('throws on duplicate command key', async () => {
    resetRegisteredCommands();
    registerCommand(ACommand);
    registerCommand(DuplicateKey);
    const engine = new Engine();
    await expect(engine.start()).rejects.toThrow(/Duplicate command key/);
  });

  it('throws on missing dependency rule', async () => {
    resetRegisteredCommands();
    registerCommand(BadDep);
    const engine = new Engine();
    await expect(engine.start()).rejects.toThrow(/depends on missing/);
  });
});

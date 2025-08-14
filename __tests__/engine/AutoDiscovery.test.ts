import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { Command } from '../../osric/command/Command';
import { registerCommand, resetRegisteredCommands } from '../../osric/command/register';
import { Engine } from '../../osric/engine/Engine';

// Dummy command to verify disabling auto discovery only registers explicit ones
class Dummy extends Command {
  static key = 'dummy';
  static params = z.object({});
  static rules = [
    class R extends class {} {
      static ruleName = 'X';
      static output = z.object({ x: z.number().int() });
      apply() {
        return { x: 1 };
      }
    },
  ];
}

describe('Auto command discovery (Phase 06)', () => {
  it('auto loads built-in commands when enabled', async () => {
    resetRegisteredCommands();
    const engine = new Engine({ autoDiscover: true });
    await engine.start();
    const keys = engine
      .getRegistry()
      .map((c) => c.key)
      .sort();
    expect(keys).toContain('createCharacter');
    expect(keys).toContain('gainExperience');
    expect(keys).toContain('inspireParty');
  });

  it('does not auto load when disabled', async () => {
    resetRegisteredCommands();
    registerCommand(Dummy);
    const engine = new Engine({ autoDiscover: false });
    await engine.start();
    const keys = engine.getRegistry().map((c) => c.key);
    expect(keys).toEqual(['dummy']);
  });
});

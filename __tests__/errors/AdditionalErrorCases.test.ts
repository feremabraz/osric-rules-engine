import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { Command, Engine } from '../../osric';
import type { RuleCtx } from '../../osric';
import { registerCommand, resetRegisteredCommands } from '../../osric/command/register';
import { type CharacterId, characterIdSchema } from '../../osric/store/ids';

// Command to trigger CHARACTER_NOT_FOUND via gainExperience
// We import existing command definitions by referencing engine.command after start.

// Custom command to force STORE_CONSTRAINT: attempt negative hp update rule
class NegativeHpCommand extends Command {
  static key = 'negHp';
  static params = z.object({ characterId: characterIdSchema });
  static rules = [
    class Validate extends class {} {
      static ruleName = 'Validate';
      static output = z.object({});
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      apply(_ctx: unknown) {
        return {};
      }
    },
    class ApplyBadPatch extends class {} {
      static ruleName = 'ApplyBadPatch';
      static after = ['Validate'];
      static output = z.object({});
      apply(ctx: unknown) {
        const c = ctx as RuleCtx<{ characterId: CharacterId }, Record<string, never>> & {
          store: {
            updateEntity: (
              t: 'character',
              id: CharacterId,
              patch: Record<string, unknown>
            ) => unknown;
          };
        };
        try {
          c.store.updateEntity('character', c.params.characterId, { hp: -20 });
        } catch (e) {
          return c.fail('STORE_CONSTRAINT', (e as Error).message);
        }
        return {};
      }
    },
  ];
}

// Command to trigger RULE_EXCEPTION by throwing inside a rule
class ThrowingCommand extends Command {
  static key = 'throwing';
  static params = z.object({});
  static rules = [
    class Boom extends class {} {
      static ruleName = 'Boom';
      static output = z.object({});
      apply() {
        throw new Error('boom');
      }
    },
  ];
}

describe('Errors: Additional cases', () => {
  it('CHARACTER_NOT_FOUND from gainExperience', async () => {
    resetRegisteredCommands();
    const { CreateCharacterCommand } = await import('../../osric/commands/createCharacter');
    const { GainExperienceCommand } = await import('../../osric/commands/gainExperience');
    registerCommand(CreateCharacterCommand as unknown as typeof Command);
    registerCommand(GainExperienceCommand as unknown as typeof Command);
    const engine = new Engine();
    await engine.start();
    const res = await engine.execute('gainExperience', {
      characterId: 'char_doesntex' as CharacterId,
      amount: 10,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe('CHARACTER_NOT_FOUND');
  });

  it('STORE_CONSTRAINT from invalid patch', async () => {
    resetRegisteredCommands();
    const { CreateCharacterCommand } = await import('../../osric/commands/createCharacter');
    registerCommand(CreateCharacterCommand as unknown as typeof Command);
    registerCommand(NegativeHpCommand);
    const engine = new Engine();
    await engine.start();
    // Access entities after start
    const { human, fighter } = engine.entities.character;
    const createRes = await engine.execute('createCharacter', {
      name: 'X',
      race: human,
      class: fighter,
    });
    if (!createRes.ok) throw new Error('setup failed');
    const id = createRes.data.characterId as string;
    const bad = await engine.execute('negHp', { characterId: id });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error.code).toBe('STORE_CONSTRAINT');
  });

  it('RULE_EXCEPTION caught from throwing rule', async () => {
    resetRegisteredCommands();
    registerCommand(ThrowingCommand);
    const engine = new Engine();
    await engine.start();
    const res = await engine.execute('throwing', {});
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe('RULE_EXCEPTION');
  });
});

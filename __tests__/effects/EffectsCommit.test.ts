import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { Command } from '../../osric/command/Command';
import { Rule } from '../../osric/command/Rule';
import { registerCommand, resetRegisteredCommands } from '../../osric/command/register';
import { Engine } from '../../osric/engine/Engine';
import { character } from '../../osric/entities/character';

describe('Effects commit phase', () => {
  it('collects and applies effects only after successful execution', async () => {
    resetRegisteredCommands();
    await import('../../osric/commands/createCharacter');
    await import('../../osric/commands/inspireParty');
    const engine = new Engine({ seed: 42 });
    await engine.start();
    // Create a character to act as leader
    const createRes = await engine.command.createCharacter({
      race: character.human,
      class: character.fighter,
      name: 'Hero',
    });
    if (!createRes.ok) throw new Error('failed to create character');
    type CreateCharacterResult = { characterId: string } & Record<string, unknown>;
    const leaderId = (createRes.data as CreateCharacterResult).characterId;
    expect(engine.events.effects.length).toBe(0);
    const res = await engine.execute('inspireParty', {
      leader: leaderId,
      bonus: 2,
      message: 'Forward!',
    });
    // Debug log if failing
    if (!res.ok) {
      // eslint-disable-next-line no-console
      console.error('inspireParty failure', res.error);
    }
    expect(res.ok).toBe(true);
    // Effects recorded after success
    expect(engine.events.effects.length).toBe(1);
    if (engine.events.effects.length) {
      const first = engine.events.effects[0];
      expect(first.effects[0].type).toBe('inspired');
    }
  });

  it('does not apply effects if a rule fails earlier', async () => {
    resetRegisteredCommands();
    class FailFirstRule extends Rule<Record<string, never>> {
      static ruleName = 'FailFirst';
      static output = z.object({});
      apply(): Record<string, never> {
        return { __fail: true, code: 'RULE_EXCEPTION', message: 'boom' } as unknown as Record<
          string,
          never
        >;
      }
    }
    class AddEffectRule extends Rule<{ y: number }> {
      static ruleName = 'AddEffect';
      static after = ['FailFirst'];
      static output = z.object({ y: z.number() });
      apply(ctx: unknown) {
        const c = ctx as { effects: { add: (t: string, target: string, p?: unknown) => void } };
        c.effects.add('test', 't1', { v: 1 });
        return { y: 1 };
      }
    }
    class FailCommand extends Command {
      static key = 'failCmd';
      static params = z.object({});
      static rules = [FailFirstRule, AddEffectRule];
    }
    registerCommand(FailCommand);
    const engine = new Engine();
    await engine.start();
    const res = await engine.execute('failCmd', {});
    expect(res.ok).toBe(false);
    expect(engine.events.effects.find((e) => e.command === 'failCmd')).toBeUndefined();
  });
});

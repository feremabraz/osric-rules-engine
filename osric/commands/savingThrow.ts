import { z } from 'zod';
import {
  type SavingThrowResult,
  type SavingThrowType,
  performSavingThrow,
} from '../combat/savingThrows';
import { Command } from '../command/Command';
import { Rule } from '../command/Rule';
import { registerCommand } from '../command/register';
import type { CharacterId } from '../store/ids';
import { characterIdSchema } from '../store/ids';

const params = z.object({
  characterId: characterIdSchema,
  type: z.enum(['death', 'wands', 'petrification', 'breath', 'spells']),
  modifiers: z.array(z.number()).optional(),
});

class ExecuteSavingThrowRule extends Rule<{ result: SavingThrowResult }> {
  static ruleName = 'Execute';
  static output = z.object({
    result: z.object({
      type: z.string(),
      characterId: z.string(),
      roll: z.number(),
      abilityMod: z.number(),
      modifiersTotal: z.number(),
      total: z.number(),
      target: z.number(),
      success: z.boolean(),
    }),
  });
  apply(ctx: unknown) {
    interface Ctx {
      params: { characterId: CharacterId; type: SavingThrowType; modifiers?: number[] };
      engine?: unknown;
      store: { getEntity: (t: 'character', id: CharacterId) => unknown };
      ok: (d: Record<string, unknown>) => unknown;
      fail: (c: 'CHARACTER_NOT_FOUND', m: string) => unknown;
    }
    const { params, ok, store, fail } = ctx as Ctx;
    const ch = store.getEntity('character', params.characterId);
    if (!ch)
      return fail('CHARACTER_NOT_FOUND', 'Character not found') as unknown as {
        result: SavingThrowResult;
      };
    // Access engine via closure not present; rely on performSavingThrow needing Engine, adapt by building minimal wrapper using global RNG? Instead cast ctx as has rng.
    const engineLike = ctx as unknown as {
      rng: { int: (a: number, b: number) => number };
      store: typeof store;
    };
    const engineObj = engineLike as unknown as import('../engine/Engine').Engine; // unsafe cast for internal utility
    const result = performSavingThrow(
      engineObj,
      params.characterId as CharacterId,
      params.type,
      params.modifiers ?? []
    );
    ok({ result } as unknown as Record<string, unknown>);
    return { result };
  }
}

export class SavingThrowCommand extends Command {
  static key = 'savingThrow';
  static params = params;
  static rules = [ExecuteSavingThrowRule];
}
registerCommand(SavingThrowCommand);

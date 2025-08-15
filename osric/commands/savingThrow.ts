import { z } from 'zod';
import {
  type SavingThrowResult,
  type SavingThrowType,
  performSavingThrow,
} from '../combat/savingThrows';
import type { Command } from '../command/Command';
import { Rule } from '../command/Rule';
import { defineCommand } from '../command/define';
import { registerCommand } from '../command/register';
import type { RuleCtx } from '../execution/context';
import { getCharacter } from '../store/entityHelpers';
import type { CharacterId } from '../store/ids';
import { characterIdSchema } from '../store/ids';

const params = z.object({
  characterId: characterIdSchema,
  type: z.enum(['death', 'wands', 'petrification', 'breath', 'spells']),
  modifiers: z.array(z.number()).optional(),
});
type Params = z.infer<typeof params>;

interface ExecuteOut extends Record<string, unknown> {
  result: SavingThrowResult;
}

class ExecuteSavingThrowRule extends Rule<ExecuteOut> {
  static ruleName = 'Execute';
  static output = z.object({
    result: z.object({
      type: z.string(),
      characterId: characterIdSchema,
      roll: z.number(),
      abilityMod: z.number(),
      modifiersTotal: z.number(),
      total: z.number(),
      target: z.number(),
      success: z.boolean(),
    }),
  });
  apply(ctx: unknown): ExecuteOut {
    const typed = ctx as RuleCtx<Params, Record<string, never>>;
    const ch = getCharacter(typed.store, typed.params.characterId as CharacterId);
    if (!ch)
      return typed.fail('CHARACTER_NOT_FOUND', 'Character not found') as unknown as ExecuteOut;
    // We only need rng + store – synthesize a minimal Engine-like shape for performSavingThrow contract.
    const engineLike = { store: { ...typed.store }, rng: typed.rng } as unknown as import(
      '../engine/Engine'
    ).Engine;
    const result = performSavingThrow(
      engineLike,
      typed.params.characterId as CharacterId,
      typed.params.type as SavingThrowType,
      typed.params.modifiers ?? []
    );
    return { result };
  }
}

export const SavingThrowCommand = defineCommand({
  key: 'savingThrow',
  params,
  rules: [ExecuteSavingThrowRule],
});
registerCommand(SavingThrowCommand as unknown as typeof Command);

import { z } from 'zod';
import type { Command } from '../command/Command';
import { Rule } from '../command/Rule';
import { defineCommand } from '../command/define';
import { registerCommand } from '../command/register';
import type { RuleCtx } from '../execution/context';
import { getCharacter } from '../store/entityHelpers';
import type { CharacterId } from '../store/ids';
import { characterIdSchema } from '../store/ids';

const params = z.object({
  leader: characterIdSchema,
  bonus: z.number().int().min(1).max(5).default(1),
  message: z.string().min(1).max(120),
});
type Params = z.infer<typeof params>;

// 1. ValidateLeader – ensure the leader character exists. Produces no accumulator keys.
class ValidateLeaderRule extends Rule<Record<string, never>> {
  static ruleName = 'ValidateLeader';
  static output = z.object({}); // empty output (no result keys contributed)
  apply(ctx: unknown) {
    const c = ctx as RuleCtx<Params, Record<string, never>>;
    const exists = getCharacter(c.store, c.params.leader as CharacterId);
    if (!exists)
      return c.fail('NO_LEADER', 'Leader character not found') as unknown as Record<string, never>;
    return {};
  }
}

// 2. CalcDuration – uses RNG to produce durationRounds in [3,6].
interface DurationOut extends Record<string, unknown> {
  durationRounds: number;
}
class CalcDurationRule extends Rule<DurationOut> {
  static ruleName = 'CalcDuration';
  static after = ['ValidateLeader'];
  static output = z.object({ durationRounds: z.number().int().min(3).max(6) });
  apply(ctx: unknown): DurationOut {
    const c = ctx as RuleCtx<Params, Record<string, never>>;
    const durationRounds = 3 + (c.rng?.int(0, 3) ?? 0); // 3-6 inclusive (fallback to 3 if no rng)
    return { durationRounds };
  }
}

// 3. ApplyInspiration – collects effect(s) and outputs affected list.
interface ApplyOut extends Record<string, unknown> {
  affected: CharacterId[];
}
class ApplyInspirationRule extends Rule<ApplyOut> {
  static ruleName = 'ApplyInspiration';
  static after = ['CalcDuration'];
  static output = z.object({
    affected: z.array(characterIdSchema),
  });
  apply(ctx: unknown): ApplyOut {
    const c = ctx as RuleCtx<Params, DurationOut> & {
      effects: { add: (t: string, target: CharacterId, payload?: unknown) => void };
    };
    const members: CharacterId[] = [c.params.leader];
    for (const m of members) {
      c.effects.add('inspired', m, {
        bonus: c.params.bonus,
        durationRounds: c.acc.durationRounds,
      });
    }
    return { affected: members };
  }
}

export const InspirePartyCommand = defineCommand({
  key: 'inspireParty',
  params,
  rules: [ValidateLeaderRule, CalcDurationRule, ApplyInspirationRule],
});
registerCommand(InspirePartyCommand as unknown as typeof Command);

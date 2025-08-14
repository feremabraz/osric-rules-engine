import { z } from 'zod';
import type { Command } from '../command/Command';
import { Rule } from '../command/Rule';
import { defineCommand } from '../command/define';
import { registerCommand } from '../command/register';
import { getCharacter } from '../store/entityHelpers';
import type { CharacterId } from '../store/ids';
import { characterIdSchema } from '../store/ids';

// Phase 04: Full inspireParty command (Blueprint Section 15)
// Demonstrates: multi‑rule validation + RNG derived duration + effect emission + aggregated result typing.

// Params: leader (CharacterId-like string), bonus (1-5, default 1), message (1-120 chars)
// We refine leader format rather than importing brand validator (runtime only needs prefix check).
const params = z.object({
  leader: characterIdSchema,
  bonus: z.number().int().min(1).max(5).default(1),
  message: z.string().min(1).max(120),
});

// 1. ValidateLeader – ensure the leader character exists. Produces no accumulator keys.
class ValidateLeaderRule extends Rule<Record<string, never>> {
  static ruleName = 'ValidateLeader';
  static output = z.object({}); // empty output (no result keys contributed)
  apply(ctx: unknown) {
    interface LocalCtx {
      params: { leader: CharacterId };
      store: { getEntity: (type: 'character', id: CharacterId) => Record<string, unknown> | null };
      fail: (code: 'NO_LEADER', msg: string) => Record<string, unknown>;
      ok: (d: Record<string, unknown>) => Record<string, unknown>;
    }
    const c = ctx as LocalCtx;
    const exists = getCharacter(
      c.store as unknown as import('../store/storeFacade').StoreFacade,
      c.params.leader as CharacterId
    );
    if (!exists) {
      return c.fail('NO_LEADER', 'Leader character not found') as unknown as Record<string, never>;
    }
    // No accumulator contribution; return empty object so validation passes.
    c.ok({});
    return {};
  }
}

// 2. CalcDuration – uses RNG to produce durationRounds in [3,6].
class CalcDurationRule extends Rule<{ durationRounds: number }> {
  static ruleName = 'CalcDuration';
  static after = ['ValidateLeader'];
  static output = z.object({ durationRounds: z.number().int().min(3).max(6) });
  apply(ctx: unknown) {
    interface LocalCtx {
      rng: { int: (min: number, max: number) => number };
      ok: (d: Record<string, unknown>) => Record<string, unknown>;
    }
    const c = ctx as LocalCtx;
    const durationRounds = 3 + c.rng.int(0, 3); // 3-6 inclusive
    c.ok({ durationRounds });
    return { durationRounds };
  }
}

// 3. ApplyInspiration – collects effect(s) and outputs affected list.
class ApplyInspirationRule extends Rule<{ affected: CharacterId[] }> {
  static ruleName = 'ApplyInspiration';
  static after = ['CalcDuration'];
  static output = z.object({
    affected: z.array(characterIdSchema),
  });
  apply(ctx: unknown) {
    interface LocalCtx {
      params: { leader: CharacterId; bonus: number };
      acc: { durationRounds: number };
      effects: { add: (type: string, target: CharacterId, payload?: unknown) => void };
      ok: (d: Record<string, unknown>) => Record<string, unknown>;
    }
    const c = ctx as LocalCtx;
    // Stub party resolution: only leader for now. Future: include party members.
    const members: CharacterId[] = [c.params.leader];
    for (const m of members) {
      c.effects.add('inspired', m, {
        bonus: c.params.bonus,
        durationRounds: c.acc.durationRounds,
      });
    }
    c.ok({ affected: members });
    return { affected: members };
  }
}

// Refactored to use defineCommand sugar (Phase 06 Item 12 exemplar migration)
export const InspirePartyCommand = defineCommand({
  key: 'inspireParty',
  params,
  rules: [ValidateLeaderRule, CalcDurationRule, ApplyInspirationRule],
});
registerCommand(InspirePartyCommand as unknown as typeof Command);

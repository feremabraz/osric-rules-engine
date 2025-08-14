import { z } from 'zod';
import { computeInitiativeBase } from '../combat/initiative';
import { performMoraleCheck } from '../combat/morale';
import { Command } from '../command/Command';
import { Rule } from '../command/Rule';
import { registerCommand } from '../command/register';
import type { Character } from '../entities/character';
import type { BattleState } from '../store/storeFacade';
import { ROUND_SECONDS } from '../types/temporal';

const params = z.object({ battleId: z.string(), rerollAtNewRound: z.boolean().optional() });

class LoadBattleRule extends Rule<{ battle: BattleState }> {
  static ruleName = 'LoadBattle';
  static output = z.object({ battle: z.any() });
  apply(ctx: unknown) {
    interface Ctx {
      params: { battleId: string };
      store: { getBattle: (id: string) => BattleState | null };
      fail: (c: 'BATTLE_NOT_FOUND', m: string) => unknown;
      ok: (d: Record<string, unknown>) => unknown;
    }
    const { params, store, fail, ok } = ctx as Ctx;
    const battle = store.getBattle(params.battleId);
    if (!battle)
      return fail('BATTLE_NOT_FOUND', `Battle ${params.battleId} not found`) as unknown as {
        battle: BattleState;
      };
    ok({ battle } as unknown as Record<string, unknown>);
    return { battle };
  }
}

class AdvanceRule extends Rule<{ activeCombatant: string; round: number; timeSeconds: number }> {
  static ruleName = 'Advance';
  static after = ['LoadBattle'];
  static output = z.object({
    activeCombatant: z.string(),
    round: z.number().int(),
    timeSeconds: z.number().int(),
  });
  apply(ctx: unknown) {
    interface Ctx {
      params: { rerollAtNewRound?: boolean };
      acc: { battle: BattleState };
      store: {
        updateBattle: (id: string, patch: Partial<BattleState>) => BattleState;
        getEntity: (t: 'character', id: string) => Character | null;
      };
      rng: { int: (a: number, b: number) => number; getState: () => number };
      effects: { add: (type: string, target: string, payload?: unknown) => void };
    }
    const { acc, params, store, rng, effects } = ctx as Ctx;
    let battle = acc.battle;
    let nextIndex = battle.activeIndex + 1;
    let round = battle.round;
    let timeSeconds = battle.timeSeconds;
    let order = battle.order;
    let rollsLog = battle.rollsLog;
    const wrapped = nextIndex >= order.length;
    if (wrapped) {
      // wrap
      nextIndex = 0;
      round += 1;
      timeSeconds += ROUND_SECONDS;
      if (params.rerollAtNewRound) {
        // Re-roll initiative
        const newOrder: { id: string; rolled: number }[] = [];
        for (const entry of order) {
          const ch = store.getEntity('character', entry.id) as Character | null;
          const base = ch ? computeInitiativeBase(ch) : 0;
          const die = rng.int(1, 6);
          const rolled = die + base;
          newOrder.push({ id: entry.id, rolled });
          if (battle.recordRolls) {
            const stateVal = rng.getState();
            rollsLog = (rollsLog ?? []).concat({ type: 'init', value: die, state: stateVal });
          }
        }
        newOrder.sort((a, b) => b.rolled - a.rolled || a.id.localeCompare(b.id));
        order = newOrder.map((o) => ({
          id: o.id as unknown as import('../store/ids').CharacterId,
          rolled: o.rolled,
        }));
      }
      // Scheduled morale checks at start of new round
      interface CharacterLike {
        id: string;
        moraleRating?: number;
        status?: { dead?: boolean; moraleState?: string; nextMoraleCheckRound?: number };
      }
      for (const entry of order) {
        const ch = store.getEntity('character', entry.id) as CharacterLike | null;
        if (!ch || ch.status?.dead) continue;
        const status = ch.status || {};
        const moraleRating = ch.moraleRating;
        if (!moraleRating) continue;
        const dueRound: number | undefined = status.nextMoraleCheckRound;
        if (dueRound !== undefined && dueRound <= round) {
          try {
            const res = performMoraleCheck(
              ch as Character,
              { trigger: 'scheduled' },
              { int: (a: number, b: number) => rng.int(a, b) }
            );
            effects.add('moraleCheck', ch.id, res);
            // Append to battle effectsLog (will add after updateBattle call below by accumulating local log)
            const existingBattle = battle;
            const currentEffects = existingBattle.effectsLog ?? [];
            const newEffects = currentEffects.concat({
              round,
              type: 'moraleCheck',
              target: ch.id,
              payload: res,
            });
            battle = { ...existingBattle, effectsLog: newEffects, log: newEffects } as BattleState;
            const prevState = status.moraleState ?? 'hold';
            if (res.outcome !== prevState)
              effects.add('moraleStateChanged', ch.id, { from: prevState, to: res.outcome });
            const nextRound = res.nextCheckInRounds ? round + res.nextCheckInRounds : undefined;
            // persist character status update via store.updateBattle? (character entity needs updateEntity; cast store)
            try {
              (
                store as unknown as {
                  updateEntity: (
                    t: 'character',
                    id: string,
                    patch: { status: CharacterLike['status'] }
                  ) => unknown;
                }
              ).updateEntity('character', ch.id, {
                status: { ...status, moraleState: res.outcome, nextMoraleCheckRound: nextRound },
              });
            } catch {
              /* ignore */
            }
            if (battle.recordRolls) {
              const stateVal = rng.getState();
              rollsLog = (rollsLog ?? []).concat({
                type: 'morale',
                value: res.raw,
                state: stateVal,
              });
            }
          } catch {
            /* suppress individual morale errors */
          }
        }
      }
    }
    battle = store.updateBattle(battle.id, {
      activeIndex: nextIndex,
      round,
      timeSeconds,
      order,
      rollsLog,
      effectsLog: battle.effectsLog,
      log: battle.log,
    });
    return {
      activeCombatant: battle.order[battle.activeIndex].id,
      round: battle.round,
      timeSeconds: battle.timeSeconds,
    };
  }
}

export class NextTurnCommand extends Command {
  static key = 'nextTurn';
  static params = params;
  static rules = [LoadBattleRule, AdvanceRule];
}
registerCommand(NextTurnCommand);

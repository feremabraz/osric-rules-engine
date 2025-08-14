import { z } from 'zod';
import { computeInitiativeBase } from '../combat/initiative';
import { Command } from '../command/Command';
import { Rule } from '../command/Rule';
import { registerCommand } from '../command/register';
import type { Character } from '../entities/character';
import type { CharacterId } from '../store/ids';
import type { BattleState } from '../store/storeFacade';
import { ROUND_SECONDS } from '../types/temporal';

const params = z.object({
  participants: z.array(z.string().regex(/^char_/)).min(1),
  recordRolls: z.boolean().optional(),
});

class ValidateParticipantsRule extends Rule<{ participants: CharacterId[] }> {
  static ruleName = 'ValidateParticipants';
  static output = z.object({ participants: z.array(z.string()) });
  apply(ctx: unknown): { participants: CharacterId[] } {
    interface Ctx {
      params: { participants: CharacterId[] };
      store: { getEntity: (t: 'character', id: CharacterId) => { hp: number } | null };
      fail: (code: string, msg: string) => unknown;
      ok: (d: Record<string, unknown>) => unknown;
    }
    const { params, store, fail, ok } = ctx as Ctx;
    const list: CharacterId[] = [];
    for (const pid of params.participants as CharacterId[]) {
      const ch = store.getEntity('character', pid as CharacterId);
      if (!ch) {
        fail('CHARACTER_NOT_FOUND', `Participant ${pid} missing`);
        return { participants: list };
      }
      if (ch.hp <= 0) {
        fail('RULE_EXCEPTION', `Participant ${pid} not alive`);
        return { participants: list };
      }
      list.push(pid as CharacterId);
    }
    ok({ participants: list });
    return { participants: list };
  }
}

class RollInitiativeRule extends Rule<{
  initiativeOrder: { id: CharacterId; rolled: number }[];
  rollsLog?: { type: 'init'; value: number; state: number }[];
  initiativeEffects?: { id: CharacterId; rolled: number }[];
}> {
  static ruleName = 'RollInitiative';
  static after = ['ValidateParticipants'];
  static output = z.object({
    initiativeOrder: z.array(z.object({ id: z.string(), rolled: z.number().int() })),
    rollsLog: z
      .array(
        z.object({ type: z.literal('init'), value: z.number().int(), state: z.number().int() })
      )
      .optional(),
    initiativeEffects: z.array(z.object({ id: z.string(), rolled: z.number().int() })).optional(),
  });
  apply(ctx: unknown) {
    interface Ctx {
      acc: {
        participants: CharacterId[];
        rollsLog?: { type: 'init'; value: number; state: number }[];
      };
      rng: { int: (a: number, b: number) => number; getState: () => number };
      store: {
        getEntity: (
          t: 'character',
          id: CharacterId
        ) => {
          ability: { dex: number; str: number };
          stats: { initiative: { base: number } };
        } | null;
      };
      ok: (d: Record<string, unknown>) => unknown;
      params: { recordRolls?: boolean };
    }
    const { acc, rng, store, ok, params } = ctx as Ctx;
    const initiativeOrder: { id: CharacterId; rolled: number }[] = [];
    for (const id of acc.participants as CharacterId[]) {
      const ch = store.getEntity('character', id);
      const base = ch ? computeInitiativeBase(ch as Character) : 0;
      const die = rng.int(1, 6); // d6 variant
      const rolled = die + base;
      initiativeOrder.push({ id, rolled });
      if (params.recordRolls) {
        const stateVal = rng.getState();
        acc.rollsLog = (acc.rollsLog ?? []).concat({ type: 'init', value: die, state: stateVal });
      }
    }
    initiativeOrder.sort((a, b) => b.rolled - a.rolled || a.id.localeCompare(b.id));
    const delta: {
      initiativeOrder: { id: CharacterId; rolled: number }[];
      rollsLog?: { type: 'init'; value: number; state: number }[];
      initiativeEffects?: { id: CharacterId; rolled: number }[];
    } = { initiativeOrder, rollsLog: acc.rollsLog, initiativeEffects: initiativeOrder };
    ok(delta as unknown as Record<string, unknown>);
    return delta;
  }
}

class PersistBattleRule extends Rule<{ battle: BattleState }> {
  static ruleName = 'PersistBattle';
  static after = ['RollInitiative'];
  static output = z.object({ battle: z.any() });
  apply(ctx: unknown) {
    interface Ctx {
      acc: {
        initiativeOrder: { id: CharacterId; rolled: number }[];
        rollsLog?: { type: 'init'; value: number; state: number }[];
        initiativeEffects?: { id: CharacterId; rolled: number }[];
      };
      store: { setBattle: (b: BattleState) => string };
      params: { recordRolls?: boolean };
      ok: (d: Record<string, unknown>) => unknown;
    }
    const { acc, store, params, ok } = ctx as Ctx;
    const id = `battle_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const battle: BattleState = {
      id,
      round: 1,
      timeSeconds: 0,
      order: acc.initiativeOrder,
      activeIndex: 0,
      recordRolls: params.recordRolls,
      rollsLog: acc.rollsLog,
      effectsLog: acc.initiativeEffects?.map((e) => ({
        round: 1,
        type: 'initiative',
        target: e.id,
        payload: { rolled: e.rolled },
      })),
      log: acc.initiativeEffects?.map((e) => ({
        round: 1,
        type: 'initiative',
        target: e.id,
        payload: { rolled: e.rolled },
      })),
    };
    store.setBattle(battle);
    ok({ battle });
    return { battle };
  }
}

class ResultShapeRule extends Rule<{
  battleId: string;
  order: { id: CharacterId; rolled: number }[];
}> {
  static ruleName = 'ResultShape';
  static after = ['PersistBattle'];
  static output = z.object({
    battleId: z.string(),
    order: z.array(z.object({ id: z.string(), rolled: z.number().int() })),
  });
  apply(ctx: unknown) {
    interface Ctx {
      acc: { battle: BattleState };
      ok: (d: Record<string, unknown>) => unknown;
    }
    const { acc, ok } = ctx as Ctx;
    const res = { battleId: acc.battle.id, order: acc.battle.order };
    ok(res as unknown as Record<string, unknown>);
    return res;
  }
}

export class StartBattleCommand extends Command {
  static key = 'startBattle';
  static params = params;
  static rules = [ValidateParticipantsRule, RollInitiativeRule, PersistBattleRule, ResultShapeRule];
}
registerCommand(StartBattleCommand);

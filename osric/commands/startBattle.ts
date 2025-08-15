import { z } from 'zod';
import { computeInitiativeBase } from '../combat/initiative';
import type { Command } from '../command/Command';
import { Rule } from '../command/Rule';
import { defineCommand } from '../command/define';
import { registerCommand } from '../command/register';
import type { Character } from '../entities/character';
import type { RuleCtx } from '../execution/context';
import { getCharacter, requireCharacter } from '../store/entityHelpers';
import type { BattleId, CharacterId } from '../store/ids';
import { createBattleId } from '../store/ids';
import { battleIdSchema, characterIdSchema } from '../store/ids';
import type { BattleState } from '../store/storeFacade';

const params = z.object({
  participants: z.array(characterIdSchema).min(1),
  recordRolls: z.boolean().optional(),
});
type Params = z.infer<typeof params>;

class ValidateParticipantsRule extends Rule<{ participants: CharacterId[] }> {
  static ruleName = 'ValidateParticipants';
  static output = z.object({ participants: z.array(z.string()) });
  apply(ctx: unknown): { participants: CharacterId[] } {
    const c = ctx as RuleCtx<Params, Record<string, never>> & {
      store: { getEntity: (t: 'character', id: CharacterId) => { hp: number } | null };
      fail: (code: string, msg: string) => unknown;
    };
    const list: CharacterId[] = [];
    for (const pid of c.params.participants as CharacterId[]) {
      const ch = getCharacter(
        c.store as unknown as import('../store/storeFacade').StoreFacade,
        pid as CharacterId
      );
      if (!ch)
        return c.fail('CHARACTER_NOT_FOUND', `Participant ${pid} missing`) as unknown as {
          participants: CharacterId[];
        };
      if ((ch as unknown as { hp: number }).hp <= 0)
        return c.fail('RULE_EXCEPTION', `Participant ${pid} not alive`) as unknown as {
          participants: CharacterId[];
        };
      list.push(pid as CharacterId);
    }
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
    initiativeOrder: z.array(z.object({ id: characterIdSchema, rolled: z.number().int() })),
    rollsLog: z
      .array(
        z.object({ type: z.literal('init'), value: z.number().int(), state: z.number().int() })
      )
      .optional(),
    initiativeEffects: z.array(z.object({ id: z.string(), rolled: z.number().int() })).optional(),
  });
  apply(ctx: unknown) {
    const { acc, rng, store, params } = ctx as RuleCtx<
      Params,
      { participants: CharacterId[]; rollsLog?: { type: 'init'; value: number; state: number }[] }
    > & {
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
    };
    const initiativeOrder: { id: CharacterId; rolled: number }[] = [];
    for (const id of acc.participants as CharacterId[]) {
      const ch = getCharacter(store as unknown as import('../store/storeFacade').StoreFacade, id);
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
    return delta;
  }
}

class PersistBattleRule extends Rule<{ battle: BattleState }> {
  static ruleName = 'PersistBattle';
  static after = ['RollInitiative'];
  static output = z.object({
    battle: z.object({
      id: battleIdSchema,
      round: z.number().int(),
      timeSeconds: z.number().int(),
      order: z.array(z.object({ id: characterIdSchema, rolled: z.number().int() })),
      activeIndex: z.number().int(),
      recordRolls: z.boolean().optional(),
      rollsLog: z
        .array(
          z.object({ type: z.literal('init'), value: z.number().int(), state: z.number().int() })
        )
        .optional(),
      effectsLog: z
        .array(
          z.object({
            round: z.number().int(),
            type: z.string(),
            target: z.string(),
            payload: z.any().optional(),
          })
        )
        .optional(),
    }),
  });
  apply(ctx: unknown) {
    const { acc, store, params } = ctx as RuleCtx<
      Params,
      {
        initiativeOrder: { id: CharacterId; rolled: number }[];
        rollsLog?: { type: 'init'; value: number; state: number }[];
        initiativeEffects?: { id: CharacterId; rolled: number }[];
      }
    > & { store: { setBattle: (b: BattleState) => string } };
    const id = createBattleId();
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
    };
    store.setBattle(battle);
    return { battle };
  }
}

class ResultShapeRule extends Rule<{
  battleId: BattleId;
  order: { id: CharacterId; rolled: number }[];
}> {
  static ruleName = 'ResultShape';
  static after = ['PersistBattle'];
  static output = z.object({
    battleId: battleIdSchema,
    order: z.array(z.object({ id: z.string(), rolled: z.number().int() })),
  });
  apply(ctx: unknown) {
    const c = ctx as RuleCtx<Params, { battle: BattleState }>;
    return { battleId: c.acc.battle.id as BattleId, order: c.acc.battle.order };
  }
}

export const StartBattleCommand = defineCommand({
  key: 'startBattle',
  params,
  rules: [ValidateParticipantsRule, RollInitiativeRule, PersistBattleRule, ResultShapeRule],
});
registerCommand(StartBattleCommand as unknown as typeof Command);

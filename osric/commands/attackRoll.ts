import { z } from 'zod';
import type { Command } from '../command/Command';
import { Rule } from '../command/Rule';
import { defineCommand } from '../command/define';
import { registerCommand } from '../command/register';
import { abilityMod } from '../entities/ability';
import { item } from '../entities/item';
import type { RuleCtx } from '../execution/context';
import type { CharacterId, ItemId } from '../store/ids';
import { battleIdSchema, characterIdSchema, itemIdSchema } from '../store/ids';

const params = z.object({
  attacker: characterIdSchema.optional(),
  target: characterIdSchema,
  battleId: battleIdSchema.optional(),
  weaponId: itemIdSchema.optional(), // placeholder until item entity linking
});
type Params = z.infer<typeof params>;

interface AttackContextAccumulator extends Record<string, unknown> {
  attacker: {
    id: CharacterId;
    str: number;
    dex: number;
    baseAttack: number;
    weapon: {
      key: string;
      damage: { dice: string; bonus: number };
      finesse?: boolean;
      attackBonus?: number;
      weaponVsArmor?: Record<string, number>;
    };
  };
  target: {
    id: CharacterId;
    dex: number;
    armor: { armorClassBase: number; key: string; armorTypeKey?: string };
  };
  d20: number;
  natural: number;
  attackTotal: number;
  targetAC: number;
  hit: boolean;
  armorAdjustmentApplied?: number;
  critical?: boolean;
  fumble?: boolean;
}

class ValidateEntitiesRule extends Rule<{
  attacker: AttackContextAccumulator['attacker'];
  target: AttackContextAccumulator['target'];
}> {
  static ruleName = 'ValidateEntities';
  static output = z.object({
    attacker: z.object({
      id: z.string(),
      str: z.number().int(),
      dex: z.number().int(),
      baseAttack: z.number().int(),
      weapon: z.any(),
    }),
    target: z.object({
      id: z.string(),
      dex: z.number().int(),
      armor: z.object({
        key: z.string(),
        armorClassBase: z.number().int(),
        armorTypeKey: z.string().optional(),
      }),
    }),
  });
  apply(ctx: unknown) {
    const c = ctx as RuleCtx<Params, Record<string, never>> & {
      store: {
        getEntity: (
          t: 'character',
          id: CharacterId
        ) => {
          id: CharacterId;
          ability: { str: number; dex: number };
          stats: {
            baseAttack: number;
            initiative: { base: number };
            movement: { speedMps: number };
          };
          equipped: { weapon?: string; armor?: string };
        } | null;
        getBattle: (id: import('../store/ids').BattleId) => {
          order: { id: CharacterId }[];
          activeIndex: number;
          recordRolls?: boolean;
          rollsLog?: { type: 'init' | 'attack' | 'damage'; value: number; state: number }[];
        } | null;
        updateBattle: (
          id: import('../store/ids').BattleId,
          patch: Record<string, unknown>
        ) => unknown;
      };
      rng: { getState: () => number };
      fail: (
        code: 'CHARACTER_NOT_FOUND' | 'TARGET_NOT_FOUND' | 'BATTLE_NOT_FOUND',
        msg: string
      ) => Record<string, unknown>;
    };
    let attackerId = c.params.attacker as CharacterId | undefined;
    if (!attackerId && c.params.battleId) {
      const battle = c.store.getBattle(c.params.battleId);
      if (!battle)
        return c.fail('BATTLE_NOT_FOUND', 'Battle not found') as unknown as {
          attacker: AttackContextAccumulator['attacker'];
          target: AttackContextAccumulator['target'];
        };
      attackerId = battle.order[battle.activeIndex].id;
    }
    const attacker = attackerId ? c.store.getEntity('character', attackerId) : null;
    if (!attacker)
      return c.fail('CHARACTER_NOT_FOUND', 'Attacker not found') as unknown as {
        attacker: AttackContextAccumulator['attacker'];
        target: AttackContextAccumulator['target'];
      };
    const target = c.store.getEntity('character', c.params.target as CharacterId);
    if (!target)
      return c.fail('TARGET_NOT_FOUND', 'Target not found') as unknown as {
        attacker: AttackContextAccumulator['attacker'];
        target: AttackContextAccumulator['target'];
      };
    // Resolve weapon meta
    let weaponMeta = item.weapons.unarmed;
    if (attacker.equipped.weapon) {
      const wKey = attacker.equipped.weapon as keyof typeof item.weapons;
      weaponMeta = item.weapons[wKey] ?? weaponMeta;
    }
    const targetArmorKey = (target.equipped.armor ?? 'none') as keyof typeof item.armors;
    const data = {
      attacker: {
        id: attacker.id,
        str: attacker.ability.str,
        dex: attacker.ability.dex,
        baseAttack: attacker.stats.baseAttack,
        weapon: weaponMeta,
      },
      target: {
        id: target.id,
        dex: target.ability.dex,
        armor: {
          key: targetArmorKey,
          armorClassBase: item.armors[targetArmorKey]?.armorClassBase ?? 0,
          armorTypeKey: item.armors[targetArmorKey]?.armorTypeKey,
        },
      },
    };
    return data as unknown as {
      attacker: AttackContextAccumulator['attacker'];
      target: AttackContextAccumulator['target'];
    };
  }
}

class ComputeAttackRule extends Rule<{
  d20: number;
  natural: number;
  attackTotal: number;
  targetAC: number;
  hit: boolean;
  armorAdjustmentApplied?: number;
  weapon?: { key: string; damage: { dice: string; bonus: number } };
  critical?: boolean;
  fumble?: boolean;
  criticalMultiplier?: number;
}> {
  static ruleName = 'ComputeAttack';
  static after = ['ValidateEntities'];
  static output = z.object({
    d20: z.number().int(),
    natural: z.number().int(),
    attackTotal: z.number().int(),
    targetAC: z.number().int(),
    hit: z.boolean(),
    armorAdjustmentApplied: z.number().int().optional(),
    weapon: z.any().optional(),
    critical: z.boolean().optional(),
    fumble: z.boolean().optional(),
    criticalMultiplier: z.number().int().optional(),
  });
  apply(ctx: unknown) {
    const c = ctx as RuleCtx<Params, AttackContextAccumulator> & {
      rng: { int: (min: number, max: number) => number; getState: () => number };
      params: { battleId?: string };
      store: {
        getBattle?: (id: string) => {
          recordRolls?: boolean;
          rollsLog?: {
            type: 'init' | 'attack' | 'damage' | 'morale';
            value: number;
            state: number;
          }[];
          effectsLog?: { round: number; type: string; target: string; payload?: unknown }[];
          round?: number;
        } | null;
        updateBattle?: (id: string, patch: Record<string, unknown>) => unknown;
      };
    };
    const { attacker, target } = c.acc;
    const strMod = abilityMod(attacker.str);
    const dexMod = abilityMod(attacker.dex);
    const useDex = attacker.weapon.finesse === true && dexMod > strMod;
    const abilityBonus = useDex ? dexMod : strMod;
    const natural = c.rng.int(1, 20);
    const d20 = natural;
    // Ascending AC: 10 + armor + dexMod (target)
    const targetDexMod = abilityMod(target.dex);
    const targetAC = 10 + target.armor.armorClassBase + targetDexMod;
    // Weapon vs armor adjustment
    let armorAdjustmentApplied = 0;
    const armorType = target.armor.armorTypeKey ?? target.armor.key;
    if (attacker.weapon.weaponVsArmor && armorType in attacker.weapon.weaponVsArmor) {
      armorAdjustmentApplied = attacker.weapon.weaponVsArmor[armorType] ?? 0;
    }
    const attackTotal =
      d20 +
      attacker.baseAttack +
      abilityBonus +
      (attacker.weapon.attackBonus ?? 0) +
      armorAdjustmentApplied;
    const critical = natural === 20;
    const fumble = natural === 1;
    const autoHit = critical;
    const autoMiss = fumble;
    const hit = attackTotal >= targetAC;
    const finalHit = autoHit ? true : autoMiss ? false : hit;
    const delta = {
      d20,
      natural,
      attackTotal,
      targetAC,
      hit: finalHit,
      armorAdjustmentApplied: armorAdjustmentApplied || undefined,
      weapon: attacker.weapon,
      critical: critical || undefined,
      fumble: fumble || undefined,
      criticalMultiplier: critical ? 2 : undefined,
    };
    // Battle logging
    const battleId = c.params.battleId as import('../store/ids').BattleId | undefined;
    if (battleId && c.store.getBattle) {
      const battle = c.store.getBattle(battleId);
      if (battle && c.store.updateBattle) {
        const patch: Record<string, unknown> = {};
        if (battle.recordRolls) {
          const stateVal = c.rng.getState();
          const rollsLog = (battle.rollsLog ?? []).concat({
            type: 'attack',
            value: natural,
            state: stateVal,
          });
          patch.rollsLog = rollsLog;
        }
        const currentRound = typeof battle.round === 'number' ? battle.round : 0;
        const effectsLog = (battle.effectsLog ?? []).concat({
          round: currentRound,
          type: 'attackRoll',
          target: target.id,
          payload: { natural, attackTotal, targetAC, hit: finalHit, critical, fumble },
        });
        patch.effectsLog = effectsLog;
        c.store.updateBattle(battleId, patch);
      }
    }
    return delta;
  }
}

export const AttackRollCommand = defineCommand({
  key: 'attackRoll',
  params,
  rules: [ValidateEntitiesRule, ComputeAttackRule],
});
registerCommand(AttackRollCommand as unknown as typeof Command);

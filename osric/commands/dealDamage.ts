import { z } from 'zod';
import { type MoraleContext, performMoraleCheck } from '../combat/morale';
import { Command } from '../command/Command';
import { Rule } from '../command/Rule';
import { registerCommand } from '../command/register';
import { abilityMod } from '../entities/ability';
import { item } from '../entities/item';
import type { CharacterId, ItemId } from '../store/ids';

const params = z.object({
  source: z.string().regex(/^char_/),
  target: z.string().regex(/^char_/),
  battleId: z.string().optional(),
  weaponId: z.string().optional(),
  attackContext: z
    .object({
      natural: z.number().int().min(1).max(20).optional(),
      hit: z.boolean().optional(),
      critical: z.boolean().optional(),
      criticalMultiplier: z.number().int().min(2).max(4).optional(),
    })
    .partial()
    .optional(),
});

interface DamageAcc {
  source: {
    id: CharacterId;
    str: number;
    weapon: { key: string; damage: { dice: string; bonus: number } };
  };
  target: { id: CharacterId; hp: number };
  damage: number;
  targetRemainingHp: number;
  targetStatus: 'alive' | 'dead';
}

function rollDamageDie(dice: string, rng: { int: (a: number, b: number) => number }): number {
  switch (dice) {
    case 'd2':
      return rng.int(1, 2);
    case 'd4':
      return rng.int(1, 4);
    case 'd6':
      return rng.int(1, 6);
    case 'd8':
      return rng.int(1, 8);
    default:
      return 1;
  }
}

class ValidateEntitiesRule extends Rule<{
  source: DamageAcc['source'];
  target: DamageAcc['target'];
}> {
  static ruleName = 'ValidateEntities';
  static output = z.object({ source: z.any(), target: z.any() });
  apply(ctx: unknown) {
    interface LocalCtx {
      params: {
        source: CharacterId;
        target: CharacterId;
        weaponId?: ItemId;
        battleId?: string;
        attackContext?: { hit?: boolean };
      };
      store: {
        getEntity: (
          type: 'character',
          id: CharacterId
        ) => {
          id: CharacterId;
          hp: number;
          ability: { str: number };
          equipped: { weapon?: string };
        } | null;
        getBattle?: (id: string) => {
          recordRolls?: boolean;
          rollsLog?: {
            type: 'init' | 'attack' | 'damage' | 'morale';
            value: number;
            state: number;
          }[];
        } | null;
        updateBattle?: (id: string, patch: Record<string, unknown>) => unknown;
      };
      fail: (
        code: 'CHARACTER_NOT_FOUND' | 'TARGET_NOT_FOUND' | 'ATTACK_NOT_HIT',
        msg: string
      ) => Record<string, unknown>;
      ok: (d: Record<string, unknown>) => Record<string, unknown>;
    }
    const c = ctx as LocalCtx;
    const source = c.store.getEntity('character', c.params.source as CharacterId);
    if (!source)
      return c.fail('CHARACTER_NOT_FOUND', 'Source not found') as unknown as {
        source: DamageAcc['source'];
        target: DamageAcc['target'];
      };
    const target = c.store.getEntity('character', c.params.target as CharacterId);
    if (!target)
      return c.fail('TARGET_NOT_FOUND', 'Target not found') as unknown as {
        source: DamageAcc['source'];
        target: DamageAcc['target'];
      };
    if (c.params.attackContext && c.params.attackContext.hit === false) {
      return c.fail('ATTACK_NOT_HIT', 'Cannot apply damage: attack missed') as unknown as {
        source: DamageAcc['source'];
        target: DamageAcc['target'];
      };
    }
    let weaponMeta = item.weapons.unarmed;
    if (source.equipped.weapon) {
      const wKey = source.equipped.weapon as keyof typeof item.weapons;
      weaponMeta = item.weapons[wKey] ?? weaponMeta;
    }
    const data = {
      source: { id: source.id, str: source.ability.str, weapon: weaponMeta },
      target: { id: target.id, hp: target.hp },
    };
    c.ok(data as unknown as Record<string, unknown>);
    return data as { source: DamageAcc['source']; target: DamageAcc['target'] };
  }
}

class ComputeDamageRule extends Rule<{
  damage: number;
  targetRemainingHp: number;
  targetStatus: 'alive' | 'dead';
}> {
  static ruleName = 'ComputeDamage';
  static after = ['ValidateEntities'];
  static output = z.object({
    damage: z.number().int().min(1),
    targetRemainingHp: z.number().int().min(-10),
    targetStatus: z.enum(['alive', 'dead']),
  });
  apply(ctx: unknown) {
    interface LocalCtx {
      acc: DamageAcc & { source: DamageAcc['source']; target: DamageAcc['target'] };
      rng: { int: (a: number, b: number) => number; getState: () => number };
      store: {
        updateEntity: (
          type: 'character',
          id: CharacterId,
          patch: Record<string, unknown>
        ) => { hp: number };
        getBattle?: (id: string) => {
          recordRolls?: boolean;
          rollsLog?: {
            type: 'init' | 'attack' | 'damage' | 'morale';
            value: number;
            state: number;
          }[];
        } | null;
        updateBattle?: (id: string, patch: Record<string, unknown>) => unknown;
      };
      effects: { add: (type: string, target: CharacterId, payload?: unknown) => void };
      ok: (d: Record<string, unknown>) => Record<string, unknown>;
      params: { battleId?: string };
    }
    const c = ctx as LocalCtx;
    const { source, target } = c.acc;
    const strMod = abilityMod(source.str);
    // Support critical: double dice count (not modifiers) when attackContext.critical supplied via params
    let diceTotal = rollDamageDie(source.weapon.damage.dice, c.rng);
    const attackCtx = (
      c as unknown as {
        params?: {
          attackContext?: {
            natural?: number;
            hit?: boolean;
            critical?: boolean;
            criticalMultiplier?: number;
          };
        };
      }
    ).params?.attackContext;
    const isCritical = attackCtx?.critical === true;
    const critMult =
      attackCtx?.criticalMultiplier && attackCtx.criticalMultiplier > 1
        ? attackCtx.criticalMultiplier
        : 2;
    if (isCritical) {
      // Roll additional (critMult - 1) dice
      for (let i = 1; i < critMult; i++)
        diceTotal += rollDamageDie(source.weapon.damage.dice, c.rng);
    }
    const die = diceTotal; // for logging we treat aggregated dice as single die value here
    const raw = die + source.weapon.damage.bonus + strMod;
    const damage = Math.max(1, raw);
    const beforeHp = target.hp;
    const remainingRaw = beforeHp - damage;
    // Allow negative HP (floor -10). At exactly 0 => unconscious, below 0 => dead flag (simple MVP).
    const remaining = remainingRaw < -10 ? -10 : remainingRaw;
    let status: 'alive' | 'dead' = 'alive';
    let statusPatch: Record<string, unknown> | undefined;
    if (remaining === 0) {
      statusPatch = { status: { dead: false, unconscious: true, stable: false } };
    } else if (remaining < 0) {
      status = 'dead';
      statusPatch = { status: { dead: true, unconscious: false, stable: false } };
    }
    // Apply patch
    // Apply extended status transitions (unconscious if <= 0 future expansion; for now hp==0 is dead already)
    c.store.updateEntity('character', target.id, { hp: remaining, ...(statusPatch || {}) });
    // Emit effect via accumulator (commit phase will collect already from rule outputs? We'll add effect here directly)
    // Effects collector is available through ctx but not typed here; we rely on Engine commit pattern; add explicit effect in Finalize rule if needed.
    const delta = { damage, targetRemainingHp: remaining, targetStatus: status };
    c.effects.add('damageApplied', target.id, { amount: damage, remaining, status });
    const battleIdForEffects = c.params.battleId;
    interface BattleLike {
      round?: number;
      effectsLog?: { round: number; type: string; target: string; payload?: unknown }[];
    }
    const battleForEffects =
      battleIdForEffects && c.store.getBattle
        ? (c.store.getBattle(battleIdForEffects) as BattleLike | null)
        : null;
    const currentBattleRound =
      battleForEffects && typeof battleForEffects.round === 'number' ? battleForEffects.round : 0;
    if (battleIdForEffects && battleForEffects && c.store.updateBattle) {
      const effectsLog = [
        ...(battleForEffects.effectsLog ?? []),
        {
          round: currentBattleRound,
          type: 'damageApplied',
          target: target.id,
          payload: { amount: damage, remaining, status },
        },
      ];
      c.store.updateBattle(battleIdForEffects, { effectsLog, log: effectsLog });
    }
    // Morale trigger: firstBlood (simplified) when target first takes damage and survives
    // (Potential future firstBlood trigger hook placeholder retained intentionally.)
    // If target still alive attempt morale check based on simple trigger: taking damage below 50% hp
    // Fetch full entity for morale (not strongly typed here)
    try {
      interface FullChar {
        id: CharacterId;
        hp: number;
        hpMax?: number;
        moraleRating?: number;
        status?: { dead?: boolean; moraleState?: string; nextMoraleCheckRound?: number };
        faction?: string;
      }
      const getEntityFn = (
        c.store as { getEntity?: (t: 'character', id: CharacterId) => FullChar | null }
      ).getEntity;
      const fullTarget = getEntityFn ? getEntityFn('character', target.id) : null;
      const battleId = (c as unknown as { params: { battleId?: string } }).params.battleId;
      let currentRound = 0;
      if (battleId && c.store.getBattle) {
        const b = c.store.getBattle(battleId) as unknown as { round?: number } | null;
        if (b && typeof b.round === 'number') currentRound = b.round;
      }
      if (fullTarget && !fullTarget.status?.dead && fullTarget.moraleRating) {
        const maxHp = fullTarget.hpMax ?? beforeHp; // fallback
        const wasFull = beforeHp >= maxHp;
        const firstBlood = wasFull && remaining > 0 && damage > 0;
        const woundedHalf =
          !firstBlood && remaining > 0 && remaining <= Math.max(1, Math.floor(maxHp / 2));
        const trigger: MoraleContext['trigger'] | undefined = firstBlood
          ? 'firstBlood'
          : woundedHalf
            ? 'woundedHalf'
            : undefined;
        if (trigger) {
          const moraleCtx: MoraleContext = { trigger } as MoraleContext;
          const moraleRes = performMoraleCheck(
            fullTarget as unknown as import('../entities/character').Character,
            moraleCtx,
            { int: (a: number, b: number) => c.rng.int(a, b) }
          );
          if (moraleRes) {
            c.effects.add('moraleCheck', target.id, moraleRes);
            if (battleId && c.store.getBattle && c.store.updateBattle) {
              const b2 = c.store.getBattle(battleId) as {
                effectsLog?: { round: number; type: string; target: string; payload?: unknown }[];
                round?: number;
              } | null;
              if (b2) {
                const effectsLog = [
                  ...(b2.effectsLog ?? []),
                  {
                    round: currentRound,
                    type: 'moraleCheck',
                    target: target.id,
                    payload: moraleRes,
                  },
                ];
                c.store.updateBattle(battleId, { effectsLog, log: effectsLog });
              }
            }
            if (moraleRes.outcome !== (fullTarget.status?.moraleState ?? 'hold')) {
              c.effects.add('moraleStateChanged', target.id, {
                from: fullTarget.status?.moraleState ?? 'hold',
                to: moraleRes.outcome,
              });
              if (battleId && c.store.getBattle && c.store.updateBattle) {
                const b3 = c.store.getBattle(battleId) as {
                  effectsLog?: { round: number; type: string; target: string; payload?: unknown }[];
                  round?: number;
                } | null;
                if (b3) {
                  const effectsLog = [
                    ...(b3.effectsLog ?? []),
                    {
                      round: currentRound,
                      type: 'moraleStateChanged',
                      target: target.id,
                      payload: {
                        from: fullTarget.status?.moraleState ?? 'hold',
                        to: moraleRes.outcome,
                      },
                    },
                  ];
                  c.store.updateBattle(battleId, { effectsLog, log: effectsLog });
                }
              }
            }
            // Persist morale state & scheduling hints on character entity (absolute round)
            c.store.updateEntity('character', target.id, {
              status: {
                ...(fullTarget.status || {}),
                moraleState: moraleRes.outcome,
                nextMoraleCheckRound: moraleRes.nextCheckInRounds
                  ? currentRound + moraleRes.nextCheckInRounds
                  : undefined,
              },
            });
            // Log morale roll if battle logging enabled
            if (battleId && c.store.getBattle && c.store.updateBattle) {
              const battle = c.store.getBattle(battleId);
              if (battle?.recordRolls) {
                const stateVal = c.rng.getState();
                const rollsLog = (battle.rollsLog ?? []).concat({
                  type: 'morale',
                  value: moraleRes.raw,
                  state: stateVal,
                });
                c.store.updateBattle(battleId, { rollsLog });
              }
            }
          }
        }
      }
      // Death-based morale triggers (allyDeath / leaderDeath) when target just died
      if (status === 'dead' && fullTarget) {
        const faction = fullTarget.faction;
        const isLeader = !!(
          fullTarget.status && (fullTarget.status as unknown as { isLeader?: boolean }).isLeader
        );
        if (faction) {
          // Snapshot characters to iterate allies
          const snapshotFn = (c.store as unknown as { snapshot?: () => { characters: FullChar[] } })
            .snapshot;
          const snap = snapshotFn ? snapshotFn() : null;
          if (snap) {
            const allies = snap.characters.filter(
              (ch) =>
                ch.id !== fullTarget.id &&
                ch.faction === faction &&
                !ch.status?.dead &&
                ch.moraleRating
            );
            for (const ally of allies) {
              try {
                const moraleCtx: MoraleContext = {
                  trigger: isLeader ? 'leaderDeath' : 'allyDeath',
                  leaderDead: isLeader,
                } as MoraleContext;
                const moraleRes = performMoraleCheck(
                  ally as unknown as import('../entities/character').Character,
                  moraleCtx,
                  { int: (a: number, b: number) => c.rng.int(a, b) }
                );
                c.effects.add('moraleCheck', ally.id, moraleRes);
                if (battleId && c.store.getBattle && c.store.updateBattle) {
                  const b4 = c.store.getBattle(battleId) as {
                    effectsLog?: {
                      round: number;
                      type: string;
                      target: string;
                      payload?: unknown;
                    }[];
                    round?: number;
                  } | null;
                  if (b4) {
                    const effectsLog = [
                      ...(b4.effectsLog ?? []),
                      {
                        round: currentRound,
                        type: 'moraleCheck',
                        target: ally.id,
                        payload: moraleRes,
                      },
                    ];
                    c.store.updateBattle(battleId, { effectsLog, log: effectsLog });
                  }
                }
                if (moraleRes.outcome !== (ally.status?.moraleState ?? 'hold')) {
                  c.effects.add('moraleStateChanged', ally.id, {
                    from: ally.status?.moraleState ?? 'hold',
                    to: moraleRes.outcome,
                  });
                  if (battleId && c.store.getBattle && c.store.updateBattle) {
                    const b5 = c.store.getBattle(battleId) as {
                      effectsLog?: {
                        round: number;
                        type: string;
                        target: string;
                        payload?: unknown;
                      }[];
                      round?: number;
                    } | null;
                    if (b5) {
                      const effectsLog = [
                        ...(b5.effectsLog ?? []),
                        {
                          round: currentRound,
                          type: 'moraleStateChanged',
                          target: ally.id,
                          payload: {
                            from: ally.status?.moraleState ?? 'hold',
                            to: moraleRes.outcome,
                          },
                        },
                      ];
                      c.store.updateBattle(battleId, { effectsLog, log: effectsLog });
                    }
                  }
                }
                c.store.updateEntity('character', ally.id, {
                  status: {
                    ...(ally.status || {}),
                    moraleState: moraleRes.outcome,
                    nextMoraleCheckRound: moraleRes.nextCheckInRounds
                      ? currentRound + moraleRes.nextCheckInRounds
                      : undefined,
                  },
                });
                if (battleId && c.store.getBattle && c.store.updateBattle) {
                  const battle = c.store.getBattle(battleId);
                  if (battle?.recordRolls) {
                    const stateVal = c.rng.getState();
                    const rollsLog = (battle.rollsLog ?? []).concat({
                      type: 'morale',
                      value: moraleRes.raw,
                      state: stateVal,
                    });
                    c.store.updateBattle(battleId, { rollsLog });
                  }
                }
              } catch {
                /* ignore individual ally morale errors */
              }
            }
          }
        }
      }
    } catch {
      /* swallow morale errors to not block damage */
    }
    const battleId = c.params.battleId;
    if (battleId && c.store.getBattle) {
      const battle = c.store.getBattle(battleId);
      if (battle?.recordRolls && c.store.updateBattle) {
        const stateVal = c.rng.getState();
        const rollsLog = (battle.rollsLog ?? []).concat({
          type: 'damage',
          value: die,
          state: stateVal,
        });
        c.store.updateBattle(battleId, { rollsLog });
      }
    }
    c.ok(delta);
    return delta;
  }
}

export class DealDamageCommand extends Command {
  static key = 'dealDamage';
  static params = params;
  static rules = [ValidateEntitiesRule, ComputeDamageRule];
}
registerCommand(DealDamageCommand);

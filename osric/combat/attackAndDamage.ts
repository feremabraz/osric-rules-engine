import type { Engine } from '../engine/Engine';
import type { CharacterId } from '../store/ids';
import { type Result, isOk } from '../types/result';

// Phase 06 Item 7: Composite Combat Convenience
// Executes attackRoll then (if hit) dealDamage automatically, returning structured union.

export interface AttackAndDamageParams {
  engine: Engine;
  battleId: string;
  attacker?: CharacterId; // optional if battleId resolves active
  target: CharacterId;
  force?: { applyDamageOnMiss?: boolean };
}

export type AttackAndDamageResult =
  | { kind: 'attackOnly'; attack: unknown; hit: false }
  | { kind: 'attackAndDamage'; attack: unknown; damage: unknown; hit: true };

interface AttackRollData {
  hit?: boolean;
  natural?: number;
  critical?: boolean;
  criticalMultiplier?: number;
  attacker?: { id: CharacterId };
}
interface DamageData {
  damage?: number;
  targetRemainingHp?: number;
}

export async function applyAttackAndDamage(
  params: AttackAndDamageParams
): Promise<AttackAndDamageResult> {
  const { engine, battleId, attacker, target, force } = params;
  // Access command invocation façade (same pattern as tests use)
  const invoke = (
    engine as unknown as {
      command: Record<
        string,
        (p: Record<string, unknown>) => Promise<Result<Record<string, unknown>>>
      >;
    }
  ).command;
  const attackRes = (await invoke.attackRoll({
    battleId,
    target,
    attacker,
  })) as Result<AttackRollData>;
  if (!isOk(attackRes)) return { kind: 'attackOnly', attack: attackRes, hit: false };
  const hit = attackRes.data.hit === true;
  if (!hit && !force?.applyDamageOnMiss) {
    return { kind: 'attackOnly', attack: attackRes, hit: false };
  }
  const damageRes = (await invoke.dealDamage({
    source: attacker ?? attackRes.data.attacker?.id,
    target,
    battleId,
    attackContext: {
      hit,
      natural: attackRes.data.natural,
      critical: attackRes.data.critical,
      criticalMultiplier: attackRes.data.criticalMultiplier,
    },
  })) as Result<DamageData>;
  if (!isOk(damageRes)) return { kind: 'attackOnly', attack: attackRes, hit: false };
  return { kind: 'attackAndDamage', attack: attackRes, damage: damageRes, hit: true };
}

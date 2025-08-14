import type { Engine } from '../engine/Engine';
import type { CharacterId } from '../store/ids';
import type { BattleState } from '../store/storeFacade';

// Phase 06 Item 6: Battle Convenience Helpers

export function getBattle(engine: Engine, battleId: string): BattleState | null {
  return engine.store.getBattle(battleId);
}

export function listBattleOrder(engine: Engine, battleId: string): CharacterId[] {
  const battle = engine.store.getBattle(battleId);
  if (!battle) return [];
  return battle.order.map((o) => o.id as CharacterId);
}

export function activeCombatant(engine: Engine, battleId: string): CharacterId | null {
  const battle = engine.store.getBattle(battleId);
  if (!battle) return null;
  return (battle.order[battle.activeIndex]?.id as CharacterId) ?? null;
}

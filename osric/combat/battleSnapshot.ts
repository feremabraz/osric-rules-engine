import type { CharacterId } from '../store/ids';
import type { BattleState, StoreFacade } from '../store/storeFacade';

export interface BattleSnapshot {
  round: number;
  timeSeconds: number;
  order: readonly { id: CharacterId; rolled: number }[];
  active: CharacterId;
  rollsLog?: readonly {
    type: 'init' | 'attack' | 'damage' | 'morale';
    value: number;
    state: number;
  }[];
}

export function getBattleSnapshot(store: StoreFacade, id: string): BattleSnapshot | null {
  const b = store.getBattle(id);
  if (!b) return null;
  const snap: BattleSnapshot = {
    round: b.round,
    timeSeconds: b.timeSeconds,
    order: b.order.slice() as { id: CharacterId; rolled: number }[],
    active: b.order[b.activeIndex]?.id as CharacterId,
    rollsLog: b.rollsLog?.slice(),
  };
  return Object.freeze(snap);
}

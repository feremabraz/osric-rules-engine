import type { Engine } from '../engine/Engine';

export interface EffectLogEntry {
  round: number;
  type: string;
  target: string;
  payload?: unknown;
}

// Phase 06 Item 5: Effects & Event Accessors
export function getEffects(
  engine: Engine,
  opts?: { battleId?: string; type?: string | string[]; target?: string; round?: number }
): EffectLogEntry[] {
  const { battleId, type, target, round } = opts || {};
  const battles = engine.store.snapshot().battles; // snapshot is fine for test ergonomics
  const relevant = battleId ? battles.filter((b) => b.id === battleId) : battles;
  let all: EffectLogEntry[] = [];
  for (const b of relevant) {
    if (b.effectsLog) all = all.concat(b.effectsLog);
  }
  return all.filter((e) => {
    if (type) {
      if (Array.isArray(type)) {
        if (!type.includes(e.type)) return false;
      } else if (e.type !== type) return false;
    }
    if (target && e.target !== target) return false;
    if (round !== undefined && e.round !== round) return false;
    return true;
  });
}

export function effectStats(engine: Engine, battleId?: string) {
  const entries = getEffects(engine, battleId ? { battleId } : undefined);
  const counts: Record<string, number> = {};
  for (const e of entries) counts[e.type] = (counts[e.type] || 0) + 1;
  return { total: entries.length, byType: counts };
}

// DE-02 Domain Engine wrapper leveraging common Engine.
import {
  type CommandOutcome,
  Engine as CoreEngine,
  type Effect,
  type EngineConfig,
  engineFail,
} from '../engine';
import { mirrorBattleEffects } from './effects/mirrorBattleEffects';
import type { DomainMemoryStore } from './memoryStore';

export interface DomainEngineConfig {
  seed?: number;
  store: DomainMemoryStore;
}

export class DomainEngine {
  private core: CoreEngine;
  constructor(cfg: DomainEngineConfig) {
    this.core = new CoreEngine(cfg as EngineConfig);
  }
  execute(key: string, params: unknown): CommandOutcome {
    const res = this.core.execute(key, params);
    if (res.ok && res.effects.length) {
      const mirrored = mirrorBattleEffects(res.effects);
      if (mirrored.length) {
        // create new success result preserving data + appended effects
        return { ...res, effects: [...res.effects, ...mirrored] } as CommandOutcome;
      }
    }
    return res;
  }
  simulate(key: string, params: unknown) {
    const sim = this.core.simulate(key, params);
    if (sim.result.ok && sim.effects.length) {
      const mirrored = mirrorBattleEffects(sim.effects);
      if (mirrored.length) {
        return { ...sim, effects: [...sim.effects, ...mirrored] };
      }
    }
    return sim;
  }
  batch(items: { key: string; params: unknown }[], options: { atomic?: boolean } = {}) {
    const batchRes = this.core.batch(items, options);
    if (batchRes.effects.length) {
      const mirrored = mirrorBattleEffects(batchRes.effects);
      if (mirrored.length) {
        return { ...batchRes, effects: [...batchRes.effects, ...mirrored] };
      }
    }
    return batchRes;
  }
  // Convenience domain helpers
  grantXp(id: string, amount: number) {
    return this.execute('osric:grantXp', { id, amount });
  }
  simulateGrantXp(id: string, amount: number) {
    return this.simulate('osric:grantXp', { id, amount });
  }
  unknownCommand() {
    return engineFail('UNKNOWN_COMMAND', 'forced unknown');
  }
}

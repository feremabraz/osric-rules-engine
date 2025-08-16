// CE-09 Engine Facade
// Provides high-level execute / simulate / batch APIs. Simulation + batch semantics
// will be expanded in CE-11 & CE-12 (diffing, atomic / non-atomic). For now minimal.

import { processBatch } from '../core/batch';
import { EffectsBuffer } from '../core/effects';
import { runCommand } from '../core/executor';
import { type CommandOutcome, type Effect, engineFail } from '../core/result';
import { createRng } from '../core/rng';
import type { RNG } from '../core/rng';
import type { EngineStore } from '../core/types';
import { CommandRegistry } from './registry';
import { type SimulationDiff, diffSnapshots } from './simulate';

export interface EngineConfig {
  seed?: number;
  store: EngineStore;
}

export interface BatchItem {
  key: string;
  params: unknown;
}
export interface BatchResult {
  ok: boolean;
  results: CommandOutcome[];
  effects: Effect[];
  failed?: CommandOutcome[];
}

export class Engine {
  private rng: RNG;
  // store kept for future snapshot / diff work (CE-10+)
  private store: EngineStore;

  constructor(cfg: EngineConfig) {
    this.rng = createRng(cfg.seed);
    this.store = cfg.store;
  }

  execute(key: string, params: unknown): CommandOutcome {
    const descriptor = CommandRegistry.get(key);
    if (!descriptor) return engineFail('UNKNOWN_COMMAND', `unknown command: ${key}`);
    const effects = new EffectsBuffer();
    return runCommand(descriptor, params, { rng: this.rng, effects, store: this.store });
  }

  simulate(
    key: string,
    params: unknown
  ): { result: CommandOutcome; diff: SimulationDiff; effects: Effect[] } {
    const beforeStore = this.store.snapshot();
    const rngState = this.rng.getState();
    const descriptor = CommandRegistry.get(key);
    if (!descriptor) {
      const failure = engineFail('UNKNOWN_COMMAND', `unknown command: ${key}`);
      return { result: failure, diff: { created: [], deleted: [], mutated: [] }, effects: [] };
    }
    const effects = new EffectsBuffer();
    const result = runCommand(descriptor, params, { rng: this.rng, effects, store: this.store });
    const afterStore = this.store.snapshot();
    // rollback store and RNG (simulation must not persist)
    this.store.restore(beforeStore);
    this.rng.setState(rngState);
    const diff = diffSnapshots(beforeStore, afterStore);
    const simEffects = result.ok ? Array.from(result.effects) : [];
    return { result, diff, effects: simEffects };
  }

  batch(items: BatchItem[], options: { atomic?: boolean } = {}): BatchResult {
    return processBatch({
      items,
      options,
      resolve: (k: string) => CommandRegistry.get(k),
      rng: this.rng,
      store: this.store,
    });
  }
}

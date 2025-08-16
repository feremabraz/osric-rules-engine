// CE-12 Batch processing (atomic & non-atomic)
// Helper used by Engine facade. Uses store snapshot & RNG state for atomic rollback.

import type { CommandDescriptor } from './command';
import { EffectsBuffer } from './effects';
import { runCommand } from './executor';
import type { CommandOutcome, Effect } from './result';
import { engineFail } from './result';
import type { RNG, RNGState } from './rng';
import type { EngineStore } from './types';

export interface BatchItem {
  key: string;
  params: unknown;
}
export interface BatchOptions {
  atomic?: boolean;
}
export interface BatchResult {
  ok: boolean;
  results: CommandOutcome[];
  effects: Effect[];
  failed?: CommandOutcome[];
}

export function processBatch(args: {
  items: BatchItem[];
  options: BatchOptions;
  resolve: (key: string) => CommandDescriptor | undefined;
  rng: RNG;
  store: EngineStore;
}): BatchResult {
  const { items, options, resolve, rng, store } = args;
  const atomic = !!options.atomic;
  const preStore = atomic ? store.snapshot() : null;
  const preRng = atomic ? rng.getState() : null;
  const results: CommandOutcome[] = [];
  const allEffects: Effect[] = [];
  for (const { key, params } of items) {
    const descriptor = resolve(key);
    if (!descriptor) {
      const failure = engineFail('UNKNOWN_COMMAND', `unknown command: ${key}`);
      results.push(failure);
      if (atomic) {
        rollbackAtomic(store, preStore, rng, preRng);
        return finalizeAtomicFailure(results);
      }
      continue;
    }
    const effects = new EffectsBuffer();
    const outcome = runCommand(descriptor, params, { rng, effects, store });
    results.push(outcome);
    if (outcome.ok) allEffects.push(...outcome.effects);
    else if (atomic) {
      rollbackAtomic(store, preStore, rng, preRng);
      return finalizeAtomicFailure(results);
    }
  }
  const failed = results.filter((r) => !r.ok);
  if (atomic && failed.length) {
    rollbackAtomic(store, preStore, rng, preRng);
    return finalizeAtomicFailure(results);
  }
  const ok = failed.length === 0 || (!atomic && failed.length < results.length);
  return { ok, results, effects: allEffects, failed: failed.length ? failed : undefined };
}

function rollbackAtomic(
  store: EngineStore,
  snapshot: unknown | null,
  rng: RNG,
  rngState: RNGState | null
) {
  if (snapshot) store.restore(snapshot);
  if (rngState) rng.setState(rngState);
}

function finalizeAtomicFailure(results: CommandOutcome[]): BatchResult {
  const failed = results.filter((r) => !r.ok);
  return { ok: false, results, effects: [], failed };
}

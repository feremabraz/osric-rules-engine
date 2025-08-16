// CE-13 Public Barrel
// Export the stable Common Engine surface.
export { command } from './authoring/dsl';
export { Engine } from './facade/engine';
export type { EngineConfig } from './facade/engine';
export { processBatch } from './core/batch';
export type {
  BatchItem as CoreBatchItem,
  BatchResult as CoreBatchResult,
  BatchOptions,
} from './core/batch';
export type { CommandOutcome, Effect } from './core/result';
export { success, domainFail, engineFail } from './core/result';
export { computeHash, verifyHash } from './core/integrity';
export { deepFreeze } from './core/freeze';
export { createRng } from './core/rng';
export type { RNG, RNGState } from './core/rng';
export type { EngineStore } from './core/types';
export { MemoryStore } from './core/types';
export { diffSnapshots } from './facade/simulate';

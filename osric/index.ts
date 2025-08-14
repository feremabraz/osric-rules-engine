/**
 * Public entrypoint: Engine façade + core types/utilities intentionally exposed for authoring & testing.
 * Surface kept minimal per blueprint – no alternative construction paths.
 */
export { Engine } from './engine/Engine';
/** Result wrapper returned from command executions (discriminated by ok flag). */
export type { Result } from './types/result';
/** Enumerated engine / command error codes. */
export type { EngineErrorCode } from './errors/codes';
/** Engine configuration zod schema (for external validation / tooling). */
export { EngineConfigSchema } from './config/schema';
export type { EngineConfig, EngineConfigInput } from './config/schema';
// Character catalog is accessed via engine.entities; no separate legacy export.
/** Command base class for authoring custom commands with co-located rules. */
export { Command } from './command/Command';
/** Registration utilities (idempotent). */
export { registerCommand, resetRegisteredCommands } from './command/register';
export type { BuiltCommandMeta } from './command/register';
/** Store facade (advanced usage & tests). */
export { createStoreFacade } from './store/storeFacade';
export type { StoreFacade } from './store/storeFacade';
/** Entity & battle ID helpers (branded) + zod schemas. */
export {
  createCharacterId,
  createMonsterId,
  createItemId,
  createBattleId,
  characterIdSchema,
  monsterIdSchema,
  itemIdSchema,
  battleIdSchema,
  ids as idSchemas,
} from './store/ids';
export type { CharacterId, MonsterId, ItemId, BattleId } from './store/ids';
/** Deterministic RNG creation (for tests / extensions). */
export { createRng } from './rng/random';
/** Test harness utilities (non-production helpers). */
export { testEngine, normalizeSnapshot, TestEngineBuilder } from './testing/testEngine';
// Combat helpers
export { getCombatSnapshot } from './combat/snapshot';
export { getBattleSnapshot } from './combat/battleSnapshot';
/** Metrics snapshot (Phase 05 Item 3). */
// Usage: engine.metricsSnapshot()

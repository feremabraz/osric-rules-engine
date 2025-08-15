/**
 * Public entrypoint: Engine façade + core types/utilities intentionally exposed for authoring & testing.
 * Surface kept minimal per blueprint – no alternative construction paths.
 */
export { Engine } from './engine/Engine';
/** Result wrapper returned from command executions (discriminated by ok flag). */
export type { Result } from './types/result';
/** Enumerated engine / command error codes. */
export type { EngineErrorCode } from './errors/codes';
export type { DomainCode } from './errors/codes';
/** Engine configuration zod schema (for external validation / tooling). */
export { EngineConfigSchema } from './config/schema';
export type { EngineConfig, EngineConfigInput } from './config/schema';
// Character catalog is accessed via engine.entities; no separate legacy export.
/** Command base class for authoring custom commands with co-located rules. */
export { Command } from './command/Command';
/** Registration utilities (idempotent). */
export { registerCommand, resetRegisteredCommands, getCommandDigests } from './command/register';
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
  // Guards & parsers (Phase 06 Item 2)
  isCharacterId,
  isMonsterId,
  isItemId,
  isBattleId,
  parseCharacterId,
  parseMonsterId,
  parseItemId,
  parseBattleId,
  tryParseCharacterId,
  tryParseMonsterId,
  tryParseItemId,
  tryParseBattleId,
  idKind,
  ensureCharacterId,
} from './store/ids';
export type { CharacterId, MonsterId, ItemId, BattleId } from './store/ids';
/** Deterministic RNG creation (for tests / extensions). */
export { createRng } from './rng/random';
export { rollDie, rollDice, withTempSeed } from './rng/dice';
// Result helpers (Phase 06 Item 1)
export { isOk, isFail, assertOk, unwrap, mapResult, tapResult, chain } from './types/result';
/** Test harness utilities (non-production helpers). */
export { testEngine, normalizeSnapshot, TestEngineBuilder } from './testing/testEngine';
export { testExpectOk, fastCharacter, snapshotWorld } from './testing/shortcuts';
// Combat helpers
export { getCombatSnapshot } from './combat/snapshot';
export { getBattleSnapshot } from './combat/battleSnapshot';
export { getEffects, effectStats } from './combat/effects';
export { getBattle, activeCombatant, listBattleOrder } from './combat/battleHelpers';
export {
  applyAttackAndDamage,
  type AttackAndDamageParams,
  type AttackAndDamageResult,
} from './combat/attackAndDamage';
// Store entity helpers (Phase 06 Item 10)
export {
  getCharacter,
  requireCharacter,
  updateCharacter,
  listCharacters,
  queryFaction,
} from './store/entityHelpers';
/** Metrics snapshot (Phase 05 Item 3). */
// Usage: engine.metricsSnapshot()

// Command definition sugar (Phase 06 Item 12)
export { defineCommand, emptyOutput } from './command/define';
// Rule graph visualization (Phase 06 Item 13)
export { explainRuleGraph } from './command/graph';
// Batch orchestration (Phase 06 Item 14)
export { batch, batchAtomic } from './command/batch';
// Authoring helper: strongly typed rule context narrowing for params + accumulator
export type { RuleCtx } from './execution/context';

/**
 * Public entrypoint: Engine façade + core types/utilities intentionally exposed for authoring & testing.
 */
export { Engine } from './engine/Engine';
export type { Result } from './types/result';
export type { EngineErrorCode } from './errors/codes';
export type { DomainCode } from './errors/codes';
export { EngineConfigSchema } from './config/schema';
export type { EngineConfig, EngineConfigInput } from './config/schema';
export { Command } from './command/Command';
export { getCommandDigests } from './command/register';
export type { BuiltCommandMeta } from './command/register';
export {
  createCharacterId,
  createMonsterId,
  createItemId,
  createBattleId,
  characterIdSchema,
  monsterIdSchema,
  itemIdSchema,
  battleIdSchema,
  idKind,
  ensureCharacterId,
} from './store/ids';
export type { CharacterId, MonsterId, ItemId, BattleId } from './store/ids';
export { isOk, isFail, assertOk, unwrap } from './types/result';
export { getCombatSnapshot } from './combat/snapshot';
export { getBattleSnapshot } from './combat/battleSnapshot';
export { getEffects, effectStats } from './combat/effects';
export { getBattle, activeCombatant, listBattleOrder } from './combat/battleHelpers';
export {
  applyAttackAndDamage,
  type AttackAndDamageParams,
  type AttackAndDamageResult,
} from './combat/attackAndDamage';
export {
  getCharacter,
  requireCharacter,
  updateCharacter,
  listCharacters,
  queryFaction,
} from './store/entityHelpers';
export { defineCommand } from './command/define';
export { explainRuleGraph } from './command/graph';
export { batch, batchAtomic } from './command/batch';
import type { Engine as EngineType } from './engine/Engine';
export const simulate = async (engine: EngineType, command: string, params: unknown) =>
  engine.simulate(command, params);
export type { RuleCtx } from './execution/context';

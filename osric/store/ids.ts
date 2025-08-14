// Deterministic-friendly ID chunk generator. Allows injection of a PRNG function.
// Falls back to Math.random when no override provided.
let customRand: (() => number) | null = null;
import { z } from 'zod';
export function __setIdRandom(fn: (() => number) | null) {
  customRand = fn;
}
function randomChunk(): string {
  const r = customRand ? customRand : Math.random;
  // produce 8 base36 chars via 2 x 24-bit pieces
  let out = '';
  for (let i = 0; i < 2; i++) {
    const n = Math.floor(r() * 0xffffffff);
    out += n.toString(36);
  }
  return out.slice(0, 8);
}

export type CharacterId = `${'char'}_${string}` & { readonly __tag: 'CharacterId' };
export function createCharacterId(): CharacterId {
  return `char_${randomChunk()}` as CharacterId;
}
// Zod schema enforcing runtime shape + branding (public for command param schemas)
export const characterIdSchema = z
  .string()
  .regex(/^char_[a-z0-9]+$/i, 'Invalid CharacterId')
  .transform((s) => s as CharacterId);

export type MonsterId = `${'mon'}_${string}` & { readonly __tag: 'MonsterId' };
export function createMonsterId(): MonsterId {
  return `mon_${randomChunk()}` as MonsterId;
}
export const monsterIdSchema = z
  .string()
  .regex(/^mon_[a-z0-9]+$/i, 'Invalid MonsterId')
  .transform((s) => s as MonsterId);

export type ItemId = `${'itm'}_${string}` & { readonly __tag: 'ItemId' };
export function createItemId(): ItemId {
  return `itm_${randomChunk()}` as ItemId;
}
export const itemIdSchema = z
  .string()
  .regex(/^itm_[a-z0-9]+$/i, 'Invalid ItemId')
  .transform((s) => s as ItemId);

export type BattleId = `${'battle'}_${string}` & { readonly __tag: 'BattleId' };
export function createBattleId(): BattleId {
  return `battle_${randomChunk()}` as BattleId;
}
export const battleIdSchema = z
  .string()
  .regex(/^battle_[a-z0-9]+$/i, 'Invalid BattleId')
  .transform((s) => s as BattleId);

// Aggregated helper namespace (optional import style)
export const ids = {
  character: characterIdSchema,
  monster: monsterIdSchema,
  item: itemIdSchema,
  battle: battleIdSchema,
};

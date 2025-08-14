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

// Phase 06 Item 2: Runtime guard & parsing helpers
// Lightweight regex patterns (duplicated literal to avoid depending on schema parse cost on hot paths)
const CHAR_RE = /^char_[a-z0-9]+$/i;
const MON_RE = /^mon_[a-z0-9]+$/i;
const ITM_RE = /^itm_[a-z0-9]+$/i;
const BATTLE_RE = /^battle_[a-z0-9]+$/i;

export function isCharacterId(v: unknown): v is CharacterId {
  return typeof v === 'string' && CHAR_RE.test(v);
}
export function isMonsterId(v: unknown): v is MonsterId {
  return typeof v === 'string' && MON_RE.test(v);
}
export function isItemId(v: unknown): v is ItemId {
  return typeof v === 'string' && ITM_RE.test(v);
}
export function isBattleId(v: unknown): v is BattleId {
  return typeof v === 'string' && BATTLE_RE.test(v);
}

// parse* throw on invalid, tryParse* return undefined (authoring ergonomics)
export function parseCharacterId(v: unknown): CharacterId {
  if (isCharacterId(v)) return v;
  throw new Error('Invalid CharacterId');
}
export function parseMonsterId(v: unknown): MonsterId {
  if (isMonsterId(v)) return v;
  throw new Error('Invalid MonsterId');
}
export function parseItemId(v: unknown): ItemId {
  if (isItemId(v)) return v;
  throw new Error('Invalid ItemId');
}
export function parseBattleId(v: unknown): BattleId {
  if (isBattleId(v)) return v;
  throw new Error('Invalid BattleId');
}

export function tryParseCharacterId(v: unknown): CharacterId | undefined {
  return isCharacterId(v) ? v : undefined;
}
export function tryParseMonsterId(v: unknown): MonsterId | undefined {
  return isMonsterId(v) ? v : undefined;
}
export function tryParseItemId(v: unknown): ItemId | undefined {
  return isItemId(v) ? v : undefined;
}
export function tryParseBattleId(v: unknown): BattleId | undefined {
  return isBattleId(v) ? v : undefined;
}

// Phase 06 Item 3: Generic ID utilities & discriminator
export type IdKind = 'character' | 'monster' | 'item' | 'battle' | 'unknown';
export function idKind(v: unknown): IdKind {
  if (isCharacterId(v)) return 'character';
  if (isMonsterId(v)) return 'monster';
  if (isItemId(v)) return 'item';
  if (isBattleId(v)) return 'battle';
  return 'unknown';
}

export function ensureCharacterId(v: unknown): CharacterId {
  if (isCharacterId(v)) return v;
  throw new Error('Expected CharacterId');
}

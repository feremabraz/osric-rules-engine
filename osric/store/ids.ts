// Deterministic-friendly ID chunk generator. Allows injection of a PRNG function.
// Falls back to Math.random when no override provided.
let customRand: (() => number) | null = null;
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

export type MonsterId = `${'mon'}_${string}` & { readonly __tag: 'MonsterId' };
export function createMonsterId(): MonsterId {
  return `mon_${randomChunk()}` as MonsterId;
}

export type ItemId = `${'itm'}_${string}` & { readonly __tag: 'ItemId' };
export function createItemId(): ItemId {
  return `itm_${randomChunk()}` as ItemId;
}

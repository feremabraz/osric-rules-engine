function randomChunk(): string {
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    const arr = new Uint32Array(2);
    crypto.getRandomValues(arr);
    return Array.from(arr)
      .map((n) => n.toString(36))
      .join('')
      .slice(0, 8);
  }
  return Math.random().toString(36).slice(2, 10);
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

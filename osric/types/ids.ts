// Branded ID helper (Phase 1 placeholder)
export type Brand<T, B extends string> = T & { readonly __brand: B };

export type CharacterId = Brand<string, 'CharacterId'>;

export function createId<P extends string, B extends string>(
  prefix: P,
  brand: B
): Brand<`${P}_${string}`, B> {
  const unique = Math.random().toString(36).slice(2, 10); // replaced with deterministic rng later
  void brand; // ensure brand part of call-site (keeps generic B) until later refinement
  return `${prefix}_${unique}` as Brand<`${P}_${string}`, B>;
}

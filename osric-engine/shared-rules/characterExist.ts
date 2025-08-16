// DE-07 shared rule: ensure a character exists; returns domain failure if missing.
import { domainFail } from '../../engine';
import type { DomainMemoryStore } from '../memoryStore';

// Generic helper that ensures params[idField] refers to an existing character id.
// We avoid constraining P to an index signature so concrete param types remain assignable.
export function requireCharacter<P, K extends keyof P & string>(
  idField: K,
  code = 'CHAR_NOT_FOUND'
) {
  return (_acc: unknown, params: P, ctx: unknown) => {
    const store = (ctx as unknown as { store: DomainMemoryStore }).store;
    const cid = params[idField];
    if (typeof cid !== 'string' || !store.getCharacter(cid)) {
      return domainFail(code, `${idField} missing`);
    }
    return {}; // fragment
  };
}

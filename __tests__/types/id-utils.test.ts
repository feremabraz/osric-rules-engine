import {
  createCharacterId,
  createItemId,
  createMonsterId,
  createSpellId,
  isCharacterId,
  isItemId,
  isMonsterId,
  isSpellId,
} from '@osric/types';
import { describe, expect, it } from 'vitest';

/**
 * Phase 3: Branded ID utilities sanity tests.
 */

describe('Branded ID utilities', () => {
  it('should create branded CharacterId and pass guards', () => {
    const cid = createCharacterId('char-001');
    expect(typeof cid).toBe('string');
    expect(isCharacterId(cid)).toBe(true);
  });

  it('should create branded ItemId and pass guards', () => {
    const iid = createItemId('item-xyz');
    expect(typeof iid).toBe('string');
    expect(isItemId(iid)).toBe(true);
  });

  it('should create branded MonsterId and SpellId and pass guards', () => {
    const mid = createMonsterId('mon-abc');
    const sid = createSpellId('spell-mm');
    expect(isMonsterId(mid)).toBe(true);
    expect(isSpellId(sid)).toBe(true);
  });

  it('should not narrow non-strings', () => {
    const notId: unknown = 42;
    expect(isCharacterId(notId)).toBe(false);
    expect(isItemId(notId)).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import {
  createBattleId,
  createCharacterId,
  createItemId,
  createMonsterId,
  ensureCharacterId,
  idKind,
  tryParseCharacterId,
} from '../../osric';

// Phase 06 Item 3: Tests for generic ID utilities & discriminator

describe('idKind', () => {
  it('classifies each generated id correctly', () => {
    const c = createCharacterId();
    const m = createMonsterId();
    const i = createItemId();
    const b = createBattleId();
    expect(idKind(c)).toBe('character');
    expect(idKind(m)).toBe('monster');
    expect(idKind(i)).toBe('item');
    expect(idKind(b)).toBe('battle');
    expect(idKind('not_an_id')).toBe('unknown');
  });
});

describe('ensureCharacterId', () => {
  it('returns the id when valid', () => {
    const c = createCharacterId();
    expect(ensureCharacterId(c)).toBe(c);
  });
  it('throws on invalid', () => {
    expect(() => ensureCharacterId('nope')).toThrow(/CharacterId/);
  });
});

describe('tryParseCharacterId', () => {
  it('returns id or undefined', () => {
    const c = createCharacterId();
    expect(tryParseCharacterId(c)).toBe(c);
    expect(tryParseCharacterId('wrong')).toBeUndefined();
  });
});

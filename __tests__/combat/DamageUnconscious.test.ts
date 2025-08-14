import { describe, expect, it } from 'vitest';
import { Engine, type Result } from '../../osric';
import type { CharacterId } from '../../osric/store/ids';
import '../../osric/commands/createCharacter';
import '../../osric/commands/dealDamage';

// Verifies Phase 05 Item 2: hp to exactly 0 => unconscious (not dead); below 0 => dead.

describe('Damage Unconscious & Death Thresholds', () => {
  it('hp exactly 0 sets unconscious', async () => {
    const engine = new Engine({ seed: 200 });
    await engine.start();
    const { human, fighter } = engine.entities.character;
    type Invoker = Record<string, (p: unknown) => Promise<Result<Record<string, unknown>>>>;
    const invoke = (engine as unknown as { command: Invoker }).command;
    const a = await invoke.createCharacter({ race: human, class: fighter, name: 'A' });
    const b = await invoke.createCharacter({ race: human, class: fighter, name: 'B' });
    if (!a.ok || !b.ok) throw new Error('create failed');
    const targetId = b.data.characterId as CharacterId;
    // Patch target hp small for deterministic unconscious
    (
      engine.store.updateEntity as unknown as (
        t: 'character',
        id: CharacterId,
        patch: Record<string, unknown>
      ) => unknown
    )('character', targetId, { hp: 2 });
    // Deal 2 damage
    const dmg = await invoke.dealDamage({
      source: a.data.characterId,
      target: targetId,
      attackContext: { hit: true },
      battleId: undefined,
    });
    expect(dmg.ok).toBe(true);
    const updated = engine.store.getEntity('character', targetId as CharacterId);
    expect(updated).not.toBeNull();
    if (updated) {
      expect(updated.hp).toBe(0);
      expect(updated.status?.unconscious).toBe(true);
      expect(updated.status?.dead).toBeFalsy();
    }
  });
  it('hp below 0 sets dead', async () => {
    const engine = new Engine({ seed: 201 });
    await engine.start();
    const { human, fighter } = engine.entities.character;
    type Invoker = Record<string, (p: unknown) => Promise<Result<Record<string, unknown>>>>;
    const invoke = (engine as unknown as { command: Invoker }).command;
    const a = await invoke.createCharacter({ race: human, class: fighter, name: 'A' });
    const b = await invoke.createCharacter({ race: human, class: fighter, name: 'B' });
    if (!a.ok || !b.ok) throw new Error('create failed');
    const targetId = b.data.characterId as CharacterId;
    (
      engine.store.updateEntity as unknown as (
        t: 'character',
        id: CharacterId,
        patch: Record<string, unknown>
      ) => unknown
    )('character', targetId, { hp: 1 });
    // Boost attacker STR to guarantee damage > 1 (str mod +3)
    (
      engine.store.updateEntity as unknown as (
        t: 'character',
        id: CharacterId,
        patch: Record<string, unknown>
      ) => unknown
    )('character', a.data.characterId as CharacterId, {
      ability: { str: 18, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    });
    // Deal damage (guaranteed lethal) => dead
    const dmg = await invoke.dealDamage({
      source: a.data.characterId,
      target: targetId,
      attackContext: { hit: true },
      battleId: undefined,
    });
    expect(dmg.ok).toBe(true);
    const updated = engine.store.getEntity('character', targetId as CharacterId);
    expect(updated).not.toBeNull();
    if (updated) {
      expect(updated.hp).toBeLessThan(0);
      expect(updated.status?.dead).toBe(true);
      expect(updated.status?.unconscious).toBe(false);
    }
  });
});

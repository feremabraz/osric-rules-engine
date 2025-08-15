import { describe, expect, it } from 'vitest';
import { batchAtomic } from '../../osric/command/batch';
import { Engine } from '../../osric/engine/Engine';

// Helper to build minimal createCharacter params
function cc(engine: Engine, name: string) {
  return {
    race: engine.entities.character.human,
    class: engine.entities.character.fighter,
    name,
  };
}

describe('Transactional Rollback (Item 9)', () => {
  it('rolls back entity creations and mutations on failure', async () => {
    const engine = new Engine({ seed: 1001 });
    await engine.start();
    // First create a baseline character outside batch so we can mutate then rollback
    const base = await engine.command.createCharacter(cc(engine, 'Base'));
    expect(base.ok).toBe(true);
    if (!base.ok) throw new Error('Unexpected failure creating base character');
    const baseId = (base.data as Record<string, unknown>).characterId as string;
    const before = engine.store.snapshot();
    const steps = [
      { command: 'gainExperience', params: { characterId: baseId, amount: 200 }, assign: 'xp1' },
      { command: 'createCharacter', params: cc(engine, 'Temp'), assign: 'temp' },
      // Failing step (missing character)
      { command: 'gainExperience', params: { characterId: 'char_missing', amount: 50 } },
      // Would have created another if not rolled back
      { command: 'createCharacter', params: cc(engine, 'Skipped'), assign: 'skip' },
    ];
    const res = await batchAtomic(engine, steps);
    expect(res.ok).toBe(false);
    const after = engine.store.snapshot();
    // Base character should have original XP (rollback of mutation)
    const baseAfter = after.characters.find((c) => c.id === baseId);
    const baseBefore = before.characters.find((c) => c.id === baseId);
    expect(baseAfter && baseBefore).toBeTruthy();
    if (!baseAfter || !baseBefore) throw new Error('Base character missing for assertions');
    expect(baseAfter.xp).toBe(baseBefore.xp);
    // Temp creation rolled back
    expect(after.characters.length).toBe(before.characters.length); // no new persistent characters
  });

  it('preserves creations when only optional steps fail (no rollback)', async () => {
    const engine = new Engine({ seed: 1002 });
    await engine.start();
    const beforeCount = engine.store.snapshot().characters.length;
    const res = await batchAtomic(engine, [
      { command: 'createCharacter', params: cc(engine, 'A'), assign: 'a' },
      {
        command: 'gainExperience',
        params: { characterId: 'char_missing', amount: 10 },
        optional: true,
      },
      { command: 'createCharacter', params: cc(engine, 'B'), assign: 'b' },
    ]);
    expect(res.ok).toBe(true); // overall ok since only optional failed
    const after = engine.store.snapshot();
    expect(after.characters.length).toBe(beforeCount + 2);
  });

  it('restores RNG state on rollback ensuring deterministic sequence reuse', async () => {
    const engine = new Engine({ seed: 1003 });
    await engine.start();
    // Perform a failing atomic batch that consumes RNG (hp rolls etc.)
    const firstFail = await batchAtomic(engine, [
      { command: 'createCharacter', params: cc(engine, 'A') },
      { command: 'gainExperience', params: { characterId: 'char_missing', amount: 5 } },
    ]);
    expect(firstFail.ok).toBe(false);
    // Now run again creating a character; RNG sequence should match what it was before failed batch consumed (due to rollback)
    const second = await engine.command.createCharacter(cc(engine, 'A2'));
    const third = await engine.command.createCharacter(cc(engine, 'A3'));
    expect(second.ok && third.ok).toBe(true);
    // There is no direct exposed deterministic assertion other than reproducibility: create a fresh engine with same seed and perform two creations.
    const control = new Engine({ seed: 1003 });
    await control.start();
    const c2 = await control.command.createCharacter(cc(control, 'A2'));
    const c3 = await control.command.createCharacter(cc(control, 'A3'));
    expect(c2.ok && c3.ok).toBe(true);
    // Compare hp sequences for heuristic equality
    function extractHp<T extends { ok: boolean; data: { hp: number } }>(result: T) {
      if (!result.ok) throw new Error('Unexpected failure');
      return result.data.hp;
    }
    const seq1 = [
      extractHp(second as typeof second & { data: { hp: number } }),
      extractHp(third as typeof third & { data: { hp: number } }),
    ];
    const seq2 = [
      extractHp(c2 as typeof c2 & { data: { hp: number } }),
      extractHp(c3 as typeof c3 & { data: { hp: number } }),
    ];
    expect(seq1).toEqual(seq2);
  });

  it('throws NESTED_TRANSACTION_UNSUPPORTED when nested transaction attempted', async () => {
    const engine = new Engine({ seed: 1004 });
    await engine.start();
    engine.beginTransaction();
    expect(() => engine.beginTransaction()).toThrowError(/NESTED_TRANSACTION_UNSUPPORTED/);
    engine.rollbackTransaction();
  });
});

import { describe, expect, it } from 'vitest';
import { type CharacterId, Engine, type Result, getCombatSnapshot } from '../../osric';
import '../../osric/commands/createCharacter';

describe('Combat Snapshot (Phase 02)', () => {
  it('returns expected snapshot fields', async () => {
    const engine = new Engine({ seed: 7 });
    await engine.start();
    const { human, fighter } = engine.entities.character;
    const invoke = (
      engine as unknown as { command: Record<string, (p: unknown) => Promise<unknown>> }
    ).command;
    const res = (await invoke.createCharacter({
      race: human,
      class: fighter,
      name: 'Snapper',
    })) as Result<Record<string, unknown>>;
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const snap = getCombatSnapshot(engine.store, res.data.characterId as unknown as CharacterId);
    expect(snap).not.toBeNull();
    if (!snap) return;
    expect(snap.hp.current).toBeGreaterThan(0);
    expect(snap.hp.max).toBe(snap.hp.current); // placeholder logic currently
    expect(typeof snap.ac).toBe('number');
    expect(typeof snap.initiativeBase).toBe('number');
    expect(typeof snap.movementMps).toBe('number');
    expect(typeof snap.encumbranceKg).toBe('number');
  });
});

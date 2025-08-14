import { describe, expect, it } from 'vitest';
import { Engine, type Result, fastCharacter, snapshotWorld, testExpectOk } from '../../osric';
import '../../osric/commands/createCharacter';

// Phase 06 Item 8: Testing shortcuts usage

describe('testing shortcuts', () => {
  it('creates character and snapshots world', async () => {
    const engine = new Engine({ seed: 5 });
    await engine.start();
    const id = await fastCharacter(engine, { name: 'ShortcutChar' });
    expect(typeof id).toBe('string');
    const snap = snapshotWorld(engine);
    expect(snap.characters.some((c) => c.id === id)).toBe(true);
  });

  it('testExpectOk unwraps a result', async () => {
    const engine = new Engine({ seed: 6 });
    await engine.start();
    const { human, fighter } = engine.entities.character;
    type GenericResult = Result<Record<string, unknown>>;
    const invoke = (
      engine as unknown as { command: Record<string, (p: unknown) => Promise<GenericResult>> }
    ).command;
    const res = (await invoke.createCharacter({
      race: human,
      class: fighter,
      name: 'Direct',
    })) as Result<{ characterId: string }>;
    const data = await testExpectOk(res);
    expect(typeof data.characterId).toBe('string');
  });
});

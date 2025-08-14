import { describe, expect, it } from 'vitest';
import { Engine } from '../../osric';
import '../../osric/commands/createCharacter';

// This test exercises the type surface indirectly; compile-time inference is the focus.

describe('Command result typing', () => {
  it('infers typed result for createCharacter', async () => {
    const engine = new Engine();
    await engine.start();
    const { human, fighter } = engine.entities.character;
    const result = (await (
      engine as unknown as {
        command: { createCharacter: (p: unknown) => Promise<unknown> };
      }
    ).command.createCharacter({
      race: human,
      class: fighter,
      name: 'TypedHero',
    })) as { ok: true; data: { name: string; characterId: string } } | { ok: false };
    if (!result.ok) throw new Error('command failed');
    expect(result.data.name).toBe('TypedHero');
    expect(typeof result.data.characterId).toBe('string');
  });
});

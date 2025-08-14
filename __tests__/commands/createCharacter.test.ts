import { describe, expect, it } from 'vitest';
import { Engine } from '../../osric';
import type { Result } from '../../osric';
import '../../osric/commands/createCharacter';

describe('createCharacter command', () => {
  it('creates and returns character data', async () => {
    const engine = new Engine({ seed: 1 });
    await engine.start();
    const invoke = (
      engine as unknown as { command: { createCharacter: (p: unknown) => Promise<unknown> } }
    ).command.createCharacter;
    const { human, fighter } = engine.entities.character;
    const res = (await invoke({
      race: human,
      class: fighter,
      name: 'Aela',
    })) as Result<Record<string, unknown>>;
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.name).toBe('Aela');
      expect(res.data.level).toBe(1);
      expect(res.data.hp).toBe(10);
      expect(res.data.xp).toBe(0);
    }
  });
});

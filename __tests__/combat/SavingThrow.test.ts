import { describe, expect, it } from 'vitest';
import { Engine, type Result } from '../../osric';
import '../../osric/commands/createCharacter';
import '../../osric/commands/savingThrow';

describe('Saving Throw Utility & Command', () => {
  it('performs deterministic saving throw with seed', async () => {
    const engine = new Engine({ seed: 100 });
    await engine.start();
    const { human, fighter } = engine.entities.character;
    type Invoker = Record<string, (p: unknown) => Promise<Result<Record<string, unknown>>>>;
    const invoke = (engine as unknown as { command: Invoker }).command;
    const c = await invoke.createCharacter({ race: human, class: fighter, name: 'Tester' });
    expect(c.ok).toBe(true);
    if (!c.ok) return;
    const id = c.data.characterId as string;
    const save = await invoke.savingThrow({ characterId: id, type: 'death' });
    expect(save.ok).toBe(true);
    if (save.ok) {
      expect(save.data.result).toHaveProperty('roll');
      expect(save.data.result).toHaveProperty('success');
    }
  });
});

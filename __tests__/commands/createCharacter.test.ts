import { describe, expect, it } from 'vitest';
import { Engine } from '../../osric';
import type { Result } from '../../osric';
import { assertOk, isOk } from '../../osric';
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
    expect(isOk(res)).toBe(true);
    const data = assertOk(res);
    expect(data.name).toBe('Aela');
    expect(data.level).toBe(1);
    expect(data.hp).toBe(10);
    expect(data.xp).toBe(0);
  });
});

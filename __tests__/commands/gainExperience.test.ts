import { describe, expect, it } from 'vitest';
import { Engine } from '../../osric';
import type { Result } from '../../osric';
import '../../osric/commands/createCharacter';
import '../../osric/commands/gainExperience';

describe('gainExperience command', () => {
  it('applies experience and reports new xp', async () => {
    const engine = new Engine({ seed: 1 });
    await engine.start();
    const createInvoke = (
      engine as unknown as { command: { createCharacter: (p: unknown) => Promise<unknown> } }
    ).command.createCharacter;
    const { human, fighter } = engine.entities.character;
    const created = (await createInvoke({
      race: human,
      class: fighter,
      name: 'Aela',
    })) as Result<Record<string, unknown>>;
    if (!created.ok) throw new Error('creation failed');
    const id = created.data.characterId;
    const gainInvoke = (
      engine as unknown as { command: { gainExperience: (p: unknown) => Promise<unknown> } }
    ).command.gainExperience;
    const xpRes = (await gainInvoke({ characterId: id, amount: 250 })) as Result<
      Record<string, unknown>
    >;
    expect(xpRes.ok).toBe(true);
    if (xpRes.ok) {
      expect(xpRes.data.newXp).toBe(250);
      expect(xpRes.data.nextLevelThreshold).toBe(1000);
      expect(xpRes.data.levelUpEligible).toBeUndefined();
    }
  });
});

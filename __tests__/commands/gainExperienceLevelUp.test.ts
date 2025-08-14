import { describe, expect, it } from 'vitest';
import { Engine, type Result } from '../../osric';
import '../../osric/commands/createCharacter';
import '../../osric/commands/gainExperience';

describe('gainExperience multi-level progression', () => {
  it('levels up across multiple thresholds and reports levelsGained', async () => {
    const engine = new Engine({ seed: 5 });
    await engine.start();
    const { human, fighter } = engine.entities.character;
    const invoke = (
      engine as unknown as {
        command: Record<string, (p: unknown) => Promise<Result<Record<string, unknown>>>>;
      }
    ).command;
    const created = await invoke.createCharacter({ race: human, class: fighter, name: 'Leveller' });
    if (!created.ok) throw new Error('create failed');
    const id = created.data.characterId as string;
    // Grant enough XP to cross two levels (thresholds: 1000, 2000). Start at 0; add 2500.
    const res = await invoke.gainExperience({ characterId: id, amount: 2500 });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.newXp).toBe(2500);
      expect(res.data.newLevel).toBe(3); // gained 2 levels
      expect(res.data.levelsGained).toBe(2);
      expect(res.data.nextLevelThreshold).toBe(3000);
    }
  });
});

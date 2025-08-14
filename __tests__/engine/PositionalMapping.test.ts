import { describe, expect, it } from 'vitest';
import { Engine } from '../../osric/engine/Engine';
import { character } from '../../osric/entities/character';
import '../../osric/commands/createCharacter';
import '../../osric/commands/inspireParty';

// Phase 05 tests: positional parameter mapping

describe('Positional parameter mapping (Phase 05)', () => {
  it('maps single leading id + object for inspireParty', async () => {
    const engine = new Engine({ seed: 123 });
    await engine.start();
    const create = await engine.command.createCharacter({
      race: character.human,
      class: character.fighter,
      name: 'Leader',
    });
    if (!create.ok) throw new Error('create failed');
    const leaderId = (create.data as { characterId: string }).characterId;

    // Positional: leaderId then object for remaining params
    const res = await engine.command.inspireParty(leaderId, { bonus: 3, message: 'Forward!' });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const data = res.data as { durationRounds: number; affected: string[] };
    expect(data.affected).toContain(leaderId);
    expect(data.durationRounds).toBeGreaterThanOrEqual(3);
  });

  it('falls back cleanly when no primitive positional provided', async () => {
    const engine = new Engine();
    await engine.start();
    const create = await engine.command.createCharacter({
      race: character.human,
      class: character.fighter,
      name: 'Hero',
    });
    if (!create.ok) throw new Error('create failed');
    const leaderId = (create.data as { characterId: string }).characterId;
    // Direct full object
    const res = await engine.command.inspireParty({
      leader: leaderId,
      bonus: 2,
      message: 'Charge!',
    });
    expect(res.ok).toBe(true);
  });
});

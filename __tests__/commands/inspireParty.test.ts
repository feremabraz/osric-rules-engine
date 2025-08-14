import { describe, expect, it } from 'vitest';
import { Engine } from '../../osric/engine/Engine';
import { character } from '../../osric/entities/character';
import type { CreateCharacterResult, InspirePartyResult } from '../../osric/types/commandResults';
// Explicitly import command modules for side-effect registration
import '../../osric/commands/createCharacter';
import '../../osric/commands/inspireParty';

// Helper to create a character via command (ensures consistent path)
async function createCharacter(engine: Engine, name: string) {
  const race = character.human;
  const clazz = character.fighter;
  const res = await engine.command.createCharacter({ race, class: clazz, name });
  if (!res.ok) throw new Error('Failed to create character in test');
  const data = res.data as CreateCharacterResult;
  return data.characterId as string;
}

describe('inspireParty command (Phase 04)', () => {
  it('produces deterministic duration with seed and emits effect', async () => {
    const engine = new Engine({ seed: 42 });
    await engine.start();
    const leaderId = await createCharacter(engine, 'Bard');

    const result = (await engine.command.inspireParty(leaderId, {
      bonus: 2,
      message: 'Courage!',
    })) as { ok: true; data: InspirePartyResult } | { ok: false; error: { code: string } };
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Duration should be in 3..6; with seed 42 first command advances RNG once internally
    expect(result.data.durationRounds).toBeGreaterThanOrEqual(3);
    const data = result.data as InspirePartyResult;
    expect(data.durationRounds).toBeLessThanOrEqual(6);
    expect(Array.isArray(data.affected)).toBe(true);
    expect(data.affected).toContain(leaderId);
    // Effects trace should include inspired effect
    const effects = engine.events.effects.find((e) => e.command === 'inspireParty');
    expect(effects).toBeTruthy();
    expect(effects?.effects.some((e) => e.type === 'inspired' && e.target === leaderId)).toBe(true);
  });

  it('fails with NO_LEADER when leader id unknown', async () => {
    const engine = new Engine({ seed: 7 });
    await engine.start();
    const result = await engine.command.inspireParty('char_missing', { bonus: 1, message: 'Hi' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('NO_LEADER');
    // No effects should have been recorded
    const effects = engine.events.effects.find((e) => e.command === 'inspireParty');
    expect(effects).toBeUndefined();
  });
});

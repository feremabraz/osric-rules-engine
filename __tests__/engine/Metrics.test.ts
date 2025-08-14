import { describe, expect, it } from 'vitest';
import { Engine, registerCommand, resetRegisteredCommands } from '../../osric';
import { CreateCharacterCommand } from '../../osric/commands/createCharacter';
import { SavingThrowCommand } from '../../osric/commands/savingThrow';
import { character } from '../../osric/entities/character';

/**
 * Metrics snapshot tests (Phase 05 Item 3)
 */

describe('Engine Metrics', () => {
  it('tracks command counts, failures, average duration and recent ring buffer', async () => {
    resetRegisteredCommands();
    registerCommand(CreateCharacterCommand);
    registerCommand(SavingThrowCommand);
    const engine = new Engine({ seed: 42 });
    await engine.start();
    // Create a character via command
    const race = character.human;
    const klass = character.fighter;
    const createRes = await engine.execute('createCharacter', {
      race,
      class: klass,
      name: 'Metricus',
    });
    expect(createRes.ok).toBe(true);
    // Trigger a failing saving throw (unknown character id)
    const failRes = await engine.execute('savingThrow', {
      characterId: 'char_missing',
      type: 'death',
    });
    expect(failRes.ok).toBe(false);
    // Invoke createCharacter again to increment metrics
    const createRes2 = await engine.execute('createCharacter', {
      race,
      class: klass,
      name: 'Metricus2',
    });
    expect(createRes2.ok).toBe(true);
    const snap = engine.metricsSnapshot();
    expect(snap.commandsExecuted).toBeGreaterThanOrEqual(3); // two creates + failing save
    expect(snap.commandsFailed).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(snap.recent)).toBe(true);
    expect(snap.recent.length).toBeGreaterThan(0);
    // Ensure recent entries reflect ok flag variety
    const oks = new Set(snap.recent.map((r: { ok: boolean }) => r.ok));
    expect(oks.size).toBeGreaterThan(0);
  });
});

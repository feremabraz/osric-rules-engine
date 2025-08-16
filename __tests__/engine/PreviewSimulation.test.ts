import { describe, expect, it } from 'vitest';
import { Engine } from '../../osric';
import { registerCommand, resetRegisteredCommands } from '../../osric/command/register';
import { CreateCharacterCommand } from '../../osric/commands/createCharacter';
import { GainExperienceCommand } from '../../osric/commands/gainExperience';

// Item 15 tests: preview(), transaction(), simulateCommand()

describe('Preview & Simulation Helpers', () => {
  it('preview rolls back changes', async () => {
    resetRegisteredCommands();
    registerCommand(CreateCharacterCommand);
    const engine = new Engine({ seed: 1 });
    await engine.start();
    const before = engine.store.snapshot().characters.length;
    const res = await engine.preview(async (eng) => {
      await eng.execute('createCharacter', {
        race: eng.entities.character.human,
        class: eng.entities.character.fighter,
        name: 'Temp',
      });
      return 'done';
    });
    expect((res as { value: string }).value).toBe('done');
    const after = engine.store.snapshot().characters.length;
    expect(after).toBe(before); // no persisted change
  });

  it('transaction commits on success and rolls back on failure', async () => {
    resetRegisteredCommands();
    registerCommand(CreateCharacterCommand);
    const engine = new Engine({ seed: 2 });
    await engine.start();
    const startCount = engine.store.snapshot().characters.length;
    await engine.transaction(async (eng) => {
      await eng.execute('createCharacter', {
        race: eng.entities.character.human,
        class: eng.entities.character.fighter,
        name: 'Persisted',
      });
    });
    expect(engine.store.snapshot().characters.length).toBe(startCount + 1);
    // failing transaction
    await expect(async () => {
      await engine.transaction(async (eng) => {
        await eng.execute('createCharacter', {
          race: eng.entities.character.human,
          class: eng.entities.character.fighter,
          name: 'RollbackMe',
        });
        throw new Error('boom');
      });
    }).rejects.toThrow('boom');
    // count unchanged after failure
    expect(engine.store.snapshot().characters.length).toBe(startCount + 1);
  });

  it('simulateCommand returns diff and leaves state unchanged', async () => {
    resetRegisteredCommands();
    registerCommand(CreateCharacterCommand);
    registerCommand(GainExperienceCommand);
    const engine = new Engine({ seed: 3 });
    await engine.start();
    const beforeIds = new Set(engine.store.snapshot().characters.map((c) => c.id));
    const sim = await engine.simulateCommand('createCharacter', {
      race: engine.entities.character.human,
      class: engine.entities.character.fighter,
      name: 'SimHero',
    });
    expect(sim.result.ok).toBe(true);
    expect(sim.diff.created.length).toBe(1);
    // After simulation, state unchanged
    const afterIds = new Set(engine.store.snapshot().characters.map((c) => c.id));
    expect(afterIds).toEqual(beforeIds);
  });
});

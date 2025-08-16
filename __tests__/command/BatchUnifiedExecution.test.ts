import { describe, expect, it } from 'vitest';
import { Engine, isOk } from '../../osric';
import { batch, batchAtomic } from '../../osric/command/batch';

// Using existing command createCharacter for parity checks

describe('Batch unified execution parity', () => {
  it('single step batch matches direct execute diagnostics & data', async () => {
    const engine = new Engine({ seed: 123 });
    await engine.start();
    const params = {
      race: engine.entities.character.human,
      class: engine.entities.character.fighter,
      name: 'Solo',
    };
    const direct = await engine.execute('createCharacter', params);
    expect(isOk(direct)).toBe(true);
    const directData = isOk(direct) ? direct.data : undefined;
    const directDiag = (direct as unknown as { diagnostics?: unknown }).diagnostics as
      | {
          entityDiff?: { created: number };
          rng?: { draws: number };
        }
      | undefined;
    const b = await batch(engine, [{ command: 'createCharacter', params }]);
    expect(b.ok).toBe(true);
    expect(b.steps.length).toBe(1);
    const step = b.steps[0];
    expect(step.ok).toBe(true);
    expect(step.data?.name).toBe(directData?.name);
    // Compare selected diagnostic fields
    const batchDiag = step.diagnostics as
      | {
          entityDiff?: { created: number };
          rng?: { draws: number };
        }
      | undefined;
    expect(typeof batchDiag?.entityDiff?.created).toBe('number');
    expect(batchDiag?.entityDiff?.created).toBe(directDiag?.entityDiff?.created);
    expect(batchDiag?.rng?.draws).toBe(directDiag?.rng?.draws);
  });

  it('single step batchAtomic matches direct execute & commits', async () => {
    const engine = new Engine({ seed: 456 });
    await engine.start();
    const params = {
      race: engine.entities.character.human,
      class: engine.entities.character.fighter,
      name: 'Atomic',
    };
    const direct = await engine.execute('createCharacter', params);
    expect(isOk(direct)).toBe(true);
    const directCount = engine.store.snapshot().characters.length;
    // new engine for isolated comparison
    const engine2 = new Engine({ seed: 456 });
    await engine2.start();
    const res = await batchAtomic(engine2, [{ command: 'createCharacter', params }]);
    expect(res.ok).toBe(true);
    expect(engine2.store.snapshot().characters.length).toBe(directCount); // commit parity
  });
});

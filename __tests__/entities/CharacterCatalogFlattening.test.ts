import { describe, expect, it } from 'vitest';
import { Engine } from '../../osric';

// Phase 07 tests: ensure flattened character catalog works.
describe('Character Catalog Flattening (Phase 07)', () => {
  it('prepare works with flattened meta references', async () => {
    const engine = new Engine();
    await engine.start();
    const { human, fighter, prepare } = engine.entities.character;
    const draft = prepare(human, fighter, { name: 'Aria' });
    expect(draft.name).toBe('Aria');
    expect(draft.race.key).toBe('human');
    expect(draft.class.key).toBe('fighter');
    expect(Object.isFrozen(human)).toBe(true);
    expect(Object.isFrozen(fighter)).toBe(true);
  });
});

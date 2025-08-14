import { describe, expect, it } from 'vitest';
import { Engine } from '../../osric';

describe('Engine: config & character preparation', () => {
  it('parses config at construction and exposes via getConfig()', () => {
    const engine = new Engine({ seed: 42 });
    const cfg = engine.getConfig();
    expect(cfg.seed).toBe(42);
  });

  it('prepares a character draft with expected defaults', () => {
    const engine = new Engine();
    const { human, fighter, prepare } = engine.entities.character;
    const char = prepare(human, fighter, { name: 'Aela' });
    expect(char.name).toBe('Aela');
    expect(char.level).toBe(1);
    expect(char.hp).toBe(10); // fighter d10 max
    expect(char.race.key).toBe('human');
    expect(char.class.key).toBe('fighter');
  });

  it('exposes prepare via engine.entities.character.prepare', () => {
    const engine = new Engine({ seed: 99 });
    const { dwarf, cleric, prepare } = engine.entities.character;
    const draft = prepare(dwarf, cleric, { name: 'Borin' });
    expect(draft.name).toBe('Borin');
    expect(draft.level).toBe(1);
    expect(draft.hp).toBe(8); // cleric d8
    expect(draft.race.key).toBe('dwarf');
    expect(draft.class.key).toBe('cleric');
  });
});

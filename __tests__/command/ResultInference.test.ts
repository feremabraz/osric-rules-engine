import { describe, expectTypeOf, it } from 'vitest';
import { Engine } from '../../osric/engine/Engine';
import '../../osric/commands/createCharacter';
import '../../osric/commands/gainExperience';
import {
  type CharacterClassMeta,
  type CharacterRaceMeta,
  character,
} from '../../osric/entities/character';

describe('Command result inference', () => {
  it('infers createCharacter result fields', async () => {
    const engine = new Engine({});
    await engine.start();
    const res = await engine.execute('createCharacter', {
      race: character.human as CharacterRaceMeta,
      class: character.fighter as CharacterClassMeta,
      name: 'Aria',
    });
    if (res.ok) {
      expectTypeOf(res.data.characterId).toEqualTypeOf<string>();
      expectTypeOf(res.data.hp).toEqualTypeOf<number>();
      expectTypeOf(res.data.level).toEqualTypeOf<number>();
    }
  });

  it('infers gainExperience result fields', async () => {
    const engine = new Engine({});
    await engine.start();
    const created = await engine.execute('createCharacter', {
      race: character.human as CharacterRaceMeta,
      class: character.fighter as CharacterClassMeta,
      name: 'Borin',
    });
    if (!created.ok) throw new Error('creation failed in test setup');
    const { characterId } = created.data;
    const gained = await engine.execute('gainExperience', { characterId, amount: 250 });
    if (gained.ok) {
      expectTypeOf(gained.data.characterId).toEqualTypeOf<string>();
      expectTypeOf(gained.data.newXp).toEqualTypeOf<number>();
      expectTypeOf(gained.data.nextLevelThreshold).toEqualTypeOf<number>();
      expectTypeOf(gained.data.levelUpEligible).toEqualTypeOf<boolean | undefined>();
    }
  });
});

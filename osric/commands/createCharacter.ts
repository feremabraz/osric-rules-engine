import { z } from 'zod';
import { Command } from '../command/Command';
import { Rule } from '../command/Rule';
import { registerCommand } from '../command/register';
import { type CharacterClassMeta, type CharacterRaceMeta, character } from '../entities/character';
// Manual CommandResultShape augmentation removed; result shape inferred from rule output schemas.

const params = z.object({
  race: z.custom<CharacterRaceMeta>(
    (v): v is CharacterRaceMeta =>
      typeof v === 'object' && v !== null && 'key' in (v as Record<string, unknown>)
  ),
  class: z.custom<CharacterClassMeta>(
    (v): v is CharacterClassMeta =>
      typeof v === 'object' && v !== null && 'key' in (v as Record<string, unknown>)
  ),
  name: z.string().min(1),
});

class PrepareRule extends Rule<{ draft: unknown }> {
  static ruleName = 'Prepare';
  static output = z.object({ draft: z.any() });
  apply(ctx: unknown) {
    const c = ctx as {
      params: { race: CharacterRaceMeta; class: CharacterClassMeta; name: string };
      ok: (d: Record<string, unknown>) => Record<string, unknown>;
    };
    const draft = character.prepare(c.params.race, c.params.class, { name: c.params.name });
    c.ok({ draft });
    return { draft };
  }
}

class PersistRule extends Rule<{
  characterId: string;
  name: string;
  race: string;
  class: string;
  level: number;
  hp: number;
  xp: number;
}> {
  static ruleName = 'Persist';
  static after = ['Prepare'];
  static output = z.object({
    characterId: z.string(),
    name: z.string(),
    race: z.string(),
    class: z.string(),
    level: z.number().int(),
    hp: z.number().int(),
    xp: z.number().int(),
  });
  apply(ctx: unknown) {
    interface LocalCtx {
      store: {
        setEntity: (type: 'character', d: unknown) => string;
        getEntity: (type: 'character', id: string) => Record<string, unknown> | null;
      };
      acc: { draft: unknown };
      ok: (d: Record<string, unknown>) => Record<string, unknown>;
      fail: (code: 'STORE_CONSTRAINT', message: string) => Record<string, unknown>;
    }
    const c = ctx as LocalCtx;
    const id = c.store.setEntity('character', c.acc.draft);
    const stored = c.store.getEntity('character', id);
    if (!stored) {
      c.fail('STORE_CONSTRAINT', 'Character persistence failed');
      return undefined;
    }
    const s = stored as unknown as {
      name: string;
      race: { key: string };
      class: { key: string };
      level: number;
      hp: number;
      xp: number;
    };
    return {
      characterId: id,
      name: s.name,
      race: s.race.key,
      class: s.class.key,
      level: s.level,
      hp: s.hp,
      xp: s.xp,
    };
  }
}

export class CreateCharacterCommand extends Command {
  static key = 'createCharacter';
  static params = params;
  static rules = [PrepareRule, PersistRule];
}
registerCommand(CreateCharacterCommand);

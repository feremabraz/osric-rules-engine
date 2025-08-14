import { z } from 'zod';
import { Command } from '../command/Command';
import { Rule } from '../command/Rule';
import { registerCommand } from '../command/register';
// Manual CommandResultShape augmentation removed; inferred from rule schemas.

const params = z.object({ characterId: z.string(), amount: z.number().int().positive() });

function nextThreshold(level: number): number {
  return level * 1000;
}

class ValidateCharacterRule extends Rule<{ character: Record<string, unknown> }> {
  static ruleName = 'ValidateCharacter';
  static output = z.object({ character: z.record(z.unknown()) });
  apply(ctx: unknown) {
    interface LocalCtx {
      store: { getEntity: (type: 'character', id: string) => Record<string, unknown> | null };
      params: { characterId: string };
      ok: (d: Record<string, unknown>) => Record<string, unknown>;
      fail: (code: 'CHARACTER_NOT_FOUND', message: string) => Record<string, unknown>;
    }
    const c = ctx as LocalCtx;
    const ch = c.store.getEntity('character', c.params.characterId);
    if (!ch) {
      return c.fail('CHARACTER_NOT_FOUND', 'Character not found') as unknown as {
        character: Record<string, unknown>;
      };
    }
    c.ok({ character: ch });
    return { character: ch };
  }
}

class ApplyExperienceRule extends Rule<{
  characterId: string;
  newXp: number;
  nextLevelThreshold: number;
  levelUpEligible?: boolean;
}> {
  static ruleName = 'ApplyExperience';
  static after = ['ValidateCharacter'];
  static output = z.object({
    characterId: z.string(),
    newXp: z.number().int(),
    nextLevelThreshold: z.number().int(),
    levelUpEligible: z.boolean().optional(),
  });
  apply(ctx: unknown) {
    interface CharacterShape {
      id: string;
      xp: number;
      level: number;
    }
    interface LocalCtx {
      store: {
        updateEntity: (
          type: 'character',
          id: string,
          patch: Record<string, unknown>
        ) => Record<string, unknown>;
      };
      acc: { character: CharacterShape };
      params: { amount: number };
      ok: (d: Record<string, unknown>) => Record<string, unknown>;
    }
    const c = ctx as LocalCtx;
    const ch = c.acc.character;
    const updated = c.store.updateEntity('character', ch.id, {
      xp: ch.xp + c.params.amount,
    }) as CharacterShape & { xp: number } & Record<string, unknown>;
    const threshold = nextThreshold(updated.level);
    const eligible = updated.xp >= threshold;
    c.ok({
      characterId: updated.id,
      newXp: updated.xp,
      nextLevelThreshold: threshold,
      levelUpEligible: eligible || undefined,
    });
    return {
      characterId: updated.id,
      newXp: updated.xp,
      nextLevelThreshold: threshold,
      levelUpEligible: eligible || undefined,
    };
  }
}

export class GainExperienceCommand extends Command {
  static key = 'gainExperience';
  static params = params;
  static rules = [ValidateCharacterRule, ApplyExperienceRule];
}
registerCommand(GainExperienceCommand);

import { z } from 'zod';
import { Command } from '../command/Command';
import { Rule } from '../command/Rule';
import { registerCommand } from '../command/register';
// Manual CommandResultShape augmentation removed; inferred from rule schemas.

const params = z.object({ characterId: z.string(), amount: z.number().int().positive() });

// Simple placeholder thresholds: level n -> n*1000 (can be replaced by class meta xpThresholds later)
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
  levelsGained?: number;
  newLevel?: number;
}> {
  static ruleName = 'ApplyExperience';
  static after = ['ValidateCharacter'];
  static output = z.object({
    characterId: z.string(),
    newXp: z.number().int(),
    nextLevelThreshold: z.number().int(),
    levelUpEligible: z.boolean().optional(),
    levelsGained: z.number().int().optional(),
    newLevel: z.number().int().optional(),
  });
  apply(ctx: unknown) {
    interface CharacterShape {
      id: string;
      xp: number;
      level: number;
      hp: number;
      class: {
        hitDie: 'd6' | 'd8' | 'd10';
        baseAttackAtLevel?: readonly number[];
        baseSaves?: readonly {
          death: number;
          wands: number;
          petrification: number;
          breath: number;
          spells: number;
        }[];
      };
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
      rng?: { int: (a: number, b: number) => number };
    }
    const c = ctx as LocalCtx;
    const ch = c.acc.character;
    // Apply XP
    const workingXp = ch.xp + c.params.amount;
    let level = ch.level;
    let levelsGained = 0;
    let hp = ch.hp;
    // Loop thresholds (simple linear formula for now)
    while (workingXp >= nextThreshold(level) && level < 20) {
      level += 1;
      levelsGained += 1;
      // Roll new hit die (average fallback if no rng): For deterministic tests we can just max the die for now.
      const dieMax = ch.class.hitDie === 'd10' ? 10 : ch.class.hitDie === 'd8' ? 8 : 6;
      hp += dieMax; // simplification (future: real roll with rng)
    }
    const updated = c.store.updateEntity('character', ch.id, {
      xp: workingXp,
      level,
      hp,
    }) as CharacterShape & { xp: number; level: number; hp: number } & Record<string, unknown>;
    const threshold = nextThreshold(updated.level);
    const eligible = updated.xp >= threshold;
    const delta = {
      characterId: updated.id,
      newXp: updated.xp,
      nextLevelThreshold: threshold,
      levelUpEligible: eligible || undefined,
      levelsGained: levelsGained || undefined,
      newLevel: levelsGained ? updated.level : undefined,
    };
    c.ok(delta);
    return delta;
  }
}

export class GainExperienceCommand extends Command {
  static key = 'gainExperience';
  static params = params;
  static rules = [ValidateCharacterRule, ApplyExperienceRule];
}
registerCommand(GainExperienceCommand);

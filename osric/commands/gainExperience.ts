import { z } from 'zod';
import type { Command } from '../command/Command';
import { Rule } from '../command/Rule';
import { defineCommand } from '../command/define';
import { registerCommand } from '../command/register';
import type { RuleCtx } from '../execution/context';
import { getCharacter } from '../store/entityHelpers';
import { type CharacterId, characterIdSchema } from '../store/ids';

const params = z.object({ characterId: characterIdSchema, amount: z.number().int().positive() });
type Params = z.infer<typeof params>;

// Simple placeholder thresholds: level n -> n*1000 (can be replaced by class meta xpThresholds later)
function nextThreshold(level: number): number {
  return level * 1000;
}

interface ValidateOut extends Record<string, unknown> {
  character: Record<string, unknown>;
}
class ValidateCharacterRule extends Rule<ValidateOut> {
  static ruleName = 'ValidateCharacter';
  static output = z.object({ character: z.record(z.unknown()) });
  apply(ctx: unknown): ValidateOut {
    const c = ctx as RuleCtx<Params, Record<string, never>>;
    const ch = getCharacter(c.store, c.params.characterId);
    if (!ch) return c.fail('CHARACTER_NOT_FOUND', 'Character not found') as unknown as ValidateOut;
    return { character: ch as unknown as Record<string, unknown> };
  }
}

interface ApplyOut extends Record<string, unknown> {
  characterId: CharacterId;
  newXp: number;
  nextLevelThreshold: number;
  levelUpEligible?: boolean;
  levelsGained?: number;
  newLevel?: number;
}
class ApplyExperienceRule extends Rule<ApplyOut> {
  static ruleName = 'ApplyExperience';
  static after = ['ValidateCharacter'];
  static output = z.object({
    characterId: characterIdSchema,
    newXp: z.number().int(),
    nextLevelThreshold: z.number().int(),
    levelUpEligible: z.boolean().optional(),
    levelsGained: z.number().int().optional(),
    newLevel: z.number().int().optional(),
  });
  apply(ctx: unknown): ApplyOut {
    const c = ctx as RuleCtx<Params, ValidateOut> & {
      store: {
        updateEntity: (
          t: 'character',
          id: CharacterId,
          patch: Record<string, unknown>
        ) => Record<string, unknown>;
      };
    };
    const ch = c.acc.character as unknown as {
      id: CharacterId;
      xp: number;
      level: number;
      hp: number;
      class: { hitDie: 'd6' | 'd8' | 'd10' };
    };
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
    }) as unknown as typeof ch & { xp: number; level: number; hp: number } & Record<
        string,
        unknown
      >;
    const threshold = nextThreshold(updated.level);
    const eligible = updated.xp >= threshold;
    const delta: ApplyOut = {
      characterId: updated.id,
      newXp: updated.xp,
      nextLevelThreshold: threshold,
      levelUpEligible: eligible || undefined,
      levelsGained: levelsGained || undefined,
      newLevel: levelsGained ? updated.level : undefined,
    };
    return delta;
  }
}

export const GainExperienceCommand = defineCommand({
  key: 'gainExperience',
  params,
  rules: [ValidateCharacterRule, ApplyExperienceRule],
});
registerCommand(GainExperienceCommand as unknown as typeof Command);

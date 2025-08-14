import { z } from 'zod';
import { Command } from '../command/Command';
import { Rule } from '../command/Rule';
import { registerCommand } from '../command/register';
import { type AbilityScoreMethod, abilityMod, rollAbilityScores } from '../entities/ability';
import {
  type CharacterClassMeta,
  type CharacterDraft,
  type CharacterRaceMeta,
  character,
} from '../entities/character';
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
  abilityMethod: z
    .enum(['STANDARD_3D6', 'FOCUSED_4D6_DROP_LOWEST', 'HEROIC_2D6_PLUS_6'])
    .default('STANDARD_3D6')
    .optional(),
});

// Phase 01 Items 1-5 incremental scaffolding rules (more to be added later):
class PrepareRule extends Rule<{ draft: CharacterDraft }> {
  static ruleName = 'Prepare';
  static output = z.object({ draft: z.any() });
  apply(ctx: unknown) {
    const c = ctx as {
      params: {
        race: CharacterRaceMeta;
        class: CharacterClassMeta;
        name: string;
        abilityMethod?: AbilityScoreMethod;
      };
      ok: (d: Record<string, unknown>) => Record<string, unknown>;
      rng: { int: (min: number, max: number) => number };
    };
    // Start from base draft (placeholders inside)
    let draft = character.prepare(c.params.race, c.params.class, { name: c.params.name });
    // Ability score generation (Item 1) – replace placeholder zeros
    const method: AbilityScoreMethod = c.params.abilityMethod ?? 'STANDARD_3D6';
    const scores = rollAbilityScores(method, c.rng as unknown as import('../rng/random').Rng);
    // Apply racial adjustments (Item 2)
    const adjusted = character.applyRacialAdjustments(scores, c.params.race);
    draft = { ...draft, ability: adjusted };
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
  hpMax: number;
  xp: number;
  faction?: string;
}> {
  static ruleName = 'Persist';
  static after = ['FinalValidation'];
  static output = z.object({
    characterId: z.string(),
    name: z.string(),
    race: z.string(),
    class: z.string(),
    level: z.number().int(),
    hp: z.number().int(),
    hpMax: z.number().int(),
    xp: z.number().int(),
    faction: z.string().optional(),
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
    if (!stored)
      return c.fail('STORE_CONSTRAINT', 'Character persistence failed') as unknown as undefined;
    const s = stored as unknown as {
      name: string;
      race: { key: string };
      class: { key: string };
      level: number;
      hp: number;
      hpMax: number;
      xp: number;
      faction?: string;
    };
    return {
      characterId: id,
      name: s.name,
      race: s.race.key,
      class: s.class.key,
      level: s.level,
      hp: s.hp,
      hpMax: s.hpMax,
      xp: s.xp,
      faction: s.faction,
    };
  }
}

// --- Additional Rules (Phase 01 Items 3-7) ---

class RaceClassValidationRule extends Rule<Record<string, never>> {
  static ruleName = 'RaceClassValidation';
  static after = ['Prepare'];
  static output = z.object({});
  apply(ctx: unknown) {
    interface LocalCtx {
      params: { race: CharacterRaceMeta; class: CharacterClassMeta };
      acc: { draft: CharacterDraft };
      fail: (
        code: 'CLASS_RESTRICTION' | 'ABILITY_REQUIREMENT',
        msg: string
      ) => Record<string, unknown>;
      ok: (d: Record<string, unknown>) => Record<string, unknown>;
    }
    const c = ctx as LocalCtx;
    const { race, class: klass } = c.params;
    if (race.allowedClasses && !race.allowedClasses.includes(klass.key)) {
      return c.fail(
        'CLASS_RESTRICTION',
        `Race ${race.key} cannot take class ${klass.key}`
      ) as unknown as Record<string, never>;
    }
    if (klass.prerequisites && klass.prerequisites.length > 0) {
      const ability = c.acc.draft.ability;
      const failures: string[] = [];
      for (const req of klass.prerequisites) {
        const val = ability[req.ability];
        if (req.min !== undefined && val < req.min) failures.push(`${req.ability} < ${req.min}`);
        if (req.max !== undefined && val > req.max) failures.push(`${req.ability} > ${req.max}`);
      }
      if (failures.length) {
        return c.fail('ABILITY_REQUIREMENT', failures.join(', ')) as unknown as Record<
          string,
          never
        >;
      }
    }
    c.ok({});
    return {} as Record<string, never>;
  }
}

class ClassBaseDerivationRule extends Rule<Record<string, never>> {
  static ruleName = 'ClassBaseDerivation';
  static after = ['RaceClassValidation'];
  static output = z.object({});
  apply(ctx: unknown) {
    interface LocalCtx {
      acc: { draft: CharacterDraft };
      params: { class: CharacterClassMeta };
      rng: { int: (min: number, max: number) => number };
      ok: (d: Record<string, unknown>) => Record<string, unknown>;
    }
    const c = ctx as LocalCtx;
    const draft = c.acc.draft;
    // Roll HP based on hit die (Item 4) – will apply CON modifier later
    const maxDie = (() => {
      switch (c.params.class.hitDie) {
        case 'd6':
          return 6;
        case 'd8':
          return 8;
        case 'd10':
          return 10;
      }
    })();
    draft.hp = c.rng.int(1, maxDie);
    c.ok({});
    return {} as Record<string, never>;
  }
}

class SecondaryStatsRule extends Rule<Record<string, never>> {
  static ruleName = 'SecondaryStats';
  static after = ['ClassBaseDerivation'];
  static output = z.object({});
  apply(ctx: unknown) {
    interface LocalCtx {
      acc: { draft: CharacterDraft };
      ok: (d: Record<string, unknown>) => Record<string, unknown>;
    }
    const c = ctx as LocalCtx;
    const draft = c.acc.draft;
    // Apply CON modifier to HP (Item 5 step) ensuring minimum 1
    const conMod = abilityMod(draft.ability.con);
    draft.hp = Math.max(1, draft.hp + conMod);
    // Initiative base placeholder = DEX mod
    draft.stats.initiative.base = abilityMod(draft.ability.dex);
    // Movement already seeded from race; ensure >0 else fallback
    if (!draft.stats.movement.speedMps || draft.stats.movement.speedMps <= 0)
      draft.stats.movement.speedMps = 9;
    c.ok({});
    return {} as Record<string, never>;
  }
}

class EquipmentAllocationRule extends Rule<Record<string, never>> {
  static ruleName = 'EquipmentAllocation';
  static after = ['SecondaryStats'];
  static output = z.object({});
  apply(ctx: unknown) {
    interface LocalCtx {
      acc: { draft: CharacterDraft };
      ok: (d: Record<string, unknown>) => Record<string, unknown>;
    }
    const c = ctx as LocalCtx;
    const draft = c.acc.draft;
    // Minimal placeholder equipment allocation (Item 6) – real item entities not yet fleshed out; use string tokens.
    const classKey = draft.class.key;
    if (classKey === 'fighter') {
      draft.inventory.push('itm_sword', 'itm_chain');
      draft.equipped.weapon = 'itm_sword';
      draft.equipped.armor = 'itm_chain';
    } else if (classKey === 'cleric') {
      draft.inventory.push('itm_mace', 'itm_chain');
      draft.equipped.weapon = 'itm_mace';
      draft.equipped.armor = 'itm_chain';
    }
    // Encumbrance weight placeholder: assume each token item 2kg (simplification for now)
    draft.encumbrance.totalWeightKg = draft.inventory.length * 2;
    c.ok({});
    return {} as Record<string, never>;
  }
}

class FinalValidationRule extends Rule<Record<string, never>> {
  static ruleName = 'FinalValidation';
  static after = ['EquipmentAllocation'];
  static output = z.object({});
  apply(ctx: unknown) {
    interface LocalCtx {
      acc: { draft: CharacterDraft };
      fail: (
        code: 'RACIAL_ADJUSTMENT_RANGE' | 'STORE_CONSTRAINT',
        msg: string
      ) => Record<string, unknown>;
      ok: (d: Record<string, unknown>) => Record<string, unknown>;
    }
    const c = ctx as LocalCtx;
    const d = c.acc.draft as CharacterDraft;
    // Ability range check
    const ability = d.ability;
    if (ability.str < 3 || ability.str > 18)
      return c.fail('RACIAL_ADJUSTMENT_RANGE', 'Ability str out of bounds') as unknown as Record<
        string,
        never
      >;
    if (ability.dex < 3 || ability.dex > 18)
      return c.fail('RACIAL_ADJUSTMENT_RANGE', 'Ability dex out of bounds') as unknown as Record<
        string,
        never
      >;
    if (ability.con < 3 || ability.con > 18)
      return c.fail('RACIAL_ADJUSTMENT_RANGE', 'Ability con out of bounds') as unknown as Record<
        string,
        never
      >;
    if (ability.int < 3 || ability.int > 18)
      return c.fail('RACIAL_ADJUSTMENT_RANGE', 'Ability int out of bounds') as unknown as Record<
        string,
        never
      >;
    if (ability.wis < 3 || ability.wis > 18)
      return c.fail('RACIAL_ADJUSTMENT_RANGE', 'Ability wis out of bounds') as unknown as Record<
        string,
        never
      >;
    if (ability.cha < 3 || ability.cha > 18)
      return c.fail('RACIAL_ADJUSTMENT_RANGE', 'Ability cha out of bounds') as unknown as Record<
        string,
        never
      >;
    // Equipped items must be in inventory
    if (d.equipped.weapon && !d.inventory.includes(d.equipped.weapon))
      return c.fail('STORE_CONSTRAINT', 'Equipped weapon missing inventory') as unknown as Record<
        string,
        never
      >;
    if (d.equipped.armor && !d.inventory.includes(d.equipped.armor))
      return c.fail('STORE_CONSTRAINT', 'Equipped armor missing inventory') as unknown as Record<
        string,
        never
      >;
    c.ok({});
    return {} as Record<string, never>;
  }
}

export class CreateCharacterCommand extends Command {
  static key = 'createCharacter';
  static params = params;
  static rules = [
    PrepareRule,
    RaceClassValidationRule,
    ClassBaseDerivationRule,
    SecondaryStatsRule,
    EquipmentAllocationRule,
    FinalValidationRule,
    PersistRule,
  ];
}
registerCommand(CreateCharacterCommand);

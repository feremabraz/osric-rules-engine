// Phase 2: Entities domain consolidation (character only for now)
import { z } from 'zod';

// Phase 01 Item 0: Schema refactor – introduce ability scores, stats scaffold, inventory/equipment & encumbrance.
// Breaking additions (backward-compat accepted). Existing tests expecting minimal shape should continue working
// because added fields are additive; hp initialization will be migrated to rules later (Items 4/5).

export interface CharacterRaceMeta {
  readonly key: CharacterRaceKey;
  // Full six ability modifiers (0 default). Future races may customize all.
  readonly abilityMods: Readonly<{
    str: number;
    dex: number;
    con: number;
    int: number;
    wis: number;
    cha: number;
  }>;
  readonly size: 'small' | 'medium';
  // Movement base speed in meters per round (placeholder; can refine per race)
  readonly baseSpeedMps?: number;
  readonly allowedClasses?: readonly CharacterClassKey[]; // omission => all
}
export interface CharacterClassMeta {
  readonly key: CharacterClassKey;
  readonly hitDie: 'd6' | 'd8' | 'd10';
  readonly primaryAbilities: readonly string[];
  // Progression scaffolds (Phase 01 placeholders; filled/consumed in later phases / Items 4+)
  readonly baseAttackAtLevel?: readonly number[]; // index 0 => level 1
  readonly baseSaves?: readonly {
    death: number;
    wands: number;
    petrification: number;
    breath: number;
    spells: number;
  }[]; // index 0 => level 1
  readonly prerequisites?: readonly { ability: keyof AbilityScores; min?: number; max?: number }[];
}

export interface AbilityScores {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
}

export interface CharacterInit {
  name: string;
}

export interface CharacterDraft extends CharacterInit {
  race: CharacterRaceMeta;
  class: CharacterClassMeta;
  level: number;
  // Ability scores (rolled then adjusted). Placeholder zeros until rules populate.
  ability: AbilityScores;
  // Hit points (rolled later). Temporarily set to maxHitDie for continuity; will move to rolling rule.
  hp: number;
  // Max hit points (tracks growth). Introduced for morale woundedHalf trigger & healing ceilings.
  hpMax: number;
  xp: number;
  // Morale rating (2–12 typical) used for NPC/monster courage checks; PCs may ignore or set high.
  moraleRating?: number;
  // Faction used for morale triggers (ally/leader death, firstBlood). PCs default 'party'.
  faction?: string;
  status?: {
    dead?: boolean;
    unconscious?: boolean;
    stable?: boolean;
    isLeader?: boolean;
    moraleState?: string;
    nextMoraleCheckRound?: number;
  };
  stats: {
    initiative: { base: number };
    movement: { speedMps: number };
    baseAttack: number;
    saves: { death: number; wands: number; petrification: number; breath: number; spells: number };
  };
  inventory: string[]; // ItemId[] placeholder to avoid circular import
  equipped: { weapon?: string; armor?: string };
  encumbrance: { totalWeightKg: number };
}

export interface Character extends CharacterDraft {
  id: string;
  createdAt: number;
  updatedAt: number;
}

export type CharacterRaceKey = 'human' | 'dwarf';
export type CharacterClassKey = 'fighter' | 'cleric';

// Frozen meta objects
const human: CharacterRaceMeta = Object.freeze({
  key: 'human',
  abilityMods: Object.freeze({ str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }),
  size: 'medium',
  baseSpeedMps: 9.144, // 30 ft -> meters
});
const dwarf: CharacterRaceMeta = Object.freeze({
  key: 'dwarf',
  abilityMods: Object.freeze({ str: 0, dex: -1, con: 1, int: 0, wis: 0, cha: -1 }),
  size: 'medium',
  baseSpeedMps: 7.62, // 25 ft -> meters (approx 7.62m)
  allowedClasses: Object.freeze(['fighter', 'cleric'] as CharacterClassKey[]),
});

const fighter: CharacterClassMeta = Object.freeze({
  key: 'fighter',
  hitDie: 'd10',
  primaryAbilities: Object.freeze(['strength']),
  baseAttackAtLevel: Object.freeze([1]),
  baseSaves: Object.freeze([{ death: 12, wands: 13, petrification: 14, breath: 15, spells: 16 }]),
});
const cleric: CharacterClassMeta = Object.freeze({
  key: 'cleric',
  hitDie: 'd8',
  primaryAbilities: Object.freeze(['wisdom']),
  baseAttackAtLevel: Object.freeze([0]),
  baseSaves: Object.freeze([{ death: 10, wands: 12, petrification: 14, breath: 16, spells: 15 }]),
  prerequisites: Object.freeze([{ ability: 'wis' as keyof AbilityScores, min: 9 }]),
});

export const CharacterInitSchema = z.object({ name: z.string().min(1) });

// Derived draft validation (ensures structure) – race/class meta are trusted objects
export const CharacterRaceMetaSchema = z.object({
  key: z.enum(['human', 'dwarf']),
  abilityMods: z.object({
    str: z.number(),
    dex: z.number(),
    con: z.number(),
    int: z.number(),
    wis: z.number(),
    cha: z.number(),
  }),
  size: z.enum(['small', 'medium']),
  allowedClasses: z.array(z.enum(['fighter', 'cleric'])).optional(),
});
export const CharacterClassMetaSchema = z.object({
  key: z.enum(['fighter', 'cleric']),
  hitDie: z.enum(['d6', 'd8', 'd10']),
  primaryAbilities: z.array(z.string()),
  baseAttackAtLevel: z.array(z.number()).optional(),
  baseSaves: z
    .array(
      z.object({
        death: z.number(),
        wands: z.number(),
        petrification: z.number(),
        breath: z.number(),
        spells: z.number(),
      })
    )
    .optional(),
  prerequisites: z
    .array(
      z.object({
        ability: z.enum(['str', 'dex', 'con', 'int', 'wis', 'cha']),
        min: z.number().optional(),
        max: z.number().optional(),
      })
    )
    .optional(),
});
export const CharacterDraftSchema: z.ZodType<CharacterDraft> = z.object({
  name: z.string().min(1),
  race: CharacterRaceMetaSchema,
  class: CharacterClassMetaSchema,
  level: z.number().int().min(1),
  ability: z.object({
    str: z.number().int(),
    dex: z.number().int(),
    con: z.number().int(),
    int: z.number().int(),
    wis: z.number().int(),
    cha: z.number().int(),
  }),
  hp: z.number().int().min(0), // may start at 0 until rules compute
  hpMax: z.number().int().min(0),
  xp: z.number().int().min(0),
  moraleRating: z.number().int().min(2).max(12).optional(),
  faction: z.string().optional(),
  status: z
    .object({
      dead: z.boolean().optional(),
      unconscious: z.boolean().optional(),
      stable: z.boolean().optional(),
      isLeader: z.boolean().optional(),
      moraleState: z.string().optional(),
      nextMoraleCheckRound: z.number().int().optional(),
    })
    .optional(),
  stats: z.object({
    initiative: z.object({ base: z.number().int() }),
    movement: z.object({ speedMps: z.number() }),
    baseAttack: z.number().int(),
    saves: z.object({
      death: z.number().int(),
      wands: z.number().int(),
      petrification: z.number().int(),
      breath: z.number().int(),
      spells: z.number().int(),
    }),
  }),
  inventory: z.array(z.string()),
  equipped: z.object({ weapon: z.string().optional(), armor: z.string().optional() }),
  encumbrance: z.object({ totalWeightKg: z.number() }),
});

function maxHitDie(die: CharacterClassMeta['hitDie']): number {
  switch (die) {
    case 'd6':
      return 6;
    case 'd8':
      return 8;
    case 'd10':
      return 10;
  }
}

export function prepare(
  race: CharacterRaceMeta,
  klass: CharacterClassMeta,
  input: Partial<CharacterInit>
): CharacterDraft {
  const parsed = CharacterInitSchema.parse(input);
  // Placeholder ability scores all 0; rules (Items 1-2) will populate and adjust.
  const zeroAbility: AbilityScores = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
  const draft: CharacterDraft = Object.freeze({
    name: parsed.name,
    race,
    class: klass,
    level: 1,
    ability: zeroAbility,
    hp: maxHitDie(klass.hitDie), // temporary until HP rolling rule introduced
    hpMax: maxHitDie(klass.hitDie),
    xp: 0,
    moraleRating: 10, // default average morale
    faction: 'party',
    status: Object.freeze({
      dead: false,
      unconscious: false,
      stable: true,
      isLeader: false,
      moraleState: 'hold',
    }),
    stats: {
      initiative: { base: 0 },
      movement: { speedMps: race.baseSpeedMps ?? 9 },
      baseAttack: klass.baseAttackAtLevel?.[0] ?? 0,
      saves: klass.baseSaves?.[0] ?? { death: 0, wands: 0, petrification: 0, breath: 0, spells: 0 },
    },
    inventory: [],
    equipped: {},
    encumbrance: { totalWeightKg: 0 },
  });
  const validated = CharacterDraftSchema.parse(draft);
  return Object.freeze(validated);
}

// Phase 07 – Flattened character catalog access finalized: direct top-level meta only.
// Legacy nested containers fully removed.
/**
 * Character catalog – flattened meta & helpers.
 */
export const character = Object.freeze({
  human,
  dwarf,
  fighter,
  cleric,
  prepare,
  // Phase 01 Item 2: racial adjustments utility (pure, immutable)
  applyRacialAdjustments(base: AbilityScores, race: CharacterRaceMeta): AbilityScores {
    const adj: AbilityScores = {
      str: base.str + race.abilityMods.str,
      dex: base.dex + race.abilityMods.dex,
      con: base.con + race.abilityMods.con,
      int: base.int + race.abilityMods.int,
      wis: base.wis + race.abilityMods.wis,
      cha: base.cha + race.abilityMods.cha,
    };
    return Object.freeze(adj);
  },
});

// Removed legacy alias export (catalog) – flattened API finalized.

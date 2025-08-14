// Phase 2: Entities domain consolidation (character only for now)
import { z } from 'zod';

export interface CharacterRaceMeta {
  readonly key: CharacterRaceKey;
  readonly abilityMods: { readonly str: number; readonly dex: number };
  readonly size: 'small' | 'medium';
}
export interface CharacterClassMeta {
  readonly key: CharacterClassKey;
  readonly hitDie: 'd6' | 'd8' | 'd10';
  readonly primaryAbilities: readonly string[];
}

export interface CharacterInit {
  name: string;
}
export interface CharacterDraft extends CharacterInit {
  race: CharacterRaceMeta;
  class: CharacterClassMeta;
  level: number;
  hp: number;
  xp: number;
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
  abilityMods: Object.freeze({ str: 0, dex: 0 }),
  size: 'medium',
});
const dwarf: CharacterRaceMeta = Object.freeze({
  key: 'dwarf',
  abilityMods: Object.freeze({ str: 0, dex: -1 }),
  size: 'medium',
});

const fighter: CharacterClassMeta = Object.freeze({
  key: 'fighter',
  hitDie: 'd10',
  primaryAbilities: Object.freeze(['strength']),
});
const cleric: CharacterClassMeta = Object.freeze({
  key: 'cleric',
  hitDie: 'd8',
  primaryAbilities: Object.freeze(['wisdom']),
});

export const CharacterInitSchema = z.object({ name: z.string().min(1) });

// Derived draft validation (ensures structure) – race/class meta are trusted objects
export const CharacterRaceMetaSchema = z.object({
  key: z.enum(['human', 'dwarf']),
  abilityMods: z.object({ str: z.number(), dex: z.number() }),
  size: z.enum(['small', 'medium']),
});
export const CharacterClassMetaSchema = z.object({
  key: z.enum(['fighter', 'cleric']),
  hitDie: z.enum(['d6', 'd8', 'd10']),
  primaryAbilities: z.array(z.string()),
});
export const CharacterDraftSchema: z.ZodType<CharacterDraft> = z.object({
  name: z.string().min(1),
  race: CharacterRaceMetaSchema,
  class: CharacterClassMetaSchema,
  level: z.number().int().min(1),
  hp: z.number().int().min(1),
  xp: z.number().int().min(0),
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
  const draft: CharacterDraft = Object.freeze({
    name: parsed.name,
    race,
    class: klass,
    level: 1,
    hp: maxHitDie(klass.hitDie),
    xp: 0,
  });
  // Validate structural shape (returns a clone) then freeze again to ensure immutability
  const validated = CharacterDraftSchema.parse(draft);
  return Object.freeze(validated);
}

// Phase 07 – Flattened character catalog access:
// Expose race & class meta directly at top-level (e.g. engine.entities.character.human)
// while keeping legacy nested containers for backward compatibility.
/**
 * Character catalog – flattened. Access meta via top-level keys (preferred) or legacy containers.
 */
export const character = Object.freeze({
  human,
  dwarf,
  fighter,
  cleric,
  prepare,
});

// Removed legacy alias export (catalog) – flattened API finalized.

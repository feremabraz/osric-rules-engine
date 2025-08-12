import { SavingThrowValidator } from '@osric/commands/character/validators/SavingThrowValidator';
import { TurnUndeadValidator } from '@osric/commands/character/validators/TurnUndeadValidator';
import { AttackValidator } from '@osric/commands/combat/validators/AttackValidator';
import { GrappleValidator } from '@osric/commands/combat/validators/GrappleValidator';
import { InitiativeValidator } from '@osric/commands/combat/validators/InitiativeValidator';
import { ForagingValidator } from '@osric/commands/exploration/validators/ForagingValidator';
import { MoveValidator } from '@osric/commands/exploration/validators/MoveValidator';
import { TerrainNavigationValidator } from '@osric/commands/exploration/validators/TerrainNavigationValidator';
import { ReactionRollValidator } from '@osric/commands/npc/validators/ReactionRollValidator';
import { SpellResearchValidator } from '@osric/commands/spells/validators/SpellResearchValidator';
import type { Validator } from '@osric/core/ValidationPrimitives';
import type { ValidationResult } from '@osric/types';
import { SAVING_THROW_TYPES } from '@osric/types/commands';
import { describe, expect, it } from 'vitest';

// Utility to run a validator via ValidationPrimitives.toValidationResult-like shape
function runValidator<P>(validator: Validator<P>, params: P): ValidationResult {
  const res = validator.validate(params);
  return {
    valid: res.valid,
    errors: res.errors.map((e) => (e.field ? `${e.field}: ${e.message}` : e.message)),
  };
}

describe('Centralized Validators (selected)', () => {
  it('MoveValidator: happy path', () => {
    const params = {
      characterId: 'c1',
      movement: { type: 'walk' as const, distance: 30, direction: 'N' },
      terrain: { type: 'Normal' as const, environment: 'dungeon' },
      timeScale: 'exploration' as const,
    };
    const res = runValidator(MoveValidator, params);
    expect(res.valid).toBe(true);
    expect(res.errors).toHaveLength(0);
  });

  it('MoveValidator: invalid movement.type and distance', () => {
    const params = {
      characterId: 'c1',
      movement: { type: 'teleport', distance: -5 },
      terrain: { type: 'Unknown', environment: 'dungeon' },
      timeScale: 'foobar',
    } as unknown as Parameters<typeof MoveValidator.validate>[0];
    const res = runValidator(MoveValidator, params);
    expect(res.valid).toBe(false);
    // Should include errors for type, distance, terrain.type, and timeScale
    const joined = res.errors.join(' | ');
    expect(joined).toMatch(/movement.type/);
    expect(joined).toMatch(/movement.distance/);
    expect(joined).toMatch(/terrain.type/);
    expect(joined).toMatch(/timeScale/);
  });

  it('AttackValidator: happy path with optional fields', () => {
    const params = {
      attackerId: 'a1',
      targetId: 't1',
      attackType: 'normal' as const,
      situationalModifiers: 2,
      isChargedAttack: false,
    };
    const res = runValidator(AttackValidator, params);
    expect(res.valid).toBe(true);
  });

  it('ReactionRollValidator: requires interactionType and bounds modifiers', () => {
    const ok = runValidator(ReactionRollValidator, {
      characterId: 'c1',
      targetId: 't1',
      interactionType: 'negotiation',
      modifiers: { gifts: 1, threats: 0 },
    });
    expect(ok.valid).toBe(true);

    const bad = runValidator(ReactionRollValidator, {
      characterId: 'c1',
      targetId: 't1',
      interactionType: 'unknown',
      modifiers: { gifts: 'x' },
    } as unknown);
    expect(bad.valid).toBe(false);
    const joined = bad.errors.join(' | ');
    expect(joined).toMatch(/interactionType/);
    expect(joined).toMatch(/modifiers.gifts/);
  });

  it('SpellResearchValidator: checks types and enumerations', () => {
    const ok = runValidator(SpellResearchValidator, {
      characterId: 'wiz',
      spellLevel: 3,
      spellName: 'Frost Dart',
      spellDescription: 'A shard of ice.',
      researchType: 'magic-user',
      timeInWeeks: 4,
      costInGold: 0,
      specialMaterials: [{ name: 'Crystal shard', cost: 100, rarity: 'rare' }],
      mentorAvailable: false,
      libraryQuality: 'good',
    });
    expect(ok.valid).toBe(true);

    const bad = runValidator(SpellResearchValidator, {
      characterId: 'wiz',
      spellLevel: 0,
      spellName: '',
      spellDescription: '',
      researchType: 'bard',
      specialMaterials: [{ name: 'X', cost: 'a lot', rarity: 'legendary' }],
      libraryQuality: 'amazing',
    } as unknown);
    expect(bad.valid).toBe(false);
    const joined = bad.errors.join(' | ');
    expect(joined).toMatch(/spellLevel/);
    expect(joined).toMatch(/spellName/);
    expect(joined).toMatch(/spellDescription/);
    expect(joined).toMatch(/researchType/);
    expect(joined).toMatch(/specialMaterials/);
    expect(joined).toMatch(/libraryQuality/);
  });

  it('TurnUndeadValidator: enforces targetUndeadIds and optional modifiers', () => {
    const ok = runValidator(TurnUndeadValidator, {
      characterId: 'cleric1',
      targetUndeadIds: ['u1', 'u2'],
      situationalModifiers: { holySymbolBonus: 2, alignment: 'good', isEvil: false },
      massAttempt: false,
    });
    expect(ok.valid).toBe(true);

    const bad = runValidator(TurnUndeadValidator, {
      characterId: 'cleric1',
      targetUndeadIds: [],
      situationalModifiers: { holySymbolBonus: 9, alignment: 'chaotic' },
    } as unknown);
    expect(bad.valid).toBe(false);
    const joined = bad.errors.join(' | ');
    expect(joined).toMatch(/targetUndeadIds/);
    expect(joined).toMatch(/holySymbolBonus/);
    expect(joined).toMatch(/alignment/);
  });

  describe('SavingThrowValidator: enum and range checks (table-driven)', () => {
    // Base params (fill required fields minimally)
    const base = {
      characterId: 'ch1',
      saveType: SAVING_THROW_TYPES[0] as (typeof SAVING_THROW_TYPES)[number],
    } satisfies Parameters<typeof SavingThrowValidator.validate>[0];

    it('accepts all valid saveType values', () => {
      for (const st of SAVING_THROW_TYPES) {
        const params = { ...base, saveType: st } as Parameters<
          typeof SavingThrowValidator.validate
        >[0];
        const res = runValidator(SavingThrowValidator, params);
        expect(res.valid).toBe(true);
      }
    });

    it('rejects invalid saveType and out-of-range targetNumber', () => {
      const invalidType = {
        ...base,
        saveType: 'INVALID' as unknown as (typeof SAVING_THROW_TYPES)[number],
      };
      const res1 = runValidator(SavingThrowValidator, invalidType);
      expect(res1.valid).toBe(false);
      expect(res1.errors.join(' | ')).toMatch(/saveType/);

      const tooHighTN = { ...base, targetNumber: 30 } as Parameters<
        typeof SavingThrowValidator.validate
      >[0];
      const res2 = runValidator(SavingThrowValidator, tooHighTN);
      expect(res2.valid).toBe(false);
      expect(res2.errors.join(' | ')).toMatch(/targetNumber/);
    });
  });

  describe('ForagingValidator: enums and integers', () => {
    it('happy path', () => {
      const params = {
        characterId: 'c1',
        forageType: 'both' as const,
        terrain: 'forest',
        season: 'summer' as const,
        timeSpent: 6,
        groupSize: 3,
        hasForagingTools: true,
      } as Parameters<typeof ForagingValidator.validate>[0];
      const res = runValidator(ForagingValidator, params);
      expect(res.valid).toBe(true);
    });

    it('invalid season and negative time', () => {
      const bad = {
        characterId: 'c1',
        forageType: 'food' as const,
        terrain: 'plains',
        season: 'rainy' as unknown as 'spring',
        timeSpent: -1,
        groupSize: 0,
        hasForagingTools: false,
      } as unknown as Parameters<typeof ForagingValidator.validate>[0];
      const res = runValidator(ForagingValidator, bad);
      expect(res.valid).toBe(false);
      const j = res.errors.join(' | ');
      expect(j).toMatch(/season/);
      expect(j).toMatch(/timeSpent/);
    });
  });

  describe('TerrainNavigationValidator: table-driven enums and ranges', () => {
    const base = {
      characterId: 'c1',
      terrainType: {
        name: 'Hills',
        movementModifier: 1,
        gettingLostChance: 10,
        visibilityDistance: 120,
      },
      distance: 24,
      navigationMethod: 'compass' as const,
      hasMap: true,
      timeOfDay: 'day' as const,
    } as Parameters<typeof TerrainNavigationValidator.validate>[0];

    it('happy path', () => {
      const res = runValidator(TerrainNavigationValidator, base);
      expect(res.valid).toBe(true);
    });

    it('boundary ranges for movementModifier, gettingLostChance, visibilityDistance, distance', () => {
      for (const mm of [0, 2]) {
        const res = runValidator(TerrainNavigationValidator, {
          ...base,
          terrainType: { ...base.terrainType, movementModifier: mm },
        });
        expect(res.valid).toBe(true);
      }
      for (const glc of [0, 100]) {
        const res = runValidator(TerrainNavigationValidator, {
          ...base,
          terrainType: { ...base.terrainType, gettingLostChance: glc },
        });
        expect(res.valid).toBe(true);
      }
      const bad1 = runValidator(TerrainNavigationValidator, {
        ...base,
        terrainType: { ...base.terrainType, movementModifier: -1 },
      });
      expect(bad1.valid).toBe(false);
      const bad2 = runValidator(TerrainNavigationValidator, {
        ...base,
        terrainType: { ...base.terrainType, gettingLostChance: 101 },
      });
      expect(bad2.valid).toBe(false);
      const bad3 = runValidator(TerrainNavigationValidator, { ...base, distance: -1 });
      expect(bad3.valid).toBe(false);
      const bad4 = runValidator(TerrainNavigationValidator, {
        ...base,
        terrainType: { ...base.terrainType, visibilityDistance: -5 },
      });
      expect(bad4.valid).toBe(false);
    });

    it('enum checks for navigationMethod and timeOfDay', () => {
      const validNM = runValidator(TerrainNavigationValidator, {
        ...base,
        navigationMethod: 'stars',
      });
      expect(validNM.valid).toBe(true);
      const invalidNM = runValidator(TerrainNavigationValidator, {
        ...base,
        navigationMethod: 'gps' as unknown as 'stars',
      });
      expect(invalidNM.valid).toBe(false);

      const validTOD = runValidator(TerrainNavigationValidator, { ...base, timeOfDay: 'night' });
      expect(validTOD.valid).toBe(true);
      const invalidTOD = runValidator(TerrainNavigationValidator, {
        ...base,
        timeOfDay: 'noon' as unknown as 'day',
      });
      expect(invalidTOD.valid).toBe(false);
    });
  });

  describe('GrappleValidator: enums and optionals', () => {
    it('happy path', () => {
      const params = {
        attackerId: 'a1',
        targetId: 't1',
        grappleType: 'standard' as const,
        isChargedAttack: false,
      } as Parameters<typeof GrappleValidator.validate>[0];
      const res = runValidator(GrappleValidator, params);
      expect(res.valid).toBe(true);
    });

    it('invalid grappleType', () => {
      const bad = {
        attackerId: 'a1',
        targetId: 't1',
        grappleType: 'bear-hug',
      } as unknown as Parameters<typeof GrappleValidator.validate>[0];
      const res = runValidator(GrappleValidator, bad);
      expect(res.valid).toBe(false);
      expect(res.errors.join(' | ')).toMatch(/grappleType/);
    });
  });

  describe('InitiativeValidator: entities and initiativeType', () => {
    it('happy path', () => {
      const ok = runValidator(InitiativeValidator, {
        entities: ['c1', 'c2'],
        initiativeType: 'group' as const,
      } as Parameters<typeof InitiativeValidator.validate>[0]);
      expect(ok.valid).toBe(true);
    });

    it('requires non-empty entities and valid type', () => {
      const bad = runValidator(InitiativeValidator, {
        entities: [],
        initiativeType: 'party',
      } as unknown as Parameters<typeof InitiativeValidator.validate>[0]);
      expect(bad.valid).toBe(false);
      const j = bad.errors.join(' | ');
      expect(j).toMatch(/entities/);
      expect(j).toMatch(/initiativeType/);
    });
  });
});

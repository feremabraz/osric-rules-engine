import {
  checkDiseaseResistance,
  checkPoisonResistance,
  createDisease,
  createPoison,
} from '@rules/exploration/disease';
import type {
  Disease,
  DiseaseResistanceCheck,
  DiseaseType,
  Poison,
  PoisonResistanceCheck,
} from '@rules/exploration/types';
import type { Character } from '@rules/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the dice roll function
vi.mock('@rules/utils/dice', () => ({
  roll: vi.fn(),
}));

// Import the mocked dice module
const diceModule = await import('@rules/utils/dice');
const roll = vi.mocked(diceModule.roll);

describe('Disease and Poison Systems', () => {
  // Reset mocks before each test
  beforeEach(() => {
    vi.resetAllMocks();
  });

  // Sample character for testing
  const testCharacter: Character = {
    id: 'test-character',
    name: 'Test Character',
    race: 'Human',
    class: 'Fighter',
    level: 5,
    abilities: {
      strength: 10,
      dexterity: 10,
      constitution: 14, // Good constitution
      intelligence: 10,
      wisdom: 10,
      charisma: 10,
    },
    abilityModifiers: {
      constitutionPoisonSave: 1, // +1 saves vs poison/disease
    },
    alignment: 'Neutral Good',
  } as Character;

  // Sample disease for testing
  const testDisease: Disease = {
    name: 'Test Plague',
    type: 'Plague',
    incubationPeriod: 2,
    duration: 14,
    abilityPenalties: {
      strength: -2,
      constitution: -2,
    },
    savingThrowModifier: 0,
    deathChance: 10,
    symptoms: ['Fever', 'Weakness'],
    treatmentOptions: ['Bed rest', 'Herbal remedy'],
  };

  // Sample poison for testing
  const testPoison: Poison = {
    name: 'Test Venom',
    type: 'Injected',
    onset: 1,
    damage: '2d6',
    secondaryDamage: '1d6',
    savingThrowModifier: 0,
    duration: 6,
    symptoms: ['Pain', 'Swelling'],
    antidotes: ['Antivenom'],
    halfLifeOutsideContainer: 24,
  };

  describe('createDisease', () => {
    it('should create a disease with all specified properties', () => {
      const disease = createDisease(
        'Red Plague',
        'Plague',
        3,
        21,
        { strength: -3, dexterity: -2 },
        2,
        15,
        ['High fever', 'Red splotches on skin'],
        ['Quarantine', 'Healing magic']
      );

      expect(disease).toEqual({
        name: 'Red Plague',
        type: 'Plague',
        incubationPeriod: 3,
        duration: 21,
        abilityPenalties: { strength: -3, dexterity: -2 },
        savingThrowModifier: 2,
        deathChance: 15,
        symptoms: ['High fever', 'Red splotches on skin'],
        treatmentOptions: ['Quarantine', 'Healing magic'],
      });
    });
  });

  describe('createPoison', () => {
    it('should create a poison with all specified properties', () => {
      const poison = createPoison(
        'Spider Venom',
        'Injected',
        2,
        '1d8',
        null,
        3,
        4,
        ['Paralysis', 'Pain'],
        ['Spider Antivenom'],
        12
      );

      expect(poison).toEqual({
        name: 'Spider Venom',
        type: 'Injected',
        onset: 2,
        damage: '1d8',
        secondaryDamage: null,
        savingThrowModifier: 3,
        duration: 4,
        symptoms: ['Paralysis', 'Pain'],
        antidotes: ['Spider Antivenom'],
        halfLifeOutsideContainer: 12,
      });
    });
  });

  describe('checkDiseaseResistance', () => {
    it('should pass the resistance check when save roll is high enough', () => {
      // Mock the d20 roll to be high (20)
      roll.mockReturnValue(20);

      const check: DiseaseResistanceCheck = {
        character: testCharacter,
        disease: testDisease,
        modifiers: {
          magicalAid: false,
          healerAssistance: false,
          previousExposure: false,
          constitutionAdjustment: 0,
        },
      };

      const result = checkDiseaseResistance(check);

      expect(roll).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.effectApplied).toBe(false);
      expect(result.statusEffects).toHaveLength(0);
    });

    it('should fail the resistance check when save roll is too low', () => {
      // Mock the d20 roll to be low (1)
      roll.mockReturnValue(1);

      const check: DiseaseResistanceCheck = {
        character: testCharacter,
        disease: testDisease,
        modifiers: {
          magicalAid: false,
          healerAssistance: false,
          previousExposure: false,
          constitutionAdjustment: 0,
        },
      };

      const result = checkDiseaseResistance(check);

      expect(roll).toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.effectApplied).toBe(true);
      expect(result.statusEffects.length).toBeGreaterThan(0);
      expect(result.duration).toBe(testDisease.duration);
    });

    it('should apply modifiers properly to the saving throw target', () => {
      // We'll test this by making a series of rolls with different modifiers
      // and verify that the success/failure changes appropriately

      // First test without modifiers, roll exactly at the threshold
      roll.mockReturnValue(15); // Assuming 15 is around the default DC after character's con bonus

      // Now test with positive modifiers (should make it easier to save)
      const positiveCheck: DiseaseResistanceCheck = {
        character: testCharacter,
        disease: testDisease,
        modifiers: {
          magicalAid: true, // -4 to DC
          healerAssistance: true, // -2 to DC
          previousExposure: true, // -4 to DC
          constitutionAdjustment: 0,
        },
      };

      const positiveResult = checkDiseaseResistance(positiveCheck);

      // With all those bonuses, the same roll should now succeed
      expect(positiveResult.success).toBe(true);

      // Now test with negative modifiers (harder to save)
      roll.mockReturnValue(18); // High roll that would normally succeed

      const negativeCheck: DiseaseResistanceCheck = {
        character: testCharacter,
        disease: {
          ...testDisease,
          savingThrowModifier: 5, // Harder disease to resist
        },
        modifiers: {
          magicalAid: false,
          healerAssistance: false,
          previousExposure: false,
          constitutionAdjustment: 2, // Negative con adjustment
        },
      };

      const negativeResult = checkDiseaseResistance(negativeCheck);
      expect(negativeResult.success).toBe(false);
    });

    it('should include disease symptoms in status effects on failure', () => {
      roll.mockReturnValue(1); // Guarantee failure

      const disease: Disease = {
        ...testDisease,
        symptoms: ['Test Symptom 1', 'Test Symptom 2'],
      };

      const check: DiseaseResistanceCheck = {
        character: testCharacter,
        disease,
        modifiers: {
          magicalAid: false,
          healerAssistance: false,
          previousExposure: false,
          constitutionAdjustment: 0,
        },
      };

      const result = checkDiseaseResistance(check);

      expect(result.statusEffects).toContain('Test Symptom 1');
      expect(result.statusEffects).toContain('Test Symptom 2');
    });

    it('should check for fatal result with plague type diseases', () => {
      roll.mockReturnValue(1); // Ensure disease resistance fails

      // Mock the plague death check to return true (fatal)
      roll.mockReturnValueOnce(8).mockReturnValueOnce(8);

      const check: DiseaseResistanceCheck = {
        character: testCharacter,
        disease: {
          ...testDisease,
          type: 'Plague',
          deathChance: 50,
        },
        modifiers: {
          magicalAid: false,
          healerAssistance: false,
          previousExposure: false,
          constitutionAdjustment: 0,
        },
      };

      const result = checkDiseaseResistance(check);

      expect(result.statusEffects).toContain('Fatal infection');
    });
  });

  describe('checkPoisonResistance', () => {
    it('should pass the resistance check when save roll is high enough', () => {
      // Mock the d20 roll to be high (20)
      roll.mockReturnValue(20);

      const check: PoisonResistanceCheck = {
        character: testCharacter,
        poison: testPoison,
        modifiers: {
          antidoteAdministered: false,
          magicalProtection: false,
          constitutionAdjustment: 0,
          timeElapsedSinceExposure: 0,
        },
      };

      const result = checkPoisonResistance(check);

      expect(roll).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.effectApplied).toBe(false);
      expect(result.statusEffects).toHaveLength(0);
    });

    it('should fail the resistance check when save roll is too low', () => {
      // Mock the d20 roll to be low (1)
      roll.mockReturnValue(1);

      const check: PoisonResistanceCheck = {
        character: testCharacter,
        poison: testPoison,
        modifiers: {
          antidoteAdministered: false,
          magicalProtection: false,
          constitutionAdjustment: 0,
          timeElapsedSinceExposure: 0,
        },
      };

      const result = checkPoisonResistance(check);

      expect(roll).toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.effectApplied).toBe(true);
      expect(result.statusEffects.length).toBeGreaterThan(0);
      expect(result.duration).toBe(testPoison.duration);
    });

    it('should apply modifiers properly to the saving throw target', () => {
      // First test without modifiers, roll exactly at the threshold
      roll.mockReturnValue(15);

      // Now test with positive modifiers (should make it easier to save)
      const positiveCheck: PoisonResistanceCheck = {
        character: testCharacter,
        poison: testPoison,
        modifiers: {
          antidoteAdministered: true, // -6 to DC
          magicalProtection: true, // -4 to DC
          constitutionAdjustment: 0,
          timeElapsedSinceExposure: 0,
        },
      };

      const positiveResult = checkPoisonResistance(positiveCheck);

      // With all those bonuses, the same roll should now succeed
      expect(positiveResult.success).toBe(true);
    });

    it('should handle poison degradation over time', () => {
      roll.mockReturnValue(14); // Roll that would normally fail

      // Wait for a full half-life period (24 hours) to ensure degradation
      const degradedCheck: PoisonResistanceCheck = {
        character: testCharacter,
        poison: testPoison,
        modifiers: {
          antidoteAdministered: false,
          magicalProtection: false,
          constitutionAdjustment: 0,
          timeElapsedSinceExposure: 1440, // 24 hours (1 full half-life)
        },
      };

      const degradedResult = checkPoisonResistance(degradedCheck);

      // The degraded poison should be easier to resist
      expect(degradedResult.success).toBe(true);
    });

    it('should handle deadly poisons correctly', () => {
      roll.mockReturnValue(1); // Guarantee failure

      const deadlyPoison: Poison = {
        ...testPoison,
        damage: 'death',
      };

      const check: PoisonResistanceCheck = {
        character: testCharacter,
        poison: deadlyPoison,
        modifiers: {
          antidoteAdministered: false,
          magicalProtection: false,
          constitutionAdjustment: 0,
          timeElapsedSinceExposure: 0,
        },
      };

      const result = checkPoisonResistance(check);

      expect(result.damage).toBeNull(); // No direct damage for deadly poisons
      expect(result.statusEffects.some((effect) => effect.includes('Fatal poison'))).toBe(true);
    });

    it('should include poison symptoms in status effects on failure', () => {
      roll.mockReturnValue(1); // Guarantee failure

      const poison: Poison = {
        ...testPoison,
        symptoms: ['Test Symptom 1', 'Test Symptom 2'],
      };

      const check: PoisonResistanceCheck = {
        character: testCharacter,
        poison,
        modifiers: {
          antidoteAdministered: false,
          magicalProtection: false,
          constitutionAdjustment: 0,
          timeElapsedSinceExposure: 0,
        },
      };

      const result = checkPoisonResistance(check);

      expect(result.statusEffects).toContain('Test Symptom 1');
      expect(result.statusEffects).toContain('Test Symptom 2');
    });
  });
});

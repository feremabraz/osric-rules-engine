import {
  calculateBaseLoyalty,
  createLoyaltyRecord,
  getLoyaltyLevel,
  getLoyaltyModifiers,
  performLoyaltyCheck,
  updateLoyaltyRecord,
} from '@rules/npc/loyaltySystem';
import type {
  LoyaltyCheckParams,
  LoyaltyLevel,
  LoyaltyModifier,
  LoyaltyRecord,
} from '@rules/npc/loyaltySystem';
import type { Character } from '@rules/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the dice roll function
vi.mock('@rules/utils/dice', () => ({
  roll: vi.fn(),
}));

// Import the mocked dice module
const diceModule = await import('@rules/utils/dice');
const roll = vi.mocked(diceModule.roll);

describe('Loyalty System', () => {
  // Reset mocks before each test
  beforeEach(() => {
    vi.resetAllMocks();
  });

  // Sample characters for testing
  const testMaster: Character = {
    id: 'test-master',
    name: 'Test Master',
    race: 'Human',
    class: 'Fighter',
    level: 8,
    abilities: {
      strength: 14,
      dexterity: 12,
      constitution: 13,
      intelligence: 10,
      wisdom: 10,
      charisma: 16, // High charisma for better loyalty
    },
    abilityModifiers: {
      charismaLoyaltyBase: 15, // +15% to base loyalty
    },
    alignment: 'Lawful Good' as const,
  } as Character;

  const testHenchman: Character = {
    id: 'test-henchman',
    name: 'Test Henchman',
    race: 'Human',
    class: 'Fighter',
    level: 3,
    abilities: {
      strength: 13,
      dexterity: 12,
      constitution: 14,
      intelligence: 10,
      wisdom: 10,
      charisma: 10,
    },
    alignment: 'Lawful Neutral' as const,
  } as Character;

  describe('calculateBaseLoyalty', () => {
    it('should calculate base loyalty correctly for average charisma', () => {
      const averageCharismaMaster = {
        ...testMaster,
        abilities: { ...testMaster.abilities, charisma: 10 },
        abilityModifiers: { ...testMaster.abilityModifiers, charismaLoyaltyBase: 0 },
      };

      const loyalty = calculateBaseLoyalty(testHenchman, averageCharismaMaster);
      expect(loyalty).toBe(50); // Base loyalty without modifiers
    });

    it('should apply charisma modifier to base loyalty', () => {
      const loyalty = calculateBaseLoyalty(testHenchman, testMaster);
      expect(loyalty).toBe(65); // 50 base + 15 charisma mod
    });

    it('should apply alignment factors correctly', () => {
      // Same alignment - should get a bonus
      const sameAlignmentHenchman = {
        ...testHenchman,
        alignment: 'Lawful Good' as const,
      };
      const sameAlignmentLoyalty = calculateBaseLoyalty(sameAlignmentHenchman, testMaster);

      // Different but compatible alignment - should still get a bonus but smaller
      const compatibleAlignmentHenchman = {
        ...testHenchman,
        alignment: 'Lawful Neutral' as const,
      };
      const compatibleLoyalty = calculateBaseLoyalty(compatibleAlignmentHenchman, testMaster);

      // Opposing alignment - should get a penalty
      const opposingAlignmentHenchman = {
        ...testHenchman,
        alignment: 'Chaotic Evil' as const,
      };
      const opposingLoyalty = calculateBaseLoyalty(opposingAlignmentHenchman, testMaster);

      expect(sameAlignmentLoyalty).toBeGreaterThan(compatibleLoyalty);
      expect(compatibleLoyalty).toBeGreaterThan(opposingLoyalty);
    });

    it('should clamp loyalty between 1 and 100', () => {
      // Test extremely low loyalty scenario
      const badMaster = {
        ...testMaster,
        abilities: { ...testMaster.abilities, charisma: 3 },
        abilityModifiers: { ...testMaster.abilityModifiers, charismaLoyaltyBase: -30 },
        alignment: 'Chaotic Evil' as const,
      };

      const opposingAlignmentHenchman = {
        ...testHenchman,
        alignment: 'Lawful Good' as const,
      };

      const lowLoyalty = calculateBaseLoyalty(opposingAlignmentHenchman, badMaster);
      expect(lowLoyalty).toBeGreaterThanOrEqual(1);

      // Test extremely high loyalty scenario
      const greatMaster = {
        ...testMaster,
        abilities: { ...testMaster.abilities, charisma: 18 },
        abilityModifiers: { ...testMaster.abilityModifiers, charismaLoyaltyBase: 35 },
        alignment: 'Lawful Good' as const,
      };

      const perfectlyAlignedHenchman = {
        ...testHenchman,
        alignment: 'Lawful Good' as const,
      };

      const highLoyalty = calculateBaseLoyalty(perfectlyAlignedHenchman, greatMaster);
      expect(highLoyalty).toBeLessThanOrEqual(100);
    });
  });

  describe('getLoyaltyModifiers', () => {
    it('should return positive modifiers for good treatment', () => {
      const goodTreatment = {
        fairPayment: true,
        properEquipment: true,
        respectful: true,
        sharesMagicItems: true,
        providesTreatment: true,
        risky: false,
        lengthOfService: 12, // 1 year
      };

      const modifiers = getLoyaltyModifiers(goodTreatment);

      // Check that we have modifiers and they're mostly positive
      expect(modifiers.length).toBeGreaterThan(0);

      // Sum up the modifiers and check they're positive overall
      const totalModifier = modifiers.reduce((sum, mod) => sum + mod.value, 0);
      expect(totalModifier).toBeGreaterThan(0);

      // Check specific treatment factors
      const paymentMod = modifiers.find((mod) => mod.source === 'Payment');
      const equipmentMod = modifiers.find((mod) => mod.source === 'Equipment');
      const respectMod = modifiers.find((mod) => mod.source === 'Treatment');

      expect(paymentMod?.value).toBeGreaterThan(0);
      expect(equipmentMod?.value).toBeGreaterThan(0);
      expect(respectMod?.value).toBeGreaterThan(0);
    });

    it('should return negative modifiers for poor treatment', () => {
      const poorTreatment = {
        fairPayment: false,
        properEquipment: false,
        respectful: false,
        sharesMagicItems: false,
        providesTreatment: false,
        risky: true,
        lengthOfService: 1, // New henchman
      };

      const modifiers = getLoyaltyModifiers(poorTreatment);

      // Sum up the modifiers and check they're negative overall
      const totalModifier = modifiers.reduce((sum, mod) => sum + mod.value, 0);
      expect(totalModifier).toBeLessThan(0);

      // Check specific treatment factors
      const paymentMod = modifiers.find((mod) => mod.source === 'Payment');
      const equipmentMod = modifiers.find((mod) => mod.source === 'Equipment');
      const respectMod = modifiers.find((mod) => mod.source === 'Treatment');

      expect(paymentMod?.value).toBeLessThan(0);
      expect(equipmentMod?.value).toBeLessThan(0);
      expect(respectMod?.value).toBeLessThan(0);
    });

    it('should include length of service bonus for veteran henchmen', () => {
      const veteranTreatment = {
        fairPayment: true,
        properEquipment: true,
        respectful: true,
        sharesMagicItems: false,
        providesTreatment: false,
        risky: false,
        lengthOfService: 24, // 2 years
      };

      const modifiers = getLoyaltyModifiers(veteranTreatment);
      const serviceMod = modifiers.find((mod) => mod.source === 'Length of Service');

      expect(serviceMod).toBeDefined();
      expect(serviceMod?.value).toBeGreaterThan(0);
    });

    it('should include risk penalty for dangerous missions', () => {
      const riskyTreatment = {
        fairPayment: true,
        properEquipment: true,
        respectful: true,
        sharesMagicItems: false,
        providesTreatment: false,
        risky: true,
        lengthOfService: 6,
      };

      const modifiers = getLoyaltyModifiers(riskyTreatment);
      const riskMod = modifiers.find((mod) => mod.source === 'Danger');

      expect(riskMod).toBeDefined();
      expect(riskMod?.value).toBeLessThan(0);
    });
  });

  describe('performLoyaltyCheck', () => {
    it('should pass loyalty check when roll is below loyalty score', () => {
      // Mock a successful roll
      roll.mockReturnValue(40);

      const params: LoyaltyCheckParams = {
        henchman: testHenchman,
        master: testMaster,
        situation: 'Follow into dungeon',
        difficulty: 'Challenging',
      };

      const result = performLoyaltyCheck(params);

      expect(roll).toHaveBeenCalledWith(100);
      expect(result.success).toBe(true);
      expect(result.action).toContain('Agrees');
    });

    it('should fail loyalty check when roll is above loyalty score', () => {
      // Mock a failed roll
      roll.mockReturnValue(90);

      const params: LoyaltyCheckParams = {
        henchman: testHenchman,
        master: testMaster,
        situation: 'Follow into very dangerous area',
        difficulty: 'Hazardous',
      };

      const result = performLoyaltyCheck(params);

      expect(roll).toHaveBeenCalledWith(100);
      expect(result.success).toBe(false);
      expect(result.action).toContain('Refuses');
    });

    it('should apply difficulty modifiers to the check', () => {
      // We'll make the same roll for different difficulty levels
      roll.mockReturnValue(70);

      const routineParams: LoyaltyCheckParams = {
        henchman: testHenchman,
        master: testMaster,
        situation: 'Standard guard duty',
        difficulty: 'Routine',
      };

      const hazardousParams: LoyaltyCheckParams = {
        henchman: testHenchman,
        master: testMaster,
        situation: 'Dangerous mission',
        difficulty: 'Hazardous',
      };

      const extremeParams: LoyaltyCheckParams = {
        henchman: testHenchman,
        master: testMaster,
        situation: 'Likely suicide mission',
        difficulty: 'Extreme',
      };

      const routineResult = performLoyaltyCheck(routineParams);
      const hazardousResult = performLoyaltyCheck(hazardousParams);
      const extremeResult = performLoyaltyCheck(extremeParams);

      // Same roll should have different outcomes based on difficulty
      expect(routineResult.success).toBe(true); // Routine gets +10%
      expect(hazardousResult.success).toBe(false); // Hazardous gets -10%
      expect(extremeResult.success).toBe(false); // Extreme gets -25%

      // Verify the final scores reflect the modifiers
      expect(routineResult.finalScore).toBeGreaterThan(hazardousResult.finalScore);
      expect(hazardousResult.finalScore).toBeGreaterThan(extremeResult.finalScore);
    });

    it('should apply additional modifiers provided in parameters', () => {
      // Use mockImplementation to return different values for different calls
      roll
        .mockImplementationOnce(() => 70) // First call (without modifiers) returns 70 - should fail
        .mockImplementationOnce(() => 65); // Second call (with modifiers) returns 65 - should pass with the +15 bonus

      const customModifiers: LoyaltyModifier[] = [
        {
          value: 15,
          source: 'Recent Bonus',
          description: 'Recently received a significant bonus',
          permanent: false,
        },
      ];

      const paramsWithoutModifiers: LoyaltyCheckParams = {
        henchman: testHenchman,
        master: testMaster,
        situation: 'Guard dangerous area',
        difficulty: 'Hazardous',
      };

      const paramsWithModifiers: LoyaltyCheckParams = {
        ...paramsWithoutModifiers,
        modifiers: customModifiers,
      };

      const resultWithoutModifiers = performLoyaltyCheck(paramsWithoutModifiers);
      const resultWithModifiers = performLoyaltyCheck(paramsWithModifiers);

      // With +15 bonus, the second check should pass even with nearly the same roll
      expect(resultWithModifiers.finalScore).toBeGreaterThan(resultWithoutModifiers.finalScore);
      expect(resultWithModifiers.success).toBe(true);
      expect(resultWithoutModifiers.success).toBe(false);
    });
  });

  describe('getLoyaltyLevel', () => {
    it('should return correct loyalty levels for different score ranges', () => {
      expect(getLoyaltyLevel(0)).toBe('None');
      expect(getLoyaltyLevel(1)).toBe('Disloyal');
      expect(getLoyaltyLevel(25)).toBe('Disloyal');
      expect(getLoyaltyLevel(26)).toBe('Somewhat Loyal');
      expect(getLoyaltyLevel(50)).toBe('Somewhat Loyal');
      expect(getLoyaltyLevel(51)).toBe('Fairly Loyal');
      expect(getLoyaltyLevel(75)).toBe('Fairly Loyal');
      expect(getLoyaltyLevel(76)).toBe('Loyal');
      expect(getLoyaltyLevel(100)).toBe('Loyal');
      expect(getLoyaltyLevel(101)).toBe('Fanatical');
    });
  });

  describe('createLoyaltyRecord', () => {
    it('should create a valid loyalty record with correct properties', () => {
      const record = createLoyaltyRecord(testHenchman, testMaster);

      expect(record).toHaveProperty('npcId', testHenchman.id);
      expect(record).toHaveProperty('masterId', testMaster.id);
      expect(record).toHaveProperty('baseScore');
      expect(record).toHaveProperty('currentScore');
      expect(record).toHaveProperty('modifiers');
      expect(record).toHaveProperty('level');
      expect(record).toHaveProperty('lastChecked');
      expect(record).toHaveProperty('history');

      // Base score should be properly calculated
      expect(record.baseScore).toBeGreaterThan(0);

      // Initial current score should match base score
      expect(record.currentScore).toBe(record.baseScore);

      // Level should match the score
      expect(record.level).toBe(getLoyaltyLevel(record.currentScore));
    });
  });

  describe('updateLoyaltyRecord', () => {
    it('should update a loyalty record with new modifiers', () => {
      // Create a base record
      const initialRecord = createLoyaltyRecord(testHenchman, testMaster);

      // Add new modifiers
      const newModifiers: LoyaltyModifier[] = [
        {
          value: 10,
          source: 'Test Bonus',
          description: 'Bonus for loyalty test',
          permanent: true,
        },
      ];

      const updatedRecord = updateLoyaltyRecord(initialRecord, newModifiers);

      // Modifiers array should have the new modifier
      expect(updatedRecord.modifiers).toContainEqual(newModifiers[0]);

      // Current score should be updated
      expect(updatedRecord.currentScore).toBe(initialRecord.currentScore + 10);

      // Level should be updated if the score crosses a threshold
      expect(updatedRecord.level).toBe(getLoyaltyLevel(updatedRecord.currentScore));
    });

    it('should add an event to the history when provided', () => {
      const initialRecord = createLoyaltyRecord(testHenchman, testMaster);

      const event = {
        description: "Saved master's life",
        scoreChange: 15,
      };

      const updatedRecord = updateLoyaltyRecord(initialRecord, [], event);

      // History should have the initial entry plus the new one
      expect(updatedRecord.history).toHaveLength(2);
      expect(updatedRecord.history[1].description).toBe(event.description);
      expect(updatedRecord.history[1].scoreChange).toBe(event.scoreChange);

      // Current score should be updated
      expect(updatedRecord.currentScore).toBe(initialRecord.currentScore + event.scoreChange);
    });

    it('should handle both modifiers and events together', () => {
      const initialRecord = createLoyaltyRecord(testHenchman, testMaster);

      const newModifiers: LoyaltyModifier[] = [
        {
          value: 5,
          source: 'Bonus',
          description: 'Small bonus',
          permanent: true,
        },
      ];

      const event = {
        description: 'Received share of treasure',
        scoreChange: 5,
      };

      const updatedRecord = updateLoyaltyRecord(initialRecord, newModifiers, event);

      // Both modifiers and history should be updated
      expect(updatedRecord.modifiers).toContainEqual(newModifiers[0]);
      expect(updatedRecord.history).toHaveLength(2);

      // Current score should include both changes
      expect(updatedRecord.currentScore).toBe(initialRecord.currentScore + 10);
    });
  });
});

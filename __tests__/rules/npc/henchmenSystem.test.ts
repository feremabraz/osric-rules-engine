import {
  calculateOfferQuality,
  calculateRecruitmentCost,
  calculateRecruitmentEffectiveness,
  createHenchmanRelationship,
  recruitHenchmen,
} from '@rules/npc/henchmenSystem';
import type {
  HenchmanCandidate,
  HenchmanOffer,
  RecruitmentMethod,
  RecruitmentParams,
} from '@rules/npc/henchmenSystem';
import type { Character, Item } from '@rules/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the dice roll function
vi.mock('@rules/utils/dice', () => ({
  roll: vi.fn(),
}));

// Mock the loyaltySystem createLoyaltyRecord function
vi.mock('@rules/npc/loyaltySystem', () => ({
  createLoyaltyRecord: vi.fn().mockImplementation(() => ({
    npcId: 'test-henchman',
    masterId: 'test-master',
    baseScore: 50,
    currentScore: 50,
    modifiers: [],
    level: 'Fairly Loyal',
    lastChecked: Date.now(),
    history: [],
  })),
}));

// Import the mocked dice module
const diceModule = await import('@rules/utils/dice');
const roll = vi.mocked(diceModule.roll);

describe('Henchmen System', () => {
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
      charisma: 16, // High charisma for better henchmen relations
    },
    abilityModifiers: {},
    alignment: 'Lawful Good',
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
    abilityModifiers: {},
    alignment: 'Neutral Good',
  } as Character;

  describe('calculateRecruitmentCost', () => {
    it('should calculate basic recruitment costs correctly', () => {
      const methods: RecruitmentMethod[] = [
        'Tavern',
        'Guild',
        'Crier',
        'Notice',
        'Agent',
        'Recommendation',
      ];

      // Test each method with Average location
      const costs = methods.map((method) => calculateRecruitmentCost(method, 'Average'));

      // Verify relative costs match expected pattern
      expect(costs).toEqual([5, 50, 15, 10, 100, 25]);
    });

    it('should adjust costs based on location quality', () => {
      const method: RecruitmentMethod = 'Guild';
      const poorCost = calculateRecruitmentCost(method, 'Poor');
      const averageCost = calculateRecruitmentCost(method, 'Average');
      const goodCost = calculateRecruitmentCost(method, 'Good');
      const excellentCost = calculateRecruitmentCost(method, 'Excellent');

      // Verify location multipliers apply correctly
      expect(poorCost).toBeLessThan(averageCost);
      expect(averageCost).toBeLessThan(goodCost);
      expect(goodCost).toBeLessThan(excellentCost);

      // Verify specific multipliers
      expect(poorCost).toEqual(averageCost * 0.5);
      expect(goodCost).toEqual(averageCost * 1.5);
      expect(excellentCost).toEqual(averageCost * 2.5);
    });
  });

  describe('calculateRecruitmentEffectiveness', () => {
    it('should calculate base effectiveness correctly', () => {
      const baseParams: RecruitmentParams = {
        recruitingCharacter: testMaster,
        recruitmentMethod: 'Guild',
        locationQuality: 'Average',
        timeInvested: 3,
        goldInvested: 50,
        charismaAdjustment: 0,
      };

      const effectiveness = calculateRecruitmentEffectiveness(baseParams);
      expect(effectiveness).toBeGreaterThan(0);
      expect(effectiveness).toBeLessThanOrEqual(95);
    });

    it('should adjust effectiveness based on location quality', () => {
      const baseParams: RecruitmentParams = {
        recruitingCharacter: testMaster,
        recruitmentMethod: 'Guild',
        locationQuality: 'Average',
        timeInvested: 3,
        goldInvested: 50,
        charismaAdjustment: 0,
      };

      const poorEffectiveness = calculateRecruitmentEffectiveness({
        ...baseParams,
        locationQuality: 'Poor',
      });
      const averageEffectiveness = calculateRecruitmentEffectiveness({
        ...baseParams,
        locationQuality: 'Average',
      });
      const goodEffectiveness = calculateRecruitmentEffectiveness({
        ...baseParams,
        locationQuality: 'Good',
      });
      const excellentEffectiveness = calculateRecruitmentEffectiveness({
        ...baseParams,
        locationQuality: 'Excellent',
      });

      expect(poorEffectiveness).toBeLessThan(averageEffectiveness);
      expect(averageEffectiveness).toBeLessThan(goodEffectiveness);
      expect(goodEffectiveness).toBeLessThan(excellentEffectiveness);
    });

    it('should adjust effectiveness based on time invested', () => {
      const baseParams: RecruitmentParams = {
        recruitingCharacter: testMaster,
        recruitmentMethod: 'Guild',
        locationQuality: 'Average',
        timeInvested: 3,
        goldInvested: 50,
        charismaAdjustment: 0,
      };

      const shortTimeEffectiveness = calculateRecruitmentEffectiveness({
        ...baseParams,
        timeInvested: 1,
      });
      const mediumTimeEffectiveness = calculateRecruitmentEffectiveness({
        ...baseParams,
        timeInvested: 3,
      });
      const longTimeEffectiveness = calculateRecruitmentEffectiveness({
        ...baseParams,
        timeInvested: 7,
      });

      expect(shortTimeEffectiveness).toBeLessThan(mediumTimeEffectiveness);
      expect(mediumTimeEffectiveness).toBeLessThan(longTimeEffectiveness);
      // But there should be diminishing returns after 5 days
      const veryLongTimeEffectiveness = calculateRecruitmentEffectiveness({
        ...baseParams,
        timeInvested: 20,
      });
      expect(veryLongTimeEffectiveness).toEqual(longTimeEffectiveness);
    });

    it('should adjust effectiveness based on gold invested', () => {
      const baseCost = calculateRecruitmentCost('Guild', 'Average');
      const baseParams: RecruitmentParams = {
        recruitingCharacter: testMaster,
        recruitmentMethod: 'Guild',
        locationQuality: 'Average',
        timeInvested: 3,
        goldInvested: 50,
        charismaAdjustment: 0,
      };

      const lowGoldEffectiveness = calculateRecruitmentEffectiveness({
        ...baseParams,
        goldInvested: baseCost * 0.5,
      });
      const mediumGoldEffectiveness = calculateRecruitmentEffectiveness({
        ...baseParams,
        goldInvested: baseCost,
      });
      const highGoldEffectiveness = calculateRecruitmentEffectiveness({
        ...baseParams,
        goldInvested: baseCost * 3,
      });

      expect(lowGoldEffectiveness).toBeLessThan(mediumGoldEffectiveness);
      expect(mediumGoldEffectiveness).toBeLessThan(highGoldEffectiveness);
    });

    it('should adjust effectiveness based on charisma adjustment', () => {
      const baseParams: RecruitmentParams = {
        recruitingCharacter: testMaster,
        recruitmentMethod: 'Guild',
        locationQuality: 'Average',
        timeInvested: 3,
        goldInvested: 50,
        charismaAdjustment: 0,
      };

      const lowCharismaEffectiveness = calculateRecruitmentEffectiveness({
        ...baseParams,
        charismaAdjustment: -10,
      });
      const neutralCharismaEffectiveness = calculateRecruitmentEffectiveness({
        ...baseParams,
        charismaAdjustment: 0,
      });
      const highCharismaEffectiveness = calculateRecruitmentEffectiveness({
        ...baseParams,
        charismaAdjustment: 10,
      });

      expect(lowCharismaEffectiveness).toBeLessThan(neutralCharismaEffectiveness);
      expect(neutralCharismaEffectiveness).toBeLessThan(highCharismaEffectiveness);
      expect(highCharismaEffectiveness - lowCharismaEffectiveness).toEqual(20);
    });

    it('should apply penalties for specific requirements', () => {
      const baseParams: RecruitmentParams = {
        recruitingCharacter: testMaster,
        recruitmentMethod: 'Guild',
        locationQuality: 'Average',
        timeInvested: 3,
        goldInvested: 50,
        charismaAdjustment: 0,
      };

      const baseEffectiveness = calculateRecruitmentEffectiveness(baseParams);
      const classSpecificEffectiveness = calculateRecruitmentEffectiveness({
        ...baseParams,
        desiredClass: 'Magic-User',
      });
      const levelSpecificEffectiveness = calculateRecruitmentEffectiveness({
        ...baseParams,
        minLevel: 5,
      });
      const skillSpecificEffectiveness = calculateRecruitmentEffectiveness({
        ...baseParams,
        specificSkills: ['Tracking', 'Herbalism'],
      });

      expect(classSpecificEffectiveness).toBeLessThan(baseEffectiveness);
      expect(levelSpecificEffectiveness).toBeLessThan(baseEffectiveness);
      expect(skillSpecificEffectiveness).toBeLessThan(baseEffectiveness);
    });

    it('should ensure effectiveness is within reasonable bounds', () => {
      // Test extremely poor conditions
      const poorParams: RecruitmentParams = {
        recruitingCharacter: testMaster,
        recruitmentMethod: 'Tavern', // Least effective method
        locationQuality: 'Poor',
        timeInvested: 1,
        goldInvested: 1,
        charismaAdjustment: -30,
        desiredClass: 'Paladin',
        minLevel: 10,
        specificSkills: ['Rare Skill 1', 'Rare Skill 2', 'Rare Skill 3'],
      };

      // Test extremely favorable conditions
      const greatParams: RecruitmentParams = {
        recruitingCharacter: testMaster,
        recruitmentMethod: 'Agent', // Most effective method
        locationQuality: 'Excellent',
        timeInvested: 10,
        goldInvested: 1000,
        charismaAdjustment: 30,
      };

      const poorEffectiveness = calculateRecruitmentEffectiveness(poorParams);
      const greatEffectiveness = calculateRecruitmentEffectiveness(greatParams);

      expect(poorEffectiveness).toBeGreaterThanOrEqual(5);
      expect(greatEffectiveness).toBeLessThanOrEqual(95);
    });
  });

  describe('recruitHenchmen', () => {
    it('should succeed when the roll is below the effectiveness', () => {
      // Mock a successful roll
      roll.mockReturnValueOnce(30).mockReturnValueOnce(2);

      const params: RecruitmentParams = {
        recruitingCharacter: testMaster,
        recruitmentMethod: 'Guild',
        locationQuality: 'Good',
        timeInvested: 5,
        goldInvested: 100,
        charismaAdjustment: 5,
      };

      const result = recruitHenchmen(params);

      expect(result.success).toBe(true);
      expect(result.timeSpent).toBe(params.timeInvested);
      expect(result.goldSpent).toBe(params.goldInvested);
      expect(result.notes).toContain('successful');
    });

    it('should fail when the roll is above the effectiveness', () => {
      // Mock a failed roll
      roll.mockReturnValueOnce(90);

      const params: RecruitmentParams = {
        recruitingCharacter: testMaster,
        recruitmentMethod: 'Tavern',
        locationQuality: 'Poor',
        timeInvested: 1,
        goldInvested: 2,
        charismaAdjustment: -5,
      };

      const result = recruitHenchmen(params);

      expect(result.success).toBe(false);
      expect(result.candidates).toHaveLength(0);
      expect(result.notes).toContain('failed');
    });
  });

  describe('calculateOfferQuality', () => {
    // Create sample offer and candidate
    const testOffer: HenchmanOffer = {
      goldPayment: 100,
      equipmentProvided: [{ name: 'Sword' } as Item, { name: 'Shield' } as Item],
      magicItemsOffered: [],
      roomAndBoard: true,
      treasureShare: 15,
      dangerLevel: 'Medium',
      duties: ['Combat', 'Camp Setup'],
      specialTerms: [],
    };

    const testCandidate: HenchmanCandidate = {
      character: testHenchman,
      expectedOffer: {
        goldPayment: 100,
        equipmentProvided: [{ name: 'Basic Equipment' } as Item],
        magicItemsOffered: [],
        roomAndBoard: true,
        treasureShare: 10,
        dangerLevel: 'Medium',
        duties: ['Combat'],
        specialTerms: [],
      },
      interestLevel: 60,
      acceptanceThreshold: 70,
      specialRequirements: [],
    };

    it('should calculate a base quality score', () => {
      const quality = calculateOfferQuality(testOffer, testCandidate);
      expect(quality).toBeGreaterThan(0);
    });

    it('should increase quality for better gold payment', () => {
      const baseQuality = calculateOfferQuality(testOffer, testCandidate);

      const betterOffer = {
        ...testOffer,
        goldPayment: 150, // 50% more than expected
      };

      const betterQuality = calculateOfferQuality(betterOffer, testCandidate);
      expect(betterQuality).toBeGreaterThan(baseQuality);
    });

    it('should increase quality for better treasure share', () => {
      const baseQuality = calculateOfferQuality(testOffer, testCandidate);

      const betterOffer = {
        ...testOffer,
        treasureShare: 20, // Double the expected share
      };

      const betterQuality = calculateOfferQuality(betterOffer, testCandidate);
      expect(betterQuality).toBeGreaterThan(baseQuality);
    });

    it('should decrease quality for higher danger level', () => {
      const baseQuality = calculateOfferQuality(testOffer, testCandidate);

      const worseOffer = {
        ...testOffer,
        dangerLevel: 'Extreme' as const, // Much more dangerous than expected
      };

      const worseQuality = calculateOfferQuality(worseOffer, testCandidate);
      expect(worseQuality).toBeLessThan(baseQuality);
    });

    it('should increase quality for magic items offered', () => {
      const baseQuality = calculateOfferQuality(testOffer, testCandidate);

      const betterOffer = {
        ...testOffer,
        magicItemsOffered: [{ name: 'Magic Sword +1' } as Item],
      };

      const betterQuality = calculateOfferQuality(betterOffer, testCandidate);
      expect(betterQuality).toBeGreaterThan(baseQuality);
    });
  });

  describe('createHenchmanRelationship', () => {
    it('should create a valid henchman relationship with correct properties', () => {
      const offer: HenchmanOffer = {
        goldPayment: 100,
        equipmentProvided: [],
        magicItemsOffered: [],
        roomAndBoard: true,
        treasureShare: 10,
        dangerLevel: 'Medium',
        duties: ['Combat'],
        specialTerms: [],
      };

      const relationship = createHenchmanRelationship(testHenchman, testMaster, 6, offer);

      expect(relationship).toHaveProperty('henchman', testHenchman);
      expect(relationship).toHaveProperty('master', testMaster);
      expect(relationship).toHaveProperty('startDate');
      expect(relationship).toHaveProperty('contractLength', 6);
      expect(relationship).toHaveProperty('terms', offer);
      expect(relationship).toHaveProperty('loyalty');
      expect(relationship).toHaveProperty('experienceGained', 0);
      expect(relationship).toHaveProperty('adventuresSurvived', 0);
      expect(relationship).toHaveProperty('specialNotes');
    });
  });
});

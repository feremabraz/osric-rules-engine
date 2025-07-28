import type { ResearchDifficultyFactors, SpellResearch } from '@rules/spells/advancedSpellTypes';
import {
  beginSpellResearch,
  calculateResearchCost,
  calculateResearchTime,
  calculateSuccessChance,
  continueResearch,
} from '@rules/spells/spellResearch';
import type { Character } from '@rules/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('Spell Research System', () => {
  // Mock character setup
  let mageCharacter: Character;

  // Mock research projects
  let basicResearch: SpellResearch;
  let advancedResearch: SpellResearch;

  beforeEach(() => {
    // Setup mock mage character
    mageCharacter = {
      id: 'test-mage',
      name: 'Test Mage',
      race: 'Human',
      class: 'Magic-User',
      level: 8,
      abilities: {
        strength: 10,
        dexterity: 14,
        constitution: 13,
        intelligence: 18, // High intelligence for better research
        wisdom: 12,
        charisma: 10,
      },
      abilityModifiers: {
        // Relevant modifiers for research
        intelligenceLearnSpells: 85,
        intelligenceMaxSpellLevel: 9,
        // Include minimal required properties to avoid 'any'
        strengthHitAdj: 0,
        strengthDamageAdj: 0,
        strengthEncumbrance: 0,
        strengthOpenDoors: 0,
        strengthBendBars: 0,
        dexterityReaction: 0,
        dexterityMissile: 0,
        dexterityDefense: 0,
        dexterityPickPockets: 0,
        dexterityOpenLocks: 0,
        dexterityFindTraps: 0,
        dexterityMoveSilently: 0,
        dexterityHideInShadows: 0,
        constitutionHitPoints: 0,
        constitutionSystemShock: 0,
        constitutionResurrectionSurvival: 0,
        constitutionPoisonSave: 0,
        intelligenceLanguages: 0,
        intelligenceIllusionImmunity: false,
        wisdomMentalSave: 0,
        wisdomBonusSpells: null,
        wisdomSpellFailure: 0,
        charismaReactionAdj: 0,
        charismaLoyaltyBase: 0,
        charismaMaxHenchmen: 0,
      },
      hitPoints: { current: 24, maximum: 24 },
      armorClass: 7,
      thac0: 17,
      savingThrows: {
        'Poison or Death': 10,
        Wands: 8,
        'Paralysis, Polymorph, or Petrification': 9,
        'Breath Weapons': 12,
        'Spells, Rods, or Staves': 9,
      },
      experience: { current: 120000, requiredForNextLevel: 250000, level: 8 },
      alignment: 'True Neutral',
      inventory: [],
      position: 'standing',
      statusEffects: [],
      memorizedSpells: {},
      spellbook: [],
      spells: [],
      currency: { platinum: 50, gold: 1500, electrum: 0, silver: 200, copper: 0 },
      encumbrance: 10,
      movementRate: 12,
      classes: {},
      primaryClass: null,
      spellSlots: { 1: 4, 2: 3, 3: 3, 4: 2, 5: 1 },
      thiefSkills: null,
      turnUndead: null,
      languages: ['Common', 'Elvish', 'Draconic'],
      age: 40,
      ageCategory: 'Adult',
      henchmen: [],
      racialAbilities: [],
      classAbilities: [],
      proficiencies: [],
      secondarySkills: [],
    };

    // Mock research projects
    basicResearch = {
      researcherId: mageCharacter.id,
      spellName: 'Enhanced Magic Missile',
      targetLevel: 2,
      daysSpent: 0,
      goldSpent: 0,
      progressPercentage: 0,
      estimatedCompletion: 30, // Initial estimate
      notes: 'Attempting to create a more powerful version of Magic Missile',
      failureChance: 20, // 20% chance of failure
    };

    advancedResearch = {
      researcherId: mageCharacter.id,
      spellName: 'Temporal Stasis Field',
      targetLevel: 5,
      daysSpent: 0,
      goldSpent: 0,
      progressPercentage: 0,
      estimatedCompletion: 90, // Initial estimate
      notes: 'A complex spell to create a field that slows time for all within it',
      failureChance: 45, // 45% chance of failure
    };
  });

  describe('beginSpellResearch', () => {
    it('should initialize a new research project with correct parameters', () => {
      // Set character level high enough for level 3 spells
      mageCharacter.level = 6;

      const newProject = beginSpellResearch({
        character: mageCharacter,
        spellName: 'Frost Nova',
        spellLevel: 3,
        spellRarity: 5, // Medium rarity
      });

      expect(newProject).toBeDefined();
      expect(newProject).not.toBeNull();

      // Use non-null assertion or conditional to handle the possibility of null
      if (newProject) {
        expect(newProject.researcherId).toBe(mageCharacter.id);
        expect(newProject.spellName).toBe('Frost Nova');
        expect(newProject.targetLevel).toBe(3);
        expect(newProject.daysSpent).toBe(0);
        expect(newProject.progressPercentage).toBe(0);
        expect(newProject.estimatedCompletion).toBeGreaterThan(0);
      }
    });

    it('should restrict research to appropriate level based on character', () => {
      // Try to research a spell too high level for character
      const tooHighLevel = beginSpellResearch({
        character: mageCharacter,
        spellName: 'Ultimate Destruction',
        spellLevel: 10, // Beyond mage's capability
        spellRarity: 8,
      });

      expect(tooHighLevel).toBeNull();
    });

    it('should initialize with higher difficulty for higher level spells', () => {
      // Ensure character is high enough level for both spells
      mageCharacter.level = 10;

      const level2Project = beginSpellResearch({
        character: mageCharacter,
        spellName: 'Minor Spell',
        spellLevel: 2,
        spellRarity: 3,
      });

      const level5Project = beginSpellResearch({
        character: mageCharacter,
        spellName: 'Major Spell',
        spellLevel: 5,
        spellRarity: 3, // Same rarity
      });

      // Ensure both projects are non-null before comparing
      expect(level2Project).not.toBeNull();
      expect(level5Project).not.toBeNull();

      if (level2Project && level5Project) {
        expect(level2Project.estimatedCompletion).toBeLessThan(level5Project.estimatedCompletion);
        expect(level2Project.failureChance).toBeLessThan(level5Project.failureChance);
      }
    });
  });

  describe('continueResearch', () => {
    it('should make progress based on days spent and intelligence', () => {
      // Mock Math.random for consistent test results
      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.7); // Success roll

      const initialResearch = { ...basicResearch };
      const updatedResearch = continueResearch({
        research: initialResearch,
        character: mageCharacter,
        daysSpent: 7,
        goldSpent: 200,
      });

      expect(updatedResearch.daysSpent).toBe(initialResearch.daysSpent + 7);
      expect(updatedResearch.goldSpent).toBe(initialResearch.goldSpent + 200);
      expect(updatedResearch.progressPercentage).toBeGreaterThan(
        initialResearch.progressPercentage
      );

      // Research time should decrease
      expect(updatedResearch.estimatedCompletion).toBeLessThan(initialResearch.estimatedCompletion);

      // Clean up mock
      randomSpy.mockRestore();
    });

    it('should progress faster with more gold spent', () => {
      // Create two identical research projects
      const research1 = { ...basicResearch };
      const research2 = { ...basicResearch };

      // Mock Math.random for consistent test results
      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.7);

      // Progress with different gold amounts
      const updatedResearch1 = continueResearch({
        research: research1,
        character: mageCharacter,
        daysSpent: 5,
        goldSpent: 100,
      });

      const updatedResearch2 = continueResearch({
        research: research2,
        character: mageCharacter,
        daysSpent: 5,
        goldSpent: 500, // More gold
      });

      expect(updatedResearch2.progressPercentage).toBeGreaterThan(
        updatedResearch1.progressPercentage
      );

      // Clean up mock
      randomSpy.mockRestore();
    });

    it('should have a chance of setbacks based on failure chance', () => {
      // Mock Math.random to force a setback
      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.05); // Very low roll = failure

      const initialResearch = { ...advancedResearch };
      const updatedResearch = continueResearch({
        research: initialResearch,
        character: mageCharacter,
        daysSpent: 10,
        goldSpent: 300,
      });

      // Progress should be less than expected or even negative
      expect(updatedResearch.progressPercentage).toBeLessThanOrEqual(
        initialResearch.progressPercentage + 5
      );

      // Clean up mock
      randomSpy.mockRestore();
    });

    it('should complete research when progress reaches 100%', () => {
      // Start with research that's almost complete
      const almostCompleteResearch: SpellResearch = {
        ...basicResearch,
        progressPercentage: 95,
      };

      // Mock Math.random for success
      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.8);

      const updatedResearch = continueResearch({
        research: almostCompleteResearch,
        character: mageCharacter,
        daysSpent: 10,
        goldSpent: 200,
      });

      expect(updatedResearch.progressPercentage).toBeGreaterThanOrEqual(100);
      expect(updatedResearch.estimatedCompletion).toBe(0);

      // Clean up mock
      randomSpy.mockRestore();
    });
  });

  describe('calculateResearchTime', () => {
    it('should calculate shorter time for lower level spells', () => {
      // Test variables
      const lowLevel: ResearchDifficultyFactors = {
        spellLevel: 1,
        casterLevel: 8,
        intelligence: 18,
        resources: 500,
        rarity: 3,
      };

      const highLevel: ResearchDifficultyFactors = {
        spellLevel: 5,
        casterLevel: 8,
        intelligence: 18,
        resources: 500,
        rarity: 3,
      };

      const lowLevelTime = calculateResearchTime(lowLevel);
      const highLevelTime = calculateResearchTime(highLevel);

      expect(lowLevelTime).toBeLessThan(highLevelTime);
    });

    it('should calculate shorter time for higher intelligence', () => {
      // Test variables
      const lowInt: ResearchDifficultyFactors = {
        spellLevel: 3,
        casterLevel: 8,
        intelligence: 12,
        resources: 500,
        rarity: 4,
      };

      const highInt: ResearchDifficultyFactors = {
        spellLevel: 3,
        casterLevel: 8,
        intelligence: 18,
        resources: 500,
        rarity: 4,
      };

      const lowIntTime = calculateResearchTime(lowInt);
      const highIntTime = calculateResearchTime(highInt);

      expect(highIntTime).toBeLessThan(lowIntTime);
    });
  });

  describe('calculateResearchCost', () => {
    it('should calculate higher cost for higher level spells', () => {
      const level1Cost = calculateResearchCost(1, 5);
      const level5Cost = calculateResearchCost(5, 5);

      expect(level1Cost).toBeLessThan(level5Cost);
    });

    it('should calculate higher cost for rarer spells', () => {
      const commonSpellCost = calculateResearchCost(3, 2);
      const rareSpellCost = calculateResearchCost(3, 8);

      expect(commonSpellCost).toBeLessThan(rareSpellCost);
    });
  });

  describe('calculateSuccessChance', () => {
    it('should give higher success chance to higher level characters', () => {
      const lowLevel = calculateSuccessChance({
        spellLevel: 3,
        casterLevel: 5,
        intelligence: 16,
        resources: 400,
        rarity: 4,
      });

      const highLevel = calculateSuccessChance({
        spellLevel: 3,
        casterLevel: 9,
        intelligence: 16,
        resources: 400,
        rarity: 4,
      });

      expect(highLevel).toBeGreaterThan(lowLevel);
    });

    it('should give higher success chance with more resources', () => {
      const lowResources = calculateSuccessChance({
        spellLevel: 4,
        casterLevel: 7,
        intelligence: 17,
        resources: 200,
        rarity: 5,
      });

      const highResources = calculateSuccessChance({
        spellLevel: 4,
        casterLevel: 7,
        intelligence: 17,
        resources: 1000,
        rarity: 5,
      });

      expect(highResources).toBeGreaterThan(lowResources);
    });
  });
});

import type { MaterialComponent, SpellWithComponents } from '@rules/spells/advancedSpellTypes';
import { canCastWithComponents, consumeComponents } from '@rules/spells/componentTracking';
import type { Character, Item } from '@rules/types';
import { beforeEach, describe, expect, it } from 'vitest';

describe('Spell Component Tracking', () => {
  // Mock character setup
  let testCharacter: Character;

  // Mock components
  const basicComponents: MaterialComponent[] = [
    { name: 'bat guano', consumed: true },
    { name: 'sulfur', consumed: true },
  ];

  const expensiveComponents: MaterialComponent[] = [
    {
      name: 'diamond',
      consumed: true,
      cost: 100,
      description: 'A clear diamond worth at least 100gp',
    },
    { name: 'pearl', consumed: true, cost: 50, description: 'A white pearl worth at least 50gp' },
  ];

  // Mock spells
  const fireball: SpellWithComponents = {
    name: 'Fireball',
    level: 3,
    class: 'Magic-User',
    range: '100 yards + 10 yards/level',
    duration: 'Instantaneous',
    areaOfEffect: "20' radius sphere",
    components: ['V', 'S', 'M'],
    castingTime: '3',
    savingThrow: 'Breath Weapons',
    description: 'Creates a fireball that deals 1d6 damage per level to all in area',
    reversible: false,
    materialComponents: null,
    effect: () => ({
      damage: [6, 5, 4],
      healing: null,
      statusEffects: null,
      narrative: 'A fireball explodes!',
    }),
    componentRequirements: ['V', 'S', 'M'],
    detailedMaterialComponents: basicComponents,
  };

  const resurrection: SpellWithComponents = {
    name: 'Resurrection',
    level: 7,
    class: 'Cleric',
    range: 'Touch',
    duration: 'Permanent',
    areaOfEffect: '1 creature',
    components: ['V', 'S', 'M'],
    castingTime: '1 turn',
    savingThrow: 'None',
    description: 'Brings target back to life with full hit points',
    reversible: true,
    materialComponents: null,
    effect: () => ({
      damage: null,
      healing: null,
      statusEffects: null,
      narrative: 'The creature returns to life!',
    }),
    componentRequirements: ['V', 'S', 'M'],
    detailedMaterialComponents: expensiveComponents,
  };

  const magicMissile: SpellWithComponents = {
    name: 'Magic Missile',
    level: 1,
    class: 'Magic-User',
    range: '60 yards + 10 yards/level',
    duration: 'Instantaneous',
    areaOfEffect: '1-5 targets',
    components: ['V', 'S'],
    castingTime: '1',
    savingThrow: 'None',
    description: 'Creates magical missiles that automatically hit for 1d4+1 damage each',
    reversible: false,
    materialComponents: null,
    effect: () => ({
      damage: [3],
      healing: null,
      statusEffects: null,
      narrative: 'A magic missile hits the target!',
    }),
    componentRequirements: ['V', 'S'],
    detailedMaterialComponents: [],
  };

  beforeEach(() => {
    // Setup a mock character
    testCharacter = {
      id: 'test-character',
      name: 'Test Character',
      race: 'Human',
      class: 'Magic-User',
      level: 5,
      abilities: {
        strength: 10,
        dexterity: 14,
        constitution: 12,
        intelligence: 17,
        wisdom: 13,
        charisma: 11,
      },
      abilityModifiers: {
        strengthHitAdj: 0,
        strengthDamageAdj: 0,
        strengthEncumbrance: 0,
        strengthOpenDoors: 0,
        strengthBendBars: 0,
        dexterityReaction: 0,
        dexterityMissile: 1,
        dexterityDefense: -1,
        dexterityPickPockets: 0,
        dexterityOpenLocks: 0,
        dexterityFindTraps: 0,
        dexterityMoveSilently: 0,
        dexterityHideInShadows: 0,
        constitutionHitPoints: 0,
        constitutionSystemShock: 80,
        constitutionResurrectionSurvival: 85,
        constitutionPoisonSave: 0,
        intelligenceLanguages: 3,
        intelligenceLearnSpells: 65,
        intelligenceMaxSpellLevel: 7,
        intelligenceIllusionImmunity: false,
        wisdomMentalSave: 0,
        wisdomBonusSpells: null,
        wisdomSpellFailure: 0,
        charismaReactionAdj: 0,
        charismaLoyaltyBase: 0,
        charismaMaxHenchmen: 4,
      },
      hitPoints: { current: 15, maximum: 15 },
      armorClass: 8,
      thac0: 20,
      savingThrows: {
        'Poison or Death': 13,
        Wands: 11,
        'Paralysis, Polymorph, or Petrification': 12,
        'Breath Weapons': 15,
        'Spells, Rods, or Staves': 12,
      },
      experience: { current: 15000, requiredForNextLevel: 20000, level: 5 },
      alignment: 'Neutral Good',
      inventory: [
        {
          id: 'component1',
          name: 'bat guano',
          weight: 0.1,
          description: 'Spell component',
          value: 1,
          equipped: false,
          magicBonus: null,
          charges: null,
        },
        {
          id: 'component2',
          name: 'sulfur',
          weight: 0.1,
          description: 'Spell component',
          value: 1,
          equipped: false,
          magicBonus: null,
          charges: null,
        },
        {
          id: 'dagger',
          name: 'Dagger',
          weight: 1,
          description: 'Simple dagger',
          value: 2,
          equipped: true,
          magicBonus: null,
          charges: null,
        },
      ],
      position: 'standing',
      statusEffects: [],
      memorizedSpells: {},
      spellbook: [],
      spells: [],
      currency: { platinum: 0, gold: 100, electrum: 0, silver: 50, copper: 0 },
      encumbrance: 10,
      movementRate: 12,
      classes: {},
      primaryClass: null,
      spellSlots: { 1: 4, 2: 2, 3: 1 },
      thiefSkills: null,
      turnUndead: null,
      languages: ['Common', 'Elvish', 'Draconic'],
      age: 30,
      ageCategory: 'Adult',
      henchmen: [],
      racialAbilities: [],
      classAbilities: [],
      proficiencies: [],
      secondarySkills: [],
    };
  });

  describe('canCastWithComponents', () => {
    it('should allow casting when all components are present', () => {
      const result = canCastWithComponents(testCharacter, fireball);
      expect(result.canCast).toBe(true);
      expect(result.missingComponents).toHaveLength(0);
    });

    it('should allow casting when spell has no material components', () => {
      const result = canCastWithComponents(testCharacter, magicMissile);
      expect(result.canCast).toBe(true);
      expect(result.missingComponents).toHaveLength(0);
    });

    it('should prevent casting when missing material components', () => {
      const result = canCastWithComponents(testCharacter, resurrection);
      expect(result.canCast).toBe(false);
      expect(result.missingComponents.length).toBeGreaterThan(0);
      expect(result.missingComponents[0]).toContain('Material');
    });

    it('should prevent casting when silenced', () => {
      testCharacter.statusEffects = [
        {
          name: 'Silenced',
          duration: 10,
          effect: 'Cannot speak',
          savingThrow: null,
          endCondition: null,
        },
      ];
      const result = canCastWithComponents(testCharacter, fireball);
      expect(result.canCast).toBe(false);
      expect(result.missingComponents).toContain('Verbal (cannot speak)');
    });

    it('should prevent casting when hands are bound', () => {
      // Add multiple status effects to restrict both hands
      testCharacter.statusEffects = [
        {
          name: 'Restrained',
          duration: 10,
          effect: 'Hands are tied',
          savingThrow: null,
          endCondition: null,
        },
        {
          name: 'Bound',
          duration: 10,
          effect: 'Arms are bound',
          savingThrow: null,
          endCondition: null,
        },
      ];
      const result = canCastWithComponents(testCharacter, fireball);
      expect(result.canCast).toBe(false);
      expect(result.missingComponents).toContain('Somatic (need one free hand)');
    });

    it('should prevent casting when hands are full with weapons', () => {
      // Add two-handed weapon to inventory
      testCharacter.inventory.push({
        id: 'staff',
        name: 'Quarterstaff',
        weight: 4,
        description: 'A sturdy wooden staff',
        value: 2,
        equipped: true,
        magicBonus: null,
        charges: null,
      });

      // Mock the two-handed property for test
      testCharacter.inventory[testCharacter.inventory.length - 1] = {
        ...testCharacter.inventory[testCharacter.inventory.length - 1],
        twoHanded: true,
        type: 'Weapon',
      } as Item;

      const result = canCastWithComponents(testCharacter, fireball);
      expect(result.canCast).toBe(false);
      expect(result.missingComponents).toContain('Somatic (need one free hand)');
    });
  });

  describe('consumeComponents', () => {
    it('should consume material components marked as consumed', () => {
      const initialInventoryCount = testCharacter.inventory.length;
      const updatedCharacter = consumeComponents(testCharacter, fireball);

      // Should have consumed both bat guano and sulfur
      expect(updatedCharacter.inventory.length).toBe(initialInventoryCount - 2);
      expect(updatedCharacter.inventory.some((item) => item.name === 'bat guano')).toBe(false);
      expect(updatedCharacter.inventory.some((item) => item.name === 'sulfur')).toBe(false);
    });

    it('should not consume components for spells without material components', () => {
      const initialInventoryCount = testCharacter.inventory.length;
      const updatedCharacter = consumeComponents(testCharacter, magicMissile);

      // Inventory should remain unchanged
      expect(updatedCharacter.inventory.length).toBe(initialInventoryCount);
    });

    it('should not consume components if they are not in inventory', () => {
      const initialInventoryCount = testCharacter.inventory.length;
      const updatedCharacter = consumeComponents(testCharacter, resurrection);

      // Inventory should remain unchanged because we don't have diamonds or pearls
      expect(updatedCharacter.inventory.length).toBe(initialInventoryCount);
    });

    it('should handle non-consumed material components', () => {
      // Create a spell with non-consumed material components
      const spellWithReusableComponents: SpellWithComponents = {
        ...fireball,
        detailedMaterialComponents: [
          { name: 'crystal', consumed: false, description: 'A small quartz crystal' },
        ],
      };

      // Add the component to inventory
      testCharacter.inventory.push({
        id: 'crystal',
        name: 'crystal',
        weight: 0.1,
        description: 'A small quartz crystal',
        value: 10,
        equipped: false,
        magicBonus: null,
        charges: null,
      });

      const initialInventoryCount = testCharacter.inventory.length;
      const updatedCharacter = consumeComponents(testCharacter, spellWithReusableComponents);

      // Crystal should not be consumed
      expect(updatedCharacter.inventory.length).toBe(initialInventoryCount);
      expect(updatedCharacter.inventory.some((item) => item.name === 'crystal')).toBe(true);
    });
  });
});

import { createStore } from 'jotai';
import { beforeEach, describe, expect, it } from 'vitest';
import { GameContext } from '../../osric/core/GameContext';
import type {
  AbilityScoreModifiers,
  AbilityScores,
  AgeCategory,
  Alignment,
  Character,
  CharacterClass,
  CharacterRace,
  CharacterSecondarySkill,
  ClassAbility,
  CreatureSize,
  Currency,
  Experience,
  Item,
  Monster,
  MovementType,
  RacialAbility,
  SavingThrowType,
  Spell,
  SpellClass,
  SpellSlots,
  ThiefSkills,
  TurnUndeadTable,
  WeaponProficiency,
} from '../../osric/types/entities';

// Mock helper function to create test characters
function createMockCharacter(overrides: Partial<Character> = {}): Character {
  const defaultCharacter: Character = {
    id: 'test-char',
    name: 'Test Character',
    level: 1,
    hitPoints: { current: 8, maximum: 8 },
    armorClass: 10,
    thac0: 20,
    experience: { current: 0, requiredForNextLevel: 2000, level: 1 },
    alignment: 'True Neutral',
    inventory: [],
    position: 'town',
    statusEffects: [],
    race: 'Human',
    class: 'Fighter',
    abilities: {
      strength: 10,
      dexterity: 10,
      constitution: 10,
      intelligence: 10,
      wisdom: 10,
      charisma: 10,
    },
    abilityModifiers: {
      strengthHitAdj: null,
      strengthDamageAdj: null,
      strengthEncumbrance: null,
      strengthOpenDoors: null,
      strengthBendBars: null,
      dexterityReaction: null,
      dexterityMissile: null,
      dexterityDefense: null,
      dexterityPickPockets: null,
      dexterityOpenLocks: null,
      dexterityFindTraps: null,
      dexterityMoveSilently: null,
      dexterityHideInShadows: null,
      constitutionHitPoints: null,
      constitutionSystemShock: null,
      constitutionResurrectionSurvival: null,
      constitutionPoisonSave: null,
      intelligenceLanguages: null,
      intelligenceLearnSpells: null,
      intelligenceMaxSpellLevel: null,
      intelligenceIllusionImmunity: false,
      wisdomMentalSave: null,
      wisdomBonusSpells: null,
      wisdomSpellFailure: null,
      charismaReactionAdj: null,
      charismaLoyaltyBase: null,
      charismaMaxHenchmen: null,
    },
    savingThrows: {
      'Poison or Death': 14,
      Wands: 16,
      'Paralysis, Polymorph, or Petrification': 15,
      'Breath Weapons': 17,
      'Spells, Rods, or Staves': 17,
    },
    spells: [],
    currency: { platinum: 0, gold: 0, electrum: 0, silver: 0, copper: 0 },
    encumbrance: 0,
    movementRate: 120,
    classes: { Fighter: 1 },
    primaryClass: null,
    spellSlots: {},
    memorizedSpells: {},
    spellbook: [],
    thiefSkills: null,
    turnUndead: null,
    languages: ['Common'],
    age: 20,
    ageCategory: 'Adult',
    henchmen: [],
    racialAbilities: [],
    classAbilities: [],
    proficiencies: [],
    secondarySkills: [],
  };

  return { ...defaultCharacter, ...overrides };
}

// Mock helper function to create test monsters
function createMockMonster(overrides: Partial<Monster> = {}): Monster {
  const defaultMonster: Monster = {
    id: 'test-monster',
    name: 'Test Goblin',
    level: 1,
    hitPoints: { current: 4, maximum: 4 },
    armorClass: 6,
    thac0: 20,
    experience: { current: 0, requiredForNextLevel: 0, level: 1 },
    alignment: 'Chaotic Evil',
    inventory: [],
    position: 'dungeon',
    statusEffects: [],
    hitDice: '1-1',
    damagePerAttack: ['1d6'],
    morale: 7,
    treasure: 'P',
    specialAbilities: [],
    xpValue: 5,
    size: 'Small',
    movementTypes: [{ type: 'Walk', rate: 60 }],
    habitat: ['Underground'],
    frequency: 'Common',
    organization: 'Tribe',
    diet: 'Omnivore',
    ecology: 'Scavenger',
  };

  return { ...defaultMonster, ...overrides };
}

// Mock helper function to create test items
function createMockItem(overrides: Partial<Item> = {}): Item {
  const defaultItem: Item = {
    id: 'test-item',
    name: 'Test Sword',
    weight: 40,
    description: 'A simple sword',
    value: 10,
    equipped: false,
    magicBonus: null,
    charges: null,
  };

  return { ...defaultItem, ...overrides };
}

// Mock helper function to create test spells
function createMockSpell(overrides: Partial<Spell> = {}): Spell {
  const defaultSpell: Spell = {
    name: 'Magic Missile',
    level: 1,
    class: 'Magic-User',
    range: "60'",
    duration: 'Instantaneous',
    areaOfEffect: '1 creature',
    components: ['V', 'S'],
    castingTime: '1 segment',
    savingThrow: 'None',
    description: 'Creates magical darts that strike unerringly',
    reversible: false,
    materialComponents: null,
    effect: () => ({
      damage: [3, 4, 5],
      healing: null,
      statusEffects: null,
      narrative: 'Three glowing darts streak towards the target',
    }),
  };

  return { ...defaultSpell, ...overrides };
}

describe('GameContext', () => {
  let gameContext: GameContext;
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    store = createStore();
    gameContext = new GameContext(store);
  });

  describe('Entity Management', () => {
    describe('Character Management', () => {
      it('should store and retrieve characters', () => {
        const character = createMockCharacter({
          id: 'test-fighter',
          name: 'Test Fighter',
          class: 'Fighter',
          abilities: {
            strength: 16,
            dexterity: 14,
            constitution: 15,
            intelligence: 12,
            wisdom: 13,
            charisma: 11,
          },
        });

        gameContext.setEntity(character.id, character);

        const retrieved = gameContext.getEntity<Character>('test-fighter');
        expect(retrieved).toBeDefined();
        expect(retrieved?.name).toBe('Test Fighter');
        expect(retrieved?.class).toBe('Fighter');
        expect(retrieved?.abilities.strength).toBe(16);
      });

      it('should handle character updates', () => {
        const character = createMockCharacter({
          id: 'update-char',
          name: 'Original Name',
          hitPoints: { current: 10, maximum: 10 },
        });

        gameContext.setEntity(character.id, character);

        // Update character
        const updatedCharacter = {
          ...character,
          name: 'Updated Name',
          hitPoints: { current: 5, maximum: 10 },
        };
        gameContext.setEntity(updatedCharacter.id, updatedCharacter);

        const retrieved = gameContext.getEntity<Character>('update-char');
        expect(retrieved?.name).toBe('Updated Name');
        expect(retrieved?.hitPoints.current).toBe(5);
      });

      it('should check if character exists', () => {
        const character = createMockCharacter({ id: 'exists-char' });

        expect(gameContext.hasEntity('exists-char')).toBe(false);

        gameContext.setEntity(character.id, character);
        expect(gameContext.hasEntity('exists-char')).toBe(true);
      });
    });

    describe('Monster Management', () => {
      it('should store and retrieve monsters', () => {
        const monster = createMockMonster({
          id: 'test-orc',
          name: 'Orc Warrior',
          hitDice: '1+1',
          damagePerAttack: ['1d8'],
          xpValue: 15,
        });

        gameContext.setEntity(monster.id, monster);

        const retrieved = gameContext.getEntity<Monster>('test-orc');
        expect(retrieved).toBeDefined();
        expect(retrieved?.name).toBe('Orc Warrior');
        expect(retrieved?.hitDice).toBe('1+1');
        expect(retrieved?.xpValue).toBe(15);
      });
    });
  });

  describe('Item Management', () => {
    it('should store and retrieve items', () => {
      const item = createMockItem({
        id: 'magic-sword',
        name: 'Magic Sword +1',
        magicBonus: 1,
        value: 1000,
      });

      gameContext.setItem(item.id, item);

      const retrieved = gameContext.getItem('magic-sword');
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Magic Sword +1');
      expect(retrieved?.magicBonus).toBe(1);
    });

    it('should handle item updates', () => {
      const item = createMockItem({
        id: 'update-item',
        equipped: false,
      });

      gameContext.setItem(item.id, item);

      const updatedItem = { ...item, equipped: true };
      gameContext.setItem(updatedItem.id, updatedItem);

      const retrieved = gameContext.getItem('update-item');
      expect(retrieved?.equipped).toBe(true);
    });
  });

  describe('Spell Management', () => {
    it('should store and retrieve spells', () => {
      const spell = createMockSpell({
        name: 'Fireball',
        level: 3,
        class: 'Magic-User',
      });

      gameContext.setSpell(spell.name, spell);

      const retrieved = gameContext.getSpell('Fireball');
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Fireball');
      expect(retrieved?.level).toBe(3);
      expect(retrieved?.class).toBe('Magic-User');
    });
  });

  describe('Temporary Data Management', () => {
    it('should handle temporary data storage and retrieval', () => {
      const tempData = { combatRound: 3, initiative: [1, 2, 3] };

      gameContext.setTemporary('combat', tempData);

      const retrieved = gameContext.getTemporary('combat');
      expect(retrieved).toEqual(tempData);
    });

    it('should clear specific temporary data', () => {
      gameContext.setTemporary('temp', { value: 42 });
      expect(gameContext.getTemporary('temp')).toBeDefined();

      gameContext.clearTemporaryKey('temp');
      expect(gameContext.getTemporary('temp')).toBeNull();
    });

    it('should clear all temporary data', () => {
      gameContext.setTemporary('temp1', { a: 1 });
      gameContext.setTemporary('temp2', { b: 2 });

      gameContext.clearTemporary();

      expect(gameContext.getTemporary('temp1')).toBeNull();
      expect(gameContext.getTemporary('temp2')).toBeNull();
    });
  });

  describe('Integration Tests', () => {
    it('should handle complex game state with multiple entities', () => {
      // Create a character
      const character = createMockCharacter({
        id: 'hero',
        name: 'Hero',
        inventory: [],
      });

      // Create items for the character
      const sword = createMockItem({
        id: 'hero-sword',
        name: 'Longsword',
        equipped: true,
      });

      const shield = createMockItem({
        id: 'hero-shield',
        name: 'Shield',
        equipped: true,
      });

      // Create a spell
      const spell = createMockSpell({
        name: 'Cure Light Wounds',
        class: 'Cleric',
      });

      // Store everything
      gameContext.setEntity(character.id, character);
      gameContext.setItem(sword.id, sword);
      gameContext.setItem(shield.id, shield);
      gameContext.setSpell(spell.name, spell);

      // Add temporary combat data
      gameContext.setTemporary('combat', {
        round: 1,
        activeCharacter: 'hero',
      });

      // Verify everything is stored correctly
      expect(gameContext.getEntity<Character>('hero')?.name).toBe('Hero');
      expect(gameContext.getItem('hero-sword')?.equipped).toBe(true);
      expect(gameContext.getItem('hero-shield')?.equipped).toBe(true);
      expect(gameContext.getSpell('Cure Light Wounds')?.class).toBe('Cleric');
      expect(gameContext.getTemporary('combat')).toEqual({
        round: 1,
        activeCharacter: 'hero',
      });
    });

    it('should maintain reactivity with Jotai atoms', () => {
      const character = createMockCharacter({ id: 'reactive-char' });

      // Get initial state using snapshot
      const initialSnapshot = gameContext.createSnapshot();
      expect(initialSnapshot.entities).toHaveLength(0);

      // Add character
      gameContext.setEntity(character.id, character);

      // Verify state updated
      const updatedSnapshot = gameContext.createSnapshot();
      expect(updatedSnapshot.entities).toHaveLength(1);
      expect(updatedSnapshot.entities[0][0]).toBe('reactive-char');
    });
  });
});

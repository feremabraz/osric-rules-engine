import { GameContext } from '@osric/core/GameContext';
import type { Character } from '@osric/types';
import { createCharacterId, createItemId, createMonsterId } from '@osric/types';
import type { Monster } from '@osric/types';
import { createStore } from 'jotai';
import { describe, expect, it } from 'vitest';

describe('GameContext with branded IDs (Phase 3)', () => {
  it('should accept CharacterId in entity APIs', () => {
    const store = createStore();
    const ctx = new GameContext(store);

    const cid = createCharacterId('c-1');
    const character: Character = {
      id: 'c-1',
      name: 'Aria',
      race: 'Human',
      class: 'Fighter',
      level: 1,
      abilities: {
        strength: 16,
        dexterity: 12,
        constitution: 12,
        intelligence: 10,
        wisdom: 10,
        charisma: 10,
      },
      hitPoints: { current: 8, maximum: 8 },
      armorClass: 5,
      thac0: 20,
      experience: { current: 0, requiredForNextLevel: 2000, level: 1 },
      alignment: 'Lawful Good',
      inventory: [],
      position: '0,0',
      statusEffects: [],
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
        Wands: 15,
        'Paralysis, Polymorph, or Petrification': 16,
        'Breath Weapons': 17,
        'Spells, Rods, or Staves': 16,
      },
      spells: [],
      currency: { platinum: 0, gold: 0, electrum: 0, silver: 0, copper: 0 },
      encumbrance: 0,
      movementRate: 120,
      classes: { Fighter: 1 },
      primaryClass: 'Fighter',
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

    ctx.setEntity(cid, character);
    expect(ctx.hasEntity(cid)).toBe(true);
    const fetched = ctx.getEntity<Character>(cid);
    expect(fetched?.id).toBe('c-1');
    ctx.removeEntity(cid);
    expect(ctx.hasEntity(cid)).toBe(false);
  });

  it('should accept ItemId in item APIs', () => {
    const store = createStore();
    const ctx = new GameContext(store);

    const iid = createItemId('i-1');
    const item = {
      id: 'i-1',
      name: 'Longsword',
      weight: 4,
      description: 'A basic longsword',
      value: 15,
      equipped: false,
      magicBonus: null,
      charges: null,
      itemType: 'weapon',
      cursed: false,
    };

    ctx.setItem(iid, item);
    expect(ctx.getItem<typeof item>(iid)?.name).toBe('Longsword');
    ctx.removeItem(iid);
    expect(ctx.getItem<typeof item>(iid)).toBeNull();
  });

  it('should accept MonsterId in entity APIs', () => {
    const store = createStore();
    const ctx = new GameContext(store);

    const mid = createMonsterId('m-1');
    const monster: Monster = {
      id: 'm-1',
      name: 'Goblin',
      level: 1,
      hitPoints: { current: 4, maximum: 4 },
      armorClass: 6,
      thac0: 20,
      experience: { current: 0, requiredForNextLevel: 0, level: 1 },
      alignment: 'Neutral Evil',
      inventory: [],
      position: '1,1',
      statusEffects: [],
      hitDice: '1',
      damagePerAttack: ['1d6'],
      morale: 7,
      treasure: 'Nil',
      specialAbilities: [],
      xpValue: 7,
      size: 'Small',
      movementTypes: [{ type: 'Walk', rate: 90 }],
      habitat: ['Any'],
      frequency: 'Common',
      organization: 'Tribe',
      diet: 'Omnivore',
      ecology: 'Standard',
    };

    ctx.setEntity(mid, monster);
    expect(ctx.hasEntity(mid)).toBe(true);
    const fetched = ctx.getEntity<Monster>(mid);
    expect(fetched?.id).toBe('m-1');
    ctx.removeEntity(mid);
    expect(ctx.hasEntity(mid)).toBe(false);
  });
});

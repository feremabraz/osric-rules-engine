import { GameContext } from '@osric/core/GameContext';
import { LoyaltyRules } from '@osric/rules/npc/LoyaltyRules';
import type { Character } from '@osric/types';
import { createCharacterId } from '@osric/types';
import { createStore } from 'jotai';
import { describe, expect, it } from 'vitest';

function createMockCharacter(overrides: Partial<Character> = {}): Character {
  const base: Character = {
    id: 'c-1',
    name: 'Leader',
    race: 'Human',
    class: 'Fighter',
    level: 3,
    abilities: {
      strength: 12,
      dexterity: 10,
      constitution: 10,
      intelligence: 10,
      wisdom: 10,
      charisma: 12,
    },
    hitPoints: { current: 18, maximum: 18 },
    armorClass: 6,
    thac0: 20,
    experience: { current: 0, requiredForNextLevel: 2000, level: 3 },
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
      Wands: 16,
      'Paralysis, Polymorph, or Petrification': 15,
      'Breath Weapons': 17,
      'Spells, Rods, or Staves': 17,
    },
    spells: [],
    currency: { platinum: 0, gold: 0, electrum: 0, silver: 0, copper: 0 },
    encumbrance: 0,
    movementRate: 120,
    classes: { Fighter: 3 },
    primaryClass: null,
    spellSlots: {},
    memorizedSpells: {},
    spellbook: [],
    thiefSkills: null,
    turnUndead: null,
    languages: ['Common'],
    age: 25,
    ageCategory: 'Adult',
    henchmen: [],
    racialAbilities: [],
    classAbilities: [],
    proficiencies: [],
    secondarySkills: [],
  };
  return { ...base, ...overrides };
}

describe('LoyaltyRules branded ID acceptance', () => {
  it('accepts CharacterId for character and leader IDs', async () => {
    const store = createStore();
    const ctx = new GameContext(store);

    const charId = createCharacterId('c-1');
    const leaderId = createCharacterId('c-2');

    const follower = createMockCharacter({ id: 'c-1', name: 'Follower' });
    const leader = createMockCharacter({ id: 'c-2', name: 'Leader' });

    ctx.setEntity(charId, follower);
    ctx.setEntity(leaderId, leader);

    const rule = new LoyaltyRules();
    const cmd = {
      type: 'loyalty-check',
      params: {
        characterId: charId,
        leaderId,
        followerIds: [charId],
        trigger: 'initial_hire',
        situationalModifiers: { generousPayment: true },
      },
      // minimal Command shape for rule.execute, not used by rule logic directly
      parameters: {},
      actorId: charId,
      targetIds: [leaderId],
      execute: async () => ({ kind: 'success', message: 'noop' }),
      canExecute: () => true,
      getRequiredRules: () => [],
      getInvolvedEntities: () => [charId, leaderId],
    } as import('@osric/core/Command').Command & { params: unknown };

    const result = await rule.execute(ctx, cmd);
    expect(result).toBeDefined();
    expect(['success', 'failure']).toContain(result.kind);
  });
});

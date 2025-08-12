import type { Command } from '@osric/core/Command';
import { GameContext } from '@osric/core/GameContext';
import type { Character, Monster } from '@osric/types';
import { createCharacterId, createMonsterId } from '@osric/types';
import { COMMAND_TYPES } from '@osric/types/constants';
import { createStore } from 'jotai';
import { describe, expect, it } from 'vitest';

import { ExperienceGainRule } from '@osric/rules/experience/ExperienceGainRules';
import { MovementRule } from '@osric/rules/exploration/MovementRules';
import { MoraleRules } from '@osric/rules/npc/MoraleRules';
import { ReactionRules } from '@osric/rules/npc/ReactionRules';

function createMockCharacter(overrides: Partial<Character> = {}): Character {
  const base: Character = {
    id: 'c-1',
    name: 'Hero',
    race: 'Human',
    class: 'Fighter',
    level: 1,
    abilities: {
      strength: 12,
      dexterity: 10,
      constitution: 10,
      intelligence: 10,
      wisdom: 10,
      charisma: 10,
    },
    hitPoints: { current: 8, maximum: 8 },
    armorClass: 10,
    thac0: 20,
    experience: { current: 0, requiredForNextLevel: 2000, level: 1 },
    alignment: 'True Neutral',
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
  return { ...base, ...overrides };
}

function createMockMonster(overrides: Partial<Monster> = {}): Monster {
  const base: Monster = {
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
  return { ...base, ...overrides };
}

function fakeCommand(type: string): Command {
  return {
    type,
    parameters: {},
    actorId: 'c-1',
    targetIds: [],
    async execute() {
      return { kind: 'success', message: 'noop' };
    },
    canExecute() {
      return true;
    },
    getRequiredRules() {
      return [];
    },
    getInvolvedEntities() {
      return [];
    },
  } as Command;
}

describe('Rules accept branded IDs', () => {
  it('ExperienceGainRule.apply accepts CharacterId and MonsterId in parameters', async () => {
    const store = createStore();
    const ctx = new GameContext(store);

    const cid = createCharacterId('c-1');
    const mid = createMonsterId('m-1');

    const character = createMockCharacter({ id: 'c-1' });
    const monster = createMockMonster({ id: 'm-1' });
    ctx.setEntity(cid, character);
    ctx.setEntity(mid, monster);

    ctx.setTemporary('character:experience:gain-params', {
      characterId: cid,
      experienceSource: {
        type: 'combat',
        monsters: [mid],
        description: 'test combat xp',
      },
      partyShare: { enabled: true, partyMemberIds: [cid], equalShare: true },
    });

    const rule = new ExperienceGainRule();
    const result = await rule.apply(ctx, fakeCommand(COMMAND_TYPES.GAIN_EXPERIENCE));
    expect(result).toBeDefined();
    expect(['success', 'failure']).toContain(result.kind);
  });

  it('MovementRule.execute accepts CharacterId in temp data', async () => {
    const store = createStore();
    const ctx = new GameContext(store);

    const cid = createCharacterId('c-1');
    const character = createMockCharacter({ id: 'c-1', armorClass: 10, movementRate: 120 });
    ctx.setEntity(cid, character);

    ctx.setTemporary('movement-request-params', {
      characterId: cid,
      fromPosition: '0,0',
      toPosition: '0,30',
      movementType: 'walk',
      distance: 30,
      terrainType: 'clear',
      encumbrance: 'light',
    });

    const rule = new MovementRule();
    const result = await rule.execute(ctx, fakeCommand(COMMAND_TYPES.MOVE));
    expect(result).toBeDefined();
    expect(result.kind).toBe('success');
  });

  it('ReactionRules.execute accepts CharacterId in params (temporary context)', async () => {
    const store = createStore();
    const ctx = new GameContext(store);

    const cid = createCharacterId('c-1');
    const targetCid = createCharacterId('c-2');

    const c1 = createMockCharacter({
      id: 'c-1',
      abilities: {
        strength: 10,
        dexterity: 10,
        constitution: 10,
        intelligence: 10,
        wisdom: 10,
        charisma: 12,
      },
    });
    const c2 = createMockCharacter({ id: 'c-2' });
    ctx.setEntity(cid, c1);
    ctx.setEntity(targetCid, c2);

    ctx.setTemporary('reaction-roll-params', {
      characterId: cid,
      targetId: targetCid,
      interactionType: 'first_meeting',
      modifiers: { gifts: 1 },
      isPartySpokesperson: true,
    });

    const rule = new ReactionRules();
    const result = await rule.execute(ctx, fakeCommand(COMMAND_TYPES.REACTION_ROLL));
    expect(result).toBeDefined();
    expect(['success', 'failure']).toContain(result.kind);
  });

  it('MoraleRules.execute accepts CharacterId in params and groupIds as branded arrays', async () => {
    const store = createStore();
    const ctx = new GameContext(store);

    const cid = createCharacterId('c-1');
    const gid = createCharacterId('c-3');
    const c1 = createMockCharacter({ id: 'c-1', level: 2 });
    const c3 = createMockCharacter({ id: 'c-3', level: 1 });
    ctx.setEntity(cid, c1);
    ctx.setEntity(gid, c3);

    const rule = new MoraleRules();
    const cmd = fakeCommand(COMMAND_TYPES.MORALE_CHECK);
    Object.assign(cmd, {
      params: {
        characterId: cid,
        groupIds: [gid],
        trigger: 'damage',
      },
    });

    const result = await rule.execute(ctx, cmd);
    expect(result).toBeDefined();
    expect(['success', 'failure']).toContain(result.kind);
    expect(result.message).toContain('Morale check');
  });
});

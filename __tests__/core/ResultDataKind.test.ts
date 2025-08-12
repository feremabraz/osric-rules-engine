import { SavingThrowCommand } from '@osric/commands/character/SavingThrowCommand';
import { ThiefSkillCheckCommand } from '@osric/commands/character/ThiefSkillCheckCommand';
import { GameContext } from '@osric/core/GameContext';
import { RuleChain } from '@osric/core/RuleChain';
import { RuleEngine } from '@osric/core/RuleEngine';
import { SavingThrowRules } from '@osric/rules/character/SavingThrowRules';
import { ThiefSkillRules } from '@osric/rules/character/ThiefSkillRules';
import type { Character as CharacterType, ThiefSkills } from '@osric/types/character';
import { createStore } from 'jotai';
import { describe, expect, it } from 'vitest';

const makeCharacter = (): CharacterType => ({
  id: 'c1',
  name: 'Rogar',
  level: 3,
  hitPoints: { current: 12, maximum: 12 },
  armorClass: 6,
  thac0: 20,
  experience: { current: 0, requiredForNextLevel: 4000, level: 3 },
  alignment: 'True Neutral',
  inventory: [],
  position: 'dungeon',
  statusEffects: [],
  race: 'Human',
  class: 'Fighter',
  abilities: {
    strength: 12,
    dexterity: 12,
    constitution: 12,
    intelligence: 10,
    wisdom: 10,
    charisma: 9,
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
  classes: { Fighter: 3 },
  primaryClass: 'Fighter',
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
});

describe('RuleResult structure without dataKind', () => {
  it('SavingThrowRule returns success or failure with expected data shape', async () => {
    const store = createStore();
    const ctx = new GameContext(store);
    const chain = new RuleChain();
    chain.addRule(new SavingThrowRules());

    const engine = new RuleEngine();
    engine.registerRuleChain('saving-throw', chain);

    const character = makeCharacter();
    ctx.setEntity(character.id, character);

    const cmd = new SavingThrowCommand({ characterId: character.id, saveType: 'spell' });
    const result = await engine.process(cmd, ctx);

    expect(result.kind === 'success' || result.kind === 'failure').toBe(true);
    if (result.kind === 'success') {
      expect(result.data).toHaveProperty('characterId');
      expect(result.data).toHaveProperty('finalSave');
    }
  });

  it('ThiefSkillRule returns success or failure with expected data shape', async () => {
    const store = createStore();
    const ctx = new GameContext(store);
    const chain = new RuleChain();
    chain.addRule(new ThiefSkillRules());

    const engine = new RuleEngine();
    engine.registerRuleChain('use-thief-skill', chain);

    const character: CharacterType = {
      ...makeCharacter(),
      id: 't1',
      class: 'Thief',
      thiefSkills: {
        pickPockets: 30,
        openLocks: 25,
        findTraps: 15,
        removeTraps: 10,
        moveSilently: 25,
        hideInShadows: 20,
        hearNoise: 10,
        climbWalls: 85,
        readLanguages: 0,
      } as ThiefSkills,
    };
    ctx.setEntity(character.id, character);

    const cmd = new ThiefSkillCheckCommand({
      characterId: character.id,
      skillType: 'move-silently',
    });
    const result = await engine.process(cmd, ctx);

    expect(result.kind === 'success' || result.kind === 'failure').toBe(true);
    if (result.kind === 'success') {
      expect(result.data).toHaveProperty('characterId');
    }
  });
});

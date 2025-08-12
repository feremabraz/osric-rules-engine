import { createStore } from 'jotai';
import { describe, expect, it } from 'vitest';

import buildRuleEngine from '@osric/chains/buildRuleEngine';
import { MoveCommand } from '@osric/commands/exploration/MoveCommand';
import { GameContext } from '@osric/core/GameContext';
import type { Character } from '@osric/types/character';

describe('MOVE chain smoke test', () => {
  it('runs the MOVE chain and returns a merged result', async () => {
    const store = createStore();
    const context = new GameContext(store);
    const engine = buildRuleEngine();
    context.setRuleEngine(engine);

    // Minimal character setup
    const character: Character = {
      id: 'char-1',
      name: 'Test Runner',
      level: 1,
      hitPoints: { current: 8, maximum: 8 },
      armorClass: 7,
      thac0: 20,
      experience: { current: 0, requiredForNextLevel: 2000, level: 1 },
      alignment: 'True Neutral',
      inventory: [],
      position: '0,0',
      statusEffects: [],
      race: 'Human',
      class: 'Fighter',
      abilities: {
        strength: 12,
        dexterity: 12,
        constitution: 12,
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
        'Poison or Death': 20,
        Wands: 20,
        'Paralysis, Polymorph, or Petrification': 20,
        'Breath Weapons': 20,
        'Spells, Rods, or Staves': 20,
      },
      spells: [],
      currency: { copper: 0, silver: 0, electrum: 0, gold: 0, platinum: 0 },
      encumbrance: 0,
      movementRate: 120,
      classes: { Fighter: 1 },
      primaryClass: 'Fighter',
      spellSlots: {},
      memorizedSpells: {},
      spellbook: [],
      thiefSkills: null,
      turnUndead: null,
      languages: [],
      age: 20,
      ageCategory: 'Adult',
      henchmen: [],
      racialAbilities: [],
      classAbilities: [],
      proficiencies: [],
      secondarySkills: [],
    };

    context.setEntity(character.id, character);

    const cmd = new MoveCommand(
      {
        characterId: character.id,
        movement: { type: 'walk', distance: 30, destination: '0,30' },
        terrain: { type: 'Normal', environment: 'Dungeon' },
        timeScale: 'combat',
      },
      character.id
    );

    const result = await cmd.execute(context);
    expect(result.kind).toBe('success');
    // Should include merged data from chain
    expect(result.data).toBeDefined();
  });
});

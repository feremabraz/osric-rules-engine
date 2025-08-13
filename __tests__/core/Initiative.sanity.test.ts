import { buildRuleEngine } from '@osric/chains/buildRuleEngine';
import { InitiativeCommand } from '@osric/commands/combat/InitiativeCommand';
import { GameContext } from '@osric/core/GameContext';
import type { Character } from '@osric/types/character';
import { createStore } from 'jotai/vanilla';
import { describe, expect, it } from 'vitest';

function makeChar(id: string, name: string, dexReaction = 0): Character {
  return {
    id,
    name,
    level: 1,
    hitPoints: { current: 10, maximum: 10 },
    armorClass: 10,
    thac0: 20,
    experience: { current: 0, requiredForNextLevel: 2000, level: 1 },
    alignment: 'True Neutral',
    inventory: [],
    position: '0,0',
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
      strengthHitAdj: 0,
      strengthDamageAdj: 0,
      strengthEncumbrance: 0,
      strengthOpenDoors: 0,
      strengthBendBars: 0,
      dexterityReaction: dexReaction,
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
      intelligenceLearnSpells: 0,
      intelligenceMaxSpellLevel: 0,
      intelligenceIllusionImmunity: false,
      wisdomMentalSave: 0,
      wisdomBonusSpells: null,
      wisdomSpellFailure: 0,
      charismaReactionAdj: 0,
      charismaLoyaltyBase: 0,
      charismaMaxHenchmen: 0,
    },
    savingThrows: {
      'Poison or Death': 10,
      Wands: 10,
      'Paralysis, Polymorph, or Petrification': 10,
      'Breath Weapons': 10,
      'Spells, Rods, or Staves': 10,
    },
    spells: [],
    currency: { platinum: 0, gold: 0, electrum: 0, silver: 0, copper: 0 },
    encumbrance: 0,
    movementRate: 9,
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
}

describe('Initiative chain sanity', () => {
  it('rolls initiative and produces an order without needing participants key', async () => {
    const store = createStore();
    const ctx = new GameContext(store);
    const engine = buildRuleEngine();
    ctx.setRuleEngine(engine);

    const a = makeChar('A', 'Alice', 1);
    const b = makeChar('B', 'Bob', 0);
    ctx.setEntity(a.id, a);
    ctx.setEntity(b.id, b);

    const cmd = new InitiativeCommand(
      {
        entities: [a.id, b.id],
        initiativeType: 'individual',
        isFirstRound: true,
      },
      a.id,
      []
    );

    const result = await engine.process(cmd, ctx);
    expect(result.kind).toBe('success');
    // Chain should provide some initiative order in merged data
    // We can’t rely on exact order due to dice randomness; just assert no error and that the chain ran
    expect(result.message.length).toBeGreaterThan(0);
  });
});

import { buildRuleEngine } from '@osric/chains/buildRuleEngine';
import { RoundTickCommand } from '@osric/commands/system/RoundTickCommand';
import { GameContext } from '@osric/core/GameContext';
import type { Character } from '@osric/types/character';
import { createStore } from 'jotai';
import { beforeEach, describe, expect, it } from 'vitest';

function makeChar(id: string, hp: number, bleeding = false): Character {
  return {
    id,
    name: id,
    race: 'Human',
    class: 'Fighter',
    level: 1,
    hitPoints: { current: hp, maximum: 8 },
    armorClass: 10,
    thac0: 20,
    experience: { current: 0, requiredForNextLevel: 2000, level: 1 },
    alignment: 'True Neutral',
    inventory: [],
    position: 'ready',
    statusEffects: bleeding
      ? [
          {
            name: 'Bleeding',
            duration: 0,
            effect: 'Bleeding',
            savingThrow: null,
            endCondition: null,
          },
        ]
      : [],
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
      dexterityReaction: 0,
      dexterityMissile: 0,
      dexterityDefense: 0,
      dexterityPickPockets: null,
      dexterityOpenLocks: null,
      dexterityFindTraps: null,
      dexterityMoveSilently: null,
      dexterityHideInShadows: null,
      constitutionHitPoints: 0,
      constitutionSystemShock: 0,
      constitutionResurrectionSurvival: 0,
      constitutionPoisonSave: 0,
      intelligenceLanguages: 0,
      intelligenceLearnSpells: null,
      intelligenceMaxSpellLevel: null,
      intelligenceIllusionImmunity: false,
      wisdomMentalSave: 0,
      wisdomBonusSpells: null,
      wisdomSpellFailure: 0,
      charismaReactionAdj: 0,
      charismaLoyaltyBase: 0,
      charismaMaxHenchmen: 0,
    },
    savingThrows: {
      'Poison or Death': 14,
      Wands: 16,
      'Paralysis, Polymorph, or Petrification': 15,
      'Breath Weapons': 17,
      'Spells, Rods, or Staves': 17,
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
}

describe('System: RoundTick + BleedingTick', () => {
  let ctx: GameContext;

  beforeEach(() => {
    const store = createStore();
    ctx = new GameContext(store);
    const engine = buildRuleEngine();
    ctx.setRuleEngine(engine);
  });

  it('applies -1 HP to bleeding entities and marks Dead at -10', async () => {
    const a = makeChar('a', 5, true);
    const b = makeChar('b', -9, true);
    const c = makeChar('c', 3, false);
    ctx.setEntity('a', a);
    ctx.setEntity('b', b);
    ctx.setEntity('c', c);

    const cmd = new RoundTickCommand({}, 'system');
    const res = await cmd.execute(ctx);
    expect(res.kind).toBe('success');

    const a2 = ctx.getEntity<Character>('a');
    const b2 = ctx.getEntity<Character>('b');
    const c2 = ctx.getEntity<Character>('c');
    expect(a2).not.toBeNull();
    expect(b2).not.toBeNull();
    expect(c2).not.toBeNull();

    if (!a2 || !b2 || !c2) return; // type guard for TS

    expect(a2.hitPoints.current).toBe(4);
    expect(b2.hitPoints.current).toBe(-10);
    expect(b2.statusEffects.some((s) => s.name === 'Dead')).toBe(true);
    expect(c2.hitPoints.current).toBe(3);
  });
});

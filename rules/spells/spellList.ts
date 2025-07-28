import type { SavingThrowType, Spell, SpellClass } from '@rules/types';

/**
 * This file contains the spell lists for all classes in OSRIC.
 * Spells are organized by class and then by level.
 *
 * Range values are in meters (converted from feet in original OSRIC rules)
 * Areas of effect are also in metric units
 */

// Helper function to create spells with default implementations
const createSpell = (
  name: string,
  level: number,
  spellClass: SpellClass,
  range: string,
  duration: string,
  areaOfEffect: string,
  components: string[],
  castingTime: string,
  savingThrow: SavingThrowType | 'None',
  description: string,
  reversible = false,
  materialComponents: string[] | null = null
): Spell => {
  return {
    name,
    level,
    class: spellClass,
    range,
    duration,
    areaOfEffect,
    components,
    castingTime,
    savingThrow,
    description,
    reversible,
    materialComponents,
    effect: (_caster, _targets) => {
      // Default implementation that will be overridden for specific spells
      return {
        damage: null,
        healing: null,
        statusEffects: null,
        narrative: `${_caster.name} casts ${name}, but nothing happens yet as the specific spell effect is not implemented.`,
      };
    },
  };
};

// === MAGIC-USER SPELLS ===

// Level 1
export const magicUserLevel1Spells: Spell[] = [
  createSpell(
    'Magic Missile',
    1,
    'Magic-User',
    '18 meters + 1.5 meters per level',
    'Instantaneous',
    'One or more targets',
    ['V', 'S'],
    '1 segment',
    'None',
    'Creates one or more magic missiles that automatically hit their targets for 1d4+1 damage each. One missile at levels 1-2, two at 3-4, three at 5-6, etc.'
  ),
  createSpell(
    'Shield',
    1,
    'Magic-User',
    'Self',
    '5 rounds per level',
    'Personal',
    ['V', 'S'],
    '1 segment',
    'None',
    'Creates an invisible barrier that provides AC 2 against missiles and AC 4 against other attacks'
  ),
  createSpell(
    'Sleep',
    1,
    'Magic-User',
    '9 meters + 1.5 meters per level',
    '5 rounds per level',
    '12 square meters',
    ['V', 'S', 'M'],
    '1 segment',
    'None',
    'Causes 2d4 HD of creatures to fall asleep. Affects lowest HD creatures first.',
    false,
    ['Fine sand', 'Rose petals', 'Cricket']
  ),
];

// Level 2
export const magicUserLevel2Spells: Spell[] = [
  createSpell(
    'Invisibility',
    2,
    'Magic-User',
    'Touch',
    'Special',
    'Creature touched',
    ['V', 'S', 'M'],
    '2 segments',
    'None',
    'Subject becomes invisible until it attacks or the spell is dispelled.',
    false,
    ['Eyelash encased in gum arabic']
  ),
  createSpell(
    'Web',
    2,
    'Magic-User',
    '1.5 meters per level',
    '2 turns per level',
    '6 cubic meters per level',
    ['V', 'S', 'M'],
    '2 segments',
    'Spells, Rods, or Staves',
    'Creates sticky webs that trap creatures. Strong creatures can break free in 2d4 rounds, others take 2d4 turns.',
    false,
    ['Spider web']
  ),
];

// === CLERIC SPELLS ===

// Level 1
export const clericLevel1Spells: Spell[] = [
  createSpell(
    'Cure Light Wounds',
    1,
    'Cleric',
    'Touch',
    'Permanent',
    'Creature touched',
    ['V', 'S'],
    '5 segments',
    'None',
    'Heals 1d8 points of damage to a creature by touch.',
    true
  ),
  createSpell(
    'Bless',
    1,
    'Cleric',
    '18 meters',
    '6 rounds',
    '15 square meters',
    ['V', 'S', 'M'],
    '1 round',
    'None',
    'Allies gain +1 to attack rolls and morale checks.',
    true,
    ['Holy water']
  ),
];

// === DRUID SPELLS ===

// Level 1
export const druidLevel1Spells: Spell[] = [
  createSpell(
    'Entangle',
    1,
    'Druid',
    '24 meters',
    '1 turn',
    '12 meters radius',
    ['V', 'S', 'M'],
    '4 segments',
    'Spells, Rods, or Staves',
    'Plants entangle creatures, holding them for the duration.',
    false,
    ['Plant material']
  ),
  createSpell(
    'Faerie Fire',
    1,
    'Druid',
    '24 meters',
    '4 rounds + 1 round per level',
    'Creature(s) within a 1.2-meter radius',
    ['V', 'S', 'M'],
    '4 segments',
    'None',
    'Outlines subjects with light, negating blur, invisibility, etc.',
    false,
    ['Firefly']
  ),
];

// === ILLUSIONIST SPELLS ===

// Level 1
export const illusionistLevel1Spells: Spell[] = [
  createSpell(
    'Color Spray',
    1,
    'Illusionist',
    '3 meters per level',
    'Instantaneous',
    'Cone 1.5 meters wide, 1.5 meters per level long',
    ['V', 'S', 'M'],
    '1 segment',
    'Spells, Rods, or Staves',
    'Cone of clashing colors causes targets to become stunned, blinded, or unconscious.',
    false,
    ['Powder or sand of red, yellow, and blue colors']
  ),
  createSpell(
    'Phantasmal Force',
    1,
    'Illusionist',
    '18 meters + 3 meters per level',
    'Special',
    '6 square meters + 3 square meters per level',
    ['V', 'S', 'M'],
    '1 segment',
    'Spells, Rods, or Staves',
    "Creates an illusion of the caster's choice. Deals 1d6 damage if believed and used as an attack.",
    false,
    ['Bit of fleece']
  ),
];

// Export all spell lists by class and level
export const spellLists: Record<SpellClass, Record<number, Spell[]>> = {
  'Magic-User': {
    1: magicUserLevel1Spells,
    2: magicUserLevel2Spells,
    // Additional levels would be added here
  },
  Cleric: {
    1: clericLevel1Spells,
    // Additional levels would be added here
  },
  Druid: {
    1: druidLevel1Spells,
    // Additional levels would be added here
  },
  Illusionist: {
    1: illusionistLevel1Spells,
    // Additional levels would be added here
  },
};

// Utility function to find a spell by name (case-insensitive)
export function findSpellByName(spellName: string): Spell | undefined {
  const normalizedName = spellName.toLowerCase();

  for (const className of Object.keys(spellLists)) {
    const classSpells = spellLists[className as SpellClass];

    for (const levelKey of Object.keys(classSpells)) {
      const level = Number(levelKey);
      const levelSpells = classSpells[level];

      const foundSpell = levelSpells.find(
        (spell: Spell) => spell.name.toLowerCase() === normalizedName
      );

      if (foundSpell) return foundSpell;
    }
  }

  return undefined;
}

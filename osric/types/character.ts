// Character-related types
export interface AbilityScores {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}
import type { Item } from './item';
import type {
  ClassAbility,
  Currency,
  RacialAbility,
  SavingThrowType,
  StatusEffect,
} from './shared';
import type { Spell } from './spell';

export const CharacterClasses = [
  'Fighter',
  'Paladin',
  'Ranger',
  'Magic-User',
  'Illusionist',
  'Cleric',
  'Druid',
  'Thief',
  'Assassin',
  'Monk',
] as const;
export type CharacterClass = (typeof CharacterClasses)[number];

export const CharacterRaces = [
  'Human',
  'Dwarf',
  'Elf',
  'Gnome',
  'Half-Elf',
  'Halfling',
  'Half-Orc',
] as const;
export type CharacterRace = (typeof CharacterRaces)[number];

export const CharacterSexes = ['male', 'female'] as const;
export type CharacterSex = (typeof CharacterSexes)[number];

export const Alignments = [
  'Lawful Good',
  'Lawful Neutral',
  'Lawful Evil',
  'Neutral Good',
  'True Neutral',
  'Neutral Evil',
  'Chaotic Good',
  'Chaotic Neutral',
  'Chaotic Evil',
] as const;
export type Alignment = (typeof Alignments)[number];

export interface Experience {
  current: number;
  requiredForNextLevel: number;
  level: number;
}

export interface AbilityScoreModifiers {
  strengthHitAdj: number | null;
  strengthDamageAdj: number | null;
  strengthEncumbrance: number | null;
  strengthOpenDoors: number | null;
  strengthBendBars: number | null;
  dexterityReaction: number | null;
  dexterityMissile: number | null;
  dexterityDefense: number | null;
  dexterityPickPockets: number | null;
  dexterityOpenLocks: number | null;
  dexterityFindTraps: number | null;
  dexterityMoveSilently: number | null;
  dexterityHideInShadows: number | null;
  constitutionHitPoints: number | null;
  constitutionSystemShock: number | null;
  constitutionResurrectionSurvival: number | null;
  constitutionPoisonSave: number | null;
  intelligenceLanguages: number | null;
  intelligenceLearnSpells: number | null;
  intelligenceMaxSpellLevel: number | null;
  intelligenceIllusionImmunity: boolean;
  wisdomMentalSave: number | null;
  wisdomBonusSpells: Record<number, number> | null;
  wisdomSpellFailure: number | null;
  charismaReactionAdj: number | null;
  charismaLoyaltyBase: number | null;
  charismaMaxHenchmen: number | null;
}

export interface ThiefSkills {
  pickPockets: number;
  openLocks: number;
  findTraps: number;
  removeTraps: number;
  moveSilently: number;
  hideInShadows: number;
  hearNoise: number;
  climbWalls: number;
  readLanguages: number | null;
}

export const AgeCategories = ['Young', 'Adult', 'Middle-Aged', 'Old', 'Venerable'] as const;
export type AgeCategory = (typeof AgeCategories)[number];

export interface WeaponProficiency {
  weapon: string;
  penalty: number;
}

export interface TurnUndeadTable {
  level: number;
  results: Record<string, number>;
}

export interface CharacterSecondarySkill {
  skill: string;
  level: string;
}

export interface WeaponSpecialization {
  weapon: string;
  bonuses: Record<string, number>;
}

export type SpellSlots = Record<number, number>;

export interface BaseCharacter {
  id: string;
  name: string;
  level: number;
  hitPoints: {
    current: number;
    maximum: number;
  };
  armorClass: number;
  thac0: number;
  experience: Experience;
  alignment: Alignment;
  inventory: Item[];
  position: string;
  statusEffects: StatusEffect[];
}

export interface Character extends BaseCharacter {
  race: CharacterRace;
  class: CharacterClass;
  abilities: AbilityScores;
  abilityModifiers: AbilityScoreModifiers;
  savingThrows: Record<SavingThrowType, number>;
  spells: Spell[];
  currency: Currency;
  encumbrance: number;
  movementRate: number;
  classes: Partial<Record<CharacterClass, number>>;
  primaryClass: CharacterClass | null;
  spellSlots: SpellSlots;
  memorizedSpells: Record<number, Spell[]>;
  spellbook: Spell[];
  thiefSkills: ThiefSkills | null;
  turnUndead: TurnUndeadTable | null;
  languages: string[];
  age: number;
  ageCategory: AgeCategory;
  henchmen: Character[];
  racialAbilities: RacialAbility[];
  classAbilities: ClassAbility[];
  proficiencies: WeaponProficiency[];
  secondarySkills: CharacterSecondarySkill[];
  weaponSpecializations?: WeaponSpecialization[];
}

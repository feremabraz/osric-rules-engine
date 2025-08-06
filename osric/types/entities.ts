/**
 * Core entity types for the OSRIC Rules Engine
 *
 * These types are extracted and preserved from the original rules/types.ts
 * maintaining all OSRIC AD&D 1st Edition domain knowledge and values.
 */

// Basic OSRIC types - PRESERVE ALL VALUES
export interface AbilityScores {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

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

export const SavingThrowTypes = [
  'Poison or Death',
  'Wands',
  'Paralysis, Polymorph, or Petrification',
  'Breath Weapons',
  'Spells, Rods, or Staves',
] as const;

export type SavingThrowType = (typeof SavingThrowTypes)[number];

// Experience tracking
export interface Experience {
  current: number;
  requiredForNextLevel: number;
  level: number;
}

// Currency system
export interface Currency {
  platinum: number;
  gold: number;
  electrum: number;
  silver: number;
  copper: number;
}

// Status effects
export interface StatusEffect {
  name: string;
  duration: number; // In rounds, turns, or days
  effect: string;
  savingThrow: SavingThrowType | null;
  endCondition: string | null;
}

// Base character interface - PRESERVE ALL PROPERTIES
export interface BaseCharacter {
  id: string;
  name: string;
  level: number;
  hitPoints: {
    current: number;
    maximum: number;
  };
  armorClass: number; // Descending AC system (lower is better)
  thac0: number; // "To Hit Armor Class 0"
  experience: Experience;
  alignment: Alignment;
  inventory: Item[];
  position: string; // e.g., "near goblin" or "crossing the bridge"
  statusEffects: StatusEffect[]; // Active effects/conditions
}

// Ability score modifiers - PRESERVE ALL OSRIC CALCULATIONS
export interface AbilityScoreModifiers {
  // Strength
  strengthHitAdj: number | null;
  strengthDamageAdj: number | null;
  strengthEncumbrance: number | null;
  strengthOpenDoors: number | null;
  strengthBendBars: number | null;

  // Dexterity
  dexterityReaction: number | null;
  dexterityMissile: number | null;
  dexterityDefense: number | null;
  dexterityPickPockets: number | null;
  dexterityOpenLocks: number | null;
  dexterityFindTraps: number | null;
  dexterityMoveSilently: number | null;
  dexterityHideInShadows: number | null;

  // Constitution
  constitutionHitPoints: number | null;
  constitutionSystemShock: number | null;
  constitutionResurrectionSurvival: number | null;
  constitutionPoisonSave: number | null;

  // Intelligence
  intelligenceLanguages: number | null;
  intelligenceLearnSpells: number | null;
  intelligenceMaxSpellLevel: number | null;
  intelligenceIllusionImmunity: boolean;

  // Wisdom
  wisdomMentalSave: number | null;
  wisdomBonusSpells: Record<number, number> | null; // Level -> Count
  wisdomSpellFailure: number | null;

  // Charisma
  charismaReactionAdj: number | null;
  charismaLoyaltyBase: number | null;
  charismaMaxHenchmen: number | null;
}

// Spell system types
export type SpellSlots = Record<number, number>; // Level -> Count

export const SpellClasses = ['Magic-User', 'Cleric', 'Druid', 'Illusionist'] as const;
export type SpellClass = (typeof SpellClasses)[number];

// Thief skills - PRESERVE OSRIC PERCENTAGES
export interface ThiefSkills {
  pickPockets: number;
  openLocks: number;
  findTraps: number;
  removeTraps: number;
  moveSilently: number;
  hideInShadows: number;
  hearNoise: number;
  climbWalls: number;
  readLanguages: number | null; // Higher level ability
}

// Age categories for aging effects
export const AgeCategories = ['Young', 'Adult', 'Middle-Aged', 'Old', 'Venerable'] as const;
export type AgeCategory = (typeof AgeCategories)[number];

// Weapon proficiency
export interface WeaponProficiency {
  weapon: string;
  penalty: number; // Penalty for non-proficient use
}

// Turn undead table - PRESERVE OSRIC TABLES
export interface TurnUndeadTable {
  level: number; // Cleric level
  results: Record<string, number>; // Undead type -> result needed on 2d6
}

// Full Character interface - PRESERVE ALL OSRIC PROPERTIES
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
  classes: Partial<Record<CharacterClass, number>>; // For multi-classing with level per class
  primaryClass: CharacterClass | null; // For dual-classing
  spellSlots: SpellSlots;
  memorizedSpells: Record<number, Spell[]>; // Level -> Spells
  spellbook: Spell[]; // For Magic-Users and Illusionists
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
  weaponSpecializations?: WeaponSpecialization[]; // Optional weapon specializations for fighters
}

// Creature sizes
export const CreatureSizes = ['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan'] as const;
export type CreatureSize = (typeof CreatureSizes)[number];

// Movement types
export const MovementTypes = ['Walk', 'Fly', 'Swim', 'Burrow', 'Climb'] as const;
export type MovementTypeValue = (typeof MovementTypes)[number];

export interface MovementType {
  type: MovementTypeValue;
  rate: number;
}

// Monster frequency
export const MonsterFrequencies = ['Common', 'Uncommon', 'Rare', 'Very Rare', 'Unique'] as const;
export type MonsterFrequency = (typeof MonsterFrequencies)[number];

// Monster interface - PRESERVE ALL OSRIC MONSTER PROPERTIES
export interface Monster extends BaseCharacter {
  hitDice: string; // e.g., "3+1" for 3d8+1
  damagePerAttack: string[]; // e.g., ["1d8", "1d6/1d6"] for a monster with multiple attacks
  morale: number;
  treasure: string; // OSRIC treasure type (A, B, C, etc.)
  specialAbilities: string[];
  xpValue: number;
  size: CreatureSize;
  movementTypes: MovementType[];
  habitat: string[];
  frequency: MonsterFrequency;
  organization: string;
  diet: string;
  ecology: string;
  exceptional?: boolean; // Flag for unique or particularly challenging monsters
}

// Items - PRESERVE ALL OSRIC ITEM PROPERTIES
export interface Item {
  id: string;
  name: string;
  weight: number; // in coins (10 coins = 0.5 kg, converted from 1 pound)
  description: string;
  value: number; // in gold pieces
  equipped: boolean;
  magicBonus: number | null;
  charges: number | null;
}

// Weapon types and properties - PRESERVE OSRIC VALUES
export const WeaponTypes = ['Melee', 'Ranged'] as const;
export type WeaponType = (typeof WeaponTypes)[number];

export const WeaponSizes = ['Small', 'Medium', 'Large'] as const;
export type WeaponSize = (typeof WeaponSizes)[number];

export interface Weapon extends Item {
  damage: string; // e.g., "1d8" for longsword
  type: WeaponType;
  size: WeaponSize;
  speed: number; // Weapon speed factor (lower is faster)
  allowedClasses: CharacterClass[];
  damageVsLarge: string | null; // Different damage vs. large creatures
  range: [number, number, number] | null; // For ranged weapons [short, medium, long]
  twoHanded: boolean;
}

// Armor types - PRESERVE OSRIC VALUES
export const ArmorTypes = ['Shield', 'Armor'] as const;
export type ArmorType = (typeof ArmorTypes)[number];

export interface Armor extends Item {
  armorClass: number; // AC provided
  type: ArmorType;
  allowedClasses: CharacterClass[];
  movementPenalty: number | null;
}

// Spell interface - PRESERVE ALL OSRIC SPELL MECHANICS
export interface Spell {
  name: string;
  level: number;
  class: SpellClass;
  range: string;
  duration: string;
  areaOfEffect: string;
  components: string[];
  castingTime: string;
  savingThrow: SavingThrowType | 'None';
  description: string;
  reversible: boolean;
  materialComponents: string[] | null;
  effect: (caster: Character, targets: (Character | Monster)[]) => SpellResult;
}

export interface SpellResult {
  damage: number[] | null;
  healing: number[] | null;
  statusEffects: StatusEffect[] | null;
  narrative: string; // Describes the result of the spell in the world
}

// Racial and class abilities - PRESERVE OSRIC MECHANICS
export interface RacialAbility {
  name: string;
  description: string;
  effect: (character: Character) => void;
}

export interface ClassAbility {
  name: string;
  description: string;
  level: number; // Level at which this ability is gained
  class: CharacterClass;
  effect: (character: Character, target?: Character | Monster) => ActionResult;
}

// Action result interface
export interface ActionResult {
  success: boolean;
  message: string;
  damage: number[] | null;
  effects: string[] | null;
}

// Combat result interface - PRESERVE OSRIC COMBAT MECHANICS
export interface CombatResult {
  hit: boolean;
  damage: number[];
  critical: boolean;
  message: string;
  specialEffects: StatusEffect[] | null;
}

// Placeholder for secondary skills (will be imported from character module)
export interface CharacterSecondarySkill {
  skill: string;
  level: string;
}

// Placeholder for weapon specialization (will be imported from combat module)
export interface WeaponSpecialization {
  weapon: string;
  bonuses: Record<string, number>;
}

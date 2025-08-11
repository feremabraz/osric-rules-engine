export interface AbilityScores {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

// Branded IDs (to be adopted across the codebase in a following phase)
export type Brand<T, B extends string> = T & { readonly __brand: B };
export type CharacterId = Brand<string, 'CharacterId'>;
export type ItemId = Brand<string, 'ItemId'>;
export type MonsterId = Brand<string, 'MonsterId'>;
export type SpellId = Brand<string, 'SpellId'>;

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

export interface Experience {
  current: number;
  requiredForNextLevel: number;
  level: number;
}

export interface Currency {
  platinum: number;
  gold: number;
  electrum: number;
  silver: number;
  copper: number;
}

export interface StatusEffect {
  name: string;
  duration: number;
  effect: string;
  savingThrow: SavingThrowType | null;
  endCondition: string | null;
}

export interface BaseCharacter {
  id: string; // will migrate to CharacterId
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

export type SpellSlots = Record<number, number>;

export const SpellClasses = ['Magic-User', 'Cleric', 'Druid', 'Illusionist'] as const;
export type SpellClass = (typeof SpellClasses)[number];

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

export const CreatureSizes = ['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan'] as const;
export type CreatureSize = (typeof CreatureSizes)[number];

export const MovementTypes = ['Walk', 'Fly', 'Swim', 'Burrow', 'Climb'] as const;
export type MovementTypeValue = (typeof MovementTypes)[number];

export interface MovementType {
  type: MovementTypeValue;
  rate: number;
}

export const MonsterFrequencies = ['Common', 'Uncommon', 'Rare', 'Very Rare', 'Unique'] as const;
export type MonsterFrequency = (typeof MonsterFrequencies)[number];

export interface Monster extends BaseCharacter {
  hitDice: string;
  damagePerAttack: string[];
  morale: number;
  treasure: string;
  specialAbilities: string[];
  xpValue: number;
  size: CreatureSize;
  movementTypes: MovementType[];
  habitat: string[];
  frequency: MonsterFrequency;
  organization: string;
  diet: string;
  ecology: string;
  exceptional?: boolean;
}

export interface Item {
  id: string; // will migrate to ItemId
  name: string;
  weight: number;
  description: string;
  value: number;
  equipped: boolean;
  magicBonus: number | null;
  charges: number | null;
  // Legacy/minimal compatibility fields (from unified core types)
  itemType?: string;
  commandWord?: string;
  cursed?: boolean;
}

export const WeaponTypes = ['Melee', 'Ranged'] as const;
export type WeaponType = (typeof WeaponTypes)[number];

export const WeaponSizes = ['Small', 'Medium', 'Large'] as const;
export type WeaponSize = (typeof WeaponSizes)[number];

export interface Weapon extends Item {
  damage: string;
  type: WeaponType;
  size: WeaponSize;
  speed: number;
  allowedClasses: CharacterClass[];
  damageVsLarge: string | null;
  range: [number, number, number] | null;
  twoHanded: boolean;
}

export const ArmorTypes = ['Shield', 'Armor'] as const;
export type ArmorType = (typeof ArmorTypes)[number];

export interface Armor extends Item {
  armorClass: number;
  type: ArmorType;
  allowedClasses: CharacterClass[];
  movementPenalty: number | null;
}

export interface Spell {
  name: string;
  level: number;
  class: SpellClass;
  // Optional legacy/minimal field for categorization
  school?: string;
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
  narrative: string;
}

export interface RacialAbility {
  name: string;
  description: string;
  effect: (character: Character) => void;
}

export interface ClassAbility {
  name: string;
  description: string;
  level: number;
  class: CharacterClass;
  effect: (character: Character, target?: Character | Monster) => ActionResult;
}

export interface ActionResult {
  success: boolean;
  message: string;
  damage: number[] | null;
  effects: string[] | null;
}

export interface CombatResult {
  hit: boolean;
  damage: number[];
  critical: boolean;
  message: string;
  specialEffects: StatusEffect[] | null;
}

export interface CharacterSecondarySkill {
  skill: string;
  level: string;
}

export interface WeaponSpecialization {
  weapon: string;
  bonuses: Record<string, number>;
}

// Shared utility types (unified into entities for single-source model)
export interface AttackRoll {
  roll: number;
  modifier: number;
  total: number;
  hit: boolean;
}

export interface Damage {
  amount: number;
  type: string;
}

export interface GameTime {
  rounds: number;
  turns: number;
  hours: number;
  days: number;
}

export interface Position {
  x: number;
  y: number;
  z?: number;
}

export interface Movement {
  base: number;
  current: number;
  encumbered: boolean;
}

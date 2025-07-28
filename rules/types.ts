// OSRIC-specific types

import type { CharacterSecondarySkill } from './character/secondarySkills';

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

// Common base for all characters (PC, NPCs, animals, and monsters)
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

// Character-specific info (Player or NPC/Monster)
// Import specialization types from combat/specialization
import type { WeaponSpecialization } from '@rules/combat/specialization';

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
  secondarySkills: CharacterSecondarySkill[]; // Secondary skills from non-class background
  weaponSpecializations?: WeaponSpecialization[]; // Optional weapon specializations for fighters
}

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

export const ArmorTypes = ['Shield', 'Armor'] as const;
export type ArmorType = (typeof ArmorTypes)[number];

export interface Armor extends Item {
  armorClass: number; // AC provided
  type: ArmorType;
  allowedClasses: CharacterClass[];
  movementPenalty: number | null;
}

// Dice rolls, including THAC0-based attack rolls
export interface DiceRoll {
  roll: number;
  sides: number; // Number of sides (e.g., 20 for d20)
  modifier: number;
  result: number; // Result could be the actual roll + modifier
}

// Base effect interface
export interface BaseEffect {
  type: string;
  source: string;
  duration: number;
}

// Damage multiplier effect
export interface DamageMultiplierEffect extends BaseEffect {
  type: 'damageMultiplier';
  value: number;
}

export interface FallingEffect extends BaseEffect {
  type: 'falling';
  distance: number;
}

export type Effect = string | BaseEffect | DamageMultiplierEffect | FallingEffect;

// Result of an action that modifies game state
export interface ActionResult {
  success: boolean;
  message: string;
  damage: number[] | null; // Example: [5, 3] for two rolls of damage
  effects: Effect[] | null; // Can be strings or complex effect objects
}

// Action types (from the user input)
export const ActionTypes = [
  'Attack',
  'CastSpell',
  'SavingThrow',
  'SkillCheck',
  'Movement',
  'UseItem',
  'TurnUndead',
  'SpecialAbility',
  'Grapple',
  'TwoWeaponFighting',
] as const;

export type ActionType = (typeof ActionTypes)[number];

// Abstracted Action
export interface Action {
  type: ActionType;
  actor: Character | Monster;
  offhandItem?: Item; // For two-weapon fighting
  target?: Character | Monster | string;
  item?: Item | Weapon | Armor;
  diceRoll?: DiceRoll;
}

export const SpellClasses = ['Magic-User', 'Cleric', 'Druid', 'Illusionist'] as const;
export type SpellClass = (typeof SpellClasses)[number];

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

export interface SavingThrowAction {
  type: SavingThrowType;
  targetValue: number;
  roller: Character | Monster;
  modifier: number;
}

export interface CombatResult {
  hit: boolean;
  damage: number[]; // Array of damage rolls
  critical: boolean; // Whether this is a critical hit
  message: string;
  specialEffects: StatusEffect[] | null;
}

export interface Experience {
  current: number;
  requiredForNextLevel: number;
  level: number;
}

// Initiative result for combat order
export interface InitiativeResult {
  roller: Character | Monster;
  initiative: number;
  surprise: boolean;
  segmentOrder: number;
  weaponSpeedFactor: number; // Used for breaking initiative ties
}

export interface Encounter {
  id: string;
  name: string;
  monsters: Monster[];
  environment: Environment;
  difficultyLevel: number;
  treasure: string | null; // OSRIC treasure type
  surpriseChance: number; // Percentage chance of surprise
  lighting: LightingCondition;
  terrain: TerrainType;
  npcs: Character[] | null;
  triggers: EncounterTrigger[] | null;
  reactions: EncounterReaction[] | null;
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
  readLanguages: number | null; // Higher level ability
}

export interface Currency {
  platinum: number;
  gold: number;
  electrum: number;
  silver: number;
  copper: number;
}

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

export type SpellSlots = Record<number, number>; // Level -> Count

export interface SpellcasterInfo {
  memorizedSpells: Record<number, Spell[]>; // Level -> Spells
  spellSlots: SpellSlots;
  spellbook: Spell[] | null; // For Magic-Users and Illusionists
}

// Racial abilities
export interface RacialAbility {
  name: string;
  description: string;
  effect: (character: Character) => void;
}

// Class abilities
export interface ClassAbility {
  name: string;
  description: string;
  level: number; // Level at which this ability is gained
  class: CharacterClass;
  effect: (character: Character, target?: Character | Monster) => ActionResult;
}

// Weather conditions
export const WeatherConditions = ['Clear', 'Cloudy', 'Rain', 'Storm', 'Snow', 'Fog'] as const;

export type WeatherCondition = (typeof WeatherConditions)[number];

// Types of movement
export const MovementTypes = ['Walk', 'Fly', 'Swim', 'Burrow', 'Climb'] as const;
export type MovementTypeValue = (typeof MovementTypes)[number];

export interface MovementType {
  type: MovementTypeValue;
  rate: number;
}

// Creature sizes
export const CreatureSizes = ['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan'] as const;

export type CreatureSize = (typeof CreatureSizes)[number];

// Monster frequency
export const MonsterFrequencies = ['Common', 'Uncommon', 'Rare', 'Very Rare', 'Unique'] as const;

export type MonsterFrequency = (typeof MonsterFrequencies)[number];

export interface TurnUndeadTable {
  level: number; // Cleric level
  results: Record<string, number>; // Undead type -> result needed on 2d6
}

export const AgeCategories = ['Young', 'Adult', 'Middle-Aged', 'Old', 'Venerable'] as const;

export type AgeCategory = (typeof AgeCategories)[number];

export interface WeaponProficiency {
  weapon: string;
  penalty: number; // Penalty for non-proficient use
}

export const Environments = [
  'Dungeon',
  'Wilderness',
  'Urban',
  'Underwater',
  'Aerial',
  'Mountain',
  'Forest',
  'Desert',
  'Swamp',
  'Plains',
  'Arctic',
] as const;

export type Environment = (typeof Environments)[number];

export const LightingConditions = ['Bright', 'Dim', 'Darkness'] as const;

export type LightingCondition = (typeof LightingConditions)[number];

export const TerrainTypes = ['Normal', 'Difficult', 'Very Difficult', 'Impassable'] as const;

export type TerrainType = (typeof TerrainTypes)[number];

export const EncounterTriggerTypes = ['Time', 'Action', 'Location'] as const;
export type EncounterTriggerType = (typeof EncounterTriggerTypes)[number];

export interface EncounterTrigger {
  type: EncounterTriggerType;
  condition: string;
  result: string;
}

export interface EncounterReaction {
  condition: string;
  reaction: string;
  adjustments: Record<string, number>;
}

export interface StatusEffect {
  name: string;
  duration: number; // In rounds, turns, or days
  effect: string;
  savingThrow: SavingThrowType | null;
  endCondition: string | null;
}

// Falling damage system types
export interface FallingDamageParams {
  character: Character;
  distance: number; // Distance fallen in meters
  modifiers?: {
    damageFactor?: number; // Multiplier for damage (default 1.0)
  };
}

export interface FallingDamageResult {
  success: boolean;
  message: string;
  damage: number[] | null;
  effects: string[] | null;
  distance: number;
  damagePerDie: number;
  diceRolled: number;
}

// Re-export time system types
export type {
  GameTime,
  TimeUnitType,
  TimeUnit,
  TimeOfDayPhase,
  TimeOfDayPhases,
  Season,
  Seasons,
  TimedEffect,
  DurationDescriptor,
} from './time/types';

// Environment system types
export interface SurvivalStatus {
  daysSinceLastFood: number;
  daysSinceLastWater: number;
  currentEffects: string[];
}

export interface SurvivalNeedParams {
  character: Character;
  status: SurvivalStatus;
  isDesertEnvironment?: boolean;
  isFrigidEnvironment?: boolean;
  modifiers?: {
    constitutionBonus?: number;
  };
}

export interface SurvivalNeedResult {
  success: boolean;
  message: string;
  damage: number[] | null;
  effects: string[] | null;
  status: SurvivalStatus;
  damageApplied: number;
  statPenalties: Record<string, number>;
}

export const SwimmingDifficulties = ['Calm', 'Choppy', 'Rough', 'Stormy', 'Treacherous'] as const;
export type SwimmingDifficulty = (typeof SwimmingDifficulties)[number];

export interface SwimmingParams {
  character: Character;
  difficulty: SwimmingDifficulty;
  armorWorn: boolean;
  encumbered: boolean;
  consecutiveRounds?: number;
  modifiers?: {
    strengthBonus?: number;
    constitutionBonus?: number;
  };
}

export interface SwimmingResult {
  success: boolean;
  message: string;
  damage: number[] | null;
  effects: string[] | null;
  roundsBeforeTiring: number | null;
  roundsBeforeDrowning: number | null;
  difficulty: SwimmingDifficulty;
}

export const TemperatureRanges = [
  'Frigid',
  'Cold',
  'Cool',
  'Moderate',
  'Warm',
  'Hot',
  'Extreme',
] as const;
export type TemperatureRange = (typeof TemperatureRanges)[number];

export interface TemperatureEffectParams {
  character: Character;
  temperature: TemperatureRange;
  hoursExposed: number;
  hasAppropriateClothing?: boolean;
  hasAppropriateEquipment?: boolean;
  hasShelter?: boolean;
  modifiers?: {
    constitutionBonus?: number;
  };
}

export interface TemperatureEffectResult {
  success: boolean;
  message: string;
  damage: number[] | null;
  effects: string[] | null;
  temperature: TemperatureRange;
  damageApplied: number;
  effectLevel: number;
  statPenalties: Record<string, number>;
}

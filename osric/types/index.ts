// Unified public types are re-exported from './entities' only.

export type { Command, CommandResult } from '../core/Command';
export type { Rule, RuleResult } from '../core/Rule';
export type { RuleChain } from '../core/RuleChain';
export type { RuleEngine } from '../core/RuleEngine';
export type { GameContext } from '../core/GameContext';

export type {
  Character,
  BaseCharacter,
  CharacterClass,
  CharacterRace,
  CharacterSex,
  AbilityScores,
  AbilityScoreModifiers,
  Experience,
  ThiefSkills,
  TurnUndeadTable,
  AgeCategory,
  WeaponProficiency,
  WeaponSpecialization,
  CharacterSecondarySkill,
  SpellSlots,
} from './character';

export type {
  Monster,
  MonsterFrequency,
  CreatureSize,
  MovementType,
  MovementTypeValue,
} from './monster';

export type {
  Item,
  Weapon,
  WeaponType,
  WeaponSize,
  Armor,
  ArmorType,
} from './item';

export type {
  Spell,
  SpellClass,
  SpellResult,
} from './spell';

export type {
  Brand,
  CharacterId,
  ItemId,
  MonsterId,
  SpellId,
  Currency,
  StatusEffect,
  SavingThrowType,
  RacialAbility,
  ClassAbility,
  AttackRoll,
  Damage,
  GameTime,
  Position,
  Movement,
  ActionResult,
  CombatResult,
} from './shared';

export type {
  CommandParams,
  CommandTypeRegistry,
  CommandMetadata,
  CommandParamsFor,
  CommandFactory,
  BaseCommandParams,
  CreateCharacterParams,
  LevelUpParams,
  MultiClassParams,
  AssignAbilityScoresParams,
  AttackParams,
  InitiativeParams,
  GrappleParams,
  UseShieldParams,
  CastSpellParams,
  MemorizeSpellParams,
  ScrollReadParams,
  IdentifyMagicItemParams,
  MoveParams,
  SearchParams,
  SurvivalCheckParams,
  EnvironmentalHazardParams,
  ReactionRollParams,
  MoraleCheckParams,
  LoyaltyCheckParams,
  SavingThrowParams,
  SavingThrowString,
  SAVING_THROW_TYPES,
} from './commands';

export { COMMAND_METADATA } from './commands';

export type {
  RuleCategory,
  RulePhase,
  RuleMetadata,
  RuleDependency,
  OSRICPreservationCheck,
  RuleFactory,
  RuleExecutionContext,
  CharacterCreationRules,
  CombatRules,
  SpellCastingRules,
  SkillCheckRules,
  EnvironmentalRules,
  RuleRegistry,
} from './rules';

export { CRITICAL_OSRIC_RULES, getRuleCategory } from './rules';

export type { CommandType, RuleName, ErrorType, ImportPath } from './constants';
export {
  COMMAND_TYPES,
  RULE_NAMES,
  ERROR_TYPES,
  IMPORT_PATHS,
  isValidCommandType,
  isValidRuleName,
  isValidErrorType,
  getCommandTypeByValue,
  getRuleNameByValue,
  getErrorTypeByValue,
} from './constants';

export type { OSRICError } from './errors';
export { OSRICErrorBuilder, ErrorFactory, ErrorUtils } from './errors';

export { Character as EnhancedCharacter, CharacterFactory } from '../entities/Character';
export { Monster as EnhancedMonster, MonsterFactory } from '../entities/Monster';
export { Item as EnhancedItem, ItemFactory } from '../entities/Item';
export { Spell as EnhancedSpell, SpellFactory } from '../entities/Spell';

// Branded ID utilities (Phase 3)
export {
  createCharacterId,
  createItemId,
  createMonsterId,
  createSpellId,
  isCharacterId,
  isItemId,
  isMonsterId,
  isSpellId,
} from './id-utils';

// Centralized validators (live under core for engine utilities)
export {
  SavingThrowValidator,
  AttackValidator,
  SearchValidator,
  WeatherCheckValidator,
  MoveValidator,
  ForagingValidator,
  TerrainNavigationValidator,
  InitiativeValidator,
  GrappleValidator,
  CastSpellValidator,
  MemorizeSpellValidator,
  ScrollReadValidator,
  IdentifyMagicItemValidator,
  CreateCharacterValidator,
  LevelUpValidator,
  ThiefSkillCheckValidator,
  GainExperienceValidator,
  FallingDamageValidator,
  MonsterGenerationValidator,
  ReactionRollValidator,
  MagicItemCreationValidator,
  SpellResearchValidator,
  TurnUndeadValidator,
  Validators,
  ExtendedValidators,
} from '../core/Validators';

export interface Result<T, E = Error> {
  success: boolean;
  data?: T;
  error?: E;
}

export interface GameEvent {
  id: string;
  type: string;
  timestamp: Date;
  source: string;
  data: Record<string, unknown>;
}

export interface RulesEngineConfig {
  enableLogging: boolean;
  enableMetrics: boolean;
  maxRuleChainDepth: number;
  timeoutMs: number;
  preserveOSRICValues: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface OSRICValue {
  name: string;
  value: unknown;
  source: string;
  description: string;
  preserved: boolean;
}

export interface GameState {
  version: string;
  timestamp: Date;
  gameVariables: Record<string, unknown>;
  preservedOSRICValues: OSRICValue[];
}

export const OSRIC_CONSTANTS = {
  MIN_ABILITY_SCORE: 3,
  MAX_ABILITY_SCORE: 18,

  MAX_CHARACTER_LEVEL: 20,

  MAX_ARMOR_CLASS: 10,
  MIN_ARMOR_CLASS: -10,
  BASE_THAC0: 20,

  SEGMENTS_PER_ROUND: 10,
  ROUNDS_PER_TURN: 10,
  TURNS_PER_HOUR: 6,

  COPPER_PER_SILVER: 5,
  COPPER_PER_ELECTRUM: 25,
  COPPER_PER_GOLD: 50,
  COPPER_PER_PLATINUM: 500,

  COINS_PER_POUND: 10,

  XP_THRESHOLDS: {
    Fighter: [0, 2000, 4000, 8000, 16000, 32000, 64000, 125000, 250000, 500000],
  },
} as const;

export const RULE_PRIORITIES = {
  CRITICAL: 1000,
  HIGH: 750,
  NORMAL: 500,
  LOW: 250,
  MINIMAL: 100,
} as const;

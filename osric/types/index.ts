/**
 * Consolidated type exports for the OSRIC Rules Engine
 *
 * This file provides a single entry point for all type definitions,
 * ensuring consistent imports across the refactored architecture.
 */

// ===== CORE FRAMEWORK TYPES =====
export type { Command, CommandResult } from '../core/Command';
export type { Rule, RuleResult } from '../core/Rule';
export type { RuleChain } from '../core/RuleChain';
export type { RuleEngine } from '../core/RuleEngine';
export type { GameContext } from '../core/GameContext';

// ===== ENTITY TYPES =====
// Base entity interfaces (preserved from original OSRIC implementation)
export type {
  // Character types
  Character,
  BaseCharacter,
  CharacterClass,
  CharacterRace,
  CharacterSex,
  AbilityScores,
  AbilityScoreModifiers,
  Experience,
  // Monster types
  Monster,
  MonsterFrequency,
  CreatureSize,
  MovementType,
  MovementTypeValue,
  // Item types
  Item,
  Weapon,
  WeaponType,
  WeaponSize,
  // Spell types
  Spell,
  SpellClass,
  SpellSlots,
  SpellResult,
  // System types
  Currency,
  StatusEffect,
  SavingThrowType,
  // Skills and abilities
  ThiefSkills,
  TurnUndeadTable,
  AgeCategory,
  RacialAbility,
  ClassAbility,
  WeaponProficiency,
  WeaponSpecialization,
  CharacterSecondarySkill,
} from './entities';

// ===== COMMAND TYPES =====
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
} from './commands';

export { COMMAND_METADATA } from './commands';

// ===== RULE TYPES =====
export type {
  RuleCategory,
  RulePhase,
  RuleMetadata,
  RuleDependency,
  OSRICPreservationCheck,
  RuleFactory,
  RuleExecutionContext,
  // Rule type collections
  CharacterCreationRules,
  CombatRules,
  SpellCastingRules,
  SkillCheckRules,
  EnvironmentalRules,
  RuleRegistry,
} from './rules';

export { CRITICAL_OSRIC_RULES, getRuleCategory } from './rules';

// ===== CONSTANTS =====
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

// ===== ERROR TYPES =====
export type { OSRICError } from './errors';
export { OSRICErrorBuilder, ErrorFactory, ErrorUtils } from './errors';

// ===== ENHANCED ENTITY CLASSES =====
// Re-export the enhanced entity classes for convenient access
export { Character as EnhancedCharacter, CharacterFactory } from '../entities/Character';
export { Monster as EnhancedMonster, MonsterFactory } from '../entities/Monster';
export { Item as EnhancedItem, ItemFactory } from '../entities/Item';
export { Spell as EnhancedSpell, SpellFactory } from '../entities/Spell';

// ===== UTILITY TYPES =====

/**
 * Generic result type for operations that can succeed or fail
 */
export interface Result<T, E = Error> {
  success: boolean;
  data?: T;
  error?: E;
}

/**
 * Event types for the game system
 */
export interface GameEvent {
  id: string;
  type: string;
  timestamp: Date;
  source: string;
  data: Record<string, unknown>;
}

/**
 * Configuration options for the rules engine
 */
export interface RulesEngineConfig {
  enableLogging: boolean;
  enableMetrics: boolean;
  maxRuleChainDepth: number;
  timeoutMs: number;
  preserveOSRICValues: boolean;
}

/**
 * Validation result type
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * OSRIC-specific value preservation tracker
 */
export interface OSRICValue {
  name: string;
  value: unknown;
  source: string;
  description: string;
  preserved: boolean;
}

/**
 * Game state snapshot for save/load functionality
 */
export interface GameState {
  version: string;
  timestamp: Date;
  gameVariables: Record<string, unknown>;
  preservedOSRICValues: OSRICValue[];
}

// ===== TYPE GUARDS =====
// Note: Type guards will be implemented in individual entity files
// to avoid circular import issues with the consolidated types

// ===== CONSTANTS =====

/**
 * OSRIC-specific constants that must be preserved
 */
export const OSRIC_CONSTANTS = {
  // Ability score range
  MIN_ABILITY_SCORE: 3,
  MAX_ABILITY_SCORE: 18,

  // Level limits
  MAX_CHARACTER_LEVEL: 20, // Varies by class, but 20 is common cap

  // Combat values
  MAX_ARMOR_CLASS: 10, // Worst AC in descending system
  MIN_ARMOR_CLASS: -10, // Best theoretical AC
  BASE_THAC0: 20, // Starting THAC0 for most classes

  // Time units
  SEGMENTS_PER_ROUND: 10,
  ROUNDS_PER_TURN: 10,
  TURNS_PER_HOUR: 6,

  // Currency conversion (all to copper pieces)
  COPPER_PER_SILVER: 5,
  COPPER_PER_ELECTRUM: 25,
  COPPER_PER_GOLD: 50,
  COPPER_PER_PLATINUM: 500,

  // Encumbrance (weight in coins)
  COINS_PER_POUND: 10,

  // Experience point thresholds (examples for Fighter)
  XP_THRESHOLDS: {
    Fighter: [0, 2000, 4000, 8000, 16000, 32000, 64000, 125000, 250000, 500000],
  },
} as const;

/**
 * Rule priority levels for execution ordering
 */
export const RULE_PRIORITIES = {
  CRITICAL: 1000, // System-critical rules (death, unconsciousness)
  HIGH: 750, // Important rules (damage, healing)
  NORMAL: 500, // Standard rules (most game mechanics)
  LOW: 250, // Optional or enhancement rules
  MINIMAL: 100, // Cosmetic or logging rules
} as const;

/**
 * Phase 1 completion marker
 * This indicates that all core infrastructure and type definitions are complete
 */
export const PHASE_1_COMPLETE = true;

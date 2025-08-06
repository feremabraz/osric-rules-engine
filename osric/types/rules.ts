/**
 * Rule type definitions for the OSRIC Rules Engine
 *
 * These define the structure and metadata for all rules in the system.
 */

import type { Rule } from '../core/Rule';
import type { RuleName } from './constants';
import { RULE_NAMES } from './constants';

/**
 * Rule categories for organization
 */
export type RuleCategory =
  | 'character-creation'
  | 'character-advancement'
  | 'combat-resolution'
  | 'spell-casting'
  | 'skill-checks'
  | 'environmental'
  | 'social-interaction'
  | 'system-mechanics';

/**
 * Rule execution phases
 */
export type RulePhase =
  | 'pre-validation' // Before main execution
  | 'main-execution' // Primary rule logic
  | 'post-processing' // After main execution
  | 'cleanup'; // Final cleanup

/**
 * Rule metadata for documentation and organization
 */
export interface RuleMetadata {
  readonly name: RuleName;
  readonly description: string;
  readonly category: RuleCategory;
  readonly phase: RulePhase;
  readonly priority: number;
  readonly osricReference?: string; // Reference to OSRIC rulebook section
  readonly prerequisites: readonly RuleName[]; // Required rules to execute before this one
  readonly affects: readonly string[]; // What game elements this rule modifies
  readonly preservedValues: readonly string[]; // OSRIC values that must be maintained
}

/**
 * Character creation rule types
 */
export interface CharacterCreationRules {
  [RULE_NAMES.ABILITY_SCORE_GENERATION]: Rule;
  [RULE_NAMES.ABILITY_SCORE_MODIFIERS]: Rule;
  [RULE_NAMES.CLASS_REQUIREMENTS]: Rule;
  [RULE_NAMES.RACIAL_RESTRICTIONS]: Rule;
  [RULE_NAMES.RACIAL_ABILITIES]: Rule;
  [RULE_NAMES.MULTI_CLASS_VALIDATION]: Rule;
  [RULE_NAMES.STARTING_EQUIPMENT]: Rule;
  [RULE_NAMES.SECONDARY_SKILLS]: Rule;
  [RULE_NAMES.LANGUAGES]: Rule;
  [RULE_NAMES.AGE_EFFECTS]: Rule;
}

/**
 * Combat rule types - PRESERVE ALL OSRIC CALCULATIONS
 */
export interface CombatRules {
  [RULE_NAMES.RANGE_CHECK]: Rule;
  [RULE_NAMES.ATTACK_ROLL]: Rule; // PRESERVE: THAC0 calculations
  [RULE_NAMES.DAMAGE_CALCULATION]: Rule; // PRESERVE: Weapon damage tables
  [RULE_NAMES.ARMOR_ABSORPTION]: Rule; // PRESERVE: Armor class values
  [RULE_NAMES.WEAPON_SPECIALIZATION]: Rule; // PRESERVE: Specialization bonuses
  [RULE_NAMES.TWO_WEAPON_FIGHTING]: Rule; // PRESERVE: Penalty calculations
  [RULE_NAMES.CRITICAL_HITS]: Rule;
  [RULE_NAMES.MULTIPLE_ATTACKS]: Rule; // PRESERVE: Fighter attack progression
  [RULE_NAMES.INITIATIVE_ROLL]: Rule; // PRESERVE: Weapon speed factors
  [RULE_NAMES.GRAPPLING]: Rule; // PRESERVE: Grappling mechanics
  [RULE_NAMES.MOUNTED_COMBAT]: Rule; // PRESERVE: Mounted combat rules
  [RULE_NAMES.AERIAL_COMBAT]: Rule; // PRESERVE: Aerial combat modifiers
  [RULE_NAMES.UNDERWATER_COMBAT]: Rule; // PRESERVE: Underwater penalties
}

/**
 * Spell casting rule types - PRESERVE ALL OSRIC MECHANICS
 */
export interface SpellCastingRules {
  [RULE_NAMES.SPELL_MEMORIZATION]: Rule; // PRESERVE: Memorization rules
  [RULE_NAMES.COMPONENT_CHECK]: Rule; // PRESERVE: Component lists
  [RULE_NAMES.CASTING_TIME_VALIDATION]: Rule; // PRESERVE: Casting times
  [RULE_NAMES.SPELL_INTERRUPTION]: Rule; // PRESERVE: Interruption mechanics
  [RULE_NAMES.SPELL_EFFECTS]: Rule; // PRESERVE: Spell effects
  [RULE_NAMES.SAVING_THROWS]: Rule; // PRESERVE: Save calculations
  [RULE_NAMES.SPELL_RESISTANCE]: Rule; // PRESERVE: Magic resistance
  [RULE_NAMES.AREA_OF_EFFECT]: Rule; // PRESERVE: AoE mechanics
  [RULE_NAMES.SPELL_DURATION]: Rule; // PRESERVE: Duration formulas
  [RULE_NAMES.SPELL_RANGE]: Rule; // PRESERVE: Range calculations
}

/**
 * Skill check rule types
 */
export interface SkillCheckRules {
  [RULE_NAMES.THIEF_SKILLS]: Rule; // PRESERVE: Thief skill percentages
  [RULE_NAMES.TURN_UNDEAD]: Rule; // PRESERVE: Turn undead tables
  [RULE_NAMES.OPEN_DOORS]: Rule; // PRESERVE: Strength requirements
  [RULE_NAMES.BEND_BARS]: Rule; // PRESERVE: Strength calculations
  [RULE_NAMES.SURPRISE_CHECK]: Rule; // PRESERVE: Surprise mechanics
  [RULE_NAMES.MORALE_CHECK]: Rule; // PRESERVE: Morale calculations
  [RULE_NAMES.REACTION_ROLL]: Rule; // PRESERVE: Reaction modifiers
  [RULE_NAMES.LOYALTY_CHECK]: Rule; // PRESERVE: Loyalty formulas
}

/**
 * Environmental rule types
 */
export interface EnvironmentalRules {
  [RULE_NAMES.FALLING_DAMAGE]: Rule; // PRESERVE: Falling damage formula
  [RULE_NAMES.DROWNING]: Rule; // PRESERVE: Drowning mechanics
  [RULE_NAMES.SUFFOCATION]: Rule; // PRESERVE: Suffocation rules
  [RULE_NAMES.TEMPERATURE_EFFECTS]: Rule; // PRESERVE: Temperature tables
  [RULE_NAMES.SURVIVAL_CHECKS]: Rule; // PRESERVE: Survival mechanics
  [RULE_NAMES.MOVEMENT_RATES]: Rule; // PRESERVE: Movement calculations
  [RULE_NAMES.ENCUMBRANCE]: Rule; // PRESERVE: Encumbrance effects
  [RULE_NAMES.LIGHTING_EFFECTS]: Rule; // PRESERVE: Lighting modifiers
}

/**
 * Rule registry interface - comprehensive rule organization
 */
export interface RuleRegistry {
  readonly character: CharacterCreationRules;
  readonly combat: CombatRules;
  readonly spells: SpellCastingRules;
  readonly skills: SkillCheckRules;
  readonly environment: EnvironmentalRules;
}

/**
 * Rule dependency graph for complex rule interactions
 */
export interface RuleDependency {
  readonly rule: RuleName;
  readonly dependsOn: readonly RuleName[];
  readonly conflictsWith?: readonly RuleName[];
  readonly optional?: boolean;
}

/**
 * OSRIC preservation tracking - ensures critical values are maintained
 */
export interface OSRICPreservationCheck {
  readonly ruleName: RuleName;
  readonly preservedValues: readonly {
    readonly name: string;
    readonly originalValue: unknown;
    readonly description: string;
  }[];
  readonly validationFunction: (rule: Rule) => boolean;
}

/**
 * Rule factory interface for creating typed rules
 */
export interface RuleFactory {
  createRule<T extends RuleName>(name: T, metadata: RuleMetadata): Rule;

  validateRule(rule: Rule): {
    readonly valid: boolean;
    readonly errors: readonly string[];
    readonly osricCompliant: boolean;
  };
}

/**
 * Rule execution context interface
 */
export interface RuleExecutionContext {
  readonly phase: RulePhase;
  readonly metadata: RuleMetadata;
  readonly dependencies: readonly RuleName[];
  readonly osricValues: Record<string, unknown>;
}

/**
 * High-priority rules that must preserve OSRIC values exactly
 */
export const CRITICAL_OSRIC_RULES: Partial<Record<RuleName, readonly string[]>> = {
  [RULE_NAMES.ATTACK_ROLL]: [
    'THAC0 calculation: numberNeededToHit = thac0 - targetAC',
    'Strength hit adjustment tables',
    'Dexterity missile adjustment tables',
    'Magic weapon bonuses',
  ],
  [RULE_NAMES.DAMAGE_CALCULATION]: [
    'Weapon damage dice (1d8 longsword, 1d6 shortsword, etc.)',
    'Strength damage bonuses',
    'Two-handed weapon bonuses',
    'Weapon vs. armor type modifiers',
  ],
  [RULE_NAMES.SPELL_MEMORIZATION]: [
    'Spell slots per level tables',
    'Intelligence spell learning percentages',
    'Wisdom bonus spells',
    'Spell failure chances',
  ],
  [RULE_NAMES.THIEF_SKILLS]: [
    'Base thief skill percentages by level',
    'Racial modifiers for thief skills',
    'Dexterity adjustments to thief skills',
    'Armor penalties to thief skills',
  ],
  [RULE_NAMES.TURN_UNDEAD]: [
    'Cleric turn undead tables by level',
    'Undead type hierarchy',
    'Turn/destroy thresholds',
    'Paladin turn undead progression',
  ],
} as const;

/**
 * Get rule category by rule name using partial mapping for major rules
 */
export function getRuleCategory(ruleName: RuleName): RuleCategory {
  // Character rules
  if (
    (
      [
        RULE_NAMES.ABILITY_SCORE_GENERATION,
        RULE_NAMES.ABILITY_SCORE_MODIFIERS,
        RULE_NAMES.CLASS_REQUIREMENTS,
        RULE_NAMES.RACIAL_RESTRICTIONS,
        RULE_NAMES.RACIAL_ABILITIES,
        RULE_NAMES.MULTI_CLASS_VALIDATION,
        RULE_NAMES.STARTING_EQUIPMENT,
        RULE_NAMES.SECONDARY_SKILLS,
        RULE_NAMES.LANGUAGES,
        RULE_NAMES.AGE_EFFECTS,
      ] as RuleName[]
    ).includes(ruleName)
  ) {
    return 'character-creation';
  }

  // Combat rules
  if (
    (
      [
        RULE_NAMES.RANGE_CHECK,
        RULE_NAMES.ATTACK_ROLL,
        RULE_NAMES.DAMAGE_CALCULATION,
        RULE_NAMES.ARMOR_ABSORPTION,
        RULE_NAMES.WEAPON_SPECIALIZATION,
        RULE_NAMES.TWO_WEAPON_FIGHTING,
        RULE_NAMES.CRITICAL_HITS,
        RULE_NAMES.MULTIPLE_ATTACKS,
        RULE_NAMES.INITIATIVE_ROLL,
        RULE_NAMES.GRAPPLING,
        RULE_NAMES.MOUNTED_COMBAT,
        RULE_NAMES.AERIAL_COMBAT,
        RULE_NAMES.UNDERWATER_COMBAT,
      ] as RuleName[]
    ).includes(ruleName)
  ) {
    return 'combat-resolution';
  }

  // Spell rules
  if (
    (
      [
        RULE_NAMES.SPELL_MEMORIZATION,
        RULE_NAMES.COMPONENT_CHECK,
        RULE_NAMES.CASTING_TIME_VALIDATION,
        RULE_NAMES.SPELL_INTERRUPTION,
        RULE_NAMES.SPELL_EFFECTS,
        RULE_NAMES.SAVING_THROWS,
        RULE_NAMES.SPELL_RESISTANCE,
        RULE_NAMES.AREA_OF_EFFECT,
        RULE_NAMES.SPELL_DURATION,
        RULE_NAMES.SPELL_RANGE,
      ] as RuleName[]
    ).includes(ruleName)
  ) {
    return 'spell-casting';
  }

  // Skill rules
  if (
    (
      [
        RULE_NAMES.THIEF_SKILLS,
        RULE_NAMES.TURN_UNDEAD,
        RULE_NAMES.OPEN_DOORS,
        RULE_NAMES.BEND_BARS,
        RULE_NAMES.SURPRISE_CHECK,
        RULE_NAMES.MORALE_CHECK,
        RULE_NAMES.REACTION_ROLL,
        RULE_NAMES.LOYALTY_CHECK,
      ] as RuleName[]
    ).includes(ruleName)
  ) {
    return 'skill-checks';
  }

  // Environmental rules
  if (
    (
      [
        RULE_NAMES.FALLING_DAMAGE,
        RULE_NAMES.DROWNING,
        RULE_NAMES.SUFFOCATION,
        RULE_NAMES.TEMPERATURE_EFFECTS,
        RULE_NAMES.SURVIVAL_CHECKS,
        RULE_NAMES.MOVEMENT_RATES,
        RULE_NAMES.ENCUMBRANCE,
        RULE_NAMES.LIGHTING_EFFECTS,
      ] as RuleName[]
    ).includes(ruleName)
  ) {
    return 'environmental';
  }

  return 'system-mechanics';
}

import type { Rule } from '../core/Rule';
import type { RuleName } from './constants';
import { RULE_NAMES } from './constants';

export type RuleCategory =
  | 'character-creation'
  | 'character-advancement'
  | 'combat-resolution'
  | 'spell-casting'
  | 'skill-checks'
  | 'environmental'
  | 'social-interaction'
  | 'system-mechanics';

export type RulePhase = 'pre-validation' | 'main-execution' | 'post-processing' | 'cleanup';

export interface RuleMetadata {
  readonly name: RuleName;
  readonly description: string;
  readonly category: RuleCategory;
  readonly phase: RulePhase;
  readonly priority: number;
  readonly osricReference?: string;
  readonly prerequisites: readonly RuleName[];
  readonly affects: readonly string[];
  readonly preservedValues: readonly string[];
}

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

export interface CombatRules {
  [RULE_NAMES.RANGE_CHECK]: Rule;
  [RULE_NAMES.ATTACK_ROLL]: Rule;
  [RULE_NAMES.DAMAGE_CALCULATION]: Rule;
  [RULE_NAMES.ARMOR_ABSORPTION]: Rule;
  [RULE_NAMES.WEAPON_SPECIALIZATION]: Rule;
  [RULE_NAMES.TWO_WEAPON_FIGHTING]: Rule;
  [RULE_NAMES.CRITICAL_HITS]: Rule;
  [RULE_NAMES.MULTIPLE_ATTACKS]: Rule;
  [RULE_NAMES.INITIATIVE_ROLL]: Rule;
  [RULE_NAMES.GRAPPLING]: Rule;
  [RULE_NAMES.MOUNTED_COMBAT]: Rule;
  [RULE_NAMES.AERIAL_COMBAT]: Rule;
  [RULE_NAMES.UNDERWATER_COMBAT]: Rule;
}

export interface SpellCastingRules {
  [RULE_NAMES.SPELL_MEMORIZATION]: Rule;
  [RULE_NAMES.COMPONENT_CHECK]: Rule;
  [RULE_NAMES.CASTING_TIME_VALIDATION]: Rule;
  [RULE_NAMES.SPELL_INTERRUPTION]: Rule;
  [RULE_NAMES.SPELL_EFFECTS]: Rule;
  [RULE_NAMES.SAVING_THROWS]: Rule;
  [RULE_NAMES.SPELL_RESISTANCE]: Rule;
  [RULE_NAMES.AREA_OF_EFFECT]: Rule;
  [RULE_NAMES.SPELL_DURATION]: Rule;
  [RULE_NAMES.SPELL_RANGE]: Rule;
}

export interface SkillCheckRules {
  [RULE_NAMES.THIEF_SKILLS]: Rule;
  [RULE_NAMES.TURN_UNDEAD]: Rule;
  [RULE_NAMES.OPEN_DOORS]: Rule;
  [RULE_NAMES.BEND_BARS]: Rule;
  [RULE_NAMES.SURPRISE_CHECK]: Rule;
  [RULE_NAMES.MORALE_CHECK]: Rule;
  [RULE_NAMES.REACTION_ROLL]: Rule;
  [RULE_NAMES.LOYALTY_CHECK]: Rule;
}

export interface EnvironmentalRules {
  [RULE_NAMES.FALLING_DAMAGE]: Rule;
  [RULE_NAMES.DROWNING]: Rule;
  [RULE_NAMES.SUFFOCATION]: Rule;
  [RULE_NAMES.TEMPERATURE_EFFECTS]: Rule;
  [RULE_NAMES.SURVIVAL_CHECKS]: Rule;
  [RULE_NAMES.MOVEMENT_RATES]: Rule;
  [RULE_NAMES.ENCUMBRANCE]: Rule;
  [RULE_NAMES.LIGHTING_EFFECTS]: Rule;
}

export interface RuleRegistry {
  readonly character: CharacterCreationRules;
  readonly combat: CombatRules;
  readonly spells: SpellCastingRules;
  readonly skills: SkillCheckRules;
  readonly environment: EnvironmentalRules;
}

export interface RuleDependency {
  readonly rule: RuleName;
  readonly dependsOn: readonly RuleName[];
  readonly conflictsWith?: readonly RuleName[];
  readonly optional?: boolean;
}

export interface OSRICPreservationCheck {
  readonly ruleName: RuleName;
  readonly preservedValues: readonly {
    readonly name: string;
    readonly originalValue: unknown;
    readonly description: string;
  }[];
  readonly validationFunction: (rule: Rule) => boolean;
}

export interface RuleFactory {
  createRule<T extends RuleName>(name: T, metadata: RuleMetadata): Rule;

  validateRule(rule: Rule): {
    readonly valid: boolean;
    readonly errors: readonly string[];
    readonly osricCompliant: boolean;
  };
}

export interface RuleExecutionContext {
  readonly phase: RulePhase;
  readonly metadata: RuleMetadata;
  readonly dependencies: readonly RuleName[];
  readonly osricValues: Record<string, unknown>;
}

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

export function getRuleCategory(ruleName: RuleName): RuleCategory {
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

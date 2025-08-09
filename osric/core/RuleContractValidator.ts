import { COMMAND_TYPES, RULE_NAMES, type RuleName } from '../types/constants';
import type { RuleEngine } from './RuleEngine';

export interface RuleContractValidationResult {
  valid: boolean;
  issues: string[];
  stats: {
    totalCommands: number;
    commandsWithIssues: number;
    missingRules: string[];
    undefinedRuleReferences: string[];
  };
}

export interface CommandRuleContract {
  commandType: string;
  requiredRules: string[];
  commandClass: string;
}

/**
 * Command-Rule Contract Validation System for the OSRIC Rules Engine
 * Provides static analysis of command-rule dependencies without instantiation
 * Follows the same namespace pattern as ValidationEngine to avoid circular dependencies
 */
export namespace RuleContractValidator {
  /**
   * Static mapping of commands to their required rules
   * Based on analysis of command implementations using only defined RULE_NAMES
   */
  const COMMAND_RULE_CONTRACTS: Record<string, RuleName[]> = {
    [COMMAND_TYPES.CREATE_CHARACTER]: [
      RULE_NAMES.ABILITY_SCORE_GENERATION,
      RULE_NAMES.CLASS_REQUIREMENTS,
      RULE_NAMES.RACIAL_RESTRICTIONS,
      RULE_NAMES.STARTING_EQUIPMENT,
    ],
    [COMMAND_TYPES.GAIN_EXPERIENCE]: [RULE_NAMES.EXPERIENCE_GAIN, RULE_NAMES.LEVEL_PROGRESSION],
    [COMMAND_TYPES.LEVEL_UP]: [
      RULE_NAMES.LEVEL_PROGRESSION,
      RULE_NAMES.SPELL_PROGRESSION,
      RULE_NAMES.TRAINING_REQUIREMENTS,
    ],
    [COMMAND_TYPES.SAVING_THROW]: [RULE_NAMES.SAVING_THROWS, RULE_NAMES.SAVING_THROW_CALCULATION],
    [COMMAND_TYPES.THIEF_SKILL_CHECK]: [RULE_NAMES.THIEF_SKILLS],
    [COMMAND_TYPES.TURN_UNDEAD]: [RULE_NAMES.TURN_UNDEAD],
    [COMMAND_TYPES.ATTACK]: [
      RULE_NAMES.ATTACK_ROLL,
      RULE_NAMES.DAMAGE_CALCULATION,
      RULE_NAMES.WEAPON_SPECIALIZATION,
      RULE_NAMES.RANGE_CHECK,
    ],
    [COMMAND_TYPES.GRAPPLE]: [
      RULE_NAMES.GRAPPLING,
      RULE_NAMES.GRAPPLE_ATTACK,
      RULE_NAMES.STRENGTH_COMPARISON,
    ],
    [COMMAND_TYPES.INITIATIVE]: [
      RULE_NAMES.INITIATIVE_ROLL,
      RULE_NAMES.INITIATIVE_ORDER,
      RULE_NAMES.SURPRISE_CHECK,
    ],
    [COMMAND_TYPES.FALLING_DAMAGE]: [RULE_NAMES.FALLING_DAMAGE],
    [COMMAND_TYPES.FORAGING]: [RULE_NAMES.FORAGING_RULES, RULE_NAMES.SURVIVAL_CHECKS],
    [COMMAND_TYPES.MOVE]: [
      RULE_NAMES.MOVEMENT_VALIDATION,
      RULE_NAMES.MOVEMENT_RATES,
      RULE_NAMES.ENCUMBRANCE,
    ],
    [COMMAND_TYPES.SEARCH]: [RULE_NAMES.SEARCH_MECHANICS],
    [COMMAND_TYPES.TERRAIN_NAVIGATION]: [RULE_NAMES.TERRAIN_NAVIGATION, RULE_NAMES.SURVIVAL_CHECKS],
    [COMMAND_TYPES.WEATHER_CHECK]: [RULE_NAMES.WEATHER_EFFECTS],
    [COMMAND_TYPES.MONSTER_GENERATION]: [
      RULE_NAMES.MONSTER_BEHAVIOR,
      RULE_NAMES.TREASURE_GENERATION,
    ],
    [COMMAND_TYPES.REACTION_ROLL]: [RULE_NAMES.REACTION_ROLL],
    [COMMAND_TYPES.CAST_SPELL]: [
      RULE_NAMES.SPELL_CASTING,
      RULE_NAMES.COMPONENT_CHECK,
      RULE_NAMES.SPELL_EFFECTS,
      RULE_NAMES.SPELL_INTERRUPTION,
    ],
    [COMMAND_TYPES.MEMORIZE_SPELL]: [RULE_NAMES.SPELL_MEMORIZATION, RULE_NAMES.SPELL_PROGRESSION],
    [COMMAND_TYPES.READ_SCROLL]: [
      RULE_NAMES.SCROLL_USAGE_VALIDATION,
      RULE_NAMES.SCROLL_CASTING_FAILURE,
      RULE_NAMES.SCROLL_SPELL_CASTING,
    ],
    [COMMAND_TYPES.IDENTIFY_MAGIC_ITEM]: [RULE_NAMES.MAGIC_ITEM_RULES, RULE_NAMES.SPELL_EFFECTS],
  };

  /**
   * Validates all command-rule contracts in the system.
   * Checks that all required rules are registered in the RuleEngine.
   */
  export function validateAllContracts(ruleEngine: RuleEngine): RuleContractValidationResult {
    const issues: string[] = [];
    const registeredRules = new Set(Object.keys(ruleEngine.getRegisteredChains()));
    const missingRules = new Set<string>();
    const commandsWithIssues = new Set<string>();

    // Validate each command type
    for (const [commandType, requiredRules] of Object.entries(COMMAND_RULE_CONTRACTS)) {
      for (const ruleName of requiredRules) {
        // Check if rule is registered in RuleEngine
        if (!registeredRules.has(ruleName)) {
          missingRules.add(ruleName);
          issues.push(
            `Command '${commandType}' requires rule '${ruleName}' which is not registered in RuleEngine`
          );
          commandsWithIssues.add(commandType);
        }
      }
    }

    return {
      valid: issues.length === 0,
      issues,
      stats: {
        totalCommands: Object.keys(COMMAND_RULE_CONTRACTS).length,
        commandsWithIssues: commandsWithIssues.size,
        missingRules: Array.from(missingRules).sort(),
        undefinedRuleReferences: [], // Since we use typed RULE_NAMES, this should always be empty
      },
    };
  }

  /**
   * Gets all command-rule contracts for analysis and documentation.
   */
  export function getAllContracts(): CommandRuleContract[] {
    return Object.entries(COMMAND_RULE_CONTRACTS)
      .map(([commandType, requiredRules]) => ({
        commandType,
        requiredRules: [...requiredRules],
        commandClass: `${commandType
          .split('-')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join('')}Command`,
      }))
      .sort((a, b) => a.commandType.localeCompare(b.commandType));
  }

  /**
   * Gets the required rules for a specific command type.
   */
  export function getCommandRules(commandType: string): RuleName[] {
    return COMMAND_RULE_CONTRACTS[commandType] || [];
  }

  /**
   * Gets a summary of missing rules across all commands.
   */
  export function getMissingRulesSummary(ruleEngine: RuleEngine): {
    missingRules: Record<string, string[]>; // rule -> [commands that need it]
  } {
    const missingRules: Record<string, string[]> = {};
    const registeredRules = new Set(Object.keys(ruleEngine.getRegisteredChains()));

    for (const [commandType, requiredRules] of Object.entries(COMMAND_RULE_CONTRACTS)) {
      for (const ruleName of requiredRules) {
        if (!registeredRules.has(ruleName)) {
          if (!missingRules[ruleName]) {
            missingRules[ruleName] = [];
          }
          missingRules[ruleName].push(commandType);
        }
      }
    }

    return { missingRules };
  }

  /**
   * Validates that a specific command type's requirements are met.
   */
  export function validateCommandType(
    commandType: string,
    ruleEngine: RuleEngine
  ): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    const registeredRules = new Set(Object.keys(ruleEngine.getRegisteredChains()));
    const requiredRules = COMMAND_RULE_CONTRACTS[commandType] || [];

    for (const ruleName of requiredRules) {
      if (!registeredRules.has(ruleName)) {
        issues.push(`Required rule '${ruleName}' is not registered`);
      }
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  /**
   * Validates system integrity on startup.
   * Should be called during application initialization.
   */
  export function validateSystemIntegrity(ruleEngine: RuleEngine): void {
    const validation = validateAllContracts(ruleEngine);

    if (!validation.valid) {
      const errorMessage = [
        'OSRIC Rules Engine: Command-Rule Contract Validation Failed',
        `Found ${validation.issues.length} issues across ${validation.stats.commandsWithIssues} commands:`,
        '',
        ...validation.issues,
        '',
        'System cannot start with unresolved rule contract violations.',
      ].join('\n');

      throw new Error(errorMessage);
    }
  }

  /**
   * Gets all rule names that are referenced by commands but not yet implemented.
   */
  export function getUnimplementedRules(ruleEngine: RuleEngine): string[] {
    const registeredRules = new Set(Object.keys(ruleEngine.getRegisteredChains()));
    const allReferencedRules = new Set<string>();

    // Collect all referenced rules
    for (const requiredRules of Object.values(COMMAND_RULE_CONTRACTS)) {
      for (const ruleName of requiredRules) {
        allReferencedRules.add(ruleName);
      }
    }

    // Find rules that are referenced but not implemented
    return Array.from(allReferencedRules)
      .filter((ruleName) => !registeredRules.has(ruleName))
      .sort();
  }

  /**
   * Gets statistics about rule coverage across the system.
   */
  export function getRuleCoverageStats(ruleEngine: RuleEngine): {
    totalCommandTypes: number;
    totalReferencedRules: number;
    implementedRules: number;
    missingRules: number;
    coveragePercentage: number;
  } {
    const registeredRules = new Set(Object.keys(ruleEngine.getRegisteredChains()));
    const allReferencedRules = new Set<string>();

    // Collect all referenced rules
    for (const requiredRules of Object.values(COMMAND_RULE_CONTRACTS)) {
      for (const ruleName of requiredRules) {
        allReferencedRules.add(ruleName);
      }
    }

    const implementedCount = Array.from(allReferencedRules).filter((ruleName) =>
      registeredRules.has(ruleName)
    ).length;

    return {
      totalCommandTypes: Object.keys(COMMAND_RULE_CONTRACTS).length,
      totalReferencedRules: allReferencedRules.size,
      implementedRules: implementedCount,
      missingRules: allReferencedRules.size - implementedCount,
      coveragePercentage:
        allReferencedRules.size > 0
          ? Math.round((implementedCount / allReferencedRules.size) * 100)
          : 100,
    };
  }

  /**
   * Checks if a specific rule is referenced by any command.
   */
  export function isRuleReferenced(ruleName: string): boolean {
    for (const requiredRules of Object.values(COMMAND_RULE_CONTRACTS)) {
      if (requiredRules.includes(ruleName as RuleName)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Gets commands that reference a specific rule.
   */
  export function getCommandsForRule(ruleName: string): string[] {
    const commands: string[] = [];

    for (const [commandType, requiredRules] of Object.entries(COMMAND_RULE_CONTRACTS)) {
      if (requiredRules.includes(ruleName as RuleName)) {
        commands.push(commandType);
      }
    }

    return commands.sort();
  }
}

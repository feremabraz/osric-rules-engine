/**
 * Base Rule interface for the OSRIC Rules Engine
 *
 * Rules contain the actual game logic and mechanics.
 * They operate on commands within a GameContext and can modify the game state.
 */

import type { Command } from './Command';
import type { GameContext } from './GameContext';

/**
 * Result of executing a rule
 */
export interface RuleResult {
  success: boolean;
  message: string;
  stopChain?: boolean; // If true, stops the rule chain execution
  critical?: boolean; // If true, indicates a critical failure
  data?: Record<string, unknown>;
  effects?: string[];
  damage?: number[];
}

/**
 * Base Rule interface
 * All game rules implement this interface
 */
export interface Rule {
  /**
   * Unique name identifier for this rule
   */
  readonly name: string;

  /**
   * Priority for rule execution (lower numbers execute first)
   * Default is 100, adjust as needed for rule ordering
   */
  readonly priority: number;

  /**
   * Execute the rule logic
   *
   * @param context - Current game context with entities and temporary data
   * @param command - The command being processed
   * @returns Result of rule execution
   */
  execute(context: GameContext, command: Command): Promise<RuleResult>;

  /**
   * Check if this rule applies to the given command and context
   * Used to determine if the rule should be executed
   *
   * @param context - Current game context
   * @param command - The command being processed
   * @returns True if rule should be executed
   */
  canApply(context: GameContext, command: Command): boolean;

  /**
   * Get any prerequisites that must be satisfied before this rule can execute
   * Used for rule dependency management
   */
  getPrerequisites(): string[];
}

/**
 * Abstract base class that provides common rule functionality
 */
export abstract class BaseRule implements Rule {
  abstract readonly name: string;
  readonly priority: number = 100;

  abstract execute(context: GameContext, command: Command): Promise<RuleResult>;
  abstract canApply(context: GameContext, command: Command): boolean;

  /**
   * Default implementation - no prerequisites
   */
  getPrerequisites(): string[] {
    return [];
  }

  /**
   * Helper method to create success result - PROTECTED for rule access
   */
  protected createSuccessResult(
    message: string,
    data?: Record<string, unknown>,
    effects?: string[],
    damage?: number[],
    stopChain = false
  ): RuleResult {
    return { success: true, message, data, effects, damage, stopChain };
  }

  /**
   * Helper method to create failure result - PROTECTED for rule access
   */
  protected createFailureResult(
    message: string,
    data?: Record<string, unknown>,
    critical = false
  ): RuleResult {
    return { success: false, message, data, critical, stopChain: critical };
  }

  /**
   * Helper method to check if command is of specific type - PROTECTED for rule access
   */
  protected isCommandType(command: Command, type: string): boolean {
    return command.type === type;
  }

  /**
   * Helper method to get temporary data with type safety - PROTECTED for rule access
   */
  protected getTemporaryData<T>(context: GameContext, key: string): T | null {
    return context.getTemporary<T>(key);
  }

  /**
   * Helper method to set temporary data - PROTECTED for rule access
   */
  protected setTemporaryData(context: GameContext, key: string, value: unknown): void {
    context.setTemporary(key, value);
  }

  /**
   * Standardized parameter extraction with type validation
   * This prevents the "wrong pattern usage" by providing one correct way to extract parameters
   */
  protected extractTypedParameters<T>(
    command: Command,
    validator: (params: unknown) => params is T
  ): T | null {
    // Try standard params property first (preferred pattern)
    if ('params' in command && command.params && validator(command.params)) {
      return command.params;
    }

    // Fallback to direct command casting for backward compatibility
    // This supports existing patterns while encouraging migration to params
    if (validator(command)) {
      return command as unknown as T;
    }

    return null;
  }
}

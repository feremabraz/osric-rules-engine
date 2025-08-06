/**
 * Base Command interface for the OSRIC Rules Engine
 *
 * Commands encapsulate game actions (attack, cast spell, move, etc.)
 * and define what should happen, while Rules determine how it happens.
 */

import type { GameContext } from './GameContext';

/**
 * Result of executing a command
 */
export interface CommandResult {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
  effects?: string[];
  damage?: number[];
}

/**
 * Base Command interface
 * All game actions implement this interface
 */
export interface Command {
  /**
   * Unique identifier for this command type
   */
  readonly type: string;

  /**
   * Execute the command using the provided context
   * This delegates to the RuleEngine to process the command through rule chains
   */
  execute(context: GameContext): Promise<CommandResult>;

  /**
   * Check if this command can be executed in the current context
   * Used for validation before execution
   */
  canExecute(context: GameContext): boolean;

  /**
   * Get the list of rules that need to be processed for this command
   * Used by the RuleEngine to determine which rule chain to use
   */
  getRequiredRules(): string[];

  /**
   * Get any entities involved in this command
   * Used for context management and validation
   */
  getInvolvedEntities(): string[];
}

/**
 * Abstract base class that provides common command functionality
 */
export abstract class BaseCommand implements Command {
  abstract readonly type: string;

  constructor(
    protected readonly actorId: string,
    protected readonly targetIds: string[] = []
  ) {}

  abstract execute(context: GameContext): Promise<CommandResult>;
  abstract canExecute(context: GameContext): boolean;
  abstract getRequiredRules(): string[];

  /**
   * Default implementation returns actor and targets
   */
  getInvolvedEntities(): string[] {
    return [this.actorId, ...this.targetIds];
  }

  /**
   * Helper method for basic entity validation
   */
  protected validateEntities(context: GameContext): boolean {
    const entities = this.getInvolvedEntities();
    return entities.every((id) => context.hasEntity(id));
  }

  /**
   * Helper method to create success result
   */
  protected createSuccessResult(
    message: string,
    data?: Record<string, unknown>,
    effects?: string[],
    damage?: number[]
  ): CommandResult {
    return { success: true, message, data, effects, damage };
  }

  /**
   * Helper method to create failure result
   */
  protected createFailureResult(message: string, data?: Record<string, unknown>): CommandResult {
    return { success: false, message, data };
  }
}

/**
 * RuleEngine - Main orchestrator for the OSRIC Rules Engine
 *
 * The RuleEngine manages rule chains and processes commands by delegating
 * to the appropriate rule chain based on command type.
 */

import type { Command, CommandResult } from './Command';
import type { GameContext } from './GameContext';
import type { Rule } from './Rule';
import { RuleChain, type RuleChainConfig } from './RuleChain';

/**
 * Configuration for the rule engine
 */
export interface RuleEngineConfig {
  defaultChainConfig?: RuleChainConfig;
  enableLogging?: boolean;
  enableMetrics?: boolean;
}

/**
 * Metrics for rule engine performance
 */
export interface RuleEngineMetrics {
  commandsProcessed: number;
  averageExecutionTime: number;
  successRate: number;
  ruleChainUsage: Record<string, number>;
}

/**
 * RuleEngine processes commands through appropriate rule chains
 */
export class RuleEngine {
  private ruleChains = new Map<string, RuleChain>();
  private config: RuleEngineConfig;
  private metrics: RuleEngineMetrics;

  constructor(config: RuleEngineConfig = {}) {
    this.config = {
      defaultChainConfig: {
        stopOnFailure: false,
        mergeResults: true,
        clearTemporary: false,
      },
      enableLogging: false,
      enableMetrics: true,
      ...config,
    };

    this.metrics = {
      commandsProcessed: 0,
      averageExecutionTime: 0,
      successRate: 0,
      ruleChainUsage: {},
    };
  }

  /**
   * Register a rule chain for a specific command type
   */
  registerRuleChain(commandType: string, ruleChain: RuleChain): void {
    // Validate that the rule chain is not empty
    const stats = ruleChain.getStatistics();
    if (stats.totalRules === 0) {
      throw new Error(`Rule chain for ${commandType} is empty`);
    }

    this.ruleChains.set(commandType, ruleChain);

    if (this.config.enableLogging) {
      console.log(`Registered rule chain for command type: ${commandType}`);
    }
  }

  /**
   * Register multiple rule chains at once
   */
  registerRuleChains(chains: Record<string, RuleChain>): void {
    for (const [commandType, chain] of Object.entries(chains)) {
      this.registerRuleChain(commandType, chain);
    }
  }

  /**
   * Get a rule chain for a command type
   */
  getRuleChain(commandType: string): RuleChain | null {
    return this.ruleChains.get(commandType) || null;
  }

  /**
   * Check if a rule chain is registered for a command type
   */
  hasRuleChain(commandType: string): boolean {
    return this.ruleChains.has(commandType);
  }

  /**
   * Remove a rule chain for a command type
   */
  unregisterRuleChain(commandType: string): boolean {
    return this.ruleChains.delete(commandType);
  }

  /**
   * Add a rule to an existing rule chain
   */
  addRuleToChain(commandType: string, rule: Rule): boolean {
    const chain = this.ruleChains.get(commandType);
    if (chain) {
      chain.addRule(rule);
      return true;
    }
    return false;
  }

  /**
   * Create a new rule chain for a command type if it doesn't exist
   */
  createRuleChain(commandType: string, config?: RuleChainConfig): RuleChain {
    const chainConfig = config || this.config.defaultChainConfig;
    const newChain = new RuleChain(chainConfig);
    this.registerRuleChain(commandType, newChain);
    return newChain;
  }

  /**
   * Process a command through the appropriate rule chain
   */
  async process(command: Command, context: GameContext): Promise<CommandResult> {
    const startTime = Date.now();

    try {
      // Update metrics
      this.metrics.commandsProcessed++;

      // Log command processing start
      if (this.config.enableLogging) {
        console.log(`Processing command: ${command.type}`);
      }

      // Validate command can be executed
      if (!command.canExecute(context)) {
        const result: CommandResult = {
          success: false,
          message: `Command ${command.type} cannot be executed in current context`,
        };
        this.updateMetrics(startTime, false, command.type);
        return result;
      }

      // Get the appropriate rule chain
      const ruleChain = this.ruleChains.get(command.type);
      if (!ruleChain) {
        // For missing rule chains, throw error instead of returning result
        const error = new Error(`No rule chain found for command type: ${command.type}`);
        this.updateMetrics(startTime, false, command.type);
        throw error;
      }

      // Execute the rule chain
      const chainResult = await ruleChain.execute(command, context);

      // Convert rule chain result to command result
      const commandResult: CommandResult = {
        success: chainResult.success,
        message: chainResult.message,
        data: chainResult.data,
        effects: chainResult.effects,
        damage: chainResult.damage,
      };

      // Update metrics
      this.updateMetrics(startTime, chainResult.success, command.type);

      // Log completion
      if (this.config.enableLogging) {
        console.log(
          `Command ${command.type} completed: ${chainResult.success ? 'SUCCESS' : 'FAILURE'}`
        );
      }

      return commandResult;
    } catch (error) {
      // For missing rule chains, re-throw the error instead of wrapping it
      if (error instanceof Error && error.message.includes('No rule chain found')) {
        this.updateMetrics(startTime, false, command.type);
        throw error;
      }

      const errorResult: CommandResult = {
        success: false,
        message: `Error processing command ${command.type}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };

      this.updateMetrics(startTime, false, command.type);

      if (this.config.enableLogging) {
        console.error(`Command ${command.type} error:`, error);
      }

      return errorResult;
    }
  }

  /**
   * Batch process multiple commands
   */
  async processBatch(commands: Command[], context: GameContext): Promise<CommandResult[]> {
    const results: CommandResult[] = [];

    for (const command of commands) {
      const result = await this.process(command, context);
      results.push(result);

      // Stop batch processing if a critical command fails
      if (!result.success && this.isCriticalCommand(command)) {
        break;
      }
    }

    return results;
  }

  /**
   * Get rule engine metrics
   */
  getMetrics(): RuleEngineMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      commandsProcessed: 0,
      averageExecutionTime: 0,
      successRate: 0,
      ruleChainUsage: {},
    };
  }

  /**
   * Get information about registered rule chains
   */
  getRegisteredChains(): Record<string, { totalRules: number; ruleNames: string[] }> {
    const info: Record<string, { totalRules: number; ruleNames: string[] }> = {};

    for (const [commandType, chain] of this.ruleChains.entries()) {
      const stats = chain.getStatistics();
      info[commandType] = {
        totalRules: stats.totalRules,
        ruleNames: stats.ruleNames,
      };
    }

    return info;
  }

  /**
   * Validate rule engine configuration
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check if any rule chains are registered
    if (this.ruleChains.size === 0) {
      errors.push('No rule chains registered');
    }

    // Validate each rule chain
    for (const [commandType, chain] of this.ruleChains.entries()) {
      const stats = chain.getStatistics();
      if (stats.totalRules === 0) {
        errors.push(`Rule chain for ${commandType} has no rules`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(startTime: number, success: boolean, commandType: string): void {
    if (!this.config.enableMetrics) return;

    const executionTime = Date.now() - startTime;

    // Update average execution time
    const totalTime = this.metrics.averageExecutionTime * (this.metrics.commandsProcessed - 1);
    this.metrics.averageExecutionTime =
      (totalTime + executionTime) / this.metrics.commandsProcessed;

    // Update success rate
    const successfulCommands = Math.floor(
      this.metrics.successRate * (this.metrics.commandsProcessed - 1)
    );
    const newSuccessfulCommands = successfulCommands + (success ? 1 : 0);
    this.metrics.successRate = newSuccessfulCommands / this.metrics.commandsProcessed;

    // Update rule chain usage
    this.metrics.ruleChainUsage[commandType] = (this.metrics.ruleChainUsage[commandType] || 0) + 1;
  }

  /**
   * Determine if a command is critical (failure should stop batch processing)
   */
  private isCriticalCommand(command: Command): boolean {
    // This could be configurable or based on command properties
    // For now, simple implementation
    const criticalCommandTypes = ['death-save', 'system-shock'];
    return criticalCommandTypes.includes(command.type);
  }
}

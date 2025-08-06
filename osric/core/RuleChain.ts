/**
 * RuleChain - Implementation of Chain of Responsibility pattern for OSRIC Rules
 *
 * Rule chains execute multiple rules in sequence for a command.
 * Each rule can modify the context and optionally stop the chain.
 */

import type { Command } from './Command';
import type { GameContext } from './GameContext';
import type { Rule, RuleResult } from './Rule';

/**
 * Result of executing a rule chain
 */
export interface RuleChainResult {
  success: boolean;
  message: string;
  results: RuleResult[];
  critical?: boolean; // If true, indicates at least one rule had a critical failure
  data?: Record<string, unknown>;
  effects?: string[];
  damage?: number[];
}

/**
 * Configuration for rule chain execution
 */
export interface RuleChainConfig {
  stopOnFailure?: boolean; // Stop chain if any rule fails
  mergeResults?: boolean; // Merge all rule results into final result
  clearTemporary?: boolean; // Clear temporary data after execution
}

/**
 * RuleChain manages and executes a sequence of rules for commands
 */
export class RuleChain {
  private rules: Rule[] = [];
  private config: RuleChainConfig;

  constructor(config: RuleChainConfig = {}) {
    this.config = {
      stopOnFailure: false,
      mergeResults: true,
      clearTemporary: false,
      ...config,
    };
  }

  /**
   * Add a rule to the chain
   */
  addRule(rule: Rule): RuleChain {
    this.rules.push(rule);
    this.sortRulesByPriority();
    return this; // Allow method chaining
  }

  /**
   * Add multiple rules to the chain
   */
  addRules(rules: Rule[]): RuleChain {
    this.rules.push(...rules);
    this.sortRulesByPriority();
    return this;
  }

  /**
   * Remove a rule from the chain by name
   */
  removeRule(ruleName: string): boolean {
    const initialLength = this.rules.length;
    this.rules = this.rules.filter((rule) => rule.name !== ruleName);
    return this.rules.length < initialLength;
  }

  /**
   * Get all rules in the chain
   */
  getRules(): readonly Rule[] {
    return [...this.rules];
  }

  /**
   * Check if a rule exists in the chain
   */
  hasRule(ruleName: string): boolean {
    return this.rules.some((rule) => rule.name === ruleName);
  }

  /**
   * Execute the rule chain for a command (with metrics tracking)
   */
  async execute(command: Command, context: GameContext): Promise<RuleChainResult> {
    const startTime = performance.now();
    const results: RuleResult[] = [];
    let chainStopped = false;
    let overallSuccess = true;

    // Initialize metrics if needed
    if (!this._metricsData) {
      this.resetMetrics();
    }

    // Sort rules by priority first (lower priority number = higher priority)
    const sortedRules = [...this.rules].sort((a, b) => a.priority - b.priority);

    // Execute rules in priority order, checking canApply for each rule dynamically
    for (const rule of sortedRules) {
      // Check if this rule can apply now (after previous rules may have changed context)
      if (!rule.canApply(context, command)) {
        continue; // Skip this rule
      }

      try {
        // Check prerequisites
        if (!this.checkPrerequisites(rule, results)) {
          const skipResult: RuleResult = {
            success: false,
            message: `Rule ${rule.name} skipped: prerequisites not met`,
            stopChain: false,
          };
          results.push(skipResult);
          continue;
        }

        // Execute the rule
        const result = await rule.execute(context, command);

        // Ensure result includes rule name for dependency tracking
        if (result.data) {
          result.data.ruleName = rule.name;
        } else {
          result.data = { ruleName: rule.name };
        }

        results.push(result);

        // Track rule execution
        if (this._metricsData) {
          this._metricsData.ruleExecutionCounts[rule.name] =
            (this._metricsData.ruleExecutionCounts[rule.name] || 0) + 1;
        }

        // Update overall success FIRST, before checking stop conditions
        if (!result.success) {
          overallSuccess = false;
        }

        // Check if we should stop the chain
        if (result.stopChain) {
          chainStopped = true;
          break;
        }

        // Check if we should stop on failure
        if (!result.success && this.config.stopOnFailure) {
          break;
        }
      } catch (error) {
        const errorResult: RuleResult = {
          success: false,
          message: `Error executing rule ${rule.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          stopChain: this.config.stopOnFailure || false,
        };
        results.push(errorResult);
        overallSuccess = false;

        if (this.config.stopOnFailure) {
          break;
        }
      }
    }

    // Update metrics
    const endTime = performance.now();
    const executionTime = endTime - startTime;
    if (this._metricsData) {
      this._metricsData.totalExecutions++;

      // Update average execution time
      const totalTime =
        this._metricsData.averageExecutionTime * (this._metricsData.totalExecutions - 1) +
        executionTime;
      this._metricsData.averageExecutionTime = totalTime / this._metricsData.totalExecutions;
    }

    // Create final result
    const chainResult = this.createChainResult(overallSuccess, results, chainStopped);

    // Clear temporary data if configured to do so
    if (this.config.clearTemporary) {
      context.clearTemporary();
    }

    return chainResult;
  }

  /**
   * Sort rules by priority (lower numbers execute first)
   */
  private sortRulesByPriority(): void {
    this.rules.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Check if rule prerequisites are satisfied
   */
  private checkPrerequisites(rule: Rule, executedResults: RuleResult[]): boolean {
    const prerequisites = rule.getPrerequisites();
    if (prerequisites.length === 0) {
      return true;
    }

    // Check if all prerequisite rules have been executed successfully
    const executedRuleNames = executedResults
      .filter((result) => result.success)
      .map((result) => result.data?.ruleName as string)
      .filter((name) => name !== undefined);

    return prerequisites.every((prereq) => executedRuleNames.includes(prereq));
  }

  /**
   * Create the final chain result by merging individual rule results
   */
  private createChainResult(
    success: boolean,
    results: RuleResult[],
    chainStopped: boolean
  ): RuleChainResult {
    const messages: string[] = [];
    const allData: Record<string, unknown> = {};
    const allEffects: string[] = [];
    const allDamage: number[] = [];

    // Check for critical failures
    const hasCriticalFailure = results.some((result) => result.critical === true);

    // Merge results if configured to do so
    if (this.config.mergeResults) {
      for (const result of results) {
        if (result.message) {
          messages.push(result.message);
        }

        if (result.data) {
          // Copy all data except ruleName for merging
          const { ruleName, ...dataToMerge } = result.data;
          Object.assign(allData, dataToMerge);
        }

        if (result.effects) {
          allEffects.push(...result.effects);
        }

        if (result.damage) {
          allDamage.push(...result.damage);
        }
      }
    }

    // Create summary message
    let finalMessage = messages.join(' ');
    if (chainStopped) {
      finalMessage += ' (Chain stopped early)';
    }

    return {
      success,
      message: finalMessage || (success ? 'Rule chain executed successfully' : 'Rule chain failed'),
      results,
      critical: hasCriticalFailure,
      data: Object.keys(allData).length > 0 ? allData : undefined,
      effects: allEffects.length > 0 ? allEffects : undefined,
      damage: allDamage.length > 0 ? allDamage : undefined,
    };
  }

  /**
   * Create a copy of this rule chain
   */
  clone(): RuleChain {
    const clone = new RuleChain(this.config);
    clone.rules = [...this.rules];
    return clone;
  }

  /**
   * Get statistics about the rule chain
   */
  getStatistics(): {
    totalRules: number;
    ruleNames: string[];
    priorities: number[];
  } {
    return {
      totalRules: this.rules.length,
      ruleNames: this.rules.map((rule) => rule.name),
      priorities: this.rules.map((rule) => rule.priority),
    };
  }

  /**
   * Validate the rule chain configuration
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check if chain is empty
    if (this.rules.length === 0) {
      errors.push('Rule chain is empty');
    }

    // Check for duplicate rule names
    const ruleNames = this.rules.map((rule) => rule.name);
    const duplicates = ruleNames.filter((name, index) => ruleNames.indexOf(name) !== index);
    if (duplicates.length > 0) {
      errors.push(`Duplicate rule name: ${duplicates[0]}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get rule execution metrics
   */
  getMetrics(): {
    totalExecutions: number;
    averageExecutionTime: number;
    ruleExecutionCounts: Record<string, number>;
  } {
    // This would be implemented with actual metrics tracking
    // For now, return mock data that tests expect
    return {
      totalExecutions: this._metricsData?.totalExecutions || 0,
      averageExecutionTime: this._metricsData?.averageExecutionTime || 0,
      ruleExecutionCounts: this._metricsData?.ruleExecutionCounts || {},
    };
  }

  /**
   * Reset rule execution metrics
   */
  resetMetrics(): void {
    this._metricsData = {
      totalExecutions: 0,
      averageExecutionTime: 0,
      ruleExecutionCounts: {},
    };
  }

  /**
   * Get a specific rule by name
   */
  getRule(name: string): Rule | undefined {
    return this.rules.find((rule) => rule.name === name);
  }

  /**
   * Clear all rules from the chain
   */
  clearRules(): void {
    this.rules = [];
  }

  // Private metrics data (would be properly implemented in real system)
  private _metricsData?: {
    totalExecutions: number;
    averageExecutionTime: number;
    ruleExecutionCounts: Record<string, number>;
  };

  /**
   * Execute the rule chain for a command (with metrics tracking)
   */
}

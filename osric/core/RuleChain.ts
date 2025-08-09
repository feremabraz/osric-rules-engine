import type { Command } from './Command';
import type { GameContext } from './GameContext';
import type { Rule, RuleResult } from './Rule';

export interface RuleChainResult {
  success: boolean;
  message: string;
  results: RuleResult[];
  critical?: boolean;
  data?: Record<string, unknown>;
  effects?: string[];
  damage?: number[];
}

export interface RuleChainConfig {
  stopOnFailure?: boolean;
  mergeResults?: boolean;
  clearTemporary?: boolean;
}

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

  addRule(rule: Rule): RuleChain {
    this.rules.push(rule);
    this.sortRulesByPriority();
    return this;
  }

  addRules(rules: Rule[]): RuleChain {
    this.rules.push(...rules);
    this.sortRulesByPriority();
    return this;
  }

  removeRule(ruleName: string): boolean {
    const initialLength = this.rules.length;
    this.rules = this.rules.filter((rule) => rule.name !== ruleName);
    return this.rules.length < initialLength;
  }

  getRules(): readonly Rule[] {
    return [...this.rules];
  }

  hasRule(ruleName: string): boolean {
    return this.rules.some((rule) => rule.name === ruleName);
  }

  async execute(command: Command, context: GameContext): Promise<RuleChainResult> {
    const startTime = performance.now();
    const results: RuleResult[] = [];
    let chainStopped = false;
    let overallSuccess = true;

    if (!this._metricsData) {
      this.resetMetrics();
    }

    const sortedRules = [...this.rules].sort((a, b) => a.priority - b.priority);

    for (const rule of sortedRules) {
      if (!rule.canApply(context, command)) {
        continue;
      }

      try {
        if (!this.checkPrerequisites(rule, results)) {
          const skipResult: RuleResult = {
            success: false,
            message: `Rule ${rule.name} skipped: prerequisites not met`,
            stopChain: false,
          };
          results.push(skipResult);
          continue;
        }

        const result = await rule.apply(context, command);

        if (result.data) {
          result.data.ruleName = rule.name;
        } else {
          result.data = { ruleName: rule.name };
        }

        results.push(result);

        if (this._metricsData) {
          this._metricsData.ruleExecutionCounts[rule.name] =
            (this._metricsData.ruleExecutionCounts[rule.name] || 0) + 1;
        }

        if (!result.success) {
          overallSuccess = false;
        }

        if (result.stopChain) {
          chainStopped = true;
          break;
        }

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

    const endTime = performance.now();
    const executionTime = endTime - startTime;
    if (this._metricsData) {
      this._metricsData.totalExecutions++;

      const totalTime =
        this._metricsData.averageExecutionTime * (this._metricsData.totalExecutions - 1) +
        executionTime;
      this._metricsData.averageExecutionTime = totalTime / this._metricsData.totalExecutions;
    }

    const chainResult = this.createChainResult(overallSuccess, results, chainStopped);

    if (this.config.clearTemporary) {
      context.clearTemporary();
    }

    return chainResult;
  }

  private sortRulesByPriority(): void {
    this.rules.sort((a, b) => a.priority - b.priority);
  }

  private checkPrerequisites(rule: Rule, executedResults: RuleResult[]): boolean {
    const prerequisites = rule.getPrerequisites();
    if (prerequisites.length === 0) {
      return true;
    }

    const executedRuleNames = executedResults
      .filter((result) => result.success)
      .map((result) => result.data?.ruleName as string)
      .filter((name) => name !== undefined);

    return prerequisites.every((prereq) => executedRuleNames.includes(prereq));
  }

  private createChainResult(
    success: boolean,
    results: RuleResult[],
    chainStopped: boolean
  ): RuleChainResult {
    const messages: string[] = [];
    const allData: Record<string, unknown> = {};
    const allEffects: string[] = [];
    const allDamage: number[] = [];

    const hasCriticalFailure = results.some((result) => result.critical === true);

    if (this.config.mergeResults) {
      for (const result of results) {
        if (result.message) {
          messages.push(result.message);
        }

        if (result.data) {
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

  clone(): RuleChain {
    const clone = new RuleChain(this.config);
    clone.rules = [...this.rules];
    return clone;
  }

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

  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (this.rules.length === 0) {
      errors.push('Rule chain is empty');
    }

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

  getMetrics(): {
    totalExecutions: number;
    averageExecutionTime: number;
    ruleExecutionCounts: Record<string, number>;
  } {
    return {
      totalExecutions: this._metricsData?.totalExecutions || 0,
      averageExecutionTime: this._metricsData?.averageExecutionTime || 0,
      ruleExecutionCounts: this._metricsData?.ruleExecutionCounts || {},
    };
  }

  resetMetrics(): void {
    this._metricsData = {
      totalExecutions: 0,
      averageExecutionTime: 0,
      ruleExecutionCounts: {},
    };
  }

  getRule(name: string): Rule | undefined {
    return this.rules.find((rule) => rule.name === name);
  }

  clearRules(): void {
    this.rules = [];
  }

  private _metricsData?: {
    totalExecutions: number;
    averageExecutionTime: number;
    ruleExecutionCounts: Record<string, number>;
  };
}

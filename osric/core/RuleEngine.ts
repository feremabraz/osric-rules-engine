import type { Command, CommandResult } from './Command';
import type { GameContext } from './GameContext';
import type { Rule } from './Rule';
import { isFailure, isSuccess } from './Rule';
import { RuleChain, type RuleChainConfig } from './RuleChain';

export interface RuleEngineConfig {
  defaultChainConfig?: RuleChainConfig;
  enableLogging?: boolean;
  enableMetrics?: boolean;
}

export interface RuleEngineMetrics {
  commandsProcessed: number;
  averageExecutionTime: number;
  successRate: number;
  ruleChainUsage: Record<string, number>;
}

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

  registerRuleChain(commandType: string, ruleChain: RuleChain): void {
    const stats = ruleChain.getStatistics();
    if (stats.totalRules === 0) {
      throw new Error(`Rule chain for ${commandType} is empty`);
    }

    this.ruleChains.set(commandType, ruleChain);

    if (this.config.enableLogging) {
      console.log(`Registered rule chain for command type: ${commandType}`);
    }
  }

  // Note: bulk registration removed to encourage centralized chain wiring via buildRuleEngine

  getRuleChain(commandType: string): RuleChain | null {
    return this.ruleChains.get(commandType) || null;
  }

  hasRuleChain(commandType: string): boolean {
    return this.ruleChains.has(commandType);
  }

  unregisterRuleChain(commandType: string): boolean {
    return this.ruleChains.delete(commandType);
  }

  addRuleToChain(commandType: string, rule: Rule): boolean {
    const chain = this.ruleChains.get(commandType);
    if (chain) {
      chain.addRule(rule);
      return true;
    }
    return false;
  }

  createRuleChain(commandType: string, config?: RuleChainConfig): RuleChain {
    const chainConfig = config || this.config.defaultChainConfig;
    const newChain = new RuleChain(chainConfig);
    this.registerRuleChain(commandType, newChain);
    return newChain;
  }

  async process(command: Command, context: GameContext): Promise<CommandResult> {
    const startTime = Date.now();

    try {
      this.metrics.commandsProcessed++;

      if (this.config.enableLogging) {
        console.log(`Processing command: ${command.type}`);
      }

      if (!command.canExecute(context)) {
        const result: CommandResult = {
          kind: 'failure',
          message: `Command ${command.type} cannot be executed in current context`,
        };
        this.updateMetrics(startTime, false, command.type);
        return result;
      }

      const ruleChain = this.ruleChains.get(command.type);
      if (!ruleChain) {
        const error = new Error(`No rule chain found for command type: ${command.type}`);
        this.updateMetrics(startTime, false, command.type);
        throw error;
      }

      const chainResult = await ruleChain.execute(command, context);

      const commandResult: CommandResult = {
        kind: chainResult.kind,
        message: chainResult.message,
        data: chainResult.data,
        effects: chainResult.effects,
        damage: chainResult.damage,
      };

      this.updateMetrics(startTime, isSuccess(chainResult), command.type);

      if (this.config.enableLogging) {
        console.log(
          `Command ${command.type} completed: ${isSuccess(chainResult) ? 'SUCCESS' : 'FAILURE'}`
        );
      }

      return commandResult;
    } catch (error) {
      if (error instanceof Error && error.message.includes('No rule chain found')) {
        this.updateMetrics(startTime, false, command.type);
        throw error;
      }

      const errorResult: CommandResult = {
        kind: 'failure',
        message: `Error processing command ${command.type}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };

      this.updateMetrics(startTime, false, command.type);

      if (this.config.enableLogging) {
        console.error(`Command ${command.type} error:`, error);
      }

      return errorResult;
    }
  }

  async processBatch(commands: Command[], context: GameContext): Promise<CommandResult[]> {
    const results: CommandResult[] = [];

    for (const command of commands) {
      const result = await this.process(command, context);
      results.push(result);

      if (isFailure(result) && this.isCriticalCommand(command)) {
        break;
      }
    }

    return results;
  }

  getMetrics(): RuleEngineMetrics {
    return { ...this.metrics };
  }

  resetMetrics(): void {
    this.metrics = {
      commandsProcessed: 0,
      averageExecutionTime: 0,
      successRate: 0,
      ruleChainUsage: {},
    };
  }

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

  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (this.ruleChains.size === 0) {
      errors.push('No rule chains registered');
    }

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

  private updateMetrics(startTime: number, success: boolean, commandType: string): void {
    if (!this.config.enableMetrics) return;

    const executionTime = Date.now() - startTime;

    const totalTime = this.metrics.averageExecutionTime * (this.metrics.commandsProcessed - 1);
    this.metrics.averageExecutionTime =
      (totalTime + executionTime) / this.metrics.commandsProcessed;

    const successfulCommands = Math.floor(
      this.metrics.successRate * (this.metrics.commandsProcessed - 1)
    );
    const newSuccessfulCommands = successfulCommands + (success ? 1 : 0);
    this.metrics.successRate = newSuccessfulCommands / this.metrics.commandsProcessed;

    this.metrics.ruleChainUsage[commandType] = (this.metrics.ruleChainUsage[commandType] || 0) + 1;
  }

  private isCriticalCommand(command: Command): boolean {
    const criticalCommandTypes = ['death-save', 'system-shock'];
    return criticalCommandTypes.includes(command.type);
  }
}

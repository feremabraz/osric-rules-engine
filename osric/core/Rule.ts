import type { Command } from './Command';
import type { GameContext } from './GameContext';

export interface BaseRuleResult {
  kind: 'success' | 'failure';
  success: boolean; // retained for backward compatibility
  message: string;
  stopChain?: boolean;
  critical?: boolean;
  data?: Record<string, unknown>;
  effects?: string[];
  damage?: number[];
  // Optional sub-discriminant for payload semantics (Phase 4 deepening)
  dataKind?: string;
}

export type SuccessRuleResult = BaseRuleResult & {
  kind: 'success';
  success: true;
  critical?: false;
};
export type FailureRuleResult = BaseRuleResult & { kind: 'failure'; success: false };
export type RuleResult = SuccessRuleResult | FailureRuleResult;

export interface Rule {
  readonly name: string;
  readonly priority: number;

  apply(context: GameContext, command: Command): Promise<RuleResult>;
  canApply(context: GameContext, command: Command): boolean;
  getPrerequisites(): string[];
}

export abstract class BaseRule implements Rule {
  abstract readonly name: string;
  readonly priority: number = 100;

  // Default implementation that can be overridden
  async apply(_context: GameContext, _command: Command): Promise<RuleResult> {
    return this.createSuccessResult(`Rule ${this.name} executed successfully`);
  }

  // Default implementation that can be overridden
  canApply(_context: GameContext, _command: Command): boolean {
    return true;
  }

  // Strict data access pattern - type-safe with validation
  protected getRequiredContext<T>(context: GameContext, key: string): T {
    const data = context.getTemporary<T>(key);
    if (data === null || data === undefined) {
      throw new Error(`Required temporary data not found: ${key}`);
    }
    return data;
  }

  protected getOptionalContext<T>(context: GameContext, key: string): T | null {
    return context.getTemporary<T>(key) || null;
  }

  protected setContext<T>(context: GameContext, key: string, value: T): void {
    context.setTemporary(key, value);
  }

  // Validation for startup checks
  getPrerequisites(): string[] {
    return [];
  }

  validate(availableRules: string[]): { valid: boolean; missing: string[] } {
    const prerequisites = this.getPrerequisites();
    const missing = prerequisites.filter((rule) => !availableRules.includes(rule));
    return { valid: missing.length === 0, missing };
  }

  protected createSuccessResult(
    message: string,
    data?: Record<string, unknown>,
    effects?: string[],
    damage?: number[],
    stopChain = false,
    dataKind?: string
  ): SuccessRuleResult {
    return { kind: 'success', success: true, message, data, effects, damage, stopChain, dataKind };
  }

  protected createFailureResult(
    message: string,
    data?: Record<string, unknown>,
    critical = false,
    dataKind?: string
  ): FailureRuleResult {
    return {
      kind: 'failure',
      success: false,
      message,
      data,
      critical,
      stopChain: critical,
      dataKind,
    };
  }

  protected isCommandType(command: Command, type: string): boolean {
    return command.type === type;
  }

  protected extractTypedParameters<T>(
    command: Command,
    validator: (params: unknown) => params is T
  ): T | null {
    if (validator(command.parameters)) {
      return command.parameters as T;
    }
    return null;
  }
}

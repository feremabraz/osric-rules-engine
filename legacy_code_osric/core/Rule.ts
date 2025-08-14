import type { Command } from './Command';
import type { GameContext } from './GameContext';

export interface BaseRuleResult<T = Record<string, unknown>> {
  kind: 'success' | 'failure';
  message: string;
  stopChain?: boolean;
  critical?: boolean;
  data?: T;
  effects?: string[];
  damage?: number[];
}

export type SuccessRuleResult<T = Record<string, unknown>> = BaseRuleResult<T> & {
  kind: 'success';
  critical?: false;
};
export type FailureRuleResult<T = Record<string, unknown>> = BaseRuleResult<T> & {
  kind: 'failure';
};
export type RuleResult<T = Record<string, unknown>> = SuccessRuleResult<T> | FailureRuleResult<T>;

// Ergonomic helpers for discriminated results
export function isSuccess<T extends { kind: 'success' | 'failure' }>(
  result: T
): result is T & { kind: 'success' } {
  return result.kind === 'success';
}

export function isFailure<T extends { kind: 'success' | 'failure' }>(
  result: T
): result is T & { kind: 'failure' } {
  return result.kind === 'failure';
}

// Functional helpers for ergonomics
export function matchResult<TData, R>(
  result: RuleResult<TData>,
  branches: {
    success: (ok: SuccessRuleResult<TData>) => R;
    failure: (err: FailureRuleResult<TData>) => R;
  }
): R {
  return isSuccess(result)
    ? branches.success(result as SuccessRuleResult<TData>)
    : branches.failure(result as FailureRuleResult<TData>);
}

export function unwrapSuccess<TData>(result: RuleResult<TData>): SuccessRuleResult<TData> {
  if (isFailure(result)) {
    const msg = result.message || 'Expected success but received failure result';
    throw new Error(msg);
  }
  return result;
}

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
  async apply(
    _context: GameContext,
    _command: Command
  ): Promise<RuleResult<Record<string, unknown>>> {
    return this.createSuccessResult<Record<string, unknown>>(
      `Rule ${this.name} executed successfully`
    );
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

  protected createSuccessResult<TData = Record<string, unknown>>(
    message: string,
    data?: TData,
    effects?: string[],
    damage?: number[],
    stopChain = false
  ): SuccessRuleResult<TData> {
    return { kind: 'success', message, data, effects, damage, stopChain };
  }

  protected createFailureResult<TData = Record<string, unknown>>(
    message: string,
    data?: TData,
    critical = false
  ): FailureRuleResult<TData> {
    return { kind: 'failure', message, data, critical, stopChain: critical };
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

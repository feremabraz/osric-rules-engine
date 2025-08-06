import type { Command } from '@osric/core/Command';
import type { GameContext } from '@osric/core/GameContext';

export interface RuleResult {
  success: boolean;
  message: string;
  stopChain?: boolean;
  critical?: boolean;
  data?: Record<string, unknown>;
  effects?: string[];
  damage?: number[];
}

export interface Rule {
  readonly name: string;

  readonly priority: number;

  execute(context: GameContext, command: Command): Promise<RuleResult>;

  canApply(context: GameContext, command: Command): boolean;

  getPrerequisites(): string[];
}

export abstract class BaseRule implements Rule {
  abstract readonly name: string;
  readonly priority: number = 100;

  abstract execute(context: GameContext, command: Command): Promise<RuleResult>;
  abstract canApply(context: GameContext, command: Command): boolean;

  getPrerequisites(): string[] {
    return [];
  }

  protected createSuccessResult(
    message: string,
    data?: Record<string, unknown>,
    effects?: string[],
    damage?: number[],
    stopChain = false
  ): RuleResult {
    return { success: true, message, data, effects, damage, stopChain };
  }

  protected createFailureResult(
    message: string,
    data?: Record<string, unknown>,
    critical = false
  ): RuleResult {
    return { success: false, message, data, critical, stopChain: critical };
  }

  protected isCommandType(command: Command, type: string): boolean {
    return command.type === type;
  }

  protected getTemporaryData<T>(context: GameContext, key: string): T | null {
    return context.getTemporary<T>(key);
  }

  protected setTemporaryData(context: GameContext, key: string, value: unknown): void {
    context.setTemporary(key, value);
  }

  protected extractTypedParameters<T>(
    command: Command,
    validator: (params: unknown) => params is T
  ): T | null {
    if ('params' in command && command.params && validator(command.params)) {
      return command.params;
    }

    if (validator(command)) {
      return command as unknown as T;
    }

    return null;
  }
}

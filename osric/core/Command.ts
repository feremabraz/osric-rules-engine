import type { GameContext } from './GameContext';
import type { RuleEngine } from './RuleEngine';

export interface CommandResult<TData = Record<string, unknown>> {
  success: boolean;
  message: string;
  data?: TData;
  effects?: string[];
  damage?: number[];
  error?: Error;
  executionTime?: number;
  commandType?: string;
}

export interface Command<TParams = unknown> {
  readonly type: string;
  readonly parameters: TParams;
  readonly actorId: string;
  readonly targetIds: string[];

  execute(context: GameContext): Promise<CommandResult>;
  canExecute(context: GameContext): boolean;
  getRequiredRules(): string[];
  getInvolvedEntities(): string[];
}

export abstract class BaseCommand<TParams = unknown> implements Command<TParams> {
  abstract readonly type: string;

  constructor(
    public readonly parameters: TParams,
    public readonly actorId: string,
    public readonly targetIds: string[] = []
  ) {
    this.validateParameters();
  }

  abstract execute(context: GameContext): Promise<CommandResult>;
  abstract canExecute(context: GameContext): boolean;
  abstract getRequiredRules(): string[];

  // Default implementation for backward compatibility - can be overridden
  protected validateParameters(): void {
    // Default: no validation - subclasses can override this
  }

  getInvolvedEntities(): string[] {
    return [this.actorId, ...this.targetIds];
  }

  protected validateEntitiesExist(context: GameContext): boolean {
    const entities = this.getInvolvedEntities();
    return entities.every((id) => context.hasEntity(id));
  }

  protected validateEntitiesConscious(context: GameContext): boolean {
    const entities = this.getInvolvedEntities();
    return entities.every((id) => {
      const entity = context.getEntity(id);
      if (!entity) return false;
      // Assuming entities have a status or hitPoints property to check consciousness
      if ('hitPoints' in entity) {
        return entity.hitPoints.current > 0;
      }
      return true; // Default to conscious if we can't check
    });
  }

  protected async executeWithRuleEngine(context: GameContext): Promise<CommandResult> {
    const ruleEngine = context.getRuleEngine();
    return await ruleEngine.process(this, context);
  }

  protected createSuccessResult<T>(
    message: string,
    data?: T,
    effects?: string[],
    damage?: number[]
  ): CommandResult<T> {
    return {
      success: true,
      message,
      data,
      effects,
      damage,
      commandType: this.type,
    };
  }

  protected createFailureResult<T>(message: string, error?: Error, data?: T): CommandResult<T> {
    return {
      success: false,
      message,
      error,
      data,
      commandType: this.type,
    };
  }
}

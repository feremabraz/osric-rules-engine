import type { GameContext } from '@osric/core/GameContext';

export interface CommandResult {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
  effects?: string[];
  damage?: number[];
}

export interface Command {
  readonly type: string;

  execute(context: GameContext): Promise<CommandResult>;

  canExecute(context: GameContext): boolean;

  getRequiredRules(): string[];

  getInvolvedEntities(): string[];
}

export abstract class BaseCommand implements Command {
  abstract readonly type: string;

  constructor(
    protected readonly actorId: string,
    protected readonly targetIds: string[] = []
  ) {}

  abstract execute(context: GameContext): Promise<CommandResult>;
  abstract canExecute(context: GameContext): boolean;
  abstract getRequiredRules(): string[];

  getInvolvedEntities(): string[] {
    return [this.actorId, ...this.targetIds];
  }

  protected validateEntities(context: GameContext): boolean {
    const entities = this.getInvolvedEntities();
    return entities.every((id) => context.hasEntity(id));
  }

  protected createSuccessResult(
    message: string,
    data?: Record<string, unknown>,
    effects?: string[],
    damage?: number[]
  ): CommandResult {
    return { success: true, message, data, effects, damage };
  }

  protected createFailureResult(message: string, data?: Record<string, unknown>): CommandResult {
    return { success: false, message, data };
  }
}

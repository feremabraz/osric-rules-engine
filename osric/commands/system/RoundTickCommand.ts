import { BaseCommand, type CommandResult } from '@osric/core/Command';
import type { GameContext } from '@osric/core/GameContext';
import { COMMAND_TYPES, RULE_NAMES } from '@osric/types/constants';

export type RoundTickParameters = Record<string, never>;

export class RoundTickCommand extends BaseCommand<RoundTickParameters> {
  readonly type = COMMAND_TYPES.ROUND_TICK;

  protected validateParameters(): void {
    // No parameters required for now
  }

  async execute(context: GameContext): Promise<CommandResult> {
    // Delegate to rules; rules perform ticking and publish outcomes
    return this.executeWithRuleEngine(context);
  }

  canExecute(_context: GameContext): boolean {
    return true;
  }

  getRequiredRules(): string[] {
    return [RULE_NAMES.BLEEDING_TICK];
  }

  getDescription(): string {
    return 'Advance round and apply ongoing effects';
  }
}

export default RoundTickCommand;

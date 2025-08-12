import type { Command } from '@osric/core/Command';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, type RuleResult } from '@osric/core/Rule';
import { RULE_NAMES } from '@osric/types/constants';
import { ComponentTrackingRules } from './ComponentTrackingRules';

// Adapter to satisfy contract name COMPONENT_CHECK by delegating to ComponentTrackingRules
export class ComponentCheckRule extends BaseRule {
  public readonly name = RULE_NAMES.COMPONENT_CHECK;

  private delegate = new ComponentTrackingRules();

  canApply(context: GameContext, _command: Command): boolean {
    // Delegate supports context-only guard
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return this.delegate.canApply(context);
  }

  async apply(context: GameContext, _command: Command): Promise<RuleResult> {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return this.delegate.execute(context);
  }
}

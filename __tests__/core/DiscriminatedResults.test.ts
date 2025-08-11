import { BaseCommand, type Command } from '@osric/core/Command';
import { GameContext } from '@osric/core/GameContext';
import { RuleChain } from '@osric/core/RuleChain';
import { RuleEngine } from '@osric/core/RuleEngine';
import { createStore } from 'jotai';
import { describe, expect, it } from 'vitest';

class NoopCommand extends BaseCommand<Record<string, unknown>> {
  readonly type = 'noop';
  canExecute() {
    return true;
  }
  getRequiredRules() {
    return [];
  }
  async execute(ctx: GameContext) {
    return this.executeWithRuleEngine(ctx);
  }
}

import { BaseRule } from '@osric/core/Rule';

class SimpleSuccessRule extends BaseRule {
  readonly name = 'simple-success';
  async apply(_ctx: GameContext, _cmd: Command) {
    return this.createSuccessResult('ok', { x: 1 });
  }
  canApply() {
    return true;
  }
}

class SimpleFailureRule extends BaseRule {
  readonly name = 'simple-failure';
  async apply(_ctx: GameContext, _cmd: Command) {
    return this.createFailureResult('nope');
  }
  canApply() {
    return true;
  }
}

describe('Discriminated results', () => {
  it('Rule.createSuccessResult sets kind=success', async () => {
    const rule = new SimpleSuccessRule();
    const store = createStore();
    const ctx = new GameContext(store);
    const cmd = new NoopCommand({}, 'actor', []);
    const res = await rule.apply(ctx, cmd as Command);
    expect(res.success).toBe(true);
    expect(res.kind).toBe('success');
  });

  it('RuleChainResult.kind reflects success/failure', async () => {
    const store = createStore();
    const ctx = new GameContext(store);
    const chain = new RuleChain({ stopOnFailure: false });
    chain.addRule(new SimpleSuccessRule());
    chain.addRule(new SimpleFailureRule());
    const cmd = new NoopCommand({}, 'actor', []);
    const result = await chain.execute(cmd, ctx);
    expect(result.success).toBe(false);
    expect(result.kind).toBe('failure');
  });

  it('RuleEngine.process carries kind into CommandResult', async () => {
    const store = createStore();
    const ctx = new GameContext(store);
    const engine = new RuleEngine();
    const chain = new RuleChain();
    chain.addRule(new SimpleSuccessRule());
    engine.registerRuleChain('noop', chain);
    const cmd = new NoopCommand({}, 'actor', []);
    const out = await engine.process(cmd, ctx);
    expect(out.success).toBe(true);
    expect(out.kind).toBe('success');
  });
});

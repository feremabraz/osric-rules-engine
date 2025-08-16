// CE-08 Executor
// runCommand executes a command descriptor through its staged rule functions.
// Features: duplicate key detection, deep freeze after each merge, integrity hash checks,
// domain failure short-circuit (discarding effects), exception mapping, RNG initial advance.

import type { CommandDescriptor, RuleFn } from './command';
import type { EffectsBuffer } from './effects';
import { deepFreeze } from './freeze';
import { computeHash } from './integrity';
import {
  type CommandOutcome,
  type EngineFailureResult,
  domainFail,
  engineFail,
  success,
} from './result';
import type { RNG } from './rng';

export interface ExecutionContext {
  rng: RNG;
  effects: EffectsBuffer;
  // room for future fields (store, etc.)
  [k: string]: unknown;
}

interface InternalState {
  acc: Record<string, unknown>;
  hash: bigint;
}

function applyFragment(
  state: InternalState,
  fragment: Record<string, unknown>
): EngineFailureResult | null {
  for (const key of Object.keys(fragment)) {
    if (Object.prototype.hasOwnProperty.call(state.acc, key)) {
      return engineFail('DUPLICATE_RESULT_KEY', `duplicate result key: ${key}`);
    }
  }
  const next = { ...state.acc, ...fragment };
  state.acc = deepFreeze(next) as Record<string, unknown>;
  state.hash = computeHash(state.acc);
  return null;
}

function executeStageRules(
  state: InternalState,
  rules: RuleFn[],
  params: unknown,
  ctx: ExecutionContext
): CommandOutcome | null {
  for (const rule of rules) {
    const preHash = state.hash; // hash before rule (integrity check)
    let result: unknown;
    try {
      result = rule(state.acc, params, ctx);
    } catch (err) {
      // Differentiate integrity mutation vs generic rule exception
      if (err instanceof TypeError && /read only|frozen|extensible/i.test(String(err.message))) {
        return engineFail('INTEGRITY_MUTATION', 'attempted mutation of frozen accumulator');
      }
      return engineFail('RULE_EXCEPTION', (err as Error).message);
    }
    // Accumulator must remain unchanged unless rule returns fragment / failure outcome
    if (computeHash(state.acc) !== preHash) {
      return engineFail('INTEGRITY_MUTATION', 'accumulator mutated without fragment');
    }
    if (result && typeof result === 'object') {
      // Domain or engine failure passthrough (narrow via discriminants)
      if ('ok' in result && (result as { ok: boolean }).ok === false) {
        const r = result as CommandOutcome;
        if (r.type === 'domain-failure' || r.type === 'engine-failure') return r;
      }
      // Treat plain object as fragment
      const fragment = result as Record<string, unknown>;
      const failure = applyFragment(state, fragment);
      if (failure) return failure;
    }
  }
  return null;
}

export function runCommand(
  descriptor: CommandDescriptor,
  rawParams: unknown,
  ctx: ExecutionContext
): CommandOutcome {
  // Initial RNG advance for deterministic divergence
  ctx.rng.float();
  const state: InternalState = {
    acc: deepFreeze({}) as Record<string, unknown>,
    hash: computeHash({}),
  };
  const stagesOrder: (keyof typeof descriptor.stages)[] = [
    'validate',
    'load',
    'calc',
    'mutate',
    'emit',
  ];

  for (const stageName of stagesOrder) {
    const rules = descriptor.stages[stageName];
    if (!rules.length) continue;
    const outcome = executeStageRules(state, rules, rawParams, ctx);
    if (outcome) {
      // Domain failure should discard any collected effects per spec
      if (!outcome.ok && outcome.type === 'domain-failure') {
        ctx.effects.drain(); // drop effects
        return domainFail(outcome.code, outcome.message);
      }
      return outcome;
    }
  }

  const effects = ctx.effects.drain();
  return success<Record<string, unknown>>(state.acc, Array.from(effects));
}

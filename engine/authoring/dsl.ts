// CE-06 DSL Builder
// command(key, paramsSchema?) -> chainable stage methods: validate, load, calc, mutate, emit.
// Auto-registers descriptor on first stage method call. Returns chain builder (no explicit build function).
// A snapshot of descriptor can be obtained via builder.descriptor().

import { makeCommandDescriptor } from '../core/command';
import type { CommandDescriptor, RuleFn } from '../core/command';
import { CommandRegistry } from '../facade/registry';

export interface CommandBuilder<Params = unknown, Acc = unknown, Ctx = unknown> {
  validate(fn: RuleFn<Params, Acc, Ctx, unknown>): CommandBuilder<Params, Acc, Ctx>;
  load(fn: RuleFn<Params, Acc, Ctx, unknown>): CommandBuilder<Params, Acc, Ctx>;
  calc(fn: RuleFn<Params, Acc, Ctx, unknown>): CommandBuilder<Params, Acc, Ctx>;
  mutate(fn: RuleFn<Params, Acc, Ctx, unknown>): CommandBuilder<Params, Acc, Ctx>;
  emit(fn: RuleFn<Params, Acc, Ctx, unknown>): CommandDescriptor;
  descriptor(): CommandDescriptor; // frozen snapshot
}

export function command<Params = unknown, Acc = unknown, Ctx = unknown>(
  key: string,
  _paramsSchema?: unknown
): CommandBuilder<Params, Acc, Ctx> {
  type GenericRule = RuleFn<unknown, unknown, unknown, unknown>;
  const stages = {
    validate: [] as GenericRule[],
    load: [] as GenericRule[],
    calc: [] as GenericRule[],
    mutate: [] as GenericRule[],
    emit: [] as GenericRule[],
  };
  let registered = false;

  let liveDescriptor: CommandDescriptor | null = null;
  function ensureRegistered() {
    if (!registered) {
      // Create a live descriptor whose stage arrays are the mutable arrays.
      const liveStages = stages as unknown as CommandDescriptor['stages'];
      liveDescriptor = { key, stages: liveStages };
      CommandRegistry.register(liveDescriptor);
      registered = true;
    }
  }

  function snapshot(): CommandDescriptor {
    return makeCommandDescriptor(key, stages); // fresh frozen copy
  }

  const builder: CommandBuilder<Params, Acc, Ctx> = {
    validate(fn) {
      stages.validate.push(fn as unknown as GenericRule);
      ensureRegistered();
      return builder;
    },
    load(fn) {
      stages.load.push(fn as unknown as GenericRule);
      ensureRegistered();
      return builder;
    },
    calc(fn) {
      stages.calc.push(fn as unknown as GenericRule);
      ensureRegistered();
      return builder;
    },
    mutate(fn) {
      stages.mutate.push(fn as unknown as GenericRule);
      ensureRegistered();
      return builder;
    },
    emit(fn) {
      stages.emit.push(fn as unknown as GenericRule);
      ensureRegistered();
      return snapshot();
    },
    descriptor: snapshot,
  };

  return builder;
}

import type { BuiltCommandMeta, BuiltRuleMeta } from '../command/register';
import { type DomainFailure, domainFail } from '../errors/codes';
import type { Rng } from '../rng/random';
import type { StoreFacade } from '../store/storeFacade';
import { type EffectCollector, createEffectCollector } from '../types/effects';

export interface ExecutionContext<
  Accumulator extends Record<string, unknown> = Record<string, unknown>,
> {
  command: BuiltCommandMeta;
  params: unknown;
  store: StoreFacade;
  acc: Accumulator;
  effects: EffectCollector;
  rng?: Rng;
  ok<T extends Record<string, unknown>>(delta?: T): T | undefined;
  fail(code: DomainFailure['code'], message: string): DomainFailure;
}

// Author-facing narrowed rule context helper. Library keeps ExecutionContext generic only on accumulator
// for internal flexibility; command authors can import RuleCtx to strongly type params & acc.
// It is an intersection type so there is no runtime impact.
export type RuleCtx<P, A extends Record<string, unknown>> = ExecutionContext<A> & { params: P };

export function createExecutionContext<
  Accumulator extends Record<string, unknown> = Record<string, unknown>,
>(
  command: BuiltCommandMeta,
  params: unknown,
  store: StoreFacade,
  rng?: Rng
): ExecutionContext<Accumulator> {
  return {
    command,
    params,
    store,
    acc: {} as Accumulator,
    effects: createEffectCollector(),
    rng,
    ok: <T extends Record<string, unknown>>(delta?: T) => (delta ? delta : undefined),
    fail: (code: DomainFailure['code'], message: string) => domainFail(code, message),
  };
}

// Simple DFS topological sort (no caching)
export function topoSortRules(rules: BuiltRuleMeta[]): BuiltRuleMeta[] {
  const graph = new Map<string, BuiltRuleMeta>();
  for (const r of rules) graph.set(r.ruleName, r);
  const temp = new Set<string>();
  const perm = new Set<string>();
  const ordered: BuiltRuleMeta[] = [];
  function visit(name: string) {
    if (perm.has(name)) return;
    if (temp.has(name)) throw new Error(`Cyclic dependency detected involving rule '${name}'`);
    temp.add(name);
    const node = graph.get(name);
    if (!node) throw new Error(`Missing rule '${name}' in topo sort`);
    for (const dep of node.after) visit(dep);
    temp.delete(name);
    perm.add(name);
    ordered.push(node);
  }
  for (const r of rules) visit(r.ruleName);
  return ordered;
}

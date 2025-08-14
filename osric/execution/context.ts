import type { BuiltCommandMeta, BuiltRuleMeta } from '../command/register';
import { type DomainFailure, domainFail } from '../errors/codes';
import type { Rng } from '../rng/random';
// Phase 5/6: Execution context & helpers (with ok/fail helpers)
import type { StoreFacade } from '../store/storeFacade';
import { type EffectCollector, createEffectCollector } from '../types/effects';

export interface ExecutionContext<Acc extends Record<string, unknown> = Record<string, unknown>> {
  command: BuiltCommandMeta;
  params: unknown;
  store: StoreFacade;
  acc: Acc;
  effects: EffectCollector;
  rng?: Rng;
  ok<T extends Record<string, unknown>>(delta?: T): T | undefined;
  fail(code: DomainFailure['code'], message: string): DomainFailure;
}

export function createExecutionContext<
  Acc extends Record<string, unknown> = Record<string, unknown>,
>(
  command: BuiltCommandMeta,
  params: unknown,
  store: StoreFacade,
  rng?: Rng
): ExecutionContext<Acc> {
  return {
    command,
    params,
    store,
    acc: {} as Acc,
    effects: createEffectCollector(),
    rng,
    ok: <T extends Record<string, unknown>>(delta?: T) => (delta ? delta : undefined),
    fail: (code: DomainFailure['code'], message: string) => domainFail(code, message),
  };
}

// Simple DFS topological sort (no caching yet)
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

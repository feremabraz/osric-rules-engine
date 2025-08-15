import type { ZodTypeAny } from 'zod';
import type { BuiltCommandMeta } from '../command/register';
import type { DomainFailure } from '../errors/codes';
import type { Rng } from '../rng/random';
import type { StoreFacade } from '../store/storeFacade';
import type { Logger } from '../types/logger';
import { domainFailResult, engineFail } from '../types/result';
import type { Result } from '../types/result';
import { hashObject } from '../util/stableHash';
import { createExecutionContext, topoSortRules } from './context';
import { deepFreeze } from './deepFreeze';

export interface CapsuleRunOutcome {
  result: Result<Record<string, unknown>>;
  ok: boolean;
  effectsCommitted: { type: string; target: string; payload?: unknown }[] | null;
  failureCode?: string;
}

export interface ExecutionCapsuleDeps {
  store: StoreFacade;
  rng: Rng;
  logger: Logger;
  commitEffects: (
    command: string,
    effects: { type: string; target: string; payload?: unknown }[]
  ) => void;
  recordRuleStart?: (rule: string) => void; // reserved future diagnostics
  recordRuleEnd?: (rule: string) => void;
}

// Structural extraction of Engine.execute inner pipeline (Roadmap Item 8: no semantic changes intended).
export class ExecutionCapsule {
  constructor(
    private readonly commandKey: string,
    private readonly meta: BuiltCommandMeta,
    private readonly params: unknown,
    private readonly deps: ExecutionCapsuleDeps
  ) {}

  async run(): Promise<CapsuleRunOutcome> {
    const { meta, params, deps, commandKey } = this;
    const ctxLogger = deps.logger.child ? deps.logger.child({ command: commandKey }) : deps.logger;
    const ctx = createExecutionContext(meta, params, deps.store, ctxLogger, deps.rng);
    // Diagnostics collection
    const ruleTimings: { name: string; durationMs: number }[] = [];
    const preSnapshot = deps.store.snapshot();
    const preEntities = new Map<string, number>();
    for (const c of preSnapshot.characters) preEntities.set(c.id, c.updatedAt);
    for (const m of preSnapshot.monsters) preEntities.set(m.id, m.updatedAt);
    for (const i of preSnapshot.items) preEntities.set(i.id, i.updatedAt);
    let rngDraws = 0;
    // Wrap rng methods to count draws (non-invasive)
    if (deps.rng) {
      const origFloat = deps.rng.float.bind(deps.rng);
      const origInt = deps.rng.int.bind(deps.rng);
      (deps.rng as Rng).float = () => {
        rngDraws++;
        return origFloat();
      };
      (deps.rng as Rng).int = (min: number, max: number) => {
        rngDraws++;
        return origInt(min, max);
      };
    }
    // Integrity guard state: running hash of accumulator after each merge.
    let accHash = 0;
    const recomputeAndStoreHash = () => {
      accHash = hashObject(ctx.acc as Record<string, unknown>);
    };
    recomputeAndStoreHash();
    let ordered: typeof meta.rules;
    try {
      ordered = topoSortRules(meta.rules);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const failure = engineFail('RULE_EXCEPTION', msg) as Result<never>;
      return {
        result: failure as Result<Record<string, unknown>>,
        ok: false,
        effectsCommitted: null,
        failureCode: 'RULE_EXCEPTION',
      };
    }
    try {
      ctxLogger.debug?.('command:start', { command: commandKey });
      for (const ruleMeta of ordered) {
        const RuleCtor = ruleMeta.ruleCtor;
        let out: unknown;
        const startedAtRule = performance.now?.() ?? Date.now();
        try {
          const instance = new RuleCtor();
          const ruleLogger = ctx.logger.child
            ? ctx.logger.child({ rule: ruleMeta.ruleName })
            : ctx.logger;
          deps.recordRuleStart?.(ruleMeta.ruleName);
          out = await instance.apply({
            params,
            store: deps.store,
            acc: ctx.acc,
            fail: ctx.fail,
            rng: deps.rng,
            effects: ctx.effects,
            logger: ruleLogger,
          });
          deps.recordRuleEnd?.(ruleMeta.ruleName);
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          const failure = engineFail('RULE_EXCEPTION', message) as Result<never>;
          ctxLogger.error?.('command:fail', {
            command: commandKey,
            code: 'RULE_EXCEPTION',
            rule: ruleMeta.ruleName,
          });
          const endedAt = performance.now?.() ?? Date.now();
          ruleTimings.push({ name: ruleMeta.ruleName, durationMs: endedAt - startedAtRule });
          (failure as unknown as { diagnostics?: unknown }).diagnostics = Object.freeze({
            command: commandKey,
            rules: ruleTimings,
            failedRule: ruleMeta.ruleName,
          });
          return {
            result: failure as Result<Record<string, unknown>>,
            ok: false,
            effectsCommitted: null,
            failureCode: 'RULE_EXCEPTION',
          };
        }
        const endedAt = performance.now?.() ?? Date.now();
        ruleTimings.push({ name: ruleMeta.ruleName, durationMs: endedAt - startedAtRule });
        if (!out) continue;
        if ((out as unknown as DomainFailure)?.__fail) {
          const f = out as unknown as DomainFailure;
          const failure = domainFailResult(f.code, f.message) as Result<never>;
          ctxLogger.error?.('command:fail', {
            command: commandKey,
            code: f.code,
            rule: ruleMeta.ruleName,
          });
          (failure as unknown as { diagnostics?: unknown }).diagnostics = Object.freeze({
            command: commandKey,
            rules: ruleTimings,
            failedRule: ruleMeta.ruleName,
          });
          return {
            result: failure as Result<Record<string, unknown>>,
            ok: false,
            effectsCommitted: null,
            failureCode: f.code,
          };
        }
        const ruleOutputSchema = (ruleMeta.ruleCtor as unknown as { output?: ZodTypeAny }).output;
        if (ruleOutputSchema) {
          try {
            (ruleOutputSchema as ZodTypeAny).parse(out);
          } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            const failure = engineFail(
              'RULE_EXCEPTION',
              `Rule output validation failed: ${message}`
            ) as Result<never>;
            ctxLogger.error?.('command:fail', {
              command: commandKey,
              code: 'RULE_EXCEPTION',
              stage: 'outputValidation',
              rule: ruleMeta.ruleName,
            });
            (failure as unknown as { diagnostics?: unknown }).diagnostics = Object.freeze({
              command: commandKey,
              rules: ruleTimings,
              failedRule: ruleMeta.ruleName,
            });
            return {
              result: failure as Result<Record<string, unknown>>,
              ok: false,
              effectsCommitted: null,
              failureCode: 'RULE_EXCEPTION',
            };
          }
        }
        const deltaObj = out as Record<string, unknown>;
        for (const [k, v] of Object.entries(deltaObj)) {
          if (k === 'draft') {
            (ctx.acc as Record<string, unknown>)[k] = v;
          } else {
            (ctx.acc as Record<string, unknown>)[k] = deepFreeze(v as Record<string, unknown>);
          }
        }
        // Update integrity hash after merge.
        recomputeAndStoreHash();
      }
      if (ctx.effects.size() > 0) {
        deps.commitEffects(
          commandKey,
          ctx.effects.all.map((e) => ({ type: e.type, target: e.target, payload: e.payload }))
        );
      }
      // Test-only tamper hook (not documented) to simulate post-merge mutation for integrity guard tests.
      try {
        const maybeTamper = (
          globalThis as unknown as {
            __osricIntegrityTamper?: (acc: Record<string, unknown>) => void;
          }
        ).__osricIntegrityTamper;
        if (maybeTamper) maybeTamper(ctx.acc as Record<string, unknown>);
      } catch {
        /* ignore */
      }
      // Final integrity verification: detect any external mutation of previously frozen accumulator values.
      const finalHash = hashObject(ctx.acc as Record<string, unknown>);
      if (finalHash !== accHash) {
        const failure = engineFail(
          'INTEGRITY_MUTATION',
          'Accumulator mutated after finalization'
        ) as Result<never>;
        ctxLogger.error?.('command:fail', { command: commandKey, code: 'INTEGRITY_MUTATION' });
        return {
          result: failure as Result<Record<string, unknown>>,
          ok: false,
          effectsCommitted: null,
          failureCode: 'INTEGRITY_MUTATION',
        };
      }
      // Entity diff
      const postSnapshot = deps.store.snapshot();
      let created = 0;
      let mutated = 0;
      let deleted = 0;
      const postEntities = new Map<string, number>();
      for (const c of postSnapshot.characters) postEntities.set(c.id, c.updatedAt);
      for (const m of postSnapshot.monsters) postEntities.set(m.id, m.updatedAt);
      for (const i of postSnapshot.items) postEntities.set(i.id, i.updatedAt);
      for (const [id, ts] of postEntities) {
        if (!preEntities.has(id)) {
          created++;
        } else {
          const prevTs = preEntities.get(id);
          if (prevTs !== undefined && prevTs !== ts) mutated++;
        }
      }
      for (const id of preEntities.keys()) if (!postEntities.has(id)) deleted++;
      const diagnostics = Object.freeze({
        command: commandKey,
        rules: ruleTimings,
        entityDiff: { created, mutated, deleted },
        effects: { emitted: ctx.effects.size() },
        rng: { draws: rngDraws },
      });
      ctxLogger.debug?.('command:success', { command: commandKey });
      const result = { ok: true, data: ctx.acc, diagnostics } as Result<Record<string, unknown>>;
      return {
        result,
        ok: true,
        effectsCommitted: ctx.effects.all.map((e) => ({
          type: e.type,
          target: e.target,
          payload: e.payload,
        })),
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      const failure = engineFail('RULE_EXCEPTION', message) as Result<never>;
      ctxLogger.error?.('command:exception', { command: commandKey, error: message });
      return {
        result: failure as Result<Record<string, unknown>>,
        ok: false,
        effectsCommitted: null,
        failureCode: 'RULE_EXCEPTION',
      };
    }
  }
}

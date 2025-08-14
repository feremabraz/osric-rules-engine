import { type ZodObject, type ZodRawShape, type ZodTypeAny, z } from 'zod';
import { type BuiltCommandMeta, buildRegistry } from '../command/register';
import { getRegisteredCommands, resetRegisteredCommands } from '../command/register';
import { type EngineConfig, type EngineConfigInput, EngineConfigSchema } from '../config/schema';
import { character as characterEntities } from '../entities/character';
import { item as itemEntities } from '../entities/item';
import { monster as monsterEntities } from '../entities/monster';
import type { DomainFailure } from '../errors/codes';
import { createExecutionContext, topoSortRules } from '../execution/context';
import { type Rng, createRng } from '../rng/random';
import { type StoreFacade, createStoreFacade } from '../store/storeFacade';
import type { CommandResultShape } from '../types/commandResults';
// Engine (Phase 5: config, entities, registry, execution skeleton & command proxy)
import type { Result } from '../types/result';
import { domainFailResult, engineFail } from '../types/result';

export class Engine {
  private started = false;
  private readonly config: EngineConfig;
  private registry: BuiltCommandMeta[] = [];
  private readonly _store: StoreFacade = createStoreFacade();
  private rng: Rng;
  private eventsTrace: { command: string; startedAt: number; durationMs: number; ok: boolean }[] =
    [];
  private appliedEffects: {
    command: string;
    effects: { type: string; target: string; payload?: unknown }[];
  }[] = [];
  // Command facade (initialized on start). Using index signature for dynamic keys; tests rely on this property.
  public readonly command!: {
    [K in keyof CommandResultShape & string]: (
      params: unknown,
      extra?: unknown
    ) => Promise<Result<CommandResultShape[K]>>;
  } & Record<
    string,
    (params?: unknown, extra?: unknown) => Promise<Result<Record<string, unknown>>>
  >;

  // Public entities facade (will expand in later phases)
  readonly entities = {
    character: characterEntities,
    monster: monsterEntities,
    item: itemEntities,
  } as const;

  constructor(configInput?: EngineConfigInput) {
    const raw = configInput ?? {};
    this.config = EngineConfigSchema.parse(raw); // early parse / normalization
    // RNG adapter selection (currently only default implemented)
    // RNG adapter selection (future: implement other algorithms)
    this.rng = createRng(this.config.seed);
  }

  async start(): Promise<void> {
    if (this.started) return; // idempotent
    // Build registry
    // Phase 06: Auto discovery – if enabled and no commands registered yet, load known command modules.
    if (this.config.autoDiscover && getRegisteredCommands().length === 0) {
      await this.autoDiscoverCommands();
    }
    this.registry = buildRegistry();
    // Pre-validate rule graphs (cycle detection) early so failures surface at start instead of first execution
    for (const meta of this.registry) {
      // Will throw on cyclic dependency or missing dep
      topoSortRules(meta.rules);
    }
    // Build command proxy now
    (this as unknown as { command: unknown }).command = this.createCommandProxy();
    this.started = true;
  }

  // Phase 06: strategy – runtime static import list (could be code-generated at build time).
  private async autoDiscoverCommands(): Promise<void> {
    // In a build-time generated variant, this list would be produced automatically.
    const modules: (() => Promise<unknown>)[] = [
      () => import('../commands/createCharacter'),
      () => import('../commands/gainExperience'),
      () => import('../commands/inspireParty'),
    ];
    for (const load of modules) {
      try {
        await load();
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('Auto discovery failed to load a command module', e);
      }
    }
  }

  async stop(): Promise<void> {
    if (!this.started) return;
    // teardown hooks later
    this.started = false;
  }

  get isStarted(): boolean {
    return this.started;
  }
  getConfig(): EngineConfig {
    return this.config;
  }
  get store(): StoreFacade {
    return this._store;
  }
  getRegistry(): readonly BuiltCommandMeta[] {
    return this.registry;
  }
  get events() {
    return {
      trace: this.eventsTrace as readonly {
        command: string;
        startedAt: number;
        durationMs: number;
        ok: boolean;
      }[],
      effects: this.appliedEffects as readonly {
        command: string;
        effects: { type: string; target: string; payload?: unknown }[];
      }[],
    };
  }

  // Execute a command by key with raw param object or shorthand
  /**
   * Execute a command directly by key. Public for advanced / dynamic scenarios; typical usage should prefer `engine.command.<key>(...)` facade methods.
   * @internal Prefer the command proxy for ergonomic invocation where possible.
   */
  // Typed overloads for known commands
  async execute<K extends keyof CommandResultShape & string>(
    commandKey: K,
    rawParams: unknown
  ): Promise<
    Result<
      CommandResultShape[K] extends Record<string, unknown>
        ? CommandResultShape[K]
        : Record<string, unknown>
    >
  >;
  async execute(commandKey: string, rawParams: unknown): Promise<Result<Record<string, unknown>>>; // fallback
  async execute(commandKey: string, rawParams: unknown): Promise<Result<Record<string, unknown>>> {
    const startedAt = Date.now();
    // Advance RNG once per command invocation to ensure divergence even if no rule consumes randomness
    this.rng.float();
    const meta = this.registry.find((c) => c.key === commandKey);
    if (!meta) throw new Error(`Unknown command '${commandKey}'`);
    // Parse params via zod schema stored on original command constructor (paramsSchema is zod)
    let parsed: unknown;
    try {
      parsed = (meta.paramsSchema as ZodTypeAny).parse(rawParams);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const res = engineFail('PARAM_INVALID', message) as Result<never>;
      this.eventsTrace.push({
        command: commandKey,
        startedAt,
        durationMs: Date.now() - startedAt,
        ok: false,
      });
      return res;
    }
    const ctx = createExecutionContext(meta, parsed, this._store, this.rng);
    const ordered = topoSortRules(meta.rules);
    try {
      for (const ruleMeta of ordered) {
        const RuleCtor = ruleMeta.ruleCtor;
        let out: unknown;
        try {
          const instance = new RuleCtor();
          out = await instance.apply({
            params: parsed,
            store: this._store,
            acc: ctx.acc,
            ok: ctx.ok,
            fail: ctx.fail,
            rng: this.rng,
            effects: ctx.effects,
          });
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          throw new Error(message);
        }
        if (!out) continue;
        // Domain failure takes precedence over validation; fail object shouldn't be validated as rule output
        if ((out as unknown as DomainFailure).__fail) {
          const f = out as unknown as DomainFailure;
          const res = domainFailResult(f.code, f.message) as Result<never>;
          this.eventsTrace.push({
            command: commandKey,
            startedAt,
            durationMs: Date.now() - startedAt,
            ok: false,
          });
          return res;
        }
        // Runtime validation (Phase 2): validate rule delta against its output schema if declared.
        const ruleOutputSchema = (
          ruleMeta.ruleCtor as unknown as {
            output?: z.ZodObject<Record<string, z.ZodTypeAny>>;
          }
        ).output;
        if (ruleOutputSchema) {
          try {
            ruleOutputSchema.strict().parse(out);
          } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            const res = engineFail(
              'RULE_EXCEPTION',
              `Rule output validation failed: ${message}`
            ) as Result<never>;
            this.eventsTrace.push({
              command: commandKey,
              startedAt,
              durationMs: Date.now() - startedAt,
              ok: false,
            });
            return res;
          }
        }
        for (const [k, v] of Object.entries(out as Record<string, unknown>)) {
          ctx.acc[k] = v;
        }
      }
      // Commit phase (Phase 03): apply collected effects after all rules succeed
      try {
        if (ctx.effects.size() > 0) {
          // Placeholder application: simply record them; future phases may dispatch to effect handlers
          this.appliedEffects.push({
            command: commandKey,
            effects: ctx.effects.all.map((e) => ({
              type: e.type,
              target: e.target,
              payload: e.payload,
            })),
          });
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        const res = engineFail(
          'RULE_EXCEPTION',
          `Effect commit failed: ${message}`
        ) as Result<never>;
        this.eventsTrace.push({
          command: commandKey,
          startedAt,
          durationMs: Date.now() - startedAt,
          ok: false,
        });
        return res;
      }
      const res = { ok: true, data: ctx.acc } as Result<Record<string, unknown>>;
      this.eventsTrace.push({
        command: commandKey,
        startedAt,
        durationMs: Date.now() - startedAt,
        ok: true,
      });
      return res;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      const res = engineFail('RULE_EXCEPTION', message) as Result<never>;
      this.eventsTrace.push({
        command: commandKey,
        startedAt,
        durationMs: Date.now() - startedAt,
        ok: false,
      });
      return res;
    }
  }

  private createCommandProxy() {
    const self = this;
    // Phase 05: recognized leading positional field names for ergonomic mapping
    const recognizedPositional = new Set<string>(['characterId', 'leader', 'sourceId', 'targetId']);
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_target, prop: string) {
        return async (...args: unknown[]) => {
          // Shorthand: if first arg is string and schema first field matches typical id keys we allow passing id + rest object
          const meta = self.registry.find((c) => c.key === prop);
          if (!meta) throw new Error(`Unknown command method '${prop}'`);
          let rawParams: unknown = args[0];
          // Enhanced positional mapping (Phase 05): map multiple leading primitive args to schema fields.
          try {
            const schema = meta.paramsSchema as ZodTypeAny;
            if (schema && schema instanceof z.ZodObject) {
              const zobj = schema as ZodObject<ZodRawShape>;
              const fieldNames = Object.keys(zobj.shape);
              if (fieldNames.length) {
                const constructed: Record<string, unknown> = {};
                let consumed = 0;
                for (let i = 0; i < args.length && consumed < fieldNames.length; i++) {
                  const val = args[i];
                  if (val === null) break;
                  const t = typeof val;
                  if (t === 'string' || t === 'number') {
                    const field = fieldNames[consumed];
                    // heuristic acceptance: recognized name OR target schema primitive-ish
                    const targetSchema = zobj.shape[field];
                    const primitiveLike =
                      targetSchema &&
                      (targetSchema._def?.typeName === 'ZodString' ||
                        targetSchema._def?.typeName === 'ZodNumber');
                    if (recognizedPositional.has(field) || primitiveLike) {
                      constructed[field] = val;
                      consumed++;
                      continue;
                    }
                  }
                  // Stop mapping when non-primitive or heuristic fails
                  break;
                }
                if (consumed > 0) {
                  // Merge trailing object (if present) as additional params
                  const maybeObj = args[consumed];
                  if (maybeObj && typeof maybeObj === 'object' && !Array.isArray(maybeObj)) {
                    for (const [k, v] of Object.entries(maybeObj as Record<string, unknown>)) {
                      if (constructed[k] === undefined) constructed[k] = v; // don't overwrite mapped primitives
                    }
                  }
                  rawParams = constructed;
                }
              }
            }
          } catch {
            /* silent fallback */
          }
          return self.execute(prop as keyof CommandResultShape & string, rawParams);
        };
      },
    };
    return new Proxy({}, handler);
  }
}

export type { Result };
export interface EngineEventTraceEntry {
  command: string;
  startedAt: number;
  durationMs: number;
  ok: boolean;
}

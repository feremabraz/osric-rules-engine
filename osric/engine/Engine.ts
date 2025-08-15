import { type ZodObject, type ZodRawShape, type ZodTypeAny, z } from 'zod';
import { type BuiltCommandMeta, buildRegistry } from '../command/register';
import { getRegisteredCommands, resetRegisteredCommands } from '../command/register';
import { type EngineConfig, type EngineConfigInput, EngineConfigSchema } from '../config/schema';
import { character as characterEntities } from '../entities/character';
import { item as itemEntities } from '../entities/item';
import { monster as monsterEntities } from '../entities/monster';
import { ExecutionCapsule } from '../execution/capsule';
import { topoSortRules } from '../execution/context';
import { type Rng, createRng } from '../rng/random';
import { __setIdRandom } from '../store/ids';
import { type StoreFacade, createStoreFacade } from '../store/storeFacade';
import type { CommandResultShape } from '../types/commandResults';
import { type Logger, NoopLogger } from '../types/logger';
// Engine (Phase 5: config, entities, registry, execution skeleton & command proxy)
import type { Result } from '../types/result';
import { engineFail } from '../types/result';

export class Engine {
  private started = false;
  private readonly config: EngineConfig;
  private registry: BuiltCommandMeta[] = [];
  private readonly _store: StoreFacade = createStoreFacade();
  private rng: Rng;
  private logger: Logger = NoopLogger;
  private eventsTrace: { command: string; startedAt: number; durationMs: number; ok: boolean }[] =
    [];
  private appliedEffects: {
    command: string;
    effects: { type: string; target: string; payload?: unknown }[];
  }[] = [];
  // Simple transaction state (Item 9)
  private txState: null | {
    snapshot: ReturnType<StoreFacade['snapshot']>;
    rngState: number;
    idRandState: number | null; // not available directly; placeholder for future
    startedAt: number;
    dirty: boolean;
  } = null;
  // Metrics (Phase 05 Item 3)
  private metrics = {
    commandsExecuted: 0,
    commandsFailed: 0,
    recent: [] as { command: string; ok: boolean; durationMs: number; at: number }[],
    recentLimit: 50,
  };
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
    const providedLogger = (raw as { logger?: Logger | (() => Logger) }).logger;
    this.config = EngineConfigSchema.parse(raw); // early parse / normalization
    // RNG adapter selection (currently only default implemented)
    // RNG adapter selection (future: implement other algorithms)
    this.rng = createRng(this.config.seed);
    if (providedLogger) {
      try {
        this.logger = typeof providedLogger === 'function' ? providedLogger() : providedLogger;
      } catch {
        this.logger = NoopLogger;
      }
    }
  }

  async start(): Promise<void> {
    if (this.started) return; // idempotent
    // Inject deterministic id generator using engine RNG so IDs become seed-stable
    __setIdRandom(() => this.rng.float());
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
    // Mark transaction dirty lazily (if active) after this point to trigger snapshot only on first mutation.
    const meta = this.registry.find((c) => c.key === commandKey);
    if (!meta) throw new Error(`Unknown command '${commandKey}'`);
    // Parse params via zod schema stored on original command constructor (paramsSchema is zod)
    let parsed: unknown;
    try {
      parsed = (meta.paramsSchema as ZodTypeAny).parse(rawParams);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const res = engineFail('PARAM_INVALID', message) as Result<never>;
      const dur = Date.now() - startedAt;
      this.eventsTrace.push({ command: commandKey, startedAt, durationMs: dur, ok: false });
      // Metrics (param parse failure)
      this.metrics.commandsExecuted += 1;
      this.metrics.commandsFailed += 1;
      this.metrics.recent.push({ command: commandKey, ok: false, durationMs: dur, at: startedAt });
      if (this.metrics.recent.length > this.metrics.recentLimit) this.metrics.recent.shift();
      return res;
    }
    const capsule = new ExecutionCapsule(commandKey, meta, parsed, {
      store: this._store,
      rng: this.rng,
      logger: this.logger,
      commitEffects: (cmd, effects) => {
        this.appliedEffects.push({ command: cmd, effects });
        // Item 12: Effects Mirroring (battle context): For each battle whose participants include effect target, mirror once per (round,type,target,payload JSON) tuple.
        try {
          if (effects.length === 0) return;
          const battles = (
            this._store as unknown as {
              getBattle: (id: string) => unknown;
              snapshot: () => {
                battles: {
                  id: string;
                  round: number;
                  order: { id: string }[];
                  effectsLog?: { round: number; type: string; target: string; payload?: unknown }[];
                }[];
              };
            }
          ).snapshot().battles;
          for (const battle of battles) {
            const participantIds = new Set(battle.order.map((o) => o.id));
            const round = battle.round;
            const existing = battle.effectsLog ?? [];
            const existingKey = new Set(
              existing.map((e) => `${e.round}|${e.type}|${e.target}|${JSON.stringify(e.payload)}`)
            );
            const additions: { round: number; type: string; target: string; payload?: unknown }[] =
              [];
            for (const eff of effects) {
              if (!participantIds.has(eff.target)) continue;
              const key = `${round}|${eff.type}|${eff.target}|${JSON.stringify(eff.payload)}`;
              if (
                existingKey.has(key) ||
                additions.find(
                  (a) => `${a.round}|${a.type}|${a.target}|${JSON.stringify(a.payload)}` === key
                )
              )
                continue;
              additions.push({ round, type: eff.type, target: eff.target, payload: eff.payload });
            }
            if (additions.length) {
              this._store.updateBattle(battle.id, { effectsLog: existing.concat(additions) });
            }
          }
        } catch {
          /* best-effort; swallow errors to avoid impacting command */
        }
      },
    });
    const outcome = await capsule.run();
    const duration = Date.now() - startedAt;
    this.eventsTrace.push({ command: commandKey, startedAt, durationMs: duration, ok: outcome.ok });
    this.metrics.commandsExecuted += 1;
    if (!outcome.ok) this.metrics.commandsFailed += 1;
    this.metrics.recent.push({
      command: commandKey,
      ok: outcome.ok,
      durationMs: duration,
      at: startedAt,
    });
    if (this.metrics.recent.length > this.metrics.recentLimit) this.metrics.recent.shift();
    return outcome.result as Result<Record<string, unknown>>;
  }

  // Transaction API (internal for batchAtomic; public helpers later in Item 15)
  beginTransaction(): void {
    if (this.txState) throw new Error('NESTED_TRANSACTION_UNSUPPORTED');
    this.txState = {
      snapshot: this._store.snapshot(),
      rngState: this.rng.getState(),
      idRandState: null, // ids.ts uses injected RNG; restoring rng state covers determinism
      startedAt: Date.now(),
      dirty: false,
    };
  }
  commitTransaction(): void {
    if (!this.txState) return;
    this.txState = null;
  }
  rollbackTransaction(): void {
    if (!this.txState) return;
    const currentTx = this.txState;
    const snap = currentTx.snapshot;
    // Restore store (using internal replaceAll if present)
    (this._store as StoreFacade & { __replaceAll?: (s: typeof snap) => void }).__replaceAll?.(snap);
    // Restore RNG
    this.rng.setState(this.txState.rngState);
    // Discard any effects recorded since transaction start
    // We can filter by startedAt timestamp (eventsTrace contains timing) but simpler: clear effects added after start.
    // Since appliedEffects accumulates, find first index whose command started after tx started and splice.
    const startIdx = this.appliedEffects.findIndex((e) =>
      this.eventsTrace.find((ev) => ev.command === e.command && ev.startedAt >= currentTx.startedAt)
    );
    if (startIdx !== -1) this.appliedEffects.splice(startIdx);
    this.txState = null;
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

  // Metrics snapshot API
  metricsSnapshot() {
    const { commandsExecuted, commandsFailed, recent } = this.metrics;
    return Object.freeze({
      commandsExecuted,
      commandsFailed,
      recent: [...recent],
    });
  }

  // Item 15: Preview & Simulation Helpers
  /**
   * Run an arbitrary async function against the engine state and ALWAYS rollback afterward.
   * Provides deterministic sandbox for speculative calculations.
   */
  async preview<T>(
    fn: (engine: this) => Promise<T> | T
  ): Promise<{ value: T } | { error: unknown }> {
    this.beginTransaction();
    try {
      const value = await fn(this);
      this.rollbackTransaction();
      return { value };
    } catch (e) {
      this.rollbackTransaction();
      return { error: e };
    }
  }

  /**
   * Execute a function in a transaction, committing only if it completes without throwing.
   * Rolls back on exception and rethrows.
   */
  async transaction<T>(fn: (engine: this) => Promise<T> | T): Promise<T> {
    this.beginTransaction();
    try {
      const value = await fn(this);
      this.commitTransaction();
      return value;
    } catch (e) {
      this.rollbackTransaction();
      throw e;
    }
  }

  /**
   * Simulate a single command execution capturing its result, diagnostics, and store diff without committing changes.
   */
  async simulateCommand(
    command: string,
    params: unknown
  ): Promise<{
    result: Result<Record<string, unknown>>;
    diagnostics?: unknown;
    diff: { created: string[]; mutated: string[]; deleted: string[] };
  }> {
    const before = this.store.snapshot();
    const indexBefore = new Map<string, number>();
    for (const c of before.characters) indexBefore.set(c.id, c.updatedAt);
    for (const m of before.monsters) indexBefore.set(m.id, m.updatedAt);
    for (const i of before.items) indexBefore.set(i.id, i.updatedAt);
    this.beginTransaction();
    let result: Result<Record<string, unknown>>;
    try {
      result = await this.execute(command as string, params);
    } catch (e) {
      this.rollbackTransaction();
      throw e;
    }
    // Take after snapshot prior to rollback for diff
    const after = this.store.snapshot();
    const indexAfter = new Map<string, number>();
    for (const c of after.characters) indexAfter.set(c.id, c.updatedAt);
    for (const m of after.monsters) indexAfter.set(m.id, m.updatedAt);
    for (const i of after.items) indexAfter.set(i.id, i.updatedAt);
    const created: string[] = [];
    const mutated: string[] = [];
    const deleted: string[] = [];
    for (const [id, ts] of indexAfter) {
      if (!indexBefore.has(id)) created.push(id);
      else if (indexBefore.get(id) !== ts) mutated.push(id);
    }
    for (const id of indexBefore.keys()) if (!indexAfter.has(id)) deleted.push(id);
    this.rollbackTransaction();
    const diagnostics = (result as unknown as { diagnostics?: unknown }).diagnostics;
    return { result, diagnostics, diff: { created, mutated, deleted } };
  }
}

export type { Result };
export interface EngineEventTraceEntry {
  command: string;
  startedAt: number;
  durationMs: number;
  ok: boolean;
}

# OSRIC Engine Library Design

> This blueprint reimagines the OSRIC library exactly in the style you described: *one import*, *auto‑wired engine*, *implicit shared store*, *simple ergonomic entity access*, *command invocation via `engine.command.*`*, and *co‑located Command + Rules with auto‑registration + zod validation*. It maintains strong type safety while minimizing ceremony.

---
## 1. High‑Level Goals
| Goal | Interpretation in This Design |
|------|--------------------------------|
| Single entrypoint | `import { Engine } from '@osric'` returns fully wired façade |
| Minimal boilerplate | No manual rule chain creation; auto discovery + registration |
| Type safety | Discriminated command execution results + strongly typed entity schema + branded IDs (optional) |
| Implicit shared store | Jotai store embedded; exposed via `engine.store` convenience facade |
| Ergonomic entity creation | `engine.entities.character.prepare(race, klass)` returns hydrated entity draft |
| Zod validation | Params, entities, config all validated; failures throw typed errors |
| Co-located authoring | One file per feature: Command subclass + one or more Rule subclasses auto‑registered |
| Command invocation | `engine.command.move(entityId, entity)` or richer param signature; returns typed result |
| Clarity over abbreviation | Prefer explicit names (e.g. `InspirePartyResult`, `ResultData`) over terse forms |

---
## 2. Surface API Overview
```ts
import { Engine } from '@osric';

const config = {
  seed: 12345,
  logging: { level: 'info' },
  features: { morale: true, weather: false },
  adapters: { rng: 'mersenne', persistence: null },
};

const engine = new Engine(config);
await engine.start(); // async to allow dynamic loading or persistence bootstrapping

// Entity templates / enumerations
const human = engine.entities.character.human;     // Race meta
const warrior = engine.entities.character.warrior; // Class meta

// Prepared character (validated draft)
const character = engine.entities.character.prepare(human, warrior, { name: 'Aela' });
const id = engine.store.setEntity(character); // returns CharacterId
const retrieved = engine.store.getEntity(id);

// Execute a built-in command via façade
const moveResult = await engine.command.move(id, { distance: 30, destination: '0,30' });
if (moveResult.ok) console.log(moveResult.data.newPosition);

// Custom command (user authored file auto-registered)
const inspirePartyResult = await engine.command.inspireParty(id, { bonus: 1, message: 'Courage!' });
if (inspirePartyResult.ok) {
  console.log('Party inspired rounds = ', inspirePartyResult.data.durationRounds);
}
```

---
## 3. Engine Architecture (Conceptual Layers)
```
┌────────────────────────┐
│        Engine          │  Public façade (commands, entities, store, events)
├──────────┬─────────────┤
│ Registry │ Scheduler   │  Command+Rule lookup / execution order
├──────────┼─────────────┤
│ Rule DAG │ Validation  │  Auto-built dependency graph + zod schemas
├──────────┴─────────────┤
│ Store                  │  Jotai-backed world state
└────────────────────────┘
```

### Core Components
| Component | Responsibility | Notes |
|-----------|----------------|-------|
| `Engine` | Public API, lifecycle (`start`, `stop`), config ingestion | Lazily constructs registry |
| `CommandRegistry` | Maps `commandName` → metadata (rules, schema, executor) | Built at startup by scanning modules or static manifest |
| `RuleRegistry` | Per command: ordered rule list + dependencies | Derived from rule class metadata (decorators / static fields) |
| `StoreFacade` (`engine.store`) | High-level CRUD over Jotai atoms; strongly typed | Provides `setEntity` returning ID |
| `EntityCatalog` (`engine.entities`) | Hierarchical access to race/class/spec definitions + preparation helpers | Freeze objects for safety |
| `Validation` | Wraps zod; caches compiled schemas | Ensures near-zero repeated cost |
| `ExecutionContext` | Encapsulates snapshot of store, temp scratch, deterministic RNG, logging | Created per command run |

---
## 4. Configuration Model
```ts
import { z } from 'zod';

export const EngineConfigSchema = z.object({
  seed: z.number().int().optional(),
  logging: z.object({ level: z.enum(['trace','debug','info','warn','error']).default('info') }).default({ level: 'info' }),
  features: z.object({
    morale: z.boolean().default(true),
    weather: z.boolean().default(true),
  }).default({}),
  adapters: z.object({
    rng: z.enum(['default','mersenne','xoroshiro']).default('default'),
    persistence: z.any().nullable().default(null),
  }).default({}),
});
export type EngineConfig = z.infer<typeof EngineConfigSchema>;
```
`new Engine(rawConfig)` internally does `const config = EngineConfigSchema.parse(rawConfig)` ensuring early failure.

---
## 5. Entities Domain
### 5.1 Structure
```ts
engine.entities.character = {
  human: { key: 'human', abilityMods: { str: 0, dex: 0 }, size: 'medium', // ...metadata },
  dwarf: { /* ... */ },
  warrior: { key: 'warrior', hitDie: 'd10', primaryAbilities: ['strength'], /* class meta */ },
  cleric: { /* ... */ },
  prepare(raceMeta, classMeta, partial: CharacterInit): CharacterDraft,
};
```
### 5.2 Preparation Flow
1. `prepare(race, klass, partial)` merges defaults (HP roll, base saves, ability scores generation policy).
2. Zod schema validates `CharacterDraft`.
3. Returns immutable draft; storing finalizes & brands ID.

### 5.3 ID Strategy
Use a single simple *template literal + brand* pattern (no runtime mode toggling):
```ts
type CharacterId = `${'char'}_${string}` & { readonly __tag: 'CharacterId' };
```
Creation utilities ensure prefix + uniqueness; brand prevents accidental cross-type assignment. No alternate "loose" mode is provided—clarity and consistency over configurability.

---
## 6. Store API
```ts
interface StoreFacade {
  setEntity(entity: Character | Monster | Item): CharacterId | MonsterId | ItemId; // auto ID if missing
  getEntity<T extends GameEntity>(id: EntityId): T | null;
  updateEntity<T extends GameEntity>(id: EntityId, patch: Partial<T>): T;
  removeEntity(id: EntityId): boolean;
  snapshot(): WorldSnapshot;
}
```
Internally wraps Jotai atoms (`entitiesAtom`, etc.). Exposed façade prevents arbitrary atom misuse, enabling invariants (e.g. no negative HP).

---
## 7. Command Authoring Model
### 7.1 Base Classes (Simplified)
```ts
abstract class Command<P extends z.ZodTypeAny, ResultData, EffectData = unknown> {
  static key: string;                 // e.g. 'move'
  static params: z.ZodTypeAny;        // zod schema
  static rules: (typeof Rule)[];      // classes
  readonly params: z.infer<P>;
  protected constructor(raw: unknown) { this.params = (this.constructor as any).params.parse(raw); }
}

abstract class Rule<P, Acc, Delta> {
  static name: string;                // unique within command
  static after?: string[];            // dependencies
  apply(ctx: ExecutionContext<P, Acc>): Promise<RuleResult<Delta>> | RuleResult<Delta>;
}
```
### 7.2 Co-located Author File Pattern
```ts
// inspireParty.command.ts
import { Command, Rule } from '@osric';
import { z } from 'zod';

export class InspirePartyCommand extends Command<typeof InspirePartyCommand.params, InspirePartyResult> {
  static key = 'inspireParty';
  static params = z.object({
    leader: z.string(), // CharacterId – could wrap with refinement
    bonus: z.number().int().min(1).max(5).default(1),
    message: z.string().min(1).max(120),
  });
  static rules = [ValidateLeaderRule, CalculateDurationRule, ApplyInspirationRule];
}

interface InspirePartyResult { durationRounds: number; affected: string[]; }

export class ValidateLeaderRule extends Rule<InspirePartyCommand['params'], {}, {}> {
  static name = 'ValidateLeader';
  async apply(ctx) {
    const { leader } = ctx.command.params;
    if (!ctx.store.getEntity(leader)) return ctx.fail('NO_LEADER','Leader not found');
    return ctx.ok();
  }
}

export class CalculateDurationRule extends Rule<any, {}, { durationRounds: number }> {
  static name = 'CalcDuration';
  static after = ['ValidateLeader'];
  apply(ctx) {
    const durationRounds = 3 + ctx.rng.int(0, 3); // random extra 0–3
    return ctx.ok({ durationRounds });
  }
}

export class ApplyInspirationRule extends Rule<any, { durationRounds: number }, { affected: string[] }> {
  static name = 'ApplyInspiration';
  static after = ['CalcDuration'];
  apply(ctx) {
    const allies = ctx.query.partyOf(ctx.command.params.leader); // helper
    allies.forEach(id => ctx.effects.add('inspired', id, ctx.acc.durationRounds));
    return ctx.ok({ affected: allies });
  }
}

// Auto-registration: side-effect at module evaluate time
registerCommand(InspirePartyCommand);
```
**Auto‑Registration**: `registerCommand()` pushes metadata into a global registry (guarded so multiple imports are idempotent). Engine `start()` finalizes all registered commands (builds DAGs, validates schemas & dependencies).

### 7.3 Type Inference for Results
At finalization the engine computes union of all rule success payload keys and creates a mapped type:
```ts
type CommandResultData<'inspireParty'> = { durationRounds: number; affected: string[] };
```
so `engine.command.inspireParty(...)` returns:
```ts
Promise<{ ok: true; data: CommandResultData<'inspireParty'> } | { ok: false; error: CommandExecutionError }>
```

---
## 8. Command Invocation Façade
Engine dynamically creates a proxy:
```ts
engine.command.move(entityId, { distance: 30, destination: '0,30' });
engine.command.inspireParty(leaderId, { bonus: 2, message: 'Heroic surge!' });
```
Method signature rule: first positional argument(s) pre-bound “core” IDs if schema fields named `characterId`, `leader`, etc. Implementation inspects zod schema to map positional args → structured params (ergonomic sugar), falling back to object parameter form.

---
## 9. Execution Lifecycle (Per Command)
1. Resolve `CommandSpec` from registry.
2. Parse & validate params (zod) → typed `params`.
3. Build `ExecutionContext` including RNG (seed progressed), snapshot reference.
4. Topologically sort rules (cache). Execute sequentially:
   * Each rule returns `ok(data?)` / `fail(code,message)`.
   * Accumulator merges rule `data` (keys cannot clash unless identical types; conflict triggers validation error at startup).
5. Aggregate final result and apply collected world mutations & effects in a *single commit phase*.
6. Emit events: `command:start`, per rule events, `command:complete` with timing + outcome.

---
## 10. Validation & Safety
| Layer | Mechanism | Failure Mode |
|-------|-----------|-------------|
| Config | `EngineConfigSchema.parse` | Throws `ConfigError` |
| Params | Zod schema per command | Returns failure result; no rule evaluation |
| Rule graph | Dependency & duplicate key analysis | Startup error – engine refuses to start |
| Rule runtime | Try/catch each rule | Converts thrown errors into failure with code `RULE_EXCEPTION` |
| Entity integrity | Store patch pre-commit validation (e.g. HP ≥ 0) | Aborts commit, returns failure |

---
## 11. Type Safety Techniques Employed
| Technique | Purpose |
|-----------|---------|
| Zod schemas → `z.infer` | Strongly typed params without duplication |
| Branded / template literal IDs | Prevent cross-domain ID misuse |
| Derived result mapper | Command result data type auto-built from rule payloads |
| Static rule dependency list | Compile-time (with const assertions) + runtime validation |
| Central registry generics | `CommandRegistry<Key extends string>` ensures consistent key usage |

---
## 12. Plugins (Intentionally Omitted)
A plugin system is intentionally excluded to keep the core uncomplicated. If future needs arise (telemetry, persistence hooks) they can be addressed with explicit adapter APIs instead of a generic plugin layer.

---
## 13. Testing Ergonomics
```ts
const engine = testEngine({ seed: 42 })
  .withEntities(e => e.character.addFighter('hero', { level: 1 }))
  .register(InspirePartyCommand)
  .finalize();

const res = await engine.command.inspireParty('hero', { bonus: 1, message: 'Rise!' });
expect(res.ok).toBe(true);
expect(res.data.durationRounds).toBeGreaterThan(0);
engine.events.trace.forEach(ev => expect(ev.durationMs).toBeLessThan(5));
```
Utilities:
* `testEngine()` – spins minimal engine.
* Deterministic RNG injection.
* `engine.events.trace` – array of structured events for snapshot.

---
## 14. Performance Strategy (Deliberate Simplicity)
Early versions emphasize clarity over micro-optimizations. No cached DAG, batching, or memoization is implemented; straightforward sequential execution keeps reasoning simple. Only lightweight proxy generation (command façade) occurs once at finalization.

---
## 15. Inspire Party Example (Full Co-located File, Condensed)
```ts
// commands/inspireParty.ts
import { Command, Rule, registerCommand, helpers } from '@osric';
import { z } from 'zod';

export class InspirePartyCommand extends Command<typeof InspirePartyCommand.params, InspirePartyResult> {
  static key = 'inspireParty';
  static params = z.object({
    leader: helpers.id('character'),
    bonus: z.number().int().min(1).max(5).default(1),
    message: z.string().min(1).max(120),
  });
  static rules = [ValidateLeader, CalcDuration, ApplyBuff];
}

export interface InspirePartyResult { durationRounds: number; affected: string[]; }

class ValidateLeader extends Rule<any, {}, {}> {
  static name = 'ValidateLeader';
  apply(ctx) {
    if (!ctx.store.getEntity(ctx.command.params.leader)) return ctx.fail('NO_LEADER','Leader missing');
    return ctx.ok();
  }
}

class CalcDuration extends Rule<any, {}, { durationRounds: number }> {
  static name = 'CalcDuration';
  static after = ['ValidateLeader'];
  apply(ctx) { return ctx.ok({ durationRounds: 3 + ctx.rng.int(0,3) }); }
}

class ApplyBuff extends Rule<any, { durationRounds: number }, { affected: string[] }> {
  static name = 'ApplyBuff';
  static after = ['CalcDuration'];
  apply(ctx) {
    const allies = ctx.query.party(ctx.command.params.leader);
    for (const id of allies) ctx.effects.add('inspired', id, ctx.acc.durationRounds);
    return ctx.ok({ affected: allies });
  }
}

registerCommand(InspirePartyCommand);
```

---
## 16. Error Model
| Code | Scenario | Notes |
|------|----------|-------|
| `PARAM_INVALID` | Zod param parsing failure | Includes formatted issues |
| `NO_LEADER` | Domain error from a rule | Rule-defined codes |
| `RULE_EXCEPTION` | Uncaught thrown error | Captures stack in dev |
| `DEPENDENCY_MISSING` | Startup validation failure (missing rule) | Prevents engine start |
| `CONFLICTING_RESULT_KEY` | Two rules produce same key diff type | Startup failure |
| `STORE_CONSTRAINT` | Store commit invariant failed | Result is failure |

Typed: `type CommandErrorCode = 'PARAM_INVALID' | ...` used in discriminated union results.

---
## 17. Extending Entities (Deferred)
Runtime registration APIs for new races/classes are out-of-scope. Initial library ships with a fixed catalog; additions require code changes rather than dynamic registration.

---
## 18. Migration / Versioning Principles
This is a ground‑up new library with **no backward compatibility guarantees** prior to an explicit 1.0.0 release. During pre‑1.0 exploration, breaking refinements may occur without deprecation shims. Once 1.0.0 is declared, semantic versioning will then apply.

---
## 19. Alternative Options Considered (Skipped Here)
| Option | Reason Not Chosen |
|--------|------------------|
| Decorators on methods for rules | Increases magic, harder to follow without design time transpiler |
| Fully functional (no classes) DSL | Class static fields give simpler auto-registration & metadata grouping |
| Multi-chain pipeline builder | Overkill for initial ergonomic goals |
| Global mutable registries only | Harder to support multiple engine instances in tests |

---
## 20. Implementation Roadmap (Phased)
| Phase | Deliverables |
|-------|--------------|
| 1 | Engine shell, config schema, store façade, entity catalog + prepare |
| 2 | Command + Rule base classes, registry, auto-registration, simple move command |
| 3 | Execution context, rule dependency resolution, result aggregation |
| 4 | Error model, zod param + draft entity validation, test harness |
| 5 | Command façade proxy (`engine.command.*`), tracing, documentation polish, pre-1.0 stabilization |

---
## 21. Summary
This redesign centers the *user ergonomics you outlined*: direct Engine construction, intuitive entity creation, single shared store, effortless command invocation, and co-located command + rule authoring. It preserves robust safeguards (typed params, rule dependency validation, discriminated results, early startup failures) without imposing heavy ceremony. The architecture deliberately omits plugins and early micro‑optimizations to keep the mental model lean.

---
**End of User-Centric Redesign Blueprint**

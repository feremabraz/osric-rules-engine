# OSRIC Engine Library Design

> This blueprint designs the OSRIC library exactly in this style: *one import*, *auto‑wired engine*, *implicit shared store*, *simple ergonomic entity access*, *command invocation via `engine.command.*`*, and *co‑located Command + Rules with auto‑registration + zod validation*. It maintains strong type safety while minimizing ceremony.

---
## 1. High‑Level Goals
| Goal | Interpretation in This Design |
|------|--------------------------------|
| Single entrypoint | `import { Engine } from '@osric'` returns fully wired façade |
| Minimal boilerplate | No manual rule chain creation; auto discovery + registration |
| Type safety | Discriminated command execution results + strongly typed entity schema + mandatory branded IDs |
| Implicit shared store | Jotai store embedded; exposed via `engine.store` convenience facade |
| Ergonomic entity creation | `engine.command.createCharacter({...})` returns a persisted character |
| Zod validation | Params, entities, config all validated; failures throw typed errors |
| Co-located authoring | One file per feature: `defineCommand` factory + Rule classes auto‑registered |
| Command invocation | `engine.command.attackRoll({ attacker, target })` etc.; returns typed result |
| Clarity over abbreviation | Prefer explicit names (e.g. `InspirePartyResult`, `ResultData`) over terse forms |
| Mandatory rule outputs | Every Rule declares a concrete `output` schema (no omitted / no plain `z.any`) |

---
## 2. Surface API Overview
```ts
import { Engine } from '@osric';

const config = {
  seed: 12345,
  logging: { level: 'info' },
  features: { morale: true },
  adapters: { rng: 'default', persistence: null },
};

const engine = new Engine(config);

const heroRes = await engine.command.createCharacter({ name: 'Hero', level: 1, hp: 12 });
const foeRes  = await engine.command.createCharacter({ name: 'Foe', level: 1, hp: 10 });

if (heroRes.ok && foeRes.ok) {
  const atk = await engine.command.attackRoll({ attacker: heroRes.data.characterId, target: foeRes.data.characterId });
  if (atk.ok && atk.data.hit) {
    await engine.command.dealDamage({ source: heroRes.data.characterId, target: foeRes.data.characterId, attackContext: atk.data });
  }
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
All engine-scoped identifiers are *mandatory branded template literal IDs* enforced at parse time via exported zod schemas (e.g. `characterIdSchema`).
```ts
export type CharacterId = `${'char'}_${string}` & { readonly __tag: 'CharacterId' };
export const characterIdSchema = z.string().regex(/^char_[a-z0-9]+$/i).transform(s => s as CharacterId);
```
Equivalent helpers exist for `MonsterId`, `ItemId`, and `BattleId`. Public API exposes `createCharacterId()` etc. plus schema exports (`characterIdSchema`, `battleIdSchema`, `idSchemas`). Param schemas must use these branded schemas (simple `z.string()` with a regex is disallowed in commands).

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
### 7.1 Factory First
Author commands with `defineCommand({ key, params, rules })`; it creates the concrete subclass internally, preserving previous behaviors while eliminating boilerplate.
```ts
export const MoveCommand = defineCommand({
  key: 'move',
  params: z.object({ characterId: characterIdSchema, distance: z.number().int().min(1) }),
  rules: [ValidateCharacter, ApplyMovement],
});
registerCommand(MoveCommand as any);
```
### 7.2 Rules
`Rule` classes still declare `static ruleName` (or `name` legacy), optional `static after`, and mandatory `static output` schemas. Empty outputs use `z.object({})` (conceptually the same shape as the shared `emptyOutput`).
### 7.3 Co‑located File Pattern (Updated Example)
```ts
import { defineCommand, Rule, registerCommand, getCharacter } from '@osric';
import { z } from 'zod';

const params = z.object({
  leader: characterIdSchema,
  bonus: z.number().int().min(1).max(5).default(1),
  message: z.string().min(1).max(120),
});

class ValidateLeader extends Rule<any, {}, {}> {
  static ruleName = 'ValidateLeader';
  static output = z.object({});
  apply(ctx) { if (!getCharacter(ctx.store, ctx.params.leader)) return ctx.fail('NO_LEADER','Leader not found'); return {}; }
}
class CalcDuration extends Rule<any, {}, { durationRounds: number }> {
  static ruleName = 'CalcDuration';
  static after = ['ValidateLeader'];
  static output = z.object({ durationRounds: z.number().int().min(3).max(6) });
  apply(ctx) { return { durationRounds: 3 + ctx.rng.int(0,3) }; }
}
class ApplyInspiration extends Rule<any, { durationRounds: number }, { affected: string[] }> {
  static ruleName = 'ApplyInspiration';
  static after = ['CalcDuration'];
  static output = z.object({ affected: z.array(characterIdSchema) });
  apply(ctx) {
    const allies = [ctx.params.leader];
    ctx.effects.add('inspired', ctx.params.leader, { bonus: ctx.params.bonus, durationRounds: ctx.acc.durationRounds });
    return { affected: allies };
  }
}
export const InspirePartyCommand = defineCommand({ key: 'inspireParty', params, rules: [ValidateLeader, CalcDuration, ApplyInspiration] });
registerCommand(InspirePartyCommand as any);
```
**Auto‑Registration**: unchanged – `registerCommand()` collects definitions; `engine.start()` validates DAGs & schemas.

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
## 8. Command Invocation Façade & Helper Layer
Engine dynamically creates a proxy:
```ts
engine.command.move(entityId, { distance: 30, destination: '0,30' });
engine.command.inspireParty(leaderId, { bonus: 2, message: 'Heroic surge!' });
```
Positional mapping applies (leading entity IDs inferred from schema field order / names). Additional ergonomic helpers now exist:
* Entity: `getCharacter`, `requireCharacter`, `updateCharacter`
* Battle: `activeCombatant`, `listBattleOrder`
* Composite action: `applyAttackAndDamage`
* Orchestration: `batch(steps)` (continues through failures on optional steps), `batchAtomic(steps)` (rollback best effort on first hard failure)
* Introspection: `explainRuleGraph(commandKey)` (stable dependency + topo ordering output for tooling / tests)

---
## 9. Execution Lifecycle (Per Command)
1. Resolve `CommandSpec` from registry.
2. Parse & validate params (zod) → typed `params`.
3. Build `ExecutionContext` including RNG (seed progressed), snapshot reference.
4. Topologically sort rules (cache). Execute sequentially:
   * Each rule returns `ok(data?)` / `fail(code,message)`.
   * Accumulator merges rule `data` (keys cannot clash unless identical types; conflict triggers validation error at startup).
5. Aggregate final result and apply collected world mutations & effects in a *single commit phase*.
6. Emit events: `command:start`, per rule events, `command:complete`.
7. (If invoked via `batchAtomic`) earlier mutations may be rolled back (entity creations removed, updates shallowly reverted) upon first failure.
...

---
## 10. Validation & Safety
(Addition) Store commit enforces HP bounds (unconscious / death thresholds) and branded ID shape; any violation → `STORE_CONSTRAINT`.

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
## 13. Testing Ergonomics & Shortcuts
```ts
const engine = new Engine({ seed: 42 });
const c1 = await fastCharacter(engine, { name: 'A' });
const c2 = await fastCharacter(engine, { name: 'B' });
const roll = await engine.command.attackRoll({ attacker: c1, target: c2 });
expect(roll.ok).toBe(true);
// Composite helper
const full = await applyAttackAndDamage(engine, { attacker: c1, target: c2 });
```
(Use digest snapshot + rule graph snapshot (`explainRuleGraph`) for structural + behavioral drift detection.)

---
## 14. Performance Strategy (Deliberate Simplicity + Targeted Aids)
Clarity remains priority. Optimizations added only where they reduced author friction:
* Rule DAGs cached per command after first construction.
* Batch orchestration lives at library level (no required user re-implementation).
* Introspection output (rule graph) is deterministic enabling cheap snapshot tests (catches accidental dependency shifts early).

---
## 15. Inspire Party Example (Updated Factory Form)
```ts
import { defineCommand, Rule, registerCommand, getCharacter } from '@osric';
import { z } from 'zod';

const params = z.object({
  leader: characterIdSchema,
  bonus: z.number().int().min(1).max(5).default(1),
  message: z.string().min(1).max(120),
});
class ValidateLeader extends Rule<any, {}, {}> { static ruleName='ValidateLeader'; static output = z.object({}); apply(ctx){ if(!getCharacter(ctx.store, ctx.params.leader)) return ctx.fail('NO_LEADER','Leader missing'); return {}; } }
class CalcDuration extends Rule<any, {}, { durationRounds: number }> { static ruleName='CalcDuration'; static after=['ValidateLeader']; static output = z.object({ durationRounds: z.number().int().min(3).max(6) }); apply(ctx){ return { durationRounds: 3 + ctx.rng.int(0,3) }; } }
class ApplyBuff extends Rule<any, { durationRounds: number }, { affected: string[] }> { static ruleName='ApplyBuff'; static after=['CalcDuration']; static output = z.object({ affected: z.array(characterIdSchema) }); apply(ctx){ const allies=[ctx.params.leader]; ctx.effects.add('inspired', ctx.params.leader, { bonus: ctx.params.bonus, durationRounds: ctx.acc.durationRounds }); return { affected: allies }; } }
export const InspirePartyCommand = defineCommand({ key:'inspireParty', params, rules:[ValidateLeader, CalcDuration, ApplyBuff] });
registerCommand(InspirePartyCommand as any);
```

---
## 16. Error Model
| Code | Scenario | Notes |
|------|----------|-------|
| `PARAM_INVALID` | Zod param parsing failure | Includes formatted issues |
| `NO_TARGET` / domain codes | Domain error from a rule | Rule-defined codes |
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
(Legacy prepare APIs, weather feature, optional rule outputs removed in current baseline.)

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

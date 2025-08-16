# Command Authoring (Domain Layer)

Domain commands mirror engine DSL usage but operate on concrete entities.

## Pattern
```
import { command } from '../engine';

export interface FooParams { /* ... */ }
export interface FooResult { /* ... */ }

command<FooParams>('domain:foo')
  .validate((_a,p) => { /* guard params */ })
  .load((_a,p,ctx) => { /* fetch entities */ })
  .calc((_a,p,ctx) => { /* derive values */ })
  .mutate((_a,p,ctx) => { /* apply state changes */ })
  .emit((_a,p,ctx) => { /* add effects if desired */ });
```

## Reuse
Use shared rules for repeated validation/load fragments (e.g. `requireCharacter`). Keep logic in command file unless reused.

## Failure Codes
Stable codes aid testing. When promoting a validation to shared rule, allow custom code parameter to preserve legacy test expectations.

## RNG Use
Draw via `ctx.rng.int` / `ctx.rng.float`. Keep randomness confined to calc stage where possible for clarity.

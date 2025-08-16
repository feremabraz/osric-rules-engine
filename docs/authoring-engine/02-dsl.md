# DSL Builder

The `command(key: string)` function returns a chainable builder exposing stage methods:
```
command<Params>(key)
  .validate(fn)
  .load(fn)
  .calc(fn)
  .mutate(fn)
  .emit(fn)
```
Each method registers a rule function into the corresponding stage list. On the FIRST stage method call the command descriptor is created and auto-registered globally. The final method returns the (frozen) descriptor for introspection (tests sometimes inspect it but typical usage ignores the return value).

## Rule Function Signature
```
(acc: unknown, params: Params, ctx: { rng; effects; store; }) => object | void | DomainFailure
```
Fragments (`object`) are shallow-merged; overlapping keys trigger `engineFail('DUPLICATE_RESULT_KEY')`.

## Stages Semantics
- validate: reject early; return domain failures
- load: fetch entities or projections
- calc: pure-ish derivations
- mutate: state changes
- emit: side-effect descriptions (effects buffer)

All stages are optional but at least one rule overall is required.

## Shared Rules
The engine does NOT impose a rule class abstraction; rules are just functions. Reuse via plain functions imported where needed.

## Registration & Integrity
Descriptors store arrays of rule functions by stage. No removal API (immutable pipeline). Integrity guard hashes merged accumulator after each fragment merge.

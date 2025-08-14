# 1. Overview

This series introduces OSRIC Engine concepts in ascending detail. Each chapter builds on the previous. Start here for a mental model before diving into authoring.

## What Is The Engine?
The Engine is a deterministic, rule‑driven execution core for tabletop RPG logic. You import a single `Engine` class, construct it with a configuration, and then invoke domain "commands" (e.g. `createCharacter`, `gainExperience`, `inspireParty`). Each command runs one or more ordered rules that validate input, mutate an in‑memory world state (the Store), and produce a typed result object.

## Core Pillars
- Single entrypoint (`Engine`)
- Auto‑registered Commands + co‑located Rules
- Immutable metadata & draft entities validated with Zod
- Deterministic RNG (seeded) for reproducible tests
- Clear error model (engine vs domain failures)
- Accumulator based result aggregation (rules contribute disjoint keys)
- Deferred side effects (effects collected during execution, committed after success)

## High Level Flow
```mermaid
graph TD;
  A[App Code] -->|engine.command.<key>()| B[Engine.execute]
  B --> C[Parse Params (Zod)]
  C -->|ok| D[Create Execution Context]
  D --> E[Topo Sort Rules]
  E --> F[Run Each Rule]
  F --> G[Commit Effects]
  G --> H[Result]
  C -->|fail| H
```

Next: Configuration & Startup (2).

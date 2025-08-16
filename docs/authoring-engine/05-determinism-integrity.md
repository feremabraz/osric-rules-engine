# Determinism & Integrity

## RNG Determinism
Seed supplied at engine construction; each command consumes one initial draw to stabilize sequences against insertion/removal of early rules.

## Store Snapshot
Simulation & atomic batch capture deep-cloned store + RNG state; rollback restores both exactly.

## Integrity Guard
Accumulator hashed (structural FNV-1a) after each merge. Any mutation between merges or at end triggers `INTEGRITY_MUTATION` failure.

## Reproducibility
Given identical seed, params, and initial store, execute -> same `{ data, effects }` JSON.

# Results & Effects

Success shape: `{ ok: true, data: Accumulator, effects: Effect[] }`
Domain failure: `{ ok: false, type: 'domain-failure', code, message? }`
Engine failure: `{ ok: false, type: 'engine-failure', code, message? }`

Effects accumulate through any stage via `ctx.effects.add`. They commit only if final outcome is success (single command or atomic batch). Non-atomic batch filters effects to successful commands.

Duplicate result key -> engine failure `DUPLICATE_RESULT_KEY`.
Integrity breach -> engine failure `INTEGRITY_MUTATION`.
Thrown rule error -> engine failure `RULE_EXCEPTION`.

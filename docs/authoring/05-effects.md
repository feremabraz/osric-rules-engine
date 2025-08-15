# 5. Effects Authoring

Effects express deferred intent. Current implementation records them for later inspection; future versions may dispatch to handlers.

## Emitting
```ts
ctx.effects.add('inspired', targetId, { bonus: ctx.params.bonus, durationRounds: ctx.acc.durationRounds });
```
Emit only from rules that run after all prerequisite validation / loading rules have succeeded. A rule that emitted an effect and then a later rule fails would cause the effect to be discarded at commit time—maintain clarity by keeping emission in the final phase ("produce + emit"). In battle-oriented commands, effects are also mirrored into the battle `effectsLog` (single authoritative log; the former `log` alias was removed). If you manually append battle events inside a rule, patch only `effectsLog`.

## Idempotence
Avoid emitting duplicate effects for the same logical change; handle aggregation within a single rule when possible. Prefer updating an existing effect payload rather than pushing a second structurally identical entry.

Leverage the RuleCtx accumulator (`ctx.acc`) to access data produced by earlier rules (e.g. computed bonuses) so emission rules stay pure and side-effect limited.

## Future Expansion
When effect dispatch arrives, categorize effect `type` names to support routing (e.g. `buff:inspired`, `audit:action`). At that point, an effect handler pipeline can consume `effectsLog` incrementally.

Next: RNG Usage (6).

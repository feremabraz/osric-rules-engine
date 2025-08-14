# 5. Effects Authoring

Effects express deferred intent. Current implementation records them for later inspection; future versions may dispatch to handlers.

## Emitting
```ts
ctx.effects.add('inspired', targetId, { bonus: ctx.params.bonus, durationRounds: ctx.acc.durationRounds });
```
Emit only after validation/calculation rules have succeeded. In battle-oriented commands, effects are also mirrored into the battle `effectsLog` (single authoritative log; the former `log` alias was removed). If you manually append battle events inside a rule, patch only `effectsLog`.

## Idempotence
Avoid emitting duplicate effects for the same logical change; handle aggregation within a single rule when possible. Prefer updating an existing effect payload rather than pushing a second structurally identical entry.

## Future Expansion
When effect dispatch arrives, categorize effect `type` names to support routing (e.g. `buff:inspired`, `audit:action`). At that point, an effect handler pipeline can consume `effectsLog` incrementally.

Next: RNG Usage (6).

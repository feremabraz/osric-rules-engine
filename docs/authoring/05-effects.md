# 5. Effects Authoring

Effects express deferred intent. Current implementation records them for later inspection; future versions may dispatch to handlers.

## Emitting
```ts
ctx.effects.add('inspired', targetId, { bonus: ctx.params.bonus, durationRounds: ctx.acc.durationRounds });
```
Emit only after validation/calculation rules have succeeded.

## Idempotence
Avoid emitting duplicate effects for the same logical change; handle aggregation within a single rule when possible.

## Future Expansion
When effect dispatch arrives, categorize effect `type` names to support routing (e.g. `buff:inspired`, `log:audit`).

Next: RNG Usage (6).
